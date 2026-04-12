/**
 * Task Reports Routes
 * Tenant-scoped task reporting endpoints
 */

import { Router, Response } from 'express';
import { query } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { taskReportsService } from '../services/task-reports.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// Common validation
const filterValidation = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date'),
  query('assigneeId').optional().isUUID().withMessage('Invalid assignee ID'),
];

/**
 * Helper: Parse filters from request
 */
function parseFilters(req: TenantRequest) {
  const { startDate, endDate, assigneeId } = req.query;

  return {
    organizationId: req.organizationId!,
    startDate: startDate as string | undefined,
    endDate: endDate as string | undefined,
    assigneeId: assigneeId as string | undefined,
    userRole: req.user?.roleSlug,
    userId: req.user?.id,
  };
}

/**
 * GET /task-reports/summary
 * Get task summary statistics
 */
router.get(
  '/summary',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const summary = await taskReportsService.getSummary(filters);
      return ApiResponse.success(res, { summary });
    } catch (error: any) {
      console.error('[TaskReports] Summary error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /task-reports/tasks
 * Get all tasks with details
 */
router.get(
  '/tasks',
  validate([
    ...filterValidation,
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Invalid limit'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const limit = parseInt(req.query.limit as string) || 100;
      const tasks = await taskReportsService.getTasks(filters, limit);
      return ApiResponse.success(res, { tasks, count: tasks.length });
    } catch (error: any) {
      console.error('[TaskReports] Tasks error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /task-reports/comprehensive
 * Get all task reports in one call
 */
router.get(
  '/comprehensive',
  validate(filterValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const filters = parseFilters(req);
      const report = await taskReportsService.getComprehensiveReport(filters);
      return ApiResponse.success(res, { report });
    } catch (error: any) {
      console.error('[TaskReports] Comprehensive error:', error);
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
