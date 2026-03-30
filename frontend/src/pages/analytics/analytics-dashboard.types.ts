/**
 * Analytics Dashboard Types
 */

export interface DashboardSummary {
  period: string;
  apiUsage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: string;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
  };
  leads: {
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    conversionRate: string;
    bySource: Record<string, number>;
    byStage: Record<string, number>;
  };
  messaging: {
    sms: { sent: number; delivered: number; failed: number; deliveryRate: string };
    email: { sent: number; delivered: number; failed: number; deliveryRate: string };
    whatsapp: { sent: number; delivered: number; failed: number; deliveryRate: string };
    total: { sent: number; delivered: number; failed: number };
  };
  contactLists: {
    totalLists: number;
    activeLists: number;
    totalContacts: number;
    activeContacts: number;
    unsubscribed: number;
    bounced: number;
    healthScore: number;
  };
  conversations: {
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    avgMessagesPerConversation: string;
    byChannel: Record<string, number>;
  };
}

export interface UsageTrendData {
  date: string;
  total: number;
  api: number;
  user: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export interface MessagingDataItem {
  name: string;
  sent: number;
  delivered: number;
  failed: number;
  rate: string;
}

export interface ApiMethodDataItem {
  name: string;
  requests: number;
}

export type ActiveTab = 'overview' | 'messaging' | 'api';
