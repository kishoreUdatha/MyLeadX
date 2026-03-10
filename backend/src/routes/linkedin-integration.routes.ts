import { Router, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import { linkedinService } from '../integrations/linkedin.service';
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

// Get all LinkedIn integrations for the organization
router.get(
  '/integrations',
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const integrations = await prisma.linkedInIntegration.findMany({
        where: { organizationId: req.organizationId },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'LinkedIn integrations retrieved', integrations);
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
      const integration = await prisma.linkedInIntegration.findFirst({
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
        refreshToken,
        tokenExpiresAt,
        selectedLeadForms,
        fieldMapping,
      } = req.body;

      // Check if integration already exists
      const existing = await prisma.linkedInIntegration.findUnique({
        where: {
          organizationId_adAccountId: {
            organizationId: req.organizationId!,
            adAccountId,
          },
        },
      });

      if (existing) {
        const updated = await prisma.linkedInIntegration.update({
          where: { id: existing.id },
          data: {
            adAccountName,
            accessToken,
            refreshToken,
            tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
            selectedLeadForms: selectedLeadForms || [],
            fieldMapping: fieldMapping || {},
            isActive: true,
            updatedAt: new Date(),
          },
        });

        return ApiResponse.success(res, 'Integration updated', updated);
      }

      const integration = await prisma.linkedInIntegration.create({
        data: {
          organizationId: req.organizationId!,
          adAccountId,
          adAccountName,
          accessToken,
          refreshToken,
          tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : null,
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
      const existing = await prisma.linkedInIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      const updated = await prisma.linkedInIntegration.update({
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
      const existing = await prisma.linkedInIntegration.findFirst({
        where: { id: req.params.id, organizationId: req.organizationId },
      });

      if (!existing) {
        return ApiResponse.notFound(res, 'Integration not found');
      }

      await prisma.linkedInIntegration.delete({
        where: { id: req.params.id },
      });

      ApiResponse.success(res, 'Integration deleted');
    } catch (error) {
      next(error);
    }
  }
);

// Get LinkedIn ad accounts
router.get(
  '/ad-accounts',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      linkedinService.setAccessToken(accessToken);
      const accounts = await linkedinService.getAdAccounts();

      ApiResponse.success(res, 'Ad accounts retrieved', accounts);
    } catch (error) {
      next(error);
    }
  }
);

// Get lead gen forms for an ad account
router.get(
  '/accounts/:accountId/forms',
  authorize('admin'),
  validate([query('accessToken').notEmpty().withMessage('Access token required')]),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const accessToken = req.query.accessToken as string;
      linkedinService.setAccessToken(accessToken);
      const forms = await linkedinService.getLeadGenForms(req.params.accountId);

      ApiResponse.success(res, 'Lead gen forms retrieved', forms);
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
      linkedinService.setAccessToken(accessToken);
      const fields = await linkedinService.getFormFields(req.params.formId);

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
      const webhookUrl = `${baseUrl}/api/ads/linkedin/webhook`;

      ApiResponse.success(res, 'Webhook URL retrieved', {
        webhookUrl,
        instructions: [
          '1. Go to LinkedIn Campaign Manager',
          '2. Navigate to Account Assets > Lead Gen Forms',
          '3. Set up webhook integration',
          `4. Enter Webhook URL: ${webhookUrl}`,
          '5. Configure lead sync settings',
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
      linkedinService.setAccessToken(accessToken);

      const accounts = await linkedinService.getAdAccounts();

      ApiResponse.success(res, 'Connection successful', {
        valid: true,
        accountsCount: accounts.length,
        accounts: accounts.map((a: any) => ({
          id: a.id,
          name: a.name,
        })),
      });
    } catch (error: any) {
      ApiResponse.success(res, 'Connection failed', {
        valid: false,
        error: error.response?.data?.message || error.message,
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

      linkedinService.setAccessToken(accessToken);

      let fieldMapping: Record<string, string> = {};
      if (integrationId) {
        const integration = await prisma.linkedInIntegration.findFirst({
          where: { id: integrationId, organizationId: req.organizationId },
        });
        if (integration?.fieldMapping) {
          fieldMapping = integration.fieldMapping as Record<string, string>;
        }
      }

      const leads = await linkedinService.syncFormLeads(
        formId,
        req.organizationId!,
        fieldMapping
      );

      if (integrationId) {
        await prisma.linkedInIntegration.update({
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

export default router;
