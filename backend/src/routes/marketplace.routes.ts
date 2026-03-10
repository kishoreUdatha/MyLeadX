import { Router } from 'express';
import { marketplaceService } from '../services/marketplace.service';
import { authenticate, optionalAuth } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/errors';

const router = Router();

// ==================== PUBLIC ROUTES ====================

// List marketplace templates
router.get(
  '/templates',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const {
      industry,
      category,
      priceType,
      search,
      featured,
      sortBy,
      page,
      limit,
    } = req.query;

    const result = await marketplaceService.listTemplates({
      industry: industry as any,
      category: category as string,
      priceType: priceType as any,
      search: search as string,
      featured: featured === 'true',
      sortBy: sortBy as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
    });
  })
);

// Get featured templates
router.get(
  '/featured',
  asyncHandler(async (req, res) => {
    const { limit } = req.query;

    const templates = await marketplaceService.getFeaturedTemplates(
      limit ? parseInt(limit as string) : undefined
    );

    res.json({
      success: true,
      data: templates,
    });
  })
);

// Get categories
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const categories = await marketplaceService.getCategories();

    res.json({
      success: true,
      data: categories,
    });
  })
);

// Get marketplace stats
router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const stats = await marketplaceService.getMarketplaceStats();

    res.json({
      success: true,
      data: stats,
    });
  })
);

// Get template by slug
router.get(
  '/templates/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const template = await marketplaceService.getTemplateBySlug(req.params.slug);

    res.json({
      success: true,
      data: template,
    });
  })
);

// Get template reviews
router.get(
  '/templates/:templateId/reviews',
  asyncHandler(async (req, res) => {
    const { page, limit } = req.query;

    const result = await marketplaceService.getTemplateReviews(req.params.templateId, {
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.reviews,
      ratingDistribution: result.ratingDistribution,
      pagination: result.pagination,
    });
  })
);

// ==================== AUTHENTICATED ROUTES ====================

// Get my templates (as creator)
router.get(
  '/my-templates',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const result = await marketplaceService.getCreatorTemplates(organizationId, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.templates,
      pagination: result.pagination,
    });
  })
);

// Create template
router.post(
  '/templates',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.createTemplate({
      creatorId: organizationId,
      creatorType: 'ORGANIZATION',
      ...req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Template created',
      data: template,
    });
  })
);

// Update template
router.put(
  '/templates/:templateId',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.updateTemplate(
      req.params.templateId,
      organizationId,
      req.body
    );

    res.json({
      success: true,
      message: 'Template updated',
      data: template,
    });
  })
);

// Submit template for review
router.post(
  '/templates/:templateId/submit',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.submitForReview(
      req.params.templateId,
      organizationId
    );

    res.json({
      success: true,
      message: 'Template submitted for review',
      data: template,
    });
  })
);

// Publish template
router.post(
  '/templates/:templateId/publish',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const template = await marketplaceService.publishTemplate(
      req.params.templateId,
      organizationId
    );

    res.json({
      success: true,
      message: 'Template published',
      data: template,
    });
  })
);

// ==================== LICENSE ROUTES ====================

// Get my licenses
router.get(
  '/licenses',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { status, page, limit } = req.query;

    const result = await marketplaceService.getUserLicenses(organizationId, {
      status: status as any,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({
      success: true,
      data: result.licenses,
      pagination: result.pagination,
    });
  })
);

// Purchase agent
router.post(
  '/purchase',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { templateId, paymentId, invoiceId } = req.body;

    const license = await marketplaceService.purchaseAgent({
      templateId,
      organizationId,
      paymentId,
      invoiceId,
    });

    res.status(201).json({
      success: true,
      message: 'Agent purchased successfully',
      data: license,
    });
  })
);

// Install agent from license
router.post(
  '/licenses/:licenseId/install',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { name, greeting, knowledgeBase } = req.body;

    const agent = await marketplaceService.installAgent(
      req.params.licenseId,
      organizationId,
      { name, greeting, knowledgeBase }
    );

    res.status(201).json({
      success: true,
      message: 'Agent installed successfully',
      data: agent,
    });
  })
);

// Add review
router.post(
  '/templates/:templateId/reviews',
  authenticate,
  asyncHandler(async (req, res) => {
    const { organizationId, id: userId } = req.user!;
    const { rating, title, content } = req.body;

    if (rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    const review = await marketplaceService.addReview({
      templateId: req.params.templateId,
      organizationId,
      userId,
      rating,
      title,
      content,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted',
      data: review,
    });
  })
);

// ==================== ADMIN ROUTES ====================

// Approve template (admin)
router.post(
  '/admin/templates/:templateId/approve',
  authenticate,
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      throw new AppError('Not authorized', 403);
    }

    const template = await marketplaceService.approveTemplate(req.params.templateId);

    res.json({
      success: true,
      message: 'Template approved',
      data: template,
    });
  })
);

export default router;
