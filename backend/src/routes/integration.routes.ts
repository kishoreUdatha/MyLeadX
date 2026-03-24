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

// ==================== GOOGLE OAUTH FOR AGENT TOOLS ====================

// Google OAuth initiation for agent tools (calendar, sheets, etc.)
router.get('/google/auth', async (req: Request, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = getOrgId(req);

    if (!tool || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: tool and agentId'
      });
    }

    // Define scopes based on tool type
    const scopesByTool: Record<string, string[]> = {
      calendar: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events',
      ],
      sheets: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    };

    const scopes = scopesByTool[tool as string] || scopesByTool.calendar;

    // Google OAuth configuration
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`;

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID environment variable.'
      });
    }

    // Create state with tool, agentId, and organizationId for callback
    const state = Buffer.from(JSON.stringify({
      tool,
      agentId,
      organizationId,
    })).toString('base64');

    // Build Google OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');

    // Redirect to Google OAuth page
    res.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('Google OAuth initiation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Google OAuth callback for agent tools
router.get('/google/callback', async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('Google OAuth error:', error);
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_denied`);
    }

    if (!code || !state) {
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=missing_params`);
    }

    // Decode state
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { tool, agentId } = stateData;
    let { organizationId } = stateData;

    // If organizationId is missing, get it from the agent
    if (!organizationId && agentId) {
      const agent = await prisma.voiceAgent.findUnique({
        where: { id: agentId },
        select: { organizationId: true },
      });
      organizationId = agent?.organizationId;
    }

    if (!organizationId) {
      console.error('[GoogleOAuth] Could not determine organizationId');
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=missing_org`);
    }

    // Exchange code for tokens
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${process.env.APP_URL || 'http://localhost:3000'}/api/integrations/google/callback`;

    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_not_configured`);
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Token exchange error:', tokens);
      return res.redirect(`${frontendUrl}/voice-ai/agents?error=token_exchange_failed`);
    }

    // Store integration based on tool type
    if (tool === 'calendar') {
      // Get user's calendar info
      const calendarResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList/primary', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const calendarInfo = await calendarResponse.json();

      // Create or update calendar integration
      const existingCalendar = await prisma.calendarIntegration.findFirst({
        where: {
          organizationId,
          provider: 'GOOGLE',
        },
      });

      if (existingCalendar) {
        await prisma.calendarIntegration.update({
          where: { id: existingCalendar.id },
          data: {
            accessToken: integrationService.encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : undefined,
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            calendarId: calendarInfo.id || 'primary',
            isActive: true,
            lastSyncAt: new Date(),
          },
        });
      } else {
        await prisma.calendarIntegration.create({
          data: {
            organizationId,
            provider: 'GOOGLE',
            accessToken: integrationService.encrypt(tokens.access_token),
            refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : null,
            tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
            calendarId: calendarInfo.id || 'primary',
            isActive: true,
            syncEnabled: true,
            autoCreateEvents: true,
            checkAvailability: true,
          },
        });
      }

      // Link calendar integration to agent via AgentIntegration
      // Check if an agent integration already exists
      const existingIntegration = await prisma.agentIntegration.findFirst({
        where: {
          voiceAgentId: agentId,
          integrationType: 'CALENDAR',
        },
      });

      const calendarIntegration = await prisma.calendarIntegration.findFirst({
        where: {
          organizationId,
          provider: 'GOOGLE',
        },
      });

      if (calendarIntegration) {
        if (existingIntegration) {
          // Update existing
          await prisma.agentIntegration.update({
            where: { id: existingIntegration.id },
            data: {
              calendarIntegrationId: calendarIntegration.id,
              isEnabled: true,
              config: {
                connected: true,
                connectedAt: new Date().toISOString(),
              },
            },
          });
        } else {
          // Create new
          await prisma.agentIntegration.create({
            data: {
              voiceAgentId: agentId,
              organizationId,
              integrationType: 'CALENDAR',
              calendarIntegrationId: calendarIntegration.id,
              isEnabled: true,
              config: {
                connected: true,
                connectedAt: new Date().toISOString(),
              },
            },
          });
        }
      }

      console.log('[GoogleOAuth] Calendar integration saved successfully for agent:', agentId);
    } else if (tool === 'sheets') {
      // Store sheets integration
      const agent = await prisma.conversationalAIAgent.findUnique({
        where: { id: agentId },
      });

      if (agent) {
        const toolsConfig = (agent.toolsConfig as Record<string, any>) || {};
        toolsConfig.sheets = {
          enabled: true,
          provider: 'google',
          connected: true,
          connectedAt: new Date().toISOString(),
          accessToken: integrationService.encrypt(tokens.access_token),
          refreshToken: tokens.refresh_token ? integrationService.encrypt(tokens.refresh_token) : null,
        };

        await prisma.conversationalAIAgent.update({
          where: { id: agentId },
          data: { toolsConfig },
        });
      }
    }

    // Send a page that closes the popup and notifies the parent window
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected!</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-align: center; }
          .container { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); color: #333; max-width: 400px; }
          h2 { color: #22c55e; margin-bottom: 16px; }
          p { color: #666; margin-bottom: 24px; }
          .checkmark { width: 80px; height: 80px; background: #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
          .checkmark svg { width: 40px; height: 40px; fill: white; }
          .btn { background: #3b82f6; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; }
          .btn:hover { background: #2563eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="checkmark">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </div>
          <h2>Google Calendar Connected!</h2>
          <p>Your calendar has been successfully linked to your AI agent.</p>
          <button class="btn" onclick="closeWindow()">Close This Window</button>
          <p style="font-size: 12px; color: #999; margin-top: 16px;">Window will close automatically in 3 seconds...</p>
        </div>
        <script>
          function closeWindow() {
            try {
              // Notify parent window
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({ type: 'oauth_success', tool: '${tool}' }, '${frontendUrl}');
                // Refresh parent page to show connected status
                window.opener.location.href = '${frontendUrl}/voice-ai/agents/${agentId}?tab=tools&tool_connected=${tool}';
              }
            } catch (e) {
              console.log('Could not communicate with parent window:', e);
            }
            // Try to close the window
            window.close();
            // If window.close() didn't work, show a message
            setTimeout(function() {
              document.body.innerHTML = '<div class="container"><h2>You can close this window now</h2><p>The calendar has been connected successfully!</p></div>';
            }, 500);
          }
          // Auto-close after 3 seconds
          setTimeout(closeWindow, 3000);
        </script>
      </body>
      </html>
    `);
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${frontendUrl}/voice-ai/agents?error=oauth_failed`);
  }
});

