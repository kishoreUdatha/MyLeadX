/**
 * Messaging Portal Routes
 * Standalone messaging portal for non-CRM users
 */

import { Router, Request, Response, NextFunction } from 'express';
import { body, query, param } from 'express-validator';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import {
  messageCreditsService,
  bulkMessagingService,
  contactsService,
  smsService,
  whatsappService,
} from '../services/messaging';
import { MessageChannel, BulkRecipientSource, BulkMessageJobStatus, TemplateType } from '@prisma/client';
import { prisma } from '../config/database';
import bcrypt from 'bcryptjs';
import settingsRoutes from './messaging-portal-settings.routes';

const router = Router();

// Async handler wrapper
const asyncHandler =
  (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<any>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// ==================== PUBLIC ROUTES (No Auth Required) ====================

/**
 * POST /messaging-portal/register
 * Register a new messaging portal account
 */
router.post(
  '/register',
  validate([
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('phone').trim().notEmpty().withMessage('Phone is required'),
    body('companyName').trim().notEmpty().withMessage('Company name is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { name, email, phone, companyName, password } = req.body;

      // Check if email already exists
      const existingUser = await prisma.user.findFirst({
        where: { email },
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already registered',
        });
      }

      // Generate a slug from company name
      const baseSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      // Check for unique slug
      let slug = baseSlug;
      let counter = 1;
      while (await prisma.organization.findUnique({ where: { slug } })) {
        slug = `${baseSlug}-${counter}`;
        counter++;
      }

      // Split name into first and last name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || nameParts[0];

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create organization and user in a transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get or create the default role
        let ownerRole = await tx.role.findFirst({
          where: { slug: 'owner' },
        });

        if (!ownerRole) {
          ownerRole = await tx.role.create({
            data: {
              name: 'Owner',
              slug: 'owner',
              description: 'Organization owner with full access',
              permissions: ['*'],
              isSystem: true,
            },
          });
        }

        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: companyName,
            slug,
            settings: {
              currency: 'INR',
              timezone: 'Asia/Kolkata',
            },
          },
        });

        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            organizationId: organization.id,
            roleId: ownerRole.id,
            isActive: true,
            onboardingCompleted: true, // Skip onboarding for messaging portal users
          },
        });

        // Initialize message credits with 0 balance
        await tx.messageCreditBalance.create({
          data: {
            organizationId: organization.id,
            smsCredits: 0,
            whatsappCredits: 0,
            rcsCredits: 0,
          },
        });

        return { organization, user };
      });

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please login.',
        data: {
          email: result.user.email,
        },
      });
    } catch (error: any) {
      console.error('[MessagingPortal] Registration error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Registration failed',
      });
    }
  }
);

// Apply authentication and tenant middleware to all routes below
router.use(authenticate);
router.use(tenantMiddleware);

// Mount settings routes
router.use('/settings', settingsRoutes);

// ==================== DASHBOARD ====================

/**
 * GET /messaging-portal/dashboard
 * Get dashboard data
 */
router.get(
  '/dashboard',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    // Get balance
    const balance = await messageCreditsService.getBalance(organizationId);

    // Get contact count
    const contactCount = await contactsService.getContactCount(organizationId);

    // Get recent campaigns
    const recentCampaigns = await bulkMessagingService.listJobs(organizationId, {
      limit: 5,
    });

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await prisma.bulkMessageLog.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: { gte: today },
      },
      _count: true,
    });

    const sentToday = todayStats.reduce((sum, s) => sum + s._count, 0);
    const deliveredToday = todayStats.find((s) => s.status === 'DELIVERED')?._count || 0;

    res.json({
      success: true,
      data: {
        balance,
        contactCount,
        recentCampaigns: recentCampaigns.jobs,
        todayStats: {
          sent: sentToday,
          delivered: deliveredToday,
          deliveryRate: sentToday > 0 ? Math.round((deliveredToday / sentToday) * 100) : 0,
        },
      },
    });
  })
);

// ==================== CONTACTS ====================

