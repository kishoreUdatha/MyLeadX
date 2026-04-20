/**
 * Softphone Service
 * Handles browser-based calling for telecallers
 * Provider-agnostic - uses TelephonyService abstraction
 *
 * Flow:
 * 1. Telecaller clicks "Call" in browser
 * 2. Backend gets telecaller's assigned phone number
 * 3. Backend initiates call via the number's provider (Plivo/Exotel)
 * 4. Audio is streamed between browser and provider via WebSocket
 * 5. Telecaller talks through headset, customer on mobile
 */

import { Server as SocketServer, Socket } from 'socket.io';
import { telephonyService, TelephonyProviderType } from './telephony';
import { prisma } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { softphoneAnalysisService } from './softphone-analysis.service';

interface SoftphoneCall {
  id: string;
  sessionId: string;
  organizationId: string;
  userId: string;
  phoneNumber: string;
  callerNumber: string;
  contactName?: string;
  leadId?: string;
  providerCallId?: string;        // Customer's call ID from provider
  telecallerCallId?: string;      // Telecaller's call ID from provider (for auto-dial)
  provider?: TelephonyProviderType;
  status: 'initiating' | 'ringing' | 'connected' | 'ended' | 'failed';
  startedAt: Date;
  connectedAt?: Date;
  endedAt?: Date;
  duration?: number;
}

interface SoftphoneSession {
  sessionId: string;
  socket: Socket;
  organizationId: string;
  userId: string;
  userName: string;
  phoneNumberId?: string; // Assigned phone number ID
  currentCall?: SoftphoneCall;
  isAvailable: boolean;
}

// Store call metadata separately so it persists even if session disconnects
interface CallMetadata {
  callId: string;
  conferenceName: string;
  provider: TelephonyProviderType;
  organizationId: string;
  userId: string;
}

class SoftphoneService {
  private io: SocketServer | null = null;
  private sessions: Map<string, SoftphoneSession> = new Map();
  private socketToSession: Map<string, string> = new Map();
  private callMetadata: Map<string, CallMetadata> = new Map(); // Persists call info for webhooks

  /**
   * Initialize the softphone service with Socket.IO server
   */
  initialize(io: SocketServer): void {
    this.io = io;
    console.log('[Softphone] Service initialized');
  }

