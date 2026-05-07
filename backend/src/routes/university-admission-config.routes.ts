import { Router, Request, Response, NextFunction } from 'express';
import { universityAdmissionConfigService } from '../services/university-admission-config.service';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const requiredDocumentSchema = z.object({
  docType: z.string(),
  docName: z.string(),
  required: z.boolean(),
  maxSizeMB: z.number().optional(),
  description: z.string().optional(),
});

const otherFeeSchema = z.object({
  feeName: z.string(),
  amount: z.number().positive(),
  frequency: z.enum(['ONE_TIME', 'YEARLY', 'SEMESTER']).optional(),
  required: z.boolean().optional(),
});

const createConfigSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    configName: z.string().min(2),
    description: z.string().optional(),
    academicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY'),

    applicationMode: z.enum(['OFFLINE', 'ONLINE', 'HYBRID']).optional(),
    useCustomForm: z.boolean().optional(),
    requiredDocuments: z.array(requiredDocumentSchema).optional(),

    externalPortalUrl: z.string().url().optional(),
    externalPortalName: z.string().optional(),
    externalInstructions: z.string().optional(),
    trackExternalAppNumber: z.boolean().optional(),
    trackExternalPayment: z.boolean().optional(),

    paymentMode: z.enum(['ONLINE_GATEWAY', 'OFFLINE_QR', 'EXTERNAL', 'HYBRID']).optional(),
    paymentGateway: z.enum(['RAZORPAY', 'PAYU', 'CASHFREE', 'CCAVENUE']).optional(),
    gatewayMerchantId: z.string().optional(),
    gatewaySecretKey: z.string().optional(),
    gatewayWebhookUrl: z.string().url().optional(),

    applicationFee: z.number().min(0).optional(),
    admissionFee: z.number().min(0).optional(),
    tuitionFeePerYear: z.number().min(0).optional(),
    hostelFeePerYear: z.number().min(0).optional(),
    otherFees: z.array(otherFeeSchema).optional(),
    totalFeeAmount: z.number().min(0).optional(),

    scholarshipEnabled: z.boolean().optional(),
    maxScholarshipPercent: z.number().min(0).max(100).optional(),
    scholarshipCriteria: z.string().optional(),

    commissionPercent: z.number().min(0).max(100).optional(),
    commissionOnFeeType: z.enum(['ADMISSION_FEE', 'TOTAL_FEE', 'TUITION_FEE']).optional(),
    commissionCapAmount: z.number().min(0).optional(),

    applicationStartDate: z.string().datetime().optional(),
    applicationEndDate: z.string().datetime().optional(),
    seatsTotal: z.number().int().positive().optional(),

    logoUrl: z.string().url().optional(),
    bannerUrl: z.string().url().optional(),
    brochureUrl: z.string().url().optional(),
    contactEmail: z.string().email().optional(),
    contactPhone: z.string().optional(),
    websiteUrl: z.string().url().optional(),

    isFeatured: z.boolean().optional(),
  }),
});

