import { Router, Request, Response, NextFunction } from 'express';
import { partnerApplicationService } from '../services/partner-application.service';
import { universityPaymentConfigService } from '../services/university-payment-config.service';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { prisma } from '../config/database';
import crypto from 'crypto';

const router = Router();

// ==================== Validation Schemas ====================

const submitApplicationSchema = z.object({
  body: z.object({
    academicYear: z.string().min(4),
    studentName: z.string().min(2),
    studentEmail: z.string().email().optional(),
    studentPhone: z.string().min(10),
    parentName: z.string().optional(),
    parentPhone: z.string().optional(),
    dateOfBirth: z.string().datetime().optional(),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    aadhaarNumber: z.string().length(12).optional(),
    hallTicketNumber: z.string().optional(),
    formData: z.record(z.any()).optional(),
    totalFee: z.number().positive(),
    scholarshipAmount: z.number().min(0).optional(),
  }),
});

const uploadDocumentSchema = z.object({
  body: z.object({
    documentType: z.string().min(1),
    documentName: z.string().min(1),
    fileName: z.string().min(1),
    fileUrl: z.string().url(),
    fileSize: z.number().positive(),
    mimeType: z.string().optional(),
  }),
});

const verifyOtpSchema = z.object({
  body: z.object({
    phone: z.string().min(10),
    otp: z.string().length(6),
    applicationNumber: z.string().optional(),
  }),
});

// Simple in-memory OTP store (in production, use Redis)
const otpStore: Map<string, { otp: string; expiresAt: Date; applicationId?: string }> = new Map();

// ==================== Public Routes (Application Link) ====================

