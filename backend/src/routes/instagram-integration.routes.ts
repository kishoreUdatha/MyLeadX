import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { instagramService } from '../integrations/instagram.service';
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

// Get all Instagram integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.instagramIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Instagram integrations retrieved', integrations);
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
      const integration = await prisma.instagramIntegration.findFirst({
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
    body('pageId').notEmpty().withMessage('Page ID is required'),
    body('accessToken').notEmpty().withMessage('Access token is required'),
    body('pageName').optional(),
    body('instagramAccountId').optional(),
    body('instagramUsername').optional(),
    body('adAccountId').optional(),
    body('selectedLeadForms').optional().isArray(),
    body('fieldMapping').optional().isObject(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        pageId,
        pageName,
        instagramAccountId,
        instagramUsername,
        adAccountId,
        accessToken,
        selectedLeadForms,
        fieldMapping,
      } = req.body;

      // Check if integration already exists for this page
      const existing = await prisma.instagramIntegration.findUnique({
        where: {
          organizationId_pageId: {
            organizationId: req.organizationId!,
            pageId,
          },
        },
      });

      if (existing) {
        // Update existing integration
        const updated = await prisma.instagramIntegration.update({
          where: { id: existing.id },
          data: {
            pageName,
            instagramAccountId,
            instagramUsername,
            adAccountId,
            accessToken,
            selectedLeadForms: selectedLeadForms || [],
            fieldMapping: fieldMapping || {},
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      // Create new integration
      const integration = await prisma.instagramIntegration.create({
        data: {
          organizationId: req.organizationId!,
          pageId,
          pageName,
          instagramAccountId,
          instagramUsername,
          adAccountId,
          accessToken,
          selectedLeadForms: selectedLeadForms || [],
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
  validate([
    body('pageName').optional(),
    body('instagramAccountId').optional(),
    body('instagramUsername').optional(),
    body('adAccountId').optional(),
    body('accessToken').optional(),
    body('selectedLeadForms').optional().isArray(),
    body('fieldMapping').optional().isObject(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.instagramIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.instagramIntegration.update({
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
      const existing = await prisma.instagramIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.instagramIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get Facebook pages with access token
router.get(
  '/pages',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      instagramService.setAccessToken(accessToken);
      const pages = await instagramService.getPages();

      ApiResponse.success(res, 'Pages retrieved', pages);
    } catch (error) {
      next(error);
    }
  }
);

// Get lead forms for a page
router.get(
  '/pages/:pageId/forms',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      instagramService.setAccessToken(accessToken);
      const forms = await instagramService.getLeadForms(req.params.pageId);

      ApiResponse.success(res, 'Lead forms retrieved', forms);
    } catch (error) {
      next(error);
    }
  }
);

// Get form field schema
router.get(
  '/forms/:formId/fields',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      instagramService.setAccessToken(accessToken);
      const fields = await instagramService.getFormFields(req.params.formId);

      ApiResponse.success(res, 'Form fields retrieved', fields);
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
      const webhookUrl = `${baseUrl}/api/ads/instagram/webhook`;
      const verifyToken = config.facebook.verifyToken || 'your-verify-token';

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        verifyToken,
        instructions: [
          '1. Go to Facebook Developer Console (developers.facebook.com)',
          '2. Navigate to your app > Webhooks',
          '3. Add webhook for "Page" with leadgen subscription',
          `4. Enter Callback URL: ${webhookUrl}`,
          `5. Enter Verify Token: ${verifyToken}`,
          '6. Subscribe to "leadgen" events',
          '7. Link your Facebook Page to the app',
        ],
      });
    } catch (error) {
      next(error);
    }
  }
);

// Test connection with access token
router.post(
  '/test-connection',
  authorize('admin'),
  validate([body('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken } = req.body;
      instagramService.setAccessToken(accessToken);

      // Try to get pages to validate the token
      const pages = await instagramService.getPages();

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        pagesCount: pages.length,
        pages: pages.map((p: any) => ({
          id: p.id,
          name: p.name,
          hasInstagram: !!p.instagram_business_account,
        })),
      });
    } catch (error: any) {
      // Return success with error info rather than throwing
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.response?.data?.error?.message || error.message,
      });
    }
  }
);

// Manual sync of historical leads from a form
router.post(
  '/sync-leads/:formId',
  authorize('admin'),
  validate([
    body('accessToken').notEmpty().withMessage('Access token required'),
    body('integrationId').optional().isUUID(),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, integrationId } = req.body;
      const { formId } = req.params;

      instagramService.setAccessToken(accessToken);

      // Get integration if provided to use field mapping
      let fieldMapping: Record<string, string> = {};
      if (integrationId) {
        const integration = await prisma.instagramIntegration.findFirst({
          where: { id: integrationId, organizationId: req.organizationId },
        });
        if (integration?.fieldMapping) {
          fieldMapping = integration.fieldMapping as Record<string, string>;
        }
      }

      // Sync leads with deduplication
      const leads = await instagramService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping
      );

      // Update last synced timestamp
      if (integrationId) {
        await prisma.instagramIntegration.update({
          where: { id: integrationId },
          data: { lastSyncedAt: new Date() },
        });
      }

      ApiResponse.success(res, 'Leads synced', {
        synced: leads.created,
        skipped: leads.skipped,
        total: leads.total,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get Instagram business account for a page
router.get(
  '/pages/:pageId/instagram-account',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      instagramService.setAccessToken(accessToken);
      const account = await instagramService.getConnectedAccounts(req.params.pageId);

      ApiResponse.success(res, 'Instagram account retrieved', account);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
