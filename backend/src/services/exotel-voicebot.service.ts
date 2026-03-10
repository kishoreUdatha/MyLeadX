import WebSocket from 'ws';
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
import { sarvamService, SARVAM_LANGUAGES } from '../integrations/sarvam.service';
import { exotelService } from '../integrations/exotel.service';
import { voiceMinutesService } from './voice-minutes.service';

const prisma = new PrismaClient();

// Document types that can be shared via WhatsApp
interface AgentDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'document';
  url: string;
  description: string;
  keywords: string[];
}

// Initialize OpenAI
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// TTS provider configuration (for voice synthesis: sarvam, openai, or auto)
// Options: 'auto' (Sarvam for Indian languages, OpenAI for others), 'sarvam', 'openai'
const TTS_PROVIDER = process.env.TTS_PROVIDER || process.env.VOICE_PROVIDER || 'auto';
const USE_SARVAM = TTS_PROVIDER === 'sarvam' || (TTS_PROVIDER === 'auto' && sarvamService.isAvailable());

console.log(`[VoiceBot] TTS provider: ${TTS_PROVIDER}, Sarvam available: ${sarvamService.isAvailable()}, Using Sarvam: ${USE_SARVAM}`);

// TTS Cache for reducing latency on common phrases
interface TTSCacheEntry {
  buffer: Buffer;
  timestamp: number;
}
const ttsCache = new Map<string, TTSCacheEntry>();
const TTS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const TTS_CACHE_MAX_SIZE = 100; // Max cached items

function getCacheKey(text: string, language: string, voice: string): string {
  // v2: Added after fixing mulaw encoding and resampling
  return `v2:${language}:${voice}:${text.substring(0, 100)}`;
}

function getCachedTTS(text: string, language: string, voice: string): Buffer | null {
  const key = getCacheKey(text, language, voice);
  const cached = ttsCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < TTS_CACHE_TTL) {
    console.log(`[VoiceBot] TTS cache hit for: "${text.substring(0, 30)}..."`);
    return cached.buffer;
  }
  return null;
}

function setCachedTTS(text: string, language: string, voice: string, buffer: Buffer): void {
  // Only cache short phrases (likely to be repeated)
  if (text.length > 200) return;

  // Evict oldest entries if cache is full
  if (ttsCache.size >= TTS_CACHE_MAX_SIZE) {
    let oldestKey = '';
    let oldestTime = Date.now();
    for (const [k, v] of ttsCache.entries()) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) ttsCache.delete(oldestKey);
  }

  const key = getCacheKey(text, language, voice);
  ttsCache.set(key, { buffer, timestamp: Date.now() });
}

/**
 * Normalize language code to full format (e.g., 'te' -> 'te-IN', 'en' -> 'en-IN')
 * Ensures consistent language codes throughout the system
 */
function normalizeLanguageCode(lang?: string): string {
  if (!lang) return '';

  // Already in full format
  if (lang.includes('-')) return lang;

  // Short code to full code mapping
  const codeMap: Record<string, string> = {
    'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
    'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
    'pa': 'pa-IN', 'en': 'en-IN', 'od': 'od-IN', 'as': 'as-IN',
  };

  return codeMap[lang.toLowerCase()] || lang;
}

/**
 * Exotel Voice Bot Service
 * Handles WebSocket-based real-time voice conversations
 *
 * Audio Format from Exotel:
 * - Raw PCM: 16-bit, 8kHz, mono, little-endian
 * - Base64 encoded
 * - Chunk size: 320 bytes multiples (min 3.2KB, max 100KB)
 */

interface VoiceBotSession {
  callId: string;
  agentId: string;
  ws: WebSocket;
  audioBuffer: Buffer;
  transcript: Array<{ role: string; content: string; timestamp: string }>;
  qualification: Record<string, any>;
  isProcessing: boolean;
  silenceTimeout: NodeJS.Timeout | null;
  maxWaitTimeout: NodeJS.Timeout | null; // Force processing after max wait
  agent: any;
  streamSid: string | null;
  greetingSent: boolean;
  dbCallId: string | null; // The database call ID from custom_parameters
  startedAt: Date; // Track call start time for duration
  language: string; // Language for transcription (hi, te, ta, en, etc.)
  userMood: string; // Current detected mood: happy, sad, angry, frustrated, neutral, confused, excited
  moodHistory: Array<{ mood: string; timestamp: string }>; // Track mood changes
  lastSpeechTime: number; // Track when speech was last detected
  speechDetected: boolean; // Whether any speech was detected in current buffer
  mediaLogged?: boolean; // For debug logging
  isSpeaking: boolean; // True when AI is sending TTS audio
  interruptTTS: boolean; // Flag to stop TTS playback when user interrupts
  greetingGraceUntil: number; // Timestamp until which interrupts are ignored (for initial greeting)
}

/**
 * Voice Activity Detection - check if audio chunk contains speech
 * Returns the RMS energy level of the audio
 */
function detectVoiceActivity(audioData: Buffer): number {
  // Calculate RMS energy for 16-bit PCM
  let sumSquares = 0;
  const samples = audioData.length / 2; // 16-bit = 2 bytes per sample

  for (let i = 0; i < audioData.length; i += 2) {
    // Read 16-bit little-endian sample
    const sample = audioData.readInt16LE(i);
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / samples);
  return rms;
}

// Active sessions
const sessions = new Map<string, VoiceBotSession>();

// Audio settings
const SAMPLE_RATE = 8000;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;
const SILENCE_THRESHOLD = 600; // 600ms of silence to trigger processing
const MAX_AUDIO_WAIT = 2500; // 2.5 seconds max wait before processing
const AUDIO_ENERGY_THRESHOLD = 400; // RMS threshold for voice activity detection
const MAX_BUFFER_SIZE = 48000; // Max 3 seconds of audio (8000 * 2 * 3) before forced processing

/**
 * Handle new WebSocket connection from Exotel
 */
export async function handleExotelWebSocket(ws: WebSocket, callId: string, agentId: string) {
  console.log(`[VoiceBot] New connection for call: ${callId}, agent: ${agentId}`);

  // Get agent details
  let agent = null;
  if (agentId && agentId !== 'undefined') {
    agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
    console.log(`[VoiceBot] Looking for agent with ID: ${agentId}, found: ${agent?.name || 'NOT FOUND'}`);
  } else {
    console.log(`[VoiceBot] WARNING: No agentId provided! Falling back to first active agent.`);
  }
  if (!agent) {
    agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } });
    console.log(`[VoiceBot] Using fallback agent: ${agent?.name || 'NONE'}`);
  }

  if (!agent) {
    console.log('[VoiceBot] No agent found, using default greeting');
  } else {
    console.log(`[VoiceBot] Agent loaded: ${agent.name}, language: ${agent.language}, voice: ${agent.voiceId}`);
  }

  // Create session
  const session: VoiceBotSession = {
    callId,
    agentId: agent?.id || '',
    ws,
    audioBuffer: Buffer.alloc(0),
    transcript: [],
    qualification: {},
    isProcessing: false,
    silenceTimeout: null,
    maxWaitTimeout: null,
    agent,
    streamSid: null,
    greetingSent: false,
    dbCallId: null,
    startedAt: new Date(),
    language: normalizeLanguageCode(agent?.language) || 'en-IN', // Default to Indian English
    userMood: 'neutral', // Default mood
    moodHistory: [], // Track mood changes throughout the call
    lastSpeechTime: 0,
    speechDetected: false,
    isSpeaking: false, // AI is not speaking initially
    interruptTTS: false, // No interruption needed initially
    greetingGraceUntil: 0, // Will be set when greeting starts to prevent early interrupts
  };

  sessions.set(callId, session);

  // NOTE: Greeting is now sent ONLY on 'start' event to prevent duplicates

  // Handle incoming messages
  ws.on('message', async (data: Buffer | string) => {
    try {
      // Log raw data type and size
      const isBuffer = Buffer.isBuffer(data);
      const dataSize = isBuffer ? data.length : data.length;

      // Check if it's binary audio data (not JSON)
      if (isBuffer && data[0] !== 123) { // 123 = '{' in ASCII
        console.log(`[VoiceBot] Received binary audio: ${dataSize} bytes`);
        session.audioBuffer = Buffer.concat([session.audioBuffer, data as Buffer]);

        // Reset and set silence timeout
        if (session.silenceTimeout) clearTimeout(session.silenceTimeout);
        session.silenceTimeout = setTimeout(async () => {
          if (!session.isProcessing && session.audioBuffer.length > 1600) {
            console.log(`[VoiceBot] Processing binary audio: ${session.audioBuffer.length} bytes`);
            await processAudioBuffer(session);
          }
        }, SILENCE_THRESHOLD);
        return;
      }

      const message = typeof data === 'string' ? JSON.parse(data) : JSON.parse(data.toString());

      // Log first few messages in detail
      if (session.transcript.length < 3) {
        console.log(`[VoiceBot] Raw message keys:`, Object.keys(message));
      }

      await handleExotelMessage(session, message);
    } catch (error) {
      console.error('[VoiceBot] Error handling message:', error);
      // If JSON parse fails, treat as binary audio
      if (Buffer.isBuffer(data)) {
        console.log(`[VoiceBot] Treating as raw audio: ${data.length} bytes`);
        session.audioBuffer = Buffer.concat([session.audioBuffer, data]);
      }
    }
  });

  // Handle connection close
  ws.on('close', async () => {
    console.log(`[VoiceBot] Connection closed for call: ${callId}`);
    if (session.silenceTimeout) {
      clearTimeout(session.silenceTimeout);
    }
    if (session.maxWaitTimeout) {
      clearTimeout(session.maxWaitTimeout);
    }
    await finalizeSession(session);
    sessions.delete(callId);
  });

  // Handle errors
  ws.on('error', (error) => {
    console.error(`[VoiceBot] WebSocket error for call ${callId}:`, error);
  });
}

/**
 * Handle incoming message from Exotel
 */
