import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { leadPrioritySettingsService } from '../services/lead-priority-settings.service';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== LEAD PRIORITY SETTINGS ====================

// GET /api/settings/lead-priority - Get lead priority settings
router.get('/lead-priority', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as TenantRequest).organizationId!;
    const settings = await leadPrioritySettingsService.getLeadPrioritySettings(organizationId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/lead-priority - Update lead priority settings (admin only)
router.put(
  '/lead-priority',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    body('autoScoringEnabled').optional().isBoolean(),
    body('recalculateOnUpdate').optional().isBoolean(),
    body('escalationEnabled').optional().isBoolean(),
    body('escalationThreshold').optional().isInt({ min: 1, max: 168 }),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.updateLeadPrioritySettings(organizationId, req.body);
      res.json({ success: true, data: settings, message: 'Lead priority settings updated' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/lead-priority/reset - Reset to defaults
router.post(
  '/lead-priority/reset',
  authorize(['super_admin', 'admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.resetLeadPrioritySettings(organizationId);
      res.json({ success: true, data: settings, message: 'Lead priority settings reset to defaults' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== PRIORITY LEVELS ====================

// GET /api/settings/lead-priority/levels - Get priority levels
router.get('/lead-priority/levels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as TenantRequest).organizationId!;
    const levels = await leadPrioritySettingsService.getPriorityLevels(organizationId);
    res.json({ success: true, data: levels });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/lead-priority/levels - Update all priority levels
router.put(
  '/lead-priority/levels',
  authorize(['super_admin', 'admin']),
  validate([
    body('levels').isArray(),
    body('levels.*.id').isString(),
    body('levels.*.name').isString(),
    body('levels.*.color').isString(),
    body('levels.*.minScore').isInt({ min: 0, max: 100 }),
    body('levels.*.maxScore').isInt({ min: 0, max: 100 }),
    body('levels.*.slaHours').isInt({ min: 1 }),
    body('levels.*.autoAssign').isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.updatePriorityLevels(organizationId, req.body.levels);
      res.json({ success: true, data: settings, message: 'Priority levels updated' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/lead-priority/levels - Add priority level
router.post(
  '/lead-priority/levels',
  authorize(['super_admin', 'admin']),
  validate([
    body('id').isString(),
    body('name').isString(),
    body('color').isString(),
    body('minScore').isInt({ min: 0, max: 100 }),
    body('maxScore').isInt({ min: 0, max: 100 }),
    body('slaHours').isInt({ min: 1 }),
    body('autoAssign').isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.addPriorityLevel(organizationId, req.body);
      res.json({ success: true, data: settings, message: 'Priority level added' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/lead-priority/levels/:levelId - Update single priority level
router.put(
  '/lead-priority/levels/:levelId',
  authorize(['super_admin', 'admin']),
  validate([
    param('levelId').isString(),
    body('name').optional().isString(),
    body('color').optional().isString(),
    body('minScore').optional().isInt({ min: 0, max: 100 }),
    body('maxScore').optional().isInt({ min: 0, max: 100 }),
    body('slaHours').optional().isInt({ min: 1 }),
    body('autoAssign').optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { levelId } = req.params;
      const settings = await leadPrioritySettingsService.updatePriorityLevel(organizationId, levelId, req.body);
      res.json({ success: true, data: settings, message: 'Priority level updated' });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/settings/lead-priority/levels/:levelId - Delete priority level
router.delete(
  '/lead-priority/levels/:levelId',
  authorize(['super_admin', 'admin']),
  validate([param('levelId').isString()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { levelId } = req.params;
      const settings = await leadPrioritySettingsService.deletePriorityLevel(organizationId, levelId);
      res.json({ success: true, data: settings, message: 'Priority level deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== SCORING RULES ====================

// GET /api/settings/lead-priority/rules - Get scoring rules
router.get('/lead-priority/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const organizationId = (req as TenantRequest).organizationId!;
    const rules = await leadPrioritySettingsService.getScoringRules(organizationId);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/lead-priority/rules - Update all scoring rules
router.put(
  '/lead-priority/rules',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    body('rules').isArray(),
    body('rules.*.id').isString(),
    body('rules.*.name').isString(),
    body('rules.*.field').isString(),
    body('rules.*.operator').isString(),
    body('rules.*.value').exists(),
    body('rules.*.points').isInt(),
    body('rules.*.isActive').isBoolean(),
    body('rules.*.order').isInt(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.updateScoringRules(organizationId, req.body.rules);
      res.json({ success: true, data: settings, message: 'Scoring rules updated' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/lead-priority/rules - Add scoring rule
router.post(
  '/lead-priority/rules',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    body('id').isString(),
    body('name').isString(),
    body('field').isString(),
    body('operator').isString(),
    body('value').exists(),
    body('points').isInt(),
    body('isActive').optional().isBoolean(),
    body('order').optional().isInt(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const settings = await leadPrioritySettingsService.addScoringRule(organizationId, req.body);
      res.json({ success: true, data: settings, message: 'Scoring rule added' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/lead-priority/rules/:ruleId - Update single scoring rule
router.put(
  '/lead-priority/rules/:ruleId',
  authorize(['super_admin', 'admin', 'manager']),
  validate([
    param('ruleId').isString(),
    body('name').optional().isString(),
    body('field').optional().isString(),
    body('operator').optional().isString(),
    body('value').optional().exists(),
    body('points').optional().isInt(),
    body('isActive').optional().isBoolean(),
    body('order').optional().isInt(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { ruleId } = req.params;
      const settings = await leadPrioritySettingsService.updateScoringRule(organizationId, ruleId, req.body);
      res.json({ success: true, data: settings, message: 'Scoring rule updated' });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/settings/lead-priority/rules/:ruleId - Delete scoring rule
router.delete(
  '/lead-priority/rules/:ruleId',
  authorize(['super_admin', 'admin', 'manager']),
  validate([param('ruleId').isString()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { ruleId } = req.params;
      const settings = await leadPrioritySettingsService.deleteScoringRule(organizationId, ruleId);
      res.json({ success: true, data: settings, message: 'Scoring rule deleted' });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/settings/lead-priority/rules/:ruleId/toggle - Toggle rule active status
router.patch(
  '/lead-priority/rules/:ruleId/toggle',
  authorize(['super_admin', 'admin', 'manager']),
  validate([param('ruleId').isString()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { ruleId } = req.params;
      const settings = await leadPrioritySettingsService.toggleScoringRule(organizationId, ruleId);
      res.json({ success: true, data: settings, message: 'Scoring rule toggled' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== LEAD SCORING ====================

// POST /api/settings/lead-priority/calculate - Calculate lead score
router.post(
  '/lead-priority/calculate',
  validate([body('leadData').isObject()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const { leadData } = req.body;
      const result = await leadPrioritySettingsService.calculateLeadScore(organizationId, leadData);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/settings/lead-priority/priority-for-score/:score - Get priority level for score
router.get(
  '/lead-priority/priority-for-score/:score',
  validate([param('score').isInt({ min: 0, max: 100 })]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const organizationId = (req as TenantRequest).organizationId!;
      const score = parseInt(req.params.score, 10);
      const priority = await leadPrioritySettingsService.getPriorityForScore(organizationId, score);
      res.json({ success: true, data: priority });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
