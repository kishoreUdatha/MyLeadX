import { Router, Request, Response, NextFunction } from 'express';
import { admissionPartnerService } from '../services/admission-partner.service';
import { applicationPaymentService } from '../services/application-payment.service';
import { authenticate, authorize, optionalAuth } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const createPartnerSchema = z.object({
  body: z.object({
    partnerType: z.enum(['SUPER_PARTNER', 'SUB_PARTNER', 'AGENT', 'REFERRER']).optional(),
    tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Phone must be at least 10 characters'),
    altPhone: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    companyName: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    parentPartnerId: z.string().uuid().optional(),
    defaultCommissionPercent: z.number().min(0).max(100).optional(),
  }),
});

const updatePartnerSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    email: z.string().email().optional(),
    phone: z.string().min(10).optional(),
    altPhone: z.string().optional(),
    companyName: z.string().optional(),
    gstNumber: z.string().optional(),
    panNumber: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    defaultCommissionPercent: z.number().min(0).max(100).optional(),
  }),
});

const updateStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'BLOCKED']),
    reason: z.string().optional(),
    suspendedUntil: z.string().datetime().optional(),
  }),
});

const updateTierSchema = z.object({
  body: z.object({
    tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']),
  }),
});

const assignCollegeAccessSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    commissionOverride: z.number().min(0).max(100).optional(),
  }),
});

const createCommissionRuleSchema = z.object({
  body: z.object({
    partnerId: z.string().uuid().optional(),
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    bronzePercent: z.number().min(0).max(100),
    silverPercent: z.number().min(0).max(100),
    goldPercent: z.number().min(0).max(100),
    platinumPercent: z.number().min(0).max(100),
    superPartnerSplitPercent: z.number().min(0).max(100).optional(),
    subPartnerSplitPercent: z.number().min(0).max(100).optional(),
    agentSplitPercent: z.number().min(0).max(100).optional(),
  }),
});

const partnerLoginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
  }),
});

const resetPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8),
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