async function handleExotelMessage(session: VoiceBotSession, message: any) {
  const { event, media, start, stop, streamSid } = message;

  // Log all incoming messages for debugging
  if (event !== 'media') {
    console.log(`[VoiceBot] Received message:`, JSON.stringify(message, null, 2));
  }

  // Store stream SID
  if (streamSid) {
    session.streamSid = streamSid;
  }

  // Handle Exotel's format - may send raw audio or different event names
  if (!event) {
    // Check if this is raw audio data (base64 or binary)
    if (message.audio || message.payload || message.data) {
      const audioPayload = message.audio || message.payload || message.data;
      console.log(`[VoiceBot] Received raw audio (no event field), processing...`);

      // Exotel sends raw PCM 16-bit (128kbps = 8kHz × 16-bit) - just decode base64
      const audioData = Buffer.from(audioPayload, 'base64');

      session.audioBuffer = Buffer.concat([session.audioBuffer, audioData]);

      // Reset and set silence timeout
      if (session.silenceTimeout) clearTimeout(session.silenceTimeout);
      session.silenceTimeout = setTimeout(async () => {
        if (!session.isProcessing && session.audioBuffer.length > 1600) {
          await processAudioBuffer(session);
        }
      }, SILENCE_THRESHOLD);
      return;
    }

    // If no event and no audio, this is a connection message - wait for 'start' event
    // DON'T send greeting here as we don't have the correct agent yet from custom_parameters
    console.log(`[VoiceBot] No event field - waiting for 'start' event before sending greeting`);
    return;
  }

  switch (event) {
    case 'connected':
      console.log(`[VoiceBot] Stream connected for call: ${session.callId}`);
      // Don't send greeting here - wait for 'start' event to avoid duplicates
      break;

    case 'start':
      console.log(`[VoiceBot] Stream started:`, JSON.stringify(start, null, 2));
      session.streamSid = start?.streamSid || streamSid;

      // Try multiple methods to find the correct call and agent
      let foundCall: any = null;

      // Method 1: Try to extract callId from custom_parameters
      if (start?.custom_parameters && !foundCall) {
        try {
          console.log(`[VoiceBot] custom_parameters:`, JSON.stringify(start.custom_parameters));
          // custom_parameters comes as { "html-encoded-json": "" } - extract the key
          const customParamKey = Object.keys(start.custom_parameters)[0];
          if (customParamKey) {
            // Decode HTML entities and parse JSON
            const decoded = customParamKey
              .replace(/&quot;/g, '"')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>');
            console.log(`[VoiceBot] Decoded custom_parameters key: ${decoded}`);
            const parsed = JSON.parse(decoded);

            if (parsed.callId) {
              console.log(`[VoiceBot] Found callId in custom_parameters: ${parsed.callId}`);
              session.dbCallId = parsed.callId;
              foundCall = await prisma.outboundCall.findUnique({
                where: { id: parsed.callId },
                include: { agent: true },
              });
            }
          }
        } catch (e) {
          console.log('[VoiceBot] Could not parse custom_parameters:', e);
        }
      }

      // Method 2: Try to find call by Exotel Call SID (streamSid or start.callSid)
      if (!foundCall && (session.streamSid || start?.callSid || start?.call_sid)) {
        const exotelCallSid = session.streamSid || start?.callSid || start?.call_sid;
        console.log(`[VoiceBot] Trying to find call by Exotel SID: ${exotelCallSid}`);
        foundCall = await prisma.outboundCall.findFirst({
          where: { twilioCallSid: exotelCallSid },
          include: { agent: true },
        });
        if (foundCall) {
          console.log(`[VoiceBot] Found call by Exotel SID: ${foundCall.id}`);
          session.dbCallId = foundCall.id;
        }
      }

      // Method 3: Try to find most recent call to this session's callId (if it looks like a phone or short ID)
      if (!foundCall && session.callId) {
        // The session.callId might be a phone number format like "call_1234567890"
        // Try to find the most recent pending/in-progress call
        console.log(`[VoiceBot] Trying to find recent call by session callId: ${session.callId}`);
        foundCall = await prisma.outboundCall.findFirst({
          where: {
            status: { in: ['INITIATED', 'QUEUED', 'RINGING', 'IN_PROGRESS'] },
          },
          orderBy: { createdAt: 'desc' },
          include: { agent: true },
        });
        if (foundCall) {
          console.log(`[VoiceBot] Found most recent active call: ${foundCall.id}, agent: ${foundCall.agent?.name}`);
          session.dbCallId = foundCall.id;
        }
      }

      // Update session with found call data
      if (foundCall?.agent) {
        session.agent = foundCall.agent;
        session.agentId = foundCall.agent.id;
        // IMPORTANT: Update session language to match the agent's language
        session.language = normalizeLanguageCode(foundCall.agent.language) || 'en-IN';
        console.log(`[VoiceBot] Found agent from call: ${foundCall.agent.name}, language: ${session.language}, voice: ${foundCall.agent.voiceId}`);

        // Update call with startedAt timestamp
        await prisma.outboundCall.update({
          where: { id: foundCall.id },
          data: { startedAt: new Date(), answeredAt: new Date(), status: 'IN_PROGRESS' },
        });
      } else {
        console.log(`[VoiceBot] WARNING: Could not find call with correct agent, using session defaults`);
      }

      // Send initial greeting after stream starts (only once)
      if (!session.greetingSent) {
        session.greetingSent = true;
        // Set grace period - don't allow interrupts for 3 seconds to ensure greeting plays
        session.greetingGraceUntil = Date.now() + 3000;
        const greeting = session.agent?.greeting || "Hello! How can I help you today?";
        console.log(`[VoiceBot] Sending greeting: ${greeting}`);
        await sendTTSResponse(session, greeting);
        session.transcript.push({
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
        });

        // Set a timeout to process any accumulated audio after greeting
        setTimeout(async () => {
          if (session.audioBuffer.length > 1600 && !session.isProcessing && session.ws.readyState === WebSocket.OPEN) {
            console.log(`[VoiceBot] Processing audio after greeting timeout: ${session.audioBuffer.length} bytes`);
            await processAudioBuffer(session);
          } else if (session.audioBuffer.length < 1600 && !session.isProcessing && session.ws.readyState === WebSocket.OPEN) {
            console.log('[VoiceBot] No audio received after greeting, sending follow-up prompt');
            const followUp = "I'm here to help you. Please go ahead and tell me what you need.";
            await sendTTSResponse(session, followUp);
            session.transcript.push({
              role: 'assistant',
              content: followUp,
              timestamp: new Date().toISOString(),
            });
          }
        }, 5000); // 5 seconds after greeting - process any accumulated audio
      }
      break;

    case 'media':
      // Received audio data from customer
      // Debug: log media structure for first 5 messages
      if (!session.mediaLogged || session.audioBuffer.length < 5000) {
        console.log(`[VoiceBot] MEDIA EVENT - Full message:`, JSON.stringify(message).substring(0, 500));
        console.log(`[VoiceBot] Media object:`, JSON.stringify(media));
        console.log(`[VoiceBot] Media keys:`, media ? Object.keys(media) : 'media is null/undefined');
        if (media?.payload) console.log(`[VoiceBot] payload length: ${media.payload.length}`);
        if (media?.chunk) console.log(`[VoiceBot] chunk length: ${media.chunk.length}`);
        session.mediaLogged = true;
      }

      // If we haven't sent the greeting yet and this is the first media (no 'start' event received),
      // try to find the correct agent using the stream_sid or most recent call
      if (!session.greetingSent && session.audioBuffer.length === 0) {
        console.log(`[VoiceBot] First media received without 'start' event - trying to find correct agent`);

        // Store stream_sid from media event
        if (streamSid && !session.streamSid) {
          session.streamSid = streamSid;
        }

        let foundCall: any = null;

        // Try to find call by Exotel Call SID (stream_sid)
        if (session.streamSid) {
          console.log(`[VoiceBot] Trying to find call by stream_sid: ${session.streamSid}`);
          foundCall = await prisma.outboundCall.findFirst({
            where: { twilioCallSid: session.streamSid },
            include: { agent: true },
          });
        }

        // Fallback: find most recent active call
        if (!foundCall) {
          console.log(`[VoiceBot] Trying to find most recent active call...`);
          foundCall = await prisma.outboundCall.findFirst({
            where: {
              status: { in: ['INITIATED', 'QUEUED', 'RINGING', 'IN_PROGRESS'] },
            },
            orderBy: { createdAt: 'desc' },
            include: { agent: true },
          });
        }

        // Update session with found call data
        if (foundCall?.agent) {
          session.agent = foundCall.agent;
          session.agentId = foundCall.agent.id;
          session.dbCallId = foundCall.id;
          session.language = normalizeLanguageCode(foundCall.agent.language) || 'en-IN';
          console.log(`[VoiceBot] Found agent from call (on first media): ${foundCall.agent.name}, language: ${session.language}, voice: ${foundCall.agent.voiceId}`);

          // Update call status
          await prisma.outboundCall.update({
            where: { id: foundCall.id },
            data: { startedAt: new Date(), answeredAt: new Date(), status: 'IN_PROGRESS' },
          });
        } else {
          console.log(`[VoiceBot] No active call found, using fallback agent`);
        }

        // Now send the greeting with the correct agent
        session.greetingSent = true;
        session.greetingGraceUntil = Date.now() + 3000;
        const greeting = session.agent?.greeting || "Hello! How can I help you today?";
        console.log(`[VoiceBot] Sending greeting (on first media): ${greeting}`);
        await sendTTSResponse(session, greeting);
        session.transcript.push({
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
        });
      }

      // Try different payload locations (Exotel vs Twilio format)
      // Exotel sends PCM 16-bit audio at 128kbps (8kHz × 16-bit), NOT mulaw
      const audioPayload = media?.payload || media?.chunk || media?.audio || media?.data || media?.track;
      if (audioPayload) {
        // Log first audio payload
        if (session.audioBuffer.length === 0) {
          console.log(`[VoiceBot] FIRST AUDIO - payload type: ${typeof audioPayload}, length: ${audioPayload.length}`);
        }

        // Exotel sends raw PCM 16-bit (128kbps = 8kHz × 16-bit) - just decode base64
        const audioData = Buffer.from(audioPayload, 'base64');

        session.audioBuffer = Buffer.concat([session.audioBuffer, audioData]);

        // Voice Activity Detection - check if this chunk contains speech
        const energyLevel = detectVoiceActivity(audioData);
        const isSpeech = energyLevel > AUDIO_ENERGY_THRESHOLD;

        // Log audio reception periodically (every 20KB) with energy level
        if (session.audioBuffer.length % 20000 < audioData.length) {
          console.log(`[VoiceBot] Audio buffer: ${session.audioBuffer.length} bytes, energy: ${energyLevel.toFixed(0)}, speech: ${isSpeech}, aiSpeaking: ${session.isSpeaking}`);
        }

        // Force processing if buffer gets too large (prevents long delays)
        if (session.audioBuffer.length >= MAX_BUFFER_SIZE && !session.isProcessing) {
          console.log(`[VoiceBot] Buffer size limit reached (${session.audioBuffer.length} bytes), forcing processing`);
          if (session.silenceTimeout) {
            clearTimeout(session.silenceTimeout);
            session.silenceTimeout = null;
          }
          if (session.maxWaitTimeout) {
            clearTimeout(session.maxWaitTimeout);
            session.maxWaitTimeout = null;
          }
          await processAudioBuffer(session);
          return; // Don't continue processing this chunk
        }

        if (isSpeech) {
          // If AI is currently speaking and user starts speaking, interrupt the AI
          // But respect the greeting grace period to ensure initial greeting plays fully
          const withinGracePeriod = Date.now() < session.greetingGraceUntil;
          if (session.isSpeaking && !session.interruptTTS && !withinGracePeriod) {
            console.log(`[VoiceBot] User interrupted AI - stopping TTS playback`);
            session.interruptTTS = true;
          } else if (session.isSpeaking && withinGracePeriod) {
            console.log(`[VoiceBot] Ignoring interrupt during greeting grace period`);
          }

          // Speech detected - reset the silence timeout
          session.lastSpeechTime = Date.now();
          session.speechDetected = true;

          if (session.silenceTimeout) {
            clearTimeout(session.silenceTimeout);
            session.silenceTimeout = null;
          }

          // Start max wait timeout if not already running
          if (!session.maxWaitTimeout && session.audioBuffer.length > 1600) {
            session.maxWaitTimeout = setTimeout(async () => {
              console.log(`[VoiceBot] Max wait timeout reached, forcing processing of ${session.audioBuffer.length} bytes`);
              session.maxWaitTimeout = null;
              if (!session.isProcessing && session.audioBuffer.length > 1600) {
                await processAudioBuffer(session);
              }
            }, MAX_AUDIO_WAIT);
          }
        } else if (session.speechDetected && !session.silenceTimeout) {
          // No speech in this chunk but we had speech before - start silence timeout
          session.silenceTimeout = setTimeout(async () => {
            session.silenceTimeout = null;
            if (session.maxWaitTimeout) {
              clearTimeout(session.maxWaitTimeout);
              session.maxWaitTimeout = null;
            }
            if (!session.isProcessing && session.audioBuffer.length > 1600) {
              console.log(`[VoiceBot] Silence detected after speech, processing ${session.audioBuffer.length} bytes`);
              await processAudioBuffer(session);
            }
          }, SILENCE_THRESHOLD);
        }
      } else {
        // No audio payload found - log this for debugging
        console.log(`[VoiceBot] WARNING: No audio payload found! Media object:`, JSON.stringify(media));
      }
      break;

    case 'stop':
      console.log(`[VoiceBot] Stream stopped for call: ${session.callId}`);
      // Process any remaining audio
      if (session.audioBuffer.length > 0 && !session.isProcessing) {
        await processAudioBuffer(session);
      }
      break;

    case 'mark':
      // Audio playback completed
      console.log(`[VoiceBot] Playback mark received:`, message.mark?.name);
      break;

    default:
      console.log(`[VoiceBot] Unknown event: ${event}`, message);
  }
}

