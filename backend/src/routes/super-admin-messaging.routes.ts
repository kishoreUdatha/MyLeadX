/**
 * Super Admin Messaging Routes
 * Manage messaging credits, pricing, sender IDs, and analytics across all organizations
 */

import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { prisma } from '../config/database';
import { validate } from '../middlewares/validate';
import { MessageChannel, MessageCreditTransactionType } from '@prisma/client';
import { senderIdNotificationService } from '../services/sender-id-notification.service';

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
    body('msg91TemplateId').optional().isString().trim(),
    body('content').isString().trim().notEmpty(),
    body('dltContentType').optional().isIn(['TRANSACTIONAL', 'PROMOTIONAL']),
    body('variables').optional().isArray(),
    body('description').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, dltTemplateId, msg91TemplateId, content, dltContentType, variables, description } = req.body;

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
          msg91TemplateId: msg91TemplateId || null, // MSG91 Flow API template ID
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
    body('msg91TemplateId').optional().isString().trim(),
    body('variables').optional().isArray(),
    body('isActive').optional().isBoolean(),
    body('description').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id, templateId } = req.params;
      const { name, content, msg91TemplateId, variables, isActive, description } = req.body;

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
          ...(msg91TemplateId !== undefined && { msg91TemplateId }),
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

// ==================== DLT VALIDATION ====================

/**
 * POST /organizations/:id/dlt-validate - Validate DLT credentials by sending a test SMS
 * This verifies that the PE ID, Sender ID, and Template ID are correctly configured
 */
