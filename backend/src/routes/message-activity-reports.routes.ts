/**
 * Message Activity Reports Routes
 * Tenant-scoped messaging activity reporting endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { messageActivityReportsService } from '../services/message-activity-reports.service';

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
 * GET /message-activity-reports/summary
 * Get message activity summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await messageActivityReportsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[MessageActivityReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /message-activity-reports/users
 * Get user message statistics
 */
router.get(
  '/users',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const users = await messageActivityReportsService.getUserStats(filters);
      return ApiResponse.success(res, { users, count: users.length });
    } catch (error: any) {
      console.error('[MessageActivityReports] Users error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /message-activity-reports/comprehensive
 * Get all message activity reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await messageActivityReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[MessageActivityReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
