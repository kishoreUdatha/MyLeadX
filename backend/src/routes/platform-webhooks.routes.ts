/**
 * Platform Webhooks Routes — public ingestion from social ad platforms
 *
 * No JWT auth; each endpoint validates the incoming request using the
 * platform's own signature scheme (X-Hub-Signature-256 for Meta, etc.).
 *
 * Path contains "/webhook" so the global CSRF middleware skips it
 * (see middlewares/csrf.ts).
 */

import { Router } from 'express';
import { platformWebhooksController } from '../controllers/platform-webhooks.controller';

const router = Router();

// Meta (Facebook + Instagram Lead Ads)
router.get(
  '/meta',
  platformWebhooksController.metaVerify.bind(platformWebhooksController),
);
router.post(
  '/meta',
  platformWebhooksController.metaWebhook.bind(platformWebhooksController),
);

// Google Ads Lead Form Extensions
router.post(
  '/google',
  platformWebhooksController.googleWebhook.bind(platformWebhooksController),
);

export default router;
