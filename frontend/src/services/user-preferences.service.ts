import api from './api';

export interface UserPreferences {
  userId?: string;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  fontSize: string;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  lineSpacing: string;
  keyboardShortcuts: boolean;
  sidebarCollapsed: boolean;
  compactMode: boolean;
  showWelcome: boolean;
  defaultView: string;
  itemsPerPage: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  desktopNotifications: boolean;
}

export interface AccessibilitySettings {
  fontSize: string;
  highContrast: boolean;
  reducedMotion: boolean;
  screenReader: boolean;
  lineSpacing: string;
  keyboardShortcuts: boolean;
}

export interface DisplaySettings {
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
}

// Get user preferences
export const getUserPreferences = async (): Promise<UserPreferences> => {
  const response = await api.get('/settings/preferences');
  return response.data.data;
};

// Update user preferences
export const updateUserPreferences = async (data: Partial<UserPreferences>): Promise<UserPreferences> => {
  const response = await api.put('/settings/preferences', data);
  return response.data.data;
};

// Reset user preferences to defaults
export const resetUserPreferences = async (): Promise<UserPreferences> => {
  const response = await api.post('/settings/preferences/reset');
  return response.data.data;
};

// Get accessibility settings
export const getAccessibilitySettings = async (): Promise<AccessibilitySettings> => {
  const response = await api.get('/settings/accessibility');
  return response.data.data;
};

// Update accessibility settings
export const updateAccessibilitySettings = async (data: Partial<AccessibilitySettings>): Promise<AccessibilitySettings> => {
  const response = await api.put('/settings/accessibility', data);
  return response.data.data;
};

// Get display settings
export const getDisplaySettings = async (): Promise<DisplaySettings> => {
  const response = await api.get('/settings/display');
  return response.data.data;
};

// Update display settings
export const updateDisplaySettings = async (data: Partial<DisplaySettings>): Promise<DisplaySettings> => {
  const response = await api.put('/settings/display', data);
  return response.data.data;
};

export const userPreferencesService = {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  getAccessibilitySettings,
  updateAccessibilitySettings,
  getDisplaySettings,
  updateDisplaySettings,
};