const listPartnersSchema = z.object({
  query: z.object({
    status: z.enum(['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'BLOCKED']).optional(),
    tier: z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']).optional(),
    type: z.enum(['SUPER_PARTNER', 'SUB_PARTNER', 'AGENT', 'REFERRER']).optional(),
    parentPartnerId: z.string().optional(),
    page: z.string().transform(Number).optional(),
    limit: z.string().transform(Number).optional(),
    search: z.string().optional(),
  }),
});

// ==================== Admin Routes (CRM) ====================

// Create new partner (Admin)
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createPartnerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.createPartner({
        organizationId: req.user!.organizationId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Partner created successfully',
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List partners (Admin)
router.get(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(listPartnersSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.listPartners({
        organizationId: req.user!.organizationId,
        status: req.query.status as any,
        tier: req.query.tier as any,
        type: req.query.type as any,
        parentPartnerId: req.query.parentPartnerId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 10,
        search: req.query.search as string,
      });

      res.json({
        success: true,
        data: result.partners,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Stats Route (Admin) ====================
// NOTE: This route MUST be defined BEFORE /:id routes to avoid Express matching "stats" as an ID

// Get partner statistics for organization (Admin)
router.get(
  '/stats',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await admissionPartnerService.getPartnerStats(req.user!.organizationId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Payout Management (Admin) ====================
// NOTE: These routes MUST be defined BEFORE /:id routes to avoid Express matching "payouts" as an ID

// Get all pending payouts (Admin)
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

// Get all payouts with filters (Admin)
router.get(
  '/payouts',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, partnerId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const payouts = await applicationPaymentService.getAllPayouts({
        organizationId: req.user!.organizationId,
        status: status as string,
        partnerId: partnerId as string,
        startDate: startDate as string,
        endDate: endDate as string,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        ...payouts,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Approve payout request (Admin)
router.post(
  '/payouts/:payoutId/approve',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.approvePayout(
        req.params.payoutId,
        req.user!.id,
        req.body.notes
      );

      res.json({
        success: true,
        message: 'Payout approved successfully',
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reject payout request (Admin)
router.post(
  '/payouts/:payoutId/reject',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.rejectPayoutRequest(
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

// Mark payout as completed/processed (Admin)
router.post(
  '/payouts/:payoutId/complete',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payout = await applicationPaymentService.completePayout(
        req.params.payoutId,
        req.user!.id,
        {
          transactionId: req.body.transactionId,
          paymentMethod: req.body.paymentMethod,
          notes: req.body.notes,
        }
      );

      res.json({
        success: true,
        message: 'Payout marked as completed',
        data: payout,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Partner CRUD Routes (with :id parameter) ====================

// Get partner by ID (Admin)
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.getPartnerById(req.params.id);

      if (!partner) {
        return res.status(404).json({
          success: false,
          message: 'Partner not found',
        });
      }

      res.json({
        success: true,
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update partner (Admin)
router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updatePartnerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.updatePartner(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Partner updated successfully',
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update partner status (Admin)
router.patch(
  '/:id/status',
  authenticate,
  authorize(['admin']),
  validateRequest(updateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.updatePartnerStatus(
        req.params.id,
        req.body.status,
        req.body.reason,
        req.body.suspendedUntil ? new Date(req.body.suspendedUntil) : undefined
      );

      res.json({
        success: true,
        message: `Partner status updated to ${req.body.status}`,
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update partner tier (Admin)
router.patch(
  '/:id/tier',
  authenticate,
  authorize(['admin']),
  validateRequest(updateTierSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const partner = await admissionPartnerService.updatePartnerTier(req.params.id, req.body.tier);

      res.json({
        success: true,
        message: `Partner tier updated to ${req.body.tier}`,
        data: partner,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Reset partner password (Admin)
router.post(
  '/:id/reset-password',
  authenticate,
  authorize(['admin']),
  validateRequest(resetPasswordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await admissionPartnerService.resetPassword(req.params.id, req.body.newPassword);

      res.json({
        success: true,
        message: 'Partner password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== College Access Routes ====================

// Assign college access (Admin)
router.post(
  '/:id/college-access',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(assignCollegeAccessSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = await admissionPartnerService.assignCollegeAccess({
        partnerId: req.params.id,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'College access assigned successfully',
        data: access,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get partner's college access (Admin)
router.get(
  '/:id/college-access',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const access = await admissionPartnerService.getPartnerCollegeAccess(req.params.id);

      res.json({
        success: true,
        data: access,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Remove college access (Admin)
router.delete(
  '/:id/college-access/:accessId',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await admissionPartnerService.removeCollegeAccess(req.params.accessId);

      res.json({
        success: true,
        message: 'College access removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Commission Rules Routes ====================

// Create commission rule (Admin)
router.post(
  '/commission-rules',
  authenticate,
  authorize(['admin']),
  validateRequest(createCommissionRuleSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await admissionPartnerService.createCommissionRule({
        organizationId: req.user!.organizationId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Commission rule created successfully',
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Bank Details Routes ====================

// Get partner bank details (Admin)
router.get(
  '/:id/bank-details',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankDetails = await admissionPartnerService.getBankDetails(req.params.id);

      res.json({
        success: true,
        data: bankDetails,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Verify bank details (Admin)
router.post(
  '/:id/bank-details/:bankDetailsId/verify',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const bankDetails = await admissionPartnerService.verifyBankDetails(
        req.params.bankDetailsId,
        req.user!.id
      );

      res.json({
        success: true,
        message: 'Bank details verified successfully',
        data: bankDetails,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Activity Logs ====================

// Get partner activity logs (Admin)
router.get(
  '/:id/activity-logs',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.getActivityLogs(req.params.id, {
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

// ==================== Applications ====================

// Get partner applications (Admin)
router.get(
  '/:id/applications',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.getPartnerApplications(req.params.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        status: req.query.status as string,
        universityId: req.query.universityId as string,
        collegeId: req.query.collegeId as string,
        search: req.query.search as string,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Earnings ====================

// Get partner earnings/commission history (Admin)
router.get(
  '/:id/earnings',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.getPartnerEarnings(req.params.id, {
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ==================== Team Management ====================

// Get team members (Admin)
router.get(
  '/:id/team',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await admissionPartnerService.getTeamMembers(req.params.id, {
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

export default router;
