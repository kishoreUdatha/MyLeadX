/**
 * Messaging Portal Settings Routes
 * Allows resellers to manage their DLT config, templates, sender ID requests, and API keys
 */

import { Router, Response } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { senderIdNotificationService } from '../services/sender-id-notification.service';

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

/**
 * PUT /settings/dlt-config
 * Update organization's DLT configuration (switch to Custom DLT)
 */
router.put('/dlt-config', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const {
      dltType,
      entityId,
      senderId,
      teleMarketerId,
      platform,
      registeredName,
    } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Validate DLT type
    if (!['PLATFORM', 'CUSTOM'].includes(dltType)) {
      return res.status(400).json({ error: 'Invalid DLT type. Must be PLATFORM or CUSTOM' });
    }

    // If switching to Custom DLT, validate required fields
    if (dltType === 'CUSTOM') {
      // Validate PE ID format (19 digits)
      if (!entityId) {
        return res.status(400).json({ error: 'PE ID (Entity ID) is required for Custom DLT' });
      }
      if (!/^\d{19}$/.test(entityId)) {
        return res.status(400).json({
          error: 'PE ID must be exactly 19 digits',
          hint: 'You can find your PE ID in your DLT portal dashboard'
        });
      }

      // Validate Sender ID format (6 uppercase letters)
      if (!senderId) {
        return res.status(400).json({ error: 'Sender ID is required for Custom DLT' });
      }
      if (!/^[A-Z]{6}$/.test(senderId.toUpperCase())) {
        return res.status(400).json({
          error: 'Sender ID must be exactly 6 uppercase letters',
          hint: 'Example: MYBRAND, ACMECY'
        });
      }

      // Validate Telemarketer ID if provided (19 digits)
      if (teleMarketerId && !/^\d{19}$/.test(teleMarketerId)) {
        return res.status(400).json({
          error: 'Telemarketer ID must be exactly 19 digits if provided'
        });
      }

      // Validate platform if provided
      const validPlatforms = ['JIO', 'AIRTEL', 'VI', 'BSNL'];
      if (platform && !validPlatforms.includes(platform.toUpperCase())) {
        return res.status(400).json({
          error: `Invalid DLT platform. Must be one of: ${validPlatforms.join(', ')}`
        });
      }
    }

    // Get current organization data
    const currentOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        smsProviderType: true,
        smsSenderId: true,
        smsEnabled: true,
      },
    });

    if (!currentOrg) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Update organization with new DLT config
    const updateData: any = {
      smsProviderType: dltType,
      dltConfiguredAt: new Date(),
    };

    if (dltType === 'CUSTOM') {
      updateData.customDltEntityId = entityId;
      updateData.customDltSenderId = senderId.toUpperCase();
      updateData.customDltTeleMarketerId = teleMarketerId || null;
      updateData.dltPlatform = platform?.toUpperCase() || null;
      updateData.dltRegisteredName = registeredName || null;
      // Enable SMS if not already enabled
      if (!currentOrg.smsEnabled) {
        updateData.smsEnabled = true;
      }
    } else {
      // Switching back to Platform DLT - clear custom fields
      updateData.customDltEntityId = null;
      updateData.customDltSenderId = null;
      updateData.customDltTeleMarketerId = null;
      updateData.dltPlatform = null;
      updateData.dltRegisteredName = null;
    }

    const updatedOrg = await prisma.organization.update({
      where: { id: organizationId },
      data: updateData,
      select: {
        id: true,
        name: true,
        smsEnabled: true,
        smsProviderType: true,
        smsSenderId: true,
        customDltEntityId: true,
        customDltSenderId: true,
        customDltTeleMarketerId: true,
        dltPlatform: true,
        dltRegisteredName: true,
        dltConfiguredAt: true,
      },
    });

    // Format response
    const dltConfig = {
      organizationName: updatedOrg.name,
      channels: {
        sms: updatedOrg.smsEnabled,
        whatsapp: false,
        rcs: false,
      },
      dltType: updatedOrg.smsProviderType,
      senderId: updatedOrg.smsProviderType === 'CUSTOM'
        ? updatedOrg.customDltSenderId
        : updatedOrg.smsSenderId,
      customDlt: updatedOrg.smsProviderType === 'CUSTOM' ? {
        entityId: updatedOrg.customDltEntityId,
        senderId: updatedOrg.customDltSenderId,
        teleMarketerId: updatedOrg.customDltTeleMarketerId,
        platform: updatedOrg.dltPlatform,
        registeredName: updatedOrg.dltRegisteredName,
        configuredAt: updatedOrg.dltConfiguredAt,
      } : null,
    };

    console.log(`[Settings] DLT config updated for org ${organizationId}: ${dltType}`);

    res.json({
      success: true,
      message: dltType === 'CUSTOM'
        ? 'Custom DLT configuration saved successfully. Please add your DLT templates next.'
        : 'Switched to Platform DLT. Contact support to get a Sender ID assigned.',
      config: dltConfig,
    });
  } catch (error) {
    console.error('[Settings] Update DLT config error:', error);
    res.status(500).json({ error: 'Failed to update DLT configuration' });
  }
});

