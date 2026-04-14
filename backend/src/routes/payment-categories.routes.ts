/**
 * Payment Categories Routes
 * API endpoints for managing payment categories
 */

import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { paymentCategoriesService } from '../services/payment-categories.service';
import { PaymentCategoryType } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('code').trim().notEmpty().withMessage('Category code is required'),
  body('description').optional().trim(),
  body('type')
    .optional()
    .isIn(['FEE', 'DEPOSIT', 'REFUND', 'DISCOUNT', 'TAX', 'OTHER'])
    .withMessage('Invalid category type'),
  body('defaultAmount').optional().isFloat({ min: 0 }).withMessage('Default amount must be positive'),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0-100'),
  body('taxInclusive').optional().isBoolean(),
  body('isRefundable').optional().isBoolean(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid color format'),
  body('rules').optional().isArray(),
];

const updateValidation = [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('name').optional().trim().notEmpty(),
  body('code').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('type')
    .optional()
    .isIn(['FEE', 'DEPOSIT', 'REFUND', 'DISCOUNT', 'TAX', 'OTHER']),
  body('defaultAmount').optional().isFloat({ min: 0 }),
  body('taxRate').optional().isFloat({ min: 0, max: 100 }),
  body('taxInclusive').optional().isBoolean(),
  body('isRefundable').optional().isBoolean(),
  body('isActive').optional().isBoolean(),
  body('displayOrder').optional().isInt({ min: 0 }),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('rules').optional().isArray(),
];

/**
 * GET /payment-categories
 * Get all payment categories for the organization
 */
router.get(
  '/',
  [query('includeInactive').optional().isBoolean()],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const categories = await paymentCategoriesService.getAll(
        req.organizationId!,
        includeInactive
      );

      return ApiResponse.success(res, { categories });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /payment-categories/type/:type
 * Get categories by type
 */
router.get(
  '/type/:type',
  [
    param('type')
      .isIn(['FEE', 'DEPOSIT', 'REFUND', 'DISCOUNT', 'TAX', 'OTHER'])
      .withMessage('Invalid category type'),
  ],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const categories = await paymentCategoriesService.getByType(
        req.organizationId!,
        req.params.type as PaymentCategoryType
      );

      return ApiResponse.success(res, { categories });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * GET /payment-categories/:id
 * Get a single payment category
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const category = await paymentCategoriesService.getById(
        req.params.id,
        req.organizationId!
      );

      if (!category) {
        return ApiResponse.error(res, 'Category not found', 404);
      }

      return ApiResponse.success(res, { category });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * POST /payment-categories
 * Create a new payment category
 */
router.post(
  '/',
  authorize(['ADMIN', 'MANAGER']),
  createValidation,
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const category = await paymentCategoriesService.create(req.organizationId!, req.body);
      return ApiResponse.success(res, { category }, 201);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'A category with this code already exists', 400);
      }
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * PUT /payment-categories/:id
 * Update a payment category
 */
router.put(
  '/:id',
  authorize(['ADMIN', 'MANAGER']),
  updateValidation,
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const existing = await paymentCategoriesService.getById(
        req.params.id,
        req.organizationId!
      );

      if (!existing) {
        return ApiResponse.error(res, 'Category not found', 404);
      }

      const category = await paymentCategoriesService.update(
        req.params.id,
        req.organizationId!,
        req.body
      );

      return ApiResponse.success(res, { category });
    } catch (error: any) {
      if (error.code === 'P2002') {
        return ApiResponse.error(res, 'A category with this code already exists', 400);
      }
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * DELETE /payment-categories/:id
 * Delete a payment category
 */
router.delete(
  '/:id',
  authorize(['ADMIN']),
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const existing = await paymentCategoriesService.getById(
        req.params.id,
        req.organizationId!
      );

      if (!existing) {
        return ApiResponse.error(res, 'Category not found', 404);
      }

      await paymentCategoriesService.delete(req.params.id, req.organizationId!);
      return ApiResponse.success(res, { message: 'Category deleted successfully' });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * POST /payment-categories/:id/toggle
 * Toggle category active status
 */
router.post(
  '/:id/toggle',
  authorize(['ADMIN', 'MANAGER']),
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const category = await paymentCategoriesService.toggleActive(
        req.params.id,
        req.organizationId!
      );

      return ApiResponse.success(res, { category });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * POST /payment-categories/:id/duplicate
 * Duplicate a payment category
 */
router.post(
  '/:id/duplicate',
  authorize(['ADMIN', 'MANAGER']),
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const category = await paymentCategoriesService.duplicate(
        req.params.id,
        req.organizationId!
      );

      return ApiResponse.success(res, { category }, 201);
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * POST /payment-categories/reorder
 * Reorder payment categories
 */
router.post(
  '/reorder',
  authorize(['ADMIN', 'MANAGER']),
  [body('categoryIds').isArray().withMessage('categoryIds must be an array')],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      await paymentCategoriesService.reorder(req.organizationId!, req.body.categoryIds);
      return ApiResponse.success(res, { message: 'Categories reordered successfully' });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * PUT /payment-categories/:id/rules
 * Update category rules
 */
router.put(
  '/:id/rules',
  authorize(['ADMIN', 'MANAGER']),
  [
    param('id').isUUID().withMessage('Invalid category ID'),
    body('rules').isArray().withMessage('Rules must be an array'),
  ],
  validate,
  async (req: TenantRequest, res: Response) => {
    try {
      const category = await paymentCategoriesService.updateRules(
        req.params.id,
        req.organizationId!,
        req.body.rules
      );

      return ApiResponse.success(res, { category });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * POST /payment-categories/seed-defaults
 * Seed default categories for the organization
 */
router.post(
  '/seed-defaults',
  authorize(['ADMIN']),
  async (req: TenantRequest, res: Response) => {
    try {
      await paymentCategoriesService.seedDefaults(req.organizationId!);
      return ApiResponse.success(res, { message: 'Default categories created successfully' });
    } catch (error: any) {
      return ApiResponse.error(res, error.message, 500);
    }
  }
);

export default router;
