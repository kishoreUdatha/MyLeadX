import { Router } from 'express';
import { messageStatusCallbackService } from '../services/message-status-callback.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import {
  verifyTwilioWebhook,
  verifyPlivoWebhook,
  verifyWhatsAppWebhook,
  verifySendGridWebhook,
} from '../middlewares/webhookAuth';

const router = Router();

/**
 * Provider Callback Endpoints (secured by provider signature verification)
 */

/**
 * @api {post} /message-status/callbacks/twilio Twilio Status Callback
 * Twilio sends status updates here
 * Secured by X-Twilio-Signature header verification
 */
router.post(
  '/callbacks/twilio',
  verifyTwilioWebhook,
  asyncHandler(async (req, res) => {
    const result = await messageStatusCallbackService.handleTwilioCallback(req.body);

    res.status(200).send('OK');
  })
);

/**
 * @api {post} /message-status/callbacks/plivo Plivo Status Callback
 * Plivo sends status updates here
 * Secured by X-Plivo-Signature-V3 header verification
 */
router.post(
  '/callbacks/plivo',
  verifyPlivoWebhook,
  asyncHandler(async (req, res) => {
    const result = await messageStatusCallbackService.handlePlivoCallback(req.body);

    res.status(200).send('OK');
  })
);

/**
 * @api {post} /message-status/callbacks/whatsapp WhatsApp Status Callback
 * WhatsApp/Meta sends status updates here
 * Secured by X-Hub-Signature-256 header verification
 */
router.post(
  '/callbacks/whatsapp',
  verifyWhatsAppWebhook,
  asyncHandler(async (req, res) => {
    const result = await messageStatusCallbackService.handleWhatsAppCallback(req.body);

    res.status(200).json({ success: true });
  })
);

/**
 * @api {get} /message-status/callbacks/whatsapp WhatsApp Webhook Verification
 * WhatsApp uses GET for webhook verification
 */
router.get(
  '/callbacks/whatsapp',
  asyncHandler(async (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify token matches your configured verify token
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'verify_token';

    if (mode === 'subscribe' && token === verifyToken) {
      res.status(200).send(challenge);
    } else {
      res.status(403).send('Verification failed');
    }
  })
);

/**
 * @api {post} /message-status/callbacks/email Email Status Callback
 * Generic email provider callback (SendGrid, Mailgun, etc.)
 */
router.post(
  '/callbacks/email',
  asyncHandler(async (req, res) => {
    // Handle different email provider formats
    const { messageId, event, errorCode, errorMessage, metadata } = req.body;

    if (messageId && event) {
      await messageStatusCallbackService.handleEmailCallback({
        messageId,
        event,
        errorCode,
        errorMessage,
        metadata,
      });
    }

    res.status(200).send('OK');
  })
);

/**
 * @api {post} /message-status/callbacks/sendgrid SendGrid Event Webhook
 * SendGrid sends batch events
 * Secured by X-Twilio-Email-Event-Webhook-Signature header verification
 */
router.post(
  '/callbacks/sendgrid',
  verifySendGridWebhook,
  asyncHandler(async (req, res) => {
    const events = Array.isArray(req.body) ? req.body : [req.body];

    for (const event of events) {
      const eventType = event.event; // delivered, open, click, bounce, etc.
      const messageId = event.sg_message_id || event['smtp-id'];

      if (messageId && eventType) {
        await messageStatusCallbackService.handleEmailCallback({
          messageId,
          event: eventType,
          errorCode: event.reason,
          errorMessage: event.response,
          metadata: event,
        });
      }
    }

    res.status(200).send('OK');
  })
);

/**
 * Authenticated Endpoints - For internal API use
 */

/**
 * @api {get} /message-status/:messageId/history Get Message Status History
 */
router.get(
  '/:messageId/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const history = await messageStatusCallbackService.getMessageStatusHistory(req.params.messageId);

    res.json({
      success: true,
      data: history,
    });
  })
);

/**
 * @api {get} /message-status/recent Get Recent Status Updates
 */
router.get(
  '/recent',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { page = '1', limit = '50', status } = req.query;

    const result = await messageStatusCallbackService.getRecentStatusUpdates(organizationId, {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      status: status as any,
    });

    res.json({ success: true, ...result });
  })
);

/**
 * @api {post} /message-status/process-pending Process Pending Webhooks
 * Manual trigger to process pending webhook notifications
 */
router.post(
  '/process-pending',
  authenticate,
  asyncHandler(async (req, res) => {
    const result = await messageStatusCallbackService.processPendingWebhooks();

    res.json({
      success: true,
      message: `Processed ${result.processed} pending webhooks`,
      data: result,
    });
  })
);

export default router;
