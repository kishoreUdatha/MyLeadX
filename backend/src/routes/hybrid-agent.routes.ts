import { Router, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { hybridAgentService } from '../integrations/hybrid-agent.service';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Get unified conversation history for a phone number
router.get('/history/:phone', async (req: TenantRequest, res: Response) => {
  try {
    const { phone } = req.params;

    const history = await hybridAgentService.getUnifiedHistory(
      phone,
      req.organization!.id
    );

    ApiResponse.success(res, 'Unified history retrieved', history);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get conversation context for a phone number
router.get('/context/:phone', async (req: TenantRequest, res: Response) => {
  try {
    const { phone } = req.params;
    const channel = (req.query.channel as string || 'WHATSAPP').toUpperCase() as 'WHATSAPP' | 'SMS' | 'CALL';

    const context = await hybridAgentService.getConversationContext(
      phone,
      req.organization!.id,
      channel
    );

    ApiResponse.success(res, 'Context retrieved', context);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Send message via any channel
router.post('/send', async (req: TenantRequest, res: Response) => {
  try {
    const { phone, message, channel } = req.body;

    if (!phone || !message || !channel) {
      return ApiResponse.error(res, 'Phone, message, and channel are required', 400);
    }

    const validChannels = ['WHATSAPP', 'SMS'];
    if (!validChannels.includes(channel.toUpperCase())) {
      return ApiResponse.error(res, 'Channel must be WHATSAPP or SMS', 400);
    }

    const context = await hybridAgentService.getConversationContext(
      phone,
      req.organization!.id,
      channel.toUpperCase() as 'WHATSAPP' | 'SMS'
    );

    const result = await hybridAgentService.sendMessage(
      context,
      message,
      req.user!.id
    );

    if (result.success) {
      ApiResponse.success(res, 'Message sent', result);
    } else {
      ApiResponse.error(res, result.error || 'Failed to send message', 500);
    }
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Send AI-generated response
router.post('/respond', async (req: TenantRequest, res: Response) => {
  try {
    const { phone, userMessage, channel } = req.body;

    if (!phone || !userMessage || !channel) {
      return ApiResponse.error(res, 'Phone, userMessage, and channel are required', 400);
    }

    const context = await hybridAgentService.getConversationContext(
      phone,
      req.organization!.id,
      channel.toUpperCase() as 'WHATSAPP' | 'SMS' | 'CALL'
    );

    // Generate AI response
    const aiResponse = await hybridAgentService.generateResponse(context, userMessage);

    // Send the response
    const sendResult = await hybridAgentService.sendMessage(
      context,
      aiResponse,
      req.user!.id
    );

    ApiResponse.success(res, 'Response sent', {
      response: aiResponse,
      sent: sendResult.success,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Switch channel
router.post('/switch-channel', async (req: TenantRequest, res: Response) => {
  try {
    const { phone, currentChannel, newChannel } = req.body;

    if (!phone || !currentChannel || !newChannel) {
      return ApiResponse.error(res, 'Phone, currentChannel, and newChannel are required', 400);
    }

    const validChannels = ['WHATSAPP', 'SMS', 'CALL'];
    if (!validChannels.includes(newChannel.toUpperCase())) {
      return ApiResponse.error(res, 'Invalid channel', 400);
    }

    const context = await hybridAgentService.getConversationContext(
      phone,
      req.organization!.id,
      currentChannel.toUpperCase() as 'WHATSAPP' | 'SMS' | 'CALL'
    );

    const result = await hybridAgentService.switchChannel(
      context,
      newChannel.toUpperCase() as 'WHATSAPP' | 'SMS' | 'CALL',
      req.user!.id
    );

    if (result.success) {
      ApiResponse.success(res, result.message || 'Channel switched', result);
    } else {
      ApiResponse.error(res, result.error || 'Failed to switch channel', 500);
    }
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Initiate call from hybrid conversation
router.post('/call', async (req: TenantRequest, res: Response) => {
  try {
    const { phone, agentId } = req.body;

    if (!phone) {
      return ApiResponse.error(res, 'Phone is required', 400);
    }

    const context = await hybridAgentService.getConversationContext(
      phone,
      req.organization!.id,
      'CALL'
    );

    const result = await hybridAgentService.switchChannel(
      context,
      'CALL',
      req.user!.id
    );

    ApiResponse.success(res, 'Call initiated from hybrid conversation', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
