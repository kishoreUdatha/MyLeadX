/**
 * Audit & Activity Reports Routes
 * Tenant-scoped audit logs and security tracking endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { auditReportsService } from '../services/audit-reports.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const filterValidation = [
  ...dateRangeValidation,
  query('userId').optional().isUUID(),
  query('action').optional().isString(),
  query('entityType').optional().isString(),
];

function parseFilters(req: TenantRequest) {
  const { startDate, endDate, userId, action, entityType } = req.query;
  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    userId: userId as string | undefined,
    action: action as string | undefined,
    entityType: entityType as string | undefined,
  };
}

// GET /audit-reports/summary
router.get('/summary', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const summary = await auditReportsService.getAuditSummary(parseFilters(req));
    return ApiResponse.success(res, { summary });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/lead-edits
router.get('/lead-edits', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await auditReportsService.getLeadEditLogs(parseFilters(req), limit);
    return ApiResponse.success(res, { leadEdits: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/payment-deletes
router.get('/payment-deletes', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await auditReportsService.getPaymentDeleteLogs(parseFilters(req), limit);
    return ApiResponse.success(res, { paymentDeletes: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/data-exports
router.get('/data-exports', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await auditReportsService.getDataExportLogs(parseFilters(req), limit);
    return ApiResponse.success(res, { dataExports: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/stage-changes
router.get('/stage-changes', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await auditReportsService.getStageChangeLogs(parseFilters(req), limit);
    return ApiResponse.success(res, { stageChanges: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/login-history
router.get('/login-history', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const data = await auditReportsService.getLoginHistory(parseFilters(req), limit);
    return ApiResponse.success(res, { loginHistory: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/failed-logins
router.get('/failed-logins', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await auditReportsService.getFailedLoginAttempts(parseFilters(req));
    return ApiResponse.success(res, { failedLogins: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/security-alerts
router.get('/security-alerts', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await auditReportsService.getSecurityAlerts(parseFilters(req));
    return ApiResponse.success(res, { securityAlerts: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/activity-by-entity
router.get('/activity-by-entity', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await auditReportsService.getActivityByEntityType(parseFilters(req));
    return ApiResponse.success(res, { activityByEntity: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /audit-reports/comprehensive
router.get('/comprehensive', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const report = await auditReportsService.getComprehensiveReport(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
