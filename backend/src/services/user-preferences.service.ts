import prisma from '../config/database';

// Default user preferences
const DEFAULT_PREFERENCES = {
  // Display Settings
  theme: 'light',
  language: 'en',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
  currency: 'INR',

  // Accessibility
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  screenReader: false,
  lineSpacing: 'normal',
  keyboardShortcuts: true,

  // UI Preferences
  sidebarCollapsed: false,
  compactMode: false,
  showWelcome: true,
  defaultView: 'grid',
  itemsPerPage: 25,

  // Sound & Notifications
  soundEnabled: true,
  vibrationEnabled: true,
  desktopNotifications: true,
};

// ==================== USER PREFERENCES ====================

// Get user preferences
export const getUserPreferences = async (userId: string) => {
  let preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  // Return defaults merged with existing preferences
  if (!preferences) {
    return { ...DEFAULT_PREFERENCES, userId };
  }

  return preferences;
};

// Update user preferences
export const updateUserPreferences = async (
  userId: string,
  data: Partial<{
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
  }>
) => {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULT_PREFERENCES,
      ...data,
    },
    update: data,
  });
};

// Reset user preferences to defaults
export const resetUserPreferences = async (userId: string) => {
  return prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULT_PREFERENCES,
    },
    update: DEFAULT_PREFERENCES,
  });
};

// ==================== ACCESSIBILITY SETTINGS ====================

// Get accessibility settings only
export const getAccessibilitySettings = async (userId: string) => {
  const preferences = await getUserPreferences(userId);
  return {
    fontSize: preferences.fontSize,
    highContrast: preferences.highContrast,
    reducedMotion: preferences.reducedMotion,
    screenReader: preferences.screenReader,
    lineSpacing: preferences.lineSpacing,
    keyboardShortcuts: preferences.keyboardShortcuts,
  };
};

// Update accessibility settings
export const updateAccessibilitySettings = async (
  userId: string,
  data: {
    fontSize?: string;
    highContrast?: boolean;
    reducedMotion?: boolean;
    screenReader?: boolean;
    lineSpacing?: string;
    keyboardShortcuts?: boolean;
  }
) => {
  return updateUserPreferences(userId, data);
};

// ==================== DISPLAY SETTINGS ====================

// Get display settings only
export const getDisplaySettings = async (userId: string) => {
  const preferences = await getUserPreferences(userId);
  return {
    theme: preferences.theme,
    language: preferences.language,
    timezone: preferences.timezone,
    dateFormat: preferences.dateFormat,
    timeFormat: preferences.timeFormat,
    currency: preferences.currency,
  };
};

// Update display settings
export const updateDisplaySettings = async (
  userId: string,
  data: {
    theme?: string;
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: string;
    currency?: string;
  }
) => {
  return updateUserPreferences(userId, data);
};

export const userPreferencesService = {
  getUserPreferences,
  updateUserPreferences,
  resetUserPreferences,
  getAccessibilitySettings,
  updateAccessibilitySettings,
  getDisplaySettings,
  updateDisplaySettings,
  DEFAULT_PREFERENCES,
};
