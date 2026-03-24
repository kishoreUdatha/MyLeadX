import { Router, Response } from 'express';
import { body, param, query } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { leadController } from '../controllers/lead.controller';
import { validate } from '../middlewares/validate';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { uploadSpreadsheet } from '../middlewares/upload';
import { ApiResponse } from '../utils/apiResponse';

const prisma = new PrismaClient();

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate);
router.use(tenantMiddleware);

// Validation rules
const createLeadValidation = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Invalid email format'),
  body('phone').trim().notEmpty().withMessage('Phone number is required'),
  body('alternatePhone').optional().trim(),
  body('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  body('status').optional().isIn([
    'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'FOLLOW_UP'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('notes').optional().trim(),
];

const updateLeadValidation = [
  param('id').isUUID().withMessage('Invalid lead ID'),
  body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().trim(),
  body('email').optional().trim().isEmail().withMessage('Invalid email format'),
  body('phone').optional().trim().notEmpty().withMessage('Phone cannot be empty'),
  body('status').optional().isIn([
    'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'FOLLOW_UP'
  ]),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
];

const assignLeadValidation = [
  param('id').isUUID().withMessage('Invalid lead ID'),
  body('assignedToId').isUUID().withMessage('Invalid counselor ID'),
];

const listLeadsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('status').optional().isIn([
    'NEW', 'CONTACTED', 'QUALIFIED', 'NEGOTIATION', 'WON', 'LOST', 'FOLLOW_UP'
  ]),
  query('source').optional().isIn([
    'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
    'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
  ]),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('assignedToId').optional().isUUID(),
  query('dateFrom').optional().isISO8601(),
  query('dateTo').optional().isISO8601(),
];

// Routes
router.get('/stats', leadController.getStats.bind(leadController));

router.post(
  '/bulk-upload',
  authorize('admin', 'counselor'),
  uploadSpreadsheet.single('file'),
  leadController.bulkUpload.bind(leadController)
);

// Bulk assign leads to counselors - must be before /:id routes
router.post(
  '/assign-bulk',
  authorize('admin'),
  [
    body('source').optional().isIn([
      'MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT',
      'AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'REFERRAL', 'WEBSITE', 'OTHER'
    ]),
    body('counselorIds').isArray({ min: 1 }).withMessage('At least one counselor is required'),
    body('counselorIds.*').isUUID().withMessage('Invalid counselor ID'),
  ],
  validate([]),
  leadController.assignBulk.bind(leadController)
);

router.post(
  '/',
  validate(createLeadValidation),
  leadController.create.bind(leadController)
);

router.get(
  '/',
  validate(listLeadsValidation),
  leadController.findAll.bind(leadController)
);

router.get(
  '/:id',
  param('id').isUUID().withMessage('Invalid lead ID'),
  leadController.findById.bind(leadController)
);

router.put(
  '/:id',
  validate(updateLeadValidation),
  leadController.update.bind(leadController)
);

// PATCH for partial updates (same as PUT but for mobile app compatibility)
router.patch(
  '/:id',
  validate(updateLeadValidation),
  leadController.update.bind(leadController)
);

router.delete(
  '/:id',
  authorize('admin'),
  param('id').isUUID().withMessage('Invalid lead ID'),
  leadController.delete.bind(leadController)
);

router.put(
  '/:id/assign',
  authorize('admin'),
  validate(assignLeadValidation),
  leadController.assign.bind(leadController)
);

// Add note to lead
router.post(
  '/:id/notes',
  [
    param('id').isUUID().withMessage('Invalid lead ID'),
    body('content').trim().notEmpty().withMessage('Note content is required'),
  ],
  validate([]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user!.id;

      // Verify lead exists and belongs to org
      const lead = await prisma.lead.findFirst({
        where: { id, organizationId: req.organization!.id },
      });

      if (!lead) {
        return ApiResponse.error(res, 'Lead not found', 404);
      }

      const note = await prisma.leadNote.create({
        data: {
          leadId: id,
          userId,
          content,
        },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      // Log activity
      await prisma.leadActivity.create({
        data: {
          leadId: id,
          type: 'NOTE_ADDED',
          title: 'Note Added',
          description: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
          userId,
        },
      });

      ApiResponse.success(res, 'Note added', note);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

// Get lead notes
router.get(
  '/:id/notes',
  param('id').isUUID().withMessage('Invalid lead ID'),
  async (req: TenantRequest, res: Response) => {
    try {
      const { id } = req.params;

      const notes = await prisma.leadNote.findMany({
        where: { leadId: id },
        include: {
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      ApiResponse.success(res, 'Notes retrieved', notes);
    } catch (error) {
      ApiResponse.error(res, (error as Error).message, 500);
    }
  }
);

export default router;
