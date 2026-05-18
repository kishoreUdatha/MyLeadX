import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import crypto from 'crypto';
import { facebookService } from '../integrations/facebook.service';
import { ApiResponse } from '../utils/apiResponse';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { prisma } from '../config/database';
import { config } from '../config';

// Multi-tenant guarantee: every tenant gets a unique webhook verify token, NOT
// the shared FACEBOOK_VERIFY_TOKEN env default. The token lives on the
// per-tenant pending-webhook-setup FacebookIntegration row and is reused by the
// Instagram wizard (one Meta App per tenant → one verify token per tenant).
const WEBHOOK_PLACEHOLDER_PAGE_ID = 'pending-webhook-setup';

async function getOrCreateTenantVerifyToken(organizationId: string): Promise<string> {
  // 1. Any active integration with a token already set → reuse it (covers both
  //    real page rows and the placeholder row).
  const existing = await prisma.facebookIntegration.findFirst({
    where: {
      organizationId,
      verifyToken: { not: null },
    },
  });
  if (existing?.verifyToken) return existing.verifyToken;

  // 2. No token anywhere for this tenant — mint one and persist on a placeholder
  //    row so the next call is idempotent and Instagram setup sees the same value.
  const newToken = crypto.randomBytes(24).toString('hex');
  await prisma.facebookIntegration.upsert({
    where: {
      organizationId_pageId: { organizationId, pageId: WEBHOOK_PLACEHOLDER_PAGE_ID },
    },
    update: { verifyToken: newToken, isActive: true },
    create: {
      organizationId,
      pageId: WEBHOOK_PLACEHOLDER_PAGE_ID,
      verifyToken: newToken,
      accessToken: 'pending-webhook-setup',
      isActive: true,
    },
  });
  return newToken;
}

