import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { openaiService } from '../integrations/openai.service';
import { ApiResponse } from '../utils/apiResponse';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database';

const router = Router();

// Public chatbot endpoints (for embedded chat widget)

// Start a new chat session
router.post('/session', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { organizationId } = req.body;

    if (!organizationId) {
      return ApiResponse.error(res, 'Organization ID is required', 400);
    }

    const sessionId = uuidv4();

    // Get initial greeting
    const response = await openaiService.chat(
      sessionId,
      'Hello',
      organizationId
    );

    ApiResponse.success(res, 'Chat session started', {
      sessionId,
      message: response.message,
    });
  } catch (error) {
    next(error);
  }
});

// Send message to chatbot
router.post(
  '/message',
  body('sessionId').notEmpty().withMessage('Session ID is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('organizationId').notEmpty().withMessage('Organization ID is required'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, message, organizationId } = req.body;

      const response = await openaiService.chat(sessionId, message, organizationId);

      ApiResponse.success(res, 'Message sent', {
        message: response.message,
        extractedData: response.extractedData,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get conversation history
router.get(
  '/conversation/:sessionId',
  param('sessionId').notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversation = await prisma.chatbotConversation.findUnique({
        where: { sessionId: req.params.sessionId },
      });

      if (!conversation) {
        return ApiResponse.notFound(res, 'Conversation not found');
      }

      ApiResponse.success(res, 'Conversation retrieved', conversation);
    } catch (error) {
      next(error);
    }
  }
);

// Convert conversation to lead
router.post(
  '/convert/:sessionId',
  param('sessionId').notEmpty(),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lead = await openaiService.convertConversationToLead(req.params.sessionId);

      if (!lead) {
        return ApiResponse.error(res, 'Insufficient data to create lead', 400);
      }

      ApiResponse.created(res, 'Lead created from conversation', lead);
    } catch (error) {
      next(error);
    }
  }
);

// Voice bot endpoints
router.post(
  '/voice/transcribe',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Expect audio file in request
      if (!req.file) {
        return ApiResponse.error(res, 'Audio file is required', 400);
      }

      const transcription = await openaiService.transcribeAudio(req.file.buffer);

      ApiResponse.success(res, 'Audio transcribed', { text: transcription });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/voice/chat',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId, organizationId } = req.body;

      if (!req.file) {
        return ApiResponse.error(res, 'Audio file is required', 400);
      }

      const response = await openaiService.voiceChat(
        sessionId || uuidv4(),
        req.file.buffer,
        organizationId
      );

      // Send audio response
      res.set({
        'Content-Type': 'audio/mpeg',
        'X-Transcription': response.transcription,
        'X-Response-Text': encodeURIComponent(response.response),
        'X-Session-Id': response.sessionId,
      });

      res.send(response.audio);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
