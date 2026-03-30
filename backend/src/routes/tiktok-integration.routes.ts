import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { tiktokAdsService } from '../integrations/tiktok-ads.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { prisma } from '../config/database';
import { config } from '../config';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Get all TikTok integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.tikTokAdsIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'TikTok integrations retrieved', integrations);
    } catch (error) {
      next(error);
    }
  }
);

// Get a specific integration
router.get(
  '/integrations/:id',
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      ApiResponse.success(res, 'Integration retrieved', integration);
    } catch (error) {
      next(error);
    }
  }
);

// Create a new integration
router.post(
  '/integrations',
  authorize('admin'),
  validate([
    body('advertiserId').notEmpty().withMessage('Advertiser ID is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        advertiserId,
        advertiserName,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        selectedInstantForms,
        selectedCampaigns,
        pixelId,
        fieldMapping,
        webhookSecret,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.tikTokAdsIntegration.findUnique({
        where: {
          organizationId_advertiserId: {
            organizationId: req.organizationId!,
            advertiserId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.tikTokAdsIntegration.update({
          where: { id: existing.id },
          data: {
            advertiserName,
            accessToken,
            refreshToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            selectedInstantForms: selectedInstantForms || [],
            selectedCampaigns: selectedCampaigns || [],
            pixelId,
            fieldMapping: fieldMapping || {},
            webhookSecret,
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.tikTokAdsIntegration.create({
        data: {
          organizationId: req.organizationId!,
          advertiserId,
          advertiserName,
          accessToken,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          selectedInstantForms: selectedInstantForms || [],
          selectedCampaigns: selectedCampaigns || [],
          pixelId,
          fieldMapping: fieldMapping || {},
          webhookSecret,
        },
      });

      ApiResponse.created(res, 'Integration created', integration);
    } catch (error) {
      next(error);
    }
  }
);

// Update an integration
router.put(
  '/integrations/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.tikTokAdsIntegration.update({
        where: { id: req.params.id },
        data: {
          ...req.body,
          updatedAt: new Date(),
        },
      });

      ApiResponse.success(res, 'Integration updated', updated);
    } catch (error) {
      next(error);
    }
  }
);

// Delete an integration
router.delete(
  '/integrations/:id',
  authorize('admin'),
  param('id').isUUID(),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.tikTokAdsIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get Instant Forms
router.get(
  '/instant-forms',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.query;

      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: {
          id: integrationId as string,
          organizationId: req.organizationId,
          isActive: true,
        },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
        pixelId: integration.pixelId || undefined,
      });

      const forms = await tiktokAdsService.getInstantForms();

      ApiResponse.success(res, 'Instant Forms retrieved', forms);
    } catch (error) {
      next(error);
    }
  }
);

// Test connection
router.post(
  '/test-connection',
  authorize('admin'),
  validate([
    body('accessToken').notEmpty().withMessage('Access token required'),
    body('advertiserId').notEmpty().withMessage('Advertiser ID required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, advertiserId } = req.body;

      tiktokAdsService.initialize({
        accessToken,
        advertiserId,
      });

      // Try to get campaigns to verify connection
      const campaigns = await tiktokAdsService.syncCampaigns(req.organizationId!);

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        campaignsCount: campaigns.length,
      });
    } catch (error: any) {
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.response?.data?.message || error.message,
      });
    }
  }
);

// Sync campaigns
router.post(
  '/sync-campaigns',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.body;

      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId, isActive: true },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
        pixelId: integration.pixelId || undefined,
      });

      const campaigns = await tiktokAdsService.syncCampaigns(req.organizationId!);

      await prisma.tikTokAdsIntegration.update({
        where: { id: integrationId },
        data: { syncedAt: new Date() },
      });

      ApiResponse.success(res, 'Campaigns synced', {
        synced: campaigns.length,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          videoViews: c.videoViews,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get webhook URL for setup
router.get(
  '/webhook-url',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const baseUrl = config.baseUrl || `${req.protocol}://${req.get('host')}`;
      const webhookUrl = `${baseUrl}/api/tracking/webhooks/tiktok`;

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        instructions: [
          '1. Go to TikTok Ads Manager',
          '2. Navigate to Assets > Instant Forms',
          `3. Configure webhook URL: ${webhookUrl}`,
          '4. Copy the webhook secret and save it',
          '5. Enable real-time lead notifications',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sync leads from an Instant Form
router.post(
  '/sync-leads/:formId',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.body;
      const { formId } = req.params;

      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
        pixelId: integration.pixelId || undefined,
      });

      const fieldMapping = integration.fieldMapping as Record<string, string> || {};
      const result = await tiktokAdsService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping
      );

      await prisma.tikTokAdsIntegration.update({
        where: { id: integrationId },
        data: { lastSyncedAt: new Date() },
      });

      ApiResponse.success(res, 'Leads synced', {
        synced: result.created,
        skipped: result.skipped,
        total: result.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get form field schema
router.get(
  '/instant-forms/:formId/fields',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.query;

      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: {
          id: integrationId as string,
          organizationId: req.organizationId
        },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
      });

      const fields = await tiktokAdsService.getFormFields(req.params.formId);

      ApiResponse.success(res, 'Form fields retrieved', fields);
    } catch (error) {
      next(error);
    }
  }
);

// Track pixel event (for server-side tracking)
router.post(
  '/pixel/track',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId, eventName, eventData } = req.body;

      const integration = await prisma.tikTokAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId, isActive: true },
      });

      if (!integration || !integration.pixelId) {
        return ApiResponse.badRequest(res, 'Integration not found or pixel not configured');
      }

      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
        pixelId: integration.pixelId,
      });

      const result = await tiktokAdsService.trackPixelEvent(eventName, eventData);

      ApiResponse.success(res, 'Event tracked', result);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
