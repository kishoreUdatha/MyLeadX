/**
 * Integration Routes
 * API endpoints for managing Calendar, CRM, Payment, and Custom API integrations
 */

import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import integrationService from '../services/integration.service';

const router = Router();
const prisma = new PrismaClient();

// Middleware to get organization ID from authenticated user
const getOrgId = (req: Request): string => {
  return (req as any).user?.organizationId;
};

// ==================== CALENDAR INTEGRATION ROUTES ====================

// Get calendar integration status
router.get('/calendar', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);

    const integrations = await prisma.calendarIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        calendarId: true,
        syncEnabled: true,
        autoCreateEvents: true,
        checkAvailability: true,
        lastSyncAt: true,
        lastSyncError: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get OAuth URL for calendar provider
router.get('/calendar/auth/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const organizationId = getOrgId(req);
    const redirectUri = `${process.env.APP_URL}/api/integrations/calendar/callback`;

    let authUrl: string;

    if (provider === 'google') {
      authUrl = integrationService.calendar.getGoogleAuthUrl(organizationId, redirectUri);
    } else if (provider === 'outlook') {
      authUrl = integrationService.calendar.getOutlookAuthUrl(organizationId, redirectUri);
    } else {
      return res.status(400).json({ success: false, message: 'Invalid provider' });
    }

    res.json({ success: true, data: { authUrl } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// OAuth callback for calendar
router.get('/calendar/callback', async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      return res.redirect('/settings/integrations?error=missing_params');
    }

    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { organizationId, provider } = stateData;
    const redirectUri = `${process.env.APP_URL}/api/integrations/calendar/callback`;

    await integrationService.calendar.handleOAuthCallback(
      code as string,
      provider.toUpperCase(),
      organizationId,
      redirectUri
    );

    res.redirect('/settings/integrations?success=calendar_connected');
  } catch (error: any) {
    console.error('Calendar OAuth error:', error);
    res.redirect('/settings/integrations?error=oauth_failed');
  }
});

