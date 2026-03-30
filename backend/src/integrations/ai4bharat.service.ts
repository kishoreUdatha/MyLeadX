/**
 * AI4Bharat Integration Service
 *
 * Provides Indian language STT (IndicWhisper) and TTS (IndicTTS)
 * Supports: Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Odia
 *
 * Can run:
 * 1. Self-hosted via Python server
 * 2. Via Hugging Face Inference API
 * 3. Via local Gradio endpoints
 */

import axios from 'axios';
import FormData from 'form-data';

// Configuration
const AI4BHARAT_BASE_URL = process.env.AI4BHARAT_BASE_URL || 'http://localhost:5050';
const AI4BHARAT_API_KEY = process.env.AI4BHARAT_API_KEY || '';
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';

// Supported Indian languages
export const AI4BHARAT_LANGUAGES = {
  'te-IN': { code: 'te', name: 'Telugu', indicCode: 'tel' },
  'hi-IN': { code: 'hi', name: 'Hindi', indicCode: 'hin' },
  'ta-IN': { code: 'ta', name: 'Tamil', indicCode: 'tam' },
  'kn-IN': { code: 'kn', name: 'Kannada', indicCode: 'kan' },
  'ml-IN': { code: 'ml', name: 'Malayalam', indicCode: 'mal' },
  'bn-IN': { code: 'bn', name: 'Bengali', indicCode: 'ben' },
  'mr-IN': { code: 'mr', name: 'Marathi', indicCode: 'mar' },
  'gu-IN': { code: 'gu', name: 'Gujarati', indicCode: 'guj' },
  'pa-IN': { code: 'pa', name: 'Punjabi', indicCode: 'pan' },
  'or-IN': { code: 'or', name: 'Odia', indicCode: 'ori' },
  'as-IN': { code: 'as', name: 'Assamese', indicCode: 'asm' },
} as const;

export type AI4BharatLanguageCode = keyof typeof AI4BHARAT_LANGUAGES;

// TTS Voice options
export interface AI4BharatVoice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  language: AI4BharatLanguageCode;
}

// Available voices per language
export const AI4BHARAT_VOICES: AI4BharatVoice[] = [
  // Telugu
  { id: 'ai4bharat-te-female', name: 'Telugu Female', gender: 'female', language: 'te-IN' },
  { id: 'ai4bharat-te-male', name: 'Telugu Male', gender: 'male', language: 'te-IN' },
  // Hindi
  { id: 'ai4bharat-hi-female', name: 'Hindi Female', gender: 'female', language: 'hi-IN' },
  { id: 'ai4bharat-hi-male', name: 'Hindi Male', gender: 'male', language: 'hi-IN' },
  // Tamil
  { id: 'ai4bharat-ta-female', name: 'Tamil Female', gender: 'female', language: 'ta-IN' },
  { id: 'ai4bharat-ta-male', name: 'Tamil Male', gender: 'male', language: 'ta-IN' },
  // Kannada
  { id: 'ai4bharat-kn-female', name: 'Kannada Female', gender: 'female', language: 'kn-IN' },
  { id: 'ai4bharat-kn-male', name: 'Kannada Male', gender: 'male', language: 'kn-IN' },
  // Malayalam
  { id: 'ai4bharat-ml-female', name: 'Malayalam Female', gender: 'female', language: 'ml-IN' },
  { id: 'ai4bharat-ml-male', name: 'Malayalam Male', gender: 'male', language: 'ml-IN' },
  // Bengali
  { id: 'ai4bharat-bn-female', name: 'Bengali Female', gender: 'female', language: 'bn-IN' },
  { id: 'ai4bharat-bn-male', name: 'Bengali Male', gender: 'male', language: 'bn-IN' },
  // Marathi
  { id: 'ai4bharat-mr-female', name: 'Marathi Female', gender: 'female', language: 'mr-IN' },
  { id: 'ai4bharat-mr-male', name: 'Marathi Male', gender: 'male', language: 'mr-IN' },
  // Gujarati
  { id: 'ai4bharat-gu-female', name: 'Gujarati Female', gender: 'female', language: 'gu-IN' },
  { id: 'ai4bharat-gu-male', name: 'Gujarati Male', gender: 'male', language: 'gu-IN' },
];

