import { Router, Request, Response } from 'express';
import { outboundCallService } from '../integrations/outbound-call.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';
import { voiceMinutesService } from '../services/voice-minutes.service';

const router = Router();

// ==================== WEBHOOKS (No Auth - Called by Twilio) ====================

// Inbound call handler - called when someone calls our Twilio number
router.post('/inbound', async (req: Request, res: Response) => {
  try {
    const { CallSid, From, To, CallerName } = req.body;

    console.log(`Incoming call from ${From} to ${To} (SID: ${CallSid})`);

    const result = await outboundCallService.handleIncomingCall({
      CallSid,
      From,
      To,
      CallerName,
    });

    res.set('Content-Type', 'text/xml');
    res.send(result.twiml);
  } catch (error) {
    console.error('Inbound call handling error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>We're sorry, an error occurred. Please try again later.</Say>
        <Hangup/>
      </Response>`);
  }
});

// Continue inbound call after timeout
router.post('/inbound/continue/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const twiml = await outboundCallService.continueInboundCall(callId);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Continue inbound call error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

// TwiML endpoint for call
router.post('/twiml/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const twiml = await outboundCallService.generateTwiML(callId);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('TwiML generation error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, there was an error. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

// Speech input webhook - supports both speech and DTMF (barge-in)
router.post('/webhook/speech/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { SpeechResult, Confidence, Digits } = req.body;

    console.log(`Input received for call ${callId}: Speech="${SpeechResult}" Digits="${Digits}" (confidence: ${Confidence})`);

    // Handle case where user interrupted with keypad or provided no input
    if (!SpeechResult && !Digits) {
      res.set('Content-Type', 'text/xml');
      res.send(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Say>I didn't catch that. Could you please repeat?</Say>
          <Redirect>/api/outbound-calls/twiml/${callId}</Redirect>
        </Response>`);
      return;
    }

    // Pass both speech result and DTMF digits to handler
    const twiml = await outboundCallService.handleSpeechInput(callId, SpeechResult || '', Digits);

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Speech handling error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>Sorry, there was an error processing your response. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

// Call status webhook
router.post('/webhook/status', async (req: Request, res: Response) => {
  try {
    const { CallSid, CallStatus, CallDuration, AnsweredBy } = req.body;

    console.log(`Call status update: ${CallSid} -> ${CallStatus}`);

    await outboundCallService.handleStatusCallback({
      CallSid,
      CallStatus,
      CallDuration,
      AnsweredBy,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Status callback error:', error);
    res.status(500).send('Error');
  }
});

// Recording webhook
router.post('/webhook/recording', async (req: Request, res: Response) => {
  try {
    const { CallSid, RecordingSid, RecordingUrl, RecordingDuration } = req.body;

    console.log(`Recording received for call ${CallSid}: ${RecordingUrl}`);

    await outboundCallService.handleRecordingCallback({
      CallSid,
      RecordingSid,
      RecordingUrl,
      RecordingDuration,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Recording callback error:', error);
    res.status(500).send('Error');
  }
});

// Transfer status webhook
router.post('/webhook/transfer-status/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { DialCallStatus, DialCallDuration } = req.body;

    console.log(`Transfer status for call ${callId}: ${DialCallStatus}`);

    await outboundCallService.handleTransferStatus(callId, {
      DialCallStatus,
      DialCallDuration,
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error('Transfer status callback error:', error);
    res.status(500).send('Error');
  }
});

// Consent response webhook
router.post('/webhook/consent/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { Digits, SpeechResult } = req.body;
    const defaultConsent = req.query.defaultConsent === 'true';

    console.log(`Consent response for call ${callId}: Digits=${Digits}, Speech=${SpeechResult}, Default=${defaultConsent}`);

    const twiml = await outboundCallService.handleConsentResponse(callId, {
      Digits,
      SpeechResult,
      defaultConsent,
    });

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (error) {
    console.error('Consent callback error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

// ==================== CAMPAIGNS ====================

// Create campaign
router.post('/campaigns', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId, name, description, contacts, settings, scheduledAt, callingMode } = req.body;

    if (!agentId || !name || !contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return ApiResponse.error(res, 'Agent ID, name, and contacts array are required', 400);
    }

    const campaign = await outboundCallService.createCampaign({
      organizationId: req.organization!.id,
      agentId,
      name,
      description,
      contacts,
      settings,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      callingMode: callingMode || 'AUTOMATIC',
    });

    ApiResponse.success(res, 'Campaign created successfully', campaign, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// List campaigns
router.get('/campaigns', async (req: TenantRequest, res: Response) => {
  try {
    const campaigns = await outboundCallService.listCampaigns(req.organization!.id);
    ApiResponse.success(res, 'Campaigns retrieved', campaigns);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get campaign
router.get('/campaigns/:id', async (req: TenantRequest, res: Response) => {
  try {
    const campaign = await outboundCallService.getCampaign(req.params.id);

    if (!campaign) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    ApiResponse.success(res, 'Campaign retrieved', campaign);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Start campaign
router.post('/campaigns/:id/start', async (req: TenantRequest, res: Response) => {
  try {
    const campaign = await outboundCallService.startCampaign(req.params.id);
    ApiResponse.success(res, 'Campaign started', campaign);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Pause campaign
router.post('/campaigns/:id/pause', async (req: TenantRequest, res: Response) => {
  try {
    const campaign = await outboundCallService.pauseCampaign(req.params.id);
    ApiResponse.success(res, 'Campaign paused', campaign);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Resume campaign
router.post('/campaigns/:id/resume', async (req: TenantRequest, res: Response) => {
  try {
    const campaign = await outboundCallService.resumeCampaign(req.params.id);
    ApiResponse.success(res, 'Campaign resumed', campaign);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update campaign
router.put('/campaigns/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, settings, scheduledAt, callingMode } = req.body;

    // Check if campaign exists and belongs to organization
    const existing = await prisma.outboundCallCampaign.findFirst({
      where: { id, organizationId: req.organization!.id },
    });

    if (!existing) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    // Only allow editing if campaign is in DRAFT or PAUSED status
    if (!['DRAFT', 'PAUSED', 'SCHEDULED'].includes(existing.status)) {
      return ApiResponse.error(res, 'Can only edit campaigns in DRAFT, PAUSED, or SCHEDULED status', 400);
    }

    const campaign = await prisma.outboundCallCampaign.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(settings && {
          maxConcurrentCalls: settings.maxConcurrentCalls,
          callsBetweenHours: settings.callsBetweenHours,
          retryAttempts: settings.retryAttempts,
          retryDelayMinutes: settings.retryDelayMinutes,
        }),
        ...(scheduledAt !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(callingMode && { callingMode }),
      },
      include: {
        agent: { select: { id: true, name: true, industry: true } },
        _count: { select: { contacts: true, calls: true } },
      },
    });

    ApiResponse.success(res, 'Campaign updated', campaign);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete campaign
router.delete('/campaigns/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Check if campaign exists and belongs to organization
    const existing = await prisma.outboundCallCampaign.findFirst({
      where: { id, organizationId: req.organization!.id },
    });

    if (!existing) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    // Only allow deleting if campaign is not RUNNING
    if (existing.status === 'RUNNING') {
      return ApiResponse.error(res, 'Cannot delete a running campaign. Please pause it first.', 400);
    }

    // Use transaction to ensure all deletes succeed or none
    await prisma.$transaction(async (tx) => {
      // Get all contact IDs for this campaign
      const contacts = await tx.outboundCallContact.findMany({
        where: { campaignId: id },
        select: { id: true },
      });
      const contactIds = contacts.map(c => c.id);

      // Delete calls by campaign ID OR contact IDs
      await tx.outboundCall.deleteMany({
        where: {
          OR: [
            { campaignId: id },
            { contactId: { in: contactIds } },
          ],
        },
      });

      // Delete contacts
      await tx.outboundCallContact.deleteMany({
        where: { campaignId: id },
      });

      // Delete the campaign
      await tx.outboundCallCampaign.delete({
        where: { id },
      });
    });

    ApiResponse.success(res, 'Campaign deleted successfully');
  } catch (error) {
    console.error('Delete campaign error:', error);
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== SINGLE CALLS ====================

// Make a single call
router.post('/call', async (req: TenantRequest, res: Response) => {
  try {
    const { agentId, phone, leadId, contactName, customData } = req.body;

    if (!agentId || !phone) {
      return ApiResponse.error(res, 'Agent ID and phone number are required', 400);
    }

    // Check voice minutes availability
    const usageCheck = await voiceMinutesService.checkUsage(
      req.organization!.id,
      req.user?.id
    );

    if (!usageCheck.allowed) {
      return ApiResponse.error(res, usageCheck.reason || 'Insufficient voice minutes', 403);
    }

    const result = await outboundCallService.makeCall({
      agentId,
      phone,
      leadId,
      contactName,
      customData,
    });

    ApiResponse.success(res, 'Call initiated', result, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get call details
router.get('/calls/:id', async (req: TenantRequest, res: Response) => {
  try {
    const call = await outboundCallService.getCall(req.params.id);

    if (!call) {
      return ApiResponse.error(res, 'Call not found', 404);
    }

    ApiResponse.success(res, 'Call retrieved', call);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// List calls
router.get('/calls', async (req: TenantRequest, res: Response) => {
  try {
    const {
      agentId,
      campaignId,
      status,
      outcome,
      dateFrom,
      dateTo,
      limit,
      offset,
    } = req.query;

    const result = await outboundCallService.listCalls({
      organizationId: req.organization!.id,
      agentId: agentId as string,
      campaignId: campaignId as string,
      status: status as any,
      outcome: outcome as any,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : 50,
      offset: offset ? parseInt(offset as string) : 0,
    });

    ApiResponse.success(res, 'Calls retrieved', result);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== ANALYTICS ====================

// Get call analytics
router.get('/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const { days } = req.query;
    const analytics = await outboundCallService.getCallAnalytics(
      req.organization!.id,
      days ? parseInt(days as string) : 30
    );

    ApiResponse.success(res, 'Analytics retrieved', analytics);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get campaign-specific analytics
router.get('/campaigns/:id/analytics', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    // Verify campaign exists and belongs to organization
    const campaign = await prisma.outboundCallCampaign.findFirst({
      where: { id, organizationId: req.organization!.id },
    });

    if (!campaign) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    // Get all calls for this campaign
    const calls = await prisma.outboundCall.findMany({
      where: { campaignId: id },
      select: {
        id: true,
        status: true,
        outcome: true,
        duration: true,
        sentiment: true,
        createdAt: true,
      },
    });

    // Calculate outcome distribution
    const outcomeDistribution: Record<string, number> = {};
    calls.forEach(call => {
      const outcome = call.outcome || 'NO_OUTCOME';
      outcomeDistribution[outcome] = (outcomeDistribution[outcome] || 0) + 1;
    });

    // Calculate hourly distribution (when calls are made)
    const hourlyDistribution: Record<number, { total: number; answered: number }> = {};
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = { total: 0, answered: 0 };
    }
    calls.forEach(call => {
      const hour = new Date(call.createdAt).getHours();
      hourlyDistribution[hour].total += 1;
      if (call.status === 'COMPLETED' && call.outcome && !['NO_ANSWER', 'BUSY', 'VOICEMAIL'].includes(call.outcome)) {
        hourlyDistribution[hour].answered += 1;
      }
    });

    // Calculate duration distribution (in buckets)
    const durationBuckets = {
      '0-30s': 0,
      '30s-1m': 0,
      '1-2m': 0,
      '2-5m': 0,
      '5-10m': 0,
      '10m+': 0,
    };
    calls.forEach(call => {
      if (call.duration) {
        if (call.duration <= 30) durationBuckets['0-30s']++;
        else if (call.duration <= 60) durationBuckets['30s-1m']++;
        else if (call.duration <= 120) durationBuckets['1-2m']++;
        else if (call.duration <= 300) durationBuckets['2-5m']++;
        else if (call.duration <= 600) durationBuckets['5-10m']++;
        else durationBuckets['10m+']++;
      }
    });

    // Calculate sentiment distribution
    const sentimentDistribution: Record<string, number> = {
      POSITIVE: 0,
      NEUTRAL: 0,
      NEGATIVE: 0,
    };
    calls.forEach(call => {
      if (call.sentiment) {
        sentimentDistribution[call.sentiment] = (sentimentDistribution[call.sentiment] || 0) + 1;
      }
    });

    // Calculate conversion funnel
    const totalContacts = campaign.totalContacts;
    const totalCalls = calls.length;
    const answeredCalls = calls.filter(c =>
      c.status === 'COMPLETED' && c.outcome && !['NO_ANSWER', 'BUSY', 'VOICEMAIL'].includes(c.outcome)
    ).length;
    const interestedCalls = calls.filter(c =>
      c.outcome && ['INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'CONVERTED'].includes(c.outcome)
    ).length;
    const convertedCalls = calls.filter(c => c.outcome === 'CONVERTED').length;

    // Calculate average call duration
    const completedCallsWithDuration = calls.filter(c => c.duration && c.duration > 0);
    const avgDuration = completedCallsWithDuration.length > 0
      ? Math.round(completedCallsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / completedCallsWithDuration.length)
      : 0;

    // Daily trend (last 30 days or campaign duration)
    const dailyTrend: Record<string, { calls: number; successful: number }> = {};
    calls.forEach(call => {
      const date = new Date(call.createdAt).toISOString().split('T')[0];
      if (!dailyTrend[date]) {
        dailyTrend[date] = { calls: 0, successful: 0 };
      }
      dailyTrend[date].calls++;
      if (call.outcome && ['INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'CONVERTED'].includes(call.outcome)) {
        dailyTrend[date].successful++;
      }
    });

    ApiResponse.success(res, 'Campaign analytics retrieved', {
      summary: {
        totalContacts,
        totalCalls,
        answeredCalls,
        interestedCalls,
        convertedCalls,
        avgDuration,
        answerRate: totalCalls > 0 ? Math.round((answeredCalls / totalCalls) * 100) : 0,
        interestRate: answeredCalls > 0 ? Math.round((interestedCalls / answeredCalls) * 100) : 0,
        conversionRate: totalContacts > 0 ? Math.round((convertedCalls / totalContacts) * 100) : 0,
      },
      outcomeDistribution,
      hourlyDistribution,
      durationBuckets,
      sentimentDistribution,
      conversionFunnel: {
        contacts: totalContacts,
        called: totalCalls,
        answered: answeredCalls,
        interested: interestedCalls,
        converted: convertedCalls,
      },
      dailyTrend,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== MANUAL CALL QUEUE ====================

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Get manual call queue for a campaign
router.get('/campaigns/:id/queue', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.query;

    const campaign = await prisma.outboundCallCampaign.findUnique({
      where: { id },
      include: { agent: true },
    });

    if (!campaign) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    // Get contacts with their call history
    const whereClause: any = { campaignId: id };
    if (status) {
      whereClause.status = status;
    }

    const contacts = await prisma.outboundCallContact.findMany({
      where: whereClause,
      include: {
        calls: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'asc' },
      ],
    });

    // Enrich with lead data if available
    const enrichedContacts = await Promise.all(
      contacts.map(async (contact) => {
        let leadData = null;
        if (contact.leadId) {
          leadData = await prisma.lead.findUnique({
            where: { id: contact.leadId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              source: true,
              customFields: true,
              createdAt: true,
            },
          });
        }
        return {
          ...contact,
          lead: leadData,
          lastCall: contact.calls[0] || null,
        };
      })
    );

    ApiResponse.success(res, 'Queue retrieved', {
      campaign,
      contacts: enrichedContacts,
      stats: {
        total: contacts.length,
        pending: contacts.filter(c => c.status === 'PENDING').length,
        inProgress: contacts.filter(c => c.status === 'IN_PROGRESS').length,
        completed: contacts.filter(c => c.status === 'COMPLETED').length,
        failed: contacts.filter(c => c.status === 'FAILED').length,
      },
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Manually trigger a call for a specific contact in queue
router.post('/campaigns/:campaignId/queue/:contactId/call', async (req: TenantRequest, res: Response) => {
  try {
    const { campaignId, contactId } = req.params;

    // Get campaign and contact
    const campaign = await prisma.outboundCallCampaign.findUnique({
      where: { id: campaignId },
      include: { agent: true },
    });

    if (!campaign) {
      return ApiResponse.error(res, 'Campaign not found', 404);
    }

    const contact = await prisma.outboundCallContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return ApiResponse.error(res, 'Contact not found', 404);
    }

    if (contact.status === 'IN_PROGRESS') {
      return ApiResponse.error(res, 'Call already in progress for this contact', 400);
    }

    // Check voice minutes availability
    const usageCheck = await voiceMinutesService.checkUsage(
      req.organization!.id,
      req.user?.id
    );

    if (!usageCheck.allowed) {
      return ApiResponse.error(res, usageCheck.reason || 'Insufficient voice minutes', 403);
    }

    // Make the call
    const result = await outboundCallService.makeCall({
      agentId: campaign.agentId,
      phone: contact.phone,
      campaignId: campaign.id,
      contactId: contact.id,
      leadId: contact.leadId || undefined,
      contactName: contact.name || undefined,
      customData: contact.customData as any,
    });

    ApiResponse.success(res, 'Call initiated', result, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Skip a contact in queue
router.post('/campaigns/:campaignId/queue/:contactId/skip', async (req: TenantRequest, res: Response) => {
  try {
    const { campaignId, contactId } = req.params;
    const { reason } = req.body;

    const contact = await prisma.outboundCallContact.update({
      where: { id: contactId },
      data: {
        status: 'COMPLETED',
        customData: {
          ...(await prisma.outboundCallContact.findUnique({ where: { id: contactId } }))?.customData as object || {},
          skipped: true,
          skipReason: reason || 'Manually skipped',
          skippedAt: new Date().toISOString(),
        },
      },
    });

    ApiResponse.success(res, 'Contact skipped', contact);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Schedule a contact for later
router.post('/campaigns/:campaignId/queue/:contactId/schedule', async (req: TenantRequest, res: Response) => {
  try {
    const { campaignId, contactId } = req.params;
    const { scheduledAt, notes } = req.body;

    if (!scheduledAt) {
      return ApiResponse.error(res, 'Scheduled time is required', 400);
    }

    const contact = await prisma.outboundCallContact.update({
      where: { id: contactId },
      data: {
        status: 'SCHEDULED',
        nextAttemptAt: new Date(scheduledAt),
        customData: {
          ...(await prisma.outboundCallContact.findUnique({ where: { id: contactId } }))?.customData as object || {},
          scheduleNotes: notes,
          scheduledBy: req.user?.id,
        },
      },
    });

    ApiResponse.success(res, 'Contact scheduled', contact);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Mark contact as Do Not Call
router.post('/campaigns/:campaignId/queue/:contactId/dnc', async (req: TenantRequest, res: Response) => {
  try {
    const { campaignId, contactId } = req.params;
    const { reason } = req.body;

    const contact = await prisma.outboundCallContact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      return ApiResponse.error(res, 'Contact not found', 404);
    }

    // Update contact status
    await prisma.outboundCallContact.update({
      where: { id: contactId },
      data: { status: 'DO_NOT_CALL' },
    });

    // Add to DNC list
    await prisma.doNotCallList.upsert({
      where: {
        organizationId_phoneNumber: {
          organizationId: req.organization!.id,
          phoneNumber: contact.phone,
        },
      },
      create: {
        organizationId: req.organization!.id,
        phoneNumber: contact.phone,
        reason: 'CUSTOMER_REQUEST',
        notes: reason || 'Added from manual call queue',
      },
      update: {
        reason: 'CUSTOMER_REQUEST',
        notes: reason || 'Added from manual call queue',
      },
    });

    ApiResponse.success(res, 'Contact marked as Do Not Call');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Get next contact in queue (for quick calling)
router.get('/campaigns/:id/queue/next', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    const nextContact = await prisma.outboundCallContact.findFirst({
      where: {
        campaignId: id,
        status: 'PENDING',
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: new Date() } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextContact) {
      return ApiResponse.success(res, 'No pending contacts', null);
    }

    // Get lead data if available
    let leadData = null;
    if (nextContact.leadId) {
      leadData = await prisma.lead.findUnique({
        where: { id: nextContact.leadId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          source: true,
          customFields: true,
          notes: { orderBy: { createdAt: 'desc' }, take: 3 },
          activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        },
      });
    }

    ApiResponse.success(res, 'Next contact retrieved', {
      contact: nextContact,
      lead: leadData,
    });
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// ==================== TRANSFER CONFIGURATION ====================

// List transfer configs
router.get('/transfer-configs', async (req: TenantRequest, res: Response) => {
  try {
    const configs = await prisma.transferConfig.findMany({
      where: { organizationId: req.organization!.id },
      orderBy: { createdAt: 'desc' },
    });
    ApiResponse.success(res, 'Transfer configs retrieved', configs);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Create transfer config
router.post('/transfer-configs', async (req: TenantRequest, res: Response) => {
  try {
    const {
      agentId,
      name,
      triggerKeywords,
      triggerSentiment,
      maxAITurns,
      transferType,
      transferTo,
      transferMessage,
      fallbackMessage,
      voicemailEnabled,
    } = req.body;

    if (!name) {
      return ApiResponse.error(res, 'Name is required', 400);
    }

    const config = await prisma.transferConfig.create({
      data: {
        organizationId: req.organization!.id,
        agentId,
        name,
        triggerKeywords: triggerKeywords || [],
        triggerSentiment,
        maxAITurns,
        transferType: transferType || 'PHONE',
        transferTo: transferTo || '',
        transferMessage,
        fallbackMessage,
        voicemailEnabled: voicemailEnabled ?? true,
      },
    });

    ApiResponse.success(res, 'Transfer config created', config, 201);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Update transfer config
router.put('/transfer-configs/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const config = await prisma.transferConfig.update({
      where: { id },
      data: updateData,
    });

    ApiResponse.success(res, 'Transfer config updated', config);
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

// Delete transfer config
router.delete('/transfer-configs/:id', async (req: TenantRequest, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.transferConfig.delete({
      where: { id },
    });

    ApiResponse.success(res, 'Transfer config deleted');
  } catch (error) {
    ApiResponse.error(res, (error as Error).message, 500);
  }
});

export default router;
