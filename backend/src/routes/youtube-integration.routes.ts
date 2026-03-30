import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { youtubeAdsService } from '../integrations/youtube-ads.service';
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

// Get all YouTube integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.youTubeAdsIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'YouTube integrations retrieved', integrations);
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
      const integration = await prisma.youTubeAdsIntegration.findFirst({
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
    body('channelId').notEmpty().withMessage('Channel ID is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        channelId,
        channelName,
        customerId,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        selectedCampaigns,
        fieldMapping,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.youTubeAdsIntegration.findUnique({
        where: {
          organizationId_channelId: {
            organizationId: req.organizationId!,
            channelId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.youTubeAdsIntegration.update({
          where: { id: existing.id },
          data: {
            channelName,
            customerId,
            accessToken,
            refreshToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            selectedCampaigns: selectedCampaigns || [],
            fieldMapping: fieldMapping || {},
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.youTubeAdsIntegration.create({
        data: {
          organizationId: req.organizationId!,
          channelId,
          channelName,
          customerId,
          accessToken,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          selectedCampaigns: selectedCampaigns || [],
          fieldMapping: fieldMapping || {},
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
      const existing = await prisma.youTubeAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.youTubeAdsIntegration.update({
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
      const existing = await prisma.youTubeAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.youTubeAdsIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get YouTube channels
router.get(
  '/channels',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      youtubeAdsService.initialize({ accessToken, channelId: '' });
      const channelInfo = await youtubeAdsService.getChannelInfo();

      ApiResponse.success(res, 'Channel info retrieved', channelInfo);
    } catch (error) {
      next(error);
    }
  }
);

// Test connection
router.post(
  '/test-connection',
  authorize('admin'),
  validate([body('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, customerId } = req.body;
      youtubeAdsService.initialize({ accessToken, channelId: '', customerId });

      const channelInfo = await youtubeAdsService.getChannelInfo();

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        channel: channelInfo,
      });
    } catch (error: any) {
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.response?.data?.message || error.message,
      });
    }
  }
);

// Sync campaigns from YouTube/Google Ads
router.post(
  '/sync-campaigns',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.body;

      const integration = await prisma.youTubeAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId, isActive: true },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      youtubeAdsService.initialize({
        accessToken: integration.accessToken,
        channelId: integration.channelId,
        customerId: integration.customerId || undefined,
      });

      const campaigns = await youtubeAdsService.syncCampaigns(req.organizationId!);

      await prisma.youTubeAdsIntegration.update({
        where: { id: integrationId },
        data: { syncedAt: new Date() },
      });

      ApiResponse.success(res, 'Campaigns synced', {
        synced: campaigns.length,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          views: c.views,
          clicks: c.clicks,
        })),
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get video metrics
router.get(
  '/videos/:videoId/metrics',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      youtubeAdsService.initialize({ accessToken, channelId: '' });

      const metrics = await youtubeAdsService.getVideoMetrics(req.params.videoId);

      if (!metrics) {
        return ApiResponse.notFound(res, 'Video not found');
      }

      ApiResponse.success(res, 'Video metrics retrieved', metrics);
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
      const webhookUrl = `${baseUrl}/api/tracking/webhooks/youtube`;

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        instructions: [
          '1. Go to Google Ads > Leads > Form Settings',
          '2. Configure webhook integration for lead form submissions',
          `3. Enter Webhook URL: ${webhookUrl}`,
          '4. Select your YouTube video campaigns',
          '5. Map form fields to CRM fields',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Manual sync of leads from a form
router.post(
  '/sync-leads/:formId',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.body;
      const { formId } = req.params;

      const integration = await prisma.youTubeAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      youtubeAdsService.initialize({
        accessToken: integration.accessToken,
        channelId: integration.channelId,
        customerId: integration.customerId || undefined,
      });

      const fieldMapping = integration.fieldMapping as Record<string, string> || {};
      const result = await youtubeAdsService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping
      );

      await prisma.youTubeAdsIntegration.update({
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

export default router;
