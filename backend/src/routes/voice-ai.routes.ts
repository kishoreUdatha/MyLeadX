import { Router, Request, Response } from 'express';
import { voiceAIService } from '../integrations/voice-ai.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import multer from 'multer';
import { config } from '../config';

const router = Router();

// Configure multer for audio upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// ==================== PUBLIC ENDPOINTS (For Widget) ====================

// Get agent info for widget (public)
router.get('/widget/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;

    const agent = await voiceAIService.getAgent(agentId);
    if (!agent || !agent.isActive) {
      return ApiResponse.error(res, 'Agent not found or inactive', 404);
    }

    ApiResponse.success(res, 'Agent retrieved', {
      id: agent.id,
      name: agent.name,
      industry: agent.industry,
      greeting: agent.greeting,
      widgetTitle: agent.widgetTitle || agent.name,
      widgetSubtitle: agent.widgetSubtitle || 'AI Voice Assistant',
      widgetColor: agent.widgetColor,
      widgetPosition: agent.widgetPosition,
      voiceId: agent.voiceId,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start voice session (public - for widget)
router.post('/session/start', async (req: Request, res: Response) => {
  try {
    const { agentId, visitorInfo } = req.body;

    if (!agentId) {
      return ApiResponse.error(res, 'Agent ID is required', 400);
    }

    const session = await voiceAIService.startSession(agentId, {
      ...visitorInfo,
      ip: req.ip,
      device: req.headers['user-agent'],
    });

    ApiResponse.success(res, 'Session started', session);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Process voice message (public - for widget)
router.post('/session/:sessionId/message', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { text } = req.body;

    let userMessage = text;

    // If audio file is provided, transcribe it
    if (req.file) {
      userMessage = await voiceAIService.speechToText(
        req.file.buffer,
        req.file.mimetype.split('/')[1] || 'webm'
      );
    }

    if (!userMessage) {
      return ApiResponse.error(res, 'No message provided', 400);
    }

    const result = await voiceAIService.processMessage(sessionId, userMessage);

    // Convert audio buffer to base64 for response
    let audioBase64: string | undefined;
    if (result.audioBuffer) {
      audioBase64 = result.audioBuffer.toString('base64');
    }

    ApiResponse.success(res, 'Message processed', {
      userMessage,
      response: result.response,
      audio: audioBase64,
      audioFormat: 'mp3',
      qualification: result.qualification,
      shouldEnd: result.shouldEnd,
    });
  } catch (error) {
    console.error('Voice message error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// End voice session (public - for widget)
router.post('/session/:sessionId/end', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { status } = req.body;

    const session = await voiceAIService.endSession(sessionId, status || 'COMPLETED');

    ApiResponse.success(res, 'Session ended', {
      sessionId: session.id,
      duration: session.duration,
      summary: session.summary,
      sentiment: session.sentiment,
      leadCreated: !!session.leadId,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get session transcript (public - for widget)
router.get('/session/:sessionId/transcript', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await voiceAIService.getSession(sessionId);
    if (!session) {
      return ApiResponse.error(res, 'Session not found', 404);
    }

    ApiResponse.success(res, 'Transcript retrieved', {
      transcripts: session.transcripts,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Text to Speech endpoint (public - for widget)
router.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice, provider, language } = req.body;

    console.log('[TTS] Request:', { text: text?.substring(0, 50), voice, provider, language });

    if (!text) {
      return ApiResponse.error(res, 'Text is required', 400);
    }

    let audioBuffer: Buffer;
    let contentType = 'audio/mpeg';

    // Use Sarvam for Indian language TTS when requested
    if (provider === 'sarvam') {
      const { sarvamService } = await import('../integrations/sarvam.service');

      if (!sarvamService.isAvailable()) {
        console.log('[TTS] Sarvam not available, falling back to OpenAI');
      } else {
        try {
          console.log('[TTS] Using Sarvam TTS with voice:', voice, 'language:', language);

          // Generate TTS using Sarvam
          audioBuffer = await sarvamService.textToSpeech(
            text,
            voice || 'priya',
            language || 'hi-IN',
            22050 // Higher sample rate for preview
          );

          console.log('[TTS] Sarvam TTS generated, size:', audioBuffer.length);
          contentType = 'audio/wav';

          res.set({
            'Content-Type': contentType,
            'Content-Length': audioBuffer.length,
          });
          return res.send(audioBuffer);
        } catch (sarvamError) {
          console.warn('[TTS] Sarvam TTS failed, falling back to OpenAI:', (sarvamError as Error).message);
        }
      }
    }

    // Fallback to OpenAI TTS
    console.log('[TTS] Using OpenAI TTS with voice:', voice || 'alloy');

    // Map Sarvam voice names to OpenAI voices
    const openaiVoiceMap: Record<string, string> = {
      'priya': 'nova',
      'dev': 'echo',
      'kavya': 'shimmer',
      'ravi': 'onyx',
      'neha': 'nova',
      'aditya': 'echo',
      'anjali': 'shimmer',
      'rahul': 'onyx',
      'meera': 'nova',
      'arjun': 'echo',
    };
    const openaiVoice = openaiVoiceMap[voice || ''] || voice || 'alloy';

    audioBuffer = await voiceAIService.textToSpeech(text, openaiVoice);

    console.log('[TTS] OpenAI TTS generated, size:', audioBuffer.length);

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
    });

    res.send(audioBuffer);
  } catch (error) {
    console.error('[TTS] Error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Speech to Text endpoint (public - for widget)
router.post('/stt', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Audio file is required', 400);
    }

    const text = await voiceAIService.speechToText(
      req.file.buffer,
      req.file.mimetype.split('/')[1] || 'webm'
    );

    ApiResponse.success(res, 'Transcription complete', { text });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS (Admin) ====================

router.use(authenticate);
router.use(tenantMiddleware);

// Clone voice - Upload voice sample for voice cloning
router.post('/clone-voice', upload.single('voice'), async (req: TenantRequest, res: Response) => {
  try {
    if (!req.file) {
      return ApiResponse.error(res, 'Voice sample is required', 400);
    }

    const { name } = req.body;

    // Save voice sample and create a cloned voice entry
    const result = await voiceAIService.cloneVoice({
      organizationId: req.organizationId!,
      name: name || 'Custom Voice',
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });

    ApiResponse.success(res, 'Voice cloned successfully', {
      voiceId: result.voiceId,
      name: result.name,
      status: result.status,
    }, 201);
  } catch (error) {
    console.error('Voice cloning error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get custom voices for organization
router.get('/custom-voices', async (req: TenantRequest, res: Response) => {
  try {
    const voices = await voiceAIService.getCustomVoices(req.organizationId!);
    ApiResponse.success(res, 'Custom voices retrieved', voices);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete custom voice
router.delete('/custom-voices/:voiceId', async (req: TenantRequest, res: Response) => {
  try {
    const { voiceId } = req.params;
    await voiceAIService.deleteCustomVoice(voiceId, req.organizationId!);
    ApiResponse.success(res, 'Custom voice deleted');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get all industry templates
router.get('/templates', async (req: TenantRequest, res: Response) => {
  try {
    const templates = voiceAIService.getAllTemplates();
    ApiResponse.success(res, 'Templates retrieved', templates);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get specific template
router.get('/templates/:industry', async (req: TenantRequest, res: Response) => {
  try {
    const { industry } = req.params;
    const template = voiceAIService.getTemplate(industry as any);

    if (!template) {
      return ApiResponse.error(res, 'Template not found', 404);
    }

    ApiResponse.success(res, 'Template retrieved', template);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Create new voice agent
router.post('/agents', async (req: TenantRequest, res: Response) => {
  try {
    const { name, industry, customPrompt, customQuestions } = req.body;

    if (!name || !industry) {
      return ApiResponse.error(res, 'Name and industry are required', 400);
    }

    const agent = await voiceAIService.createAgent({
      organizationId: req.organizationId!,
      name,
      industry,
      customPrompt,
      customQuestions,
    });

    ApiResponse.success(res, 'Agent created', agent, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get all agents for organization
router.get('/agents', async (req: TenantRequest, res: Response) => {
  try {
    const agents = await voiceAIService.getAgents(req.organizationId!);
    ApiResponse.success(res, 'Agents retrieved', agents);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get single agent
router.get('/agents/:agentId', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = await voiceAIService.getAgent(agentId);

    if (!agent) {
      return ApiResponse.error(res, 'Agent not found', 404);
    }

    ApiResponse.success(res, 'Agent retrieved', agent);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update agent
router.put('/agents/:agentId', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const updateData = req.body;

    // Filter out fields that don't exist in the schema
    const allowedFields = [
      'name', 'description', 'industry', 'isActive', 'systemPrompt', 'voiceId',
      'language', 'temperature', 'questions', 'knowledgeBase', 'faqs', 'greeting',
      'fallbackMessage', 'transferMessage', 'endMessage', 'maxDuration',
      'personality', 'responseSpeed', 'interruptHandling', 'workingHoursEnabled',
      'workingHoursStart', 'workingHoursEnd', 'workingDays', 'afterHoursMessage',
      'silenceTimeout', 'widgetColor', 'widgetTitle', 'widgetSubtitle', 'widgetPosition',
      'documents', // Documents for WhatsApp sharing during calls
      // Lead Generation & CRM Integration Settings
      'autoCreateLeads', 'deduplicateByPhone', 'defaultStageId', 'defaultAssigneeId', 'autoAdvanceStage',
      // Appointment Booking Settings
      'appointmentEnabled', 'appointmentType', 'appointmentDuration', 'appointmentTimezone',
      // CRM Integration Settings
      'crmIntegration', 'crmWebhookUrl', 'triggerWebhookOnLead',
      // Realtime Settings
      'realtimeEnabled', 'webrtcEnabled'
    ];

    const filteredData: Record<string, any> = {};
    for (const key of allowedFields) {
      if (updateData[key] !== undefined) {
        filteredData[key] = updateData[key];
      }
    }

    console.log('[VoiceAI] Updating agent:', agentId, 'with fields:', Object.keys(filteredData));

    const agent = await voiceAIService.updateAgent(agentId, filteredData);

    ApiResponse.success(res, 'Agent updated', agent);
  } catch (error) {
    console.error('[VoiceAI] Update agent error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete agent
router.delete('/agents/:agentId', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;

    await voiceAIService.deleteAgent(agentId);

    ApiResponse.success(res, 'Agent deleted');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get agent sessions
router.get('/agents/:agentId/sessions', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const sessions = await voiceAIService.getAgentSessions(agentId, limit);

    ApiResponse.success(res, 'Sessions retrieved', sessions);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get agent analytics
router.get('/agents/:agentId/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const analytics = await voiceAIService.getAgentAnalytics(agentId, days);

    ApiResponse.success(res, 'Analytics retrieved', analytics);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get session details (admin)
router.get('/sessions/:sessionId', async (req: TenantRequest, res: Response) => {
  try {
    const { sessionId } = req.params;

    const session = await voiceAIService.getSession(sessionId);

    if (!session) {
      return ApiResponse.error(res, 'Session not found', 404);
    }

    ApiResponse.success(res, 'Session retrieved', session);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Test call endpoint - initiates a test call to verify agent settings
router.post('/test-call', async (req: TenantRequest, res: Response) => {
  try {
    const { phoneNumber, voiceId, greeting, language, agentId } = req.body;

    if (!phoneNumber) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    console.log(`[VoiceAI] Test call requested to ${phoneNumber} with voice ${voiceId}, agent ${agentId}`);

    // Import services dynamically
    const { exotelService } = await import('../integrations/exotel.service');
    const { outboundCallService } = await import('../integrations/outbound-call.service');

    if (!exotelService.isConfigured()) {
      return ApiResponse.error(res, 'Exotel is not configured. Please check EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN.', 400);
    }

    // Get agent for the call
    let agent = null;
    if (agentId) {
      agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });
    }
    if (!agent) {
      agent = await prisma.voiceAgent.findFirst({ where: { isActive: true } });
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/^0+/, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+91' + formattedPhone; // Default to India
    }

    console.log(`[VoiceAI] Making call to ${formattedPhone} with agent ${agent?.name || 'default'}`);

    // Make the actual call via outbound call service
    const result = await outboundCallService.makeCall({
      phone: formattedPhone,
      agentId: agent?.id,
      organizationId: req.organizationId!,
    });

    console.log(`[VoiceAI] Call result:`, result);

    if (result.callId) {
      ApiResponse.success(res, 'Test call initiated', {
        status: 'initiated',
        callId: result.callId,
        phoneNumber: formattedPhone,
        agent: agent?.name,
        message: 'Call is being connected. You should receive a call shortly.',
      });
    } else {
      ApiResponse.error(res, 'Failed to initiate call', 500);
    }
  } catch (error: any) {
    console.error('[VoiceAI] Test call error:', error);
    ApiResponse.error(res, error.message || 'Failed to make call', 500);
  }
});

// Generate embed code for agent
router.get('/agents/:agentId/embed', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId } = req.params;
    const baseUrl = config.frontendUrl;

    const embedCode = `<!-- Voice AI Widget -->
<script>
  (function(w,d,s,o,f,js,fjs){
    w['VoiceAI']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','voiceai','${baseUrl}/voice-widget.js'));
  voiceai('init', '${agentId}');
</script>`;

    ApiResponse.success(res, 'Embed code generated', { embedCode, agentId });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
