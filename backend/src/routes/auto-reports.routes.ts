import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { autoReportsService } from '../services/auto-reports.service';

interface AuthenticatedRequest extends TenantRequest {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== AUTO REPORT SCHEDULES ====================

// GET /api/settings/auto-reports - Get all auto report schedules
router.get('/auto-reports', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as TenantRequest).organizationId!;
    const schedules = await autoReportsService.getAutoReportSchedules(organizationId);
    res.json({ success: true, data: schedules });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/auto-reports/types - Get available report types
router.get('/auto-reports/types', async (_req: Request, res: Response) => {
  const types = autoReportsService.getAvailableReportTypes();
  res.json({ success: true, data: types });
});

// GET /api/settings/auto-reports/:id - Get single schedule
router.get(
  '/auto-reports/:id',
  validate([param('id').isUUID()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { id } = req.params;
      const schedule = await autoReportsService.getAutoReportSchedule(id, organizationId);
      if (!schedule) {
        return res.status(404).json({ success: false, message: 'Schedule not found' });
      }
      res.json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/auto-reports - Create auto report schedule
router.post(
  '/auto-reports',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('reportType').isString().notEmpty().withMessage('Report type is required'),
    body('frequency').isIn(['daily', 'weekly', 'monthly']).withMessage('Invalid frequency'),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('dayOfMonth').optional().isInt({ min: 1, max: 31 }),
    body('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
    body('timezone').optional().isString(),
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('recipients.*').isEmail().withMessage('Invalid email address'),
    body('format').optional().isIn(['pdf', 'excel', 'csv']),
    body('filters').optional().isObject(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const userId = (req as AuthenticatedRequest).user!.id;

      // Validate schedule data
      const validation = autoReportsService.validateScheduleData(req.body);
      if (!validation.valid) {
        return res.status(400).json({ success: false, message: validation.error });
      }

      const schedule = await autoReportsService.createAutoReportSchedule(
        organizationId,
        userId,
        req.body
      );
      res.status(201).json({ success: true, data: schedule, message: 'Schedule created successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/auto-reports/:id - Update auto report schedule
router.put(
  '/auto-reports/:id',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    param('id').isUUID(),
    body('name').optional().trim().notEmpty(),
    body('reportType').optional().isString(),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly']),
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }),
    body('dayOfMonth').optional().isInt({ min: 1, max: 31 }),
    body('time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('timezone').optional().isString(),
    body('recipients').optional().isArray({ min: 1 }),
    body('recipients.*').optional().isEmail(),
    body('format').optional().isIn(['pdf', 'excel', 'csv']),
    body('filters').optional().isObject(),
    body('isActive').optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { id } = req.params;

      // Validate schedule data if frequency-related fields are updated
      if (req.body.frequency || req.body.dayOfWeek !== undefined || req.body.dayOfMonth !== undefined) {
        const current = await autoReportsService.getAutoReportSchedule(id, organizationId);
        if (!current) {
          return res.status(404).json({ success: false, message: 'Schedule not found' });
        }

        const validation = autoReportsService.validateScheduleData({
          frequency: req.body.frequency || current.frequency,
          dayOfWeek: req.body.dayOfWeek ?? current.dayOfWeek ?? undefined,
          dayOfMonth: req.body.dayOfMonth ?? current.dayOfMonth ?? undefined,
        });

        if (!validation.valid) {
          return res.status(400).json({ success: false, message: validation.error });
        }
      }

      const schedule = await autoReportsService.updateAutoReportSchedule(id, organizationId, req.body);
      res.json({ success: true, data: schedule, message: 'Schedule updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/settings/auto-reports/:id - Delete auto report schedule
router.delete(
  '/auto-reports/:id',
  authorize(['super_admin', 'admin', 'manager']),
  validate([param('id').isUUID()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { id } = req.params;
      await autoReportsService.deleteAutoReportSchedule(id, organizationId);
      res.json({ success: true, message: 'Schedule deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/settings/auto-reports/:id/toggle - Toggle schedule active status
router.patch(
  '/auto-reports/:id/toggle',
  authorize(['super_admin', 'admin', 'manager']),
  validate([param('id').isUUID()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { id } = req.params;
      const schedule = await autoReportsService.toggleAutoReportSchedule(id, organizationId);
      res.json({
        success: true,
        data: schedule,
        message: `Schedule ${schedule.isActive ? 'activated' : 'paused'}`,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