router.post(
  '/organizations/:id/dlt-validate',
  validate([
    body('testPhone').isMobilePhone('any').withMessage('Valid phone number is required'),
    body('templateId').optional().isString().trim(),
  ]),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { testPhone, templateId } = req.body;

      // Get organization's DLT configuration
      const org = await prisma.organization.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          smsProviderType: true,
          smsSenderId: true,
          customDltEntityId: true,
          customDltSenderId: true,
          customDltTeleMarketerId: true,
          smsEnabled: true,
        },
      });

      if (!org) {
        return res.status(404).json({ success: false, message: 'Organization not found' });
      }

      const validationResults: {
        peIdValid: boolean;
        senderIdValid: boolean;
        templateIdValid: boolean;
        telemarketerIdValid: boolean;
        testSmsSent: boolean;
        errors: string[];
        warnings: string[];
      } = {
        peIdValid: false,
        senderIdValid: false,
        templateIdValid: false,
        telemarketerIdValid: true, // Optional field
        testSmsSent: false,
        errors: [],
        warnings: [],
      };

      // Validate based on provider type
      if (org.smsProviderType === 'CUSTOM') {
        // Validate PE ID format (19 digits for India DLT)
        if (org.customDltEntityId) {
          const peIdRegex = /^\d{19}$/;
          if (peIdRegex.test(org.customDltEntityId)) {
            validationResults.peIdValid = true;
          } else {
            validationResults.errors.push('PE ID (Entity ID) must be exactly 19 digits');
          }
        } else {
          validationResults.errors.push('PE ID (Entity ID) is required for custom DLT');
        }

        // Validate Sender ID format (6 uppercase letters)
        if (org.customDltSenderId) {
          const senderIdRegex = /^[A-Z]{6}$/;
          if (senderIdRegex.test(org.customDltSenderId)) {
            validationResults.senderIdValid = true;
          } else {
            validationResults.errors.push('Sender ID must be exactly 6 uppercase letters');
          }
        } else {
          validationResults.errors.push('Sender ID is required for custom DLT');
        }

        // Validate Telemarketer ID if provided (optional, 19 digits)
        if (org.customDltTeleMarketerId) {
          const tmIdRegex = /^\d{19}$/;
          if (!tmIdRegex.test(org.customDltTeleMarketerId)) {
            validationResults.telemarketerIdValid = false;
            validationResults.warnings.push('Telemarketer ID should be 19 digits if provided');
          }
        }
      } else {
        // Platform DLT - validate assigned sender ID
        if (org.smsSenderId) {
          const senderIdRegex = /^[A-Z]{6}$/;
          if (senderIdRegex.test(org.smsSenderId)) {
            validationResults.senderIdValid = true;
            validationResults.peIdValid = true; // Platform PE ID is managed by MyLeadX
          } else {
            validationResults.errors.push('Assigned Sender ID format is invalid');
          }
        } else {
          validationResults.warnings.push('No Sender ID assigned yet. Please request one.');
        }
      }

      // Validate template if provided
      let testTemplate = null;
      if (templateId) {
        testTemplate = await prisma.organizationSmsTemplate.findFirst({
          where: {
            organizationId: id,
            dltTemplateId: templateId,
            isActive: true,
          },
        });

        if (testTemplate) {
          validationResults.templateIdValid = true;
        } else {
          // Check if it's in the general templates
          const generalTemplate = await prisma.messageTemplate.findFirst({
            where: {
              dltTemplateId: templateId,
              isActive: true,
            },
          });
          if (generalTemplate) {
            validationResults.templateIdValid = true;
            testTemplate = generalTemplate;
          } else {
            validationResults.errors.push('Template ID not found in registered templates');
          }
        }
      }

      // Send test SMS if validation passes
      if (validationResults.peIdValid && validationResults.senderIdValid && !validationResults.errors.length) {
        try {
          // Import SMS service
          const { smsService } = await import('../services/messaging');

          // Normalize phone
          let normalizedPhone = testPhone.replace(/\D/g, '');
          if (normalizedPhone.length === 10) {
            normalizedPhone = '91' + normalizedPhone;
          }

          // Use test template or a simple validation message
          const testMessage = testTemplate?.content || 'This is a test message to validate your DLT configuration. - MyLeadX';
          const dltTemplateId = templateId || testTemplate?.dltTemplateId;

          if (!dltTemplateId) {
            validationResults.warnings.push('No DLT Template ID provided. Test SMS may fail without a valid template.');
          }

          const result = await smsService.send({
            phone: normalizedPhone,
            message: testMessage,
            dltTemplateId,
            organizationId: id,
            userId: 'system-validation',
          });

          if (result.success) {
            validationResults.testSmsSent = true;
          } else {
            validationResults.errors.push(`Test SMS failed: ${result.error}`);
          }
        } catch (smsError: any) {
          validationResults.errors.push(`SMS service error: ${smsError.message}`);
        }
      }

      // Determine overall status
      const isValid = validationResults.peIdValid &&
                      validationResults.senderIdValid &&
                      validationResults.errors.length === 0;

      res.json({
        success: true,
        data: {
          organizationId: id,
          organizationName: org.name,
          providerType: org.smsProviderType,
          isValid,
          validation: validationResults,
          configuration: {
            peId: org.smsProviderType === 'CUSTOM' ? org.customDltEntityId : '(Platform Managed)',
            senderId: org.smsProviderType === 'CUSTOM' ? org.customDltSenderId : org.smsSenderId,
            teleMarketerId: org.customDltTeleMarketerId || null,
          },
          recommendations: isValid ? [] : [
            !validationResults.peIdValid && 'Ensure PE ID is 19 digits from your DLT portal',
            !validationResults.senderIdValid && 'Ensure Sender ID is 6 uppercase letters registered on DLT',
            !validationResults.testSmsSent && 'Send a test SMS to verify end-to-end connectivity',
          ].filter(Boolean),
        },
      });
    } catch (error) {
      console.error('[SuperAdmin Messaging] DLT validation error:', error);
      res.status(500).json({ success: false, message: 'Failed to validate DLT configuration' });
    }
  }
);

/**
 * GET /dlt-platforms - Get list of DLT platforms in India
 */
