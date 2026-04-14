/**
 * Follow-up Reports Routes
 * Tenant-scoped follow-up reporting endpoints
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { followUpReportsService } from '../services/followup-reports.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common validation
const dateRangeValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

const filterValidation = [
  ...dateRangeValidation,
  query('assigneeId').optional().isUUID().withMessage('Invalid assignee ID'),
  query('branchId').optional().isUUID().withMessage('Invalid branch ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, assigneeId, branchId } = req.query;

  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    assigneeId: assigneeId as string | undefined,
    branchId: branchId as string | undefined,
    userRole: req.user?.roleSlug,
    userId: req.user?.id,
  };
}

/**
 * GET /followup-reports/summary
 * Get follow-up summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await followUpReportsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[FollowUpReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/pending
 * Get pending follow-ups
 */
router.get(
  '/pending',
  validate([
    ...filterValidation,
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const pending = await followUpReportsService.getPendingFollowUps(filters, limit);
      return ApiResponse.success(res, { pending, count: pending.length });
    } catch (error: any) {
      console.error('[FollowUpReports] Pending error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/overdue
 * Get overdue follow-ups
 */
router.get(
  '/overdue',
  validate([
    ...filterValidation,
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const overdue = await followUpReportsService.getOverdueFollowUps(filters, limit);
      return ApiResponse.success(res, { overdue, count: overdue.length });
    } catch (error: any) {
      console.error('[FollowUpReports] Overdue error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/completed
 * Get completed follow-ups
 */
router.get(
  '/completed',
  validate([
    ...filterValidation,
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Invalid limit'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const data = await followUpReportsService.getCompletedFollowUps(filters, limit);
      return ApiResponse.success(res, data);
    } catch (error: any) {
      console.error('[FollowUpReports] Completed error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/by-employee
 * Get follow-ups grouped by employee
 */
router.get(
  '/by-employee',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const byEmployee = await followUpReportsService.getFollowUpsByEmployee(filters);
      return ApiResponse.success(res, { byEmployee });
    } catch (error: any) {
      console.error('[FollowUpReports] By employee error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/schedule
 * Get next follow-up schedule (today, tomorrow, this week)
 */
router.get(
  '/schedule',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const schedule = await followUpReportsService.getNextFollowUpSchedule(filters);
      return ApiResponse.success(res, { schedule });
    } catch (error: any) {
      console.error('[FollowUpReports] Schedule error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/no-response
 * Get leads with no response after multiple follow-ups
 */
router.get(
  '/no-response',
  [
    ...filterValidation,
    query('minFollowUps').optional().isInt({ min: 1, max: 20 }).withMessage('Invalid minFollowUps'),
  ],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const minFollowUps = parseInt(req.query.minFollowUps as string) || 3;
      const noResponse = await followUpReportsService.getNoResponseLeads(filters, minFollowUps);
      return ApiResponse.success(res, { noResponse, count: noResponse.length });
    } catch (error: any) {
      console.error('[FollowUpReports] No response error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /followup-reports/comprehensive
 * Get all follow-up reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await followUpReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[FollowUpReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