/**
 * GET /messaging-portal/contacts
 * List contacts
 */
router.get(
  '/contacts',
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
 * GET /messaging-portal/contacts/:id
 * Get a contact
 */
router.get(
  '/contacts/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const contact = await contactsService.getContact(req.params.id);

    if (!contact || contact.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    res.json({
      success: true,
      data: contact,
    });
  })
);

/**
 * POST /messaging-portal/contacts
 * Create a contact
 */
router.post(
  '/contacts',
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
 * POST /messaging-portal/contacts/bulk
 * Bulk create contacts
 */
router.post(
  '/contacts/bulk',
  validate([
    body('contacts').isArray({ min: 1, max: 10000 }),
    body('contacts.*.phone').notEmpty(),
    body('contacts.*.name').optional().isString(),
    body('contacts.*.email').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { contacts } = req.body;
    let created = 0;
    let skipped = 0;

    for (const contact of contacts) {
      try {
        await contactsService.createContact({
          organizationId: req.user!.organizationId,
          phone: contact.phone,
          name: contact.name,
          email: contact.email,
        });
        created++;
      } catch (error: any) {
        // Skip duplicates
        if (error.message?.includes('already exists')) {
          skipped++;
        } else {
          console.error('[Contacts] Bulk create error:', error.message);
          skipped++;
        }
      }
    }

    res.json({
      success: true,
      data: { created, skipped },
      message: `Created ${created} contacts, skipped ${skipped}`,
    });
  })
);

/**
 * PUT /messaging-portal/contacts/:id
 * Update a contact
 */
router.put(
  '/contacts/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().isString(),
    body('email').optional().isEmail(),
    body('customFields').optional().isObject(),
    body('groupIds').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const contact = await contactsService.getContact(req.params.id);

    if (!contact || contact.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    const { name, email, customFields, groupIds } = req.body;

    const updated = await contactsService.updateContact(req.params.id, {
      name,
      email,
      customFields,
      groupIds,
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /messaging-portal/contacts/:id
 * Delete a contact
 */
router.delete(
  '/contacts/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const contact = await contactsService.getContact(req.params.id);

    if (!contact || contact.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    await contactsService.deleteContact(req.params.id);

    res.json({
      success: true,
      message: 'Contact deleted',
    });
  })
);

/**
 * POST /messaging-portal/contacts/upload
 * Upload contacts from CSV
 */
router.post(
  '/contacts/upload',
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
 * GET /messaging-portal/contacts/uploads
 * List contact uploads
 */
router.get(
  '/contacts/uploads',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await contactsService.listUploads(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /messaging-portal/contacts/export
 * Export contacts to CSV
 */
router.get(
  '/contacts/export',
  validate([query('groupId').optional().isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId } = req.query;

    const csv = await contactsService.exportContacts(
      req.user!.organizationId,
      groupId as string | undefined
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=contacts.csv');
    res.send(csv);
  })
);

// ==================== GROUPS ====================

/**
 * GET /messaging-portal/groups
 * List contact groups
 */
router.get(
  '/groups',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const groups = await contactsService.listGroups(req.user!.organizationId);

    res.json({
      success: true,
      data: groups,
    });
  })
);

/**
 * GET /messaging-portal/groups/:id
 * Get a group
 */
router.get(
  '/groups/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    res.json({
      success: true,
      data: group,
    });
  })
);

/**
 * POST /messaging-portal/groups
 * Create a group
 */
router.post(
  '/groups',
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
 * PUT /messaging-portal/groups/:id
 * Update a group
 */
router.put(
  '/groups/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().isString(),
    body('description').optional().isString(),
    body('color').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const { name, description, color } = req.body;
    const updated = await contactsService.updateGroup(req.params.id, { name, description, color });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /messaging-portal/groups/:id
 * Delete a group
 */
router.delete(
  '/groups/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    await contactsService.deleteGroup(req.params.id);

    res.json({
      success: true,
      message: 'Group deleted',
    });
  })
);

/**
 * GET /messaging-portal/groups/:id/contacts
 * Get contacts in a group
 */
router.get(
  '/groups/:id/contacts',
  validate([
    param('id').isUUID(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const { page = 1, limit = 50, search } = req.query;

    const result = await contactsService.getGroupContacts(req.params.id, {
      page: Number(page),
      limit: Number(limit),
      search: search as string | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * POST /messaging-portal/groups/:id/contacts
 * Add contacts to a group
 */
router.post(
  '/groups/:id/contacts',
  validate([param('id').isUUID(), body('contactIds').isArray({ min: 1 })]),
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

/**
 * DELETE /messaging-portal/groups/:id/contacts
 * Remove contacts from a group
 */
router.delete(
  '/groups/:id/contacts',
  validate([param('id').isUUID(), body('contactIds').isArray({ min: 1 })]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const group = await contactsService.getGroup(req.params.id);

    if (!group || group.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Group not found',
      });
    }

    const { contactIds } = req.body;
    const result = await contactsService.removeContactsFromGroup(req.params.id, contactIds);

    res.json({
      success: true,
      data: result,
    });
  })
);

// ==================== CAMPAIGNS ====================

/**
 * GET /messaging-portal/campaigns
 * List campaigns
 */
router.get(
  '/campaigns',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(Object.values(BulkMessageJobStatus)),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, status, channel } = req.query;

    const result = await bulkMessagingService.listJobs(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
      status: status as BulkMessageJobStatus | undefined,
      channel: channel as MessageChannel | undefined,
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /messaging-portal/campaigns/:id
 * Get campaign details
 */
router.get(
  '/campaigns/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
      });
    }

    res.json({
      success: true,
      data: job,
    });
  })
);

/**
 * POST /messaging-portal/campaigns
 * Create a campaign
 */
router.post(
  '/campaigns',
  validate([
    body('channel').isIn(['SMS', 'WHATSAPP', 'RCS']),
    body('name').optional().isString(),
    body('templateId').optional().isUUID(),
    body('message').optional().isString().isLength({ min: 1, max: 1600 }),
    body('recipientSource').isIn(['LIST', 'CSV', 'MANUAL']),
    body('recipientListId').optional().isUUID(),
    body('phoneNumbers').optional().isArray(),
    body('scheduledAt').optional().isISO8601(),
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
      recipientListId,
      phoneNumbers,
      scheduledAt,
      variables,
    } = req.body;

    // Validate recipient source
    if (recipientSource === 'LIST' && !recipientListId) {
      return res.status(400).json({
        success: false,
        message: 'Recipient list ID is required for LIST source',
      });
    }

    if ((recipientSource === 'CSV' || recipientSource === 'MANUAL') && (!phoneNumbers || phoneNumbers.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Phone numbers are required for CSV/MANUAL source',
      });
    }

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
      recipientListId,
      phoneNumbers,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      variables,
    });

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    res.json({
      success: true,
      data: result.job,
    });
  })
);

