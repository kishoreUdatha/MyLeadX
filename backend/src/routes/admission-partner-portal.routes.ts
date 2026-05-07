import { Router, Request, Response, NextFunction } from 'express';
import { admissionPartnerService } from '../services/admission-partner.service';
import { partnerApplicationService } from '../services/partner-application.service';
import { applicationPaymentService } from '../services/application-payment.service';
import { universityPaymentConfigService } from '../services/university-payment-config.service';
import { universityAdmissionConfigService } from '../services/university-admission-config.service';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errors';
import { prisma } from '../config/database';

const router = Router();

// ==================== Partner Auth Middleware ====================

interface PartnerAuthRequest extends Request {
  partner?: {
    id: string;
    organizationId: string;
    email: string;
    name: string;
    partnerType: string;
    tier: string;
  };
}

const partnerAuth = async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as {
      partnerId: string;
      organizationId: string;
    };

    // Get partner
    const partner = await prisma.admissionPartner.findUnique({
      where: { id: decoded.partnerId },
      select: {
        id: true,
        organizationId: true,
        email: true,
        name: true,
        partnerType: true,
        tier: true,
        status: true,
      },
    });

    if (!partner) {
      throw new AppError('Partner not found', 401);
    }

    if (partner.status !== 'ACTIVE') {
      throw new AppError('Your account is not active', 403);
    }

    req.partner = partner;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401));
    } else {
      next(error);
    }
  }
};

// ==================== Validation Schemas ====================

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
    organizationSlug: z.string().min(1), // To identify the organization
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    altPhone: z.string().optional(),
    companyName: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
  }),
});

const bankDetailsSchema = z.object({
  body: z.object({
    accountHolderName: z.string().min(2),
    accountNumber: z.string().min(8),
    bankName: z.string().min(2),
    ifscCode: z.string().min(11).max(11),
    branchName: z.string().optional(),
    accountType: z.enum(['SAVINGS', 'CURRENT']).optional(),
    upiId: z.string().optional(),
    isPrimary: z.boolean().optional(),
  }),
});

const createTeamMemberSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().min(10),
    password: z.string().min(8),
    altPhone: z.string().optional(),
  }),
});

// ==================== Public Routes ====================

