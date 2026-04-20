/**
 * Wallet Routes - Handle wallet top-ups, balance, and transactions
 */

import { Router, Response, NextFunction } from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { walletService } from '../services/wallet.service';

const router = Router();

// Async handler wrapper
const asyncHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

/**
 * GET /wallet/balance
 * Get current wallet balance
 */
router.get(
  '/balance',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const balance = await walletService.getBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: balance,
    });
  })
);

/**
 * POST /wallet/topup
 * Create a top-up order
 */
router.post(
  '/topup',
  authenticate,
  tenantMiddleware,
  authorize('admin'),
  validate([
    body('amount')
      .isInt({ min: 100, max: 100000 })
      .withMessage('Amount must be between ₹100 and ₹1,00,000'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { amount } = req.body;

    const result = await walletService.createTopUp({
      organizationId: req.user!.organizationId,
      amount,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /wallet/topup/verify
 * Verify top-up payment and credit wallet
 */
router.post(
  '/topup/verify',
  authenticate,
  tenantMiddleware,
  validate([
    body('razorpayOrderId').notEmpty().withMessage('Order ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    const result = await walletService.verifyTopUp(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    res.json({
      success: true,
      data: result,
      message: 'Wallet credited successfully',
    });
  })
);

/**
 * GET /wallet/transactions
 * Get transaction history (paginated)
 */
router.get(
  '/transactions',
  authenticate,
  tenantMiddleware,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('type').optional().isIn(['CREDIT', 'DEBIT', 'REFUND']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, type } = req.query;

    const result = await walletService.getTransactions({
      organizationId: req.user!.organizationId,
      page: Number(page),
      limit: Number(limit),
      type: type as any,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /wallet/recent
 * Get recent transactions (last 3)
 */
router.get(
  '/recent',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const transactions = await walletService.getRecentTransactions(
      req.user!.organizationId
    );

    res.json({
      success: true,
      data: transactions,
    });
  })
);

export default router;
