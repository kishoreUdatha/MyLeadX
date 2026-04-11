import api from './api';

export interface RetrySettings {
  organizationId?: string;
  callRetryEnabled: boolean;
  callMaxAttempts: number;
  callRetryInterval: number;
  callRetryStartTime: string;
  callRetryEndTime: string;
  callRetryDays: string[];
  whatsappRetryEnabled: boolean;
  whatsappMaxAttempts: number;
  whatsappRetryInterval: number;
  whatsappRetryStartTime: string;
  whatsappRetryEndTime: string;
  smsRetryEnabled: boolean;
  smsMaxAttempts: number;
  smsRetryInterval: number;
  smsRetryStartTime: string;
  smsRetryEndTime: string;
  emailRetryEnabled: boolean;
  emailMaxAttempts: number;
  emailRetryInterval: number;
  skipWeekends: boolean;
  skipHolidays: boolean;
  respectDND: boolean;
  maxTotalAttempts: number;
}

export interface ChannelRetrySettings {
  enabled: boolean;
  maxAttempts: number;
  retryInterval: number;
  startTime?: string;
  endTime?: string;
  retryDays?: string[];
}

// Get retry settings
export const getRetrySettings = async (): Promise<RetrySettings> => {
  const response = await api.get('/settings/retry');
  return response.data.data;
};

// Update retry settings
export const updateRetrySettings = async (data: Partial<RetrySettings>): Promise<RetrySettings> => {
  const response = await api.put('/settings/retry', data);
  return response.data.data;
};

// Get channel-specific retry settings
export const getChannelRetrySettings = async (
  channel: 'call' | 'whatsapp' | 'sms' | 'email'
): Promise<ChannelRetrySettings> => {
  const response = await api.get(`/settings/retry/${channel}`);
  return response.data.data;
};

// Update channel-specific retry settings
export const updateChannelRetrySettings = async (
  channel: 'call' | 'whatsapp' | 'sms' | 'email',
  data: Partial<ChannelRetrySettings>
): Promise<RetrySettings> => {
  const response = await api.put(`/settings/retry/${channel}`, data);
  return response.data.data;
};

// Reset retry settings to defaults
export const resetRetrySettings = async (): Promise<RetrySettings> => {
  const response = await api.post('/settings/retry/reset');
  return response.data.data;
};

// Check if retry is allowed
export const checkRetryAllowed = async (
  channel: 'call' | 'whatsapp' | 'sms' | 'email',
  currentAttempts: number,
  totalAttempts: number
): Promise<{ allowed: boolean }> => {
  const response = await api.post('/settings/retry/check', {
    channel,
    currentAttempts,
    totalAttempts,
  });
  return response.data.data;
};

export const retrySettingsService = {
  getRetrySettings,
  updateRetrySettings,
  getChannelRetrySettings,
  updateChannelRetrySettings,
  resetRetrySettings,
  checkRetryAllowed,
};