/**
 * POST /settings/dlt-validate
 * Validate organization's DLT configuration with comprehensive pre-checks
 * Optionally sends a test SMS if sendTestSms=true
 */
router.post('/dlt-validate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { testPhone, templateId, sendTestSms = true } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Get organization's DLT configuration
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Comprehensive validation result
    const validation = {
      // Pre-checks (no SMS needed)
      preChecks: {
        smsEnabled: false,
        hasCredits: false,
        peIdConfigured: false,
        peIdFormatValid: false,
        senderIdConfigured: false,
        senderIdFormatValid: false,
        telemarketerIdValid: true, // Optional field
        templateConfigured: false,
        msg91Configured: false,
      },
      // Final validation (requires test SMS)
      peIdValid: false,
      senderIdValid: false,
      templateValid: false,
      testSmsSent: false,
      errors: [] as string[],
      warnings: [] as string[],
      preChecksPassed: false,
    };

    // ========== PRE-CHECK 1: SMS Enabled ==========
    if (organization.smsEnabled) {
      validation.preChecks.smsEnabled = true;
    } else {
      validation.errors.push('SMS is not enabled for your organization. Contact support to enable.');
    }

    // ========== PRE-CHECK 2: Check Credits ==========
    const balance = await prisma.messageBalance.findUnique({
      where: { organizationId },
      select: { smsCredits: true },
    });

    if (balance && balance.smsCredits > 0) {
      validation.preChecks.hasCredits = true;
    } else {
      validation.errors.push(`Insufficient SMS credits. You have ${balance?.smsCredits || 0} credits. Please purchase credits first.`);
    }

    // ========== PRE-CHECK 3: MSG91 Configuration ==========
    const { config } = await import('../config');
    if (config.msg91?.authKey) {
      validation.preChecks.msg91Configured = true;
    } else {
      validation.errors.push('SMS provider (MSG91) is not configured. Contact support.');
    }

    // ========== PRE-CHECK 4: DLT Credentials ==========
    if (organization.smsProviderType === 'CUSTOM') {
      // Custom DLT - Customer has their own registration

      // PE ID Check
      if (organization.customDltEntityId) {
        validation.preChecks.peIdConfigured = true;
        if (/^\d{19}$/.test(organization.customDltEntityId)) {
          validation.preChecks.peIdFormatValid = true;
          validation.peIdValid = true;
        } else {
          validation.errors.push(`PE ID format invalid. Must be exactly 19 digits. Current: ${organization.customDltEntityId.length} characters.`);
        }
      } else {
        validation.errors.push('PE ID (Entity ID) is not configured. Please provide your 19-digit DLT PE ID.');
      }

      // Sender ID Check
      if (organization.customDltSenderId) {
        validation.preChecks.senderIdConfigured = true;
        if (/^[A-Z]{6}$/.test(organization.customDltSenderId)) {
          validation.preChecks.senderIdFormatValid = true;
          validation.senderIdValid = true;
        } else {
          validation.errors.push(`Sender ID format invalid. Must be exactly 6 uppercase letters. Current: "${organization.customDltSenderId}"`);
        }
      } else {
        validation.errors.push('Sender ID is not configured. Please provide your 6-letter DLT Sender ID.');
      }

      // Telemarketer ID Check (optional)
      if (organization.customDltTeleMarketerId) {
        if (!/^\d{19}$/.test(organization.customDltTeleMarketerId)) {
          validation.preChecks.telemarketerIdValid = false;
          validation.warnings.push('Telemarketer ID format should be 19 digits if provided.');
        }
      }

    } else {
      // Platform DLT - Using MyLeadX's DLT
      validation.preChecks.peIdConfigured = true;
      validation.preChecks.peIdFormatValid = true;
      validation.peIdValid = true; // Platform PE ID is managed by MyLeadX

      if (organization.smsSenderId) {
        validation.preChecks.senderIdConfigured = true;
        if (/^[A-Z]{6}$/.test(organization.smsSenderId)) {
          validation.preChecks.senderIdFormatValid = true;
          validation.senderIdValid = true;
        } else {
          validation.errors.push('Assigned Sender ID format is invalid. Contact support.');
        }
      } else {
        validation.errors.push('No Sender ID assigned yet. Please submit a Sender ID request from Settings.');
      }
    }

    // ========== PRE-CHECK 5: Template Check ==========
    let testTemplate: any = null;
    if (templateId) {
      // Check organization's custom templates
      testTemplate = await prisma.organizationSmsTemplate.findFirst({
        where: {
          organizationId,
          dltTemplateId: templateId,
          isActive: true,
        },
      });

      if (!testTemplate) {
        // Check general message templates
        testTemplate = await prisma.messageTemplate.findFirst({
          where: {
            dltTemplateId: templateId,
            isActive: true,
          },
        });
      }

      if (testTemplate) {
        validation.preChecks.templateConfigured = true;
        validation.templateValid = true;
      } else {
        validation.warnings.push(`Template ID "${templateId}" not found in registered templates. It may still work if registered on DLT portal.`);
      }
    } else {
      // Check if default template exists in config
      if (config.msg91?.defaultTemplateId) {
        validation.preChecks.templateConfigured = true;
        validation.warnings.push('Using system default template for validation.');
      } else {
        validation.warnings.push('No template ID provided. Test SMS may fail without a valid DLT template.');
      }
    }

    // ========== Calculate Pre-Checks Status ==========
    const criticalPreChecks = [
      validation.preChecks.smsEnabled,
      validation.preChecks.hasCredits,
      validation.preChecks.msg91Configured,
      validation.preChecks.peIdConfigured,
      validation.preChecks.peIdFormatValid,
      validation.preChecks.senderIdConfigured,
      validation.preChecks.senderIdFormatValid,
    ];

    validation.preChecksPassed = criticalPreChecks.every(check => check === true);

    // ========== SEND TEST SMS (Only if pre-checks pass and requested) ==========
    if (sendTestSms && validation.preChecksPassed) {
      if (!testPhone) {
        validation.errors.push('Test phone number is required to send test SMS.');
      } else {
        try {
          const { smsService } = await import('../services/messaging');

          let normalizedPhone = testPhone.replace(/\D/g, '');
          if (normalizedPhone.length === 10) {
            normalizedPhone = '91' + normalizedPhone;
          }

          // Validate phone format
          if (!/^91\d{10}$/.test(normalizedPhone)) {
            validation.errors.push('Invalid phone number format. Please enter a valid 10-digit Indian mobile number.');
          } else {
            const testMessage = testTemplate?.content ||
              'DLT Validation Test: Your MyLeadX SMS configuration is working correctly. - MyLeadX';
            const dltTemplateId = templateId || testTemplate?.dltTemplateId || config.msg91?.defaultTemplateId;

            if (!dltTemplateId) {
              validation.errors.push('No DLT Template ID available. Please provide a template ID or contact support to set a default.');
            } else {
              console.log(`[DLT Validation] Sending test SMS to ${normalizedPhone} with template ${dltTemplateId}`);

              const result = await smsService.send({
                phone: normalizedPhone,
                message: testMessage,
                dltTemplateId,
                organizationId,
                userId: req.user?.id || 'validation',
              });

              if (result.success) {
                validation.testSmsSent = true;
              } else {
                // Parse MSG91 error for better user feedback
                const errorMsg = result.error || 'Unknown error';
                if (errorMsg.includes('invalid') && errorMsg.toLowerCase().includes('sender')) {
                  validation.errors.push(`MSG91 rejected: Sender ID not registered on DLT. Please verify "${organization.smsProviderType === 'CUSTOM' ? organization.customDltSenderId : organization.smsSenderId}" is registered under your PE ID.`);
                } else if (errorMsg.includes('template')) {
                  validation.errors.push(`MSG91 rejected: Template mismatch. The message content doesn't match the DLT registered template.`);
                } else if (errorMsg.includes('entity') || errorMsg.includes('PE_ID')) {
                  validation.errors.push(`MSG91 rejected: Invalid PE ID. Please verify your Principal Entity ID is correct and active.`);
                } else {
                  validation.errors.push(`Test SMS failed: ${errorMsg}`);
                }
              }
            }
          }
        } catch (smsError: any) {
          console.error('[DLT Validation] SMS error:', smsError);
          validation.errors.push(`SMS service error: ${smsError.message}`);
        }
      }
    } else if (sendTestSms && !validation.preChecksPassed) {
      validation.warnings.push('Test SMS skipped because pre-checks failed. Fix the errors above first.');
    }

    // ========== Final Result ==========
    const isValid = validation.preChecksPassed &&
                    validation.peIdValid &&
                    validation.senderIdValid &&
                    (sendTestSms ? validation.testSmsSent : true) &&
                    validation.errors.length === 0;

    // Generate recommendations
    const recommendations: string[] = [];
    if (!validation.preChecks.smsEnabled) {
      recommendations.push('Contact support to enable SMS for your organization');
    }
    if (!validation.preChecks.hasCredits) {
      recommendations.push('Purchase SMS credits from Billing page');
    }
    if (!validation.preChecks.peIdConfigured || !validation.preChecks.peIdFormatValid) {
      recommendations.push('Get your 19-digit PE ID from your DLT portal (Jio/Airtel/Vi/BSNL)');
    }
    if (!validation.preChecks.senderIdConfigured || !validation.preChecks.senderIdFormatValid) {
      recommendations.push('Register a 6-letter Sender ID on your DLT portal');
    }
    if (!validation.preChecks.templateConfigured) {
      recommendations.push('Register message templates on your DLT portal and add them in Settings');
    }
    if (isValid) {
      recommendations.push('Your DLT configuration is valid and working!');
    }

    res.json({
      success: true,
      isValid,
      validation,
      configuration: {
        providerType: organization.smsProviderType,
        peId: organization.smsProviderType === 'CUSTOM'
          ? (organization.customDltEntityId ? '****' + organization.customDltEntityId.slice(-4) : null)
          : '(Platform Managed)',
        senderId: organization.smsProviderType === 'CUSTOM'
          ? organization.customDltSenderId
          : organization.smsSenderId,
        teleMarketerId: organization.customDltTeleMarketerId
          ? '****' + organization.customDltTeleMarketerId.slice(-4)
          : null,
        smsEnabled: organization.smsEnabled,
        credits: balance?.smsCredits || 0,
      },
      recommendations,
    });
  } catch (error) {
    console.error('[Settings] DLT validation error:', error);
    res.status(500).json({ error: 'Failed to validate DLT configuration' });
  }
});

