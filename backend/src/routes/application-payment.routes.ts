import { Router, Request, Response, NextFunction } from 'express';
import { applicationPaymentService } from '../services/application-payment.service';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const recordPaymentSchema = z.object({
  body: z.object({
    applicationId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMode: z.enum([
      'ONLINE_CRM',
      'ONLINE_UNIVERSITY',
      'OFFLINE_CASH',
      'OFFLINE_CHEQUE',
      'OFFLINE_DD',
      'BANK_TRANSFER',
      'UPI',
    ]),
    paymentType: z.enum(['ADMISSION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'EXAM_FEE', 'OTHER']),
    description: z.string().optional(),
  }),
});

const submitProofSchema = z.object({
  body: z.object({
    proofType: z.enum(['RECEIPT', 'SCREENSHOT', 'BANK_STATEMENT', 'CHEQUE_IMAGE', 'DD_IMAGE']),
    fileUrl: z.string().url(),
    fileName: z.string().min(1),
    fileSize: z.number().positive(),
    transactionId: z.string().optional(),
    paymentDate: z.string().datetime().optional(),
    bankName: z.string().optional(),
    notes: z.string().optional(),
  }),
});

const verifyPaymentSchema = z.object({
  body: z.object({
    status: z.enum(['VERIFIED', 'REJECTED']),
    verificationNotes: z.string().optional(),
    rejectionReason: z.string().optional(),
  }),
});

const createPaymentLinkSchema = z.object({
  body: z.object({
    applicationId: z.string().uuid(),
    amount: z.number().positive(),
    feeType: z.string().min(1), // FULL, INSTALLMENT_1, etc.
    sentTo: z.string().min(1), // Phone or Email
    sentVia: z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'LINK']).optional(),
    expiresInHours: z.number().min(1).max(168).optional(),
  }),
});

const approveCommissionSchema = z.object({
  body: z.object({
    commissionId: z.string().uuid(),
  }),
});

const processPayoutSchema = z.object({
  body: z.object({
    partnerId: z.string().uuid(),
    notes: z.string().optional(),
  }),
});

const rejectPayoutSchema = z.object({
  body: z.object({
    reason: z.string().min(1),
  }),
});

// ==================== Admin Payment Routes ====================

// Record payment (Admin)
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(recordPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await applicationPaymentService.recordPayment({
        ...req.body,
        submittedBy: req.user!.id,
        submittedByType: 'ADMIN',
        submittedByName: `${req.user!.firstName} ${req.user!.lastName}`,
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit payment proof (Admin)
router.post(
  '/:paymentId/proof',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(submitProofSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await applicationPaymentService.submitPaymentProof({
        paymentId: req.params.paymentId,
        ...req.body,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined,
      });

      res.json({
        success: true,
        message: 'Payment proof submitted successfully',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify payment (Admin)
router.patch(
  '/:paymentId/verify',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(verifyPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payment = await applicationPaymentService.verifyPayment({
        paymentId: req.params.paymentId,
        status: req.body.status,
        verifiedById: req.user!.id,
        verificationNotes: req.body.verificationNotes,
        rejectionReason: req.body.rejectionReason,
      });

      res.json({
        success: true,
        message: `Payment ${req.body.status.toLowerCase()} successfully`,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get application payments (Admin)
router.get(
  '/application/:applicationId',
  authenticate,
  authorize(['admin', 'manager', 'telecaller']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payments = await applicationPaymentService.getApplicationPayments(req.params.applicationId);

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Payment Link Routes ====================

// Create payment link (Admin)
router.post(
  '/payment-links',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createPaymentLinkSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentLink = await applicationPaymentService.createPaymentLink(req.body);

      res.status(201).json({
        success: true,
        message: 'Payment link created successfully',
        data: paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Commission Routes ====================

// Get commission stats (Admin)
router.get(
  '/commissions/stats',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await applicationPaymentService.getCommissionStats(
        req.user!.organizationId,
        req.query.partnerId as string
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve commission (Admin)
router.post(
  '/commissions/approve',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(approveCommissionSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const commission = await applicationPaymentService.approveCommission(
        req.body.commissionId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Commission approved successfully',
        data: commission,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Payout Routes ====================

// Get pending payouts (Admin)
router.get(
  '/payouts/pending',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payouts = await applicationPaymentService.getPendingPayouts(req.user!.organizationId);

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Process payout (Admin)
router.post(
  '/payouts/process',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(processPayoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.processPayout({
        partnerId: req.body.partnerId,
        amount: 0, // Will be fetched from pending payout
        paymentMethod: 'BANK_TRANSFER',
        processedBy: req.user!.id,
        notes: req.body.notes,
      });

      res.json({
        success: true,
        message: 'Payout processed successfully',
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reject payout (Admin)
router.post(
  '/payouts/:payoutId/reject',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(rejectPayoutSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.rejectPayout(
        req.params.payoutId,
        req.user!.id,
        req.body.reason
      );

      res.json({
        success: true,
        message: 'Payout rejected',
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Stats & Reports ====================

// Get payment stats (Admin)
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await applicationPaymentService.getPaymentStats(req.user!.organizationId, {
        partnerId: req.query.partnerId as string,
        universityId: req.query.universityId as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
