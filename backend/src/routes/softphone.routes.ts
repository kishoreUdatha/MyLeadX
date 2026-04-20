/**
 * Softphone Routes
 * Handles browser-based calling API endpoints and Exotel webhooks
 */

import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { validate } from '../middlewares/validate';
import { ApiResponse } from '../utils/apiResponse';
import { softphoneService } from '../services/softphone.service';
import { prisma } from '../config/database';

const router = Router();

// ==================== EXOTEL WEBHOOKS (No Auth) ====================

/**
 * Call answer webhook - Exotel calls this when customer answers
 */
router.post('/answer/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    console.log(`[Softphone] Answer webhook for call: ${callId}`, req.body);

    const exoml = softphoneService.handleCallAnswer(callId);

    res.set('Content-Type', 'text/xml');
    res.send(exoml);
  } catch (error) {
    console.error('[Softphone] Answer webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Telecaller answer webhook - Called when telecaller answers (for conference bridge mode)
 * Connects telecaller to the same conference as customer
 */
router.post('/telecaller-answer/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    console.log(`[Softphone] Telecaller answer webhook for call: ${callId}`);

    const exoml = softphoneService.handleTelecallerAnswer(callId);

    res.set('Content-Type', 'text/xml');
    res.send(exoml);
  } catch (error) {
    console.error('[Softphone] Telecaller answer webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Say>An error occurred. Goodbye.</Say>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Recording webhook - Called when recording is complete
 * Handles both direct recordings and conference recordings
 */
router.post('/recording/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const {
      RecordUrl,
      RecordingUrl,
      RecordingDuration,
      Duration,
      // Plivo fields
      RecordFile,
      ConferenceRecordUrl,
    } = req.body;

    const recordingUrl = RecordUrl || RecordingUrl || RecordFile || ConferenceRecordUrl;
    const duration = RecordingDuration || Duration;

    console.log(`[Softphone] Recording received for call ${callId}:`, {
      recordingUrl,
      duration,
      body: req.body,
    });

    // Update call with recording
    if (recordingUrl) {
      await softphoneService.handleCallStatus(
        callId,
        'completed',
        duration ? parseInt(duration) : undefined,
        recordingUrl
      );
    }

    // For conference-based calls, the call may already be ended
    // Just acknowledge the recording
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`);
  } catch (error) {
    console.error('[Softphone] Recording webhook error:', error);
    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
</Response>`);
  }
});

/**
 * Conference status webhook - Called when conference events occur
 * Handles both Exotel and Plivo conference callbacks
 */
router.post('/conference-status/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;

    // Exotel fields
    const {
      ConferenceAction,
      ConferenceName,
      ConferenceUUID,
      RecordUrl,
      RecordingUrl,
      RecordingDuration,
      // Plivo fields
      Event,
      ConferenceMemberID,
      ConferenceRecordUrl,
      Duration,
    } = req.body;

    const action = ConferenceAction || Event;
    const recordingUrl = RecordUrl || RecordingUrl || ConferenceRecordUrl;
    const duration = RecordingDuration || Duration;

    console.log(`[Softphone] Conference status for call ${callId}:`, {
      action,
      conference: ConferenceName,
      recordingUrl,
      duration,
      body: req.body,
    });

    // Handle conference end events
    const endEvents = ['exit', 'end', 'ConferenceEnd', 'ParticipantLeft', 'completed'];
    if (endEvents.includes(action)) {
      // Call the conference end handler
      softphoneService.handleConferenceEnd(callId, recordingUrl);

      // If we have a recording URL, also trigger the standard call status handler
      if (recordingUrl) {
        await softphoneService.handleCallStatus(
          callId,
          'completed',
          duration ? parseInt(duration) : undefined,
          recordingUrl
        );
      }
    }

    // Handle recording available event (Plivo sends ConferenceRecordStop, Exotel sends ConferenceRecording)
    const recordingEvents = ['ConferenceRecording', 'ConferenceRecordStop', 'record'];
    if (recordingEvents.includes(action) && recordingUrl) {
      console.log(`[Softphone] Recording available for call ${callId}: ${recordingUrl}`);
      await softphoneService.handleCallStatus(
        callId,
        'completed',
        duration ? parseInt(duration) : undefined,
        recordingUrl
      );
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Softphone] Conference status webhook error:', error);
    res.status(200).send('OK');
  }
});

/**
 * Speech input webhook - Exotel sends customer speech here
 */