/**
 * POST /settings/dlt-precheck
 * Quick pre-check without sending test SMS (free, instant)
 */
router.post('/dlt-precheck', async (req: AuthenticatedRequest, res: Response) => {
  // Redirect to main validation with sendTestSms=false
  req.body.sendTestSms = false;
  // Forward to the main validation handler
  const organizationId = req.user?.organizationId;

  if (!organizationId) {
    return res.status(400).json({ error: 'Organization not found' });
  }

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    const preChecks = {
      smsEnabled: organization.smsEnabled || false,
      peIdConfigured: false,
      peIdFormatValid: false,
      senderIdConfigured: false,
      senderIdFormatValid: false,
      hasCredits: false,
      errors: [] as string[],
    };

    // Check credits
    const balance = await prisma.messageBalance.findUnique({
      where: { organizationId },
      select: { smsCredits: true },
    });
    preChecks.hasCredits = (balance?.smsCredits || 0) > 0;

    // Check DLT config
    if (organization.smsProviderType === 'CUSTOM') {
      preChecks.peIdConfigured = !!organization.customDltEntityId;
      preChecks.peIdFormatValid = /^\d{19}$/.test(organization.customDltEntityId || '');
      preChecks.senderIdConfigured = !!organization.customDltSenderId;
      preChecks.senderIdFormatValid = /^[A-Z]{6}$/.test(organization.customDltSenderId || '');
    } else {
      preChecks.peIdConfigured = true;
      preChecks.peIdFormatValid = true;
      preChecks.senderIdConfigured = !!organization.smsSenderId;
      preChecks.senderIdFormatValid = /^[A-Z]{6}$/.test(organization.smsSenderId || '');
    }

    // Generate errors
    if (!preChecks.smsEnabled) preChecks.errors.push('SMS not enabled');
    if (!preChecks.hasCredits) preChecks.errors.push('No SMS credits');
    if (!preChecks.peIdConfigured) preChecks.errors.push('PE ID not configured');
    if (!preChecks.peIdFormatValid) preChecks.errors.push('PE ID format invalid');
    if (!preChecks.senderIdConfigured) preChecks.errors.push('Sender ID not configured');
    if (!preChecks.senderIdFormatValid) preChecks.errors.push('Sender ID format invalid');

    const allPassed = preChecks.smsEnabled &&
                      preChecks.hasCredits &&
                      preChecks.peIdConfigured &&
                      preChecks.peIdFormatValid &&
                      preChecks.senderIdConfigured &&
                      preChecks.senderIdFormatValid;

    res.json({
      success: true,
      preChecksPassed: allPassed,
      preChecks,
      message: allPassed
        ? 'All pre-checks passed! You can send a test SMS to verify with MSG91.'
        : 'Some pre-checks failed. Please fix the issues before testing.',
    });
  } catch (error) {
    console.error('[Settings] DLT precheck error:', error);
    res.status(500).json({ error: 'Failed to run pre-checks' });
  }
});

