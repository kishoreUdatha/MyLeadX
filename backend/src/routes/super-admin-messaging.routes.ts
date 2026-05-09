/**
 * Super Admin Messaging Routes
 * Manage messaging credits, pricing, sender IDs, and analytics across all organizations
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database';
import { validate } from '../middlewares/validate';
import { MessageChannel, MessageCreditTransactionType } from '@prisma/client';

const router = Router();

/**
 * GET /stats - Get messaging statistics across all organizations
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Get total credits across all organizations
    const balances = await prisma.messageBalance.aggregate({
      _sum: {
        smsCredits: true,
        whatsappCredits: true,
        rcsCredits: true,
      },
    });

    // Get organization count with messaging enabled
    const totalOrganizations = await prisma.organization.count({
      where: {
        OR: [
          { smsEnabled: true },
          { whatsappEnabled: true },
          { rcsEnabled: true },
        ],
      },
    });

    // Get total messages sent (lifetime)
    const totalMessagesSent = await prisma.bulkMessageLog.count({
      where: { status: { in: ['SENT', 'DELIVERED', 'READ'] } },
    });

    // Get today's messages
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMessagesSent = await prisma.bulkMessageLog.count({
      where: {
        status: { in: ['SENT', 'DELIVERED', 'READ'] },
        sentAt: { gte: today },
      },
    });

    // Get total revenue (completed purchases)
    const revenue = await prisma.messagePurchase.aggregate({
      _sum: { totalAmount: true },
      where: { status: 'COMPLETED', isManualAdjustment: false },
    });

    // Get today's revenue
    const todayRevenue = await prisma.messagePurchase.aggregate({
      _sum: { totalAmount: true },
      where: {
        status: 'COMPLETED',
        isManualAdjustment: false,
        createdAt: { gte: today },
      },
    });

    res.json({
      success: true,
      data: {
        totalSmsCredits: balances._sum.smsCredits || 0,
        totalWhatsappCredits: balances._sum.whatsappCredits || 0,
        totalRcsCredits: balances._sum.rcsCredits || 0,
        totalOrganizations,
        totalMessagesSent,
        todayMessagesSent,
        totalRevenue: Number(revenue._sum.totalAmount) || 0,
        todayRevenue: Number(todayRevenue._sum.totalAmount) || 0,
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get stats:', error);
    res.status(500).json({ success: false, message: 'Failed to get messaging stats' });
  }
});

/**
 * GET /organizations - Get all organizations with their messaging balances and sender IDs
 */
router.get('/organizations', async (req: Request, res: Response) => {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (search) {
      where.name = { contains: String(search), mode: 'insensitive' };
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          smsSenderId: true,
          smsEnabled: true,
          whatsappEnabled: true,
          rcsEnabled: true,
          // Custom DLT fields
          smsProviderType: true,
          customDltEntityId: true,
          customDltSenderId: true,
          dltPlatform: true,
          messageBalance: {
            select: {
              smsCredits: true,
              whatsappCredits: true,
              rcsCredits: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: Number(limit),
      }),
      prisma.organization.count({ where }),
    ]);

    // Transform data to match frontend interface
    const data = organizations.map((org) => ({
      organizationId: org.id,
      organizationName: org.name,
      slug: org.slug,
      smsSenderId: org.smsSenderId,
      smsEnabled: org.smsEnabled,
      whatsappEnabled: org.whatsappEnabled,
      rcsEnabled: org.rcsEnabled,
      // Custom DLT fields
      smsProviderType: org.smsProviderType,
      customDltEntityId: org.customDltEntityId,
      customDltSenderId: org.customDltSenderId,
      dltPlatform: org.dltPlatform,
      // Credits
      smsCredits: org.messageBalance?.smsCredits || 0,
      whatsappCredits: org.messageBalance?.whatsappCredits || 0,
      rcsCredits: org.messageBalance?.rcsCredits || 0,
    }));

    res.json({
      success: true,
      data,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get organizations:', error);
    res.status(500).json({ success: false, message: 'Failed to get organizations' });
  }
});