export { getOrCreateTenantVerifyToken };

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Get all Facebook integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.facebookIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Facebook integrations retrieved', integrations);
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
      const integration = await prisma.facebookIntegration.findFirst({
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

// Save credentials for webhook setup (before full integration)
router.post(
  '/webhook-credentials',
  authorize('admin'),
  validate([
    body('verifyToken').notEmpty().withMessage('Verify token is required'),
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { appId, appSecret, verifyToken } = req.body;

      // Use a placeholder pageId for webhook setup
      const placeholderPageId = 'pending-webhook-setup';

      // Check if a pending integration already exists
      const existing = await prisma.facebookIntegration.findUnique({
        where: {
          organizationId_pageId: {
            organizationId: req.organizationId!,
            pageId: placeholderPageId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.facebookIntegration.update({
          where: { id: existing.id },
          data: {
            appId: appId || existing.appId,
            appSecret: appSecret || existing.appSecret,
            verifyToken: verifyToken,
            updatedAt: new Date(),
          },
        });
        return ApiResponse.success(res, 'Webhook credentials updated', updated);
      }

      const integration = await prisma.facebookIntegration.create({
        data: {
          organizationId: req.organizationId!,
          pageId: placeholderPageId,
          pageName: 'Pending Webhook Setup',
          appId,
          appSecret,
          verifyToken,
          accessToken: '',
          selectedLeadForms: [],
          fieldMapping: {},
        },
      });

      ApiResponse.created(res, 'Webhook credentials saved', integration);
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
  ]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const {
        pageId,
        pageName,
        adAccountId,
        appId,
        appSecret,
        verifyToken,
        accessToken,
        selectedLeadForms,
        fieldMapping,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.facebookIntegration.findUnique({
        where: {
          organizationId_pageId: {
            organizationId: req.organizationId!,
            pageId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.facebookIntegration.update({
          where: { id: existing.id },
          data: {
            pageName,
            adAccountId,
            appId: appId || existing.appId,
            appSecret: appSecret || existing.appSecret,
            verifyToken: verifyToken || existing.verifyToken,
            accessToken,
            selectedLeadForms: selectedLeadForms || [],
            fieldMapping: fieldMapping || {},
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.facebookIntegration.create({
        data: {
          organizationId: req.organizationId!,
          pageId,
          pageName,
          adAccountId,
          appId,
          appSecret,
          verifyToken,
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
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.facebookIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.facebookIntegration.update({
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
      const existing = await prisma.facebookIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.facebookIntegration.delete({
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
      facebookService.setAccessToken(accessToken);
      const pages = await facebookService.getPages();

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
      facebookService.setAccessToken(accessToken);
      const forms = await facebookService.getLeadForms(req.params.pageId);

      ApiResponse.success(res, 'Lead forms retrieved', forms);
    } catch (error: any) {
      // Meta returns HTTP 403 for BOTH "page has no forms / app not subscribed"
      // AND "your token is missing pages_manage_ads / leads_retrieval". The old
      // code lumped both into "No lead forms found" — which hid the real
      // permission errors and sent users on a long debugging chase.
      //
      // Now: if Meta returned an error body with a message, surface it. Only
      // treat as "no forms" when Meta gave a successful empty response (which
      // would not reach this catch block anyway — getLeadForms returns []).
      const metaError = error.response?.data?.error;
      if (metaError) {
        console.warn(`[Facebook] getLeadForms error: status=${error.response?.status} code=${metaError.code} message="${metaError.message}"`);
        return ApiResponse.error(
          res,
          `Facebook: ${metaError.message}`,
          error.response?.status || 400
        );
      }
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
      facebookService.setAccessToken(accessToken);
      const fields = await facebookService.getFormFields(req.params.formId);

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
      // Include organizationId in webhook URL for proper routing
      const webhookUrl = `${baseUrl}/api/ads/facebook/webhook?organizationId=${req.organizationId}`;

      // Per-tenant verify token (generated on first call, persisted, idempotent).
      const verifyToken = await getOrCreateTenantVerifyToken(req.organizationId!);

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        verifyToken,
        organizationId: req.organizationId,
        instructions: [
          '1. Go to Facebook Developer Console (developers.facebook.com)',
          '2. Navigate to your app > Webhooks',
          '3. Add webhook for "Page" subscription',
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
      facebookService.setAccessToken(accessToken);

      const pages = await facebookService.getPages();

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        pagesCount: pages.length,
        pages: pages.map((p: any) => ({
          id: p.id,
          name: p.name,
        })),
      });
    } catch (error: any) {
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
  validate([body('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const { accessToken, integrationId } = req.body;
      const { formId } = req.params;

      facebookService.setAccessToken(accessToken);

      let fieldMapping: Record<string, string> = {};
      if (integrationId) {
        const integration = await prisma.facebookIntegration.findFirst({
          where: { id: integrationId, organizationId: req.organizationId },
        });
        if (integration?.fieldMapping) {
          fieldMapping = integration.fieldMapping as Record<string, string>;
        }
      }

      const leads = await facebookService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping
      );

      if (integrationId) {
        await prisma.facebookIntegration.update({
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

// Sync all integrations for the organization
router.post(
  '/integrations/sync',
  authorize('admin'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.facebookIntegration.findMany({
        where: { organizationId: req.organizationId, isActive: true },
      });

      let totalSynced = 0;
      let totalSkipped = 0;

      for (const integration of integrations) {
        if (!integration.accessToken || integration.pageId === 'pending-webhook-setup') {
          continue;
        }

        try {
          facebookService.setAccessToken(integration.accessToken);
          const selectedForms = integration.selectedLeadForms as any[] || [];
          const fieldMapping = integration.fieldMapping as Record<string, string> || {};

          for (const form of selectedForms) {
            const formId = typeof form === 'string' ? form : form.id;
            if (formId) {
              const result = await facebookService.syncFormLeads(
                formId,
                req.organizationId!,
                fieldMapping
              );
              totalSynced += result.created;
              totalSkipped += result.skipped;
            }
          }

          await prisma.facebookIntegration.update({
            where: { id: integration.id },
            data: { lastSyncedAt: new Date() },
          });
        } catch (err) {
          console.error(`[Facebook] Sync error for integration ${integration.id}:`, err);
        }
      }

      ApiResponse.success(res, 'Facebook integrations synced', {
        integrations: integrations.length,
        synced: totalSynced,
        skipped: totalSkipped,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