/**
 * GET /settings/dlt-requirements
 * Get DLT requirements and platform information
 */
router.get('/dlt-requirements', async (_req: AuthenticatedRequest, res: Response) => {
  res.json({
    platforms: [
      { code: 'JIO', name: 'Jio DLT', url: 'https://trueconnect.jio.com' },
      { code: 'AIRTEL', name: 'Airtel DLT', url: 'https://dlt.airtel.in' },
      { code: 'VI', name: 'Vi (Vodafone-Idea) DLT', url: 'https://www.vilpower.in' },
      { code: 'BSNL', name: 'BSNL DLT', url: 'https://www.ucc-bsnl.co.in' },
    ],
    requirements: {
      peId: {
        label: 'Principal Entity ID (PE ID)',
        description: 'Your unique 19-digit DLT registration ID',
        format: '19 digits',
        example: '1234567890123456789',
        required: true,
      },
      senderId: {
        label: 'Sender ID (Header)',
        description: 'Your 6-character alphanumeric sender header',
        format: '6 uppercase letters',
        example: 'MLXCRM',
        required: true,
      },
      templateId: {
        label: 'Template ID',
        description: 'DLT-approved message template ID',
        format: 'Alphanumeric string',
        example: '1234567890123456789',
        required: true,
      },
      teleMarketerId: {
        label: 'Telemarketer ID',
        description: 'Required only if using an aggregator/telemarketer',
        format: '19 digits',
        example: '1234567890123456789',
        required: false,
      },
    },
    steps: [
      'Register as Principal Entity on any DLT portal (Jio, Airtel, Vi, or BSNL)',
      'Get your PE ID after registration approval',
      'Register your Sender ID (6-letter header)',
      'Create and get approval for message templates',
      'Note down your Template IDs for each approved template',
      'Configure these details in MyLeadX settings',
      'Send a test SMS to validate the configuration',
    ],
    notes: [
      'All bulk SMS in India requires DLT registration (TRAI mandate)',
      'Templates must match exactly with DLT registration',
      'Sender ID must be registered under your PE ID',
      'If using MyLeadX as your aggregator, you may need our Telemarketer ID',
    ],
  });
});