/**
 * POST /messaging-portal/campaigns/:id/start
 * Start a campaign
 */
router.post(
  '/campaigns/:id/start',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
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
      message: 'Campaign started',
    });
  })
);

/**
 * POST /messaging-portal/campaigns/:id/cancel
 * Cancel a campaign
 */
router.post(
  '/campaigns/:id/cancel',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const job = await bulkMessagingService.getJobStatus(req.params.id);

    if (!job || job.organizationId !== req.user!.organizationId) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found',
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
      message: 'Campaign cancelled',
    });
  })
);

/**
 * GET /messaging-portal/campaigns/:id/report
 * Get campaign delivery report
 */
router.get(
  '/campaigns/:id/report',
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
        message: 'Campaign not found',
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

// ==================== TEMPLATES ====================

/**
 * GET /messaging-portal/templates
 * List templates
 */
router.get(
  '/templates',
  validate([query('channel').optional().isIn(['SMS', 'WHATSAPP'])]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel } = req.query;

    let templates;
    if (channel === 'SMS') {
      templates = await smsService.getTemplates(req.user!.organizationId);
    } else if (channel === 'WHATSAPP') {
      templates = await whatsappService.getTemplates(req.user!.organizationId);
    } else {
      // Get all templates for this organization
      templates = await prisma.messageTemplate.findMany({
        where: {
          organizationId: req.user!.organizationId,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json({
      success: true,
      data: templates,
    });
  })
);

/**
 * POST /messaging-portal/templates
 * Create a template
 */
router.post(
  '/templates',
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('channel').isIn(['SMS', 'WHATSAPP']),
    body('content').notEmpty().isLength({ max: 1600 }),
    body('dltTemplateId').optional().isString(),
    body('whatsappTemplateId').optional().isString(),
    body('variables').optional().isArray(),
    body('category').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name, channel, content, dltTemplateId, whatsappTemplateId, variables, category } = req.body;

    let template;
    if (channel === 'SMS') {
      template = await smsService.createTemplate({
        organizationId: req.user!.organizationId,
        name,
        content,
        dltTemplateId,
        variables,
        category,
      });
    } else {
      template = await whatsappService.createTemplate({
        organizationId: req.user!.organizationId,
        name,
        content,
        whatsappTemplateId,
        variables,
        category,
      });
    }

    res.json({
      success: true,
      data: template,
    });
  })
);

