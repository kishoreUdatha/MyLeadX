/**
 * Custom Fields Routes
 * API endpoints for managing organization custom fields
 */

import { Router, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { customFieldsService } from '../services/custom-fields.service';
import { ApiResponse } from '../utils/apiResponse';
import { FieldType } from '@prisma/client';

const router = Router();

// Apply middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Validation middleware
const validate = (req: TenantRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.validationError(res, 'Validation failed', errors.array());
  }
  next();
};

// Valid field types
const validFieldTypes = Object.values(FieldType);

/**
 * GET /api/custom-fields
 * Get all custom fields for the organization
 * All authenticated users can read custom fields (needed for forms)
 */
router.get(
  '/',
  // No authorize - all authenticated users can read custom fields
  [
    query('includeInactive').optional().isBoolean().toBoolean(),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      // Only admins/managers can see inactive fields
      const userRole = req.user?.role?.toLowerCase() || '';
      const isAdmin = ['admin', 'manager', 'super_admin'].includes(userRole);
      const includeInactive = isAdmin && req.query.includeInactive === true;
      const fields = await customFieldsService.getAll(req.organizationId!, includeInactive);
      ApiResponse.success(res, 'Custom fields retrieved successfully', { fields });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/custom-fields/:id
 * Get a single custom field
 */
router.get(
  '/:id',
  authorize('admin', 'manager'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const field = await customFieldsService.getById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Custom field retrieved successfully', { field });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/custom-fields
 * Create a new custom field
 */
router.post(
  '/',
  authorize('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('slug').optional().trim().matches(/^[a-z0-9_]+$/).withMessage('Slug must be lowercase alphanumeric with underscores'),
    body('fieldType').isIn(validFieldTypes).withMessage(`Field type must be one of: ${validFieldTypes.join(', ')}`),
    body('options').optional().isArray().withMessage('Options must be an array'),
    body('options.*.value').optional().isString().withMessage('Option value must be a string'),
    body('options.*.label').optional().isString().withMessage('Option label must be a string'),
    body('isRequired').optional().isBoolean().withMessage('isRequired must be a boolean'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const field = await customFieldsService.create(req.organizationId!, req.body);
      ApiResponse.success(res, 'Custom field created successfully', { field }, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/custom-fields/:id
 * Update a custom field
 */
router.put(
  '/:id',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
    body('slug').optional().trim().matches(/^[a-z0-9_]+$/).withMessage('Slug must be lowercase alphanumeric with underscores'),
    body('fieldType').optional().isIn(validFieldTypes).withMessage(`Field type must be one of: ${validFieldTypes.join(', ')}`),
    body('options').optional().isArray().withMessage('Options must be an array'),
    body('isRequired').optional().isBoolean().withMessage('isRequired must be a boolean'),
    body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
    body('order').optional().isInt({ min: 0 }).withMessage('Order must be a non-negative integer'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const field = await customFieldsService.update(req.params.id, req.organizationId!, req.body);
      ApiResponse.success(res, 'Custom field updated successfully', { field });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/custom-fields/:id
 * Delete a custom field
 */
router.delete(
  '/:id',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      await customFieldsService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Custom field deleted successfully');
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/custom-fields/reorder
 * Reorder custom fields
 */
router.post(
  '/reorder',
  authorize('admin'),
  [
    body('fieldIds').isArray({ min: 1 }).withMessage('fieldIds must be a non-empty array'),
    body('fieldIds.*').isUUID().withMessage('Each field ID must be a valid UUID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const fields = await customFieldsService.reorder(req.organizationId!, req.body.fieldIds);
      ApiResponse.success(res, 'Fields reordered successfully', { fields });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/custom-fields/:id/toggle
 * Toggle field active status
 */
router.post(
  '/:id/toggle',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const field = await customFieldsService.toggleActive(req.params.id, req.organizationId!);
      ApiResponse.success(res, `Field ${field.isActive ? 'activated' : 'deactivated'} successfully`, { field });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/custom-fields/:id/duplicate
 * Duplicate a custom field
 */
router.post(
  '/:id/duplicate',
  authorize('admin'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const field = await customFieldsService.duplicate(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Field duplicated successfully', { field }, 201);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/custom-fields/:id/usage
 * Get field usage statistics
 */
router.get(
  '/:id/usage',
  authorize('admin', 'manager'),
  [
    param('id').isUUID().withMessage('Invalid field ID'),
  ],
  validate,
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const usage = await customFieldsService.getFieldUsage(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Field usage retrieved successfully', usage);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
