/**
 * Messaging Credits Routes
 * Handle message credit purchases, balance, and bulk messaging
 */

import { Router, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate, authorize, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { messageCreditsService, bulkMessagingService, contactsService } from '../services/messaging';
import { MessageChannel, BulkRecipientSource, BulkMessageJobStatus } from '@prisma/client';

const router = Router();

// Async handler wrapper
const asyncHandler =
  (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ==================== CREDITS ====================

/**
 * GET /messaging-credits/balance
 * Get current message credit balance
 */
router.get(
  '/balance',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const balance = await messageCreditsService.getBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: balance,
    });
  })
);

/**
 * GET /messaging-credits/pricing
 * Get pricing for message credits
 */
router.get(
  '/pricing',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pricing = await messageCreditsService.getPricing(req.user!.organizationId);

    res.json({
      success: true,
      data: pricing,
    });
  })
);

/**
 * POST /messaging-credits/purchase
 * Create a purchase order for message credits
 */
router.post(
  '/purchase',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'manager'),
  validate([
    body('channel')
      .isIn(['SMS', 'WHATSAPP', 'RCS'])
      .withMessage('Channel must be SMS, WHATSAPP, or RCS'),
    body('quantity')
      .isInt({ min: 100 })
      .withMessage('Minimum purchase quantity is 100'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel, quantity } = req.body;

    const result = await messageCreditsService.createPurchaseOrder({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      channel: channel as MessageChannel,
      quantity,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /messaging-credits/purchase/confirm
 * Confirm payment and credit the account
 */
router.post(
  '/purchase/confirm',
  authenticate,
  tenantMiddleware,
  validate([
    body('purchaseId').notEmpty().withMessage('Purchase ID is required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID is required'),
    body('razorpaySignature').notEmpty().withMessage('Signature is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { purchaseId, razorpayPaymentId, razorpaySignature } = req.body;

    const result = await messageCreditsService.confirmPurchase({
      purchaseId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Get updated balance
    const balance = await messageCreditsService.getBalance(req.user!.organizationId);

    res.json({
      success: true,
      message: 'Credits added successfully',
      data: { balance },
    });
  })
);

/**
 * GET /messaging-credits/history
 * Get purchase history
 */
router.get(
  '/history',
  authenticate,
  tenantMiddleware,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, channel } = req.query;

    const result = await messageCreditsService.getPurchaseHistory(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      channel: channel as MessageChannel | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /messaging-credits/transactions
 * Get credit transaction history
 */
router.get(
  '/transactions',
  authenticate,
  tenantMiddleware,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50, channel } = req.query;

    const result = await messageCreditsService.getTransactionHistory(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      channel: channel as MessageChannel | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

// ==================== BULK MESSAGING ====================

/**
 * POST /messaging-credits/bulk/send
 * Create and optionally start a bulk messaging job
 */
router.post(
  '/bulk/send',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'manager'),
  validate([
    body('channel')
      .isIn(['SMS', 'WHATSAPP', 'RCS'])
      .withMessage('Channel must be SMS, WHATSAPP, or RCS'),
    body('name').optional().isString(),
    body('templateId').optional().isUUID(),
    body('message').optional().isString().isLength({ min: 1, max: 1600 }),
    body('recipientSource')
      .isIn(['FILTER', 'LIST', 'CSV', 'MANUAL'])
      .withMessage('Invalid recipient source'),
    body('recipientFilter').optional().isObject(),
    body('recipientListId').optional().isUUID(),
    body('phoneNumbers').optional().isArray(),
    body('recipients').optional().isArray(),
    body('scheduledAt').optional().isISO8601(),
    body('startImmediately').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const {
      channel,
      name,
      description,
      templateId,
      message,
      mediaUrl,
      recipientSource,
      recipientFilter,
      recipientListId,
      phoneNumbers,
      recipients,
      scheduledAt,
      startImmediately,
      variables,
      rcsRichCardPayload,
      rcsCarouselPayload,
      rcsSuggestedReplies,
    } = req.body;

    // Create the job
    const result = await bulkMessagingService.createJob({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      channel: channel as MessageChannel,
      name,
      description,
      templateId,
      message,
      mediaUrl,
      recipientSource: recipientSource as BulkRecipientSource,
      recipientFilter,
      recipientListId,
      phoneNumbers,
      recipients,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      variables,
      rcsRichCardPayload,
      rcsCarouselPayload,
      rcsSuggestedReplies,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    // Start immediately if requested
    if (startImmediately && result.job) {
      const startResult = await bulkMessagingService.startJob(result.job.id, req.user!.id);
      if (!startResult.success) {
        return res.status(400).json({
          success: false,
          message: startResult.error,
          data: { job: result.job },
        });
      }
    }

    res.json({
      success: true,
      message: startImmediately ? 'Bulk messaging job started' : 'Bulk messaging job created',
      data: result.job,
    });
  })
);

/**
 * GET /messaging-credits/bulk/jobs
 * List bulk messaging jobs
 */
router.get(
  '/bulk/jobs',
  authenticate,
  tenantMiddleware,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(Object.values(BulkMessageJobStatus)),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, status, channel, fromDate, toDate } = req.query;

    const result = await bulkMessagingService.listJobs(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      status: status as BulkMessageJobStatus | undefined,
      channel: channel as MessageChannel | undefined,
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /messaging-credits/bulk/jobs/:id
 * Get bulk job details
 */
router.get(
  '/bulk/jobs/:id',
  authenticate,
  tenantMiddleware,
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    // Verify ownership
    if (job.organizationId !== req.user!.organizationId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  })
);

/**
 * POST /messaging-credits/bulk/jobs/:id/start
 * Start a draft or scheduled job
 */
router.post(
  '/bulk/jobs/:id/start',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'manager'),
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const result = await bulkMessagingService.startJob(req.params.id, req.user!.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Job started',
    });
  })
);

/**
 * POST /messaging-credits/bulk/jobs/:id/cancel
 * Cancel a job
 */
router.post(
  '/bulk/jobs/:id/cancel',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'manager'),
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const result = await bulkMessagingService.cancelJob(req.params.id);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled',
    });
  })
);

/**
 * GET /messaging-credits/bulk/jobs/:id/report
 * Get delivery report for a job
 */
router.get(
  '/bulk/jobs/:id/report',
  authenticate,
  tenantMiddleware,
  validate([
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    query('status').optional().isIn(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
      });
    }

    const { page = 1, limit = 100, status } = req.query;

    const result = await bulkMessagingService.getJobReport(req.params.id, {
      page: Number(page),
      limit: Number(limit),
      status: status as any,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

// ==================== CONTACTS (for standalone portal) ====================

/**
 * GET /messaging-credits/contacts
 * List contacts
 */
router.get(
  '/contacts',
  authenticate,
  tenantMiddleware,
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString(),
    query('groupId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50, search, groupId } = req.query;

    const result = await contactsService.listContacts(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined,
      groupId: groupId as string | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /messaging-credits/contacts
 * Create a contact
 */
router.post(
  '/contacts',
  authenticate,
  tenantMiddleware,
  validate([
    body('phone').notEmpty().withMessage('Phone is required'),
    body('name').optional().isString(),
    body('email').optional().isEmail(),
    body('customFields').optional().isObject(),
    body('groupIds').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phone, name, email, customFields, groupIds } = req.body;

    try {
      const contact = await contactsService.createContact({
        organizationId: req.user!.organizationId,
        phone,
        name,
        email,
        customFields,
        groupIds,
      });

      res.json({
        success: true,
        data: contact,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

/**
 * POST /messaging-credits/contacts/upload
 * Upload contacts from CSV
 */
router.post(
  '/contacts/upload',
  authenticate,
  tenantMiddleware,
  authorize('admin', 'manager'),
  validate([
    body('fileName').notEmpty(),
    body('fileSize').isInt({ min: 1 }),
    body('originalName').notEmpty(),
    body('content').notEmpty(),
    body('columnMapping').isObject(),
    body('targetGroupId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fileName, fileSize, originalName, content, columnMapping, targetGroupId } = req.body;

    const upload = await contactsService.uploadCsv({
      organizationId: req.user!.organizationId,
      userId: req.user!.id,
      fileName,
      fileSize,
      originalName,
      content,
      columnMapping,
      targetGroupId,
    });

    res.json({
      success: true,
      message: 'Upload started',
      data: upload,
    });
  })
);

/**
 * GET /messaging-credits/contacts/uploads/:id
 * Get upload status
 */
router.get(
  '/contacts/uploads/:id',
  authenticate,
  tenantMiddleware,
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const upload = await contactsService.getUploadStatus(req.params.id);

    if (!upload || upload.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Upload not found',
      });
    }

    res.json({
      success: true,
      data: upload,
    });
  })
);

/**
 * GET /messaging-credits/groups
 * List contact groups
 */
router.get(
  '/groups',
  authenticate,
  tenantMiddleware,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const groups = await contactsService.listGroups(req.user!.organizationId);

    res.json({
      success: true,
      data: groups,
    });
  })
);

/**
 * POST /messaging-credits/groups
 * Create a contact group
 */
router.post(
  '/groups',
  authenticate,
  tenantMiddleware,
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('description').optional().isString(),
    body('color').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, description, color } = req.body;

    try {
      const group = await contactsService.createGroup({
        organizationId: req.user!.organizationId,
        name,
        description,
        color,
      });

      res.json({
        success: true,
        data: group,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  })
);

/**
 * POST /messaging-credits/groups/:id/contacts
 * Add contacts to a group
 */
router.post(
  '/groups/:id/contacts',
  authenticate,
  tenantMiddleware,
  validate([
    param('id').isUUID(),
    body('contactIds').isArray({ min: 1 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const { contactIds } = req.body;
    const result = await contactsService.addContactsToGroup(req.params.id, contactIds);

    res.json({
      success: true,
      data: result,
    });
  })
);

export default router;