// Get application link details (for pre-filling form)
router.get(
  '/link/:token',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const link = await partnerApplicationService.getApplicationLinkByToken(req.params.token);

      // Get university details
      const university = await prisma.university.findUnique({
        where: { id: link.universityId },
        select: {
          id: true,
          name: true,
          shortName: true,
          city: true,
          state: true,
        },
      });

      // Get organization details
      const organization = await prisma.organization.findUnique({
        where: { id: link.partner.organizationId },
        select: {
          id: true,
          name: true,
          logo: true,
          brandName: true,
          primaryColor: true,
        },
      });

      // Get required documents
      const requiredDocuments = await partnerApplicationService.getRequiredDocuments(
        link.partner.organizationId,
        link.universityId,
        link.collegeId || undefined,
        link.courseId || undefined
      );

      // Get admission form configuration
      const formConfig = await prisma.collegeAdmissionForm.findFirst({
        where: {
          organizationId: link.partner.organizationId,
          universityId: link.universityId,
          OR: [
            { collegeId: null, courseId: null },
            { collegeId: link.collegeId, courseId: null },
            { collegeId: link.collegeId, courseId: link.courseId },
          ],
          isActive: true,
        },
        orderBy: [{ courseId: 'desc' }, { collegeId: 'desc' }],
      });

      // Get fee structure
      const feeStructure = await prisma.collegeFeeStructure.findFirst({
        where: {
          organizationId: link.partner.organizationId,
          universityId: link.universityId,
          OR: [
            { collegeId: null, courseId: null },
            { collegeId: link.collegeId, courseId: null },
            { collegeId: link.collegeId, courseId: link.courseId },
          ],
          isActive: true,
        },
        orderBy: [{ courseId: 'desc' }, { collegeId: 'desc' }],
      });

      res.json({
        success: true,
        data: {
          link: {
            id: link.id,
            partnerId: link.partnerId,
            partnerName: link.partner.name,
            companyName: link.partner.companyName,
            universityId: link.universityId,
            collegeId: link.collegeId,
            courseId: link.courseId,
            studentName: link.studentName,
            studentPhone: link.studentPhone,
            studentEmail: link.studentEmail,
            expiresAt: link.expiresAt,
          },
          university,
          organization,
          requiredDocuments,
          formConfig: formConfig?.formFields || null,
          feeStructure: feeStructure
            ? {
                feeComponents: feeStructure.feeComponents,
                totalFee: feeStructure.totalFee,
                installmentPlans: feeStructure.installmentPlans,
              }
            : null,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit application via link
router.post(
  '/link/:token/submit',
  validateRequest(submitApplicationSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.createApplicationFromLink(
        req.params.token,
        {
          ...req.body,
          dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        }
      );

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload document via link
router.post(
  '/link/:token/documents',
  validateRequest(uploadDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get link to find the application
      const link = await prisma.partnerApplicationLink.findUnique({
        where: { token: req.params.token },
      });

      if (!link || !link.applicationId) {
        throw new AppError('Application not found. Please submit the application first.', 400);
      }

      const document = await partnerApplicationService.uploadDocument({
        applicationId: link.applicationId,
        ...req.body,
        uploadedBy: 'STUDENT',
        uploadedByName: 'Student',
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== OTP Authentication for Status Check ====================

// Send OTP for status check
router.post(
  '/send-otp',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, applicationNumber } = req.body;

      if (!phone) {
        throw new AppError('Phone number is required', 400);
      }

      // Find application
      let application;
      if (applicationNumber) {
        application = await prisma.partnerApplication.findFirst({
          where: {
            applicationNumber,
            studentPhone: phone,
          },
        });
      } else {
        application = await prisma.partnerApplication.findFirst({
          where: { studentPhone: phone },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (!application) {
        throw new AppError('No application found with this phone number', 404);
      }

      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP
      otpStore.set(phone, { otp, expiresAt, applicationId: application.id });

      // TODO: Send OTP via SMS
      // For now, log it (in production, integrate with SMS service)
      console.log(`OTP for ${phone}: ${otp}`);

      res.json({
        success: true,
        message: 'OTP sent successfully',
        data: {
          phone,
          // In development, return OTP for testing
          ...(process.env.NODE_ENV !== 'production' && { otp }),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify OTP and get application
router.post(
  '/verify-otp',
  validateRequest(verifyOtpSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { phone, otp } = req.body;

      const storedOtp = otpStore.get(phone);

      if (!storedOtp) {
        throw new AppError('OTP expired or not found. Please request a new one.', 400);
      }

      if (storedOtp.expiresAt < new Date()) {
        otpStore.delete(phone);
        throw new AppError('OTP expired. Please request a new one.', 400);
      }

      if (storedOtp.otp !== otp) {
        throw new AppError('Invalid OTP', 400);
      }

      // Get application
      const application = await partnerApplicationService.getApplicationById(storedOtp.applicationId!);

      if (!application) {
        throw new AppError('Application not found', 404);
      }

      // Generate session token
      const sessionToken = crypto.randomBytes(32).toString('hex');

      // Store session (in production, use Redis)
      otpStore.set(`session:${sessionToken}`, {
        otp: '',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        applicationId: application.id,
      });

      // Clear OTP
      otpStore.delete(phone);

      res.json({
        success: true,
        message: 'OTP verified successfully',
        data: {
          sessionToken,
          application: {
            id: application.id,
            applicationNumber: application.applicationNumber,
            studentName: application.studentName,
            status: application.status,
            documentsStatus: application.documentsStatus,
            paymentStatus: application.paymentStatus,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Authenticated Student Routes (using session token) ====================

// Middleware to verify session token
const verifyStudentSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    const session = otpStore.get(`session:${token}`);

    if (!session || session.expiresAt < new Date()) {
      otpStore.delete(`session:${token}`);
      throw new AppError('Session expired. Please login again.', 401);
    }

    (req as any).applicationId = session.applicationId;
    next();
  } catch (error) {
    next(error);
  }
};

// Get application details (student)
router.get(
  '/my-application',
  verifyStudentSession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = (req as any).applicationId;
      const application = await partnerApplicationService.getApplicationById(applicationId);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      // Build status timeline
      const statusHistory = (application.statusHistory as any[]) || [];
      const timeline = statusHistory.map((entry) => ({
        status: entry.status,
        date: entry.changedAt,
        notes: entry.notes,
      }));

      res.json({
        success: true,
        data: {
          application: {
            id: application.id,
            applicationNumber: application.applicationNumber,
            studentName: application.studentName,
            studentEmail: application.studentEmail,
            studentPhone: application.studentPhone,
            status: application.status,
            documentsStatus: application.documentsStatus,
            paymentStatus: application.paymentStatus,
            totalFee: application.totalFee,
            scholarshipAmount: application.scholarshipAmount,
            netFee: application.netFee,
            paidAmount: application.paidAmount,
            createdAt: application.createdAt,
          },
          documents: application.documents,
          payments: application.payments,
          paymentLinks: application.paymentLinks?.filter((l: any) => l.status === 'ACTIVE'),
          timeline,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload document (student)
router.post(
  '/my-application/documents',
  verifyStudentSession,
  validateRequest(uploadDocumentSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = (req as any).applicationId;

      const document = await partnerApplicationService.uploadDocument({
        applicationId,
        ...req.body,
        uploadedBy: 'STUDENT',
        uploadedByName: 'Student',
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
        data: document,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment options for my application (QR codes, bank details, etc.)
router.get(
  '/my-application/payment-options',
  verifyStudentSession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = (req as any).applicationId;

      // Get application details
      const application = await prisma.partnerApplication.findUnique({
        where: { id: applicationId },
        select: {
          id: true,
          organizationId: true,
          universityId: true,
          collegeId: true,
          courseId: true,
          totalFee: true,
          scholarshipAmount: true,
          paidAmount: true,
        },
      });

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      // Get payment configs for this application's university
      const paymentConfigs = await universityPaymentConfigService.getConfigsForUniversity(
        application.organizationId,
        application.universityId,
        application.collegeId || undefined,
        application.courseId || undefined
      );

      // Calculate amounts
      const netFee = Number(application.totalFee) - Number(application.scholarshipAmount || 0);
      const balanceAmount = netFee - Number(application.paidAmount || 0);

      res.json({
        success: true,
        data: {
          netFee,
          paidAmount: Number(application.paidAmount || 0),
          balanceAmount,
          paymentOptions: paymentConfigs.map((config: any) => ({
            id: config.id,
            configName: config.configName,
            feeType: config.feeType,
            defaultAmount: config.defaultAmount ? Number(config.defaultAmount) : null,
            bankDetails: config.showBankDetails ? {
              bankName: config.bankName,
              accountHolderName: config.accountHolderName,
              accountNumber: config.accountNumber,
              ifscCode: config.ifscCode,
              branchName: config.branchName,
            } : null,
            upiId: config.showUpi ? config.upiId : null,
            qrCode: config.showQrCode ? {
              url: config.paymentQrCodeUrl,
              data: config.paymentQrCodeData,
            } : null,
            paymentGatewayUrl: config.paymentGatewayUrl,
            instructions: config.paymentInstructions,
          })),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all applications for a phone number
router.get(
  '/my-applications',
  verifyStudentSession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const applicationId = (req as any).applicationId;

      // Get the main application to find phone
      const mainApp = await prisma.partnerApplication.findUnique({
        where: { id: applicationId },
        select: { studentPhone: true, organizationId: true },
      });

      if (!mainApp) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      // Get all applications for this phone
      const applications = await prisma.partnerApplication.findMany({
        where: {
          studentPhone: mainApp.studentPhone,
          organizationId: mainApp.organizationId,
        },
        select: {
          id: true,
          applicationNumber: true,
          studentName: true,
          status: true,
          paymentStatus: true,
          documentsStatus: true,
          totalFee: true,
          paidAmount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({
        success: true,
        data: applications,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