/**
 * PUT /messaging-portal/templates/:id
 * Update a template
 */
router.put(
  '/templates/:id',
  validate([
    param('id').isUUID(),
    body('name').optional().isString(),
    body('content').optional().isString().isLength({ max: 1600 }),
    body('dltTemplateId').optional().isString(),
    body('whatsappTemplateId').optional().isString(),
    body('variables').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    const { name, content, dltTemplateId, whatsappTemplateId, variables } = req.body;

    const updated = await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(content && { content }),
        ...(dltTemplateId !== undefined && { dltTemplateId }),
        ...(whatsappTemplateId !== undefined && { whatsappTemplateId }),
        ...(variables && { variables }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /messaging-portal/templates/:id
 * Delete a template
 */
router.delete(
  '/templates/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Template not found',
      });
    }

    await prisma.messageTemplate.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({
      success: true,
      message: 'Template deleted',
    });
  })
);

// ==================== BILLING ====================

/**
 * GET /messaging-portal/billing/balance
 * Get credit balance
 */
router.get(
  '/billing/balance',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const balance = await messageCreditsService.getBalance(req.user!.organizationId);

    res.json({
      success: true,
      data: balance,
    });
  })
);

/**
 * GET /messaging-portal/billing/pricing
 * Get pricing
 */
router.get(
  '/billing/pricing',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const pricing = await messageCreditsService.getPricing(req.user!.organizationId);

    res.json({
      success: true,
      data: pricing,
    });
  })
);

/**
 * POST /messaging-portal/billing/purchase
 * Purchase credits
 */
router.post(
  '/billing/purchase',
  validate([
    body('channel').isIn(['SMS', 'WHATSAPP', 'RCS']),
    body('quantity').isInt({ min: 100 }),
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
 * POST /messaging-portal/billing/purchase/confirm
 * Confirm purchase payment
 */
router.post(
  '/billing/purchase/confirm',
  validate([
    body('purchaseId').notEmpty(),
    body('razorpayPaymentId').notEmpty(),
    body('razorpaySignature').notEmpty(),
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

    const balance = await messageCreditsService.getBalance(req.user!.organizationId);

    res.json({
      success: true,
      message: 'Credits added successfully',
      data: { balance },
    });
  })
);

/**
 * GET /messaging-portal/billing/transactions
 * Get transaction history
 */
router.get(
  '/billing/transactions',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50 } = req.query;

    const result = await messageCreditsService.getTransactionHistory(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

/**
 * GET /messaging-portal/billing/purchases
 * Get purchase history
 */
router.get(
  '/billing/purchases',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20 } = req.query;

    const result = await messageCreditsService.getPurchaseHistory(req.user!.organizationId, {
      page: Number(page),
      limit: Number(limit),
    });

    res.json({
      success: true,
      data: result,
    });
  })
);

// ==================== DASHBOARD CHARTS ====================

/**
 * GET /messaging-portal/dashboard/trends
 * Get message trends for last 7 days
 */
router.get(
  '/dashboard/trends',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    // Get last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Get message logs grouped by day
    const trends = await Promise.all(
      days.map(async (day) => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);

        const logs = await prisma.bulkMessageLog.groupBy({
          by: ['status'],
          where: {
            organizationId,
            createdAt: {
              gte: day,
              lt: nextDay,
            },
          },
          _count: true,
        });

        const sent = logs.reduce((sum, l) => sum + l._count, 0);
        const delivered = logs.find((l) => l.status === 'DELIVERED')?._count || 0;
        const failed = logs.find((l) => l.status === 'FAILED')?._count || 0;

        return {
          name: dayNames[day.getDay()],
          date: day.toISOString().split('T')[0],
          sent,
          delivered,
          failed,
        };
      })
    );

    res.json({
      success: true,
      data: trends,
    });
  })
);