// Partner Login
router.post(
  '/login',
  validateRequest(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Find organization by slug
      const organization = await prisma.organization.findUnique({
        where: { slug: req.body.organizationSlug },
      });

      if (!organization) {
        throw new AppError('Organization not found', 404);
      }

      // Login
      const { partner } = await admissionPartnerService.login({
        organizationId: organization.id,
        email: req.body.email,
        password: req.body.password,
      });

      // Generate JWT token
      const token = jwt.sign(
        {
          partnerId: partner.id,
          organizationId: partner.organizationId,
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '7d' }
      );

      // Get wallet info
      const wallet = await prisma.admissionPartnerWallet.findUnique({
        where: { partnerId: partner.id },
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          partner: {
            id: partner.id,
            name: partner.name,
            email: partner.email,
            phone: partner.phone,
            partnerCode: partner.partnerCode,
            partnerType: partner.partnerType,
            tier: partner.tier,
            companyName: partner.companyName,
          },
          wallet: wallet
            ? {
                balance: wallet.balance,
                pendingBalance: wallet.pendingBalance,
              }
            : null,
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Protected Routes ====================

// Get current partner profile
router.get(
  '/me',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.getPartnerById(req.partner!.id);

      res.json({
        success: true,
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update partner profile
router.patch(
  '/me',
  partnerAuth,
  validateRequest(updateProfileSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.updatePartner(req.partner!.id, req.body);

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.post(
  '/me/change-password',
  partnerAuth,
  validateRequest(changePasswordSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      await admissionPartnerService.changePassword(
        req.partner!.id,
        req.body.currentPassword,
        req.body.newPassword
      );

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get dashboard
router.get(
  '/dashboard',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const dashboard = await admissionPartnerService.getPartnerDashboard(req.partner!.id);

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== College Access Routes ====================

// Get accessible universities
router.get(
  '/universities',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const universities = await admissionPartnerService.getAccessibleUniversities(
        req.partner!.id,
        req.partner!.organizationId
      );

      res.json({
        success: true,
        data: universities,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get available admission configurations (for creating applications)
router.get(
  '/admission-configs',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const configs = await universityAdmissionConfigService.getAvailableConfigs(
        req.partner!.organizationId,
        req.partner!.id
      );

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get complete setup for an admission config (form + payment options)
router.get(
  '/admission-configs/:configId/setup',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const setup = await universityAdmissionConfigService.getCompleteSetup(req.params.configId);

      // Format response based on application mode
      const response: any = {
        config: {
          id: setup.config.id,
          configName: setup.config.configName,
          description: setup.config.description,
          academicYear: setup.config.academicYear,
          applicationMode: setup.config.applicationMode,
          paymentMode: setup.config.paymentMode,

          // Fee structure
          applicationFee: setup.config.applicationFee ? Number(setup.config.applicationFee) : null,
          admissionFee: setup.config.admissionFee ? Number(setup.config.admissionFee) : null,
          tuitionFeePerYear: setup.config.tuitionFeePerYear ? Number(setup.config.tuitionFeePerYear) : null,
          hostelFeePerYear: setup.config.hostelFeePerYear ? Number(setup.config.hostelFeePerYear) : null,
          otherFees: setup.config.otherFees,
          totalFeeAmount: setup.config.totalFeeAmount ? Number(setup.config.totalFeeAmount) : null,

          // Scholarship
          scholarshipEnabled: setup.config.scholarshipEnabled,
          maxScholarshipPercent: setup.config.maxScholarshipPercent ? Number(setup.config.maxScholarshipPercent) : null,

          // Availability
          applicationStartDate: setup.config.applicationStartDate,
          applicationEndDate: setup.config.applicationEndDate,
          seatsTotal: setup.config.seatsTotal,
          seatsFilled: setup.config.seatsFilled,
          seatsAvailable: setup.config.seatsTotal ? setup.config.seatsTotal - setup.config.seatsFilled : null,

          // Display
          logoUrl: setup.config.logoUrl,
          bannerUrl: setup.config.bannerUrl,
          brochureUrl: setup.config.brochureUrl,
          contactEmail: setup.config.contactEmail,
          contactPhone: setup.config.contactPhone,
          websiteUrl: setup.config.websiteUrl,
        },
      };

      // Add offline mode details (our form)
      if (setup.config.applicationMode === 'OFFLINE' || setup.config.applicationMode === 'HYBRID') {
        response.offlineMode = {
          form: setup.form ? {
            id: setup.form.id,
            formName: setup.form.formName,
            description: setup.form.description,
            formFields: setup.form.formFields,
            sections: setup.form.sections,
          } : null,
          requiredDocuments: setup.config.requiredDocuments,
        };
      }

      // Add online mode details (external portal)
      if (setup.config.applicationMode === 'ONLINE' || setup.config.applicationMode === 'HYBRID') {
        response.onlineMode = {
          externalPortalUrl: setup.config.externalPortalUrl,
          externalPortalName: setup.config.externalPortalName,
          externalInstructions: setup.config.externalInstructions,
          trackExternalAppNumber: setup.config.trackExternalAppNumber,
          trackExternalPayment: setup.config.trackExternalPayment,
        };
      }

      // Add payment options
      if (setup.config.paymentMode === 'OFFLINE_QR' || setup.config.paymentMode === 'HYBRID') {
        response.paymentOptions = setup.paymentConfigs.map((pc: any) => ({
          id: pc.id,
          configName: pc.configName,
          feeType: pc.feeType,
          bankDetails: pc.showBankDetails ? {
            bankName: pc.bankName,
            accountHolderName: pc.accountHolderName,
            accountNumber: pc.accountNumber,
            ifscCode: pc.ifscCode,
            branchName: pc.branchName,
          } : null,
          upiId: pc.showUpi ? pc.upiId : null,
          qrCode: pc.showQrCode ? {
            url: pc.paymentQrCodeUrl,
            data: pc.paymentQrCodeData,
          } : null,
          instructions: pc.paymentInstructions,
        }));
      }

      if (setup.config.paymentMode === 'EXTERNAL') {
        response.paymentExternal = {
          message: 'Payment to be made on the external university portal',
          portalUrl: setup.config.externalPortalUrl,
        };
      }

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get college access
router.get(
  '/college-access',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const access = await admissionPartnerService.getPartnerCollegeAccess(req.partner!.id);

      res.json({
        success: true,
        data: access,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get commission rate for a college
router.get(
  '/commission-rate',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { universityId, collegeId, courseId } = req.query;

      if (!universityId) {
        throw new AppError('University ID is required', 400);
      }

      const rate = await admissionPartnerService.getCommissionRate(
        req.partner!.id,
        universityId as string,
        collegeId as string,
        courseId as string
      );

      res.json({
        success: true,
        data: { commissionRate: rate },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment configurations for a university (QR codes, bank details, etc.)
router.get(
  '/payment-configs/:universityId',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const { collegeId, courseId } = req.query;

      const configs = await universityPaymentConfigService.getConfigsForUniversity(
        req.partner!.organizationId,
        req.params.universityId,
        collegeId as string,
        courseId as string
      );

      res.json({
        success: true,
        data: configs,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Bank Details Routes ====================

// Get bank details
router.get(
  '/bank-details',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const bankDetails = await admissionPartnerService.getBankDetails(req.partner!.id);

      res.json({
        success: true,
        data: bankDetails,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add/Update bank details
router.post(
  '/bank-details',
  partnerAuth,
  validateRequest(bankDetailsSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const bankDetails = await admissionPartnerService.updateBankDetails(
        req.partner!.id,
        req.body
      );

      res.json({
        success: true,
        message: 'Bank details saved successfully',
        data: bankDetails,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Team Management Routes ====================

// Get team members (for super partner / sub partner)
router.get(
  '/team',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Only super partners and sub partners can have team members
      if (!['SUPER_PARTNER', 'SUB_PARTNER'].includes(req.partner!.partnerType)) {
        return res.json({
          success: true,
          data: [],
          message: 'Only super partners and sub partners can have team members',
        });
      }

      const result = await admissionPartnerService.getTeamMembers(req.partner!.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      });

      res.json({
        success: true,
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Add team member (for super partner / sub partner)
router.post(
  '/team',
  partnerAuth,
  validateRequest(createTeamMemberSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Only super partners and sub partners can add team members
      if (!['SUPER_PARTNER', 'SUB_PARTNER'].includes(req.partner!.partnerType)) {
        throw new AppError('Only super partners and sub partners can add team members', 403);
      }

      // Determine member type based on parent type
      let memberType: 'SUB_PARTNER' | 'AGENT' = 'AGENT';
      if (req.partner!.partnerType === 'SUPER_PARTNER') {
        memberType = 'SUB_PARTNER';
      }

      const member = await admissionPartnerService.createPartner({
        organizationId: req.partner!.organizationId,
        parentPartnerId: req.partner!.id,
        partnerType: memberType,
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        password: req.body.password,
        altPhone: req.body.altPhone,
      });

      // Log activity
      await admissionPartnerService.logActivity(
        req.partner!.id,
        'TEAM_MEMBER_ADDED',
        `Added team member: ${member.name}`,
        { memberId: member.id }
      );

      res.status(201).json({
        success: true,
        message: 'Team member added successfully',
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Application Routes ====================

const createApplicationSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
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

const createApplicationLinkSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    studentName: z.string().optional(),
    studentPhone: z.string().optional(),
    studentEmail: z.string().email().optional(),
    expiresInDays: z.number().min(1).max(30).optional(),
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

// Create application (Partner)
router.post(
  '/applications',
  partnerAuth,
  validateRequest(createApplicationSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.createApplication({
        organizationId: req.partner!.organizationId,
        partnerId: req.partner!.id,
        ...req.body,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        filledBy: 'PARTNER',
      });

      res.status(201).json({
        success: true,
        message: 'Application created successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List partner's applications
router.get(
  '/applications',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await partnerApplicationService.listApplications({
        organizationId: req.partner!.organizationId,
        partnerId: req.partner!.id,
        status: req.query.status as any,
        paymentStatus: req.query.paymentStatus as any,
        universityId: req.query.universityId as string,
        search: req.query.search as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
      });

      res.json({
        success: true,
        data: result.applications,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get application statistics
router.get(
  '/applications/stats',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await partnerApplicationService.getApplicationStats(
        req.partner!.organizationId,
        req.partner!.id
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

// Check for duplicates before creating
router.post(
  '/applications/check-duplicates',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await partnerApplicationService.checkDuplicates(
        req.partner!.organizationId,
        req.body.studentPhone,
        req.body.studentEmail,
        req.body.aadhaarNumber,
        req.body.hallTicketNumber
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get single application
router.get(
  '/applications/:id',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const application = await partnerApplicationService.getApplicationById(req.params.id);

      if (!application) {
        return res.status(404).json({
          success: false,
          message: 'Application not found',
        });
      }

      // Verify partner owns this application
      if (application.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      res.json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update application (only in draft/editable status)
router.patch(
  '/applications/:id',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify partner owns this application
      const existing = await partnerApplicationService.getApplicationById(req.params.id);
      if (!existing || existing.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const application = await partnerApplicationService.updateApplication(
        req.params.id,
        {
          ...req.body,
          dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : undefined,
        },
        req.partner!.id,
        'PARTNER'
      );

      res.json({
        success: true,
        message: 'Application updated successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Submit application
router.post(
  '/applications/:id/submit',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify partner owns this application
      const existing = await partnerApplicationService.getApplicationById(req.params.id);
      if (!existing || existing.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const application = await partnerApplicationService.submitApplication(
        req.params.id,
        req.partner!.id,
        'PARTNER'
      );

      res.json({
        success: true,
        message: 'Application submitted successfully',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Upload document to application
router.post(
  '/applications/:id/documents',
  partnerAuth,
  validateRequest(uploadDocumentSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify partner owns this application
      const existing = await partnerApplicationService.getApplicationById(req.params.id);
      if (!existing || existing.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const document = await partnerApplicationService.uploadDocument({
        applicationId: req.params.id,
        ...req.body,
        uploadedBy: 'PARTNER',
        uploadedByName: req.partner!.name,
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

// Get required documents for a university/college
router.get(
  '/required-documents/:universityId',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const documents = await partnerApplicationService.getRequiredDocuments(
        req.partner!.organizationId,
        req.params.universityId,
        req.query.collegeId as string,
        req.query.courseId as string
      );

      res.json({
        success: true,
        data: documents,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Application Link Routes ====================

// Create application link for student
router.post(
  '/application-links',
  partnerAuth,
  validateRequest(createApplicationLinkSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const link = await partnerApplicationService.createApplicationLink({
        partnerId: req.partner!.id,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Application link created successfully',
        data: link,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get partner's application links
router.get(
  '/application-links',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const links = await prisma.partnerApplicationLink.findMany({
        where: { partnerId: req.partner!.id },
        orderBy: { createdAt: 'desc' },
        take: Number(req.query.limit) || 20,
        skip: ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 20),
      });

      const total = await prisma.partnerApplicationLink.count({
        where: { partnerId: req.partner!.id },
      });

      res.json({
        success: true,
        data: links,
        pagination: {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total,
          totalPages: Math.ceil(total / (Number(req.query.limit) || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Activity Logs ====================

// Get activity logs
router.get(
  '/activity-logs',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.getActivityLogs(req.partner!.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      res.json({
        success: true,
        data: result.logs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Wallet & Payout Routes ====================

const requestPayoutSchema = z.object({
  body: z.object({
    amount: z.number().positive(),
    notes: z.string().optional(),
  }),
});

// Get wallet details
router.get(
  '/wallet',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const wallet = await applicationPaymentService.getPartnerWallet(req.partner!.id);

      res.json({
        success: true,
        data: wallet,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get commissions
router.get(
  '/commissions',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const commissions = await prisma.partnerCommission.findMany({
        where: { partnerId: req.partner!.id },
        orderBy: { createdAt: 'desc' },
        take: Number(req.query.limit) || 20,
        skip: ((Number(req.query.page) || 1) - 1) * (Number(req.query.limit) || 20),
        include: {
          application: {
            select: {
              id: true,
              applicationNumber: true,
              studentName: true,
            },
          },
        },
      });

      const total = await prisma.partnerCommission.count({
        where: { partnerId: req.partner!.id },
      });

      res.json({
        success: true,
        data: commissions,
        pagination: {
          page: Number(req.query.page) || 1,
          limit: Number(req.query.limit) || 20,
          total,
          totalPages: Math.ceil(total / (Number(req.query.limit) || 20)),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get commission statistics
router.get(
  '/commissions/stats',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await applicationPaymentService.getCommissionStats(
        req.partner!.organizationId,
        req.partner!.id
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

// Request payout
router.post(
  '/payouts/request',
  partnerAuth,
  validateRequest(requestPayoutSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.createPayoutRequest(
        req.partner!.id,
        req.body.amount,
        req.body.notes
      );

      // Log activity
      await admissionPartnerService.logActivity(
        req.partner!.id,
        'PAYOUT_REQUESTED',
        `Requested payout of Rs. ${req.body.amount}`,
        { payoutId: payout.id }
      );

      res.status(201).json({
        success: true,
        message: 'Payout request submitted successfully',
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payout history
router.get(
  '/payouts',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      const payouts = await applicationPaymentService.getPartnerPayouts(
        req.partner!.id,
        req.query.status as string
      );

      res.json({
        success: true,
        data: payouts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Payment Recording (Partner Side) ====================

const recordPaymentProofSchema = z.object({
  body: z.object({
    paymentMode: z.enum([
      'ONLINE_UNIVERSITY',
      'OFFLINE_CASH',
      'OFFLINE_CHEQUE',
      'OFFLINE_DD',
      'BANK_TRANSFER',
      'UPI',
    ]),
    paymentType: z.enum(['ADMISSION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'EXAM_FEE', 'OTHER']),
    amount: z.number().positive(),
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

// Record payment with proof (Partner)
router.post(
  '/applications/:applicationId/payments',
  partnerAuth,
  validateRequest(recordPaymentProofSchema),
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify partner owns this application
      const existing = await partnerApplicationService.getApplicationById(req.params.applicationId);
      if (!existing || existing.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      // Record the payment
      const payment = await applicationPaymentService.recordPayment({
        applicationId: req.params.applicationId,
        amount: req.body.amount,
        paymentMode: req.body.paymentMode,
        paymentType: req.body.paymentType,
        submittedBy: req.partner!.id,
        submittedByType: 'PARTNER',
        submittedByName: req.partner!.name,
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

      res.status(201).json({
        success: true,
        message: 'Payment recorded and proof submitted for verification',
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get application payments
router.get(
  '/applications/:applicationId/payments',
  partnerAuth,
  async (req: PartnerAuthRequest, res: Response, next: NextFunction) => {
    try {
      // Verify partner owns this application
      const existing = await partnerApplicationService.getApplicationById(req.params.applicationId);
      if (!existing || existing.partnerId !== req.partner!.id) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }

      const payments = await applicationPaymentService.getApplicationPayments(
        req.params.applicationId
      );

      res.json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