interface TranscriptionResult {
  text: string;
  language: string;
  confidence?: number;
  segments?: Array<{
    start: number;
    end: number;
    text: string;
  }>;
}

interface TTSResult {
  audio: Buffer;
  sampleRate: number;
  format: 'wav' | 'pcm';
}

class AI4BharatService {
  private baseUrl: string;
  private apiKey: string;
  private huggingfaceKey: string;
  private isConfigured: boolean;
  private useHuggingFace: boolean;

  constructor() {
    this.baseUrl = AI4BHARAT_BASE_URL;
    this.apiKey = AI4BHARAT_API_KEY;
    this.huggingfaceKey = HUGGINGFACE_API_KEY;

    // Prefer HuggingFace if API key is set, otherwise use self-hosted
    // HuggingFace mode: Use if HUGGINGFACE_API_KEY is set (regardless of AI4BHARAT_BASE_URL)
    // Self-hosted mode: Use if AI4BHARAT_BASE_URL is set to a non-localhost URL, or if explicitly configured
    this.useHuggingFace = !!HUGGINGFACE_API_KEY;
    this.isConfigured = !!HUGGINGFACE_API_KEY || (!!AI4BHARAT_BASE_URL && !AI4BHARAT_BASE_URL.includes('localhost:5050'));

    if (this.useHuggingFace) {
      console.log('[AI4Bharat] Service initialized (mode: HuggingFace API)');
    } else if (this.isConfigured) {
      console.log(`[AI4Bharat] Service initialized (mode: Self-hosted at ${this.baseUrl})`);
    } else {
      console.warn('[AI4Bharat] Not configured. Set HUGGINGFACE_API_KEY or AI4BHARAT_BASE_URL');
    }
  }

  /**
   * Check if service is available
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): boolean {
    return language in AI4BHARAT_LANGUAGES;
  }

  /**
   * Get language info
   */
  getLanguageInfo(language: string) {
    return AI4BHARAT_LANGUAGES[language as AI4BharatLanguageCode];
  }

  /**
   * Get available voices for a language
   */
  getVoicesForLanguage(language: string): AI4BharatVoice[] {
    return AI4BHARAT_VOICES.filter(v => v.language === language);
  }

  /**
   * Speech-to-Text using IndicWhisper
   *
   * @param audioBuffer - Audio data (WAV or PCM)
   * @param language - Language code (e.g., 'te-IN', 'hi-IN')
   * @param sampleRate - Audio sample rate (default: 16000)
   */
  async transcribe(
    audioBuffer: Buffer,
    language: AI4BharatLanguageCode,
    sampleRate: number = 16000
  ): Promise<TranscriptionResult> {
    if (!this.isConfigured) {
      throw new Error('AI4Bharat service not configured');
    }

    const langInfo = AI4BHARAT_LANGUAGES[language];
    if (!langInfo) {
      throw new Error(`Language ${language} not supported by AI4Bharat`);
    }

    console.log(`[AI4Bharat] Transcribing ${audioBuffer.length} bytes in ${langInfo.name}`);

    if (this.useHuggingFace) {
      return this.transcribeViaHuggingFace(audioBuffer, langInfo.code);
    }

    return this.transcribeViaSelfHosted(audioBuffer, langInfo.code, sampleRate);
  }

  /**
   * Transcribe via self-hosted IndicWhisper server
   */
  private async transcribeViaSelfHosted(
    audioBuffer: Buffer,
    languageCode: string,
    sampleRate: number
  ): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('audio', audioBuffer, {
      filename: 'audio.wav',
      contentType: 'audio/wav',
    });
    formData.append('language', languageCode);
    formData.append('sample_rate', sampleRate.toString());

    try {
      const response = await axios.post(
        `${this.baseUrl}/transcribe`,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          timeout: 30000,
        }
      );