router.post('/speech/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { SpeechResult } = req.body;

    console.log(`[Softphone] Speech webhook for call ${callId}: "${SpeechResult}"`);

    const exoml = softphoneService.handleSpeechInput(callId, SpeechResult || '');

    res.set('Content-Type', 'text/xml');
    res.send(exoml);
  } catch (error) {
    console.error('[Softphone] Speech webhook error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Hangup/>
      </Response>`);
  }
});

/**
 * Call status webhook - Exotel sends call status updates here
 */
router.post('/status/:callId', async (req: Request, res: Response) => {
  try {
    const { callId } = req.params;
    const { CallStatus, Status, Duration, RecordingUrl } = req.body;

    const status = CallStatus || Status;
    const duration = Duration ? parseInt(Duration) : undefined;

    console.log(`[Softphone] Status webhook for call ${callId}: ${status}`);

    await softphoneService.handleCallStatus(callId, status, duration, RecordingUrl);

    res.status(200).send('OK');
  } catch (error) {
    console.error('[Softphone] Status webhook error:', error);
    res.status(500).send('Error');
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

router.use(authenticate);
router.use(tenantMiddleware);

/**
 * Initiate a softphone call
 */
router.post(
  '/call',
  validate([
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
    body('contactName').optional().trim(),
    body('leadId').optional().isUUID(),
    body('campaignId').optional().isUUID(),
    body('contactId').optional().isUUID(),
    body('telecallerPhone').optional().trim(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { phoneNumber, contactName, leadId, campaignId, contactId, sessionId, telecallerPhone } = req.body;

      if (!sessionId) {
        return ApiResponse.error(res, 'Session ID is required. Please register softphone first.', 400);
      }

      const result = await softphoneService.initiateCall(sessionId, {
        phoneNumber,
        contactName,
        leadId,
        campaignId,
        contactId,
        telecallerPhone,
      });

      if (!result.success) {
        return ApiResponse.error(res, result.error || 'Failed to initiate call', 400);
      }

      ApiResponse.success(res, 'Call initiated', {
        callId: result.callId,
        conferenceName: result.conferenceName,
      });
    } catch (error: any) {
      console.error('[Softphone] Call initiation error:', error);
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * End a softphone call
 */
router.post(
  '/call/:callId/end',
  validate([param('callId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { callId } = req.params;
      const { sessionId } = req.body;

      if (!sessionId) {
        return ApiResponse.error(res, 'Session ID is required', 400);
      }

      await softphoneService.endCall(sessionId, 'user');

      ApiResponse.success(res, 'Call ended');
    } catch (error: any) {
      console.error('[Softphone] End call error:', error);
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Get Plivo WebRTC token for browser-based calling
 * This token allows the browser to connect to Plivo via WebRTC
 */
router.get('/webrtc-token', async (req: TenantRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.organization!.id;

    const token = await softphoneService.generateWebRTCToken(userId, organizationId);

    if (!token) {
      return ApiResponse.error(res, 'WebRTC not configured. Plivo credentials required.', 400);
    }

    ApiResponse.success(res, 'WebRTC token generated', { token });
  } catch (error: any) {
    console.error('[Softphone] WebRTC token error:', error);
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get softphone status
 */
router.get('/status', async (req: TenantRequest, res: Response) => {
  try {
    const organizationId = req.organization!.id;

    const activeSessions = softphoneService.getActiveSessionsCount(organizationId);
    const activeCalls = softphoneService.getActiveCalls(organizationId);

    // Get available phone numbers for outbound calls
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: {
        organizationId,
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        number: true,
        displayNumber: true,
        friendlyName: true,
      },
    });

    ApiResponse.success(res, 'Softphone status', {
      activeSessions,
      activeCalls: activeCalls.length,
      calls: activeCalls.map((c) => ({
        id: c.id,
        phoneNumber: c.phoneNumber,
        contactName: c.contactName,
        status: c.status,
        startedAt: c.startedAt,
        duration: c.duration,
      })),
      phoneNumbers,
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Get call history for current user
 */
router.get('/history', async (req: TenantRequest, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const calls = await prisma.telecallerCall.findMany({
      where: {
        organizationId: req.organization!.id,
        telecallerId: req.user!.id,
        source: 'SOFTPHONE',
      },
      orderBy: { startedAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    const total = await prisma.telecallerCall.count({
      where: {
        organizationId: req.organization!.id,
        telecallerId: req.user!.id,
        source: 'SOFTPHONE',
      },
    });

    ApiResponse.success(res, 'Call history', {
      calls,
      total,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

// ==================== PHONE NUMBER MANAGEMENT ====================

/**
 * Get all phone numbers with assignment info
 */
router.get('/phone-numbers', async (req: TenantRequest, res: Response) => {
  try {
    const phoneNumbers = await prisma.phoneNumber.findMany({
      where: { organizationId: req.organization!.id },
      include: {
        assignedUser: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedAgent: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    ApiResponse.success(res, 'Phone numbers', { phoneNumbers });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Assign phone number to a user (telecaller)
 */
router.post(
  '/phone-numbers/:numberId/assign',
  validate([
    param('numberId').isUUID(),
    body('userId').isUUID().withMessage('User ID is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { numberId } = req.params;
      const { userId } = req.body;

      // Verify phone number belongs to organization
      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: {
          id: numberId,
          organizationId: req.organization!.id,
        },
      });

      if (!phoneNumber) {
        return ApiResponse.error(res, 'Phone number not found', 404);
      }

      // Verify user belongs to organization
      const user = await prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: req.organization!.id,
        },
      });

      if (!user) {
        return ApiResponse.error(res, 'User not found', 404);
      }

      // Update assignment
      const updated = await prisma.phoneNumber.update({
        where: { id: numberId },
        data: {
          assignedToUserId: userId,
          assignedAt: new Date(),
        },
        include: {
          assignedUser: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      ApiResponse.success(res, 'Phone number assigned', { phoneNumber: updated });
    } catch (error: any) {
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Unassign phone number from user
 */
router.post(
  '/phone-numbers/:numberId/unassign',
  validate([param('numberId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { numberId } = req.params;

      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: {
          id: numberId,
          organizationId: req.organization!.id,
        },
      });

      if (!phoneNumber) {
        return ApiResponse.error(res, 'Phone number not found', 404);
      }

      const updated = await prisma.phoneNumber.update({
        where: { id: numberId },
        data: {
          assignedToUserId: null,
          assignedAt: null,
        },
      });

      ApiResponse.success(res, 'Phone number unassigned', { phoneNumber: updated });
    } catch (error: any) {
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Add a new phone number to the organization
 */
router.post(
  '/phone-numbers',
  validate([
    body('number').trim().notEmpty().withMessage('Phone number is required'),
    body('friendlyName').optional().trim(),
    body('assignedToUserId').optional().isUUID(),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { number, friendlyName, assignedToUserId } = req.body;

      // Check if number already exists
      const existing = await prisma.phoneNumber.findFirst({
        where: {
          organizationId: req.organization!.id,
          number,
        },
      });

      if (existing) {
        return ApiResponse.error(res, 'Phone number already exists', 400);
      }

      const phoneNumber = await prisma.phoneNumber.create({
        data: {
          organizationId: req.organization!.id,
          number,
          displayNumber: number,
          friendlyName,
          provider: 'EXOTEL',
          status: 'AVAILABLE',
          assignedToUserId,
          assignedAt: assignedToUserId ? new Date() : null,
        },
      });

      ApiResponse.success(res, 'Phone number added', { phoneNumber });
    } catch (error: any) {
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Delete a phone number
 */
router.delete(
  '/phone-numbers/:numberId',
  validate([param('numberId').isUUID()]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { numberId } = req.params;

      const phoneNumber = await prisma.phoneNumber.findFirst({
        where: {
          id: numberId,
          organizationId: req.organization!.id,
        },
      });

      if (!phoneNumber) {
        return ApiResponse.error(res, 'Phone number not found', 404);
      }

      await prisma.phoneNumber.delete({ where: { id: numberId } });

      ApiResponse.success(res, 'Phone number deleted');
    } catch (error: any) {
      ApiResponse.error(res, error.message, 500);
    }
  }
);

// ==================== AUTO-DIAL SETTINGS ====================

/**
 * Get telecaller's auto-dial phone number
 * This is the phone that will ring when they make calls
 */
router.get('/auto-dial-number', async (req: TenantRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { phone: true, settings: true },
    });

    const autoDialNumber = user?.phone || (user?.settings as any)?.softphoneNumber || null;

    ApiResponse.success(res, 'Auto-dial number', {
      autoDialNumber,
      isConfigured: !!autoDialNumber,
    });
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

/**
 * Set telecaller's auto-dial phone number
 * When they make calls, this phone will automatically ring and join the conference
 */
router.post(
  '/auto-dial-number',
  validate([
    body('phoneNumber').trim().notEmpty().withMessage('Phone number is required'),
  ]),
  async (req: TenantRequest, res: Response) => {
    try {
      const { phoneNumber } = req.body;

      // Format phone number (ensure it starts with country code)
      let formattedNumber = phoneNumber.replace(/\s+/g, '').replace(/-/g, '');
      if (!formattedNumber.startsWith('+') && !formattedNumber.startsWith('91')) {
        formattedNumber = '91' + formattedNumber;
      }
      if (formattedNumber.startsWith('+')) {
        formattedNumber = formattedNumber.substring(1);
      }

      // Update user's phone field (primary auto-dial number)
      await prisma.user.update({
        where: { id: req.user!.id },
        data: { phone: formattedNumber },
      });

      console.log(`[Softphone] Auto-dial number set for user ${req.user!.id}: ${formattedNumber}`);

      ApiResponse.success(res, 'Auto-dial number saved', {
        autoDialNumber: formattedNumber,
        message: 'Your phone will now ring automatically when you make calls',
      });
    } catch (error: any) {
      ApiResponse.error(res, error.message, 500);
    }
  }
);

/**
 * Remove telecaller's auto-dial phone number
 */
router.delete('/auto-dial-number', async (req: TenantRequest, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { phone: null },
    });

    console.log(`[Softphone] Auto-dial number removed for user ${req.user!.id}`);

    ApiResponse.success(res, 'Auto-dial number removed');
  } catch (error: any) {
    ApiResponse.error(res, error.message, 500);
  }
});

export default router;
