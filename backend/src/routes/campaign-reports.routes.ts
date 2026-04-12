/**
 * Campaign/Source Reports Routes
 * Tenant-scoped lead source and campaign analytics endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { campaignReportsService } from '../services/campaign-reports.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const filterValidation = [
  ...dateRangeValidation,
  query('sourceId').optional().isUUID(),
  query('campaignId').optional().isUUID(),
  query('branchId').optional().isUUID(),
];

function parseFilters(req: TenantRequest) {
  const { startDate, endDate, sourceId, campaignId, branchId } = req.query;

  let dateRange;
  if (startDate && endDate) {
    const start = new Date(startDate as string);
    const end = new Date(endDate as string);
    // Include the full end day
    end.setHours(23, 59, 59, 999);
    dateRange = { start, end };
  }

  return {
    organizationId: req.organizationId!,
    dateRange,
    sourceId: sourceId as string | undefined,
    campaignId: campaignId as string | undefined,
    branchId: branchId as string | undefined,
  };
}

// GET /campaign-reports/source-leads
router.get('/source-leads', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await campaignReportsService.getSourceLeadCount(parseFilters(req));
    return ApiResponse.success(res, { sourceLeads: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/source-cost
router.get('/source-cost', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await campaignReportsService.getSourceCost(parseFilters(req));
    return ApiResponse.success(res, { sourceCost: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/source-conversion
router.get('/source-conversion', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await campaignReportsService.getSourceConversion(parseFilters(req));
    return ApiResponse.success(res, { sourceConversion: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/campaign-roi
router.get('/campaign-roi', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await campaignReportsService.getCampaignROI(parseFilters(req));
    return ApiResponse.success(res, { campaignROI: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/branch-source
router.get('/branch-source', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const data = await campaignReportsService.getBranchSourceReport(parseFilters(req));
    return ApiResponse.success(res, { branchSource: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/trends
router.get('/trends', validate([
  ...filterValidation,
  query('interval').optional().isIn(['day', 'week', 'month']),
]), async (req: TenantRequest, res: Response) => {
  try {
    const interval = (req.query.interval as 'day' | 'week' | 'month') || 'week';
    const data = await campaignReportsService.getSourceTrends(parseFilters(req), interval);
    return ApiResponse.success(res, { trends: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/campaign-leads
router.get('/campaign-leads', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const report = await campaignReportsService.getCampaignLeadStats(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/campaign-stages
router.get('/campaign-stages', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const report = await campaignReportsService.getCampaignStageStats(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/campaign-deals
router.get('/campaign-deals', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const report = await campaignReportsService.getCampaignDealStats(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /campaign-reports/comprehensive
router.get('/comprehensive', validate(filterValidation), async (req: TenantRequest, res: Response) => {
  try {
    const report = await campaignReportsService.getComprehensiveReport(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
