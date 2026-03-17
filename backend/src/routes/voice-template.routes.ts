import { Router } from 'express';
import OpenAI, { toFile } from 'openai';
import { voiceTemplateService } from '../services/voice-template.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';
import { sarvamService } from '../integrations/sarvam.service';
import { Readable } from 'stream';

// Initialize OpenAI client for template testing
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @api {get} /voice-templates List Templates
 * @description Get all voice templates for the organization
 */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      industry,
      category,
      isActive,
      search,
      page = '1',
      limit = '20',
    } = req.query;

    const result = await voiceTemplateService.getTemplates(organizationId, {
      industry: industry as any,
      category: category as string,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    res.json({
      success: true,
      ...result,
    });
  })
);

/**
 * @api {get} /voice-templates/industry-defaults Get Industry Default Templates
 * @description Get the default system templates for all industries
 */
router.get(
  '/industry-defaults',
  asyncHandler(async (req, res) => {
    const templates = voiceTemplateService.getIndustryTemplates();

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * @api {post} /voice-templates/initialize Initialize Default Templates
 * @description Create default templates for organization from industry defaults
 */
router.post(
  '/initialize',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { industries } = req.body;

    const templates = await voiceTemplateService.initializeDefaultTemplates(
      organizationId,
      industries
    );

    res.status(201).json({
      success: true,
      message: `Created ${templates.length} templates`,
      data: templates,
    });
  })
);

/**
 * @api {get} /voice-templates/:id Get Template
 * @description Get a single template by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * @api {get} /voice-templates/:id/preview Preview Template
 * @description Preview template with sample data
 */
router.get(
  '/:id/preview',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    const preview = await voiceTemplateService.previewTemplate(id, organizationId);

    res.json({
      success: true,
      data: preview,
    });
  })
);

// Valid Sarvam voices
const SARVAM_VOICES = {
  male: ['aditya', 'rahul', 'rohan', 'amit', 'dev', 'ratan', 'varun', 'manan', 'sumit', 'kabir', 'aayan', 'shubh', 'ashutosh', 'advait'],
  female: ['ritu', 'priya', 'neha', 'pooja', 'simran', 'kavya', 'ishita', 'shreya', 'roopa', 'amelia', 'sophia'],
};

const SARVAM_LANGUAGES = ['hi-IN', 'te-IN', 'ta-IN', 'kn-IN', 'ml-IN', 'mr-IN', 'bn-IN', 'gu-IN', 'pa-IN', 'od-IN', 'en-IN', 'as-IN'];

/**
 * @api {post} /voice-templates/:id/preview-voice Preview Voice
 * @description Generate TTS audio preview for template greeting
 */
router.post(
  '/:id/preview-voice',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { text, voice, language } = req.body;

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    // Use provided text or default to template greeting
    const greetings = template.greetings as Record<string, string> | null;
    const textToSpeak = text || template.greeting || greetings?.default ||
      `Hello! Welcome to ${template.name}. How can I help you today?`;

    // Use template voice settings or provided overrides
    const requestedVoice = voice || template.voiceId || 'priya';
    const requestedLang = language || template.language || 'en-IN';

    // Generate TTS audio
    let audioBase64: string;
    let format: string;
    let usedVoice: string;
    let usedLang: string;

    // Check if voice is valid for Sarvam
    const allSarvamVoices = [...SARVAM_VOICES.male, ...SARVAM_VOICES.female];
    const isValidSarvamVoice = allSarvamVoices.includes(requestedVoice.toLowerCase());
    const isValidSarvamLang = SARVAM_LANGUAGES.includes(requestedLang);

    // Try Sarvam first if available and voice is valid
    if (sarvamService.isAvailable() && isValidSarvamVoice && isValidSarvamLang) {
      try {
        const audioBuffer = await sarvamService.textToSpeech(
          textToSpeak,
          requestedVoice.toLowerCase(),
          requestedLang,
          22050 // Higher quality for preview
        );
        audioBase64 = audioBuffer.toString('base64');
        format = 'wav';
        usedVoice = requestedVoice;
        usedLang = requestedLang;
      } catch (sarvamError: any) {
        console.warn('[Preview Voice] Sarvam TTS failed, trying OpenAI:', sarvamError.message);
        // Fall through to OpenAI
        if (!openai) {
          throw new AppError(`Sarvam TTS failed: ${sarvamError.message}`, 500);
        }
      }
    }

    // Use OpenAI as fallback or primary
    if (!audioBase64! && openai) {
      // Map to OpenAI voice
      const openaiVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
      const openaiVoice = openaiVoices.includes(requestedVoice as any)
        ? requestedVoice as typeof openaiVoices[number]
        : 'alloy';

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: openaiVoice,
        input: textToSpeak,
      });
      const buffer = Buffer.from(await mp3.arrayBuffer());
      audioBase64 = buffer.toString('base64');
      format = 'mp3';
      usedVoice = openaiVoice;
      usedLang = 'en';
    }

    if (!audioBase64!) {
      throw new AppError('No TTS service available. Configure SARVAM_API_KEY or OPENAI_API_KEY.', 503);
    }

    res.json({
      success: true,
      data: {
        audio: audioBase64,
        text: textToSpeak,
        voice: usedVoice!,
        language: usedLang!,
        format: format!,
      },
    });
  })
);

