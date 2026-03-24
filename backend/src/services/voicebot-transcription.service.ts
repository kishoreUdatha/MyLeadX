/**
 * Voicebot Transcription Service - Single Responsibility Principle
 * Handles speech-to-text using Sarvam, AI4Bharat (Indian languages) and OpenAI Whisper
 */

import OpenAI from 'openai';
import { sarvamService, SARVAM_LANGUAGES } from '../integrations/sarvam.service';
import { ai4bharatService, AI4BHARAT_LANGUAGES } from '../integrations/ai4bharat.service';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// STT provider configuration
const STT_PROVIDER = process.env.STT_PROVIDER || process.env.TTS_PROVIDER || process.env.VOICE_PROVIDER || 'auto';
const USE_SARVAM = STT_PROVIDER === 'sarvam' || (STT_PROVIDER === 'auto' && sarvamService.isAvailable());
const USE_AI4BHARAT = STT_PROVIDER === 'ai4bharat' || (STT_PROVIDER === 'auto' && ai4bharatService.isAvailable());

// Language code normalization map
const LANG_CODE_MAP: Record<string, string> = {
  'hi': 'hi-IN', 'te': 'te-IN', 'ta': 'ta-IN', 'kn': 'kn-IN',
  'ml': 'ml-IN', 'mr': 'mr-IN', 'bn': 'bn-IN', 'gu': 'gu-IN',
  'pa': 'pa-IN', 'en': 'en-IN', 'od': 'od-IN', 'as': 'as-IN',
};

/**
 * Normalize language code to full format (e.g., 'te' -> 'te-IN')
 */
export function normalizeLanguageCode(lang?: string): string {
  if (!lang) return '';
  if (lang.includes('-')) return lang;
  return LANG_CODE_MAP[lang.toLowerCase()] || lang;
}

/**
 * Check if language is an Indian regional language
 */
export function isIndianLanguage(language?: string): boolean {
  if (!language) return false;
  const normalizedLang = normalizeLanguageCode(language);
  // Check both Sarvam and AI4Bharat supported languages
  const sarvamSupported = Object.keys(SARVAM_LANGUAGES).some(
    lang => normalizedLang.startsWith(lang.split('-')[0]) || normalizedLang === lang
  );
  const ai4bharatSupported = Object.keys(AI4BHARAT_LANGUAGES).some(
    lang => normalizedLang.startsWith(lang.split('-')[0]) || normalizedLang === lang
  );
  return sarvamSupported || ai4bharatSupported;
}

/**
 * Transcribe audio using Sarvam, AI4Bharat (for Indian languages) or OpenAI Whisper
 * Supports multiple Indian languages: Hindi, Telugu, Tamil, Kannada, Malayalam, etc.
 *
 * Priority: Sarvam -> AI4Bharat -> OpenAI Whisper
 */
export async function transcribeAudio(wavBuffer: Buffer, language?: string): Promise<string> {
  const normalizedLang = language ? normalizeLanguageCode(language) : undefined;
  const isIndian = normalizedLang && isIndianLanguage(normalizedLang);

  // Use Sarvam for Indian languages when available (primary)
  if ((USE_SARVAM || isIndian) && sarvamService.isAvailable()) {
    try {
      console.log(`[Transcription] Using Sarvam STT for language: ${normalizedLang || 'auto-detect'}`);
      const result = await sarvamService.speechToText(wavBuffer, 8000, normalizedLang);
      console.log(`[Transcription] Sarvam transcribed: "${result.text}" (detected: ${result.detectedLanguage})`);
      return result.text || '';
    } catch (error) {
      console.error('[Transcription] Sarvam STT error, falling back to AI4Bharat:', error);
      // Fall through to AI4Bharat
    }
  }

  // Use AI4Bharat for Indian languages (fallback or when Sarvam not available)
  if ((USE_AI4BHARAT || isIndian) && ai4bharatService.isAvailable()) {
    const langCode = normalizedLang as keyof typeof AI4BHARAT_LANGUAGES;
    if (ai4bharatService.isLanguageSupported(langCode)) {
      try {
        console.log(`[Transcription] Using AI4Bharat STT for language: ${normalizedLang || 'auto-detect'}`);
        const result = await ai4bharatService.transcribe(wavBuffer, langCode, 8000);
        console.log(`[Transcription] AI4Bharat transcribed: "${result.text}"`);
        return result.text || '';
      } catch (error) {
        console.error('[Transcription] AI4Bharat STT error, falling back to OpenAI:', error);
        // Fall through to OpenAI
      }
    }
  }

  // Fallback to OpenAI Whisper
  return transcribeWithWhisper(wavBuffer, language);
}

/**
 * Transcribe audio using OpenAI Whisper
 */
async function transcribeWithWhisper(wavBuffer: Buffer, language?: string): Promise<string> {
  if (!openai) {
    console.error('[Transcription] OpenAI not configured');
    return '';
  }

  try {
    // Convert Buffer to Uint8Array for File constructor compatibility
    const audioFile = new File([new Uint8Array(wavBuffer)], 'audio.wav', { type: 'audio/wav' });

    const transcriptionOptions: any = {
      file: audioFile,
      model: process.env.OPENAI_STT_MODEL || 'whisper-1',
    };

    // Map language codes to Whisper-supported codes
    // Only Hindi, Bengali, Gujarati, Marathi, Tamil, and English are well-supported
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
    }

    const response = await openai.audio.transcriptions.create(transcriptionOptions);
    console.log(`[Transcription] OpenAI transcribed (${language || 'auto'}): "${response.text}"`);

    return response.text || '';
  } catch (error) {
    console.error('[Transcription] Whisper error:', error);
    return '';
  }
}

/**
 * Detect language from audio content
 */
export async function detectLanguageFromAudio(wavBuffer: Buffer): Promise<string | null> {
  // Try Sarvam first
  if (sarvamService.isAvailable()) {
    try {
      const result = await sarvamService.speechToText(wavBuffer, 8000);
      return result.detectedLanguage || null;
    } catch (error) {
      console.error('[Transcription] Sarvam language detection error:', error);
    }
  }

  // Try AI4Bharat as fallback
  if (ai4bharatService.isAvailable()) {
    try {
      // AI4Bharat doesn't have auto-detect, but we can try Telugu as default for now
      const result = await ai4bharatService.transcribe(wavBuffer, 'te-IN', 8000);
      if (result.text && result.text.length > 0) {
        return result.language || 'te-IN';
      }
    } catch (error) {
      console.error('[Transcription] AI4Bharat language detection error:', error);
    }
  }

  return null;
}

/**
 * Transcribe using AI4Bharat directly
 */
export async function transcribeWithAI4Bharat(
  wavBuffer: Buffer,
  language: keyof typeof AI4BHARAT_LANGUAGES
): Promise<string> {
  if (!ai4bharatService.isAvailable()) {
    throw new Error('AI4Bharat service not available');
  }
  const result = await ai4bharatService.transcribe(wavBuffer, language, 8000);
  return result.text || '';
}

export const voicebotTranscriptionService = {
  transcribeAudio,
  transcribeWithAI4Bharat,
  normalizeLanguageCode,
  isIndianLanguage,
  detectLanguageFromAudio,
};

export default voicebotTranscriptionService;
