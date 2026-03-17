/**
 * Analytics Dashboard Constants
 */

import { DashboardSummary, UsageTrendData } from './analytics-dashboard.types';

export const GRADIENT_COLORS = {
  primary: ['#6366F1', '#4F46E5'],
  success: ['#10B981', '#059669'],
  warning: ['#F59E0B', '#D97706'],
  danger: ['#EF4444', '#DC2626'],
  purple: ['#8B5CF6', '#7C3AED'],
  pink: ['#EC4899', '#DB2777'],
  cyan: ['#06B6D4', '#0891B2'],
  orange: ['#F97316', '#EA580C'],
};

export const PIE_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

export const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

// Mock data for development/fallback
export const getMockData = (): DashboardSummary => ({
  period: '30 days',
  apiUsage: {
    totalRequests: 12847,
    successfulRequests: 12456,
    failedRequests: 391,
    successRate: '96.9',
    byEndpoint: { '/leads': 4521, '/users': 2341, '/forms': 1892, '/campaigns': 1456 },
    byMethod: { GET: 8234, POST: 3456, PUT: 892, DELETE: 265 },
  },
  leads: {
    totalLeads: 1247,
    newLeads: 342,
    convertedLeads: 156,
    conversionRate: '12.5',
    bySource: { MANUAL: 234, FORM: 456, WEBSITE: 189, BULK_UPLOAD: 234, REFERRAL: 134 },
    byStage: { NEW: 342, CONTACTED: 289, QUALIFIED: 234, NEGOTIATION: 178, WON: 156, LOST: 48 },
  },
  messaging: {
    sms: { sent: 2341, delivered: 2156, failed: 185, deliveryRate: '92.1' },
    email: { sent: 4567, delivered: 4234, failed: 333, deliveryRate: '92.7' },
    whatsapp: { sent: 1892, delivered: 1756, failed: 136, deliveryRate: '92.8' },
    total: { sent: 8800, delivered: 8146, failed: 654 },
  },
  contactLists: {
    totalLists: 12,
    activeLists: 8,
    totalContacts: 15678,
    activeContacts: 12456,
    unsubscribed: 2341,
    bounced: 881,
    healthScore: 79,
  },
  conversations: {
    totalConversations: 3456,
    openConversations: 234,
    closedConversations: 3222,
    avgMessagesPerConversation: '8.4',
    byChannel: { SMS: 1234, WhatsApp: 1567, Email: 456, Voice: 199 },
  },
});

export const getMockTrendData = (): UsageTrendData[] => {
  const data: UsageTrendData[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const baseTotal = 300 + Math.sin(i * 0.3) * 100;
    data.push({
      date: date.toISOString().split('T')[0],
      total: Math.floor(baseTotal + Math.random() * 100),
      api: Math.floor(baseTotal * 0.6 + Math.random() * 60),
      user: Math.floor(baseTotal * 0.4 + Math.random() * 40),
    });
  }
  return data;
};