/**
 * @api {post} /voice-templates/:id/test-conversation Test Conversation
 * @description Send a test message and get AI response with voice
 */
router.post(
  '/:id/test-conversation',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { message, conversationHistory = [], includeAudio = false } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    if (!openai) {
      throw new AppError('OpenAI not configured. Set OPENAI_API_KEY to test conversations.', 503);
    }

    const template = await voiceTemplateService.getTemplateById(id, organizationId);

    // Build system prompt from template - keep it concise for speed
    const faqs = template.faqs as any[] || [];
    const questions = template.questions as any[] || [];

    const systemPrompt = `${template.systemPrompt || 'You are a helpful AI assistant.'}

Knowledge Base:
${template.knowledgeBase || 'No specific knowledge base provided.'}

FAQs:
${faqs.slice(0, 10).map((faq: any) => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n') || 'No FAQs provided.'}

Questions to collect: ${questions.slice(0, 5).map((q: any) => q.question).join(', ') || 'None'}

IMPORTANT: Keep responses SHORT (1-2 sentences max). This is a phone call - be concise.
Be ${template.personality || 'friendly and professional'}.`;

    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-6).map((msg: any) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: message },
    ];

    // Get AI response with faster model
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Fastest model
      messages,
      temperature: 0.7,
      max_tokens: 150, // Shorter responses = faster
    });

    const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't process that.";

    // Generate audio if requested
    let audioBase64: string | undefined;
    let audioFormat: string | undefined;

    if (includeAudio) {
      const requestedVoice = template.voiceId || 'priya';
      const requestedLang = template.language || 'en-IN';

      const allSarvamVoices = [...SARVAM_VOICES.male, ...SARVAM_VOICES.female];
      const isValidSarvamVoice = allSarvamVoices.includes(requestedVoice.toLowerCase());
      const isValidSarvamLang = SARVAM_LANGUAGES.includes(requestedLang);

      try {
        if (sarvamService.isAvailable() && isValidSarvamVoice && isValidSarvamLang) {
          const audioBuffer = await sarvamService.textToSpeech(
            reply,
            requestedVoice.toLowerCase(),
            requestedLang,
            8000 // Lower sample rate = faster
          );
          audioBase64 = audioBuffer.toString('base64');
          audioFormat = 'wav';
        } else if (openai) {
          const mp3 = await openai.audio.speech.create({
            model: 'tts-1', // Faster than tts-1-hd
            voice: 'alloy',
            input: reply,
            speed: 1.1, // Slightly faster speech
          });
          const buffer = Buffer.from(await mp3.arrayBuffer());
          audioBase64 = buffer.toString('base64');
          audioFormat = 'mp3';
        }
      } catch (ttsError: any) {
        console.warn('[Test Conversation] TTS failed:', ttsError.message);
        // Continue without audio
      }
    }

    res.json({
      success: true,
      data: {
        reply,
        audio: audioBase64,
        audioFormat,
        templateName: template.name,
      },
    });
  })
);

/**
 * @api {post} /voice-templates Create Template
 * @description Create a new voice template
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const {
      name,
      industry,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
    } = req.body;

    if (!name) {
      throw new AppError('Template name is required', 400);
    }

    if (!industry) {
      throw new AppError('Industry is required', 400);
    }

    const template = await voiceTemplateService.createTemplate({
      organizationId,
      name,
      industry,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      createdById: userId,
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  })
);

/**
 * @api {put} /voice-templates/:id Update Template
 * @description Update an existing voice template
 */