// ============================================
// SENDER IDS (Multiple Sender IDs per customer)
// ============================================

/**
 * GET /settings/sender-ids
 * Get organization's sender IDs (includes new table, approved requests, and legacy org.smsSenderId)
 */
router.get('/sender-ids', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Get sender IDs from new OrganizationSenderId table
    let senderIds: any[] = [];
    try {
      senderIds = await prisma.organizationSenderId.findMany({
        where: { organizationId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
    } catch (e) {
      // Table might not exist yet, continue with empty array
      console.log('[Settings] OrganizationSenderId table not available:', e);
    }

    // Get approved sender ID requests
    const approvedRequests = await prisma.senderIdRequest.findMany({
      where: {
        organizationId,
        status: 'APPROVED',
        assignedSenderId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add approved requests as sender IDs (if not already in list)
    for (const request of approvedRequests) {
      if (request.assignedSenderId) {
        const exists = senderIds.some((s) => s.senderId === request.assignedSenderId);
        if (!exists) {
          senderIds.push({
            id: `request-${request.id}`,
            organizationId,
            senderId: request.assignedSenderId,
            name: request.businessName || request.requestedSenderId,
            description: request.purpose || 'Approved sender ID request',
            dltEntityId: request.dltEntityId,
            dltPlatform: request.dltPlatform,
            smsType: 'TRANSACTIONAL',
            isDefault: senderIds.length === 0,
            isActive: true,
            isVerified: true,
            verifiedAt: request.processedAt,
            verifiedBy: request.processedById,
            usageCount: 0,
            lastUsedAt: null,
            createdAt: request.createdAt,
            updatedAt: request.updatedAt,
          });
        }
      }
    }

    // Also check for legacy sender ID in Organization table
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { smsSenderId: true, name: true },
    });

    // If organization has a legacy sender ID and it's not already in the list, add it
    if (organization?.smsSenderId) {
      const legacySenderIdExists = senderIds.some(
        (s) => s.senderId === organization.smsSenderId
      );

      if (!legacySenderIdExists) {
        // Add legacy sender ID as a virtual entry
        senderIds.unshift({
          id: 'legacy-org-sender-id',
          organizationId,
          senderId: organization.smsSenderId,
          name: `${organization.name || 'Organization'} Default`,
          description: 'Legacy sender ID from organization settings',
          dltEntityId: null,
          dltPlatform: null,
          smsType: 'TRANSACTIONAL',
          isDefault: senderIds.length === 0, // Default only if no other sender IDs
          isActive: true,
          isVerified: true,
          verifiedAt: null,
          verifiedBy: null,
          usageCount: 0,
          lastUsedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    res.json(senderIds);
  } catch (error) {
    console.error('[Settings] Get sender IDs error:', error);
    res.status(500).json({ error: 'Failed to fetch sender IDs' });
  }
});

/**
 * POST /settings/sender-ids
 * Create a new sender ID
 */
router.post('/sender-ids', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { senderId, name, description, dltEntityId, dltPlatform, smsType, isDefault } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Validate required fields
    if (!senderId || !name) {
      return res.status(400).json({ error: 'Sender ID and name are required' });
    }

    // Validate sender ID format (6 uppercase letters)
    const normalizedSenderId = senderId.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!/^[A-Z]{6}$/.test(normalizedSenderId)) {
      return res.status(400).json({
        error: 'Sender ID must be exactly 6 uppercase letters',
        hint: 'Example: MYBRAND, ACMECY'
      });
    }

    // Check for duplicate sender ID
    const existing = await prisma.organizationSenderId.findFirst({
      where: { organizationId, senderId: normalizedSenderId },
    });

    if (existing) {
      return res.status(400).json({ error: 'This Sender ID already exists for your organization' });
    }

    // If setting as default, unset other defaults for same type
    if (isDefault) {
      await prisma.organizationSenderId.updateMany({
        where: {
          organizationId,
          smsType: smsType || 'TRANSACTIONAL',
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    // Get organization's DLT config for PE ID
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { customDltEntityId: true, dltPlatform: true, smsProviderType: true },
    });

    const newSenderId = await prisma.organizationSenderId.create({
      data: {
        organizationId,
        senderId: normalizedSenderId,
        name,
        description,
        dltEntityId: dltEntityId || org?.customDltEntityId || null,
        dltPlatform: dltPlatform || org?.dltPlatform || null,
        smsType: smsType || 'TRANSACTIONAL',
        isDefault: isDefault || false,
        isActive: true,
        isVerified: false,
      },
    });

    res.status(201).json(newSenderId);
  } catch (error) {
    console.error('[Settings] Create sender ID error:', error);
    res.status(500).json({ error: 'Failed to create sender ID' });
  }
});

/**
 * PUT /settings/sender-ids/:id
 * Update a sender ID
 */
router.put('/sender-ids/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;
    const { name, description, dltEntityId, dltPlatform, smsType, isDefault, isActive } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify sender ID belongs to organization
    const existing = await prisma.organizationSenderId.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Sender ID not found' });
    }

    // If setting as default, unset other defaults for same type
    const newSmsType = smsType || existing.smsType;
    if (isDefault && !existing.isDefault) {
      await prisma.organizationSenderId.updateMany({
        where: {
          organizationId,
          smsType: newSmsType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const updatedSenderId = await prisma.organizationSenderId.update({
      where: { id },
      data: {
        name,
        description,
        dltEntityId,
        dltPlatform,
        smsType: newSmsType,
        isDefault: isDefault !== undefined ? isDefault : existing.isDefault,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      },
    });

    res.json(updatedSenderId);
  } catch (error) {
    console.error('[Settings] Update sender ID error:', error);
    res.status(500).json({ error: 'Failed to update sender ID' });
  }
});

/**
 * DELETE /settings/sender-ids/:id
 * Delete a sender ID
 */
router.delete('/sender-ids/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify sender ID belongs to organization
    const existing = await prisma.organizationSenderId.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Sender ID not found' });
    }

    await prisma.organizationSenderId.delete({ where: { id } });

    res.json({ success: true, message: 'Sender ID deleted' });
  } catch (error) {
    console.error('[Settings] Delete sender ID error:', error);
    res.status(500).json({ error: 'Failed to delete sender ID' });
  }
});

/**
 * POST /settings/sender-ids/:id/set-default
 * Set a sender ID as default for its type
 */
router.post('/sender-ids/:id/set-default', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { id } = req.params;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Verify sender ID belongs to organization
    const existing = await prisma.organizationSenderId.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Sender ID not found' });
    }

    // Unset other defaults for same type
    await prisma.organizationSenderId.updateMany({
      where: {
        organizationId,
        smsType: existing.smsType,
        isDefault: true,
      },
      data: { isDefault: false },
    });

    // Set this as default
    const updatedSenderId = await prisma.organizationSenderId.update({
      where: { id },
      data: { isDefault: true },
    });

    res.json(updatedSenderId);
  } catch (error) {
    console.error('[Settings] Set default sender ID error:', error);
    res.status(500).json({ error: 'Failed to set default sender ID' });
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
    const { name, description, dltTemplateId, msg91TemplateId, dltContentType, content, variables, sampleValues } = req.body;

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
        msg91TemplateId: msg91TemplateId || null, // MSG91 Flow API template ID
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
    const { name, description, content, variables, sampleValues, isActive, msg91TemplateId } = req.body;

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
        msg91TemplateId: msg91TemplateId !== undefined ? msg91TemplateId : existing.msg91TemplateId,
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

    // Get organization details for notification
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true },
    });

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

    // Send email notification to admin
    if (organization) {
      senderIdNotificationService.notifyAdminOnNewRequest(
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
          status: request.status,
        },
        organization
      ).catch(err => {
        console.error('[Settings] Failed to send admin notification:', err);
      });
    }

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

