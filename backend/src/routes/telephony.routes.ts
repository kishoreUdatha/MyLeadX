/**
 * Telephony Routes
 * Unified webhook endpoints for all telephony providers (Plivo, Exotel)
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { telephonyService, plivoProvider, exotelProvider } from '../services/telephony';
import { softphoneService } from '../services/softphone.service';

const router = Router();

// ==================== PLIVO WEBHOOKS (No Auth) ====================

/**
 * Plivo call answer webhook
 */
router.post('/plivo/answer/:callId?', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId || req.body.CallUUID;
    console.log(`[Telephony] Plivo answer webhook for call: ${callId}`);

    // Handle via softphone service if this is a softphone call
    if (callId && softphoneService) {
      const xml = softphoneService.handleCallAnswer(callId);
      res.set('Content-Type', 'application/xml');
      return res.send(xml);
    }

    // Default response - keep call alive
    const xml = plivoProvider.generateAnswerXml({
      sayText: 'Connected. You may now speak.',
    });

    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Telephony] Plivo answer error:', error);
    res.set('Content-Type', 'application/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
});

/**
 * Plivo call status webhook
 */
router.post('/plivo/status/:callId?', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId || req.body.CallUUID;
    const status = telephonyService.parseWebhook('PLIVO', req.body);

    console.log(`[Telephony] Plivo status webhook: ${callId} - ${status.status}`);

    // Handle via softphone service
    if (callId && softphoneService) {
      await softphoneService.handleCallStatus(
        callId,
        status.status,
        status.duration,
        status.recordingUrl
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Telephony] Plivo status error:', error);
    res.status(200).send('OK'); // Always return OK to prevent retries
  }
});

/**
 * Plivo recording webhook
 */
router.post('/plivo/recording/:callId?', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId || req.body.CallUUID;
    const recordingUrl = req.body.RecordUrl || req.body.RecordingUrl;

    console.log(`[Telephony] Plivo recording webhook: ${callId} - ${recordingUrl}`);

    // Update call with recording URL
    if (callId && recordingUrl && softphoneService) {
      await softphoneService.handleCallStatus(callId, 'completed', undefined, recordingUrl);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Telephony] Plivo recording error:', error);
    res.status(200).send('OK');
  }
});

// ==================== EXOTEL WEBHOOKS (No Auth) ====================

/**
 * Exotel call answer webhook
 */
router.post('/exotel/answer/:callId?', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId || req.body.CallSid;
    console.log(`[Telephony] Exotel answer webhook for call: ${callId}`);

    // Handle via softphone service if this is a softphone call
    if (callId && softphoneService) {
      const xml = softphoneService.handleCallAnswer(callId);
      res.set('Content-Type', 'text/xml');
      return res.send(xml);
    }

    // Default response
    const xml = exotelProvider.generateAnswerXml({
      sayText: 'Connected. You may now speak.',
    });

    res.set('Content-Type', 'text/xml');
    res.send(xml);
  } catch (error) {
    console.error('[Telephony] Exotel answer error:', error);
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>');
  }
});

/**
 * Exotel call status webhook
 */
router.post('/exotel/status/:callId?', async (req: Request, res: Response) => {
  try {
    const callId = req.params.callId || req.body.CallSid;
    const status = telephonyService.parseWebhook('EXOTEL', req.body);

    console.log(`[Telephony] Exotel status webhook: ${callId} - ${status.status}`);

    // Handle via softphone service
    if (callId && softphoneService) {
      await softphoneService.handleCallStatus(
        callId,
        status.status,
        status.duration,
        status.recordingUrl
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Telephony] Exotel status error:', error);
    res.status(200).send('OK');
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Get telephony status and available providers
 */
router.get('/status', async (req: TenantRequest, res: Response) => {
  try {
    const [providers, availableProviders] = await Promise.all([
      telephonyService.getProvidersStatus(),
      telephonyService.getAvailableProviders(),
    ]);

    ApiResponse.success(res, 'Telephony status', {
      providers,
      availableProviders,
      defaultProvider: availableProviders[0] || null,
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Test a provider connection
 */
router.post('/test/:provider', async (req: TenantRequest, res: Response) => {
  try {
    const { provider } = req.params;
    const providerUpper = provider.toUpperCase() as 'PLIVO' | 'EXOTEL';

    const providerInstance = telephonyService.getProvider(providerUpper);
    const config = await providerInstance.getConfig();

    if (config.isConfigured) {
      ApiResponse.success(res, `${provider} is configured and ready`, {
        configured: true,
        balance: config.balance,
        accountName: config.accountName,
      });
    } else {
      ApiResponse.error(res, `${provider} is not configured`, 400);
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Make a test call
 */
router.post('/test-call', async (req: TenantRequest, res: Response) => {
  try {
    const { to } = req.body;

    if (!to) {
      return ApiResponse.error(res, 'Phone number is required', 400);
    }

    const result = await telephonyService.makeCallForUser({
      userId: req.user!.id,
      organizationId: req.organization!.id,
      to,
    });

    if (result.success) {
      ApiResponse.success(res, 'Test call initiated', {
        callId: result.callId,
        provider: result.provider,
      });
    } else {
      ApiResponse.error(res, result.error || 'Failed to initiate call', 400);
    }
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

export default router;
