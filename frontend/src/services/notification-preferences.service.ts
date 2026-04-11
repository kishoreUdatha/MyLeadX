import api from './api';

export interface CategoryChannels {
  email: boolean;
  push: boolean;
  inApp: boolean;
  sms: boolean;
}

export interface NotificationCategory {
  id: string;
  name: string;
  description: string;
}

export interface NotificationPreferences {
  userId?: string;
  emailEnabled: boolean;
  pushEnabled: boolean;
  smsEnabled: boolean;
  inAppEnabled: boolean;
  categoryPreferences: Record<string, CategoryChannels>;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly';
  digestTime: string;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  showPreview: boolean;
  timezone?: string;
}

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface DigestSettings {
  enabled: boolean;
  frequency: 'daily' | 'weekly';
  time: string;
}

// Get notification preferences
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.get('/settings/notifications');
  return response.data.data;
};

// Update notification preferences
export const updateNotificationPreferences = async (
  data: Partial<NotificationPreferences>
): Promise<NotificationPreferences> => {
  const response = await api.put('/settings/notifications', data);
  return response.data.data;
};

// Reset to defaults
export const resetNotificationPreferences = async (): Promise<NotificationPreferences> => {
  const response = await api.post('/settings/notifications/reset');
  return response.data.data;
};

// Get available notification categories
export const getNotificationCategories = async (): Promise<NotificationCategory[]> => {
  const response = await api.get('/settings/notifications/categories');
  return response.data.data;
};

// ==================== CHANNEL PREFERENCES ====================

// Get channel preferences
export const getChannelPreferences = async (): Promise<Record<string, boolean>> => {
  const response = await api.get('/settings/notifications/channels');
  return response.data.data;
};

// Update channel preference
export const updateChannelPreference = async (
  channel: 'email' | 'push' | 'sms' | 'inApp',
  enabled: boolean
): Promise<NotificationPreferences> => {
  const response = await api.put(`/settings/notifications/channels/${channel}`, { enabled });
  return response.data.data;
};

// ==================== CATEGORY PREFERENCES ====================

// Get category preferences
export const getCategoryPreferences = async (): Promise<Record<string, CategoryChannels>> => {
  const response = await api.get('/settings/notifications/categories/preferences');
  return response.data.data;
};

// Update category preference
export const updateCategoryPreference = async (
  categoryId: string,
  channels: Partial<CategoryChannels>
): Promise<NotificationPreferences> => {
  const response = await api.put(`/settings/notifications/categories/${categoryId}`, channels);
  return response.data.data;
};

// Bulk update category preferences
export const bulkUpdateCategoryPreferences = async (
  categories: Record<string, CategoryChannels>
): Promise<NotificationPreferences> => {
  const response = await api.put('/settings/notifications/categories/bulk', { categories });
  return response.data.data;
};

// ==================== QUIET HOURS ====================

// Get quiet hours settings
export const getQuietHours = async (): Promise<QuietHours> => {
  const response = await api.get('/settings/notifications/quiet-hours');
  return response.data.data;
};

// Update quiet hours
export const updateQuietHours = async (data: Partial<QuietHours>): Promise<NotificationPreferences> => {
  const response = await api.put('/settings/notifications/quiet-hours', data);
  return response.data.data;
};

// ==================== DIGEST SETTINGS ====================

// Get digest settings
export const getDigestSettings = async (): Promise<DigestSettings> => {
  const response = await api.get('/settings/notifications/digest');
  return response.data.data;
};

// Update digest settings
export const updateDigestSettings = async (data: Partial<DigestSettings>): Promise<NotificationPreferences> => {
  const response = await api.put('/settings/notifications/digest', data);
  return response.data.data;
};

export const notificationPreferencesService = {
  getNotificationPreferences,
  updateNotificationPreferences,
  resetNotificationPreferences,
  getNotificationCategories,
  getChannelPreferences,
  updateChannelPreference,
  getCategoryPreferences,
  updateCategoryPreference,
  bulkUpdateCategoryPreferences,
  getQuietHours,
  updateQuietHours,
  getDigestSettings,
  updateDigestSettings,
};
