import { Router } from 'express';
import { partnerService } from '../services/partner.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// Apply for partnership
router.post(
  '/apply',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.applyForPartnership({
      organizationId,
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Partnership application submitted successfully',
      data: partner,
    });
  })
);

// Get current partner profile
router.get(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    res.json({
      success: true,
      data: partner,
    });
  })
);

// Update partner profile
router.put(
  '/profile',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const updated = await partnerService.updatePartner(partner.id, req.body);

    res.json({
      success: true,
      message: 'Partner profile updated',
      data: updated,
    });
  })
);

// Get partner dashboard
router.get(
  '/dashboard',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const dashboard = await partnerService.getPartnerDashboard(partner.id);

    res.json({
      success: true,
      data: dashboard,
    });
  })
);

// Get partner customers
router.get(
  '/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerCustomers(partner.id, {
      status: status as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.customers,
      pagination: result.pagination,
    });
  })
);

// Add customer
router.post(
  '/customers',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { customerOrgId, planId } = req.body;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const customer = await partnerService.addCustomer(partner.id, customerOrgId, planId);

    res.status(201).json({
      success: true,
      message: 'Customer added successfully',
      data: customer,
    });
  })
);

// Remove customer
router.delete(
  '/customers/:customerOrgId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { customerOrgId } = req.params;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    await partnerService.removeCustomer(partner.id, customerOrgId);

    res.json({
      success: true,
      message: 'Customer removed',
    });
  })
);

// Get commissions
router.get(
  '/commissions',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, startDate, endDate, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerCommissions(partner.id, {
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.commissions,
      stats: result.stats,
      pagination: result.pagination,
    });
  })
);

// Get payouts
router.get(
  '/payouts',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const result = await partnerService.getPartnerPayouts(partner.id, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.payouts,
      pagination: result.pagination,
    });
  })
);

// Request payout
router.post(
  '/payouts/request',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const payout = await partnerService.createPayout(partner.id);

    res.status(201).json({
      success: true,
      message: 'Payout request created',
      data: payout,
    });
  })
);

// Get bank details
router.get(
  '/bank-details',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const bankDetails = await partnerService.getBankDetails(partner.id);

    res.json({
      success: true,
      data: bankDetails,
    });
  })
);

// Update bank details
router.put(
  '/bank-details',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const partner = await partnerService.getPartnerByOrgId(organizationId);

    if (!partner) {
      throw new AppError('Partner profile not found', 404);
    }

    const bankDetails = await partnerService.updateBankDetails(partner.id, req.body);

    res.json({
      success: true,
      message: 'Bank details updated',
      data: bankDetails,
    });
  })
);

// ==================== ADMIN ROUTES ====================

// List all partners (admin)
router.get(
  '/admin/list',
  authenticate,
  asyncHandler(async (req, res) => {
    // Check if user is admin
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const { status, tier, type, page, limit, search } = req.query;

    const result = await partnerService.listPartners({
      status: status as any,
      tier: tier as any,
      type: type as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      search: search as string,
    });

    res.json({
      success: true,
      data: result.partners,
      pagination: result.pagination,
    });
  })
);

// Get partner details (admin)
router.get(
  '/admin/:partnerId',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const partner = await partnerService.getPartnerById(req.params.partnerId);

    if (!partner) {
      throw new AppError('Partner not found', 404);
    }

    res.json({
      success: true,
      data: partner,
    });
  })
);

// Approve partner (admin)
router.post(
  '/admin/:partnerId/approve',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const partner = await partnerService.approvePartner(
      req.params.partnerId,
      req.user!.id
    );

    res.json({
      success: true,
      message: 'Partner approved',
      data: partner,
    });
  })
);

// Reject partner (admin)
router.post(
  '/admin/:partnerId/reject',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const { reason } = req.body;

    const partner = await partnerService.rejectPartner(req.params.partnerId, reason);

    res.json({
      success: true,
      message: 'Partner rejected',
      data: partner,
    });
  })
);

// Update partner tier (admin)
router.put(
  '/admin/:partnerId/tier',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const { tier } = req.body;

    const partner = await partnerService.updatePartnerTier(req.params.partnerId, tier);

    res.json({
      success: true,
      message: 'Partner tier updated',
      data: partner,
    });
  })
);

// Process payout (admin)
router.post(
  '/admin/payouts/:payoutId/process',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const { transactionId, paymentMethod } = req.body;

    const payout = await partnerService.processPayout(req.params.payoutId, {
      transactionId,
      paymentMethod,
      processedBy: req.user!.id,
    });

    res.json({
      success: true,
      message: 'Payout processed',
      data: payout,
    });
  })
);

export default router;
