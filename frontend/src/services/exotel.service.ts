import api from './api';

// ==================== TYPES ====================

export interface ExotelCallResponse {
  callId: string;
  exotelCallSid: string;
  status: string;
  from?: string;
  to?: string;
}

export interface ExotelCallDetails {
  Sid: string;
  Status: string;
  From: string;
  To: string;
  Direction: string;
  Duration?: number;
  RecordingUrl?: string;
  StartTime?: string;
  EndTime?: string;
}

export interface ExotelAccountStatus {
  configured: boolean;
  balance?: number;
  accountStatus?: string;
  requiredEnvVars?: string[];
}

export interface ExotelSmsResponse {
  messageSid: string;
}

export interface ExotelBulkSmsResult {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    to: string;
    success: boolean;
    messageSid?: string;
    error?: string;
  }>;
}

// ==================== CALLS ====================

/**
 * Make an outbound call via Exotel (IVR/AI flow)
 * Calls the customer and plays IVR/greeting
 */
export const makeCall = async (data: {
  to: string;
  agentId?: string;
  leadId?: string;
  customData?: Record<string, any>;
}): Promise<ExotelCallResponse> => {
  const response = await api.post('/exotel/call', data);
  return response.data.data;
};

/**
 * Connect agent to customer (Click-to-Call)
 * First calls the agent, when answered, connects to customer
 */
export const connectCall = async (data: {
  from: string; // Agent's phone number
  to: string; // Customer's phone number
  leadId?: string;
  callType?: 'trans' | 'promo';
  record?: boolean;
  recordingChannels?: 'single' | 'dual';
  recordingFormat?: 'mp3' | 'mp3-hq';
  waitUrl?: string;
  customData?: Record<string, any>;
}): Promise<ExotelCallResponse> => {
  const response = await api.post('/exotel/connect', data);
  return response.data.data;
};

/**
 * Get call details by Call SID
 */
export const getCallDetails = async (callSid: string): Promise<ExotelCallDetails> => {
  const response = await api.get(`/exotel/call/${callSid}`);
  return response.data.data;
};

/**
 * Get Exotel account balance and status
 */
export const getAccountBalance = async (): Promise<{ balance: number; account: any }> => {
  const response = await api.get('/exotel/balance');
  return response.data.data;
};

/**
 * Check if Exotel is configured
 */
export const getStatus = async (): Promise<ExotelAccountStatus> => {
  const response = await api.get('/exotel/status');
  return response.data.data;
};

// ==================== SMS ====================

/**
 * Send SMS via Exotel with DLT Template support
 */
export const sendSms = async (data: {
  to: string;
  body: string;
  templateId?: string;
  entityId?: string;
  senderId?: string;
  smsType?: 'transactional' | 'promotional';
}): Promise<ExotelSmsResponse> => {
  const response = await api.post('/exotel/sms', data);
  return response.data.data;
};

/**
 * Send Bulk SMS via Exotel
 */
export const sendBulkSms = async (data: {
  recipients: Array<{ to: string; body: string }>;
  templateId?: string;
  entityId?: string;
  senderId?: string;
  smsType?: 'transactional' | 'promotional';
}): Promise<ExotelBulkSmsResult> => {
  const response = await api.post('/exotel/sms/bulk', data);
  return response.data.data;
};

/**
 * Get DLT configuration status
 */
export const getSmsConfig = async (): Promise<{
  senderId: string | null;
  entityId: string | null;
  templateId: string | null;
  isConfigured: boolean;
}> => {
  const response = await api.get('/exotel/sms/config');
  return response.data.data;
};

// ==================== OUTBOUND CAMPAIGNS ====================

export interface OutboundCampaign {
  id: string;
  name: string;
  description?: string;
  agentId: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  callingMode: 'AUTOMATIC' | 'MANUAL';
  maxConcurrentCalls: number;
  callsBetweenHours: { start: number; end: number };
  retryAttempts: number;
  retryDelayMinutes: number;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  leadsGenerated: number;
  createdAt: string;
  updatedAt: string;
}

export interface OutboundContact {
  id: string;
  phone: string;
  name?: string;
  email?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SCHEDULED';
  attempts: number;
  lastAttemptAt?: string;
}

/**
 * Create an outbound call campaign with contacts
 */
export const createCampaign = async (data: {
  name: string;
  description?: string;
  agentId: string;
  contacts: Array<{ phone: string; name?: string; email?: string }>;
  callingMode?: 'AUTOMATIC' | 'MANUAL';
  maxConcurrentCalls?: number;
  callsBetweenHours?: { start: number; end: number };
  retryAttempts?: number;
  retryDelayMinutes?: number;
}): Promise<OutboundCampaign> => {
  const response = await api.post('/outbound-calls/campaigns', data);
  return response.data.data;
};

/**
 * Get all campaigns
 */
export const getCampaigns = async (): Promise<OutboundCampaign[]> => {
  const response = await api.get('/outbound-calls/campaigns');
  return response.data.data;
};

/**
 * Get campaign by ID
 */
export const getCampaign = async (campaignId: string): Promise<OutboundCampaign> => {
  const response = await api.get(`/outbound-calls/campaigns/${campaignId}`);
  return response.data.data;
};

/**
 * Start a campaign
 */
export const startCampaign = async (campaignId: string): Promise<OutboundCampaign> => {
  const response = await api.post(`/outbound-calls/campaigns/${campaignId}/start`);
  return response.data.data;
};

/**
 * Pause a campaign
 */
export const pauseCampaign = async (campaignId: string): Promise<OutboundCampaign> => {
  const response = await api.post(`/outbound-calls/campaigns/${campaignId}/pause`);
  return response.data.data;
};

/**
 * Resume a campaign
 */
export const resumeCampaign = async (campaignId: string): Promise<OutboundCampaign> => {
  const response = await api.post(`/outbound-calls/campaigns/${campaignId}/resume`);
  return response.data.data;
};

/**
 * Get campaign contacts
 */
export const getCampaignContacts = async (campaignId: string): Promise<OutboundContact[]> => {
  const response = await api.get(`/outbound-calls/campaigns/${campaignId}/contacts`);
  return response.data.data;
};

/**
 * Make a single AI call to a phone number
 */
export const makeAICall = async (data: {
  agentId: string;
  phone: string;
  leadId?: string;
  customData?: Record<string, any>;
}): Promise<{ callId: string; status: string; provider: string }> => {
  const response = await api.post('/outbound-calls/call', data);
  return response.data.data;
};

export default {
  // Calls
  makeCall,
  connectCall,
  getCallDetails,
  getAccountBalance,
  getStatus,
  // SMS
  sendSms,
  sendBulkSms,
  getSmsConfig,
  // Campaigns
  createCampaign,
  getCampaigns,
  getCampaign,
  startCampaign,
  pauseCampaign,
  resumeCampaign,
  getCampaignContacts,
  makeAICall,
};