router.put(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const {
      name,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      isActive,
      isDefault,
    } = req.body;

    const template = await voiceTemplateService.updateTemplate(id, organizationId, {
      name,
      description,
      category,
      systemPrompt,
      knowledgeBase,
      questions,
      faqs,
      documents,
      greeting,
      greetings,
      fallbackMessage,
      transferMessage,
      endMessage,
      afterHoursMessage,
      language,
      voiceId,
      temperature,
      personality,
      responseSpeed,
      maxDuration,
      workingHoursEnabled,
      workingHoursStart,
      workingHoursEnd,
      workingDays,
      autoCreateLeads,
      deduplicateByPhone,
      appointmentEnabled,
      appointmentType,
      appointmentDuration,
      isActive,
      isDefault,
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  })
);

/**
 * @api {delete} /voice-templates/:id Delete Template
 * @description Delete a voice template
 */
router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;

    await voiceTemplateService.deleteTemplate(id, organizationId);

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  })
);

/**
 * @api {post} /voice-templates/:id/clone Clone Template
 * @description Clone an existing template
 */
router.post(
  '/:id/clone',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { id } = req.params;
    const { name } = req.body;

    const template = await voiceTemplateService.cloneTemplate(id, organizationId, name);

    res.status(201).json({
      success: true,
      message: 'Template cloned successfully',
      data: template,
    });
  })
);

/**
 * @api {post} /voice-templates/:id/deploy Deploy Template as Agent
 * @description Create a new voice agent from this template
 */
router.post(
  '/:id/deploy',
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { id } = req.params;
    const { name, description, systemPrompt, customizations } = req.body;

    if (!name) {
      throw new AppError('Agent name is required', 400);
    }

    const agent = await voiceTemplateService.deployAsAgent(id, organizationId, {
      name,
      description,
      systemPrompt,
      createdById: userId,
      customizations,
    });

    res.status(201).json({
      success: true,
      message: 'Agent created from template',
      data: agent,
    });
  })
);

// Whisper supported languages (subset of most common)
const WHISPER_SUPPORTED_LANGUAGES = [
  'en', 'zh', 'de', 'es', 'ru', 'ko', 'fr', 'ja', 'pt', 'tr', 'pl', 'ca',
  'nl', 'ar', 'sv', 'it', 'id', 'hi', 'fi', 'vi', 'he', 'uk', 'el', 'ms',
  'cs', 'ro', 'da', 'hu', 'ta', 'no', 'th', 'ur', 'hr', 'bg', 'lt', 'la',
  'mi', 'ml', 'cy', 'sk', 'mr', 'fa', 'lv', 'bn', 'sr', 'az', 'sl', 'kn',
  'et', 'mk', 'br', 'eu', 'is', 'hy', 'ne', 'mn', 'bs', 'kk', 'sq', 'sw',
  'gl', 'gu', 'pa', 'si', 'km', 'sn', 'yo', 'so', 'af', 'oc', 'ka', 'be',
  'tg', 'sd', 'gu', 'am', 'yi', 'lo', 'uz', 'fo', 'ht', 'ps', 'tk', 'nn',
  'mt', 'sa', 'lb', 'my', 'bo', 'tl', 'mg', 'as', 'tt', 'haw', 'ln', 'ha',
  'ba', 'jw', 'su'
];

/**
 * @api {post} /voice-templates/transcribe Transcribe Audio
 * @description Convert speech to text using Sarvam/OpenAI Whisper
 */
