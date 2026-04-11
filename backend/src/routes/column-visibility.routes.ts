import { Router, Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { validate } from '../middlewares/validate';
import { columnVisibilityService } from '../services/column-visibility.service';

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

// ==================== COLUMN VISIBILITY ====================

// GET /api/settings/columns - Get all column visibility settings
router.get('/columns', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const columns = await columnVisibilityService.getAllColumnVisibility(userId);
    res.json({ success: true, data: columns });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/columns/:tableName - Get column visibility for specific table
router.get(
  '/columns/:tableName',
  validate([param('tableName').isString().notEmpty()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { tableName } = req.params;
      const columns = await columnVisibilityService.getColumnVisibility(userId, tableName);
      res.json({ success: true, data: columns });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/settings/columns/:tableName - Update column visibility for table
router.put(
  '/columns/:tableName',
  validate([
    param('tableName').isString().notEmpty(),
    body('columns').optional().isArray(),
    body('columns.*.key').optional().isString(),
    body('columns.*.label').optional().isString(),
    body('columns.*.visible').optional().isBoolean(),
    body('columns.*.order').optional().isInt(),
    body('columns.*.width').optional().isInt(),
    body('sortColumn').optional().isString(),
    body('sortDirection').optional().isIn(['asc', 'desc']),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { tableName } = req.params;
      const columns = await columnVisibilityService.updateColumnVisibility(userId, tableName, req.body);
      res.json({ success: true, data: columns, message: 'Column settings updated' });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/settings/columns/:tableName/toggle - Toggle single column visibility
router.patch(
  '/columns/:tableName/toggle',
  validate([
    param('tableName').isString().notEmpty(),
    body('columnKey').isString().notEmpty(),
    body('visible').isBoolean(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { tableName } = req.params;
      const { columnKey, visible } = req.body;
      const columns = await columnVisibilityService.toggleColumnVisibility(userId, tableName, columnKey, visible);
      res.json({ success: true, data: columns, message: 'Column visibility toggled' });
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/settings/columns/:tableName/reorder - Reorder columns
router.patch(
  '/columns/:tableName/reorder',
  validate([
    param('tableName').isString().notEmpty(),
    body('columnOrders').isArray(),
    body('columnOrders.*.key').isString(),
    body('columnOrders.*.order').isInt(),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { tableName } = req.params;
      const { columnOrders } = req.body;
      const columns = await columnVisibilityService.reorderColumns(userId, tableName, columnOrders);
      res.json({ success: true, data: columns, message: 'Columns reordered' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/columns/:tableName/reset - Reset column visibility to defaults
router.post(
  '/columns/:tableName/reset',
  validate([param('tableName').isString().notEmpty()]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as AuthenticatedRequest).user!.id;
      const { tableName } = req.params;
      const columns = await columnVisibilityService.resetColumnVisibility(userId, tableName);
      res.json({ success: true, data: columns, message: 'Column settings reset to defaults' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/columns/reset-all - Reset all column visibility to defaults
router.post('/columns/reset-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthenticatedRequest).user!.id;
    const columns = await columnVisibilityService.resetAllColumnVisibility(userId);
    res.json({ success: true, data: columns, message: 'All column settings reset to defaults' });
  } catch (error) {
    next(error);
  }
});

// GET /api/settings/columns/defaults - Get default column configurations
router.get('/columns/defaults', async (_req: Request, res: Response) => {
  res.json({ success: true, data: columnVisibilityService.DEFAULT_COLUMNS });
});

export default router;