// ============================================
// CREDIT ALERTS
// ============================================

/**
 * GET /settings/credit-alerts
 * Get credit alert settings
 */
router.get('/credit-alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (organization?.settings as Record<string, any>) || {};
    const creditAlerts = settings.creditAlerts || {
      enabled: false,
      smsThreshold: 100,
      whatsappThreshold: 100,
      rcsThreshold: 100,
      emailRecipients: [],
      lastAlertSentAt: null,
    };

    res.json(creditAlerts);
  } catch (error) {
    console.error('[Settings] Get credit alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch credit alert settings' });
  }
});

/**
 * PUT /settings/credit-alerts
 * Update credit alert settings
 */
router.put('/credit-alerts', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;
    const { enabled, smsThreshold, whatsappThreshold, rcsThreshold, emailRecipients } = req.body;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    // Validate thresholds
    if (smsThreshold !== undefined && (smsThreshold < 0 || smsThreshold > 1000000)) {
      return res.status(400).json({ error: 'SMS threshold must be between 0 and 1,000,000' });
    }
    if (whatsappThreshold !== undefined && (whatsappThreshold < 0 || whatsappThreshold > 1000000)) {
      return res.status(400).json({ error: 'WhatsApp threshold must be between 0 and 1,000,000' });
    }
    if (rcsThreshold !== undefined && (rcsThreshold < 0 || rcsThreshold > 1000000)) {
      return res.status(400).json({ error: 'RCS threshold must be between 0 and 1,000,000' });
    }

    // Validate email recipients
    if (emailRecipients && !Array.isArray(emailRecipients)) {
      return res.status(400).json({ error: 'Email recipients must be an array' });
    }

    // Get current settings
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const currentSettings = (organization?.settings as Record<string, any>) || {};
    const currentAlerts = currentSettings.creditAlerts || {};

    // Update credit alerts settings
    const updatedAlerts = {
      enabled: enabled !== undefined ? enabled : currentAlerts.enabled || false,
      smsThreshold: smsThreshold !== undefined ? smsThreshold : currentAlerts.smsThreshold || 100,
      whatsappThreshold: whatsappThreshold !== undefined ? whatsappThreshold : currentAlerts.whatsappThreshold || 100,
      rcsThreshold: rcsThreshold !== undefined ? rcsThreshold : currentAlerts.rcsThreshold || 100,
      emailRecipients: emailRecipients !== undefined ? emailRecipients : currentAlerts.emailRecipients || [],
      lastAlertSentAt: currentAlerts.lastAlertSentAt || null,
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: {
          ...currentSettings,
          creditAlerts: updatedAlerts,
        },
      },
    });

    res.json(updatedAlerts);
  } catch (error) {
    console.error('[Settings] Update credit alerts error:', error);
    res.status(500).json({ error: 'Failed to update credit alert settings' });
  }
});

