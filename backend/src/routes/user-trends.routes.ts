/**
 * User Trends Routes
 * Tenant-scoped user metrics endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { userTrendsService } from '../services/user-trends.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common validation
const filterValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('userId').optional().isUUID().withMessage('Invalid user ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, userId } = req.query;

  return {
    organizationId: req.organizationId!,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    userId: userId as string | undefined,
  };
}

/**
 * GET /user-trends/summary
 * Get summary metrics with comparison to previous period
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await userTrendsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[UserTrends] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/calls-per-user
 * Get calls data per user
 */
router.get(
  '/calls-per-user',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await userTrendsService.getCallsPerUser(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[UserTrends] CallsPerUser error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/duration-per-user
 * Get call duration per user
 */
router.get(
  '/duration-per-user',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await userTrendsService.getDurationPerUser(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[UserTrends] DurationPerUser error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/leads-closed-converted
 * Get leads closed vs converted per user
 */
router.get(
  '/leads-closed-converted',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await userTrendsService.getLeadsClosedConvertedPerUser(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[UserTrends] LeadsClosedConverted error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/lost-leads
 * Get lost leads per user
 */
router.get(
  '/lost-leads',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await userTrendsService.getLostLeadsPerUser(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[UserTrends] LostLeads error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/breaks-per-user
 * Get break time and count per user
 */
router.get(
  '/breaks-per-user',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await userTrendsService.getBreaksPerUser(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[UserTrends] BreaksPerUser error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/users
 * Get users list for filter dropdown
 */
router.get(
  '/users',
  async (req: TenantRequest, res: Response) => {
    try {
      const users = await userTrendsService.getUsers(req.organizationId!);
      return ApiResponse.success(res, { users });
    } catch (error: any) {
      console.error('[UserTrends] Users error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /user-trends/comprehensive
 * Get all user trends in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await userTrendsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[UserTrends] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