/**
 * Process accumulated audio buffer - transcribe and respond
 */
async function processAudioBuffer(session: VoiceBotSession) {
  if (session.isProcessing || session.audioBuffer.length < 1600) {
    return;
  }

  session.isProcessing = true;
  const audioData = session.audioBuffer;
  session.audioBuffer = Buffer.alloc(0);
  session.speechDetected = false; // Reset for next utterance
  session.lastSpeechTime = 0;

  try {
    console.log(`[VoiceBot] Processing ${audioData.length} bytes of audio`);

    // Convert PCM to WAV for OpenAI Whisper
    const wavBuffer = pcmToWav(audioData, SAMPLE_RATE, BITS_PER_SAMPLE, CHANNELS);

    // Transcribe with Whisper
    const transcription = await transcribeAudio(wavBuffer, session.language);

    if (transcription && transcription.trim().length > 0) {
      console.log(`[VoiceBot] Customer said: "${transcription}"`);

      // Add to transcript
      session.transcript.push({
        role: 'user',
        content: transcription,
        timestamp: new Date().toISOString(),
      });

      // Check for end conditions
      const endKeywords = ['bye', 'goodbye', 'thank you bye', 'thanks bye', 'no thanks', 'not interested', 'hang up'];
      const shouldEnd = endKeywords.some(kw => transcription.toLowerCase().includes(kw));

      if (shouldEnd) {
        const endMessage = session.agent?.endMessage ||
          'Thank you for your time. Our team will follow up with you shortly. Have a great day!';
        await sendTTSResponse(session, endMessage);
        session.transcript.push({
          role: 'assistant',
          content: endMessage,
          timestamp: new Date().toISOString(),
        });

        // Close connection after response plays
        setTimeout(() => {
          if (session.ws.readyState === WebSocket.OPEN) {
            session.ws.close();
          }
        }, 5000);
        return;
      }

      // Check for document request first
      const agentDocuments = (session.agent?.documents || []) as AgentDocument[];
      const documentRequest = await detectDocumentRequest(transcription, agentDocuments);

      if (documentRequest.isDocumentRequest && documentRequest.matchedDocuments.length > 0) {
        // User is asking for documents - send them via WhatsApp
        console.log(`[VoiceBot] Document request detected: ${documentRequest.matchedDocuments.map(d => d.name).join(', ')}`);

        // Get phone number from the call
        let phoneNumber = session.qualification.phone || '';
        if (!phoneNumber && session.dbCallId) {
          const call = await prisma.outboundCall.findUnique({ where: { id: session.dbCallId } });
          phoneNumber = call?.phoneNumber || '';
        }

        if (phoneNumber) {
          // Send documents via WhatsApp
          const sent = await sendDocumentsViaWhatsApp(
            phoneNumber,
            documentRequest.matchedDocuments,
            session.agent?.name || 'AI Assistant'
          );

          // Respond with confirmation
          const confirmationMessage = sent
            ? documentRequest.confirmationMessage
            : "I'd like to send you the documents, but I need your WhatsApp number. Could you please confirm your number?";

          session.transcript.push({
            role: 'assistant',
            content: confirmationMessage,
            timestamp: new Date().toISOString(),
          });

          await sendTTSResponse(session, confirmationMessage);

          // Store that documents were sent in qualification
          if (sent) {
            session.qualification.documentsSent = documentRequest.matchedDocuments.map(d => d.name);
          }
        } else {
          // Ask for phone number
          const askPhoneMessage = "I can send you those documents on WhatsApp. Could you please share your WhatsApp number?";
          session.transcript.push({
            role: 'assistant',
            content: askPhoneMessage,
            timestamp: new Date().toISOString(),
          });
          await sendTTSResponse(session, askPhoneMessage);
        }
      } else {
        // Generate normal AI response using agent's personality
        const aiResponse = await generateAIResponse(session, transcription);

        if (aiResponse) {
          console.log(`[VoiceBot] AI responds: "${aiResponse}"`);

          // Add to transcript
          session.transcript.push({
            role: 'assistant',
            content: aiResponse,
            timestamp: new Date().toISOString(),
          });

          // Send TTS response
          await sendTTSResponse(session, aiResponse);

          // Extract qualification data
          await extractQualificationData(session, transcription);
        }
      }
    } else {
      console.log('[VoiceBot] No speech detected or empty transcription');
    }
  } catch (error) {
    console.error('[VoiceBot] Error processing audio:', error);

    // Send fallback message
    const fallbackMessage = session.agent?.fallbackMessage ||
      "I'm sorry, I didn't catch that. Could you please repeat?";
    await sendTTSResponse(session, fallbackMessage);
  } finally {
    session.isProcessing = false;
  }
}

/**
 * Transcribe audio using OpenAI Whisper
 * Supports multiple Indian languages: Hindi, Telugu, Tamil, Kannada, Malayalam, etc.
 */
async function transcribeAudio(wavBuffer: Buffer, language?: string): Promise<string> {
  // Normalize language code to full format (e.g., 'te' -> 'te-IN')
  const langCodeMap: Record<string, string> = {
    'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
    'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
    'pa': 'pa-IN', 'en': 'en-IN', 'od': 'od-IN', 'as': 'as-IN',
  };
  const normalizedLang = language ? (langCodeMap[language] || language) : undefined;

  // Check if language is Indian and Sarvam is available
  const isIndianLanguage = normalizedLang && Object.keys(SARVAM_LANGUAGES).some(
    lang => normalizedLang.startsWith(lang.split('-')[0]) || normalizedLang === lang
  );

  // Use Sarvam for Indian languages when available
  if ((USE_SARVAM || isIndianLanguage) && sarvamService.isAvailable()) {
    try {
      console.log(`[VoiceBot] Using Sarvam STT for language: ${normalizedLang || 'auto-detect'}`);
      const result = await sarvamService.speechToText(wavBuffer, 8000, normalizedLang);
      console.log(`[VoiceBot] Sarvam transcribed: "${result.text}" (detected: ${result.detectedLanguage})`);
      return result.text || '';
    } catch (error) {
      console.error('[VoiceBot] Sarvam STT error, falling back to OpenAI:', error);
      // Fall through to OpenAI
    }
  }

  // Fallback to OpenAI Whisper
  if (!openai) {
    console.error('[VoiceBot] OpenAI not configured');
    return '';
  }

  try {
    const audioFile = new File([wavBuffer], 'audio.wav', { type: 'audio/wav' });

    // If no language specified, let Whisper auto-detect (supports Indian languages)
    const transcriptionOptions: any = {
      file: audioFile,
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
    };

    // Map language codes to Whisper-supported codes
    // Only Hindi, Bengali, Gujarati, Marathi, Tamil, and English are well-supported by Whisper
    // For other languages (Telugu, Kannada, Malayalam), let Whisper auto-detect
    if (language) {
      const langMap: Record<string, string | undefined> = {
        'hi': 'hi', 'hi-IN': 'hi', // Hindi - supported
        'bn': 'bn', 'bn-IN': 'bn', // Bengali - supported
        'gu': 'gu', 'gu-IN': 'gu', // Gujarati - supported
        'mr': 'mr', 'mr-IN': 'mr', // Marathi - supported
        'ta': 'ta', 'ta-IN': 'ta', // Tamil - supported
        'pa': 'pa', 'pa-IN': 'pa', // Punjabi - supported
        'en': 'en', 'en-IN': 'en', // English - supported
        // Telugu, Kannada, Malayalam - NOT supported, use auto-detect
        'te': undefined, 'te-IN': undefined,
        'kn': undefined, 'kn-IN': undefined,
        'ml': undefined, 'ml-IN': undefined,
      };
      const mappedLang = langMap[language];
      if (mappedLang !== undefined) {
        transcriptionOptions.language = mappedLang;
      }
      // For unsupported languages, don't set language - let Whisper auto-detect
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);
    console.log(`[VoiceBot] OpenAI transcribed (${language || 'auto'}): "${response.text}"`);

    return response.text || '';
  } catch (error) {
    console.error('[VoiceBot] Transcription error:', error);
    return '';
  }
}

/**
 * Detect user's mood from their message
 * Analyzes text for emotional cues and returns mood with confidence
 */
