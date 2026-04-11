/**
 * Follow-up Configuration Routes
 * API endpoints for managing follow-up settings
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { followUpConfigService } from '../services/follow-up-config.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createConfigValidation = [
  body('name').trim().notEmpty().withMessage('Config name is required'),
  body('slug').optional().trim().matches(/^[a-z0-9_]+$/).withMessage('Slug must be lowercase alphanumeric with underscores'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('defaultIntervalHours').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1 hour'),
  body('maxAttempts').optional().isInt({ min: 1, max: 20 }).withMessage('Max attempts must be between 1 and 20'),
  body('escalationAfterHours').optional({ nullable: true }).isInt({ min: 1 }),
  body('reminderEnabled').optional().isBoolean(),
  body('reminderBeforeMinutes').optional().isInt({ min: 5, max: 1440 }),
  body('autoMoveToStageId').optional({ nullable: true }).isUUID(),
  body('autoAssignToManagerId').optional({ nullable: true }).isUUID(),
  body('priorityAfterAttempts').optional({ nullable: true }).isInt({ min: 1 }),
  body('isDefault').optional().isBoolean(),
  body('order').optional().isInt({ min: 0 }),
];

const updateConfigValidation = [
  param('id').isUUID().withMessage('Invalid config ID'),
  body('name').optional().trim().notEmpty().withMessage('Config name cannot be empty'),
  body('description').optional().trim().isLength({ max: 500 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('defaultIntervalHours').optional().isInt({ min: 1 }).withMessage('Interval must be at least 1 hour'),
  body('maxAttempts').optional().isInt({ min: 1, max: 20 }).withMessage('Max attempts must be between 1 and 20'),
  body('escalationAfterHours').optional({ nullable: true }).isInt({ min: 1 }),
  body('reminderEnabled').optional().isBoolean(),
  body('reminderBeforeMinutes').optional().isInt({ min: 5, max: 1440 }),
  body('autoMoveToStageId').optional({ nullable: true }).isUUID(),
  body('autoAssignToManagerId').optional({ nullable: true }).isUUID(),
  body('priorityAfterAttempts').optional({ nullable: true }).isInt({ min: 1 }),
  body('isActive').optional().isBoolean(),
  body('isDefault').optional().isBoolean(),
  body('order').optional().isInt({ min: 0 }),
];

/**
 * GET /api/follow-up-config
 * Get all follow-up configurations
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const configs = await followUpConfigService.getAll(req.organizationId!, includeInactive);
    return ApiResponse.success(res, 'Follow-up configurations retrieved', { configs });
  } catch (error: any) {
    console.error('Error fetching follow-up configs:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch follow-up configurations', 500);
  }
});

/**
 * GET /api/follow-up-config/default
 * Get the default follow-up configuration
 */
router.get('/default', async (req: TenantRequest, res: Response) => {
  try {
    const config = await followUpConfigService.getDefault(req.organizationId!);
    return ApiResponse.success(res, 'Default follow-up configuration retrieved', { config });
  } catch (error: any) {
    console.error('Error fetching default follow-up config:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch default configuration', 500);
  }
});

/**
 * GET /api/follow-up-config/managers
 * Get available managers for escalation
 */
router.get('/managers', async (req: TenantRequest, res: Response) => {
  try {
    const managers = await followUpConfigService.getAvailableManagers(req.organizationId!);
    return ApiResponse.success(res, 'Available managers retrieved', { managers });
  } catch (error: any) {
    console.error('Error fetching managers:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch managers', 500);
  }
});

/**
 * GET /api/follow-up-config/stages
 * Get available stages for auto-move
 */
router.get('/stages', async (req: TenantRequest, res: Response) => {
  try {
    const stages = await followUpConfigService.getAvailableStages(req.organizationId!);
    return ApiResponse.success(res, 'Available stages retrieved', { stages });
  } catch (error: any) {
    console.error('Error fetching stages:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch stages', 500);
  }
});

/**
 * GET /api/follow-up-config/:id
 * Get a single follow-up configuration
 */
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid config ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const config = await followUpConfigService.getById(req.params.id, req.organizationId!);
      if (!config) {
        return ApiResponse.error(res, 'Follow-up configuration not found', 404);
      }
      return ApiResponse.success(res, 'Follow-up configuration retrieved', { config });
    } catch (error: any) {
      console.error('Error fetching follow-up config:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch configuration', 500);
    }
  }
);

/**
 * POST /api/follow-up-config
 * Create a follow-up configuration
 * Admin only
 */
router.post(
  '/',
  authorize('admin'),
  validate(createConfigValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const config = await followUpConfigService.create(req.organizationId!, req.body);
      return ApiResponse.success(res, 'Follow-up configuration created successfully', { config }, 201);
    } catch (error: any) {
      console.error('Error creating follow-up config:', error);
      return ApiResponse.error(res, error.message || 'Failed to create configuration', 400);
    }
  }
);

/**
 * PUT /api/follow-up-config/:id
 * Update a follow-up configuration
 * Admin only
 */
router.put(
  '/:id',
  authorize('admin'),
  validate(updateConfigValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const config = await followUpConfigService.update(req.params.id, req.organizationId!, req.body);
      return ApiResponse.success(res, 'Follow-up configuration updated successfully', { config });
    } catch (error: any) {
      console.error('Error updating follow-up config:', error);
      return ApiResponse.error(res, error.message || 'Failed to update configuration', 400);
    }
  }
);

/**
 * DELETE /api/follow-up-config/:id
 * Delete a follow-up configuration (soft delete)
 * Admin only
 */
router.delete(
  '/:id',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid config ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      await followUpConfigService.delete(req.params.id, req.organizationId!);
      return ApiResponse.success(res, 'Follow-up configuration deleted successfully');
    } catch (error: any) {
      console.error('Error deleting follow-up config:', error);
      return ApiResponse.error(res, error.message || 'Failed to delete configuration', 400);
    }
  }
);

/**
 * POST /api/follow-up-config/:id/set-default
 * Set a configuration as default
 * Admin only
 */
router.post(
  '/:id/set-default',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid config ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const config = await followUpConfigService.setDefault(req.params.id, req.organizationId!);
      return ApiResponse.success(res, 'Default configuration updated successfully', { config });
    } catch (error: any) {
      console.error('Error setting default config:', error);
      return ApiResponse.error(res, error.message || 'Failed to set default configuration', 400);
    }
  }
);

/**
 * POST /api/follow-up-config/initialize
 * Initialize default follow-up configurations
 * Admin only
 */
router.post(
  '/initialize',
  authorize('admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const configs = await followUpConfigService.initializeDefaults(req.organizationId!);
      return ApiResponse.success(res, 'Follow-up configurations initialized successfully', { configs });
    } catch (error: any) {
      console.error('Error initializing follow-up configs:', error);
      return ApiResponse.error(res, error.message || 'Failed to initialize configurations', 500);
    }
  }
);

export default router;
