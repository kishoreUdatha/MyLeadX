/**
 * Messaging Portal Settings Routes
 * Allows resellers to manage their DLT config, templates, sender ID requests, and API keys
 */

import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const router = Router();

// Note: Authentication is handled by parent router (messaging-portal.routes.ts)

// ============================================
// DLT CONFIGURATION (Read-only for resellers)
// ============================================

/**
 * GET /settings/dlt-config
 * Get organization's DLT configuration
 */
router.get('/dlt-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        smsEnabled: true,
        whatsappEnabled: true,
        rcsEnabled: true,
        smsSenderId: true,
        smsProviderType: true,
        customDltEntityId: true,
        customDltSenderId: true,
        customDltTeleMarketerId: true,
        dltPlatform: true,
        dltRegisteredName: true,
        dltConfiguredAt: true,
        messagingNotes: true,
      },
    });

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Format response
    const dltConfig = {
      organizationName: organization.name,
      channels: {
        sms: organization.smsEnabled,
        whatsapp: organization.whatsappEnabled,
        rcs: organization.rcsEnabled,
      },
      dltType: organization.smsProviderType, // 'PLATFORM' or 'CUSTOM'
      senderId: organization.smsProviderType === 'CUSTOM'
        ? organization.customDltSenderId
        : organization.smsSenderId,
      // Only show custom DLT details if they have custom DLT
      customDlt: organization.smsProviderType === 'CUSTOM' ? {
        entityId: organization.customDltEntityId,
        senderId: organization.customDltSenderId,
        teleMarketerId: organization.customDltTeleMarketerId,
        platform: organization.dltPlatform,
        registeredName: organization.dltRegisteredName,
        configuredAt: organization.dltConfiguredAt,
      } : null,
      notes: organization.messagingNotes,
    };

    res.json(dltConfig);
  } catch (error) {
    console.error('[Settings] Get DLT config error:', error);
    res.status(500).json({ error: 'Failed to fetch DLT configuration' });
  }
});

// ============================================
// DLT TEMPLATES (For Custom DLT customers)
// ============================================

/**
 * GET /settings/dlt-templates
 * Get organization's DLT templates
 */
router.get('/dlt-templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Check if organization has custom DLT
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { smsProviderType: true },
    });

    if (organization?.smsProviderType !== 'CUSTOM') {
      return res.status(403).json({
        error: 'DLT templates are only available for organizations with their own DLT registration'
      });
    }

    const templates = await prisma.organizationSmsTemplate.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(templates);
  } catch (error) {
    console.error('[Settings] Get DLT templates error:', error);
    res.status(500).json({ error: 'Failed to fetch DLT templates' });
  }
});

/**
 * POST /settings/dlt-templates
 * Create a new DLT template
 */
router.post('/dlt-templates', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { name, description, dltTemplateId, dltContentType, content, variables, sampleValues } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Check if organization has custom DLT
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { smsProviderType: true },
    });

    if (organization?.smsProviderType !== 'CUSTOM') {
      return res.status(403).json({
        error: 'DLT templates are only available for organizations with their own DLT registration'
      });
    }

    // Validate required fields
    if (!name || !dltTemplateId || !content) {
      return res.status(400).json({ error: 'Name, DLT Template ID, and content are required' });
    }

    // Check for duplicate template ID
    const existing = await prisma.organizationSmsTemplate.findFirst({
      where: { organizationId, dltTemplateId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Template with this DLT Template ID already exists' });
    }

    const template = await prisma.organizationSmsTemplate.create({
      data: {
        organizationId,
        name,
        description,
        dltTemplateId,
        dltContentType: dltContentType || 'TRANSACTIONAL',
        content,
        variables: variables || [],
        sampleValues: sampleValues || {},
        isActive: true,
        isVerified: false, // Needs super admin verification
      },
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('[Settings] Create DLT template error:', error);
    res.status(500).json({ error: 'Failed to create DLT template' });
  }
});

/**
 * PUT /settings/dlt-templates/:id
 * Update a DLT template
 */
router.put('/dlt-templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { name, description, content, variables, sampleValues, isActive } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify template belongs to organization
    const existing = await prisma.organizationSmsTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const template = await prisma.organizationSmsTemplate.update({
      where: { id },
      data: {
        name,
        description,
        content,
        variables,
        sampleValues,
        isActive,
        // Reset verification if content changed
        isVerified: content !== existing.content ? false : existing.isVerified,
        verifiedAt: content !== existing.content ? null : existing.verifiedAt,
      },
    });

    res.json(template);
  } catch (error) {
    console.error('[Settings] Update DLT template error:', error);
    res.status(500).json({ error: 'Failed to update DLT template' });
  }
});

/**
 * DELETE /settings/dlt-templates/:id
 * Delete a DLT template
 */
router.delete('/dlt-templates/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify template belongs to organization
    const existing = await prisma.organizationSmsTemplate.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await prisma.organizationSmsTemplate.delete({ where: { id } });

    res.json({ success: true, message: 'Template deleted' });
  } catch (error) {
    console.error('[Settings] Delete DLT template error:', error);
    res.status(500).json({ error: 'Failed to delete DLT template' });
  }
});

// ============================================
// SENDER ID REQUESTS
// ============================================

/**
 * GET /settings/sender-id-requests
 * Get organization's sender ID requests
 */
router.get('/sender-id-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const requests = await prisma.senderIdRequest.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      include: {
        processedBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    res.json(requests);
  } catch (error) {
    console.error('[Settings] Get sender ID requests error:', error);
    res.status(500).json({ error: 'Failed to fetch sender ID requests' });
  }
});

