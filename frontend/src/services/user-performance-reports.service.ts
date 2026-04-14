/**
 * User Performance Reports Service
 * Frontend API calls for staff performance tracking
 */

import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  branchId?: string;
  roleId?: string;
}

export interface UserPerformanceSummary {
  userId: string;
  userName: string;
  email: string;
  role: string;
  branch: string | null;
  leadsHandled: number;
  leadsAssigned: number;
  callsMade: number;
  callsConnected: number;
  followUpsCompleted: number;
  followUpsPending: number;
  conversions: number;
  conversionRate: string;
  closureValue: number;
  avgResponseTime: number;
  lastActivity: string | null;
}

export interface LeadsPerUser {
  userId: string;
  userName: string;
  totalAssigned: number;
  newLeads: number;
  contacted: number;
  qualified: number;
  converted: number;
  lost: number;
}

export interface CallsPerUser {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  avgDuration: number;
  totalDuration: number;
  callbacksScheduled: number;
}

export interface FollowUpsPerUser {
  userId: string;
  userName: string;
  totalScheduled: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: string;
}

export interface ConversionPerUser {
  userId: string;
  userName: string;
  leadsAssigned: number;
  conversions: number;
  conversionRate: string;
  avgConversionTime: number;
  closureValue: number;
}

export interface ActivityLog {
  userId: string;
  userName: string;
  date: string;
  loginTime: string | null;
  logoutTime: string | null;
  activeHours: number;
  leadsWorked: number;
  callsMade: number;
  followUpsCompleted: number;
}

export interface LoginReport {
  userId: string;
  userName: string;
  totalLogins: number;
  lastLogin: string | null;
  avgSessionDuration: number;
  loginDays: number;
  ipAddresses: string[];
}

export interface ComprehensiveUserPerformanceReport {
  summary: UserPerformanceSummary[];
  leadsPerUser: LeadsPerUser[];
  callsPerUser: CallsPerUser[];
  followUpsPerUser: FollowUpsPerUser[];
  conversionPerUser: ConversionPerUser[];
}

// Extended User Report data for comprehensive user report page
export interface UserReportData {
  userId: string;
  username: string;
  reportingManager: string;
  mobileNumber: string;
  date: string;
  // Calls
  totalCalls: number;
  totalCallsConnected: number;
  totalUnconnectedCalls: number;
  // Outgoing
  totalOutgoingCalls: number;
  outgoingConnectedCalls: number;
  outgoingUnansweredCalls: number;
  avgOutgoingCallDuration: number;
  // Incoming
  totalIncomingCalls: number;
  incomingConnectedCalls: number;
  incomingUnansweredCalls: number;
  avgIncomingCallDuration: number;
  // Disposition
  totalDisposedCount: number;
  disposedYesConnectedCount: number;
  disposedNotConnectedCount: number;
  // Leads
  totalInprogressLeads: number;
  totalConvertedLeads: number;
  totalLostLeads: number;
  // Follow-ups
  followUpDueToday: number;
  // Call metrics
  avgStartCallingTime: string;
  avgCallDuration: number;
  avgFormFillingTime: number;
  totalCallDuration: number;
  // Breaks
  totalBreaks: number;
  totalBreakDuration: number;
  // Messaging
  totalWhatsappSent: number;
  totalEmailsSent: number;
  totalSmsSent: number;
}

class UserPerformanceReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.roleId) params.append('roleId', filters.roleId);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<UserPerformanceSummary[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getLeadsPerUser(filters: ReportFilters = {}): Promise<LeadsPerUser[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/leads-per-user?${query}`);
    return response.data.data.leadsPerUser;
  }

  async getCallsPerUser(filters: ReportFilters = {}): Promise<CallsPerUser[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/calls-per-user?${query}`);
    return response.data.data.callsPerUser;
  }

  async getFollowUpsPerUser(filters: ReportFilters = {}): Promise<FollowUpsPerUser[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/followups-per-user?${query}`);
    return response.data.data.followUpsPerUser;
  }

  async getConversionPerUser(filters: ReportFilters = {}): Promise<ConversionPerUser[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/conversion-per-user?${query}`);
    return response.data.data.conversionPerUser;
  }

  async getActivityLog(filters: ReportFilters = {}): Promise<ActivityLog[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/activity-log?${query}`);
    return response.data.data.activityLog;
  }

  async getLoginReport(filters: ReportFilters = {}): Promise<LoginReport[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/login-report?${query}`);
    return response.data.data.loginReport;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensiveUserPerformanceReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/comprehensive?${query}`, {
      timeout: 15000, // 15 second timeout for comprehensive report
    });
    return response.data.data.report;
  }

  async getUserReport(filters: ReportFilters = {}): Promise<UserReportData[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/user-performance-reports/user-report?${query}`, {
      timeout: 15000,
    });
    return response.data.data.users;
  }
}

export const userPerformanceReportsService = new UserPerformanceReportsService();
