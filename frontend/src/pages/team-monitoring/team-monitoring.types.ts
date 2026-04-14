/**
 * Team Monitoring Types
 */

export interface TeamOverview {
  totalCalls: number;
  answeredCalls: number;
  avgResponseTime: number;
  conversionRate: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  totalLeads: number;
  convertedLeads: number;
  totalTeamMembers: number;
  activeTeamMembers: number;
}

export interface TelecallerMetrics {
  userId: string;
  name: string;
  avatar?: string;
  role: string;
  branchName?: string;
  totalCalls: number;
  answeredCalls: number;
  avgCallDuration: number;
  conversions: number;
  conversionRate: number;
  avgResponseTime: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
  callOutcomes: Record<string, number>;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface ManagerMetrics {
  managerId: string;
  name: string;
  avatar?: string;
  role: string;
  branchName?: string;
  teamSize: number;
  teamMembers: TelecallerMetrics[];
  aggregateStats: {
    totalCalls: number;
    answeredCalls: number;
    conversions: number;
    pendingFollowUps: number;
    overdueFollowUps: number;
    conversionRate: number;
  };
}

export interface LeadAgingBucket {
  bucket: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  percentage: number;
}

export interface CallOutcomeData {
  outcome: string;
  count: number;
  percentage: number;
  color: string;
}

export interface ConversionTrendData {
  date: string;
  conversions: number;
  totalCalls: number;
  conversionRate: number;
}

export interface ResponseTimeMetrics {
  avgResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  slaBreachCount: number;
  slaBreachPercentage: number;
  byHour: Array<{ hour: number; avgResponseTime: number; count: number }>;
}

export interface FollowUpItem {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  scheduledAt: string;
  status: 'UPCOMING' | 'OVERDUE';
  message?: string;
}

export interface FollowUpsByAssignee {
  assigneeId: string;
  assigneeName: string;
  upcoming: number;
  overdue: number;
  followUps: FollowUpItem[];
}

export interface PendingFollowUpsData {
  totalPending: number;
  totalOverdue: number;
  totalUpcoming: number;
  byAssignee: FollowUpsByAssignee[];
}

export interface TeamMonitoringFilters {
  dateRange: 'today' | '7days' | '30days' | 'custom';
  dateFrom?: Date;
  dateTo?: Date;
  branchId?: string;
  managerId?: string;
}

export type ExportType = 'telecallers' | 'outcomes' | 'lead-aging' | 'follow-ups';
