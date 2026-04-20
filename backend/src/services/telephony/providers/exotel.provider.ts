/**
 * Exotel Telephony Provider
 * Adapter for Exotel Voice API
 */

import axios, { AxiosInstance } from 'axios';
import {
  ITelephonyProvider,
  TelephonyProviderType,
  MakeCallParams,
  CallResult,
  CallStatus,
  EndCallResult,
  ProviderConfig,
} from '../telephony.types';

interface ExotelConfig {
  accountSid: string;
  apiKey: string;
  apiToken: string;
  subdomain: string;
}

export class ExotelProvider implements ITelephonyProvider {
  readonly providerName: TelephonyProviderType = 'EXOTEL';
  private client: AxiosInstance | null = null;
  private config: ExotelConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    const accountSid = process.env.EXOTEL_ACCOUNT_SID || '';
    const apiKey = process.env.EXOTEL_API_KEY || '';
    const apiToken = process.env.EXOTEL_API_TOKEN || '';
    const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';

    if (accountSid && apiKey && apiToken) {
      this.config = { accountSid, apiKey, apiToken, subdomain };
      this.initializeClient();
    }
  }

  private initializeClient(): void {
    if (!this.config) return;

    const baseUrl = `https://${this.config.subdomain}/v1/Accounts/${this.config.accountSid}`;

    this.client = axios.create({
      baseURL: baseUrl,
      auth: {
        username: this.config.apiKey,
        password: this.config.apiToken,
      },
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  async isConfigured(): Promise<boolean> {
    return !!(
      this.config?.accountSid &&
      this.config?.apiKey &&
      this.config?.apiToken
    );
  }

  async getConfig(): Promise<ProviderConfig> {
    try {
      if (!(await this.isConfigured())) {
        return { isConfigured: false };
      }

      const response = await this.client!.get('.json');
      if (response.data?.Account) {
        return {
          isConfigured: true,
          balance: parseFloat(response.data.Account.Balance || '0'),
          accountName: response.data.Account.FriendlyName || response.data.Account.Sid,
        };
      }
      return { isConfigured: true };
    } catch (error) {
      console.error('[Exotel] Failed to get config:', error);
      return { isConfigured: false };
    }
  }

  formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');

    // If starts with +91, keep as is
    if (cleaned.startsWith('+91')) {
      return cleaned;
    }

    // If starts with 91 (without +), add +
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return '+' + cleaned;
    }

    // If 10 digit number, add +91
    if (cleaned.length === 10) {
      return '+91' + cleaned;
    }

    // If starts with 0, replace with +91
    if (cleaned.startsWith('0') && cleaned.length === 11) {
      return '+91' + cleaned.substring(1);
    }

    return cleaned;
  }

  async makeCall(params: MakeCallParams): Promise<CallResult> {
    if (!(await this.isConfigured())) {
      return {
        success: false,
        error: 'Exotel is not configured',
        provider: 'EXOTEL',
      };
    }

    try {
      const fromNumber = this.formatPhoneNumber(params.from);
      const toNumber = this.formatPhoneNumber(params.to);

      const baseUrl = process.env.API_BASE_URL || process.env.BACKEND_URL || 'http://localhost:3001';
      const answerUrl = params.answerUrl || `${baseUrl}/api/telephony/exotel/answer`;
      const statusCallback = params.statusCallback || `${baseUrl}/api/telephony/exotel/status`;

      console.log(`[Exotel] Making call from ${fromNumber} to ${toNumber}`);

      const formData = new URLSearchParams();
      formData.append('From', toNumber);  // Customer to call
      formData.append('CallerId', fromNumber);  // What customer sees
      formData.append('Url', answerUrl);

      if (statusCallback) {
        formData.append('StatusCallback', statusCallback);
      }

      if (params.timeLimit) {
        formData.append('TimeLimit', params.timeLimit.toString());
      }

      if (params.timeout) {
        formData.append('TimeOut', params.timeout.toString());
      }

      // Recording options
      if (params.record !== false) {
        formData.append('Record', 'true');
        formData.append('RecordingChannels', params.recordingChannels || 'dual');
      }

      if (params.customData) {
        formData.append('CustomField', JSON.stringify(params.customData));
      }

      const response = await this.client!.post('/Calls/connect.json', formData);

      if (response.data?.Call) {
        console.log(`[Exotel] Call initiated: ${response.data.Call.Sid}`);
        return {
          success: true,
          callId: response.data.Call.Sid,
          status: response.data.Call.Status,
          provider: 'EXOTEL',
          data: response.data.Call,
        };
      }

      return {
        success: false,
        error: 'Unexpected response from Exotel',
        provider: 'EXOTEL',
        data: response.data,
      };
    } catch (error: any) {
      console.error('[Exotel] makeCall error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.RestException?.Message || error.message,
        provider: 'EXOTEL',
      };
    }
  }

  async endCall(callId: string): Promise<EndCallResult> {
    // Exotel doesn't have a direct hangup API for most call types
    // The call will end naturally or via webhook control
    console.log(`[Exotel] End call requested: ${callId}`);
    return { success: true };
  }

  async getCallStatus(callId: string): Promise<CallStatus | null> {
    if (!(await this.isConfigured())) {
      return null;
    }

    try {
      const response = await this.client!.get(`/Calls/${callId}.json`);

      if (response.data?.Call) {
        const call = response.data.Call;
        return {
          callId: call.Sid,
          status: this.mapStatus(call.Status),
          duration: call.Duration ? parseInt(call.Duration) : undefined,
          recordingUrl: call.RecordingUrl,
          from: call.From,
          to: call.To,
          direction: call.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
        };
      }
      return null;
    } catch (error: any) {
      console.error('[Exotel] getCallStatus error:', error.message);
      return null;
    }
  }

  parseWebhook(body: any): CallStatus {
    return {
      callId: body.CallSid || body.Sid,
      status: this.mapStatus(body.Status || body.CallStatus),
      duration: body.Duration ? parseInt(body.Duration) : undefined,
      recordingUrl: body.RecordingUrl,
      from: body.From,
      to: body.To,
      direction: body.Direction?.toLowerCase() === 'inbound' ? 'inbound' : 'outbound',
    };
  }

  private mapStatus(exotelStatus: string): CallStatus['status'] {
    const statusMap: Record<string, CallStatus['status']> = {
      'queued': 'queued',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'busy': 'busy',
      'failed': 'failed',
      'no-answer': 'no-answer',
      'canceled': 'canceled',
    };
    return statusMap[exotelStatus?.toLowerCase()] || 'failed';
  }

  /**
   * Generate ExoML response for call handling
   */
  generateAnswerXml(params: {
    sayText?: string;
    playUrl?: string;
    gatherInput?: boolean;
    gatherAction?: string;
  }): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n';

    if (params.sayText) {
      xml += `  <Say>${params.sayText}</Say>\n`;
    }

    if (params.playUrl) {
      xml += `  <Play>${params.playUrl}</Play>\n`;
    }

    if (params.gatherInput && params.gatherAction) {
      xml += `  <Gather action="${params.gatherAction}" method="POST" timeout="10" numDigits="1">\n`;
      xml += `    <Say>Please enter your response</Say>\n`;
      xml += `  </Gather>\n`;
    }

    xml += '</Response>';
    return xml;
  }
}

export const exotelProvider = new ExotelProvider();
