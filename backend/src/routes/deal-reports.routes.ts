/**
 * Deal Reports Routes
 * Tenant-scoped deal reporting endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { dealReportsService } from '../services/deal-reports.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common validation
const filterValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate } = req.query;

  return {
    organizationId: req.organizationId!,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    userRole: req.user?.roleSlug,
    userId: req.user?.id,
  };
}

/**
 * GET /deal-reports/summary
 * Get deal summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await dealReportsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[DealReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /deal-reports/users
 * Get user deal statistics
 */
router.get(
  '/users',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const users = await dealReportsService.getUserStats(filters);
      return ApiResponse.success(res, { users, count: users.length });
    } catch (error: any) {
      console.error('[DealReports] Users error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /deal-reports/comprehensive
 * Get all deal reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await dealReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[DealReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /deal-reports/velocity
 * Get deal velocity metrics - stage analysis, bottlenecks, stalled deals
 * Uses Lead Stages (works for all industries - Enrolled=WON, Lost=LOST)
 */
router.get(
  '/velocity',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      // Use lead-based velocity report (works for all industries)
      const report = await dealReportsService.getLeadVelocityReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[DealReports] Velocity error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
