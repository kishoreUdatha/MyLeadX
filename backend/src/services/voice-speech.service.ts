/**
 * Voice Speech Service - Single Responsibility Principle
 * Handles speech-to-text and text-to-speech operations
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

/**
 * Check if OpenAI is configured
 */
export function isConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Speech to Text using OpenAI Whisper
 */
export async function speechToText(audioBuffer: Buffer, format: string = 'webm'): Promise<string> {
  if (!isConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  // Write buffer to temp file (OpenAI requires a file)
  const tempPath = path.join(os.tmpdir(), `voice_${Date.now()}.${format}`);
  fs.writeFileSync(tempPath, audioBuffer);

  try {
    const transcription = await openai!.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
      language: 'en',
    });

    return transcription.text;
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

/**
 * Text to Speech using OpenAI TTS
 */
export async function textToSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
  if (!isConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  // Get TTS settings from environment variables
  const ttsModel = process.env.TTS_MODEL || 'tts-1-hd';
  const ttsSpeed = parseFloat(process.env.TTS_SPEED || '1.0');

  // Validate model - only allow tts-1 or tts-1-hd
  const validModel = ttsModel === 'tts-1' ? 'tts-1' : 'tts-1-hd';

  // Clamp speed to valid range (0.25 to 4.0)
  const validSpeed = Math.max(0.25, Math.min(4.0, ttsSpeed));

  const response = await openai!.audio.speech.create({
    model: validModel,
    voice: voice as any,
    input: text,
    response_format: 'mp3',
    speed: validSpeed,
  });

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Text to Speech with streaming support
 */
export async function textToSpeechStream(text: string, voice: string = 'alloy'): Promise<NodeJS.ReadableStream> {
  if (!isConfigured()) {
    throw new Error('OpenAI is not configured');
  }

  const ttsModel = process.env.TTS_MODEL || 'tts-1-hd';
  const ttsSpeed = parseFloat(process.env.TTS_SPEED || '1.0');
  const validModel = ttsModel === 'tts-1' ? 'tts-1' : 'tts-1-hd';
  const validSpeed = Math.max(0.25, Math.min(4.0, ttsSpeed));

  const response = await openai!.audio.speech.create({
    model: validModel,
    voice: voice as any,
    input: text,
    response_format: 'mp3',
    speed: validSpeed,
  });

  // Convert Web ReadableStream to Node.js ReadableStream
  const webStream = response.body;
  if (!webStream) {
    throw new Error('No response body');
  }

  const { Readable } = require('stream');
  const nodeStream = Readable.fromWeb(webStream);
  return nodeStream;
}

/**
 * Supported TTS voices
 */
export const TTS_VOICES = [
  { id: 'alloy', name: 'Alloy', description: 'Neutral and balanced' },
  { id: 'echo', name: 'Echo', description: 'Warm and conversational' },
  { id: 'fable', name: 'Fable', description: 'British and expressive' },
  { id: 'onyx', name: 'Onyx', description: 'Deep and authoritative' },
  { id: 'nova', name: 'Nova', description: 'Friendly and upbeat' },
  { id: 'shimmer', name: 'Shimmer', description: 'Clear and professional' },
  { id: 'ash', name: 'Ash', description: 'Calm and measured' },
  { id: 'sage', name: 'Sage', description: 'Wise and thoughtful' },
  { id: 'coral', name: 'Coral', description: 'Warm and engaging' },
];

/**
 * Get available voices
 */
export function getAvailableVoices() {
  return TTS_VOICES;
}

/**
 * Validate voice ID
 */
export function isValidVoice(voiceId: string): boolean {
  return TTS_VOICES.some(v => v.id === voiceId);
}

export const voiceSpeechService = {
  isConfigured,
  speechToText,
  textToSpeech,
  textToSpeechStream,
  getAvailableVoices,
  isValidVoice,
  TTS_VOICES,
};

export default voiceSpeechService;