  /**
   * Register a new softphone session
   */
  registerSession(
    socket: Socket,
    organizationId: string,
    userId: string,
    userName: string
  ): string {
    const sessionId = `softphone-${uuidv4().substring(0, 8)}`;

    const session: SoftphoneSession = {
      sessionId,
      socket,
      organizationId,
      userId,
      userName,
      isAvailable: true,
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(socket.id, sessionId);

    console.log(`[Softphone] Session registered: ${sessionId} for user ${userName}`);

    // Emit registration success
    socket.emit('softphone:registered', {
      sessionId,
      status: 'ready',
    });

    return sessionId;
  }

  /**
   * Generate WebRTC token for browser-based calling via Plivo
   * This allows telecaller to connect to conference from browser without phone
   */
  async generateWebRTCToken(userId: string, organizationId: string): Promise<string | null> {
    const { config } = await import('../config');
    const plivo = await import('plivo');

    const authId = config.plivo.authId;
    const authToken = config.plivo.authToken;

    if (!authId || !authToken) {
      console.warn('[Softphone] Plivo credentials not configured for WebRTC');
      return null;
    }

    try {
      // Create a unique endpoint username for this user
      const endpointUsername = `telecaller_${userId.substring(0, 8)}`;

      // Check if endpoint exists, create if not
      const client = new plivo.Client(authId, authToken);

      let endpoint;
      try {
        // Try to get existing endpoint
        endpoint = await client.endpoints.get(endpointUsername);
      } catch {
        // Create new endpoint if doesn't exist
        try {
          endpoint = await client.endpoints.create(
            endpointUsername,
            `pass_${userId.substring(0, 16)}`, // password
            'softphone', // alias
            config.plivo.phoneNumber?.replace('+', '') || undefined // app_id (optional)
          );
          console.log(`[Softphone] Created Plivo endpoint: ${endpointUsername}`);
        } catch (createError: any) {
          // Endpoint might already exist with different password, try to update
          console.warn('[Softphone] Could not create endpoint:', createError.message);
        }
      }

      // Generate JWT token for WebRTC
      // Token is valid for 24 hours
      const token = new plivo.AccessToken(
        authId,
        authToken,
        endpointUsername,
        {
          validFrom: new Date(),
          lifetime: 86400, // 24 hours in seconds
          uid: `${organizationId}_${userId}`,
        }
      );

      // Add voice grant
      const voiceGrant = new plivo.VoiceGrant({
        incomingAllow: true,
        outgoingAllow: true,
      });
      token.addGrant(voiceGrant);

      const jwtToken = token.toJwt();
      console.log(`[Softphone] Generated WebRTC token for user ${userId}`);

      return jwtToken;
    } catch (error: any) {
      console.error('[Softphone] Error generating WebRTC token:', error);
      throw new Error(`Failed to generate WebRTC token: ${error.message}`);
    }
  }

  /**
   * Unregister a softphone session
   */
  unregisterSession(socketId: string): void {
    const sessionId = this.socketToSession.get(socketId);
    if (!sessionId) return;

    const session = this.sessions.get(sessionId);
    if (session) {
      // End any active call
      if (session.currentCall) {
        this.endCall(sessionId, 'disconnected');
      }

      this.sessions.delete(sessionId);
      console.log(`[Softphone] Session unregistered: ${sessionId}`);
    }

    this.socketToSession.delete(socketId);
  }

  /**
   * Get session by socket ID
   */
  getSessionBySocket(socketId: string): SoftphoneSession | undefined {
    const sessionId = this.socketToSession.get(socketId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Initiate a call from browser to customer
   * Uses TelephonyService to auto-select provider based on user's assigned number
   *
   * Conference Bridge Flow:
   * 1. Call the customer's phone
   * 2. When customer answers, they join conference "softphone-{callId}"
   * 3. If telecallerPhone provided, also call telecaller and connect to same conference
   * 4. Both parties can now talk to each other
   * 5. Conference is recorded for AI analysis
   */
  async initiateCall(
    sessionId: string,
    params: {
      phoneNumber: string;
      contactName?: string;
      leadId?: string;
      campaignId?: string;
      contactId?: string;
      telecallerPhone?: string; // Optional: telecaller's phone to join conference
    }
  ): Promise<{ success: boolean; callId?: string; conferenceName?: string; error?: string }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { success: false, error: 'Session not found' };
    }

    if (session.currentCall) {
      return { success: false, error: 'Already on a call' };
    }

    // Get provider and phone number for this user using TelephonyService
    const { provider, phoneNumber: callerNumber } = await telephonyService.getProviderForUser(
      session.userId,
      session.organizationId
    );

    if (!provider || !callerNumber) {
      return {
        success: false,
        error: 'No phone number assigned. Please contact your admin to assign a phone number.'
      };
    }

    console.log(`[Softphone] Using provider ${provider.providerName} with number ${callerNumber}`);

    // Auto-fetch telecaller's phone number from user profile if not provided
    let telecallerPhone = params.telecallerPhone;
    if (!telecallerPhone) {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { phone: true, settings: true },
      });

      // Check user.phone first, then settings.softphoneNumber
      telecallerPhone = user?.phone || (user?.settings as any)?.softphoneNumber;

      if (telecallerPhone) {
        console.log(`[Softphone] Auto-dial enabled: will call telecaller at ${telecallerPhone}`);
      }
    }

