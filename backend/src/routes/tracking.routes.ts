import { Router } from 'express';
import { leadTrackingService, LEAD_SOURCES } from '../services/lead-tracking.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

/**
 * PUBLIC ENDPOINTS - No authentication required
 * These are called from tracking pixels and embedded forms
 */

/**
 * @api {get} /tracking/pixel Tracking Pixel Endpoint
 * Receives page view data from tracking pixel
 */
router.get(
  '/pixel',
  asyncHandler(async (req, res) => {
    try {
      const dataStr = req.query.data as string;
      if (dataStr) {
        const data = JSON.parse(decodeURIComponent(dataStr));

        await leadTrackingService.trackPageView({
          organizationId: data.organizationId,
          visitorId: data.visitorId,
          source: data.source || 'direct',
          medium: data.medium,
          campaign: data.campaign,
          content: data.content,
          term: data.term,
          referrer: data.referrer,
          landingPage: data.landingPage,
          userAgent: data.userAgent || req.headers['user-agent'],
          ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
        });
      }
    } catch (error) {
      console.error('Tracking pixel error:', error);
    }

    // Return 1x1 transparent GIF
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    res.writeHead(200, {
      'Content-Type': 'image/gif',
      'Content-Length': pixel.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    });
    res.end(pixel);
  })
);

/**
 * @api {post} /tracking/capture Capture Lead
 * Receives lead data from forms and tracking
 */
router.post(
  '/capture',
  asyncHandler(async (req, res) => {
    const {
      organizationId,
      source,
      email,
      phone,
      firstName,
      lastName,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPage,
      formId,
      customFields,
    } = req.body;

    if (!organizationId) {
      throw new AppError('Organization ID is required', 400);
    }

    if (!email && !phone) {
      throw new AppError('Email or phone is required', 400);
    }

    const result = await leadTrackingService.captureLead({
      organizationId,
      source: source || 'website',
      email,
      phone,
      firstName,
      lastName,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      referrer,
      landingPage,
      formId,
      customFields,
      ipAddress: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Set CORS headers for cross-origin form submissions
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');

    res.json(result);
  })
);

/**
 * @api {options} /tracking/capture CORS Preflight
 */
router.options('/capture', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.sendStatus(200);
});

/**
 * @api {post} /tracking/webhooks/facebook Facebook Lead Ads Webhook
 */
router.post(
  '/webhooks/facebook',
  asyncHandler(async (req, res) => {
    // Facebook sends a verification request first
    if (req.query['hub.mode'] === 'subscribe') {
      const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'crm_lead_verify';
      if (req.query['hub.verify_token'] === verifyToken) {
        res.send(req.query['hub.challenge']);
        return;
      }
      res.sendStatus(403);
      return;
    }

    // Process lead webhook
    const { object, entry } = req.body;

    if (object === 'page' && entry) {
      // Get organization from page mapping (you'd store this when connecting Facebook)
      // For now, we'll use a header or query param
      const organizationId = req.headers['x-organization-id'] as string;
      const accessToken = process.env.FACEBOOK_ACCESS_TOKEN || '';

      if (organizationId && accessToken) {
        await leadTrackingService.handleFacebookLeadWebhook(
          organizationId,
          req.body,
          accessToken
        );
      }
    }

    res.sendStatus(200);
  })
);

/**
 * @api {get} /tracking/webhooks/facebook Facebook Webhook Verification
 */
router.get(
  '/webhooks/facebook',
  (req, res) => {
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || 'crm_lead_verify';
    if (
      req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === verifyToken
    ) {
      res.send(req.query['hub.challenge']);
    } else {
      res.sendStatus(403);
    }
  }
);

/**
 * @api {post} /tracking/webhooks/google Google Ads Webhook
 * Receives lead form submissions from Google Ads
 */
router.post(
  '/webhooks/google',
  asyncHandler(async (req, res) => {
    const { lead_id, form_id, campaign_id, user_column_data, api_version } = req.body;
    const organizationId = req.headers['x-organization-id'] as string;

    if (!organizationId) {
      res.sendStatus(400);
      return;
    }

    // Parse Google lead data
    const fields: Record<string, string> = {};
    if (user_column_data) {
      for (const col of user_column_data) {
        fields[col.column_name?.toLowerCase()] = col.string_value || '';
      }
    }

    await leadTrackingService.captureLead({
      organizationId,
      source: 'google_ad',
      email: fields.email,
      phone: fields.phone_number || fields.phone,
      firstName: fields.first_name,
      lastName: fields.last_name,
      utmSource: 'google',
      utmMedium: 'cpc',
      campaignId: campaign_id,
      customFields: { lead_id, form_id, ...fields },
    });

    res.sendStatus(200);
  })
);

/**
 * AUTHENTICATED ENDPOINTS - Require login
 */

/**
 * @api {get} /tracking/pixel-code Get Tracking Pixel Code
 */
router.get(
  '/pixel-code',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;

    const pixelCode = leadTrackingService.generateTrackingPixel(organizationId, baseUrl);

    res.json({
      success: true,
      data: {
        pixelCode,
        instructions: [
          'Copy the code above and paste it into the <head> section of your website.',
          'The pixel will automatically track page views and UTM parameters.',
          'Use window.CRMCaptureLead({ email, phone, firstName, lastName }) to capture leads.',
        ],
      },
    });
  })
);

/**
 * @api {get} /tracking/form-code Get Embeddable Form Code
 */
router.get(
  '/form-code',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const baseUrl = process.env.API_URL || `${req.protocol}://${req.get('host')}`;
    const { title, fields, buttonText, successMessage, theme } = req.query;

    const formCode = leadTrackingService.generateLeadCaptureForm(organizationId, baseUrl, {
      title: title as string,
      fields: fields ? (fields as string).split(',') : undefined,
      buttonText: buttonText as string,
      successMessage: successMessage as string,
      theme: theme as 'light' | 'dark',
    });

    res.json({
      success: true,
      data: {
        formCode,
        instructions: [
          'Copy the code above and paste it into your landing page or website.',
          'Customize the form by adding query parameters: title, fields, buttonText, successMessage, theme',
          'Available fields: firstName, lastName, email, phone, company, message',
        ],
      },
    });
  })
);

/**
 * @api {get} /tracking/sources Lead Sources Analytics
 */
router.get(
  '/sources',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const analytics = await leadTrackingService.getLeadSourcesAnalytics(organizationId, { start, end });

    res.json({ success: true, data: analytics });
  })
);

/**
 * @api {get} /tracking/campaigns Campaign Performance
 */
router.get(
  '/campaigns',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const performance = await leadTrackingService.getCampaignPerformance(organizationId, { start, end });

    res.json({ success: true, data: performance });
  })
);

/**
 * @api {get} /tracking/sources-list Available Lead Sources
 */
router.get(
  '/sources-list',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: Object.entries(LEAD_SOURCES).map(([key, value]) => ({
        key,
        value,
        label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      })),
    });
  })
);

export default router;