async function detectUserMood(userMessage: string, conversationContext: string): Promise<{
  mood: string;
  intensity: 'low' | 'medium' | 'high';
  indicators: string[];
}> {
  const defaultMood = { mood: 'neutral', intensity: 'low' as const, indicators: [] };

  if (!openai) {
    return defaultMood;
  }

  // Quick keyword-based detection for common moods (avoid API call when possible)
  const moodKeywords: Record<string, string[]> = {
    angry: ['angry', 'frustrated', 'annoyed', 'irritated', 'gussa', 'pagal', 'stupid', 'useless', 'worst', 'terrible', 'hate'],
    sad: ['sad', 'upset', 'disappointed', 'unhappy', 'dukhi', 'problem', 'issue', 'not working', 'failed', 'loss'],
    happy: ['happy', 'great', 'wonderful', 'excellent', 'perfect', 'amazing', 'love', 'thank you', 'thanks', 'awesome', 'khush', 'bahut acha'],
    confused: ['confused', 'dont understand', 'what do you mean', 'unclear', 'samajh nahi', 'kya matlab', 'how', 'why'],
    frustrated: ['again', 'still', 'not solved', 'same problem', 'how many times', 'phir se', 'abhi tak'],
    excited: ['wow', 'really', 'amazing', 'cant wait', 'excited', 'awesome', 'great news'],
    worried: ['worried', 'concerned', 'afraid', 'scared', 'tension', 'chinta', 'dar'],
  };

  const lowerMessage = userMessage.toLowerCase();

  // Check for quick mood detection
  for (const [mood, keywords] of Object.entries(moodKeywords)) {
    const matchedKeywords = keywords.filter(kw => lowerMessage.includes(kw));
    if (matchedKeywords.length > 0) {
      const intensity = matchedKeywords.length >= 3 ? 'high' : matchedKeywords.length >= 2 ? 'medium' : 'low';
      console.log(`[VoiceBot] Quick mood detection: ${mood} (${intensity}) - keywords: ${matchedKeywords.join(', ')}`);
      return { mood, intensity, indicators: matchedKeywords };
    }
  }

  // For nuanced detection, use GPT-4o
  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert at detecting emotions from text. Analyze the user's message and conversation context to determine their current emotional state.

Return JSON:
{
  "mood": "one of: happy, sad, angry, frustrated, confused, excited, worried, neutral",
  "intensity": "low, medium, or high",
  "indicators": ["list of words/phrases that indicate this mood"]
}

Consider:
- Tone and word choice
- Punctuation (!!!, ???, CAPS)
- Context from previous messages
- Cultural expressions (Hindi/Indian expressions of emotion)
- Implicit frustration (repetition, complaints)

Examples:
- "This is the third time I'm calling!" → {"mood": "frustrated", "intensity": "high", "indicators": ["third time", "calling"]}
- "Oh that's wonderful news!" → {"mood": "happy", "intensity": "medium", "indicators": ["wonderful", "!"]}
- "I don't know what to do..." → {"mood": "worried", "intensity": "medium", "indicators": ["don't know", "..."]}
- "Yeh kya ho raha hai??" → {"mood": "confused", "intensity": "medium", "indicators": ["kya ho raha hai", "??"]}`,
        },
        {
          role: 'user',
          content: `Recent conversation:\n${conversationContext}\n\nLatest message: "${userMessage}"`,
        },
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`[VoiceBot] GPT mood detection:`, result);

    return {
      mood: result.mood || 'neutral',
      intensity: result.intensity || 'low',
      indicators: result.indicators || [],
    };
  } catch (error) {
    console.error('[VoiceBot] Mood detection error:', error);
    return defaultMood;
  }
}

/**
 * Get mood-appropriate response style instructions
 */
function getMoodResponseStyle(mood: string, intensity: string): string {
  const styles: Record<string, Record<string, string>> = {
    happy: {
      low: 'Match their positive energy. Be friendly and warm.',
      medium: 'Be enthusiastic! Share in their happiness. Use positive affirmations.',
      high: 'Celebrate with them! Be very upbeat and excited. Use expressions like "That\'s fantastic!"',
    },
    sad: {
      low: 'Be gentle and understanding. Show you care.',
      medium: 'Express genuine empathy. Slow down your pace. Say things like "I understand how you feel".',
      high: 'Be very compassionate and supportive. Listen more, talk less. Offer reassurance. Say "I\'m here to help you through this".',
    },
    angry: {
      low: 'Stay calm and professional. Acknowledge their concern.',
      medium: 'Apologize if appropriate. Focus on solutions. Say "I completely understand your frustration".',
      high: 'Remain very calm. Let them vent. Apologize sincerely. Focus on immediate resolution. Say "I\'m so sorry for this experience. Let me fix this right now."',
    },
    frustrated: {
      low: 'Be patient and clear. Simplify your explanations.',
      medium: 'Acknowledge the difficulty. Provide step-by-step guidance. Say "I know this has been difficult".',
      high: 'Show deep understanding. Take ownership. Promise resolution. Say "I completely understand. This has taken too long. Let me personally ensure this gets resolved."',
    },
    confused: {
      low: 'Be clear and simple. Use examples.',
      medium: 'Slow down. Explain step by step. Check understanding frequently.',
      high: 'Be very patient. Use simple language. Offer to explain in a different way. Say "Let me explain this more simply".',
    },
    excited: {
      low: 'Match their enthusiasm lightly.',
      medium: 'Be energetic and positive. Share their excitement.',
      high: 'Be very enthusiastic! Use exclamations. Say things like "This is so exciting!"',
    },
    worried: {
      low: 'Be reassuring and calm.',
      medium: 'Provide comfort and clear information. Address concerns directly.',
      high: 'Be very reassuring. Provide concrete solutions. Say "Don\'t worry, I\'ll take care of everything".',
    },
    neutral: {
      low: 'Be professional and friendly.',
      medium: 'Be professional and friendly.',
      high: 'Be professional and friendly.',
    },
  };

  return styles[mood]?.[intensity] || styles.neutral.low;
}

/**
 * Detect if user is requesting documents/brochures/images
 * Returns matched documents and confirmation message
 */
async function detectDocumentRequest(
  userMessage: string,
  documents: AgentDocument[]
): Promise<{
  isDocumentRequest: boolean;
  matchedDocuments: AgentDocument[];
  confirmationMessage: string;
}> {
  const defaultResult = { isDocumentRequest: false, matchedDocuments: [], confirmationMessage: '' };

  if (!documents || documents.length === 0) {
    return defaultResult;
  }

  // Quick keyword check for document requests
  const documentKeywords = [
    'send', 'share', 'whatsapp', 'document', 'brochure', 'pdf', 'image', 'photo', 'picture',
    'fee', 'fees', 'structure', 'price', 'pricing', 'cost', 'charges',
    'syllabus', 'curriculum', 'course', 'program', 'details',
    'campus', 'college', 'building', 'infrastructure', 'facility', 'facilities',
    'admission', 'form', 'application', 'prospectus',
    'placement', 'result', 'achievement',
    // Hindi keywords
    'bhejo', 'bhej do', 'dikha', 'dikhao', 'photo', 'fees', 'syllabus',
    // Telugu keywords
    'pampu', 'pampandi', 'chupinchu', 'photo', 'fees',
  ];

  const lowerMessage = userMessage.toLowerCase();
  const hasDocumentKeyword = documentKeywords.some(kw => lowerMessage.includes(kw));

  if (!hasDocumentKeyword) {
    return defaultResult;
  }

  // Use AI to match documents
  if (!openai) {
    // Fallback: simple keyword matching
    const matchedDocs = documents.filter(doc => {
      const docKeywords = [...(doc.keywords || []), doc.name, doc.description].join(' ').toLowerCase();
      return documentKeywords.some(kw => lowerMessage.includes(kw) && docKeywords.includes(kw));
    });

    if (matchedDocs.length > 0) {
      return {
        isDocumentRequest: true,
        matchedDocuments: matchedDocs,
        confirmationMessage: `I'll send you the ${matchedDocs.map(d => d.name).join(' and ')} on WhatsApp right away.`,
      };
    }
    return defaultResult;
  }

  try {
    const documentList = documents.map(d => ({
      id: d.id,
      name: d.name,
      description: d.description,
      keywords: d.keywords,
    }));

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are analyzing a customer's message to determine if they are requesting documents or media to be sent to them.

Available documents:
${JSON.stringify(documentList, null, 2)}

Return JSON:
{
  "isDocumentRequest": true/false,
  "matchedDocumentIds": ["id1", "id2"],
  "confirmationMessage": "Natural confirmation message in the same language as user"
}

Examples:
- "Can you send me the fee structure?" → match fee-related documents
- "I want to see college photos" → match campus/building images
- "Send brochure on WhatsApp" → match brochure/prospectus
- "Syllabus bhej do" (Hindi: send syllabus) → match syllabus/curriculum
- "Fees details pampandi" (Telugu: send fees details) → match fee structure

If user asks for something not in the available documents, return isDocumentRequest: false.`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[VoiceBot] Document request detection:', result);

    if (result.isDocumentRequest && result.matchedDocumentIds?.length > 0) {
      const matchedDocs = documents.filter(d => result.matchedDocumentIds.includes(d.id));
      return {
        isDocumentRequest: true,
        matchedDocuments: matchedDocs,
        confirmationMessage: result.confirmationMessage || `I'll send you the requested documents on WhatsApp.`,
      };
    }

    return defaultResult;
  } catch (error) {
    console.error('[VoiceBot] Document detection error:', error);
    return defaultResult;
  }
}

/**
 * Send documents to user via WhatsApp (using Exotel)
 */
async function sendDocumentsViaWhatsApp(
  phoneNumber: string,
  documents: AgentDocument[],
  agentName: string
): Promise<boolean> {
  try {
    // Check if Exotel WhatsApp is configured
    if (!exotelService.isWhatsAppConfigured()) {
      console.log('[VoiceBot] Exotel WhatsApp not configured, cannot send documents');
      return false;
    }

    // Format phone number for WhatsApp
    let formattedPhone = phoneNumber.replace(/\s+/g, '');
    if (!formattedPhone.startsWith('+')) {
      // Assume India if no country code
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+91' + formattedPhone.substring(1);
      } else {
        formattedPhone = '+91' + formattedPhone;
      }
    }

    // Send each document
    for (const doc of documents) {
      const message = `📄 *${doc.name}*\n\n${doc.description}\n\n_Sent by ${agentName}_`;

      // Use Exotel WhatsApp to send document
      if (doc.url) {
        // Send as document with media
        await exotelService.sendWhatsAppDocument({
          to: formattedPhone,
          documentUrl: doc.url,
          filename: doc.name,
          caption: message,
        });
      } else {
        // Send as text message if no URL
        await exotelService.sendWhatsApp({
          to: formattedPhone,
          message: message,
        });
      }

      console.log(`[VoiceBot] Sent document "${doc.name}" to ${formattedPhone} via Exotel WhatsApp`);
    }

    return true;
  } catch (error) {
    console.error('[VoiceBot] Failed to send documents via WhatsApp:', error);
    return false;
  }
}

/**
 * Detect if user is requesting a language switch
 * Returns the new language code if switch is requested, null otherwise
 */
