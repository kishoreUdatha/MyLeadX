import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { userPreferencesService } from '../services/user-preferences.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    organizationId: string;
    email: string;
    role: string;
  };
}

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== USER PREFERENCES ====================

// GET /api/settings/preferences - Get user preferences
router.get('/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const preferences = await userPreferencesService.getUserPreferences(userId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/preferences - Update user preferences
router.put(
  '/preferences',
  validate([
    body('theme').optional().isIn(['light', 'dark', 'system']),
    body('language').optional().isString(),
    body('timezone').optional().isString(),
    body('dateFormat').optional().isString(),
    body('timeFormat').optional().isIn(['12h', '24h']),
    body('currency').optional().isString(),
    body('fontSize').optional().isIn(['small', 'medium', 'large', 'extra-large']),
    body('highContrast').optional().isBoolean(),
    body('reducedMotion').optional().isBoolean(),
    body('screenReader').optional().isBoolean(),
    body('lineSpacing').optional().isIn(['compact', 'normal', 'relaxed']),
    body('keyboardShortcuts').optional().isBoolean(),
    body('sidebarCollapsed').optional().isBoolean(),
    body('compactMode').optional().isBoolean(),
    body('showWelcome').optional().isBoolean(),
    body('defaultView').optional().isIn(['grid', 'list', 'kanban']),
    body('itemsPerPage').optional().isInt({ min: 10, max: 100 }),
    body('soundEnabled').optional().isBoolean(),
    body('vibrationEnabled').optional().isBoolean(),
    body('desktopNotifications').optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const preferences = await userPreferencesService.updateUserPreferences(userId, req.body);
      res.json({ success: true, data: preferences, message: 'Preferences updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/preferences/reset - Reset preferences to defaults
router.post('/preferences/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const preferences = await userPreferencesService.resetUserPreferences(userId);
    res.json({ success: true, data: preferences, message: 'Preferences reset to defaults' });
  } catch (error) {
    next(error);
  }
});

// ==================== ACCESSIBILITY ====================

// GET /api/settings/accessibility - Get accessibility settings
router.get('/accessibility', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const settings = await userPreferencesService.getAccessibilitySettings(userId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/accessibility - Update accessibility settings
router.put(
  '/accessibility',
  validate([
    body('fontSize').optional().isIn(['small', 'medium', 'large', 'extra-large']),
    body('highContrast').optional().isBoolean(),
    body('reducedMotion').optional().isBoolean(),
    body('screenReader').optional().isBoolean(),
    body('lineSpacing').optional().isIn(['compact', 'normal', 'relaxed']),
    body('keyboardShortcuts').optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const settings = await userPreferencesService.updateAccessibilitySettings(userId, req.body);
      res.json({ success: true, data: settings, message: 'Accessibility settings updated' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== DISPLAY SETTINGS ====================

// GET /api/settings/display - Get display settings
router.get('/display', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const settings = await userPreferencesService.getDisplaySettings(userId);
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/display - Update display settings
router.put(
  '/display',
  validate([
    body('theme').optional().isIn(['light', 'dark', 'system']),
    body('language').optional().isString(),
    body('timezone').optional().isString(),
    body('dateFormat').optional().isString(),
    body('timeFormat').optional().isIn(['12h', '24h']),
    body('currency').optional().isString(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const settings = await userPreferencesService.updateDisplaySettings(userId, req.body);
      res.json({ success: true, data: settings, message: 'Display settings updated' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
