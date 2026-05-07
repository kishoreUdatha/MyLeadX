import { Router, Request, Response, NextFunction } from 'express';
import { universityPaymentConfigService } from '../services/university-payment-config.service';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const createConfigSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    configName: z.string().min(2),
    feeType: z.enum(['ADMISSION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'EXAM_FEE', 'OTHER']).optional(),
    bankName: z.string().optional(),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    branchName: z.string().optional(),
    upiId: z.string().optional(),
    paymentQrCodeUrl: z.string().url().optional(),
    paymentQrCodeData: z.string().optional(),
    paymentGatewayUrl: z.string().url().optional(),
    paymentGatewayId: z.string().optional(),
    defaultAmount: z.number().positive().optional(),
    currency: z.string().optional(),
    paymentInstructions: z.string().optional(),
    showQrCode: z.boolean().optional(),
    showBankDetails: z.boolean().optional(),
    showUpi: z.boolean().optional(),
  }),
});

const updateConfigSchema = z.object({
  body: z.object({
    configName: z.string().min(2).optional(),
    feeType: z.enum(['ADMISSION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'EXAM_FEE', 'OTHER']).optional(),
    bankName: z.string().optional(),
    accountHolderName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    branchName: z.string().optional(),
    upiId: z.string().optional(),
    paymentQrCodeUrl: z.string().url().optional().nullable(),
    paymentQrCodeData: z.string().optional().nullable(),
    paymentGatewayUrl: z.string().url().optional().nullable(),
    paymentGatewayId: z.string().optional().nullable(),
    defaultAmount: z.number().positive().optional().nullable(),
    currency: z.string().optional(),
    paymentInstructions: z.string().optional().nullable(),
    showQrCode: z.boolean().optional(),
    showBankDetails: z.boolean().optional(),
    showUpi: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

const bulkCreateSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    configs: z.array(z.object({
      collegeId: z.string().uuid().optional(),
      courseId: z.string().uuid().optional(),
      configName: z.string().min(2),
      feeType: z.enum(['ADMISSION_FEE', 'TUITION_FEE', 'HOSTEL_FEE', 'EXAM_FEE', 'OTHER']).optional(),
      bankName: z.string().optional(),
      accountHolderName: z.string().optional(),
      accountNumber: z.string().optional(),
      ifscCode: z.string().optional(),
      branchName: z.string().optional(),
      upiId: z.string().optional(),
      paymentQrCodeUrl: z.string().url().optional(),
      paymentQrCodeData: z.string().optional(),
      defaultAmount: z.number().positive().optional(),
      paymentInstructions: z.string().optional(),
    })).min(1),
  }),
});

// ==================== Admin Routes ====================

// Create payment configuration
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityPaymentConfigService.createConfig({
        organizationId: req.user!.organizationId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Payment configuration created successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List payment configurations
router.get(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await universityPaymentConfigService.listConfigs({
        organizationId: req.user!.organizationId,
        universityId: req.query.universityId as string,
        collegeId: req.query.collegeId as string,
        feeType: req.query.feeType as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
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

// Get payment configuration by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityPaymentConfigService.getConfigById(req.params.id);

      res.json({
        success: true,
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get payment configs for a university (for display in forms)
router.get(
  '/university/:universityId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const configs = await universityPaymentConfigService.getConfigsForUniversity(
        req.user!.organizationId,
        req.params.universityId,
        req.query.collegeId as string,
        req.query.courseId as string
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

// Update payment configuration
router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateConfigSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const config = await universityPaymentConfigService.updateConfig(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Payment configuration updated successfully',
        data: config,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete payment configuration
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await universityPaymentConfigService.deleteConfig(req.params.id);

      res.json({
        success: true,
        message: 'Payment configuration deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// Bulk create configurations for a university
router.post(
  '/bulk',
  authenticate,
  authorize(['admin']),
  validateRequest(bulkCreateSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await universityPaymentConfigService.bulkCreateConfigs(
        req.user!.organizationId,
        req.body.universityId,
        req.body.configs
      );

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      res.status(201).json({
        success: true,
        message: `Created ${successCount} configurations, ${failCount} failed`,
        data: results,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