async function detectLanguageSwitch(userMessage: string): Promise<{ switchRequested: boolean; newLanguage: string | null; languageName: string }> {
  if (!openai) {
    return { switchRequested: false, newLanguage: null, languageName: '' };
  }

  // Quick check for common language switch phrases (avoid API call for normal messages)
  const switchPatterns = [
    /speak\s+(in\s+)?(\w+)/i,
    /talk\s+(in\s+)?(\w+)/i,
    /(\w+)\s+mein\s+bolo/i,           // "Telugu mein bolo" (Hindi)
    /(\w+)\s+lo\s+cheppu/i,           // "Telugu lo cheppu" (Telugu)
    /can\s+you\s+speak\s+(\w+)/i,
    /please\s+speak\s+(\w+)/i,
    /switch\s+to\s+(\w+)/i,
    /change\s+to\s+(\w+)/i,
    /(\w+)\s+language/i,
  ];

  const hasLanguageKeyword = switchPatterns.some(p => p.test(userMessage));
  if (!hasLanguageKeyword) {
    return { switchRequested: false, newLanguage: null, languageName: '' };
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Detect if the user is requesting to switch the conversation language.

Return JSON:
{
  "switchRequested": true/false,
  "newLanguage": "language code or null",
  "languageName": "human readable language name"
}

Language codes:
- "hi" for Hindi
- "te" for Telugu
- "ta" for Tamil
- "kn" for Kannada
- "ml" for Malayalam
- "mr" for Marathi
- "bn" for Bengali
- "gu" for Gujarati
- "pa" for Punjabi
- "en" for English

Examples:
- "Can you speak in Telugu?" → {"switchRequested": true, "newLanguage": "te", "languageName": "Telugu"}
- "Hindi mein baat karo" → {"switchRequested": true, "newLanguage": "hi", "languageName": "Hindi"}
- "Telugu lo cheppu" → {"switchRequested": true, "newLanguage": "te", "languageName": "Telugu"}
- "Please speak English" → {"switchRequested": true, "newLanguage": "en", "languageName": "English"}
- "What is the price?" → {"switchRequested": false, "newLanguage": null, "languageName": ""}`,
        },
        {
          role: 'user',
          content: userMessage,
        },
      ],
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log(`[VoiceBot] Language switch detection:`, result);
    return {
      switchRequested: result.switchRequested || false,
      newLanguage: result.newLanguage || null,
      languageName: result.languageName || '',
    };
  } catch (error) {
    console.error('[VoiceBot] Language switch detection error:', error);
    return { switchRequested: false, newLanguage: null, languageName: '' };
  }
}

/**
 * Generate AI response using the agent's personality and context
 * Supports Indian languages and human-like conversation
 */
async function generateAIResponse(session: VoiceBotSession, userMessage: string): Promise<string> {
  if (!openai) {
    return "Thank you for calling. Our team will get back to you shortly.";
  }

  try {
    // Check if user wants to switch language
    const languageSwitch = await detectLanguageSwitch(userMessage);
    if (languageSwitch.switchRequested && languageSwitch.newLanguage) {
      const oldLanguage = session.language || 'en';
      session.language = languageSwitch.newLanguage;
      console.log(`[VoiceBot] Language switched from ${oldLanguage} to ${session.language} (${languageSwitch.languageName})`);

      // Generate acknowledgment in the new language
      const acknowledgments: Record<string, string> = {
        'hi': `Bilkul! Ab main Hindi mein baat karungi. Aap kya jaanna chahte hain?`,
        'te': `Tappakunda! Ippudu nenu Telugu lo matladutanu. Meeku emi kavali?`,
        'ta': `Niraiyaga! Ippothu naan Tamil-il pesuvean. Enakku enna venum?`,
        'kn': `Khachitavagi! Naan eega Kannada-dalli maataladuttene. Neemage enu beku?`,
        'ml': `Theerchayayum! Enikku ippol Malayalam-il samsarikkaam. Ningalkku enthu venam?`,
        'mr': `Nakki! Aata mi Marathi madhe bolto. Tumhala kay hava?`,
        'bn': `Oboshyoi! Ami ekhon Bangla-y kotha bolbo. Apnar ki dorkar?`,
        'gu': `Bilkul! Hu have Gujarati ma vaat karish. Tamne shu joie?`,
        'pa': `Bilkul! Main hun Punjabi vich gall karanga. Tuhanu ki chahida?`,
        'en': `Of course! I'll speak in English now. How can I help you?`,
      };

      return acknowledgments[session.language] || `Sure, I'll speak in ${languageSwitch.languageName} now. How can I help you?`;
    }

    // Detect user's mood from their message
    const conversationContext = session.transcript.slice(-5).map(t => `${t.role}: ${t.content}`).join('\n');
    const moodResult = await detectUserMood(userMessage, conversationContext);

    // Update session mood if changed
    if (moodResult.mood !== session.userMood) {
      console.log(`[VoiceBot] Mood changed: ${session.userMood} → ${moodResult.mood} (${moodResult.intensity})`);
      session.userMood = moodResult.mood;
      session.moodHistory.push({
        mood: moodResult.mood,
        timestamp: new Date().toISOString(),
      });
    }

    // Get mood-appropriate response style
    const moodStyle = getMoodResponseStyle(moodResult.mood, moodResult.intensity);
    console.log(`[VoiceBot] Mood: ${moodResult.mood} (${moodResult.intensity}) - Style: ${moodStyle.substring(0, 50)}...`);

    const currentLanguage = session.language || session.agent?.language || 'en-IN';
    const isHindi = currentLanguage === 'hi' || currentLanguage.startsWith('hi');
    const isTelugu = currentLanguage === 'te' || currentLanguage.startsWith('te');
    const isTamil = currentLanguage === 'ta' || currentLanguage.startsWith('ta');
    const isKannada = currentLanguage === 'kn' || currentLanguage.startsWith('kn');
    const isMalayalam = currentLanguage === 'ml' || currentLanguage.startsWith('ml');
    const isMarathi = currentLanguage === 'mr' || currentLanguage.startsWith('mr');
    const isBengali = currentLanguage === 'bn' || currentLanguage.startsWith('bn');
    const isGujarati = currentLanguage === 'gu' || currentLanguage.startsWith('gu');
    const isPunjabi = currentLanguage === 'pa' || currentLanguage.startsWith('pa');
    const isIndianLanguage = isHindi || isTelugu || isTamil || isKannada || isMalayalam || isMarathi || isBengali || isGujarati || isPunjabi || currentLanguage.includes('IN');

    // Language name map for prompts (include both short and full codes)
    const languageNames: Record<string, string> = {
      'hi': 'Hindi', 'hi-IN': 'Hindi',
      'te': 'Telugu', 'te-IN': 'Telugu',
      'ta': 'Tamil', 'ta-IN': 'Tamil',
      'kn': 'Kannada', 'kn-IN': 'Kannada',
      'ml': 'Malayalam', 'ml-IN': 'Malayalam',
      'mr': 'Marathi', 'mr-IN': 'Marathi',
      'bn': 'Bengali', 'bn-IN': 'Bengali',
      'gu': 'Gujarati', 'gu-IN': 'Gujarati',
      'pa': 'Punjabi', 'pa-IN': 'Punjabi',
      'od': 'Odia', 'od-IN': 'Odia',
      'as': 'Assamese', 'as-IN': 'Assamese',
      'en': 'English (Indian accent)', 'en-IN': 'English (Indian accent)',
    };
    const currentLanguageName = languageNames[currentLanguage] || 'English (Indian accent)';

    // Build human-like system prompt
    let systemPrompt = session.agent?.systemPrompt || '';

    // Add human-like conversation guidelines
    systemPrompt += `

CRITICAL CONVERSATION RULES - YOU MUST FOLLOW:
1. Speak like a REAL HUMAN, not a robot. Use natural pauses, fillers like "hmm", "actually", "you know"
2. Keep responses SHORT - 1-2 sentences max. This is a phone call, not a chat.
3. Sound warm, friendly, and empathetic. Mirror the caller's energy.
4. Use the caller's name if they provide it
5. Ask ONE question at a time, never multiple questions
6. Acknowledge what they said before asking the next question
7. Don't sound scripted - vary your responses

USER'S CURRENT MOOD: ${moodResult.mood.toUpperCase()} (intensity: ${moodResult.intensity})
RESPONSE STYLE: ${moodStyle}

MOOD-BASED BEHAVIOR:
- If user sounds ANGRY or FRUSTRATED: Stay calm, apologize if needed, focus on solutions immediately
- If user sounds SAD or WORRIED: Be gentle, empathetic, offer reassurance
- If user sounds HAPPY or EXCITED: Match their energy, be enthusiastic
- If user sounds CONFUSED: Slow down, explain clearly, use simple words
- Always acknowledge their feelings before proceeding with business`;

    // Add language-specific instructions
    systemPrompt += `

CURRENT CONVERSATION LANGUAGE: ${currentLanguageName}
YOU MUST respond in ${currentLanguageName}. This is very important!`;

    if (isIndianLanguage) {
      systemPrompt += `

LANGUAGE INSTRUCTIONS:
- Respond ONLY in ${currentLanguageName} (use Roman/English script for readability)
- Use respectful terms: "aap", "ji", "sir", "madam"
- Be culturally appropriate and polite
- If user switches language mid-conversation, acknowledge and switch`;
    }

    if (isHindi) {
      systemPrompt += `
- Respond in Hindi using Roman script: "Namaste, aap kaise hain?"
- Example: "Ji bilkul, main aapki madad kar sakti hoon"`;
    } else if (isTelugu) {
      systemPrompt += `
- Respond in Telugu using Roman script: "Namaskaram, meeru ela unnaru?"
- Example: "Avunu, nenu mee ki help chestanu"`;
    } else if (isTamil) {
      systemPrompt += `
- Respond in Tamil using Roman script: "Vanakkam, eppadi irukkeengal?"
- Example: "Aama, naan ungalukku udavi seiya mudiyum"`;
    } else if (isKannada) {
      systemPrompt += `
- Respond in Kannada using Roman script: "Namaskara, hegiddira?"
- Example: "Houdu, naanu nimage sahaya maadaballenu"`;
    } else if (isMalayalam) {
      systemPrompt += `
- Respond in Malayalam using Roman script: "Namaskkaram, sukham aano?"
- Example: "Aanu, enikku ningale sahayikkan kazhiyum"`;
    } else if (isMarathi) {
      systemPrompt += `
- Respond in Marathi using Roman script: "Namaskar, kase aahat?"
- Example: "Ho, mi tumhala madad karu shakto"`;
    } else if (isBengali) {
      systemPrompt += `
- Respond in Bengali using Roman script: "Nomoshkar, kemon achen?"
- Example: "Hyan, ami apnake sahajyo korte pari"`;
    } else if (isGujarati) {
      systemPrompt += `
- Respond in Gujarati using Roman script: "Kem cho? Shu khabar?"
- Example: "Haa, hu tamne madad kari shaku"`;
    } else if (isPunjabi) {
      systemPrompt += `
- Respond in Punjabi using Roman script: "Sat Sri Akal, ki haal hai?"
- Example: "Haan ji, main tuhadi madad kar sakda haan"`;
    }

    // Add agent's questions context if available
    const questions = session.agent?.questions || session.agent?.qualificationQuestions || [];
    if (questions.length > 0) {
      const questionsText = questions.map((q: any, i: number) =>
        `${i + 1}. ${q.question || q} (collect: ${q.field || 'info'})`
      ).join('\n');
      systemPrompt += `

INFORMATION TO COLLECT (ask naturally, one at a time):
${questionsText}

Remember: Don't interrogate! Ask casually like a friend would.`;
    }

    // Add FAQs if available
    const faqs = session.agent?.faqs || [];
    if (faqs.length > 0) {
      const faqsText = faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
      systemPrompt += `\n\nFAQs (use these to answer questions):\n${faqsText}`;
    }

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add conversation history (last 10 turns for context)
    const recentTranscript = session.transcript.slice(-10);
    for (const turn of recentTranscript) {
      messages.push({ role: turn.role, content: turn.content });
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      max_tokens: 150,
      temperature: 0.8, // Slightly higher for more natural variation
    });

    return response.choices[0]?.message?.content || "I understand. How else can I help you?";
  } catch (error) {
    console.error('[VoiceBot] AI response error:', error);
    return "I apologize, could you please repeat that?";
  }
}

/**
 * Extract qualification data from user responses
 * Comprehensive extraction for lead generation
 */