/**
 * POST /settings/credit-alerts/test
 * Send a test alert email
 */
router.post('/credit-alerts/test', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, settings: true },
    });

    const settings = (organization?.settings as Record<string, any>) || {};
    const creditAlerts = settings.creditAlerts || {};

    if (!creditAlerts.emailRecipients || creditAlerts.emailRecipients.length === 0) {
      return res.status(400).json({ error: 'No email recipients configured' });
    }

    // Get current balance
    const balance = await prisma.messageCreditBalance.findFirst({
      where: { organizationId },
    });

    // In production, send actual email here
    // For now, we'll just return success
    console.log(`[CreditAlerts] Test alert sent to: ${creditAlerts.emailRecipients.join(', ')}`);
    console.log(`[CreditAlerts] Balance - SMS: ${balance?.smsCredits || 0}, WhatsApp: ${balance?.whatsappCredits || 0}, RCS: ${balance?.rcsCredits || 0}`);

    res.json({
      success: true,
      message: `Test alert sent to ${creditAlerts.emailRecipients.length} recipient(s)`,
      recipients: creditAlerts.emailRecipients,
    });
  } catch (error) {
    console.error('[Settings] Test credit alert error:', error);
    res.status(500).json({ error: 'Failed to send test alert' });
  }
});

/**
 * GET /settings/credit-alerts/status
 * Get current credit status and alert triggers
 */