// Get available calendar slots
router.get('/calendar/:integrationId/slots', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { date, duration } = req.query;

    const slots = await integrationService.calendar.getAvailableSlots(
      integrationId,
      new Date(date as string),
      parseInt(duration as string) || 30
    );

    res.json({ success: true, data: slots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book appointment
router.post('/calendar/:integrationId/book', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { title, description, startTime, endTime, attendeeEmail, attendeeName } = req.body;

    const event = await integrationService.calendar.bookAppointment(integrationId, {
      title,
      description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendeeEmail,
      attendeeName,
    });

    res.json({ success: true, data: event });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect calendar
router.delete('/calendar/:integrationId', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = getOrgId(req);

    await prisma.calendarIntegration.deleteMany({
      where: { id: integrationId, organizationId },
    });

    res.json({ success: true, message: 'Calendar disconnected' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CRM INTEGRATION ROUTES ====================

// Get CRM integrations
router.get('/crm', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);

    const integrations = await prisma.crmIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        type: true,
        isActive: true,
        lastSyncAt: true,
        lastSyncError: true,
        syncCount: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update CRM integration
router.post('/crm', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { name, type, webhookUrl, apiKey, fieldMappings } = req.body;

    const integration = await prisma.crmIntegration.upsert({
      where: {
        id: req.body.id || 'new',
      },
      create: {
        organizationId,
        name: name || `${type} Integration`,
        type,
        webhookUrl,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : null,
        fieldMappings: fieldMappings || [],
        isActive: true,
      },
      update: {
        name,
        type,
        webhookUrl,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : undefined,
        fieldMappings: fieldMappings || undefined,
      },
    });

    res.json({ success: true, data: integration });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Lookup lead in CRM
router.get('/crm/:integrationId/lookup', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { phone } = req.query;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number required' });
    }

    const lead = await integrationService.crm.lookupLead(integrationId, phone as string);

    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create lead in CRM
router.post('/crm/:integrationId/create-lead', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const leadData = req.body;

    const result = await integrationService.crm.createLead(integrationId, leadData);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete CRM integration
router.delete('/crm/:integrationId', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = getOrgId(req);

    await prisma.crmIntegration.deleteMany({
      where: { id: integrationId, organizationId },
    });

    res.json({ success: true, message: 'CRM integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== PAYMENT INTEGRATION ROUTES ====================

// Get payment integrations
router.get('/payment', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);

    const integrations = await prisma.paymentIntegration.findMany({
      where: { organizationId },
      select: {
        id: true,
        provider: true,
        isActive: true,
        isConnected: true,
        currency: true,
        testMode: true,
        lastVerifiedAt: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create/Update payment integration
router.post('/payment', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { provider, apiKey, apiSecret, webhookSecret, merchantId, currency, testMode } = req.body;

    const integration = await prisma.paymentIntegration.upsert({
      where: {
        organizationId_provider: { organizationId, provider },
      },
      create: {
        organizationId,
        provider,
        apiKey: apiKey ? integrationService.encrypt(apiKey) : null,
        apiSecret: apiSecret ? integrationService.encrypt(apiSecret) : null,
        webhookSecret: webhookSecret ? integrationService.encrypt(webhookSecret) : null,
        merchantId,
        currency: currency || 'INR',
        testMode: testMode || false,
        isConnected: true,
      },
      update: {
        apiKey: apiKey ? integrationService.encrypt(apiKey) : undefined,
        apiSecret: apiSecret ? integrationService.encrypt(apiSecret) : undefined,
        webhookSecret: webhookSecret ? integrationService.encrypt(webhookSecret) : undefined,
        merchantId,
        currency,
        testMode,
        isConnected: true,
        lastVerifiedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: integration.id,
        provider: integration.provider,
        isConnected: integration.isConnected,
        currency: integration.currency,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create payment link
router.post('/payment/:integrationId/create-link', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { amount, currency, description, customerName, customerPhone, customerEmail } = req.body;

    const paymentLink = await integrationService.payment.createPaymentLink(integrationId, {
      amount,
      currency,
      description,
      customerName,
      customerPhone,
      customerEmail,
    });

    res.json({ success: true, data: paymentLink });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Payment webhook callback
router.post('/payment/webhook/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;

    // Verify webhook signature based on provider
    if (provider === 'razorpay') {
      const signature = req.headers['x-razorpay-signature'] as string;
      // Verify and process payment
      console.log('Razorpay webhook received:', req.body);
    } else if (provider === 'stripe') {
      const signature = req.headers['stripe-signature'] as string;
      // Verify and process payment
      console.log('Stripe webhook received:', req.body);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete payment integration
router.delete('/payment/:integrationId', async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const organizationId = getOrgId(req);

    await prisma.paymentIntegration.deleteMany({
      where: { id: integrationId, organizationId },
    });

    res.json({ success: true, message: 'Payment integration deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== CUSTOM API ENDPOINT ROUTES ====================

// Get custom API endpoints
router.get('/custom-api', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const { voiceAgentId } = req.query;

    const endpoints = await prisma.customApiEndpoint.findMany({
      where: {
        organizationId,
        ...(voiceAgentId && { voiceAgentId: voiceAgentId as string }),
      },
      select: {
        id: true,
        name: true,
        url: true,
        method: true,
        trigger: true,
        triggerKeywords: true,
        isActive: true,
        lastCalledAt: true,
        callCount: true,
        lastError: true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: endpoints });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create custom API endpoint
router.post('/custom-api', async (req: Request, res: Response) => {
  try {
    const organizationId = getOrgId(req);
    const {
      voiceAgentId,
      name,
      url,
      method,
      headers,
      authType,
      authValue,
      trigger,
      triggerKeywords,
      parseResponse,
      responseMapping,
    } = req.body;

    const endpoint = await prisma.customApiEndpoint.create({
      data: {
        organizationId,
        voiceAgentId,
        name,
        url,
        method: method || 'POST',
        headers: headers || {},
        authType,
        authValue: authValue ? integrationService.encrypt(authValue) : null,
        trigger,
        triggerKeywords: triggerKeywords || [],
        parseResponse: parseResponse || false,
        responseMapping: responseMapping || {},
        isActive: true,
      },
    });

    res.json({ success: true, data: endpoint });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update custom API endpoint
router.put('/custom-api/:endpointId', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const organizationId = getOrgId(req);
    const updates = req.body;

    if (updates.authValue) {
      updates.authValue = integrationService.encrypt(updates.authValue);
    }

    const endpoint = await prisma.customApiEndpoint.updateMany({
      where: { id: endpointId, organizationId },
      data: updates,
    });

    res.json({ success: true, data: endpoint });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Test custom API endpoint
router.post('/custom-api/:endpointId/test', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const testData = req.body;

    const result = await integrationService.customApi.callEndpoint(endpointId, testData);

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete custom API endpoint
router.delete('/custom-api/:endpointId', async (req: Request, res: Response) => {
  try {
    const { endpointId } = req.params;
    const organizationId = getOrgId(req);

    await prisma.customApiEndpoint.deleteMany({
      where: { id: endpointId, organizationId },
    });

    res.json({ success: true, message: 'Endpoint deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== AGENT INTEGRATION ROUTES ====================

// Get integrations for a voice agent
router.get('/agent/:voiceAgentId', async (req: Request, res: Response) => {
  try {
    const { voiceAgentId } = req.params;

    const integrations = await integrationService.agentIntegration.getAgentIntegrations(voiceAgentId);

    res.json({ success: true, data: integrations });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Enable/disable integration for agent
router.post('/agent/:voiceAgentId/toggle', async (req: Request, res: Response) => {
  try {
    const { voiceAgentId } = req.params;
    const { integrationType, enabled, config } = req.body;

    const result = await integrationService.agentIntegration.toggleIntegration(
      voiceAgentId,
      integrationType,
      enabled,
      config
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Link specific integration to agent
router.post('/agent/:voiceAgentId/link', async (req: Request, res: Response) => {
  try {
    const { voiceAgentId } = req.params;
    const { integrationType, integrationId, config } = req.body;

    const result = await integrationService.agentIntegration.linkIntegration(
      voiceAgentId,
      integrationType,
      integrationId,
      config
    );

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
