/**
 * Promo Code Routes - Validate and manage promo codes
 */

import { Router, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { promoCodeService } from '../services/promo-code.service';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * POST /promo-codes/validate
 * Validate a promo code for a specific plan and amount
 */
router.post(
  '/validate',
  authenticate,
  tenantMiddleware,
  validate([
    body('code').trim().notEmpty().withMessage('Promo code is required'),
    body('planId').trim().notEmpty().withMessage('Plan ID is required'),
    body('amount').isNumeric().withMessage('Amount must be a number'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { code, planId, amount } = req.body;

    const result = await promoCodeService.validatePromoCode({
      code,
      organizationId: req.user!.organizationId,
      planId,
      amount: parseFloat(amount),
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

// Admin routes below
router.use(authenticate);
router.use(tenantMiddleware);
router.use(authorize('super_admin'));

/**
 * GET /promo-codes
 * Get all promo codes (admin only)
 */
router.get(
  '/',
  validate([
    query('activeOnly').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const activeOnly = req.query.activeOnly === 'true';
    const promoCodes = await promoCodeService.getPromoCodes(activeOnly);

    res.json({
      success: true,
      data: promoCodes,
    });
  })
);

/**
 * POST /promo-codes
 * Create a new promo code (admin only)
 */
router.post(
  '/',
  validate([
    body('code').trim().notEmpty().isLength({ min: 3, max: 20 }).matches(/^[A-Z0-9]+$/)
      .withMessage('Code must be 3-20 uppercase alphanumeric characters'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('discountType').isIn(['PERCENTAGE', 'FIXED']).withMessage('Invalid discount type'),
    body('discountValue').isNumeric().withMessage('Discount value must be a number'),
    body('maxUses').optional().isInt({ min: 1 }).withMessage('Max uses must be a positive integer'),
    body('maxUsesPerOrg').optional().isInt({ min: 1 }).withMessage('Max uses per org must be a positive integer'),
    body('minAmount').optional().isNumeric().withMessage('Min amount must be a number'),
    body('maxDiscount').optional().isNumeric().withMessage('Max discount must be a number'),
    body('validFrom').optional().isISO8601().withMessage('Invalid validFrom date'),
    body('validUntil').optional().isISO8601().withMessage('Invalid validUntil date'),
    body('applicablePlans').optional().isArray().withMessage('Applicable plans must be an array'),
    body('newCustomersOnly').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const promoCode = await promoCodeService.createPromoCode({
      code: req.body.code,
      description: req.body.description,
      discountType: req.body.discountType,
      discountValue: parseFloat(req.body.discountValue),
      maxUses: req.body.maxUses ? parseInt(req.body.maxUses) : undefined,
      maxUsesPerOrg: req.body.maxUsesPerOrg ? parseInt(req.body.maxUsesPerOrg) : undefined,
      minAmount: req.body.minAmount ? parseFloat(req.body.minAmount) : undefined,
      maxDiscount: req.body.maxDiscount ? parseFloat(req.body.maxDiscount) : undefined,
      validFrom: req.body.validFrom ? new Date(req.body.validFrom) : undefined,
      validUntil: req.body.validUntil ? new Date(req.body.validUntil) : undefined,
      applicablePlans: req.body.applicablePlans,
      newCustomersOnly: req.body.newCustomersOnly,
    });

    res.status(201).json({
      success: true,
      data: promoCode,
      message: 'Promo code created successfully',
    });
  })
);

/**
 * DELETE /promo-codes/:id
 * Deactivate a promo code (admin only)
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    await promoCodeService.deactivatePromoCode(req.params.id);

    res.json({
      success: true,
      message: 'Promo code deactivated',
    });
  })
);

export default router;
