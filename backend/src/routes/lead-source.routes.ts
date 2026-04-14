/**
 * Lead Source Routes
 * API endpoints for managing custom lead sources
 */

import { Router, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { leadSourceService } from '../services/lead-source.service';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createSourceValidation = [
  body('name').trim().notEmpty().withMessage('Source name is required'),
  body('slug').optional().trim().matches(/^[a-z0-9_]+$/).withMessage('Slug must be lowercase alphanumeric with underscores'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('icon').optional().trim(),
  body('description').optional().trim().isLength({ max: 500 }),
  body('order').optional().isInt({ min: 0 }),
];

const updateSourceValidation = [
  param('id').isUUID().withMessage('Invalid source ID'),
  body('name').optional().trim().notEmpty().withMessage('Source name cannot be empty'),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('icon').optional().trim(),
  body('description').optional().trim().isLength({ max: 500 }),
  body('isActive').optional().isBoolean(),
  body('order').optional().isInt({ min: 0 }),
];

/**
 * GET /api/lead-sources
 * Get all lead sources for the organization
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const sources = await leadSourceService.getAll(req.organizationId!, includeInactive);
    return ApiResponse.success(res, 'Lead sources retrieved', { sources });
  } catch (error: any) {
    console.error('Error fetching lead sources:', error);
    return ApiResponse.error(res, error.message || 'Failed to fetch lead sources', 500);
  }
});

/**
 * GET /api/lead-sources/:id
 * Get a single lead source
 */
router.get(
  '/:id',
  validate([param('id').isUUID().withMessage('Invalid source ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const source = await leadSourceService.getById(req.params.id, req.organizationId!);
      if (!source) {
        return ApiResponse.error(res, 'Lead source not found', 404);
      }
      return ApiResponse.success(res, 'Lead source retrieved', { source });
    } catch (error: any) {
      console.error('Error fetching lead source:', error);
      return ApiResponse.error(res, error.message || 'Failed to fetch lead source', 500);
    }
  }
);

/**
 * POST /api/lead-sources
 * Create a custom lead source
 * Admin only
 */
router.post(
  '/',
  authorize('admin'),
  validate(createSourceValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const { name, slug, color, icon, description, order } = req.body;
      const source = await leadSourceService.create(req.organizationId!, {
        name,
        slug,
        color,
        icon,
        description,
        order,
      });
      return ApiResponse.success(res, 'Lead source created successfully', { source }, 201);
    } catch (error: any) {
      console.error('Error creating lead source:', error);
      return ApiResponse.error(res, error.message || 'Failed to create lead source', 400);
    }
  }
);

/**
 * PUT /api/lead-sources/:id
 * Update a lead source
 * Admin only
 */
router.put(
  '/:id',
  authorize('admin'),
  validate(updateSourceValidation),
  async (req: TenantRequest, res: Response) => {
    try {
      const { name, color, icon, description, isActive, order } = req.body;
      const source = await leadSourceService.update(req.params.id, req.organizationId!, {
        name,
        color,
        icon,
        description,
        isActive,
        order,
      });
      return ApiResponse.success(res, 'Lead source updated successfully', { source });
    } catch (error: any) {
      console.error('Error updating lead source:', error);
      return ApiResponse.error(res, error.message || 'Failed to update lead source', 400);
    }
  }
);

/**
 * DELETE /api/lead-sources/:id
 * Delete a lead source (soft delete)
 * Admin only
 */
router.delete(
  '/:id',
  authorize('admin'),
  validate([param('id').isUUID().withMessage('Invalid source ID')]),
  async (req: TenantRequest, res: Response) => {
    try {
      await leadSourceService.delete(req.params.id, req.organizationId!);
      return ApiResponse.success(res, 'Lead source deleted successfully');
    } catch (error: any) {
      console.error('Error deleting lead source:', error);
      return ApiResponse.error(res, error.message || 'Failed to delete lead source', 400);
    }
  }
);

/**
 * POST /api/lead-sources/reorder
 * Reorder lead sources
 * Admin only
 */
router.post(
  '/reorder',
  authorize('admin'),
  validate([body('sourceIds').isArray({ min: 1 }).withMessage('Source IDs array is required')]),
  async (req: TenantRequest, res: Response) => {
    try {
      const sources = await leadSourceService.reorder(req.organizationId!, req.body.sourceIds);
      return ApiResponse.success(res, 'Lead sources reordered successfully', { sources });
    } catch (error: any) {
      console.error('Error reordering lead sources:', error);
      return ApiResponse.error(res, error.message || 'Failed to reorder lead sources', 400);
    }
  }
);

/**
 * POST /api/lead-sources/initialize
 * Initialize default lead sources
 * Admin only
 */
router.post(
  '/initialize',
  authorize('admin'),
  async (req: TenantRequest, res: Response) => {
    try {
      const sources = await leadSourceService.initializeDefaults(req.organizationId!);
      return ApiResponse.success(res, 'Lead sources initialized successfully', { sources });
    } catch (error: any) {
      console.error('Error initializing lead sources:', error);
      return ApiResponse.error(res, error.message || 'Failed to initialize lead sources', 500);
    }
  }
);

export default router;