      return {
        text: response.data.text || response.data.transcript,
        language: languageCode,
        confidence: response.data.confidence,
        segments: response.data.segments,
      };
    } catch (error: any) {
      console.error('[AI4Bharat] Transcription error:', error.message);
      throw new Error(`AI4Bharat transcription failed: ${error.message}`);
    }
  }

  /**
   * Transcribe via HuggingFace Inference API
   */
  private async transcribeViaHuggingFace(
    audioBuffer: Buffer,
    languageCode: string
  ): Promise<TranscriptionResult> {
    // Use AI4Bharat's IndicWhisper model on HuggingFace
    const modelId = 'ai4bharat/indicwhisper-large';

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelId}`,
        audioBuffer,
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceKey}`,
            'Content-Type': 'audio/wav',
          },
          timeout: 60000,
        }
      );

      return {
        text: response.data.text,
        language: languageCode,
      };
    } catch (error: any) {
      console.error('[AI4Bharat] HuggingFace transcription error:', error.message);
      throw new Error(`AI4Bharat HuggingFace transcription failed: ${error.message}`);
    }
  }

  /**
   * Text-to-Speech using IndicTTS
   *
   * @param text - Text to synthesize
   * @param language - Language code (e.g., 'te-IN')
   * @param gender - Voice gender ('male' or 'female')
   * @param sampleRate - Output sample rate (default: 22050, use 8000 for telephony)
   */
  async synthesize(
    text: string,
    language: AI4BharatLanguageCode,
    gender: 'male' | 'female' = 'female',
    sampleRate: number = 22050
  ): Promise<TTSResult> {
    if (!this.isConfigured) {
      throw new Error('AI4Bharat service not configured');
    }

    const langInfo = AI4BHARAT_LANGUAGES[language];
    if (!langInfo) {
      throw new Error(`Language ${language} not supported by AI4Bharat`);
    }

    console.log(`[AI4Bharat] Synthesizing "${text.substring(0, 50)}..." in ${langInfo.name} (${gender})`);

    if (this.useHuggingFace) {
      return this.synthesizeViaHuggingFace(text, langInfo.indicCode, gender, sampleRate);
    }

    return this.synthesizeViaSelfHosted(text, langInfo.indicCode, gender, sampleRate);
  }

  /**
   * Synthesize via self-hosted IndicTTS server
   */
  private async synthesizeViaSelfHosted(
    text: string,
    languageCode: string,
    gender: 'male' | 'female',
    sampleRate: number
  ): Promise<TTSResult> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/synthesize`,
        {
          text,
          language: languageCode,
          gender,
          sample_rate: sampleRate,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      const audioBuffer = Buffer.from(response.data);

      // Check if response is WAV (has RIFF header)
      const isWav = audioBuffer.slice(0, 4).toString() === 'RIFF';

      return {
        audio: audioBuffer,
        sampleRate: sampleRate,
        format: isWav ? 'wav' : 'pcm',
      };
    } catch (error: any) {
      console.error('[AI4Bharat] TTS error:', error.message);
      throw new Error(`AI4Bharat TTS failed: ${error.message}`);
    }
  }

  /**
   * Synthesize via HuggingFace Inference API
   */
  private async synthesizeViaHuggingFace(
    text: string,
    languageCode: string,
    gender: 'male' | 'female',
    sampleRate: number
  ): Promise<TTSResult> {
    // Use AI4Bharat's IndicTTS model on HuggingFace
    const modelId = `ai4bharat/indic-tts-${languageCode}-${gender}`;

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelId}`,
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 60000,
        }
      );

      let audioBuffer = Buffer.from(response.data);

      // HuggingFace returns audio at model's native rate, resample if needed
      if (sampleRate === 8000) {
        audioBuffer = this.resampleTo8kHz(audioBuffer, 22050);
      }

      return {
        audio: audioBuffer,
        sampleRate,
        format: 'wav',
      };
    } catch (error: any) {
      console.error('[AI4Bharat] HuggingFace TTS error:', error.message);
      throw new Error(`AI4Bharat HuggingFace TTS failed: ${error.message}`);
    }
  }

  /**
   * Resample audio from source rate to 8kHz for telephony
   */
  private resampleTo8kHz(audioBuffer: Buffer, srcRate: number): Buffer {
    // Skip WAV header if present
    let pcmData = audioBuffer;
    if (audioBuffer.slice(0, 4).toString() === 'RIFF') {
      pcmData = audioBuffer.slice(44);
    }

    const ratio = srcRate / 8000;
    const srcSamples = Math.floor(pcmData.length / 2);
    const dstSamples = Math.floor(srcSamples / ratio);
    const output = Buffer.alloc(dstSamples * 2);

    for (let i = 0; i < dstSamples; i++) {
      const srcPos = i * ratio;
      const idx = Math.floor(srcPos);
      const frac = srcPos - idx;

      const s1 = idx * 2 < pcmData.length - 1 ? pcmData.readInt16LE(idx * 2) : 0;
      const s2 = (idx + 1) * 2 < pcmData.length - 1 ? pcmData.readInt16LE((idx + 1) * 2) : s1;

      const sample = Math.round(s1 + frac * (s2 - s1));
      output.writeInt16LE(Math.max(-32768, Math.min(32767, sample)), i * 2);
    }

    return output;
  }

  /**
   * Translate text between Indian languages using IndicTrans
   *
   * @param text - Text to translate
   * @param sourceLanguage - Source language code
   * @param targetLanguage - Target language code
   */
  async translate(
    text: string,
    sourceLanguage: AI4BharatLanguageCode,
    targetLanguage: AI4BharatLanguageCode
  ): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('AI4Bharat service not configured');
    }

    const srcLang = AI4BHARAT_LANGUAGES[sourceLanguage];
    const tgtLang = AI4BHARAT_LANGUAGES[targetLanguage];

    if (!srcLang || !tgtLang) {
      throw new Error('Source or target language not supported');
    }

    console.log(`[AI4Bharat] Translating "${text.substring(0, 50)}..." from ${srcLang.name} to ${tgtLang.name}`);

    if (this.useHuggingFace) {
      return this.translateViaHuggingFace(text, srcLang.indicCode, tgtLang.indicCode);
    }

    return this.translateViaSelfHosted(text, srcLang.indicCode, tgtLang.indicCode);
  }

  /**
   * Translate via self-hosted server
   */
  private async translateViaSelfHosted(
    text: string,
    sourceCode: string,
    targetCode: string
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/translate`,
        {
          text,
          source_language: sourceCode,
          target_language: targetCode,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
          },
          timeout: 30000,
        }
      );

      return response.data.translation || response.data.text;
    } catch (error: any) {
      console.error('[AI4Bharat] Translation error:', error.message);
      throw new Error(`AI4Bharat translation failed: ${error.message}`);
    }
  }

  /**
   * Translate via HuggingFace
   */
  private async translateViaHuggingFace(
    text: string,
    sourceCode: string,
    targetCode: string
  ): Promise<string> {
    const modelId = 'ai4bharat/indictrans2-indic-indic-1B';

    try {
      const response = await axios.post(
        `https://api-inference.huggingface.co/models/${modelId}`,
        {
          inputs: text,
          parameters: {
            src_lang: sourceCode,
            tgt_lang: targetCode,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.huggingfaceKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      return response.data[0]?.translation_text || response.data.translation;
    } catch (error: any) {
      console.error('[AI4Bharat] HuggingFace translation error:', error.message);
      throw new Error(`AI4Bharat HuggingFace translation failed: ${error.message}`);
    }
  }

  /**
   * Health check for self-hosted server
   */
  async healthCheck(): Promise<{ status: string; models: string[] }> {
    if (this.useHuggingFace) {
      return { status: 'ok', models: ['indicwhisper', 'indictts', 'indictrans'] };
    }

    try {
      const response = await axios.get(`${this.baseUrl}/health`, { timeout: 5000 });
      return response.data;
    } catch (error: any) {
      return { status: 'error', models: [] };
    }
  }
}

// Export singleton instance
export const ai4bharatService = new AI4BharatService();
export default ai4bharatService;
