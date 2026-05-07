import { Router, Request, Response, NextFunction } from 'express';
import { applicationPaymentService } from '../services/application-payment.service';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { prisma } from '../config/database';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const router = Router();

// Initialize Razorpay only if credentials are available
let razorpay: Razorpay | null = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
} else {
  console.warn('Razorpay credentials not configured. Online payment features will be disabled.');
}

// ==================== Validation Schemas ====================

const verifyPaymentSchema = z.object({
  body: z.object({
    razorpay_payment_id: z.string().min(1),
    razorpay_order_id: z.string().min(1),
    razorpay_signature: z.string().min(1),
  }),
});

const submitProofSchema = z.object({
  body: z.object({
    paymentMode: z.enum([
      'ONLINE_UNIVERSITY',
      'OFFLINE_CASH',
      'OFFLINE_CHEQUE',
      'OFFLINE_DD',
      'BANK_TRANSFER',
      'UPI',
    ]),
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

// ==================== Public Payment Link Routes ====================

// Get payment link details
router.get(
  '/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentLink = await applicationPaymentService.getPaymentLinkByToken(req.params.token);

      // Get organization branding
      const organization = await prisma.organization.findUnique({
        where: { id: paymentLink.application.partner.organizationId || '' },
        select: {
          id: true,
          name: true,
          brandName: true,
          logo: true,
          primaryColor: true,
        },
      });

      res.json({
        success: true,
        data: {
          paymentLink: {
            id: paymentLink.id,
            amount: paymentLink.amount,
            feeType: paymentLink.feeType,
            expiresAt: paymentLink.expiresAt,
          },
          application: {
            applicationNumber: paymentLink.application.applicationNumber,
            studentName: paymentLink.application.studentName,
            totalFee: paymentLink.application.totalFee,
            paidAmount: paymentLink.application.paidAmount,
            balanceDue: Number(paymentLink.application.netFee) - Number(paymentLink.application.paidAmount),
          },
          organization,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create Razorpay order for payment link
router.post(
  '/:token/create-order',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!razorpay) {
        throw new AppError('Online payment is not configured. Please contact support.', 503);
      }

      const paymentLink = await applicationPaymentService.getPaymentLinkByToken(req.params.token);

      // Get organization for receipt prefix
      const organization = await prisma.organization.findFirst({
        where: { id: paymentLink.application.organizationId },
        select: { slug: true },
      });

      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: Number(paymentLink.amount) * 100, // Convert to paise
        currency: 'INR',
        receipt: `${organization?.slug || 'pay'}_${paymentLink.id.slice(0, 8)}`,
        notes: {
          paymentLinkId: paymentLink.id,
          applicationId: paymentLink.applicationId,
          paymentType: paymentLink.paymentType,
        },
      });

      // Store order ID
      await prisma.applicationPaymentLink.update({
        where: { id: paymentLink.id },
        data: { razorpayOrderId: order.id },
      });

      res.json({
        success: true,
        data: {
          orderId: order.id,
          amount: Number(paymentLink.amount),
          currency: 'INR',
          keyId: process.env.RAZORPAY_KEY_ID,
          prefill: {
            name: paymentLink.application.studentName,
            email: paymentLink.application.studentEmail || '',
            contact: paymentLink.application.studentPhone,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify Razorpay payment
router.post(
  '/:token/verify-payment',
  validateRequest(verifyPaymentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

      // Verify signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        throw new AppError('Payment verification failed', 400);
      }

      // Get payment link
      const paymentLink = await prisma.applicationPaymentLink.findUnique({
        where: { token: req.params.token },
      });

      if (!paymentLink) {
        throw new AppError('Payment link not found', 404);
      }

      // Process payment
      const payment = await applicationPaymentService.processOnlinePayment(
        paymentLink.id,
        razorpay_payment_id,
        razorpay_order_id
      );

      res.json({
        success: true,
        message: 'Payment successful',
        data: {
          paymentId: payment.id,
          amount: payment.amount,
          status: payment.status,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit external/offline payment proof via payment link
router.post(
  '/:token/submit-proof',
  validateRequest(submitProofSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentLink = await applicationPaymentService.getPaymentLinkByToken(req.params.token);

      // Record the payment
      const payment = await applicationPaymentService.recordPayment({
        applicationId: paymentLink.applicationId,
        amount: Number(paymentLink.amount),
        paymentMode: req.body.paymentMode,
        paymentType: paymentLink.feeType || 'OTHER',
        submittedBy: 'STUDENT',
        submittedByType: 'STUDENT',
        submittedByName: paymentLink.application.studentName,
      });

      // Submit proof
      await applicationPaymentService.submitPaymentProof({
        paymentId: payment.id,
        proofType: req.body.proofType,
        fileUrl: req.body.fileUrl,
        fileName: req.body.fileName,
        fileSize: req.body.fileSize,
        transactionId: req.body.transactionId,
        paymentDate: req.body.paymentDate ? new Date(req.body.paymentDate) : undefined,
        bankName: req.body.bankName,
        notes: req.body.notes,
      });

      // Update payment link status
      await prisma.applicationPaymentLink.update({
        where: { id: paymentLink.id },
        data: {
          status: 'VERIFICATION_PENDING',
        },
      });

      res.json({
        success: true,
        message: 'Payment proof submitted successfully. It will be verified by the admin.',
        data: {
          paymentId: payment.id,
          status: 'VERIFICATION_PENDING',
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Payment Options ====================

// Get available payment options
router.get(
  '/:token/options',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const paymentLink = await applicationPaymentService.getPaymentLinkByToken(req.params.token);

      // Get organization payment settings
      const organization = await prisma.organization.findFirst({
        where: { id: paymentLink.application.organizationId },
        select: { id: true, name: true },
      });

      // Define available payment options
      const paymentOptions = [
        {
          mode: 'ONLINE_CRM',
          label: 'Pay Online (Card/UPI/Net Banking)',
          description: 'Secure online payment via Razorpay',
          available: !!process.env.RAZORPAY_KEY_ID,
          recommended: true,
        },
        {
          mode: 'BANK_TRANSFER',
          label: 'Bank Transfer (NEFT/RTGS/IMPS)',
          description: 'Transfer to organization bank account and upload proof',
          available: true,
          recommended: false,
        },
        {
          mode: 'UPI',
          label: 'UPI Payment',
          description: 'Pay via UPI and upload screenshot',
          available: true,
          recommended: false,
        },
        {
          mode: 'ONLINE_UNIVERSITY',
          label: 'University Portal Payment',
          description: 'Pay on university portal and upload receipt',
          available: true,
          recommended: false,
        },
        {
          mode: 'OFFLINE_CASH',
          label: 'Cash Payment',
          description: 'Pay at college counter and upload receipt',
          available: true,
          recommended: false,
        },
        {
          mode: 'OFFLINE_CHEQUE',
          label: 'Cheque Payment',
          description: 'Pay by cheque and upload image',
          available: true,
          recommended: false,
        },
        {
          mode: 'OFFLINE_DD',
          label: 'Demand Draft',
          description: 'Pay by DD and upload image',
          available: true,
          recommended: false,
        },
      ];

      res.json({
        success: true,
        data: {
          paymentOptions: paymentOptions.filter(o => o.available),
          amount: paymentLink.amount,
          paymentType: paymentLink.paymentType,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
