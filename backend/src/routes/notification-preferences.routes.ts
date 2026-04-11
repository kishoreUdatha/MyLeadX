import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { notificationPreferencesService } from '../services/notification-preferences.service';

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

// ==================== NOTIFICATION PREFERENCES ====================

// GET /api/settings/notifications - Get notification preferences
router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const preferences = await notificationPreferencesService.getNotificationPreferences(userId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications - Update notification preferences
router.put(
  '/notifications',
  validate([
    body('emailEnabled').optional().isBoolean(),
    body('pushEnabled').optional().isBoolean(),
    body('smsEnabled').optional().isBoolean(),
    body('inAppEnabled').optional().isBoolean(),
    body('categoryPreferences').optional().isObject(),
    body('quietHoursEnabled').optional().isBoolean(),
    body('quietHoursStart').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('quietHoursEnd').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('digestEnabled').optional().isBoolean(),
    body('digestFrequency').optional().isIn(['daily', 'weekly']),
    body('digestTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('soundEnabled').optional().isBoolean(),
    body('vibrationEnabled').optional().isBoolean(),
    body('showPreview').optional().isBoolean(),
    body('timezone').optional().isString(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const preferences = await notificationPreferencesService.updateNotificationPreferences(userId, req.body);
      res.json({ success: true, data: preferences, message: 'Notification preferences updated' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/notifications/reset - Reset to defaults
router.post('/notifications/reset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const preferences = await notificationPreferencesService.resetNotificationPreferences(userId);
    res.json({ success: true, data: preferences, message: 'Notification preferences reset to defaults' });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/notifications/categories - Get available notification categories
router.get('/notifications/categories', async (_req: Request, res: Response) => {
  const categories = notificationPreferencesService.getNotificationCategories();
  res.json({ success: true, data: categories });
});

// ==================== CHANNEL PREFERENCES ====================

// GET /api/settings/notifications/channels - Get channel preferences
router.get('/notifications/channels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const channels = await notificationPreferencesService.getChannelPreferences(userId);
    res.json({ success: true, data: channels });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications/channels/:channel - Update channel preference
router.put(
  '/notifications/channels/:channel',
  validate([
    param('channel').isIn(['email', 'push', 'sms', 'inApp']),
    body('enabled').isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { channel } = req.params;
      const { enabled } = req.body;
      const preferences = await notificationPreferencesService.updateChannelPreference(
        userId,
        channel as 'email' | 'push' | 'sms' | 'inApp',
        enabled
      );
      res.json({ success: true, data: preferences, message: `${channel} notifications ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== CATEGORY PREFERENCES ====================

// GET /api/settings/notifications/categories/preferences - Get category preferences
router.get('/notifications/categories/preferences', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const categories = await notificationPreferencesService.getCategoryPreferences(userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications/categories/:categoryId - Update category preference
router.put(
  '/notifications/categories/:categoryId',
  validate([
    param('categoryId').isString(),
    body('email').optional().isBoolean(),
    body('push').optional().isBoolean(),
    body('inApp').optional().isBoolean(),
    body('sms').optional().isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { categoryId } = req.params;
      const preferences = await notificationPreferencesService.updateCategoryPreference(
        userId,
        categoryId,
        req.body
      );
      res.json({ success: true, data: preferences, message: 'Category preferences updated' });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/notifications/categories/bulk - Bulk update category preferences
router.put(
  '/notifications/categories/bulk',
  validate([body('categories').isObject()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { categories } = req.body;
      const preferences = await notificationPreferencesService.bulkUpdateCategoryPreferences(userId, categories);
      res.json({ success: true, data: preferences, message: 'Category preferences updated' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== QUIET HOURS ====================

// GET /api/settings/notifications/quiet-hours - Get quiet hours settings
router.get('/notifications/quiet-hours', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const quietHours = await notificationPreferencesService.getQuietHours(userId);
    res.json({ success: true, data: quietHours });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications/quiet-hours - Update quiet hours
router.put(
  '/notifications/quiet-hours',
  validate([
    body('enabled').optional().isBoolean(),
    body('start').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    body('end').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const preferences = await notificationPreferencesService.updateQuietHours(userId, req.body);
      res.json({ success: true, data: preferences, message: 'Quiet hours updated' });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== DIGEST SETTINGS ====================

// GET /api/settings/notifications/digest - Get digest settings
router.get('/notifications/digest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const digest = await notificationPreferencesService.getDigestSettings(userId);
    res.json({ success: true, data: digest });
  } catch (error) {
    next(error);
  }
});

// PUT /api/settings/notifications/digest - Update digest settings
router.put(
  '/notifications/digest',
  validate([
    body('enabled').optional().isBoolean(),
    body('frequency').optional().isIn(['daily', 'weekly']),
    body('time').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const preferences = await notificationPreferencesService.updateDigestSettings(userId, req.body);
      res.json({ success: true, data: preferences, message: 'Digest settings updated' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