/**
 * POST /settings/sender-id-requests
 * Submit a new sender ID request
 */
router.post('/sender-id-requests', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const {
      requestedSenderId,
      businessName,
      businessType,
      purpose,
      contactName,
      contactEmail,
      contactPhone,
      hasOwnDlt,
      dltEntityId,
      dltPlatform,
    } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Validate required fields
    if (!requestedSenderId || !businessName || !contactName || !contactEmail) {
      return res.status(400).json({
        error: 'Requested Sender ID, business name, contact name, and contact email are required'
      });
    }

    // Validate sender ID format (6 chars, alphanumeric)
    if (!/^[A-Z]{6}$/.test(requestedSenderId.toUpperCase())) {
      return res.status(400).json({
        error: 'Sender ID must be exactly 6 uppercase letters'
      });
    }

    // Check for existing pending request
    const pendingRequest = await prisma.senderIdRequest.findFirst({
      where: {
        organizationId,
        status: { in: ['PENDING', 'REVIEWING'] },
      },
    });

    if (pendingRequest) {
      return res.status(400).json({
        error: 'You already have a pending sender ID request. Please wait for it to be processed.'
      });
    }

    const request = await prisma.senderIdRequest.create({
      data: {
        organizationId,
        requestedSenderId: requestedSenderId.toUpperCase(),
        businessName,
        businessType,
        purpose,
        contactName,
        contactEmail,
        contactPhone,
        hasOwnDlt: hasOwnDlt || false,
        dltEntityId: hasOwnDlt ? dltEntityId : null,
        dltPlatform: hasOwnDlt ? dltPlatform : null,
        status: 'PENDING',
      },
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('[Settings] Create sender ID request error:', error);
    res.status(500).json({ error: 'Failed to submit sender ID request' });
  }
});

/**
 * DELETE /settings/sender-id-requests/:id
 * Cancel a pending sender ID request
 */
router.delete('/sender-id-requests/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify request belongs to organization and is pending
    const existing = await prisma.senderIdRequest.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    await prisma.senderIdRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Request cancelled' });
  } catch (error) {
    console.error('[Settings] Cancel sender ID request error:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// ============================================
// API KEYS
// ============================================

/**
 * Generate a secure API key
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = 'mlx_' + crypto.randomBytes(4).toString('hex');
  const secret = crypto.randomBytes(24).toString('hex');
  const key = `${prefix}_${secret}`;
  const hash = bcrypt.hashSync(key, 10);
  return { key, prefix, hash };
}

/**
 * GET /settings/api-keys
 * Get organization's API keys (without the actual keys)
 */
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const apiKeys = await prisma.messagingApiKey.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        dailyLimit: true,
        ipWhitelist: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    res.json(apiKeys);
  } catch (error) {
    console.error('[Settings] Get API keys error:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

/**
 * POST /settings/api-keys
 * Create a new API key
 */
router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const userId = req.user?.id;
    const { name, description, permissions, rateLimit, dailyLimit, ipWhitelist, expiresAt } = req.body;

    if (!organizationId || !userId) {
      return res.status(400).json({ error: 'Organization or user not found' });
    }

    // Validate required fields
    if (!name) {
      return res.status(400).json({ error: 'API key name is required' });
    }

    // Generate the API key
    const { key, prefix, hash } = generateApiKey();

    const apiKey = await prisma.messagingApiKey.create({
      data: {
        organizationId,
        createdById: userId,
        name,
        description,
        keyPrefix: prefix,
        keyHash: hash,
        permissions: permissions || { sms: true, whatsapp: true, rcs: true },
        rateLimit: rateLimit || 100,
        dailyLimit,
        ipWhitelist: ipWhitelist || [],
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive: true,
      },
    });

    // Return the full key ONLY on creation (it won't be shown again)
    res.status(201).json({
      id: apiKey.id,
      name: apiKey.name,
      description: apiKey.description,
      keyPrefix: apiKey.keyPrefix,
      apiKey: key, // Only returned on creation!
      permissions: apiKey.permissions,
      rateLimit: apiKey.rateLimit,
      dailyLimit: apiKey.dailyLimit,
      ipWhitelist: apiKey.ipWhitelist,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
      message: 'Save this API key securely. It will not be shown again.',
    });
  } catch (error) {
    console.error('[Settings] Create API key error:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * PUT /settings/api-keys/:id
 * Update an API key (cannot change the key itself)
 */
router.put('/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { name, description, permissions, rateLimit, dailyLimit, ipWhitelist, isActive, expiresAt } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify API key belongs to organization
    const existing = await prisma.messagingApiKey.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const apiKey = await prisma.messagingApiKey.update({
      where: { id },
      data: {
        name,
        description,
        permissions,
        rateLimit,
        dailyLimit,
        ipWhitelist,
        isActive,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        keyPrefix: true,
        permissions: true,
        rateLimit: true,
        dailyLimit: true,
        ipWhitelist: true,
        isActive: true,
        expiresAt: true,
        lastUsedAt: true,
        usageCount: true,
        createdAt: true,
      },
    });

    res.json(apiKey);
  } catch (error) {
    console.error('[Settings] Update API key error:', error);
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

/**
 * DELETE /settings/api-keys/:id
 * Delete an API key
 */
router.delete('/api-keys/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify API key belongs to organization
    const existing = await prisma.messagingApiKey.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await prisma.messagingApiKey.delete({ where: { id } });

    res.json({ success: true, message: 'API key deleted' });
  } catch (error) {
    console.error('[Settings] Delete API key error:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

export default router;
