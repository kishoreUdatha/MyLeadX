import prisma from '../config/database';

// Default notification preferences
const DEFAULT_PREFERENCES = {
  // Channel preferences
  emailEnabled: true,
  pushEnabled: true,
  smsEnabled: false,
  inAppEnabled: true,

  // Category preferences (JSON object)
  categoryPreferences: {
    newLead: { email: true, push: true, inApp: true, sms: false },
    leadAssigned: { email: true, push: true, inApp: true, sms: false },
    followUpDue: { email: true, push: true, inApp: true, sms: false },
    taskAssigned: { email: true, push: true, inApp: true, sms: false },
    taskDue: { email: true, push: true, inApp: true, sms: false },
    paymentReceived: { email: true, push: true, inApp: true, sms: false },
    campaignComplete: { email: true, push: false, inApp: true, sms: false },
    systemAlert: { email: true, push: true, inApp: true, sms: false },
    teamUpdate: { email: false, push: false, inApp: true, sms: false },
    reportReady: { email: true, push: false, inApp: true, sms: false },
  },

  // Quiet hours
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',

  // Digest settings
  digestEnabled: false,
  digestFrequency: 'daily', // daily, weekly
  digestTime: '09:00',

  // Additional settings
  soundEnabled: true,
  vibrationEnabled: true,
  showPreview: true,
};

// Notification categories
const NOTIFICATION_CATEGORIES = [
  { id: 'newLead', name: 'New Lead', description: 'When a new lead is created or imported' },
  { id: 'leadAssigned', name: 'Lead Assigned', description: 'When a lead is assigned to you' },
  { id: 'followUpDue', name: 'Follow-up Due', description: 'When a follow-up is due or overdue' },
  { id: 'taskAssigned', name: 'Task Assigned', description: 'When a task is assigned to you' },
  { id: 'taskDue', name: 'Task Due', description: 'When a task is approaching deadline' },
  { id: 'paymentReceived', name: 'Payment Received', description: 'When a payment is recorded' },
  { id: 'campaignComplete', name: 'Campaign Complete', description: 'When a campaign finishes' },
  { id: 'systemAlert', name: 'System Alert', description: 'Important system notifications' },
  { id: 'teamUpdate', name: 'Team Update', description: 'Team activity and updates' },
  { id: 'reportReady', name: 'Report Ready', description: 'When scheduled reports are ready' },
];

// ==================== NOTIFICATION PREFERENCES ====================

// Get notification preferences for user
export const getNotificationPreferences = async (userId: string) => {
  let preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    return { ...DEFAULT_PREFERENCES, userId };
  }

  return {
    ...preferences,
    categoryPreferences: preferences.categoryPreferences as Record<string, any>,
  };
};

// Update notification preferences
export const updateNotificationPreferences = async (
  userId: string,
  data: Partial<{
    emailEnabled: boolean;
    pushEnabled: boolean;
    smsEnabled: boolean;
    inAppEnabled: boolean;
    categoryPreferences: Record<string, { email: boolean; push: boolean; inApp: boolean; sms: boolean }>;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
    digestEnabled: boolean;
    digestFrequency: string;
    digestTime: string;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    showPreview: boolean;
    timezone: string;
  }>
) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULT_PREFERENCES,
      ...data,
    },
    update: data,
  });
};

// ==================== CHANNEL PREFERENCES ====================

// Get channel preferences
export const getChannelPreferences = async (userId: string) => {
  const preferences = await getNotificationPreferences(userId);
  return {
    email: preferences.emailEnabled,
    push: preferences.pushEnabled,
    sms: preferences.smsEnabled,
    inApp: preferences.inAppEnabled,
  };
};

// Update channel preference
export const updateChannelPreference = async (
  userId: string,
  channel: 'email' | 'push' | 'sms' | 'inApp',
  enabled: boolean
) => {
  const fieldMap = {
    email: 'emailEnabled',
    push: 'pushEnabled',
    sms: 'smsEnabled',
    inApp: 'inAppEnabled',
  };

  return updateNotificationPreferences(userId, { [fieldMap[channel]]: enabled });
};

// ==================== CATEGORY PREFERENCES ====================

// Get category preferences
export const getCategoryPreferences = async (userId: string) => {
  const preferences = await getNotificationPreferences(userId);
  return preferences.categoryPreferences;
};

