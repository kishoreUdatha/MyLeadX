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
import { config } from '../config';
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

// ==================== OPT-OUT MANAGEMENT ====================

/**
 * GET /messaging-portal/opt-outs
 * List contacts who have opted out
 */
router.get(
  '/opt-outs',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS', 'ALL']),
    query('search').optional().isString(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 50, channel = 'ALL', search } = req.query;
    const organizationId = req.user!.organizationId;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = { organizationId };

    // Filter by opt-out channel
    if (channel === 'SMS') {
      where.smsOptOut = true;
    } else if (channel === 'WHATSAPP') {
      where.whatsappOptOut = true;
    } else if (channel === 'RCS') {
      where.rcsOptOut = true;
    } else {
      // ALL - any opt-out
      where.OR = [
        { smsOptOut: true },
        { whatsappOptOut: true },
        { rcsOptOut: true },
      ];
    }

    // Search filter
    if (search) {
      where.AND = [
        {
          OR: [
            { phone: { contains: search } },
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [contacts, total] = await Promise.all([
      prisma.messagingContact.findMany({
        where,
        orderBy: { optOutAt: 'desc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          phone: true,
          name: true,
          email: true,
          smsOptOut: true,
          whatsappOptOut: true,
          rcsOptOut: true,
          optOutAt: true,
          createdAt: true,
        },
      }),
      prisma.messagingContact.count({ where }),
    ]);

    // Get summary stats
    const stats = await prisma.messagingContact.aggregate({
      where: { organizationId },
      _count: {
        _all: true,
      },
    });

    const smsOptOuts = await prisma.messagingContact.count({
      where: { organizationId, smsOptOut: true },
    });
    const whatsappOptOuts = await prisma.messagingContact.count({
      where: { organizationId, whatsappOptOut: true },
    });
    const rcsOptOuts = await prisma.messagingContact.count({
      where: { organizationId, rcsOptOut: true },
    });

    res.json({
      success: true,
      data: {
        contacts,
        stats: {
          totalContacts: stats._count._all,
          smsOptOuts,
          whatsappOptOuts,
          rcsOptOuts,
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  })
);

/**
 * PUT /messaging-portal/opt-outs/:id
 * Update opt-out status for a contact
 */
router.put(
  '/opt-outs/:id',
  validate([
    param('id').isUUID(),
    body('smsOptOut').optional().isBoolean(),
    body('whatsappOptOut').optional().isBoolean(),
    body('rcsOptOut').optional().isBoolean(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { smsOptOut, whatsappOptOut, rcsOptOut } = req.body;
    const organizationId = req.user!.organizationId;

    // Verify contact belongs to organization
    const contact = await prisma.messagingContact.findFirst({
      where: { id, organizationId },
    });

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found',
      });
    }

    // Determine if this is opting out or resubscribing
    const isOptingOut = smsOptOut || whatsappOptOut || rcsOptOut;
    const wasOptedOut = contact.smsOptOut || contact.whatsappOptOut || contact.rcsOptOut;

    const updated = await prisma.messagingContact.update({
      where: { id },
      data: {
        smsOptOut: smsOptOut !== undefined ? smsOptOut : contact.smsOptOut,
        whatsappOptOut: whatsappOptOut !== undefined ? whatsappOptOut : contact.whatsappOptOut,
        rcsOptOut: rcsOptOut !== undefined ? rcsOptOut : contact.rcsOptOut,
        optOutAt: isOptingOut && !wasOptedOut ? new Date() : contact.optOutAt,
      },
      select: {
        id: true,
        phone: true,
        name: true,
        email: true,
        smsOptOut: true,
        whatsappOptOut: true,
        rcsOptOut: true,
        optOutAt: true,
      },
    });

    res.json({
      success: true,
      message: 'Opt-out status updated',
      data: updated,
    });
  })
);

/**
 * POST /messaging-portal/opt-outs/bulk
 * Bulk add opt-outs (e.g., from imported list)
 */
router.post(
  '/opt-outs/bulk',
  validate([
    body('phoneNumbers').isArray({ min: 1, max: 10000 }),
    body('phoneNumbers.*').isString(),
    body('channel').isIn(['SMS', 'WHATSAPP', 'RCS']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { phoneNumbers, channel } = req.body;
    const organizationId = req.user!.organizationId;

    const optOutField = channel === 'SMS' ? 'smsOptOut' :
                        channel === 'WHATSAPP' ? 'whatsappOptOut' : 'rcsOptOut';

    let updated = 0;
    let created = 0;

    for (const phone of phoneNumbers) {
      // Normalize phone number
      let normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = '91' + normalizedPhone;
      }

      // Try to find existing contact
      const existing = await prisma.messagingContact.findUnique({
        where: {
          organizationId_phone: {
            organizationId,
            phone: normalizedPhone,
          },
        },
      });

      if (existing) {
        // Update existing contact
        await prisma.messagingContact.update({
          where: { id: existing.id },
          data: {
            [optOutField]: true,
            optOutAt: existing.optOutAt || new Date(),
          },
        });
        updated++;
      } else {
        // Create new contact with opt-out
        await prisma.messagingContact.create({
          data: {
            organizationId,
            phone: normalizedPhone,
            [optOutField]: true,
            optOutAt: new Date(),
            source: 'OPT_OUT_IMPORT',
          },
        });
        created++;
      }
    }

    res.json({
      success: true,
      message: `Processed ${phoneNumbers.length} phone numbers`,
      data: {
        updated,
        created,
        total: updated + created,
      },
    });
  })
);

/**
 * GET /messaging-portal/opt-outs/export
 * Export opt-out list to CSV
 */
router.get(
  '/opt-outs/export',
  validate([
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS', 'ALL']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel = 'ALL' } = req.query;
    const organizationId = req.user!.organizationId;

    // Build where clause
    const where: any = { organizationId };

    if (channel === 'SMS') {
      where.smsOptOut = true;
    } else if (channel === 'WHATSAPP') {
      where.whatsappOptOut = true;
    } else if (channel === 'RCS') {
      where.rcsOptOut = true;
    } else {
      where.OR = [
        { smsOptOut: true },
        { whatsappOptOut: true },
        { rcsOptOut: true },
      ];
    }

    const contacts = await prisma.messagingContact.findMany({
      where,
      orderBy: { optOutAt: 'desc' },
      select: {
        phone: true,
        name: true,
        email: true,
        smsOptOut: true,
        whatsappOptOut: true,
        rcsOptOut: true,
        optOutAt: true,
      },
    });

    // Generate CSV
    const headers = ['Phone', 'Name', 'Email', 'SMS Opt-Out', 'WhatsApp Opt-Out', 'RCS Opt-Out', 'Opt-Out Date'];
    const rows = contacts.map(c => [
      c.phone,
      c.name || '',
      c.email || '',
      c.smsOptOut ? 'Yes' : 'No',
      c.whatsappOptOut ? 'Yes' : 'No',
      c.rcsOptOut ? 'Yes' : 'No',
      c.optOutAt ? new Date(c.optOutAt).toISOString() : '',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=opt-outs.csv');
    res.send(csv);
  })
);

// ==================== CRM IMPORT ====================

/**
 * GET /messaging-portal/crm-import/sources
 * Get available CRM import sources (pipelines, campaigns, tags)
 */
router.get(
  '/crm-import/sources',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    // Get pipelines with stages
    const pipelines = await prisma.pipeline.findMany({
      where: { organizationId, isActive: true },
      include: {
        stages: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        _count: { select: { leads: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get tags
    const tags = await prisma.tag.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get lead sources
    const leadSources = await prisma.leadSource.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get total lead count
    const totalLeads = await prisma.lead.count({
      where: { organizationId },
    });

    res.json({
      success: true,
      data: {
        pipelines: pipelines.map((p) => ({
          id: p.id,
          name: p.name,
          stages: p.stages.map((s) => ({ id: s.id, name: s.name })),
        })),
        campaigns: campaigns.map((c) => ({
          id: c.id,
          name: c.name,
          leadCount: c._count.leads,
        })),
        tags,
        leadSources,
        totalLeads,
      },
    });
  })
);

/**
 * POST /messaging-portal/crm-import/preview
 * Preview leads to import based on filters
 */
router.post(
  '/crm-import/preview',
  validate([
    body('pipelineId').optional().isUUID(),
    body('stageIds').optional().isArray(),
    body('campaignId').optional().isUUID(),
    body('tagIds').optional().isArray(),
    body('sourceId').optional().isUUID(),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { pipelineId, stageIds, campaignId, tagIds, sourceId, dateFrom, dateTo } = req.body;

    // Build where clause
    const where: any = {
      organizationId,
      phone: { not: null },
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    if (stageIds && stageIds.length > 0) {
      where.pipelineStageId = { in: stageIds };
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Get count and preview
    const [total, preview] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          createdAt: true,
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Check for existing contacts to show duplicates
    const phones = preview.map((l) => l.phone).filter(Boolean) as string[];
    const existingContacts = await prisma.messagingContact.findMany({
      where: {
        organizationId,
        phone: { in: phones },
      },
      select: { phone: true },
    });
    const existingPhones = new Set(existingContacts.map((c) => c.phone));

    res.json({
      success: true,
      data: {
        total,
        preview: preview.map((l) => ({
          id: l.id,
          name: [l.firstName, l.lastName].filter(Boolean).join(' ') || 'Unknown',
          phone: l.phone,
          email: l.email,
          createdAt: l.createdAt,
          isDuplicate: existingPhones.has(l.phone || ''),
        })),
        estimatedDuplicates: preview.filter((l) => existingPhones.has(l.phone || '')).length,
      },
    });
  })
);

/**
 * POST /messaging-portal/crm-import/import
 * Import leads from CRM as messaging contacts
 */
router.post(
  '/crm-import/import',
  validate([
    body('pipelineId').optional().isUUID(),
    body('stageIds').optional().isArray(),
    body('campaignId').optional().isUUID(),
    body('tagIds').optional().isArray(),
    body('sourceId').optional().isUUID(),
    body('dateFrom').optional().isISO8601(),
    body('dateTo').optional().isISO8601(),
    body('skipDuplicates').optional().isBoolean(),
    body('targetGroupId').optional().isUUID(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const {
      pipelineId, stageIds, campaignId, tagIds, sourceId,
      dateFrom, dateTo, skipDuplicates = true, targetGroupId
    } = req.body;

    // Build where clause
    const where: any = {
      organizationId,
      phone: { not: null },
    };

    if (pipelineId) {
      where.pipelineId = pipelineId;
    }

    if (stageIds && stageIds.length > 0) {
      where.pipelineStageId = { in: stageIds };
    }

    if (campaignId) {
      where.campaignId = campaignId;
    }

    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tagId: { in: tagIds },
        },
      };
    }

    if (sourceId) {
      where.sourceId = sourceId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    // Fetch all matching leads
    const leads = await prisma.lead.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    });

    // Get existing contacts for duplicate detection
    const existingContacts = await prisma.messagingContact.findMany({
      where: { organizationId },
      select: { phone: true },
    });
    const existingPhones = new Set(existingContacts.map((c) => c.phone));

    let imported = 0;
    let skipped = 0;
    let updated = 0;

    for (const lead of leads) {
      if (!lead.phone) {
        skipped++;
        continue;
      }

      // Normalize phone number
      let normalizedPhone = lead.phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) {
        normalizedPhone = '91' + normalizedPhone;
      }

      const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ') || undefined;

      if (existingPhones.has(normalizedPhone)) {
        if (skipDuplicates) {
          skipped++;
        } else {
          // Update existing contact
          await prisma.messagingContact.updateMany({
            where: { organizationId, phone: normalizedPhone },
            data: {
              name: name || undefined,
              email: lead.email || undefined,
              source: 'CRM_IMPORT',
            },
          });
          updated++;
        }
        continue;
      }

      try {
        const contact = await prisma.messagingContact.create({
          data: {
            organizationId,
            phone: normalizedPhone,
            name,
            email: lead.email || undefined,
            source: 'CRM_IMPORT',
            customFields: {
              crmLeadId: lead.id,
            },
          },
        });

        // Add to target group if specified
        if (targetGroupId) {
          await prisma.messagingContactGroupMember.create({
            data: {
              contactId: contact.id,
              groupId: targetGroupId,
            },
          }).catch(() => {}); // Ignore if already exists
        }

        existingPhones.add(normalizedPhone);
        imported++;
      } catch (error: any) {
        // Skip on unique constraint violation (race condition)
        if (error.code === 'P2002') {
          skipped++;
        } else {
          console.error('[CRM Import] Error creating contact:', error);
          skipped++;
        }
      }
    }

    res.json({
      success: true,
      message: `Imported ${imported} contacts from CRM`,
      data: {
        total: leads.length,
        imported,
        updated,
        skipped,
      },
    });
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

// ==================== SCHEDULED MESSAGES ====================

/**
 * GET /messaging-portal/scheduled-messages
 * List scheduled messages
 */
router.get(
  '/scheduled-messages',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('status').optional().isIn(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED']),
    query('type').optional().isIn(['SMS', 'WHATSAPP']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, status, type } = req.query;
    const organizationId = req.user!.organizationId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { organizationId };
    if (status) where.status = status;
    if (type) where.type = type;

    const [messages, total] = await Promise.all([
      prisma.scheduledMessage.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: Number(limit),
        select: {
          id: true,
          name: true,
          type: true,
          content: true,
          recipients: true,
          templateId: true,
          scheduledAt: true,
          timezone: true,
          isRecurring: true,
          recurringRule: true,
          status: true,
          totalRecipients: true,
          sentCount: true,
          failedCount: true,
          processedAt: true,
          errorMessage: true,
          createdAt: true,
        },
      }),
      prisma.scheduledMessage.count({ where }),
    ]);

    // Get stats
    const stats = await prisma.scheduledMessage.groupBy({
      by: ['status'],
      where: { organizationId },
      _count: true,
    });

    res.json({
      success: true,
      data: {
        messages: messages.map((m) => ({
          ...m,
          recipientCount: Array.isArray(m.recipients) ? (m.recipients as any[]).length : 0,
        })),
        stats: {
          pending: stats.find((s) => s.status === 'PENDING')?._count || 0,
          completed: stats.find((s) => s.status === 'COMPLETED')?._count || 0,
          failed: stats.find((s) => s.status === 'FAILED')?._count || 0,
          total: stats.reduce((sum, s) => sum + s._count, 0),
        },
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  })
);

/**
 * GET /messaging-portal/scheduled-messages/:id
 * Get a single scheduled message
 */
router.get(
  '/scheduled-messages/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    res.json({
      success: true,
      data: message,
    });
  })
);

/**
 * POST /messaging-portal/scheduled-messages
 * Create a scheduled message
 */
router.post(
  '/scheduled-messages',
  validate([
    body('type').isIn(['SMS', 'WHATSAPP']).withMessage('Type must be SMS or WHATSAPP'),
    body('recipients').isArray({ min: 1 }).withMessage('At least one recipient is required'),
    body('content').trim().notEmpty().isLength({ max: 1600 }).withMessage('Content is required'),
    body('scheduledAt').isISO8601().withMessage('Scheduled date is required'),
    body('name').optional().isString(),
    body('templateId').optional().isUUID(),
    body('timezone').optional().isString(),
    body('isRecurring').optional().isBoolean(),
    body('recurringRule').optional().isString(),
    body('recurringEndAt').optional().isISO8601(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;
    const {
      type,
      recipients,
      content,
      scheduledAt,
      name,
      templateId,
      variables,
      timezone = 'Asia/Kolkata',
      isRecurring = false,
      recurringRule,
      recurringEndAt,
    } = req.body;

    // Validate scheduled time is in the future
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time must be in the future',
      });
    }

    // Normalize phone numbers
    const normalizedRecipients = recipients.map((phone: string) => {
      let normalized = phone.replace(/\D/g, '');
      if (normalized.length === 10) {
        normalized = '91' + normalized;
      }
      return normalized;
    });

    // Check credit balance
    const balance = await messageCreditsService.getBalance(organizationId);
    const creditField = type === 'SMS' ? 'smsCredits' : 'whatsappCredits';

    if (balance[creditField] < normalizedRecipients.length) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${type} credits. Need ${normalizedRecipients.length}, have ${balance[creditField]}`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    const message = await prisma.scheduledMessage.create({
      data: {
        organizationId,
        type,
        recipients: normalizedRecipients,
        content,
        scheduledAt: scheduledDate,
        timezone,
        name: name || `Scheduled ${type} - ${new Date().toLocaleString()}`,
        templateId,
        variables: variables || {},
        isRecurring,
        recurringRule: isRecurring ? recurringRule : null,
        recurringEndAt: isRecurring && recurringEndAt ? new Date(recurringEndAt) : null,
        nextRunAt: isRecurring ? scheduledDate : null,
        totalRecipients: normalizedRecipients.length,
        createdById: userId,
        status: 'PENDING',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Message scheduled successfully',
      data: message,
    });
  })
);

/**
 * PUT /messaging-portal/scheduled-messages/:id
 * Update a scheduled message (only if PENDING)
 */
router.put(
  '/scheduled-messages/:id',
  validate([
    param('id').isUUID(),
    body('content').optional().isString().isLength({ max: 1600 }),
    body('scheduledAt').optional().isISO8601(),
    body('name').optional().isString(),
    body('recipients').optional().isArray(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { content, scheduledAt, name, recipients } = req.body;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    if (message.status !== 'PENDING' && message.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit pending or paused scheduled messages',
      });
    }

    // Validate new scheduled time if provided
    if (scheduledAt) {
      const scheduledDate = new Date(scheduledAt);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Scheduled time must be in the future',
        });
      }
    }

    const updateData: any = {};
    if (content !== undefined) updateData.content = content;
    if (scheduledAt) updateData.scheduledAt = new Date(scheduledAt);
    if (name !== undefined) updateData.name = name;
    if (recipients) {
      const normalizedRecipients = recipients.map((phone: string) => {
        let normalized = phone.replace(/\D/g, '');
        if (normalized.length === 10) {
          normalized = '91' + normalized;
        }
        return normalized;
      });
      updateData.recipients = normalizedRecipients;
      updateData.totalRecipients = normalizedRecipients.length;
    }

    const updated = await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: updateData,
    });

    res.json({
      success: true,
      message: 'Scheduled message updated',
      data: updated,
    });
  })
);

/**
 * POST /messaging-portal/scheduled-messages/:id/pause
 * Pause a scheduled message
 */
router.post(
  '/scheduled-messages/:id/pause',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    if (message.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Can only pause pending scheduled messages',
      });
    }

    await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: { status: 'PAUSED' },
    });

    res.json({
      success: true,
      message: 'Scheduled message paused',
    });
  })
);

/**
 * POST /messaging-portal/scheduled-messages/:id/resume
 * Resume a paused scheduled message
 */
router.post(
  '/scheduled-messages/:id/resume',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    if (message.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        message: 'Can only resume paused scheduled messages',
      });
    }

    // Check if scheduled time has passed
    if (message.scheduledAt <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled time has passed. Please update the scheduled time first.',
      });
    }

    await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: { status: 'PENDING' },
    });

    res.json({
      success: true,
      message: 'Scheduled message resumed',
    });
  })
);

/**
 * DELETE /messaging-portal/scheduled-messages/:id
 * Cancel/delete a scheduled message
 */
router.delete(
  '/scheduled-messages/:id',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    if (message.status === 'PROCESSING') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a message that is currently being processed',
      });
    }

    // If pending or paused, mark as cancelled; if completed/failed, delete
    if (message.status === 'PENDING' || message.status === 'PAUSED') {
      await prisma.scheduledMessage.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });
    } else {
      await prisma.scheduledMessage.delete({
        where: { id: req.params.id },
      });
    }

    res.json({
      success: true,
      message: 'Scheduled message cancelled',
    });
  })
);

/**
 * POST /messaging-portal/scheduled-messages/:id/send-now
 * Send a scheduled message immediately
 */
router.post(
  '/scheduled-messages/:id/send-now',
  validate([param('id').isUUID()]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    const message = await prisma.scheduledMessage.findFirst({
      where: { id: req.params.id, organizationId },
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Scheduled message not found',
      });
    }

    if (message.status !== 'PENDING' && message.status !== 'PAUSED') {
      return res.status(400).json({
        success: false,
        message: 'Can only send pending or paused scheduled messages',
      });
    }

    // Check credit balance
    const recipients = message.recipients as string[];
    const balance = await messageCreditsService.getBalance(organizationId);
    const creditField = message.type === 'SMS' ? 'smsCredits' : 'whatsappCredits';

    if (balance[creditField] < recipients.length) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${message.type} credits`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    // Mark as processing
    await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: { status: 'PROCESSING' },
    });

    // Process in background
    let sentCount = 0;
    let failedCount = 0;

    for (const phone of recipients) {
      try {
        let result: { success: boolean; messageId?: string; error?: string };

        if (message.type === 'SMS') {
          result = await smsService.send({
            phone,
            message: message.content,
            templateId: message.templateId || undefined,
            organizationId,
            userId,
          });
        } else {
          result = await whatsappService.send({
            phone,
            message: message.content,
            templateId: message.templateId || undefined,
            organizationId,
            userId,
          });
        }

        if (result.success) {
          // Deduct credit
          await messageCreditsService.deductCredits(
            organizationId,
            message.type as MessageChannel,
            1,
            result.messageId,
            userId
          );
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error(`[ScheduledMessage] Error sending to ${phone}:`, error);
        failedCount++;
      }
    }

    // Update message status
    await prisma.scheduledMessage.update({
      where: { id: req.params.id },
      data: {
        status: failedCount === recipients.length ? 'FAILED' : 'COMPLETED',
        sentCount,
        failedCount,
        processedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: `Sent ${sentCount} messages, ${failedCount} failed`,
      data: { sentCount, failedCount },
    });
  })
);

// ==================== QUICK SEND ====================

/**
 * POST /messaging-portal/quick-send
 * Send a single message to one recipient
 * Includes DLT validation for SMS and atomic credit reservation
 */
router.post(
  '/quick-send',
  validate([
    body('channel').isIn(['SMS', 'WHATSAPP']).withMessage('Channel must be SMS or WHATSAPP'),
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('message').trim().notEmpty().isLength({ min: 1, max: 1600 }).withMessage('Message is required (max 1600 chars)'),
    body('templateId').optional().isUUID(),
    body('contactName').optional().isString(),
    body('senderId').optional().isString().isLength({ min: 6, max: 6 }),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel, phone, message, templateId, contactName, senderId } = req.body;
    const organizationId = req.user!.organizationId;
    const userId = req.user!.id;

    // For SMS, validate DLT configuration before proceeding
    if (channel === 'SMS') {
      let hasDltTemplate = false;

      // Check if template has DLT Template ID
      if (templateId) {
        const template = await prisma.messageTemplate.findFirst({
          where: { id: templateId, type: TemplateType.SMS, isActive: true },
          select: { dltTemplateId: true },
        });
        if (template?.dltTemplateId) {
          hasDltTemplate = true;
        }
      }

      // Check config default template ID
      if (!hasDltTemplate && config.msg91?.defaultTemplateId) {
        hasDltTemplate = true;
      }

      if (!hasDltTemplate) {
        return res.status(400).json({
          success: false,
          message: 'SMS requires DLT Template ID for compliance in India. Please select a template with DLT ID configured or contact support.',
          code: 'DLT_TEMPLATE_REQUIRED',
        });
      }
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/\D/g, '');
    if (normalizedPhone.length === 10) {
      normalizedPhone = '91' + normalizedPhone;
    }

    // Reserve credit atomically before sending (prevents race conditions)
    const reservation = await messageCreditsService.reserveCredits(
      organizationId,
      channel as MessageChannel,
      1,
      userId
    );

    if (!reservation.success) {
      return res.status(400).json({
        success: false,
        message: reservation.error || `Insufficient ${channel} credits. Please purchase more credits.`,
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    let result: { success: boolean; messageId?: string; error?: string };

    try {
      if (channel === 'SMS') {
        result = await smsService.send({
          phone: normalizedPhone,
          message,
          templateId,
          organizationId,
          userId,
          senderId, // Pass custom sender ID if provided
        });
      } else {
        result = await whatsappService.send({
          phone: normalizedPhone,
          message,
          templateId,
          organizationId,
          userId,
        });
      }

      if (result.success) {
        // Confirm the reservation (credits already deducted)
        await messageCreditsService.confirmReservation(reservation.reservationId!, result.messageId);

        // Log the quick send message
        await prisma.bulkMessageLog.create({
          data: {
            organizationId,
            bulkJobId: 'quick-send', // Special identifier for quick send
            userId,
            phone: normalizedPhone,
            name: contactName || null,
            senderId: senderId || null, // Store sender ID used
            message,
            channel: channel as MessageChannel,
            status: 'SENT',
            provider: channel === 'SMS' ? 'MSG91' : 'GUPSHUP',
            providerMsgId: result.messageId,
            sentAt: new Date(),
            creditCost: 1,
          },
        });

        // Get updated balance
        const newBalance = await messageCreditsService.getBalance(organizationId);
        const creditField = channel === 'SMS' ? 'smsCredits' : 'whatsappCredits';

        return res.json({
          success: true,
          message: 'Message sent successfully',
          data: {
            messageId: result.messageId,
            phone: normalizedPhone,
            channel,
            creditsUsed: 1,
            remainingCredits: newBalance[creditField],
          },
        });
      } else {
        // Cancel reservation and refund credit
        await messageCreditsService.cancelReservation(
          organizationId,
          channel as MessageChannel,
          1,
          reservation.reservationId!,
          `Send failed: ${result.error}`
        );

        return res.status(400).json({
          success: false,
          message: result.error || 'Failed to send message',
          code: 'SEND_FAILED',
        });
      }
    } catch (error: any) {
      // Cancel reservation and refund credit on error
      await messageCreditsService.cancelReservation(
        organizationId,
        channel as MessageChannel,
        1,
        reservation.reservationId!,
        `Error: ${error.message}`
      );

      console.error('[QuickSend] Error:', error);
      return res.status(500).json({
        success: false,
        message: error.message || 'Failed to send message',
        code: 'INTERNAL_ERROR',
      });
    }
  })
);

/**
 * GET /messaging-portal/quick-send/history
 * Get quick send message history
 */
router.get(
  '/quick-send/history',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP']),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { page = 1, limit = 20, channel } = req.query;
    const organizationId = req.user!.organizationId;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {
      organizationId,
      bulkJobId: 'quick-send',
    };

    if (channel) {
      where.channel = channel;
    }

    const [messages, total] = await Promise.all([
      prisma.bulkMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.bulkMessageLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
    });
  })
);

// ==================== MESSAGE HISTORY ====================

/**
 * GET /messaging-portal/message-history
 * Get all SMS transaction history
 */
router.get(
  '/message-history',
  validate([
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('channel').optional().isIn(['SMS', 'WHATSAPP', 'RCS']),
    query('status').optional().isIn(['PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ']),
    query('search').optional().isString(),
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601(),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const organizationId = req.user!.organizationId;
    const { page = 1, limit = 20, channel, status, search, startDate, endDate } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build where clause
    const where: any = { organizationId };

    if (channel) {
      where.channel = channel;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.phone = { contains: String(search) };
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(String(startDate));
      if (endDate) where.createdAt.lte = new Date(String(endDate));
    }

    // Get messages from BulkMessageLog (includes quick-send, campaigns, etc.)
    const [messages, total] = await Promise.all([
      prisma.bulkMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.bulkMessageLog.count({ where }),
    ]);

    // Get campaign names for messages that belong to campaigns
    const campaignIds = messages
      .filter((msg) => msg.bulkJobId && !['quick-send', 'scheduled', 'api'].includes(msg.bulkJobId))
      .map((msg) => msg.bulkJobId);

    const campaigns = campaignIds.length > 0
      ? await prisma.bulkMessageJob.findMany({
          where: { id: { in: campaignIds } },
          select: { id: true, name: true },
        })
      : [];

    const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

    // Get sender IDs from campaigns (for messages that don't have senderId stored directly)
    const campaignSenderIds = new Map<string, string>();
    if (campaignIds.length > 0) {
      const campaignsWithSenderId = await prisma.bulkMessageJob.findMany({
        where: { id: { in: campaignIds } },
        select: { id: true, senderId: true },
      });
      campaignsWithSenderId.forEach((c) => {
        if (c.senderId) campaignSenderIds.set(c.id, c.senderId);
      });
    }

    // Transform messages for frontend
    const formattedMessages = messages.map((msg: any) => ({
      id: msg.id,
      phone: msg.phone,
      name: msg.name || null,
      channel: msg.channel,
      content: msg.message || '',
      status: msg.status,
      // Use senderId from message log first, then fall back to campaign's senderId
      senderId: msg.senderId || campaignSenderIds.get(msg.bulkJobId) || null,
      templateId: null,
      dltTemplateId: null,
      externalId: msg.providerMsgId,
      error: msg.errorMessage,
      source: msg.bulkJobId === 'quick-send' ? 'quick-send' :
              msg.bulkJobId === 'scheduled' ? 'scheduled' :
              msg.bulkJobId === 'api' ? 'api' : 'campaign',
      campaignName: campaignMap.get(msg.bulkJobId) || null,
      createdAt: msg.createdAt.toISOString(),
      sentAt: msg.sentAt?.toISOString(),
      deliveredAt: msg.deliveredAt?.toISOString(),
    }));

    res.json({
      success: true,
      data: {
        messages: formattedMessages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
        },
      },
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
 * Includes DLT validation for SMS campaigns
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
    body('senderId').optional().isString().isLength({ min: 6, max: 6 }).withMessage('Sender ID must be 6 characters'),
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
      senderId,
    } = req.body;

    // For SMS campaigns, validate DLT configuration and sender ID before creating
    if (channel === 'SMS') {
      let hasDltTemplate = false;

      // Check if template has DLT Template ID
      if (templateId) {
        const template = await prisma.messageTemplate.findFirst({
          where: { id: templateId, type: TemplateType.SMS, isActive: true },
          select: { dltTemplateId: true },
        });
        if (template?.dltTemplateId) {
          hasDltTemplate = true;
        }
      }

      // Check config default template ID
      if (!hasDltTemplate && config.msg91?.defaultTemplateId) {
        hasDltTemplate = true;
      }

      if (!hasDltTemplate) {
        return res.status(400).json({
          success: false,
          message: 'SMS campaigns require a template with DLT Template ID for compliance in India. Please select a valid SMS template.',
          code: 'DLT_TEMPLATE_REQUIRED',
        });
      }

      // Validate sender ID for SMS campaigns
      if (!senderId) {
        // Check if organization has any sender IDs configured
        const senderIdCount = await prisma.organizationSenderId.count({
          where: { organizationId: req.user!.organizationId, isActive: true },
        });

        if (senderIdCount > 0) {
          return res.status(400).json({
            success: false,
            message: 'Please select a Sender ID for this SMS campaign.',
            code: 'SENDER_ID_REQUIRED',
          });
        }
        // If no sender IDs configured, allow campaign to proceed with default
      }
    }

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
      senderId, // Pass sender ID for tracking
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