    // Create call record
    const callId = uuidv4();
    const conferenceName = `softphone-${callId}`;
    const call: SoftphoneCall = {
      id: callId,
      sessionId,
      organizationId: session.organizationId,
      userId: session.userId,
      phoneNumber: params.phoneNumber,
      callerNumber,
      contactName: params.contactName,
      leadId: params.leadId,
      provider: provider.providerName,
      status: 'initiating',
      startedAt: new Date(),
    };

    session.currentCall = call;
    session.isAvailable = false;

    // Notify browser that call is initiating
    session.socket.emit('softphone:call_status', {
      callId,
      status: 'initiating',
      phoneNumber: params.phoneNumber,
      contactName: params.contactName,
      provider: provider.providerName,
      conferenceName,
    });

    try {
      // Get the base URL for callbacks
      const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      const providerLower = provider.providerName.toLowerCase();

      // Step 1: Call the customer
      const customerCallResult = await provider.makeCall({
        from: callerNumber,
        to: params.phoneNumber,
        answerUrl: `${baseUrl}/api/telephony/${providerLower}/answer/${callId}`,
        statusCallback: `${baseUrl}/api/telephony/${providerLower}/status/${callId}`,
        record: false, // Conference handles recording
        customData: {
          softphoneCallId: callId,
          conferenceName,
          role: 'customer',
          userId: session.userId,
          organizationId: session.organizationId,
          leadId: params.leadId,
          campaignId: params.campaignId,
        },
      });

      if (!customerCallResult.success) {
        call.status = 'failed';
        session.currentCall = undefined;
        session.isAvailable = true;

        session.socket.emit('softphone:call_status', {
          callId,
          status: 'failed',
          error: customerCallResult.error,
        });

        return { success: false, error: customerCallResult.error };
      }

      call.providerCallId = customerCallResult.callId;
      call.status = 'ringing';

      // Store call metadata for webhooks (persists even if session disconnects)
      this.callMetadata.set(callId, {
        callId,
        conferenceName,
        provider: provider.providerName,
        organizationId: session.organizationId,
        userId: session.userId,
      });

      // Step 2: Auto-dial telecaller's phone to join the conference
      // This connects both parties to the same conference for two-way audio
      if (telecallerPhone) {
        console.log(`[Softphone] Auto-dialing telecaller at ${telecallerPhone}`);

        const telecallerCallResult = await provider.makeCall({
          from: callerNumber,
          to: telecallerPhone,
          answerUrl: `${baseUrl}/api/softphone/telecaller-answer/${callId}`,
          statusCallback: `${baseUrl}/api/telephony/${providerLower}/status/${callId}-telecaller`,
          record: false,
          customData: {
            softphoneCallId: callId,
            conferenceName,
            role: 'telecaller',
          },
        });

        if (!telecallerCallResult.success) {
          console.warn(`[Softphone] Failed to call telecaller: ${telecallerCallResult.error}`);
          // Continue anyway - customer call is more important
        } else {
          // Store telecaller call ID so we can end it later
          call.telecallerCallId = telecallerCallResult.callId;
          console.log(`[Softphone] Telecaller call initiated: ${telecallerCallResult.callId}`);
        }
      }

      // Notify browser that call is ringing
      session.socket.emit('softphone:call_status', {
        callId,
        status: 'ringing',
        providerCallId: customerCallResult.callId,
        provider: provider.providerName,
        conferenceName,
      });

      // Log the call in database
      await this.logCallStart(call, params);

      console.log(`[Softphone] Call initiated via ${provider.providerName}: ${callId} to ${params.phoneNumber}`);

      return { success: true, callId, conferenceName };
    } catch (error: any) {
      console.error('[Softphone] Call initiation error:', error);

      call.status = 'failed';
      session.currentCall = undefined;
      session.isAvailable = true;

      session.socket.emit('softphone:call_status', {
        callId,
        status: 'failed',
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Handle telecaller answer webhook
   * Connects telecaller to the same conference as customer
   */
  handleTelecallerAnswer(callId: string): string {
    const conferenceName = `softphone-${callId}`;
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';

    // Get provider from stored call metadata (persists even if session disconnects)
    const metadata = this.callMetadata.get(callId);
    let provider: TelephonyProviderType | undefined = metadata?.provider;

    // Fallback: try to find from active session
    if (!provider) {
      for (const [, s] of this.sessions) {
        if (s.currentCall?.id === callId || s.currentCall?.providerCallId === callId) {
          provider = s.currentCall.provider;
          break;
        }
      }
    }

    // Default to PLIVO if we still don't know (safer for Indian market)
    if (!provider) {
      console.warn(`[Softphone] Provider unknown for call ${callId}, defaulting to PLIVO`);
      provider = 'PLIVO';
    }

    console.log(`[Softphone] Telecaller answered, joining conference: ${conferenceName}, provider: ${provider}`);

    // Return XML in the correct format based on provider
    if (provider === 'PLIVO') {
      // Plivo XML format - uses <Speak> not <Say>
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Speak voice="Polly.Aditi" language="en-IN">Connecting you to the customer.</Speak>
  <Conference callbackUrl="${baseUrl}/api/softphone/conference-status/${callId}" callbackMethod="POST" recordingCallbackUrl="${baseUrl}/api/softphone/recording/${callId}" recordingCallbackMethod="POST" record="true" recordFileFormat="mp3" startConferenceOnEnter="true" endConferenceOnExit="false" stayAlone="true" maxMembers="2" waitSound="" enterSound="" exitSound="">${conferenceName}</Conference>
</Response>`;
    } else {
      // Exotel XML format (ExoML)
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Connecting you to the customer.</Say>
  <Conference record="true" startConferenceOnEnter="true" endConferenceOnExit="true" maxParticipants="2" waitUrl="" beep="false" action="${baseUrl}/api/softphone/conference-status/${callId}" method="POST">${conferenceName}</Conference>
</Response>`;
    }
  }

  /**
   * Handle call answer webhook
   * Returns XML response to connect the call using Conference Bridge
   *
   * Conference Bridge allows two-way audio between telecaller and customer:
   * - Customer joins the conference via this webhook
   * - Telecaller joins via browser (Exotel/Plivo SDK) or is already connected
   * - Both can hear and speak to each other
   * - Call is recorded for AI analysis
   */
  handleCallAnswer(callId: string): string {
    // Find the session with this call
    // Check both internal ID and provider call ID (Plivo sends its own UUID)
    let session: SoftphoneSession | undefined;
    for (const [, s] of this.sessions) {
      if (s.currentCall?.id === callId || s.currentCall?.providerCallId === callId) {
        session = s;
        break;
      }
    }

    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';

    if (!session || !session.currentCall) {
      console.error(`[Softphone] Call not found for answer: ${callId}`);
      // Instead of hanging up, try to keep the call alive with a waiting message
      // This handles cases where session might be temporarily unavailable
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="female" language="en-IN">Please hold while we connect you.</Say>
  <Wait length="3"/>
  <Redirect method="POST">${baseUrl}/api/telephony/exotel/answer/${callId}</Redirect>
</Response>`;
    }

    // Update call status
    session.currentCall.status = 'connected';
    session.currentCall.connectedAt = new Date();

    const provider = session.currentCall.provider?.toUpperCase();
    const conferenceName = `softphone-${callId}`;

    // Notify browser that call is connected - include conferenceName for WebRTC joining
    session.socket.emit('softphone:call_status', {
      callId,
      status: 'connected',
      conferenceName, // Frontend uses this to join via WebRTC
    });

    console.log(`[Softphone] Call answered: ${callId}, conference: ${conferenceName}`);

    // Use Conference Bridge for two-way audio
    // Both the telecaller (via browser/SDK) and customer join the same conference
    if (provider === 'PLIVO') {
      // Plivo Conference XML
      // record="true" - Records the conference
      // startConferenceOnEnter="true" - Conference starts when this participant joins
      // endConferenceOnExit="false" - Conference continues if customer leaves (telecaller can reconnect)
      // stayAlone="true" - Keep conference alive even with one participant
      // waitSound - No hold music, direct connection
      // recordingCallbackUrl - URL where Plivo sends the recording after processing
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Conference callbackUrl="${baseUrl}/api/softphone/conference-status/${callId}" callbackMethod="POST" recordingCallbackUrl="${baseUrl}/api/softphone/recording/${callId}" recordingCallbackMethod="POST" record="true" recordFileFormat="mp3" startConferenceOnEnter="true" endConferenceOnExit="false" stayAlone="true" maxMembers="2" waitSound="" enterSound="" exitSound="">${conferenceName}</Conference>
</Response>`;
    } else {
      // Exotel Conference XML (ExoML)
      // record="true" - Records the conference for AI analysis
      // startConferenceOnEnter="true" - Conference starts immediately
      // endConferenceOnExit="true" - End when either party hangs up
      // maxParticipants="2" - Only telecaller and customer
      // waitUrl="" - No hold music
      // beep="false" - No beep when joining
      return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Conference record="true" startConferenceOnEnter="true" endConferenceOnExit="true" maxParticipants="2" waitUrl="" beep="false" action="${baseUrl}/api/softphone/conference-status/${callId}" method="POST">${conferenceName}</Conference>
</Response>`;
    }
  }

  /**
   * Handle conference end - called when conference ends
   * Used to get recording URL and finalize the call
   */
  handleConferenceEnd(callId: string, recordingUrl?: string): void {
    // Find the session with this call
    let session: SoftphoneSession | undefined;
    for (const [, s] of this.sessions) {
      if (s.currentCall?.id === callId) {
        session = s;
        break;
      }
    }

    if (session && session.currentCall) {
      console.log(`[Softphone] Conference ended for call: ${callId}, recording: ${recordingUrl}`);

      // Update call with recording URL and mark as ended
      this.handleCallStatus(callId, 'completed', undefined, recordingUrl);
    }
  }

  /**
   * Handle speech input from customer during softphone call
   */
  handleSpeechInput(callId: string, speechResult: string): string {
    // Find the session with this call (check both internal ID and provider call ID)
    let session: SoftphoneSession | undefined;
    for (const [, s] of this.sessions) {
      if (s.currentCall?.id === callId || s.currentCall?.providerCallId === callId) {
        session = s;
        break;
      }
    }

    if (!session || !session.currentCall) {
      return `<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Hangup/>
        </Response>`;
    }

    // Send customer's speech to browser
    session.socket.emit('softphone:customer_speech', {
      callId,
      text: speechResult,
      timestamp: new Date().toISOString(),
    });

    // Continue listening
    const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3000';

    return `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Gather input="speech" action="${baseUrl}/api/softphone/speech/${callId}" method="POST" speechTimeout="auto" language="en-IN" timeout="30" finishOnKey="#">
        </Gather>
        <Redirect>${baseUrl}/api/softphone/answer/${callId}</Redirect>
      </Response>`;
  }

  /**
   * Handle call status webhook from Exotel
   */
  async handleCallStatus(
    callId: string,
    status: string,
    duration?: number,
    recordingUrl?: string
  ): Promise<void> {
    // Find the session with this call (check both internal ID and provider call ID)
    let session: SoftphoneSession | undefined;
    let foundSessionId: string | undefined;

    for (const [sessionId, s] of this.sessions) {
      if (s.currentCall?.id === callId || s.currentCall?.providerCallId === callId) {
        session = s;
        foundSessionId = sessionId;
        break;
      }
    }

    if (!session || !session.currentCall) {
      console.warn(`[Softphone] No active session for call status: ${callId}`);

      // If we have a recording URL or duration, try to update the database directly
      // This handles the case where recording/status arrives after call ends
      if (recordingUrl || duration) {
        console.log(`[Softphone] Updating call directly in database for call: ${callId}, duration: ${duration}, recordingUrl: ${recordingUrl ? 'yes' : 'no'}`);
        try {
          const updateData: any = {};
          if (recordingUrl) updateData.recordingUrl = recordingUrl;
          if (duration) updateData.duration = duration;

          await prisma.telecallerCall.update({
            where: { id: callId },
            data: updateData,
          });
          console.log(`[Softphone] Call updated for: ${callId}`);

          // Queue for AI analysis if recording available
          if (recordingUrl) {
            softphoneAnalysisService.queueForAnalysis(callId, recordingUrl);
          }
        } catch (error) {
          console.error(`[Softphone] Failed to update call:`, error);
        }
      }
      return;
    }

    const normalizedStatus = status.toLowerCase();

    if (['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(normalizedStatus)) {
      session.currentCall.status = 'ended';
      session.currentCall.endedAt = new Date();
      session.currentCall.duration = duration;

      // Notify browser
      session.socket.emit('softphone:call_status', {
        callId,
        status: 'ended',
        reason: normalizedStatus,
        duration,
        recordingUrl,
      });

      // Log call end in database
      await this.logCallEnd(session.currentCall, normalizedStatus, recordingUrl);

      // Queue for AI analysis if recording is available
      if (recordingUrl && normalizedStatus === 'completed') {
        console.log(`[Softphone] Queueing call ${callId} for AI analysis`);
        softphoneAnalysisService.queueForAnalysis(callId, recordingUrl);
      }

      // Clear current call and metadata
      session.currentCall = undefined;
      session.isAvailable = true;
      this.callMetadata.delete(callId);

      console.log(`[Softphone] Call ended: ${callId} - ${normalizedStatus}`);
    } else {
      // Update status
      session.socket.emit('softphone:call_status', {
        callId,
        status: normalizedStatus,
      });
    }
  }

  /**
   * End a call from browser
   */
  async endCall(sessionId: string, reason: string = 'user'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentCall) {
      return;
    }

    const call = session.currentCall;

    // End both call legs via provider
    if (call.provider) {
      // End customer's call
      if (call.providerCallId) {
        try {
          await telephonyService.endCall(call.providerCallId, call.provider);
          console.log(`[Softphone] Ending customer call ${call.providerCallId} via ${call.provider}`);
        } catch (error) {
          console.error('[Softphone] Error ending customer call:', error);
        }
      }

      // End telecaller's call (auto-dial leg)
      if (call.telecallerCallId) {
        try {
          await telephonyService.endCall(call.telecallerCallId, call.provider);
          console.log(`[Softphone] Ending telecaller call ${call.telecallerCallId} via ${call.provider}`);
        } catch (error) {
          console.error('[Softphone] Error ending telecaller call:', error);
        }
      }
    }

    call.status = 'ended';
    call.endedAt = new Date();
    if (call.connectedAt) {
      call.duration = Math.floor((call.endedAt.getTime() - call.connectedAt.getTime()) / 1000);
    }

    // Notify browser
    session.socket.emit('softphone:call_status', {
      callId: call.id,
      status: 'ended',
      reason,
      duration: call.duration,
    });

    // Log call end
    await this.logCallEnd(call, reason);

    // Clear current call and metadata
    session.currentCall = undefined;
    session.isAvailable = true;
    this.callMetadata.delete(call.id);

    console.log(`[Softphone] Call ended by ${reason}: ${call.id}`);
  }

  /**
   * Log call start to database
   * Checks for existing recent call to avoid duplicates (Assigned Data page may have already created one)
   */
  private async logCallStart(call: SoftphoneCall, params: any): Promise<void> {
    try {
      // Check if a recent call record already exists for this phone number and user
      // This handles the case where Assigned Data page already created a call record
      const existingCall = await prisma.telecallerCall.findFirst({
        where: {
          telecallerId: call.userId,
          phoneNumber: call.phoneNumber,
          outcome: null, // Only match calls without outcome (in progress)
          createdAt: {
            gte: new Date(Date.now() - 60000), // Created in last 60 seconds
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (existingCall) {
        // Update the existing call record with softphone data
        console.log(`[Softphone] Found existing call record ${existingCall.id}, updating with softphone data`);
        await prisma.telecallerCall.update({
          where: { id: existingCall.id },
          data: {
            status: 'IN_PROGRESS',
            extractedData: {
              ...(existingCall.extractedData as any || {}),
              source: 'SOFTPHONE',
              softphoneCallId: call.id,
              sessionId: call.sessionId,
              providerCallId: call.providerCallId,
              provider: call.provider,
              callerNumber: call.callerNumber,
            },
          },
        });
        // Update our internal call ID to match the existing record
        call.id = existingCall.id;
      } else {
        // Create new call record
        await prisma.telecallerCall.create({
          data: {
            id: call.id,
            organizationId: call.organizationId,
            leadId: call.leadId || undefined,
            telecallerId: call.userId,
            phoneNumber: call.phoneNumber,
            callType: 'OUTBOUND',
            status: 'IN_PROGRESS',
            contactName: call.contactName,
            startedAt: call.startedAt,
            extractedData: {
              source: 'SOFTPHONE',
              sessionId: call.sessionId,
              providerCallId: call.providerCallId,
              provider: call.provider,
              callerNumber: call.callerNumber,
              campaignId: params.campaignId,
              contactId: params.contactId,
            },
          },
        });
      }
    } catch (error) {
      console.error('[Softphone] Error logging call start:', error);
    }
  }

  /**
   * Log call end to database
   * Note: outcome is set later by telecaller through UI (INTERESTED, NOT_INTERESTED, etc.)
   */
  private async logCallEnd(call: SoftphoneCall, reason: string, recordingUrl?: string): Promise<void> {
    try {
      // Map the reason to a status
      const statusMap: Record<string, string> = {
        'completed': 'COMPLETED',
        'user': 'COMPLETED',
        'disconnected': 'COMPLETED',
        'busy': 'FAILED',
        'no-answer': 'FAILED',
        'failed': 'FAILED',
        'canceled': 'CANCELLED',
      };
      const status = statusMap[reason.toLowerCase()] || 'COMPLETED';

      // Map reason to outcome only for specific call outcomes
      // The actual business outcome (INTERESTED, NOT_INTERESTED, etc.) should be set by telecaller
      const outcomeMap: Record<string, 'NO_ANSWER' | 'BUSY' | 'WRONG_NUMBER' | undefined> = {
        'busy': 'BUSY',
        'no-answer': 'NO_ANSWER',
        'failed': 'NO_ANSWER',
      };
      const outcome = outcomeMap[reason.toLowerCase()];

      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: {
          status,
          outcome, // Only set for failed calls, telecaller sets for completed calls
          endedAt: call.endedAt,
          duration: call.duration,
          recordingUrl,
        },
      });
    } catch (error) {
      console.error('[Softphone] Error logging call end:', error);
    }
  }

  /**
   * Get active sessions count for an organization
   */
  getActiveSessionsCount(organizationId: string): number {
    let count = 0;
    for (const [, session] of this.sessions) {
      if (session.organizationId === organizationId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all active calls for an organization
   */
  getActiveCalls(organizationId: string): SoftphoneCall[] {
    const calls: SoftphoneCall[] = [];
    for (const [, session] of this.sessions) {
      if (session.organizationId === organizationId && session.currentCall) {
        calls.push(session.currentCall);
      }
    }
    return calls;
  }
}

export const softphoneService = new SoftphoneService();
export default softphoneService;