// Update category preference
export const updateCategoryPreference = async (
  userId: string,
  categoryId: string,
  channels: { email?: boolean; push?: boolean; inApp?: boolean; sms?: boolean }
) => {
  const preferences = await getNotificationPreferences(userId);
  const categoryPreferences = preferences.categoryPreferences as Record<string, any>;

  const updatedCategory = {
    ...(categoryPreferences[categoryId] || { email: true, push: true, inApp: true, sms: false }),
    ...channels,
  };

  return updateNotificationPreferences(userId, {
    categoryPreferences: {
      ...categoryPreferences,
      [categoryId]: updatedCategory,
    },
  });
};

// Bulk update category preferences
export const bulkUpdateCategoryPreferences = async (
  userId: string,
  categories: Record<string, { email: boolean; push: boolean; inApp: boolean; sms: boolean }>
) => {
  const preferences = await getNotificationPreferences(userId);
  const categoryPreferences = preferences.categoryPreferences as Record<string, any>;

  return updateNotificationPreferences(userId, {
    categoryPreferences: {
      ...categoryPreferences,
      ...categories,
    },
  });
};

// ==================== QUIET HOURS ====================

// Get quiet hours settings
export const getQuietHours = async (userId: string) => {
  const preferences = await getNotificationPreferences(userId);
  return {
    enabled: preferences.quietHoursEnabled,
    start: preferences.quietHoursStart,
    end: preferences.quietHoursEnd,
  };
};

// Update quiet hours
export const updateQuietHours = async (
  userId: string,
  data: {
    enabled?: boolean;
    start?: string;
    end?: string;
  }
) => {
  return updateNotificationPreferences(userId, {
    ...(data.enabled !== undefined && { quietHoursEnabled: data.enabled }),
    ...(data.start && { quietHoursStart: data.start }),
    ...(data.end && { quietHoursEnd: data.end }),
  });
};

// Check if currently in quiet hours
export const isInQuietHours = async (userId: string): Promise<boolean> => {
  const preferences = await getNotificationPreferences(userId);

  if (!preferences.quietHoursEnabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

  const start = preferences.quietHoursStart;
  const end = preferences.quietHoursEnd;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
};

// ==================== DIGEST SETTINGS ====================

// Get digest settings
export const getDigestSettings = async (userId: string) => {
  const preferences = await getNotificationPreferences(userId);
  return {
    enabled: preferences.digestEnabled,
    frequency: preferences.digestFrequency,
    time: preferences.digestTime,
  };
};

// Update digest settings
export const updateDigestSettings = async (
  userId: string,
  data: {
    enabled?: boolean;
    frequency?: string;
    time?: string;
  }
) => {
  return updateNotificationPreferences(userId, {
    ...(data.enabled !== undefined && { digestEnabled: data.enabled }),
    ...(data.frequency && { digestFrequency: data.frequency }),
    ...(data.time && { digestTime: data.time }),
  });
};

// ==================== NOTIFICATION DELIVERY CHECK ====================

// Check if notification should be delivered
export const shouldDeliverNotification = async (
  userId: string,
  categoryId: string,
  channel: 'email' | 'push' | 'inApp' | 'sms'
): Promise<boolean> => {
  const preferences = await getNotificationPreferences(userId);

  // Check if channel is enabled globally
  const channelMap = {
    email: preferences.emailEnabled,
    push: preferences.pushEnabled,
    inApp: preferences.inAppEnabled,
    sms: preferences.smsEnabled,
  };

  if (!channelMap[channel]) return false;

  // Check if in quiet hours (except for in-app which always shows)
  if (channel !== 'inApp') {
    const inQuietHours = await isInQuietHours(userId);
    if (inQuietHours) return false;
  }

  // Check category-specific preference
  const categoryPrefs = preferences.categoryPreferences as Record<string, any>;
  const categoryPref = categoryPrefs[categoryId];

  if (!categoryPref) return true; // Default to enabled if not configured

  return categoryPref[channel] ?? true;
};

// Reset notification preferences to defaults
export const resetNotificationPreferences = async (userId: string) => {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...DEFAULT_PREFERENCES,
    },
    update: DEFAULT_PREFERENCES,
  });
};

// Get available notification categories
export const getNotificationCategories = () => {
  return NOTIFICATION_CATEGORIES;
};

export const notificationPreferencesService = {
  getNotificationPreferences,
  updateNotificationPreferences,
  getChannelPreferences,
  updateChannelPreference,
  getCategoryPreferences,
  updateCategoryPreference,
  bulkUpdateCategoryPreferences,
  getQuietHours,
  updateQuietHours,
  isInQuietHours,
  getDigestSettings,
  updateDigestSettings,
  shouldDeliverNotification,
  resetNotificationPreferences,
  getNotificationCategories,
  DEFAULT_PREFERENCES,
  NOTIFICATION_CATEGORIES,
};