async function extractQualificationData(session: VoiceBotSession, userMessage: string): Promise<void> {
  if (!openai) return;

  try {
    // Get custom fields from agent config
    const questions = session.agent?.questions || session.agent?.qualificationQuestions || [];
    const customFields = questions.map((q: any) => q.field || 'info').join(', ');

    // Standard fields to always extract
    const standardFields = 'name, firstName, lastName, email, phone, company, designation, budget, timeline, interest, location, city, requirements';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are extracting lead information from a phone conversation.
Extract any of these fields if mentioned: ${standardFields}${customFields ? ', ' + customFields : ''}

IMPORTANT:
- Extract names in both English and transliterated form
- If someone says "mera naam Rahul hai" extract name: "Rahul"
- If someone says "I work at TCS" extract company: "TCS"
- If they mention a budget like "50 lakhs" extract budget: "50 lakhs"
- If they mention location like "Hyderabad" extract city: "Hyderabad"
- Return ONLY valid JSON with extracted fields
- Return {} if nothing relevant found`,
        },
        {
          role: 'user',
          content: `Conversation context:\n${session.transcript.slice(-5).map(t => `${t.role}: ${t.content}`).join('\n')}\n\nLatest message: ${userMessage}`,
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const extracted = JSON.parse(response.choices[0]?.message?.content || '{}');

    // Merge with existing qualification data
    if (Object.keys(extracted).length > 0) {
      session.qualification = { ...session.qualification, ...extracted };
      console.log('[VoiceBot] Extracted lead data:', extracted);
    }
  } catch (error) {
    console.error('[VoiceBot] Lead extraction error:', error);
  }
}

/**
 * Analyze call and generate detailed insights
 */
async function analyzeCall(session: VoiceBotSession): Promise<{
  summary: string;
  sentiment: string;
  outcome: string;
  keyPoints: string[];
  leadScore: number;
  nextAction: string;
  moodJourney: string;
  dominantMood: string;
}> {
  const defaultResult = {
    summary: '',
    sentiment: 'neutral',
    outcome: 'NEEDS_FOLLOWUP',
    keyPoints: [],
    leadScore: 0,
    nextAction: 'Follow up with the lead',
    moodJourney: 'neutral',
    dominantMood: session.userMood || 'neutral',
  };

  if (!openai || session.transcript.length === 0) {
    return defaultResult;
  }

  try {
    const transcriptText = session.transcript.map(t => `${t.role}: ${t.content}`).join('\n');
    const moodHistoryText = session.moodHistory.map(m => `${m.mood} at ${m.timestamp}`).join(' → ') || 'neutral throughout';

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this phone call and provide insights in JSON format:
{
  "summary": "2-3 sentence summary of the call",
  "sentiment": "positive/neutral/negative",
  "outcome": "INTERESTED/NOT_INTERESTED/CALLBACK_REQUESTED/NEEDS_FOLLOWUP/CONVERTED/NO_ANSWER/VOICEMAIL",
  "keyPoints": ["key point 1", "key point 2"],
  "leadScore": 0-100 (how likely to convert),
  "nextAction": "recommended next action",
  "moodJourney": "description of how customer's mood changed during call",
  "dominantMood": "the overall/most frequent mood"
}

OUTCOME CLASSIFICATION RULES (use these strictly):
- INTERESTED: Customer asked questions, showed curiosity, requested more info, asked about pricing/features, or said yes/interested
- NOT_INTERESTED: Customer explicitly declined, said no, not interested, don't call again, or was dismissive
- CALLBACK_REQUESTED: Customer asked to be called back later, said "call me tomorrow/later", or gave a specific callback time
- CONVERTED: Customer agreed to purchase, signed up, booked appointment, or confirmed they want to proceed
- NO_ANSWER: Call was not answered (very short transcript with only AI greeting)
- VOICEMAIL: Reached voicemail
- NEEDS_FOLLOWUP: ONLY use this when none of the above clearly apply AND conversation was incomplete/cut off

Mood history during call: ${moodHistoryText}
Current mood: ${session.userMood}

IMPORTANT: Do NOT default to NEEDS_FOLLOWUP. Analyze the actual conversation and pick the most appropriate outcome.`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const analysis = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[VoiceBot] Call analysis:', analysis);

    // If outcome is NEEDS_FOLLOWUP, try to determine from keywords
    let outcome = analysis.outcome || 'NEEDS_FOLLOWUP';
    if (outcome === 'NEEDS_FOLLOWUP') {
      const fullText = transcriptText.toLowerCase();

      // Check for clear interest signals
      if (fullText.includes('yes') || fullText.includes('interested') ||
          fullText.includes('tell me more') || fullText.includes('how much') ||
          fullText.includes('price') || fullText.includes('cost') ||
          fullText.includes('sounds good') || fullText.includes('i want')) {
        outcome = 'INTERESTED';
      }
      // Check for not interested signals
      else if (fullText.includes('not interested') || fullText.includes('no thanks') ||
               fullText.includes('don\'t call') || fullText.includes('stop calling') ||
               fullText.includes('remove me') || fullText.includes('no need')) {
        outcome = 'NOT_INTERESTED';
      }
      // Check for callback requests
      else if (fullText.includes('call me later') || fullText.includes('call back') ||
               fullText.includes('call tomorrow') || fullText.includes('busy right now')) {
        outcome = 'CALLBACK_REQUESTED';
      }
      // Check for very short conversations (likely no real interaction)
      else if (session.transcript.filter(t => t.role === 'user').length <= 1) {
        outcome = 'NO_ANSWER';
      }
    }

    return {
      summary: analysis.summary || '',
      sentiment: analysis.sentiment || 'neutral',
      outcome,
      keyPoints: analysis.keyPoints || [],
      leadScore: analysis.leadScore || 0,
      nextAction: analysis.nextAction || 'Follow up with the lead',
      moodJourney: analysis.moodJourney || 'neutral throughout',
      dominantMood: analysis.dominantMood || session.userMood || 'neutral',
    };
  } catch (error) {
    console.error('[VoiceBot] Call analysis error:', error);
    return defaultResult;
  }
}

/**
 * Detect callback request and extract scheduled time
 * Handles phrases like "call me tomorrow", "call at 5 PM", "call next week"
 */
