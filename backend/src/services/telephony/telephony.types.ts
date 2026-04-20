/**
 * Telephony Types
 * Provider-agnostic interfaces for telephony operations
 */

export type TelephonyProviderType = 'PLIVO' | 'EXOTEL' | 'TWILIO';

export interface MakeCallParams {
  from: string;           // Caller ID (phone number)
  to: string;             // Destination phone number
  answerUrl?: string;     // Webhook URL when call is answered
  statusCallback?: string; // Webhook URL for status updates
  record?: boolean;       // Enable call recording
  recordingChannels?: 'single' | 'dual';
  timeLimit?: number;     // Max call duration in seconds
  timeout?: number;       // Ring timeout in seconds
  customData?: Record<string, any>; // Custom metadata
}

export interface CallResult {
  success: boolean;
  callId?: string;        // Provider's call ID
  status?: string;        // Initial status
  error?: string;         // Error message if failed
  provider: TelephonyProviderType;
  data?: any;             // Raw provider response
}

export interface CallStatus {
  callId: string;
  status: 'queued' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'failed' | 'no-answer' | 'canceled';
  duration?: number;
  recordingUrl?: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
}

export interface EndCallResult {
  success: boolean;
  error?: string;
}

export interface ProviderConfig {
  isConfigured: boolean;
  balance?: number;
  accountName?: string;
}

/**
 * Telephony Provider Interface
 * All providers must implement this interface
 */
export interface ITelephonyProvider {
  readonly providerName: TelephonyProviderType;

  /**
   * Check if provider is configured and ready
   */
  isConfigured(): Promise<boolean>;

  /**
   * Get provider configuration status
   */
  getConfig(): Promise<ProviderConfig>;

  /**
   * Make an outbound call
   */
  makeCall(params: MakeCallParams): Promise<CallResult>;

  /**
   * End an active call
   */
  endCall(callId: string): Promise<EndCallResult>;

  /**
   * Get call status/details
   */
  getCallStatus(callId: string): Promise<CallStatus | null>;

  /**
   * Parse webhook data from provider
   */
  parseWebhook(body: any): CallStatus;

  /**
   * Format phone number for this provider
   */
  formatPhoneNumber(phone: string): string;
}
