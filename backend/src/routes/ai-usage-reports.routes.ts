/**
 * AI Usage Reports Routes
 * Tenant-scoped AI voice/chat agent analytics endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { aiUsageReportsService } from '../services/ai-usage-reports.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const filterValidation = [
  ...dateRangeValidation,
  query('agentId').optional().isUUID(),
];

function parseFilters(req: TenantRequest) {
  const { startDate, endDate, agentId } = req.query;
  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    agentId: agentId as string | undefined,
  };
}

// GET /ai-usage-reports/summary
router.get('/summary', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const summary = await aiUsageReportsService.getAIUsageSummary(parseFilters(req));
    return ApiResponse.success(res, { summary });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/calls
router.get('/calls', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAICallsReport(parseFilters(req));
    return ApiResponse.success(res, { calls: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/minutes
router.get('/minutes', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAIMinutesReport(parseFilters(req));
    return ApiResponse.success(res, { minutes: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/qualified-leads
router.get('/qualified-leads', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAIQualifiedLeads(parseFilters(req));
    return ApiResponse.success(res, { qualifiedLeads: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/transfers
router.get('/transfers', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAITransferReport(parseFilters(req));
    return ApiResponse.success(res, { transfers: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/agent-performance
router.get('/agent-performance', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAIAgentPerformance(parseFilters(req));
    return ApiResponse.success(res, { agentPerformance: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/script-performance
router.get('/script-performance', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getAIScriptPerformance(parseFilters(req));
    return ApiResponse.success(res, { scriptPerformance: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/token-usage
router.get('/token-usage', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await aiUsageReportsService.getTokenUsageSummary(parseFilters(req));
    return ApiResponse.success(res, { tokenUsage: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /ai-usage-reports/comprehensive
router.get('/comprehensive', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const report = await aiUsageReportsService.getComprehensiveReport(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