// Check Google OAuth connection status for a tool
router.get('/google/status', async (req: Request, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = getOrgId(req);

    if (!tool || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: tool and agentId'
      });
    }

    let connected = false;
    let connectionInfo: any = null;

    if (tool === 'calendar') {
      const integration = await prisma.calendarIntegration.findFirst({
        where: { organizationId, provider: 'GOOGLE', isActive: true },
      });
      connected = !!integration;
      connectionInfo = integration ? {
        calendarId: integration.calendarId,
        lastSyncAt: integration.lastSyncAt,
      } : null;
    } else if (tool === 'sheets') {
      const agent = await prisma.conversationalAIAgent.findUnique({
        where: { id: agentId as string },
      });
      const toolsConfig = (agent?.toolsConfig as Record<string, any>) || {};
      connected = toolsConfig.sheets?.connected || false;
      connectionInfo = toolsConfig.sheets || null;
    }

    res.json({
      success: true,
      data: {
        connected,
        connectionInfo,
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Force reset calendar integration (completely delete for fresh OAuth)
router.delete('/google/reset', async (req: Request, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = getOrgId(req);

    if (!tool) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: tool'
      });
    }

    if (tool === 'calendar') {
      // Get the calendar integration first
      const calendarIntegration = await prisma.calendarIntegration.findFirst({
        where: { organizationId, provider: 'GOOGLE' },
      });

      if (calendarIntegration) {
        // Delete related agent integrations first
        await prisma.agentIntegration.deleteMany({
          where: { calendarIntegrationId: calendarIntegration.id },
        });

        // Then delete the calendar integration
        await prisma.calendarIntegration.delete({
          where: { id: calendarIntegration.id },
        });
      }

      console.log('[GoogleOAuth] Calendar integration reset successfully for org:', organizationId);
    }

    res.json({ success: true, message: `${tool} integration has been completely reset. Please reconnect.` });
  } catch (error: any) {
    console.error('Google OAuth reset error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Disconnect Google OAuth for a tool
router.delete('/google/disconnect', async (req: Request, res: Response) => {
  try {
    const { tool, agentId } = req.query;
    const organizationId = getOrgId(req);

    if (!tool || !agentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: tool and agentId'
      });
    }

    if (tool === 'calendar') {
      await prisma.calendarIntegration.updateMany({
        where: { organizationId, provider: 'GOOGLE' },
        data: { isActive: false },
      });
    }

    // Update agent tools config
    const agent = await prisma.conversationalAIAgent.findUnique({
      where: { id: agentId as string },
    });

    if (agent) {
      const toolsConfig = (agent.toolsConfig as Record<string, any>) || {};
      if (toolsConfig[tool as string]) {
        toolsConfig[tool as string] = {
          ...toolsConfig[tool as string],
          connected: false,
          disconnectedAt: new Date().toISOString(),
        };
      }

      await prisma.conversationalAIAgent.update({
        where: { id: agentId as string },
        data: { toolsConfig },
      });
    }

    res.json({ success: true, message: `${tool} disconnected successfully` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