/**
 * GET /messaging-portal/dashboard/channel-stats
 * Get channel distribution stats
 */
router.get(
  '/dashboard/channel-stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    // Get message counts by channel
    const channelStats = await prisma.bulkMessageLog.groupBy({
      by: ['channel'],
      where: {
        organizationId,
      },
      _count: true,
    });

    const distribution = [
      {
        name: 'SMS',
        value: channelStats.find((c) => c.channel === 'SMS')?._count || 0,
        color: '#3B82F6',
      },
      {
        name: 'WhatsApp',
        value: channelStats.find((c) => c.channel === 'WHATSAPP')?._count || 0,
        color: '#22C55E',
      },
      {
        name: 'RCS',
        value: channelStats.find((c) => c.channel === 'RCS')?._count || 0,
        color: '#8B5CF6',
      },
    ];

    // Get total messages per channel for all time
    const totalByChannel = await prisma.bulkMessageJob.groupBy({
      by: ['channel'],
      where: { organizationId },
      _sum: {
        totalCount: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
      },
    });

    res.json({
      success: true,
      data: {
        distribution,
        totalByChannel: totalByChannel.map((c) => ({
          channel: c.channel,
          total: c._sum.totalCount || 0,
          sent: c._sum.sentCount || 0,
          delivered: c._sum.deliveredCount || 0,
          failed: c._sum.failedCount || 0,
        })),
      },
    });
  })
);

// ==================== REPORTS ====================

/**
 * GET /messaging-portal/reports/summary
 * Get messaging summary report
 */
router.get(
  '/reports/summary',
  validate([
    query('fromDate').optional().isISO8601(),
    query('toDate').optional().isISO8601(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { fromDate, toDate, channel } = req.query;

    const where: any = {
      organizationId: req.user!.organizationId,
    };

    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = new Date(fromDate as string);
      if (toDate) where.createdAt.lte = new Date(toDate as string);
    }

    if (channel) {
      where.channel = channel;
    }

    // Get message stats
    const stats = await prisma.bulkMessageLog.groupBy({
      by: ['status', 'channel'],
      where,
      _count: true,
    });

    // Get campaign stats
    const campaigns = await prisma.bulkMessageJob.aggregate({
      where: {
        organizationId: req.user!.organizationId,
        createdAt: where.createdAt,
        channel: channel ? (channel as MessageChannel) : undefined,
      },
      _count: true,
      _sum: {
        totalCount: true,
        sentCount: true,
        deliveredCount: true,
        failedCount: true,
      },
    });

    res.json({
      success: true,
      data: {
        messageStats: stats,
        campaignStats: {
          totalCampaigns: campaigns._count,
          totalMessages: campaigns._sum.totalCount || 0,
          sent: campaigns._sum.sentCount || 0,
          delivered: campaigns._sum.deliveredCount || 0,
          failed: campaigns._sum.failedCount || 0,
        },
      },
    });
  })
);

export default router;