router.get('/credit-alerts/status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user?.organizationId;

    if (!organizationId) {
      return res.status(400).json({ error: 'Organization not found' });
    }

    const [organization, balance] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { settings: true },
      }),
      prisma.messageCreditBalance.findFirst({
        where: { organizationId },
      }),
    ]);

    const settings = (organization?.settings as Record<string, any>) || {};
    const creditAlerts = settings.creditAlerts || {
      enabled: false,
      smsThreshold: 100,
      whatsappThreshold: 100,
      rcsThreshold: 100,
    };

    const smsCredits = balance?.smsCredits || 0;
    const whatsappCredits = balance?.whatsappCredits || 0;
    const rcsCredits = balance?.rcsCredits || 0;

    const status = {
      enabled: creditAlerts.enabled,
      channels: {
        sms: {
          balance: smsCredits,
          threshold: creditAlerts.smsThreshold,
          isBelowThreshold: smsCredits <= creditAlerts.smsThreshold,
        },
        whatsapp: {
          balance: whatsappCredits,
          threshold: creditAlerts.whatsappThreshold,
          isBelowThreshold: whatsappCredits <= creditAlerts.whatsappThreshold,
        },
        rcs: {
          balance: rcsCredits,
          threshold: creditAlerts.rcsThreshold,
          isBelowThreshold: rcsCredits <= creditAlerts.rcsThreshold,
        },
      },
      lastAlertSentAt: creditAlerts.lastAlertSentAt,
    };

    res.json(status);
  } catch (error) {
    console.error('[Settings] Get credit alert status error:', error);
    res.status(500).json({ error: 'Failed to fetch credit alert status' });
  }
});

export default router;