router.get('/dlt-platforms', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      platforms: [
        { code: 'JIO', name: 'Jio DLT', url: 'https://trueconnect.jio.com' },
        { code: 'AIRTEL', name: 'Airtel DLT', url: 'https://dlt.airtel.in' },
        { code: 'VI', name: 'Vi (Vodafone-Idea) DLT', url: 'https://www.vilpower.in' },
        { code: 'BSNL', name: 'BSNL DLT', url: 'https://www.ucc-bsnl.co.in' },
      ],
      requirements: {
        peId: {
          description: 'Principal Entity ID - 19 digit unique identifier',
          format: '19 digits',
          example: '1234567890123456789',
        },
        senderId: {
          description: 'Sender ID - 6 character alphanumeric header',
          format: '6 uppercase letters',
          example: 'MLXCRM',
        },
        templateId: {
          description: 'DLT Template ID - Unique ID for registered message template',
          format: 'Alphanumeric string',
          example: '1234567890123456789',
        },
        teleMarketerId: {
          description: 'Telemarketer ID - Required if using a telemarketer/aggregator',
          format: '19 digits (optional)',
          example: '1234567890123456789',
          required: false,
        },
      },
      notes: [
        'All SMS messages in India require DLT registration',
        'Templates must be pre-registered on the DLT portal',
        'Sender ID must match exactly with DLT registration',
        'Telemarketer ID is required if you are using an aggregator',
      ],
    },
  });
});

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
      include: {
        organization: {
          select: { id: true, name: true },
        },
      },
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

    // Send review notification to customer
    senderIdNotificationService.notifyCustomerOnReview(
      {
        id: request.id,
        requestedSenderId: request.requestedSenderId,
        businessName: request.businessName,
        businessType: request.businessType,
        purpose: request.purpose,
        contactName: request.contactName,
        contactEmail: request.contactEmail,
        contactPhone: request.contactPhone,
        hasOwnDlt: request.hasOwnDlt,
        dltEntityId: request.dltEntityId,
        dltPlatform: request.dltPlatform,
        organizationId: request.organizationId,
        status: 'REVIEWING',
      },
      { id: request.organization.id, name: request.organization.name }
    ).catch(err => {
      console.error('[SuperAdmin Messaging] Failed to send review notification:', err);
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

      // Send approval notification to customer
      senderIdNotificationService.notifyCustomerOnApproval(
        {
          id: request.id,
          requestedSenderId: request.requestedSenderId,
          businessName: request.businessName,
          businessType: request.businessType,
          purpose: request.purpose,
          contactName: request.contactName,
          contactEmail: request.contactEmail,
          contactPhone: request.contactPhone,
          hasOwnDlt: request.hasOwnDlt,
          dltEntityId: request.dltEntityId,
          dltPlatform: request.dltPlatform,
          organizationId: request.organizationId,
          status: 'APPROVED',
          assignedSenderId: assignedSenderId.toUpperCase(),
        },
        { id: request.organization.id, name: request.organization.name }
      ).catch(err => {
        console.error('[SuperAdmin Messaging] Failed to send approval notification:', err);
      });

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
        include: {
          organization: {
            select: { id: true, name: true },
          },
        },
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

      // Send rejection notification to customer
      senderIdNotificationService.notifyCustomerOnRejection(
        {
          id: request.id,
          requestedSenderId: request.requestedSenderId,
          businessName: request.businessName,
          businessType: request.businessType,
          purpose: request.purpose,
          contactName: request.contactName,
          contactEmail: request.contactEmail,
          contactPhone: request.contactPhone,
          hasOwnDlt: request.hasOwnDlt,
          dltEntityId: request.dltEntityId,
          dltPlatform: request.dltPlatform,
          organizationId: request.organizationId,
          status: 'REJECTED',
          statusReason: reason,
        },
        { id: request.organization.id, name: request.organization.name },
        reason
      ).catch(err => {
        console.error('[SuperAdmin Messaging] Failed to send rejection notification:', err);
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