async function detectCallbackRequest(session: VoiceBotSession): Promise<{
  isCallbackRequested: boolean;
  scheduledAt: Date | null;
  scheduledTimeDescription: string;
}> {
  if (!openai || session.transcript.length === 0) {
    return { isCallbackRequested: false, scheduledAt: null, scheduledTimeDescription: '' };
  }

  try {
    const transcriptText = session.transcript.map(t => `${t.role}: ${t.content}`).join('\n');
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istNow = new Date(now.getTime() + istOffset);

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze this conversation to detect if the customer requested a callback.
Current date/time (IST): ${istNow.toISOString()}

Look for phrases like:
- "call me tomorrow"
- "call me later"
- "call me at 5 PM"
- "call me next week"
- "call me on Monday"
- "kal phone karna" (Hindi for call tomorrow)
- "baad mein call karo" (Hindi for call later)

Return JSON:
{
  "isCallbackRequested": true/false,
  "scheduledAt": "ISO date string or null",
  "scheduledTimeDescription": "human readable description like 'Tomorrow at 10 AM'"
}

IMPORTANT:
- If they say "tomorrow", use tomorrow's date at 10 AM IST
- If they say "later", schedule for 2 hours from now
- If they say "next week", use next Monday at 10 AM IST
- If they give a specific time, use that time
- If no callback requested, return isCallbackRequested: false`,
        },
        {
          role: 'user',
          content: transcriptText,
        },
      ],
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(response.choices[0]?.message?.content || '{}');
    console.log('[VoiceBot] Callback detection:', result);

    return {
      isCallbackRequested: result.isCallbackRequested || false,
      scheduledAt: result.scheduledAt ? new Date(result.scheduledAt) : null,
      scheduledTimeDescription: result.scheduledTimeDescription || '',
    };
  } catch (error) {
    console.error('[VoiceBot] Callback detection error:', error);
    return { isCallbackRequested: false, scheduledAt: null, scheduledTimeDescription: '' };
  }
}

/**
 * Create a scheduled callback
 */
async function createScheduledCallback(
  session: VoiceBotSession,
  scheduledAt: Date,
  description: string,
  phoneNumber: string
): Promise<void> {
  try {
    if (!session.agent?.organizationId) {
      console.log('[VoiceBot] No organization ID, skipping scheduled callback');
      return;
    }

    const scheduledCall = await prisma.scheduledCall.create({
      data: {
        organizationId: session.agent.organizationId,
        agentId: session.agentId,
        phoneNumber: phoneNumber,
        contactName: session.qualification.name || session.qualification.firstName || 'Unknown',
        scheduledAt: scheduledAt,
        timezone: 'Asia/Kolkata',
        callType: 'CALLBACK',
        priority: 8, // High priority for customer-requested callbacks
        notes: `Customer requested callback: "${description}". Previous call summary: ${session.transcript.slice(-3).map(t => `${t.role}: ${t.content}`).join(' | ')}`,
        status: 'PENDING',
      },
    });

    console.log(`[VoiceBot] Created scheduled callback: ${scheduledCall.id} for ${scheduledAt.toISOString()}`);
  } catch (error) {
    console.error('[VoiceBot] Failed to create scheduled callback:', error);
  }
}

/**
 * Send TTS response back to Exotel via WebSocket
 */
async function sendTTSResponse(session: VoiceBotSession, text: string): Promise<void> {
  if (session.ws.readyState !== WebSocket.OPEN) {
    console.error('[VoiceBot] WebSocket not open');
    return;
  }

  // Reset interruption flag before speaking
  // NOTE: Only set isSpeaking = true AFTER TTS audio is generated to avoid
  // race condition where incoming audio triggers interrupt before TTS is ready
  session.interruptTTS = false;

  try {
    let resampledAudio: Buffer;

    // Determine language for TTS - default to English (Indian accent)
    // Use agent's language if set, otherwise default to 'en-IN' for Indian English accent
    // Normalize to full format (e.g., 'te' -> 'te-IN') for consistent matching
    const rawLanguage = session.language || session.agent?.language || 'en-IN';
    const language = normalizeLanguageCode(rawLanguage) || 'en-IN';

    // Regional Indian languages that need Sarvam (OpenAI doesn't support these)
    // English (en-IN) should use OpenAI for faster response times
    const regionalIndianLanguages = ['hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'od-IN', 'as-IN'];
    const isRegionalIndian = regionalIndianLanguages.includes(language);

    console.log(`[VoiceBot] TTS language: raw=${rawLanguage}, normalized=${language}, isRegionalIndian=${isRegionalIndian}`);

    // Get voice for caching key
    const voiceGender = session.agent?.voiceId?.includes('male') ? 'male' : 'female';
    const voiceId = isRegionalIndian ? sarvamService.getVoiceForLanguage(language, voiceGender) : (session.agent?.voiceId || 'nova');

    // Check cache first
    const cachedAudio = getCachedTTS(text, language, voiceId);
    if (cachedAudio) {
      resampledAudio = cachedAudio;
    }
    // Check for ElevenLabs custom voice FIRST (takes priority over language-based selection)
    else if (session.agent?.voiceId?.toLowerCase().startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY) {
      const elevenLabsVoiceId = session.agent.voiceId.replace(/^elevenlabs_/i, '');
      console.log(`[VoiceBot] Using ElevenLabs TTS for custom voice: ${elevenLabsVoiceId}`);
      try {
        resampledAudio = await generateElevenLabsTTS(text, elevenLabsVoiceId);
        // Cache for future use
        setCachedTTS(text, language, session.agent.voiceId, resampledAudio);
      } catch (error) {
        console.error('[VoiceBot] ElevenLabs TTS error, falling back to Sarvam/OpenAI:', error);
        // Fall through to language-based selection
        if (isRegionalIndian && sarvamService.isAvailable()) {
          const sarvamVoice = sarvamService.getVoiceForLanguage(language, voiceGender);
          const audioBuffer = await sarvamService.textToSpeech(text, sarvamVoice, language, 8000);
          resampledAudio = audioBuffer.length > 44 ? audioBuffer.slice(44) : audioBuffer;
        } else {
          resampledAudio = await generateOpenAITTS(text, session);
        }
      }
    }
    // Use Sarvam TTS for regional Indian languages (Telugu, Hindi, Tamil, etc.)
    // Use OpenAI for English since it's faster
    else if (isRegionalIndian && sarvamService.isAvailable()) {
      try {
        console.log(`[VoiceBot] Using Sarvam TTS for: "${text.substring(0, 50)}..." (${language})`);

        const sarvamVoice = sarvamService.getVoiceForLanguage(language, voiceGender);

        // Request Sarvam TTS at 8000 Hz for telephony
        const audioBuffer = await sarvamService.textToSpeech(text, sarvamVoice, language, 8000);

        // Sarvam returns WAV - read sample rate from header to verify
        // WAV header: bytes 0-3 = "RIFF", bytes 24-27 = sample rate
        let sarvamSampleRate = 22050; // Default to 22050 Hz (Sarvam default)
        const headerCheck = audioBuffer.slice(0, 4).toString('ascii');
        console.log(`[VoiceBot] Sarvam audio header: "${headerCheck}", length: ${audioBuffer.length}`);

        if (headerCheck === 'RIFF' && audioBuffer.length > 28) {
          sarvamSampleRate = audioBuffer.readUInt32LE(24);
          console.log(`[VoiceBot] Sarvam WAV sample rate from header: ${sarvamSampleRate} Hz`);
        } else {
          console.log(`[VoiceBot] Sarvam audio not WAV format, assuming ${sarvamSampleRate} Hz`);
        }

        // Extract PCM (skip 44-byte WAV header if present)
        const pcmAudio = (headerCheck === 'RIFF' && audioBuffer.length > 44) ? audioBuffer.slice(44) : audioBuffer;

        // Always resample to 8kHz for telephony
        if (sarvamSampleRate !== 8000) {
          resampledAudio = resamplePCM(pcmAudio, sarvamSampleRate, 8000);
          console.log(`[VoiceBot] Sarvam TTS resampled: ${pcmAudio.length} bytes @ ${sarvamSampleRate}Hz -> ${resampledAudio.length} bytes @ 8kHz`);
        } else {
          resampledAudio = pcmAudio;
          console.log(`[VoiceBot] Sarvam TTS: ${pcmAudio.length} bytes @ 8kHz (no resample needed)`);
        }

        // Cache for future use
        setCachedTTS(text, language, sarvamVoice, resampledAudio);
      } catch (error) {
        console.error('[VoiceBot] Sarvam TTS error, falling back to OpenAI:', error);
        // Fall through to OpenAI
        resampledAudio = await generateOpenAITTS(text, session);
      }
    } else {
      // Use OpenAI TTS for English and unsupported languages (faster)
      console.log(`[VoiceBot] Using OpenAI TTS for: "${text.substring(0, 50)}..." (${language})`);
      resampledAudio = await generateOpenAITTS(text, session);

      // Cache for future use
      setCachedTTS(text, language, session.agent?.voiceId || 'nova', resampledAudio);
    }

    console.log(`[VoiceBot] Sending ${resampledAudio.length} bytes of audio`);

    // Set isSpeaking = true NOW (after TTS generation) to avoid race condition
    // where incoming audio triggers interrupt before TTS audio is ready
    session.isSpeaking = true;

    // Send audio in chunks (will check for interruption)
    await sendAudioChunks(session, resampledAudio);

  } catch (error) {
    console.error('[VoiceBot] TTS error:', error);
  } finally {
    session.isSpeaking = false;
  }
}

/**
 * Generate TTS using ElevenLabs for custom cloned voices
 * Returns raw PCM audio - NO encoding, NO processing
 */
async function generateElevenLabsTTS(text: string, elevenLabsVoiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  console.log(`[VoiceBot] Using ElevenLabs TTS for custom voice: ${elevenLabsVoiceId}`);

  // Request PCM 22050Hz - higher quality for better resampling
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${elevenLabsVoiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
      output_format: 'pcm_22050', // 22.05kHz 16-bit PCM
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[ElevenLabs] TTS error:', error);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  // Get raw audio buffer - ElevenLabs returns 22.05kHz 16-bit PCM
  const pcmBuffer = Buffer.from(await response.arrayBuffer());
  console.log(`[ElevenLabs] Received ${pcmBuffer.length} bytes PCM at 22050Hz`);

  // Resample from 22050Hz to 8000Hz using linear interpolation
  const srcRate = 22050;
  const dstRate = 8000;
  const ratio = srcRate / dstRate;
  const srcSamples = Math.floor(pcmBuffer.length / 2);
  const dstSamples = Math.floor(srcSamples / ratio);
  const pcm8kBuffer = Buffer.alloc(dstSamples * 2);

  for (let i = 0; i < dstSamples; i++) {
    const srcPos = i * ratio;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s1 = idx * 2 < pcmBuffer.length - 1 ? pcmBuffer.readInt16LE(idx * 2) : 0;
    const s2 = (idx + 1) * 2 < pcmBuffer.length - 1 ? pcmBuffer.readInt16LE((idx + 1) * 2) : s1;
    const sample = Math.round(s1 + frac * (s2 - s1));
    pcm8kBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
  }

  console.log(`[ElevenLabs] Resampled to ${pcm8kBuffer.length} bytes PCM at 8kHz`);
  return pcm8kBuffer;
}

/**
 * Convert μ-law byte to 16-bit PCM sample
 */
function mulawToPCM(mulawByte: number): number {
  mulawByte = ~mulawByte;
  const sign = (mulawByte & 0x80) ? -1 : 1;
  const exponent = (mulawByte >> 4) & 0x07;
  const mantissa = mulawByte & 0x0F;
  const sample = sign * ((mantissa << 3) + 0x84) * (1 << exponent) - 0x84;
  return Math.max(-32768, Math.min(32767, sample));
}

/**
 * Generate TTS using OpenAI or ElevenLabs (for custom voices)
 */
async function generateOpenAITTS(text: string, session: VoiceBotSession): Promise<Buffer> {
  const agentVoice = session.agent?.voiceId?.toLowerCase() || 'alloy';

  // Check if this is an ElevenLabs custom voice
  if (agentVoice.startsWith('elevenlabs_') && process.env.ELEVENLABS_API_KEY) {
    const elevenLabsVoiceId = agentVoice.replace('elevenlabs_', '');
    try {
      return await generateElevenLabsTTS(text, elevenLabsVoiceId);
    } catch (error) {
      console.error('[VoiceBot] ElevenLabs TTS failed, falling back to OpenAI:', error);
      // Fall through to OpenAI
    }
  }

  if (!openai) {
    throw new Error('OpenAI not configured for TTS');
  }

  // Map Sarvam/custom voices to valid OpenAI voices
  const voiceMapping: Record<string, string> = {
    // Sarvam voices -> OpenAI equivalents
    'priya': 'nova',      // Female Indian
    'kavya': 'shimmer',   // Female
    'meera': 'nova',      // Female
    'sujata': 'shimmer',  // Female
    'dev': 'echo',        // Male Indian
    'ravi': 'onyx',       // Male
    'arjun': 'echo',      // Male
    'vikram': 'onyx',     // Male
    // Direct OpenAI voices (pass through)
    'nova': 'nova',
    'shimmer': 'shimmer',
    'echo': 'echo',
    'onyx': 'onyx',
    'fable': 'fable',
    'alloy': 'alloy',
    'ash': 'ash',
    'sage': 'sage',
    'coral': 'coral',
  };

  const openaiVoice = voiceMapping[agentVoice] || 'alloy';

  // Get TTS settings from environment variables
  const ttsModel = process.env.TTS_MODEL || 'tts-1-hd';
  const ttsSpeed = parseFloat(process.env.TTS_SPEED || '1.0');

  // Validate model and speed
  const validModel = ttsModel === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  const validSpeed = Math.max(0.25, Math.min(4.0, ttsSpeed));

  console.log(`[VoiceBot] Using OpenAI TTS for: "${text.substring(0, 50)}..." (voice: ${openaiVoice}, model: ${validModel}, speed: ${validSpeed})`);

  const response = await openai.audio.speech.create({
    model: validModel,
    voice: openaiVoice as any,
    input: text,
    response_format: 'pcm',
    speed: validSpeed,
  });

  // Get audio buffer (OpenAI TTS outputs 24kHz, 16-bit, mono PCM)
  const audioBuffer = Buffer.from(await response.arrayBuffer());

  // Resample from 24kHz to 8kHz for Exotel (simple linear interpolation - clean audio)
  return resamplePCMSimple(audioBuffer, 24000, 8000);
}

/**
 * Simple low-pass filter to reduce high frequencies before downsampling
 * Prevents aliasing artifacts when converting 24kHz to 8kHz
 * Uses a moving average filter for simplicity and efficiency
 */
function lowPassFilter(input: Buffer, sampleRate: number, cutoffFreq: number): Buffer {
  const output = Buffer.alloc(input.length);
  const inputSamples = input.length / 2;

  // Calculate filter window size based on cutoff frequency
  // Higher cutoff = smaller window, lower cutoff = larger window
  const windowSize = Math.max(3, Math.min(7, Math.round(sampleRate / cutoffFreq / 2)));

  for (let i = 0; i < inputSamples; i++) {
    let sum = 0;
    let count = 0;

    // Average samples in window
    for (let j = -Math.floor(windowSize / 2); j <= Math.floor(windowSize / 2); j++) {
      const idx = i + j;
      if (idx >= 0 && idx < inputSamples) {
        sum += input.readInt16LE(idx * 2);
        count++;
      }
    }

    const filtered = Math.round(sum / count);
    output.writeInt16LE(Math.max(-32768, Math.min(32767, filtered)), i * 2);
  }

  return output;
}

/**
 * Send audio data in chunks to Exotel
 * Exotel expects raw/slin (16-bit, 8kHz, mono PCM little-endian) encoded in base64
 */
async function sendAudioChunks(session: VoiceBotSession, audioBuffer: Buffer): Promise<void> {
  console.log(`[VoiceBot] Sending PCM audio: ${audioBuffer.length} bytes (16-bit, 8kHz)`);

  // Chunk size: 3200 bytes = 100ms of audio at 8kHz, 16-bit
  const CHUNK_SIZE = 3200;

  for (let i = 0; i < audioBuffer.length; i += CHUNK_SIZE) {
    // Check if user interrupted - stop sending audio
    if (session.interruptTTS) {
      console.log(`[VoiceBot] TTS interrupted by user speech at ${Math.round(i/audioBuffer.length*100)}%`);
      // Send clear message to stop any queued audio
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({
          event: 'clear',
          streamSid: session.streamSid || session.callId,
        }));
      }
      return;
    }

    const chunk = audioBuffer.slice(i, Math.min(i + CHUNK_SIZE, audioBuffer.length));

    // Ensure chunk is multiple of 320 bytes for PCM
    let paddedChunk = chunk;
    const remainder = chunk.length % 320;
    if (remainder !== 0) {
      const padding = Buffer.alloc(320 - remainder, 0x00);
      paddedChunk = Buffer.concat([chunk, padding]);
    }

    const message = {
      event: 'media',
      streamSid: session.streamSid || session.callId,
      media: {
        payload: paddedChunk.toString('base64'),
      },
    };

    if (session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(JSON.stringify(message));
    }

    // Delay between chunks (100ms)
    await sleep(100);
  }

  // Send mark to indicate end of audio
  const markMessage = {
    event: 'mark',
    streamSid: session.streamSid || session.callId,
    mark: {
      name: `response_${Date.now()}`,
    },
  };

  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.send(JSON.stringify(markMessage));
  }
}

/**
 * Convert raw PCM to WAV format for Whisper
 */
function pcmToWav(pcmData: Buffer, sampleRate: number, bitsPerSample: number, channels: number): Buffer {
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const dataSize = pcmData.length;
  const headerSize = 44;

  const header = Buffer.alloc(headerSize);

  // RIFF header
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);

  // fmt chunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmData]);
}

/**
 * Resample PCM audio using cubic interpolation for better quality
 * Improved algorithm that preserves more audio clarity than linear interpolation
 */
function resamplePCM(input: Buffer, inputRate: number, outputRate: number): Buffer {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const inputSamples = input.length / 2;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  // Helper to read sample with bounds checking
  const getSample = (index: number): number => {
    if (index < 0) return input.readInt16LE(0);
    if (index >= inputSamples) return input.readInt16LE((inputSamples - 1) * 2);
    return input.readInt16LE(index * 2);
  };

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const fraction = srcIndex - srcFloor;

    // Cubic interpolation using 4 points for smoother audio
    const s0 = getSample(srcFloor - 1);
    const s1 = getSample(srcFloor);
    const s2 = getSample(srcFloor + 1);
    const s3 = getSample(srcFloor + 2);

    // Catmull-Rom spline interpolation
    const a0 = -0.5 * s0 + 1.5 * s1 - 1.5 * s2 + 0.5 * s3;
    const a1 = s0 - 2.5 * s1 + 2 * s2 - 0.5 * s3;
    const a2 = -0.5 * s0 + 0.5 * s2;
    const a3 = s1;

    const t = fraction;
    const interpolated = Math.round(a0 * t * t * t + a1 * t * t + a2 * t + a3);

    output.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return output;
}

/**
 * Simple linear interpolation resampling - clean and fast
 * Original working implementation without extra processing
 */
function resamplePCMSimple(input: Buffer, inputRate: number, outputRate: number): Buffer {
  if (inputRate === outputRate) return input;

  const ratio = inputRate / outputRate;
  const inputSamples = input.length / 2;
  const outputSamples = Math.floor(inputSamples / ratio);
  const output = Buffer.alloc(outputSamples * 2);

  for (let i = 0; i < outputSamples; i++) {
    const srcIndex = i * ratio;
    const srcFloor = Math.floor(srcIndex);
    const srcCeil = Math.min(srcFloor + 1, inputSamples - 1);
    const fraction = srcIndex - srcFloor;

    const sample1 = input.readInt16LE(srcFloor * 2);
    const sample2 = input.readInt16LE(srcCeil * 2);
    const interpolated = Math.round(sample1 + (sample2 - sample1) * fraction);

    output.writeInt16LE(Math.max(-32768, Math.min(32767, interpolated)), i * 2);
  }

  return output;
}

/**
 * Normalize PCM audio to prevent clipping and maximize clarity
 * Adjusts volume to use full dynamic range without distortion
 */
function normalizePCM(buffer: Buffer, targetPeakDb: number = -3): Buffer {
  const output = Buffer.alloc(buffer.length);

  // Find peak amplitude
  let maxAmplitude = 0;
  for (let i = 0; i < buffer.length; i += 2) {
    const sample = Math.abs(buffer.readInt16LE(i));
    if (sample > maxAmplitude) maxAmplitude = sample;
  }

  if (maxAmplitude === 0) return buffer;

  // Calculate normalization factor
  // Target peak in linear scale (e.g., -3dB = 0.707)
  const targetPeak = Math.pow(10, targetPeakDb / 20) * 32767;
  const gain = targetPeak / maxAmplitude;

  // Apply normalization
  for (let i = 0; i < buffer.length; i += 2) {
    let sample = buffer.readInt16LE(i);
    sample = Math.round(sample * gain);
    sample = Math.max(-32768, Math.min(32767, sample));
    output.writeInt16LE(sample, i);
  }

  console.log(`[VoiceBot] Audio normalized: peak ${maxAmplitude} -> ${Math.round(maxAmplitude * gain)}, gain: ${gain.toFixed(2)}x`);
  return output;
}

/**
 * Amplify PCM audio for better telephony clarity
 * @param buffer - PCM 16-bit audio buffer
 * @param gain - Volume multiplier (1.0 = no change, 1.5 = 50% louder)
 */
function amplifyPCM(buffer: Buffer, gain: number): Buffer {
  const output = Buffer.alloc(buffer.length);

  for (let i = 0; i < buffer.length; i += 2) {
    let sample = buffer.readInt16LE(i);
    sample = Math.round(sample * gain);
    // Clamp to prevent clipping
    sample = Math.max(-32768, Math.min(32767, sample));
    output.writeInt16LE(sample, i);
  }

  return output;
}

/**
 * Encode PCM (16-bit signed) to mulaw (8-bit)
 * Exotel WebSocket expects mulaw encoded audio
 */
function pcmToMulaw(pcmBuffer: Buffer): Buffer {
  const mulawBuffer = Buffer.alloc(pcmBuffer.length / 2);

  for (let i = 0; i < pcmBuffer.length / 2; i++) {
    const sample = pcmBuffer.readInt16LE(i * 2);
    mulawBuffer[i] = linearToMulaw(sample);
  }

  return mulawBuffer;
}

/**
 * Convert a 16-bit linear PCM sample to 8-bit mulaw
 */
function linearToMulaw(sample: number): number {
  const MULAW_MAX = 0x1FFF;
  const MULAW_BIAS = 33;
  const sign = (sample >> 8) & 0x80;

  if (sign !== 0) sample = -sample;
  if (sample > MULAW_MAX) sample = MULAW_MAX;

  sample = sample + MULAW_BIAS;

  let exponent = 7;
  for (let expMask = 0x4000; (sample & expMask) === 0 && exponent > 0; exponent--, expMask >>= 1) {}

  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  const mulawByte = ~(sign | (exponent << 4) | mantissa);

  return mulawByte & 0xFF;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Finalize session - save transcript, create lead
 */
async function finalizeSession(session: VoiceBotSession): Promise<void> {
  try {
    // Use dbCallId (from custom_parameters) if available, otherwise try session.callId
    const callId = session.dbCallId || session.callId;
    console.log(`[VoiceBot] Finalizing session for call: ${callId}`);
    console.log(`[VoiceBot] Transcript turns: ${session.transcript.length}`);
    console.log(`[VoiceBot] Qualification data:`, session.qualification);

    // Calculate duration
    const duration = Math.round((new Date().getTime() - session.startedAt.getTime()) / 1000);
    console.log(`[VoiceBot] Call duration: ${duration} seconds`);

    // Find the call record using the database callId
    let call = null;
    if (session.dbCallId) {
      call = await prisma.outboundCall.findUnique({
        where: { id: session.dbCallId },
        include: { agent: true },
      });
    }

    if (call) {
      // Analyze the call comprehensively
      const analysis = await analyzeCall(session);
      console.log(`[VoiceBot] Call outcome: ${analysis.outcome}, Lead score: ${analysis.leadScore}`);

      // Detect callback request and schedule if needed
      const callbackInfo = await detectCallbackRequest(session);
      if (callbackInfo.isCallbackRequested && callbackInfo.scheduledAt) {
        console.log(`[VoiceBot] Callback requested for: ${callbackInfo.scheduledTimeDescription}`);
        await createScheduledCallback(
          session,
          callbackInfo.scheduledAt,
          callbackInfo.scheduledTimeDescription,
          call.phoneNumber
        );
        // Update outcome if callback was requested
        analysis.outcome = 'CALLBACK_REQUESTED';
        analysis.nextAction = `Scheduled callback: ${callbackInfo.scheduledTimeDescription}`;
      }

      // Update call record with full analysis
      await prisma.outboundCall.update({
        where: { id: session.dbCallId! },
        data: {
          transcript: JSON.stringify(session.transcript),
          qualification: JSON.stringify({
            ...session.qualification,
            keyPoints: analysis.keyPoints,
            leadScore: analysis.leadScore,
            nextAction: analysis.nextAction,
            moodAnalysis: {
              finalMood: session.userMood,
              moodJourney: analysis.moodJourney,
              dominantMood: analysis.dominantMood,
              moodHistory: session.moodHistory,
            },
          }),
          summary: analysis.summary,
          sentiment: analysis.sentiment,
          outcome: analysis.outcome,
          status: 'COMPLETED',
          endedAt: new Date(),
          duration,
        },
      });
      console.log(`[VoiceBot] Updated call record - Duration: ${duration}s, Outcome: ${analysis.outcome}, Mood: ${session.userMood}`);

      // Record voice minutes usage
      if (duration > 0 && call.agent?.organizationId) {
        const durationMinutes = duration / 60;
        try {
          await voiceMinutesService.recordUsage(
            call.agent.organizationId,
            null, // userId not tracked per call
            durationMinutes
          );
          console.log(`[VoiceMinutes] Recorded ${durationMinutes.toFixed(2)} minutes for org ${call.agent.organizationId}`);
        } catch (error) {
          console.error('[VoiceMinutes] Failed to record usage:', error);
        }
      }

      // Create or update lead based on call analysis
      if (call.agent && (Object.keys(session.qualification).length > 0 || analysis.outcome === 'INTERESTED' || analysis.leadScore >= 30)) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            phone: call.phoneNumber,
            organizationId: call.agent.organizationId,
          },
        });

        // Determine lead status based on outcome
        let leadStatus = 'NEW';
        if (analysis.outcome === 'INTERESTED') leadStatus = 'QUALIFIED';
        else if (analysis.outcome === 'CALLBACK_REQUESTED') leadStatus = 'CONTACTED';
        else if (analysis.outcome === 'NOT_INTERESTED') leadStatus = 'UNQUALIFIED';
        else if (analysis.outcome === 'CONVERTED') leadStatus = 'CONVERTED';

        const leadData = {
          firstName: session.qualification.name?.split(' ')[0] || session.qualification.firstName || 'Prospect',
          lastName: session.qualification.name?.split(' ').slice(1).join(' ') || session.qualification.lastName || '',
          email: session.qualification.email || null,
          customFields: {
            ...session.qualification,
            company: session.qualification.company || null,
            callAnalysis: {
              summary: analysis.summary,
              sentiment: analysis.sentiment,
              outcome: analysis.outcome,
              leadScore: analysis.leadScore,
              keyPoints: analysis.keyPoints,
              nextAction: analysis.nextAction,
              callDuration: duration,
              callDate: new Date().toISOString(),
            },
          },
        };

        if (existingLead) {
          // Update existing lead with new call data
          const existingFields = (existingLead.customFields as Record<string, any>) || {};
          const callHistory = existingFields.callHistory || [];
          callHistory.push({
            callId: session.dbCallId,
            date: new Date().toISOString(),
            duration,
            outcome: analysis.outcome,
            summary: analysis.summary,
          });

          await prisma.lead.update({
            where: { id: existingLead.id },
            data: {
              ...leadData,
              status: leadStatus,
              customFields: {
                ...existingFields,
                ...leadData.customFields,
                callHistory,
                totalCalls: callHistory.length,
                lastCallDate: new Date().toISOString(),
              },
            },
          });
          console.log(`[VoiceBot] Updated lead: ${existingLead.id} (${leadStatus})`);
        } else {
          // Create new lead
          const newLead = await prisma.lead.create({
            data: {
              organizationId: call.agent.organizationId,
              ...leadData,
              phone: call.phoneNumber,
              source: 'API', // Using API as source for voice calls (AI_VOICE_CALL not in enum)
              sourceDetails: `Voice Bot - ${call.agent.name}`,
              status: leadStatus,
              customFields: {
                ...leadData.customFields,
                callHistory: [{
                  callId: session.dbCallId,
                  date: new Date().toISOString(),
                  duration,
                  outcome: analysis.outcome,
                  summary: analysis.summary,
                }],
                totalCalls: 1,
                lastCallDate: new Date().toISOString(),
              },
            },
          });

          // Link to call
          await prisma.outboundCall.update({
            where: { id: session.dbCallId! },
            data: { leadId: newLead.id },
          });

          console.log(`[VoiceBot] Created lead: ${newLead.id} (Score: ${analysis.leadScore}, Status: ${leadStatus})`);
        }
      }

      console.log(`[VoiceBot] Session finalized successfully`);
    }
  } catch (error) {
    console.error('[VoiceBot] Error finalizing session:', error);
  }
}

/**
 * Get session by call ID
 */
export function getSession(callId: string): VoiceBotSession | undefined {
  return sessions.get(callId);
}

/**
 * Get active sessions count
 */
export function getActiveSessionsCount(): number {
  return sessions.size;
}

export default {
  handleExotelWebSocket,
  getSession,
  getActiveSessionsCount,
};