/**
 * GET /pricing - Get global pricing configuration
 */
router.get('/pricing', async (req: Request, res: Response) => {
  try {
    // Get global pricing (organizationId is null)
    let pricing = await prisma.messagePricing.findFirst({
      where: { organizationId: null, isActive: true },
    });

    // Create default pricing if none exists
    if (!pricing) {
      pricing = await prisma.messagePricing.create({
        data: {
          organizationId: null,
          smsPrice: 0.25,
          whatsappPrice: 0.50,
          rcsPrice: 0.75,
          smsBulkDiscount: { '1000': 5, '5000': 10, '10000': 15 },
          whatsappBulkDiscount: { '1000': 5, '5000': 10, '10000': 15 },
          rcsBulkDiscount: { '1000': 5, '5000': 10, '10000': 15 },
          minPurchase: 100,
          isActive: true,
        },
      });
    }

    res.json({
      success: true,
      data: {
        id: pricing.id,
        organizationId: pricing.organizationId,
        smsPrice: Number(pricing.smsPrice),
        whatsappPrice: Number(pricing.whatsappPrice),
        rcsPrice: Number(pricing.rcsPrice),
        smsBulkDiscount: pricing.smsBulkDiscount,
        whatsappBulkDiscount: pricing.whatsappBulkDiscount,
        rcsBulkDiscount: pricing.rcsBulkDiscount,
        minPurchase: pricing.minPurchase,
        isActive: pricing.isActive,
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get pricing:', error);
    res.status(500).json({ success: false, message: 'Failed to get pricing' });
  }
});

/**
 * PUT /pricing - Update global pricing configuration
 */
router.put(
  '/pricing',
  validate([
    body('smsPrice').optional().isFloat({ min: 0 }),
    body('whatsappPrice').optional().isFloat({ min: 0 }),
    body('rcsPrice').optional().isFloat({ min: 0 }),
    body('minPurchase').optional().isInt({ min: 1 }),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { smsPrice, whatsappPrice, rcsPrice, smsBulkDiscount, whatsappBulkDiscount, rcsBulkDiscount, minPurchase } = req.body;

      // Find or create global pricing
      let pricing = await prisma.messagePricing.findFirst({
        where: { organizationId: null, isActive: true },
      });

      const updateData: any = {};
      if (smsPrice !== undefined) updateData.smsPrice = smsPrice;
      if (whatsappPrice !== undefined) updateData.whatsappPrice = whatsappPrice;
      if (rcsPrice !== undefined) updateData.rcsPrice = rcsPrice;
      if (smsBulkDiscount !== undefined) updateData.smsBulkDiscount = smsBulkDiscount;
      if (whatsappBulkDiscount !== undefined) updateData.whatsappBulkDiscount = whatsappBulkDiscount;
      if (rcsBulkDiscount !== undefined) updateData.rcsBulkDiscount = rcsBulkDiscount;
      if (minPurchase !== undefined) updateData.minPurchase = minPurchase;

      if (pricing) {
        pricing = await prisma.messagePricing.update({
          where: { id: pricing.id },
          data: updateData,
        });
      } else {
        pricing = await prisma.messagePricing.create({
          data: {
            organizationId: null,
            smsPrice: smsPrice || 0.25,
            whatsappPrice: whatsappPrice || 0.50,
            rcsPrice: rcsPrice || 0.75,
            smsBulkDiscount: smsBulkDiscount || {},
            whatsappBulkDiscount: whatsappBulkDiscount || {},
            rcsBulkDiscount: rcsBulkDiscount || {},
            minPurchase: minPurchase || 100,
            isActive: true,
          },
        });
      }

      res.json({ success: true, data: pricing });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to update pricing:', error);
      res.status(500).json({ success: false, message: 'Failed to update pricing' });
    }
  }
);

/**
 * POST /adjust-credits - Manually adjust credits for an organization
 */
router.post(
  '/adjust-credits',
  validate([
    body('organizationId').isUUID(),
    body('channel').isIn(['SMS', 'WHATSAPP', 'RCS']),
    body('amount').isInt().notEmpty(),
    body('reason').isString().notEmpty().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { organizationId, channel, amount, reason } = req.body;
      const superAdmin = (req as any).superAdmin;

      // Get or create message balance
      let balance = await prisma.messageBalance.findUnique({
        where: { organizationId },
      });

      if (!balance) {
        balance = await prisma.messageBalance.create({
          data: {
            organizationId,
            smsCredits: 0,
            whatsappCredits: 0,
            rcsCredits: 0,
          },
        });
      }

      // Determine which field to update
      const creditField = channel === 'SMS' ? 'smsCredits' : channel === 'WHATSAPP' ? 'whatsappCredits' : 'rcsCredits';
      const currentCredits = balance[creditField];
      const newCredits = currentCredits + amount;

      // Prevent negative balance
      if (newCredits < 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot adjust credits below zero. Current balance: ${currentCredits}`,
        });
      }

      // Update balance
      await prisma.messageBalance.update({
        where: { organizationId },
        data: { [creditField]: newCredits },
      });

      // Create adjustment record
      await prisma.messagePurchase.create({
        data: {
          organizationId,
          userId: superAdmin?.userId || superAdmin?.id,
          channel: channel as MessageChannel,
          quantity: Math.abs(amount),
          pricePerUnit: 0,
          totalAmount: 0,
          status: 'COMPLETED',
          isManualAdjustment: true,
          adjustmentReason: reason,
          adjustedById: superAdmin?.userId || superAdmin?.id,
        },
      });

      // Log transaction
      await prisma.messageCreditTransaction.create({
        data: {
          organizationId,
          channel: channel as MessageChannel,
          transactionType: amount > 0 ? MessageCreditTransactionType.CREDIT : MessageCreditTransactionType.DEBIT,
          amount,
          balanceAfter: newCredits,
          referenceType: 'ADJUSTMENT',
          description: `Manual adjustment by super admin: ${reason}`,
          userId: superAdmin?.userId || superAdmin?.id,
        },
      });

      res.json({
        success: true,
        message: `${channel} credits adjusted by ${amount}`,
        data: {
          previousBalance: currentCredits,
          newBalance: newCredits,
          adjustment: amount,
        },
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to adjust credits:', error);
      res.status(500).json({ success: false, message: 'Failed to adjust credits' });
    }
  }
);

/**
 * PUT /organizations/:id/sender-id - Update organization's SMS sender ID
 */
router.put(
  '/organizations/:id/sender-id',
  validate([
    param('id').isUUID(),
    body('smsSenderId').isString().trim().isLength({ min: 0, max: 11 }),
    body('smsEnabled').optional().isBoolean(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { smsSenderId, smsEnabled } = req.body;

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true, smsSenderId: true },
      });

      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Update sender ID
      const updateData: any = {
        smsSenderId: smsSenderId || null,
      };

      if (smsEnabled !== undefined) {
        updateData.smsEnabled = smsEnabled;
      }

      const updated = await prisma.organization.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          smsSenderId: true,
          smsEnabled: true,
        },
      });

      res.json({
        success: true,
        message: smsSenderId
          ? `Sender ID updated to "${smsSenderId}" for ${organization.name}`
          : `Sender ID removed for ${organization.name}`,
        data: updated,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to update sender ID:', error);
      res.status(500).json({ success: false, message: 'Failed to update sender ID' });
    }
  }
);

/**
 * PUT /organizations/:id/messaging-settings - Update organization's messaging settings
 */
router.put(
  '/organizations/:id/messaging-settings',
  validate([
    param('id').isUUID(),
    body('smsSenderId').optional().isString().trim(),
    body('smsEnabled').optional().isBoolean(),
    body('whatsappEnabled').optional().isBoolean(),
    body('rcsEnabled').optional().isBoolean(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { smsSenderId, smsEnabled, whatsappEnabled, rcsEnabled } = req.body;

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true },
      });

      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Build update data
      const updateData: any = {};
      if (smsSenderId !== undefined) updateData.smsSenderId = smsSenderId || null;
      if (smsEnabled !== undefined) updateData.smsEnabled = smsEnabled;
      if (whatsappEnabled !== undefined) updateData.whatsappEnabled = whatsappEnabled;
      if (rcsEnabled !== undefined) updateData.rcsEnabled = rcsEnabled;

      const updated = await prisma.organization.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          smsSenderId: true,
          smsEnabled: true,
          whatsappEnabled: true,
          rcsEnabled: true,
        },
      });

      res.json({
        success: true,
        message: `Messaging settings updated for ${organization.name}`,
        data: updated,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to update messaging settings:', error);
      res.status(500).json({ success: false, message: 'Failed to update messaging settings' });
    }
  }
);

/**
 * GET /sender-ids - Get list of all registered sender IDs (for reference)
 */
router.get('/sender-ids', async (req: Request, res: Response) => {
  try {
    // Get all organizations with sender IDs
    const organizations = await prisma.organization.findMany({
      where: { smsSenderId: { not: null } },
      select: {
        id: true,
        name: true,
        smsSenderId: true,
        smsEnabled: true,
      },
      orderBy: { smsSenderId: 'asc' },
    });

    // Group by sender ID
    const senderIdMap = new Map<string, any[]>();
    for (const org of organizations) {
      if (org.smsSenderId) {
        if (!senderIdMap.has(org.smsSenderId)) {
          senderIdMap.set(org.smsSenderId, []);
        }
        senderIdMap.get(org.smsSenderId)!.push({
          organizationId: org.id,
          organizationName: org.name,
          smsEnabled: org.smsEnabled,
        });
      }
    }

    // Convert to array
    const senderIds = Array.from(senderIdMap.entries()).map(([senderId, orgs]) => ({
      senderId,
      organizationCount: orgs.length,
      organizations: orgs,
    }));

    res.json({
      success: true,
      data: senderIds,
      total: senderIds.length,
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get sender IDs:', error);
    res.status(500).json({ success: false, message: 'Failed to get sender IDs' });
  }
});

// ==================== CUSTOM DLT CONFIGURATION ====================

/**
 * GET /organizations/:id/dlt-config - Get organization's DLT configuration
 */
router.get('/organizations/:id/dlt-config', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        smsProviderType: true,
        smsSenderId: true,
        customDltEntityId: true,
        customDltSenderId: true,
        customDltTeleMarketerId: true,
        dltPlatform: true,
        dltRegisteredName: true,
        dltConfiguredAt: true,
        smsEnabled: true,
        organizationSmsTemplates: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!organization) {
      return res.status(404).json({ success: false, message: 'Organization not found' });
    }

    res.json({
      success: true,
      data: organization,
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get DLT config:', error);
    res.status(500).json({ success: false, message: 'Failed to get DLT configuration' });
  }
});

/**
 * PUT /organizations/:id/dlt-config - Update organization's custom DLT configuration
 */
router.put(
  '/organizations/:id/dlt-config',
  validate([
    param('id').isUUID(),
    body('smsProviderType').isIn(['PLATFORM', 'CUSTOM']),
    body('customDltEntityId').optional({ nullable: true }).isString().trim(),
    body('customDltSenderId').optional({ nullable: true }).isString().trim().isLength({ max: 6 }),
    body('customDltTeleMarketerId').optional({ nullable: true }).isString().trim(),
    body('dltPlatform').optional({ nullable: true }).isIn(['JIO', 'AIRTEL', 'VI', 'BSNL', null]),
    body('dltRegisteredName').optional({ nullable: true }).isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const superAdmin = (req as any).superAdmin;
      const {
        smsProviderType,
        customDltEntityId,
        customDltSenderId,
        customDltTeleMarketerId,
        dltPlatform,
        dltRegisteredName,
      } = req.body;

      // Verify organization exists
      const organization = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true },
      });

      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      // Validate: If CUSTOM, require PE_ID and Sender ID
      if (smsProviderType === 'CUSTOM') {
        if (!customDltEntityId) {
          return res.status(400).json({
            success: false,
            message: 'DLT Entity ID (PE_ID) is required for custom DLT configuration',
          });
        }
        if (!customDltSenderId) {
          return res.status(400).json({
            success: false,
            message: 'DLT Sender ID is required for custom DLT configuration',
          });
        }
      }

      // Update organization
      const updated = await prisma.organization.update({
        where: { id },
        data: {
          smsProviderType,
          customDltEntityId: customDltEntityId || null,
          customDltSenderId: customDltSenderId?.toUpperCase() || null,
          customDltTeleMarketerId: customDltTeleMarketerId || null,
          dltPlatform: dltPlatform || null,
          dltRegisteredName: dltRegisteredName || null,
          dltConfiguredAt: smsProviderType === 'CUSTOM' ? new Date() : null,
          dltConfiguredById: smsProviderType === 'CUSTOM' ? (superAdmin?.userId || superAdmin?.id) : null,
          // Also enable SMS if setting up custom DLT
          smsEnabled: smsProviderType === 'CUSTOM' ? true : undefined,
        },
        select: {
          id: true,
          name: true,
          smsProviderType: true,
          customDltEntityId: true,
          customDltSenderId: true,
          customDltTeleMarketerId: true,
          dltPlatform: true,
          dltRegisteredName: true,
          dltConfiguredAt: true,
          smsEnabled: true,
        },
      });

      res.json({
        success: true,
        message: smsProviderType === 'CUSTOM'
          ? `Custom DLT configured for ${organization.name}`
          : `Switched to platform DLT for ${organization.name}`,
        data: updated,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to update DLT config:', error);
      res.status(500).json({ success: false, message: 'Failed to update DLT configuration' });
    }
  }
);

/**
 * POST /organizations/:id/dlt-templates - Add a DLT template for organization
 */
router.post(
  '/organizations/:id/dlt-templates',
  validate([
    param('id').isUUID(),
    body('name').isString().trim().notEmpty(),
    body('dltTemplateId').isString().trim().notEmpty(),
    body('content').isString().trim().notEmpty(),
    body('dltContentType').optional().isIn(['TRANSACTIONAL', 'PROMOTIONAL']),
    body('variables').optional().isArray(),
    body('description').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, dltTemplateId, content, dltContentType, variables, description } = req.body;

      // Verify organization exists and has custom DLT
      const organization = await prisma.organization.findUnique({
        where: { id },
        select: { id: true, name: true, smsProviderType: true },
      });

      if (!organization) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      if (organization.smsProviderType !== 'CUSTOM') {
        return res.status(400).json({
          success: false,
          message: 'Organization must have custom DLT configured to add templates',
        });
      }

      // Check for duplicate template ID
      const existing = await prisma.organizationSmsTemplate.findFirst({
        where: { organizationId: id, dltTemplateId },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'Template with this DLT Template ID already exists',
        });
      }

      // Create template
      const template = await prisma.organizationSmsTemplate.create({
        data: {
          organizationId: id,
          name,
          dltTemplateId,
          content,
          dltContentType: dltContentType || 'TRANSACTIONAL',
          variables: variables || [],
          description,
        },
      });

      res.status(201).json({
        success: true,
        message: 'DLT template added successfully',
        data: template,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to add DLT template:', error);
      res.status(500).json({ success: false, message: 'Failed to add DLT template' });
    }
  }
);

/**
 * GET /organizations/:id/dlt-templates - Get organization's DLT templates
 */
router.get('/organizations/:id/dlt-templates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const templates = await prisma.organizationSmsTemplate.findMany({
      where: { organizationId: id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: templates,
      total: templates.length,
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get DLT templates:', error);
    res.status(500).json({ success: false, message: 'Failed to get DLT templates' });
  }
});

/**
 * DELETE /organizations/:id/dlt-templates/:templateId - Delete a DLT template
 */
router.delete(
  '/organizations/:id/dlt-templates/:templateId',
  async (req: Request, res: Response) => {
    try {
      const { id, templateId } = req.params;

      const template = await prisma.organizationSmsTemplate.findFirst({
        where: { id: templateId, organizationId: id },
      });

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      await prisma.organizationSmsTemplate.delete({
        where: { id: templateId },
      });

      res.json({
        success: true,
        message: 'Template deleted successfully',
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to delete DLT template:', error);
      res.status(500).json({ success: false, message: 'Failed to delete DLT template' });
    }
  }
);

/**
 * PUT /organizations/:id/dlt-templates/:templateId - Update a DLT template
 */
router.put(
  '/organizations/:id/dlt-templates/:templateId',
  validate([
    body('name').optional().isString().trim(),
    body('content').optional().isString().trim(),
    body('variables').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('description').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id, templateId } = req.params;
      const { name, content, variables, isActive, description } = req.body;

      const template = await prisma.organizationSmsTemplate.findFirst({
        where: { id: templateId, organizationId: id },
      });

      if (!template) {
        return res.status(404).json({ success: false, message: 'Template not found' });
      }

      const updated = await prisma.organizationSmsTemplate.update({
        where: { id: templateId },
        data: {
          ...(name && { name }),
          ...(content && { content }),
          ...(variables && { variables }),
          ...(isActive !== undefined && { isActive }),
          ...(description !== undefined && { description }),
        },
      });

      res.json({
        success: true,
        message: 'Template updated successfully',
        data: updated,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to update DLT template:', error);
      res.status(500).json({ success: false, message: 'Failed to update DLT template' });
    }
  }
);

// ==================== SENDER ID REQUESTS MANAGEMENT ====================

/**
 * GET /sender-id-requests - Get all sender ID requests (with filtering)
 */
router.get('/sender-id-requests', async (req: Request, res: Response) => {
  try {
    const { status, page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [requests, total] = await Promise.all([
      prisma.senderIdRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
        include: {
          organization: {
            select: { id: true, name: true, slug: true },
          },
          processedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.senderIdRequest.count({ where }),
    ]);

    // Get counts by status
    const statusCounts = await prisma.senderIdRequest.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    const counts = {
      PENDING: 0,
      REVIEWING: 0,
      APPROVED: 0,
      REJECTED: 0,
      CANCELLED: 0,
    };
    for (const sc of statusCounts) {
      counts[sc.status as keyof typeof counts] = sc._count.status;
    }

    res.json({
      success: true,
      data: requests,
      counts,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get sender ID requests:', error);
    res.status(500).json({ success: false, message: 'Failed to get sender ID requests' });
  }
});

/**
 * GET /sender-id-requests/:id - Get a single sender ID request
 */
router.get('/sender-id-requests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const request = await prisma.senderIdRequest.findUnique({
      where: { id },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            smsSenderId: true,
            smsEnabled: true,
            smsProviderType: true,
          },
        },
        processedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to get sender ID request:', error);
    res.status(500).json({ success: false, message: 'Failed to get sender ID request' });
  }
});

/**
 * PUT /sender-id-requests/:id/review - Mark request as reviewing
 */
router.put('/sender-id-requests/:id/review', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const superAdmin = (req as any).superAdmin;

    const request = await prisma.senderIdRequest.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: `Cannot review a request with status: ${request.status}`,
      });
    }

    const updated = await prisma.senderIdRequest.update({
      where: { id },
      data: {
        status: 'REVIEWING',
        // Note: processedById links to User table, Super Admins are separate
        // We store the super admin info in statusReason instead
        statusReason: `Being reviewed by Super Admin: ${superAdmin?.email || 'Unknown'}`,
      },
    });

    res.json({
      success: true,
      message: 'Request marked as reviewing',
      data: updated,
    });
  } catch (error) {
    console.error('[SuperAdmin Messaging] Failed to mark request as reviewing:', error);
    res.status(500).json({ success: false, message: 'Failed to update request' });
  }
});

/**
 * PUT /sender-id-requests/:id/approve - Approve a sender ID request
 */
router.put(
  '/sender-id-requests/:id/approve',
  validate([
    body('assignedSenderId').isString().trim().isLength({ min: 6, max: 6 }),
    body('notes').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    console.log('[SuperAdmin] Approve request received:', { id: req.params.id, body: req.body });
    try {
      const { id } = req.params;
      const { assignedSenderId, notes } = req.body;
      const superAdmin = (req as any).superAdmin;
      console.log('[SuperAdmin] Processing approval for:', { id, assignedSenderId, superAdmin: superAdmin?.email });

      const request = await prisma.senderIdRequest.findUnique({
        where: { id },
        include: { organization: true },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      if (!['PENDING', 'REVIEWING'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve a request with status: ${request.status}`,
        });
      }

      // Check if sender ID is already assigned to another organization
      const existingSenderId = await prisma.organization.findFirst({
        where: {
          smsSenderId: assignedSenderId.toUpperCase(),
          id: { not: request.organizationId },
        },
      });

      if (existingSenderId) {
        return res.status(400).json({
          success: false,
          message: `Sender ID "${assignedSenderId}" is already assigned to another organization`,
        });
      }

      // Use transaction to update both request and organization
      const [updatedRequest] = await prisma.$transaction([
        prisma.senderIdRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            assignedSenderId: assignedSenderId.toUpperCase(),
            statusReason: notes || `Approved by Super Admin (${superAdmin?.email || 'Unknown'}). Sender ID: ${assignedSenderId.toUpperCase()}`,
            processedAt: new Date(),
            // Note: processedById links to User table, Super Admins are separate - leave null
          },
        }),
        // Update organization's sender ID and enable SMS
        prisma.organization.update({
          where: { id: request.organizationId },
          data: {
            smsSenderId: assignedSenderId.toUpperCase(),
            smsEnabled: true,
            // If they have their own DLT, also set the custom sender ID
            ...(request.hasOwnDlt && request.dltEntityId
              ? {
                  smsProviderType: 'CUSTOM',
                  customDltEntityId: request.dltEntityId,
                  customDltSenderId: assignedSenderId.toUpperCase(),
                  dltPlatform: request.dltPlatform,
                  dltConfiguredAt: new Date(),
                }
              : {
                  smsProviderType: 'PLATFORM',
                }),
          },
        }),
      ]);

      res.json({
        success: true,
        message: `Request approved. Sender ID "${assignedSenderId.toUpperCase()}" assigned to ${request.organization.name}`,
        data: updatedRequest,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to approve request:', error);
      res.status(500).json({ success: false, message: 'Failed to approve request' });
    }
  }
);

/**
 * PUT /sender-id-requests/:id/reject - Reject a sender ID request
 */
router.put(
  '/sender-id-requests/:id/reject',
  validate([body('reason').isString().trim().notEmpty()]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const superAdmin = (req as any).superAdmin;

      const request = await prisma.senderIdRequest.findUnique({
        where: { id },
      });

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
      }

      if (!['PENDING', 'REVIEWING'].includes(request.status)) {
        return res.status(400).json({
          success: false,
          message: `Cannot reject a request with status: ${request.status}`,
        });
      }

      const updated = await prisma.senderIdRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          statusReason: `Rejected by Super Admin (${superAdmin?.email || 'Unknown'}): ${reason}`,
          processedAt: new Date(),
          // Note: processedById links to User table, Super Admins are separate - leave null
        },
      });

      res.json({
        success: true,
        message: 'Request rejected',
        data: updated,
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] Failed to reject request:', error);
      res.status(500).json({ success: false, message: 'Failed to reject request' });
    }
  }
);

export default router;
