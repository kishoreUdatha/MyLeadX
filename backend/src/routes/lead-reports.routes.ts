/**
 * Lead Reports Routes
 * Tenant-scoped lead reporting endpoints
 *
 * SECURITY: All reports are filtered by organizationId from JWT token
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadReportsService } from '../services/lead-reports.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common date range validation
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

// Common filter validation
const filterValidation = [
  ...dateRangeValidation,
  query('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  query('sourceId').optional().isUUID().withMessage('Invalid source ID'),
  query('stageId').optional().isUUID().withMessage('Invalid stage ID'),
  query('assignedToId').optional().isUUID().withMessage('Invalid assignee ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, branchId, sourceId, stageId, assignedToId } = req.query;

  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    branchId: branchId as string | undefined,
    sourceId: sourceId as string | undefined,
    stageId: stageId as string | undefined,
    assignedToId: assignedToId as string | undefined,
    userRole: req.user?.roleSlug,
    userId: req.user?.id,
  };
}

/**
 * GET /lead-reports/summary
 * Get lead summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await leadReportsService.getTotalLeads(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[LeadReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/by-source
 * Get leads grouped by source
 */
router.get(
  '/by-source',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getLeadsBySource(filters);
      return ApiResponse.success(res, { bySource: data });
    } catch (error: any) {
      console.error('[LeadReports] By source error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/by-stage
 * Get leads grouped by pipeline stage
 */
router.get(
  '/by-stage',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getLeadsByStage(filters);
      return ApiResponse.success(res, { byStage: data });
    } catch (error: any) {
      console.error('[LeadReports] By stage error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/by-counselor
 * Get leads grouped by counselor/assignee
 */
router.get(
  '/by-counselor',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getLeadsByCounselor(filters);
      return ApiResponse.success(res, { byCounselor: data });
    } catch (error: any) {
      console.error('[LeadReports] By counselor error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/by-branch
 * Get leads grouped by branch
 */
router.get(
  '/by-branch',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getLeadsByBranch(filters);
      return ApiResponse.success(res, { byBranch: data });
    } catch (error: any) {
      console.error('[LeadReports] By branch error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/trend
 * Get lead trends over time
 */
router.get(
  '/trend',
  validate([
    ...filterValidation,
    query('interval').optional().isIn(['day', 'week', 'month']).withMessage('Invalid interval'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const interval = (req.query.interval as 'day' | 'week' | 'month') || 'day';
      const data = await leadReportsService.getLeadsTrend(filters, interval);
      return ApiResponse.success(res, { trend: data });
    } catch (error: any) {
      console.error('[LeadReports] Trend error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/new-vs-old
 * Get new vs old leads comparison
 */
router.get(
  '/new-vs-old',
  validate([
    ...filterValidation,
    query('daysThreshold').optional().isInt({ min: 1, max: 365 }).withMessage('Invalid threshold'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const daysThreshold = parseInt(req.query.daysThreshold as string) || 30;
      const data = await leadReportsService.getNewVsOldLeads(filters, daysThreshold);
      return ApiResponse.success(res, { newVsOld: data });
    } catch (error: any) {
      console.error('[LeadReports] New vs old error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/unassigned
 * Get unassigned leads report
 */
router.get(
  '/unassigned',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getUnassignedLeads(filters);
      return ApiResponse.success(res, { unassigned: data });
    } catch (error: any) {
      console.error('[LeadReports] Unassigned error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/stale
 * Get stale leads report
 */
router.get(
  '/stale',
  validate([
    ...filterValidation,
    query('staleDays').optional().isInt({ min: 1, max: 90 }).withMessage('Invalid stale days'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const staleDays = parseInt(req.query.staleDays as string) || 7;
      const data = await leadReportsService.getStaleLeads(filters, staleDays);
      return ApiResponse.success(res, { stale: data });
    } catch (error: any) {
      console.error('[LeadReports] Stale error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/by-user-stage
 * Get lead stage distribution by user
 */
router.get(
  '/by-user-stage',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getUserStageReport(filters);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[LeadReports] User stage error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /lead-reports/comprehensive
 * Get all lead reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await leadReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report: data });
    } catch (error: any) {
      console.error('[LeadReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
