/**
 * Admission Reports Routes
 * Tenant-scoped admission/enrollment reporting endpoints
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { admissionReportsService } from '../services/admission-reports.service';

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
  query('universityId').optional().isUUID().withMessage('Invalid university ID'),
  query('branchId').optional().isUUID().withMessage('Invalid branch ID'),
  query('counselorId').optional().isUUID().withMessage('Invalid counselor ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, universityId, branchId, counselorId } = req.query;

  return {
    organizationId: req.organizationId!,
    dateRange: startDate && endDate
      ? { start: new Date(startDate as string), end: new Date(endDate as string) }
      : undefined,
    universityId: universityId as string | undefined,
    branchId: branchId as string | undefined,
    counselorId: counselorId as string | undefined,
  };
}

/**
 * GET /admission-reports/summary
 * Get admission summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await admissionReportsService.getAdmissionSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[AdmissionReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/by-university
 * Get admissions grouped by university
 */
router.get(
  '/by-university',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const byUniversity = await admissionReportsService.getAdmissionsByUniversity(filters);
      return ApiResponse.success(res, { byUniversity });
    } catch (error: any) {
      console.error('[AdmissionReports] By university error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/by-course
 * Get admissions grouped by course
 */
router.get(
  '/by-course',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const byCourse = await admissionReportsService.getAdmissionsByCourse(filters);
      return ApiResponse.success(res, { byCourse });
    } catch (error: any) {
      console.error('[AdmissionReports] By course error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/by-type
 * Get admissions grouped by type (Donation/Non-Donation/NRI/Scholarship)
 */
router.get(
  '/by-type',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const byType = await admissionReportsService.getAdmissionsByType(filters);
      return ApiResponse.success(res, { byType });
    } catch (error: any) {
      console.error('[AdmissionReports] By type error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/by-status
 * Get admissions grouped by status (pipeline view)
 */
router.get(
  '/by-status',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const byStatus = await admissionReportsService.getAdmissionsByStatus(filters);
      return ApiResponse.success(res, { byStatus });
    } catch (error: any) {
      console.error('[AdmissionReports] By status error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/counselor-performance
 * Get counselor performance metrics
 */
router.get(
  '/counselor-performance',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const counselorPerformance = await admissionReportsService.getCounselorPerformance(filters);
      return ApiResponse.success(res, { counselorPerformance });
    } catch (error: any) {
      console.error('[AdmissionReports] Counselor performance error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/trends
 * Get admission trends over time
 */
router.get(
  '/trends',
  validate([
    ...filterValidation,
    query('interval').optional().isIn(['day', 'week', 'month']).withMessage('Invalid interval'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const interval = (req.query.interval as 'day' | 'week' | 'month') || 'month';
      const trends = await admissionReportsService.getAdmissionTrends(filters, interval);
      return ApiResponse.success(res, { trends });
    } catch (error: any) {
      console.error('[AdmissionReports] Trends error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/commission
 * Get commission summary
 */
router.get(
  '/commission',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const commission = await admissionReportsService.getCommissionSummary(filters);
      return ApiResponse.success(res, { commission });
    } catch (error: any) {
      console.error('[AdmissionReports] Commission error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/year-over-year
 * Get year-over-year comparison
 */
router.get(
  '/year-over-year',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const yearOverYear = await admissionReportsService.getYearOverYearComparison(filters);
      return ApiResponse.success(res, { yearOverYear });
    } catch (error: any) {
      console.error('[AdmissionReports] Year-over-year error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /admission-reports/comprehensive
 * Get all admission reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await admissionReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[AdmissionReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
