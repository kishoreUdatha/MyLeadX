/**
 * Plivo Telephony Provider
 * Adapter for Plivo Voice API
 */

import * as plivo from 'plivo';
import { config } from '../../../config';
import {
  ITelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  CallResult,
  CallStatus,
  EndCallResult,
  ProviderConfig,
} from '../telephony.types';

export class PlivoProvider implements ITelephonyProvider {
  readonly providerName: TelephonyProviderType = 'PLIVO';
  private client: plivo.Client | null = null;

  private getClient(): plivo.Client {
    if (!this.client) {
      const { authId, authToken } = config.plivo;
      if (authId && authToken) {
        this.client = new plivo.Client(authId, authToken);
      } else {
        throw new Error('Plivo credentials not configured');
      }
    }
    return this.client;
  }

  async isConfigured(): Promise<boolean> {
    const { authId, authToken } = config.plivo;
    return !!(authId && authToken);
  }

  async getConfig(): Promise<ProviderConfig> {
    try {
      if (!(await this.isConfigured())) {
        return { isConfigured: false };
      }

      const account = await this.getClient().accounts.get(config.plivo.authId!);
      return {
        isConfigured: true,
        balance: parseFloat(account.cashCredits || '0'),
        accountName: account.name,
      };
    } catch (error) {
      console.error('[Plivo] Failed to get config:', error);
      return { isConfigured: false };
    }
  }

  formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, and parentheses
    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    // Remove leading + if present (Plivo doesn't want +)
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }

    // If starts with 0, assume India and add 91
    if (formatted.startsWith('0')) {
      formatted = '91' + formatted.substring(1);
    }

    // If no country code (10 digits), assume India
    if (formatted.length === 10) {
      formatted = '91' + formatted;
    }

    return formatted;
  }

  async makeCall(params: MakeCallParams): Promise<CallResult> {
    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);

      const baseUrl = config.baseUrl || process.env.API_BASE_URL || 'http://localhost:3001';
      const answerUrl = params.answerUrl || `${baseUrl}/api/telephony/plivo/answer`;
      const statusCallback = params.statusCallback || `${baseUrl}/api/telephony/plivo/status`;

      console.log(`[Plivo] Making call from ${fromNumber} to ${toNumber}`);

      const response = await this.getClient().calls.create(
        fromNumber,
        toNumber,
        answerUrl,
        {
          answerMethod: 'POST',
          hangupUrl: statusCallback,
          hangupMethod: 'POST',
          fallbackUrl: answerUrl,
          fallbackMethod: 'POST',
          ringTimeout: params.timeout || 30,
          timeLimit: params.timeLimit || 3600,
          record: params.record ?? true,
          recordingCallbackUrl: `${baseUrl}/api/telephony/plivo/recording`,
          recordingCallbackMethod: 'POST',
        }
      );

      // Handle response - Plivo returns requestUuid
      const callId = Array.isArray(response.requestUuid)
        ? response.requestUuid[0]
        : response.requestUuid;

      console.log(`[Plivo] Call initiated: ${callId}`);

      return {
        success: true,
        callId,
        status: 'queued',
        provider: 'PLIVO',
        data: response,
      };
    } catch (error: any) {
      console.error('[Plivo] makeCall error:', error.message);
      return {
        success: false,
        error: error.message || 'Failed to initiate call',
        provider: 'PLIVO',
      };
    }
  }

  async endCall(callId: string): Promise<EndCallResult> {
    try {
      await this.getClient().calls.hangup(callId);
      console.log(`[Plivo] Call ended: ${callId}`);
      return { success: true };
    } catch (error: any) {
      console.error('[Plivo] endCall error:', error.message);
      return { success: false, error: error.message };
    }
  }

  async getCallStatus(callId: string): Promise<CallStatus | null> {
    try {
      const call = await this.getClient().calls.get(callId);
      return {
        callId: call.callUuid,
        status: this.mapStatus(call.callState || call.hangupCause),
        duration: parseInt(call.billDuration || '0'),
        recordingUrl: call.recordingUrl,
        from: call.fromNumber,
        to: call.toNumber,
        direction: call.callDirection?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
      };
    } catch (error: any) {
      console.error('[Plivo] getCallStatus error:', error.message);
      return null;
    }
  }

  parseWebhook(body: any): CallStatus {
    return {
      callId: body.CallUUID || body.RequestUUID,
      status: this.mapStatus(body.CallStatus || body.Event),
      duration: body.Duration ? parseInt(body.Duration) : undefined,
      recordingUrl: body.RecordUrl || body.RecordingUrl,
      from: body.From,
      to: body.To,
      direction: body.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
    };
  }

  private mapStatus(plivoStatus: string): CallStatus['status'] {
    const statusMap: Record<string, CallStatus['status']> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'cancel': 'canceled',
      'hangup': 'completed',
      'answered': 'in-progress',
    };
    return statusMap[plivoStatus?.toLowerCase()] || 'failed';
  }

  /**
   * Generate Plivo XML response for call handling
   */
  generateAnswerXml(params: {
    sayText?: string;
    playUrl?: string;
    gatherInput?: boolean;
    gatherAction?: string;
  }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    if (params.sayText) {
      xml += `  <Speak voice="Polly.Aditi" language="en-IN">${params.sayText}</Speak>\n`;
    }

    if (params.playUrl) {
      xml += `  <Play>${params.playUrl}</Play>\n`;
    }

    if (params.gatherInput && params.gatherAction) {
      xml += `  <GetDigits action="${params.gatherAction}" method="POST" timeout="10" retries="1">\n`;
      xml += `    <Speak>Please enter your response</Speak>\n`;
      xml += `  </GetDigits>\n`;
    }

    xml += '</Response>';
    return xml;
  }
}

export const plivoProvider = new PlivoProvider();
