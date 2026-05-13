/**
 * Platform Webhooks Controller
 *
 * Receives incoming webhooks from social ad platforms (Meta, Google,
 * LinkedIn, etc.) and routes them to the appropriate ingestion service.
 *
 * All endpoints are PUBLIC (no JWT) — they authenticate via platform-
 * specific signature checks (Meta's X-Hub-Signature-256, etc.).
 */

import { Request, Response, NextFunction } from 'express';
import { metaLeadAdsService } from '../services/meta-lead-ads.service';
import { googleLeadFormsService } from '../services/google-lead-forms.service';

export class PlatformWebhooksController {
  /**
   * GET /platform-webhooks/meta
   * Meta sends this once during webhook setup. Echo back hub.challenge
   * if the verify token matches META_WEBHOOK_VERIFY_TOKEN.
   */
  async metaVerify(req: Request, res: Response, _next: NextFunction) {
    const mode = req.query['hub.mode'] as string | undefined;
    const token = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge'] as string | undefined;

    const result = metaLeadAdsService.verifyChallenge(mode, token, challenge);
    if (result) {
      return res.status(200).send(result);
    }
    return res.status(403).send('Verification failed');
  }

  /**
   * POST /platform-webhooks/meta
   * Meta fires this for each new Lead Ad submission. The body contains
   * a leadgen_id; we fetch the full lead from Graph API and create a
   * PlatformProspect.
   */
  async metaWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.header('x-hub-signature-256');
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

      if (rawBody) {
        const valid = metaLeadAdsService.verifySignature(rawBody, signature);
        if (!valid) {
          console.warn('[MetaLeadAds] Invalid signature on webhook POST');
          return res.status(401).json({ success: false, message: 'Invalid signature' });
        }
      } else {
        console.warn('[MetaLeadAds] Raw body not captured — signature check skipped');
      }

      // Always respond 200 fast so Meta doesn't retry; process async
      res.status(200).json({ success: true });

      metaLeadAdsService
        .handleWebhook(req.body)
        .then((summary) => {
          console.log('[MetaLeadAds] Webhook processed:', summary);
        })
        .catch((err) => {
          console.error('[MetaLeadAds] Webhook handler error:', err.message);
        });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /platform-webhooks/google
   * Google Ads Lead Form Extension delivery. Body contains the lead
   * answers and a google_key field for authentication.
   */
  async googleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      if (!googleLeadFormsService.verifyKey(req.body)) {
        return res.status(401).json({ success: false, message: 'Invalid google_key' });
      }

      // Respond fast then process async
      res.status(200).json({ success: true });

      googleLeadFormsService
        .handleWebhook(req.body)
        .then((summary) => {
          console.log('[GoogleLeadForms] Webhook processed:', summary);
        })
        .catch((err) => {
          console.error('[GoogleLeadForms] Webhook handler error:', err.message);
        });
    } catch (error) {
      next(error);
    }
  }
}

export const platformWebhooksController = new PlatformWebhooksController();