router.post(
  '/transcribe',
  asyncHandler(async (req, res) => {
    const { audio, language } = req.body;

    if (!audio) {
      throw new AppError('Audio data is required', 400);
    }

    // Decode base64 audio
    const audioBuffer = Buffer.from(audio, 'base64');
    const langToUse = language || 'en-IN';
    const langCode = langToUse.split('-')[0]; // 'en' from 'en-IN'

    console.log(`[Transcribe] Received audio: ${audioBuffer.length} bytes, language: ${langToUse}`);

    // Check if audio is too large (rough estimate: >30 seconds at typical bitrate)
    // WebM at ~50kbps = ~187KB for 30 seconds
    const estimatedDuration = audioBuffer.length / (50 * 1024 / 8); // rough seconds estimate
    console.log(`[Transcribe] Estimated duration: ${estimatedDuration.toFixed(1)} seconds`);

    let transcript = '';

    // Try OpenAI Whisper first (more reliable for WebM format from browser)
    if (!transcript && openai) {
      try {
        // Convert buffer to a file-like object using OpenAI's toFile helper
        // WebM is the default format from browser MediaRecorder
        const audioFile = await toFile(
          Readable.from(audioBuffer),
          'audio.webm',
          { type: 'audio/webm' }
        );

        // Use auto-detection if language not supported, otherwise use the language code
        const whisperLang = WHISPER_SUPPORTED_LANGUAGES.includes(langCode) ? langCode : undefined;
        console.log(`[Transcribe] Whisper using language: ${whisperLang || 'auto-detect'}`);

        const transcription = await openai.audio.transcriptions.create({
          file: audioFile,
          model: 'whisper-1',
          ...(whisperLang && { language: whisperLang }),
        });

        transcript = transcription.text;
        console.log(`[Transcribe] Whisper result: "${transcript}"`);
      } catch (whisperError: any) {
        console.warn('[Transcribe] Whisper STT failed:', whisperError.message);
      }
    }

    // Fallback to Sarvam for Indian languages (only for shorter audio)
    if (!transcript && sarvamService.isAvailable() && SARVAM_LANGUAGES.includes(langToUse)) {
      // Only try Sarvam if audio is likely under 30 seconds
      if (estimatedDuration <= 25) {
        try {
          // Note: Sarvam expects PCM audio, WebM may not work directly
          const result = await sarvamService.speechToText(audioBuffer, 16000, langToUse);
          transcript = result.text;
          console.log(`[Transcribe] Sarvam result: "${transcript}"`);
        } catch (sarvamError: any) {
          console.warn('[Transcribe] Sarvam STT failed:', sarvamError.message);
        }
      } else {
        console.log('[Transcribe] Skipping Sarvam - audio too long');
      }
    }

    if (!transcript) {
      throw new AppError('Failed to transcribe audio. Please try again or speak more briefly.', 500);
    }

    // Post-process to improve accuracy for common patterns
    transcript = postProcessTranscript(transcript);

    res.json({
      success: true,
      data: {
        text: transcript,
      },
    });
  })
);

/**
 * Post-process transcript to fix common STT errors
 */
function postProcessTranscript(text: string): string {
  let result = text;

  // Fix email patterns
  result = result.replace(/\s*at\s*the\s*rate\s*/gi, '@');
  result = result.replace(/\s*at\s*rate\s*/gi, '@');
  result = result.replace(/\s*@\s*/g, '@');
  result = result.replace(/\s*dot\s*/gi, '.');
  result = result.replace(/gmail\s*dot\s*com/gi, 'gmail.com');
  result = result.replace(/yahoo\s*dot\s*com/gi, 'yahoo.com');
  result = result.replace(/hotmail\s*dot\s*com/gi, 'hotmail.com');
  result = result.replace(/outlook\s*dot\s*com/gi, 'outlook.com');

  // Fix phone number patterns - remove spaces between digits
  result = result.replace(/(\d)\s+(\d)/g, '$1$2');

  // Common word corrections
  result = result.replace(/\bai\b/gi, 'AI');
  result = result.replace(/\bml\b/gi, 'ML');
  result = result.replace(/\bb\.?\s*tech\b/gi, 'B.Tech');
  result = result.replace(/\bm\.?\s*tech\b/gi, 'M.Tech');
  result = result.replace(/\bmba\b/gi, 'MBA');
  result = result.replace(/\bbba\b/gi, 'BBA');
  result = result.replace(/\bbca\b/gi, 'BCA');
  result = result.replace(/\bmca\b/gi, 'MCA');

  return result;
}

/**
 * @api {post} /voice-templates/chat Chat with AI Agent
 * @description Get AI response for testing agent configuration
 */
router.post(
  '/chat',
  asyncHandler(async (req, res) => {
    const { message, systemPrompt, conversationHistory = [] } = req.body;

    if (!message) {
      throw new AppError('Message is required', 400);
    }

    if (!openai) {
      throw new AppError('OpenAI is not configured', 500);
    }

    // Build messages array
    const messages: any[] = [];

    // Add system prompt
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    } else {
      messages.push({
        role: 'system',
        content: 'You are a helpful voice AI assistant. Keep responses concise and natural for voice conversation.',
      });
    }

    // Add conversation history
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: message,
    });

    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 300,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'I apologize, I could not generate a response.';

      res.json({
        success: true,
        data: {
          response,
        },
      });
    } catch (err: any) {
      console.error('[Chat] OpenAI error:', err);
      throw new AppError('Failed to generate response', 500);
    }
  })
);

export default router;
