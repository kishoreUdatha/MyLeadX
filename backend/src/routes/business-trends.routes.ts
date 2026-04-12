/**
 * Business Trends Routes
 * Tenant-scoped business metrics endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { businessTrendsService } from '../services/business-trends.service';

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
 * GET /business-trends/summary
 * Get summary cards data (Total SMS, Calls, Converted, etc.)
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await businessTrendsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[BusinessTrends] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/calls-vs-connected
 * Get daily calls vs connected calls for bar chart
 */
router.get(
  '/calls-vs-connected',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getCallsVsConnected(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] CallsVsConnected error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/call-duration
 * Get daily call duration for bar chart
 */
router.get(
  '/call-duration',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getCallDuration(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] CallDuration error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/conversion-ratio
 * Get conversion ratio over time
 */
router.get(
  '/conversion-ratio',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getConversionRatio(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] ConversionRatio error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/leads-added
 * Get daily leads added
 */
router.get(
  '/leads-added',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getLeadsAdded(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] LeadsAdded error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/lead-sources
 * Get lead sources breakdown
 */
router.get(
  '/lead-sources',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getLeadSources(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] LeadSources error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/lost-leads
 * Get daily lost leads
 */
router.get(
  '/lost-leads',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const data = await businessTrendsService.getLostLeads(filters);
      return ApiResponse.success(res, { data });
    } catch (error: any) {
      console.error('[BusinessTrends] LostLeads error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /business-trends/comprehensive
 * Get all business trends in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await businessTrendsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[BusinessTrends] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