const updateConfigSchema = z.object({
  body: z.object({
    configName: z.string().min(2).optional(),
    description: z.string().optional().nullable(),

    applicationMode: z.enum(['OFFLINE', 'ONLINE', 'HYBRID']).optional(),
    useCustomForm: z.boolean().optional(),
    requiredDocuments: z.array(requiredDocumentSchema).optional(),

    externalPortalUrl: z.string().url().optional().nullable(),
    externalPortalName: z.string().optional().nullable(),
    externalInstructions: z.string().optional().nullable(),
    trackExternalAppNumber: z.boolean().optional(),
    trackExternalPayment: z.boolean().optional(),

    paymentMode: z.enum(['ONLINE_GATEWAY', 'OFFLINE_QR', 'EXTERNAL', 'HYBRID']).optional(),
    paymentGateway: z.enum(['RAZORPAY', 'PAYU', 'CASHFREE', 'CCAVENUE']).optional().nullable(),
    gatewayMerchantId: z.string().optional().nullable(),
    gatewaySecretKey: z.string().optional().nullable(),
    gatewayWebhookUrl: z.string().url().optional().nullable(),

    applicationFee: z.number().min(0).optional().nullable(),
    admissionFee: z.number().min(0).optional().nullable(),
    tuitionFeePerYear: z.number().min(0).optional().nullable(),
    hostelFeePerYear: z.number().min(0).optional().nullable(),
    otherFees: z.array(otherFeeSchema).optional(),
    totalFeeAmount: z.number().min(0).optional().nullable(),

    scholarshipEnabled: z.boolean().optional(),
    maxScholarshipPercent: z.number().min(0).max(100).optional().nullable(),
    scholarshipCriteria: z.string().optional().nullable(),

    commissionPercent: z.number().min(0).max(100).optional().nullable(),
    commissionOnFeeType: z.enum(['ADMISSION_FEE', 'TOTAL_FEE', 'TUITION_FEE']).optional(),
    commissionCapAmount: z.number().min(0).optional().nullable(),

    applicationStartDate: z.string().datetime().optional().nullable(),
    applicationEndDate: z.string().datetime().optional().nullable(),
    seatsTotal: z.number().int().positive().optional().nullable(),
    seatsFilled: z.number().int().min(0).optional(),

    logoUrl: z.string().url().optional().nullable(),
    bannerUrl: z.string().url().optional().nullable(),
    brochureUrl: z.string().url().optional().nullable(),
    contactEmail: z.string().email().optional().nullable(),
    contactPhone: z.string().optional().nullable(),
    websiteUrl: z.string().url().optional().nullable(),

    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
  }),
});

const cloneConfigSchema = z.object({
  body: z.object({
    newAcademicYear: z.string().regex(/^\d{4}-\d{2}$/, 'Academic year must be in format YYYY-YY'),
  }),
});

// ==================== Admin Routes ====================

// Create admission configuration
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityAdmissionConfigService.createConfig({
        organizationId: req.user!.organizationId,
        ...req.body,
        applicationStartDate: req.body.applicationStartDate ? new Date(req.body.applicationStartDate) : undefined,
        applicationEndDate: req.body.applicationEndDate ? new Date(req.body.applicationEndDate) : undefined,
      });

      res.status(201).json({
        success: true,
        message: 'Admission configuration created successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List admission configurations
router.get(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await universityAdmissionConfigService.listConfigs({
        organizationId: req.user!.organizationId,
        universityId: req.query.universityId as string,
        collegeId: req.query.collegeId as string,
        applicationMode: req.query.applicationMode as any,
        academicYear: req.query.academicYear as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        isFeatured: req.query.isFeatured === 'true' ? true : req.query.isFeatured === 'false' ? false : undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      res.json({
        success: true,
        data: result.configs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get admission configuration by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityAdmissionConfigService.getConfigById(req.params.id);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get complete setup (config + form + payment options)
router.get(
  '/:id/complete-setup',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const setup = await universityAdmissionConfigService.getCompleteSetup(req.params.id);

      res.json({
        success: true,
        data: setup,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update admission configuration
router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityAdmissionConfigService.updateConfig(req.params.id, {
        ...req.body,
        applicationStartDate: req.body.applicationStartDate ? new Date(req.body.applicationStartDate) : undefined,
        applicationEndDate: req.body.applicationEndDate ? new Date(req.body.applicationEndDate) : undefined,
      });

      res.json({
        success: true,
        message: 'Admission configuration updated successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete admission configuration
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await universityAdmissionConfigService.deleteConfig(req.params.id);

      res.json({
        success: true,
        message: 'Admission configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clone configuration for new academic year
router.post(
  '/:id/clone',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(cloneConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cloned = await universityAdmissionConfigService.cloneConfig(
        req.params.id,
        req.body.newAcademicYear
      );

      res.status(201).json({
        success: true,
        message: `Configuration cloned for ${req.body.newAcademicYear}`,
        data: cloned,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
