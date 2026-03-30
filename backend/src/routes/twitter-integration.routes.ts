import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { twitterAdsService } from '../integrations/twitter-ads.service';
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

// Get all Twitter integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.twitterAdsIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Twitter integrations retrieved', integrations);
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
      const integration = await prisma.twitterAdsIntegration.findFirst({
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
    body('adAccountId').notEmpty().withMessage('Ad Account ID is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        adAccountId,
        adAccountName,
        accessToken,
        accessTokenSecret,
        refreshToken,
        tokenExpiresAt,
        selectedLeadCards,
        selectedCampaigns,
        fieldMapping,
        webhookSecret,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.twitterAdsIntegration.findUnique({
        where: {
          organizationId_adAccountId: {
            organizationId: req.organizationId!,
            adAccountId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.twitterAdsIntegration.update({
          where: { id: existing.id },
          data: {
            adAccountName,
            accessToken,
            accessTokenSecret,
            refreshToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            selectedLeadCards: selectedLeadCards || [],
            selectedCampaigns: selectedCampaigns || [],
            fieldMapping: fieldMapping || {},
            webhookSecret,
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.twitterAdsIntegration.create({
        data: {
          organizationId: req.organizationId!,
          adAccountId,
          adAccountName,
          accessToken,
          accessTokenSecret,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
          selectedLeadCards: selectedLeadCards || [],
          selectedCampaigns: selectedCampaigns || [],
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
      const existing = await prisma.twitterAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.twitterAdsIntegration.update({
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
      const existing = await prisma.twitterAdsIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.twitterAdsIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get Lead Gen Cards
router.get(
  '/lead-cards',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.query;

      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: {
          id: integrationId as string,
          organizationId: req.organizationId,
          isActive: true,
        },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      twitterAdsService.initialize({
        accessToken: integration.accessToken,
        adAccountId: integration.adAccountId,
        webhookSecret: integration.webhookSecret || undefined,
      });

      const cards = await twitterAdsService.getLeadGenCards();

      ApiResponse.success(res, 'Lead Gen Cards retrieved', cards);
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
    body('adAccountId').notEmpty().withMessage('Ad account ID required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, adAccountId, accessTokenSecret } = req.body;

      twitterAdsService.initialize({
        accessToken,
        adAccountId,
        accessTokenSecret,
      });

      // Try to get campaigns to verify connection
      const campaigns = await twitterAdsService.syncCampaigns(req.organizationId!);

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        campaignsCount: campaigns.length,
      });
    } catch (error: any) {
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.response?.data?.errors?.[0]?.message || error.message,
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

      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId, isActive: true },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      twitterAdsService.initialize({
        accessToken: integration.accessToken,
        adAccountId: integration.adAccountId,
        accessTokenSecret: integration.accessTokenSecret || undefined,
      });

      const campaigns = await twitterAdsService.syncCampaigns(req.organizationId!);

      await prisma.twitterAdsIntegration.update({
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
      const webhookUrl = `${baseUrl}/api/tracking/webhooks/twitter`;

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        instructions: [
          '1. Go to Twitter Ads Manager',
          '2. Navigate to Lead Gen Cards settings',
          `3. Enter Webhook URL: ${webhookUrl}`,
          '4. Copy the webhook secret and save it in the integration',
          '5. Test the webhook connection',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Sync leads from a Lead Gen Card
router.post(
  '/sync-leads/:cardId',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.body;
      const { cardId } = req.params;

      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: { id: integrationId, organizationId: req.organizationId },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      twitterAdsService.initialize({
        accessToken: integration.accessToken,
        adAccountId: integration.adAccountId,
        accessTokenSecret: integration.accessTokenSecret || undefined,
      });

      const fieldMapping = integration.fieldMapping as Record<string, string> || {};
      const result = await twitterAdsService.syncFormLeads(
        cardId,
        req.organizationId!,
        fieldMapping
      );

      await prisma.twitterAdsIntegration.update({
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
  '/lead-cards/:cardId/fields',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { integrationId } = req.query;

      const integration = await prisma.twitterAdsIntegration.findFirst({
        where: {
          id: integrationId as string,
          organizationId: req.organizationId
        },
      });

      if (!integration) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      twitterAdsService.initialize({
        accessToken: integration.accessToken,
        adAccountId: integration.adAccountId,
      });

      const fields = await twitterAdsService.getFormFields(req.params.cardId);

      ApiResponse.success(res, 'Form fields retrieved', fields);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
