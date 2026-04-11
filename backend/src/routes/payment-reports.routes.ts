/**
 * Payment Reports Routes
 * Tenant-scoped payment/revenue reporting endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { paymentReportsService } from '../services/payment-reports.service';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const dateRangeValidation = [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
];

const filterValidation = [
  ...dateRangeValidation,
  query('branchId').optional().isUUID(),
  query('courseId').optional().isUUID(),
  query('paymentMethod').optional().isString(),
];

function parseFilters(req: TenantRequest) {
  const { startDate, endDate, branchId, courseId, paymentMethod } = req.query;
  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    branchId: branchId as string | undefined,
    courseId: courseId as string | undefined,
    paymentMethod: paymentMethod as string | undefined,
  };
}

// GET /payment-reports/summary
router.get('/summary', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const summary = await paymentReportsService.getRevenueSummary(parseFilters(req));
    return ApiResponse.success(res, { summary });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/by-period
router.get('/by-period', [
  ...filterValidation,
  query('interval').optional().isIn(['day', 'week', 'month']),
], validate, async (req: TenantRequest, res: Response) => {
  try {
    const interval = (req.query.interval as 'day' | 'week' | 'month') || 'day';
    const data = await paymentReportsService.getRevenueByPeriod(parseFilters(req), interval);
    return ApiResponse.success(res, { byPeriod: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/by-category
router.get('/by-category', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await paymentReportsService.getRevenueByCategory(parseFilters(req));
    return ApiResponse.success(res, { byCategory: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/by-method
router.get('/by-method', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await paymentReportsService.getPaymentMethodBreakdown(parseFilters(req));
    return ApiResponse.success(res, { byMethod: data });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/pending
router.get('/pending', [
  ...filterValidation,
  query('limit').optional().isInt({ min: 1, max: 100 }),
], validate, async (req: TenantRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await paymentReportsService.getPendingPayments(parseFilters(req), limit);
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/collectors
router.get('/collectors', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const collectors = await paymentReportsService.getCollectorPerformance(parseFilters(req));
    return ApiResponse.success(res, { collectors });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/refunds
router.get('/refunds', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const data = await paymentReportsService.getRefundsReport(parseFilters(req));
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

// GET /payment-reports/comprehensive
router.get('/comprehensive', filterValidation, validate, async (req: TenantRequest, res: Response) => {
  try {
    const report = await paymentReportsService.getComprehensiveReport(parseFilters(req));
    return ApiResponse.success(res, { report });
  } catch (error: any) {
    return ApiResponse.error(res, error.message, 500);
  }
});

export default router;
