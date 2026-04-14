/**
 * Audit & Activity Reports Service
 * Frontend API calls for audit logs and security tracking
 */

import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
  action?: string;
  entityType?: string;
}

export interface AuditSummary {
  totalActions: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
  actionsByDay: { date: string; count: number }[];
}

export interface LeadEditLog {
  id: string;
  leadId: string;
  leadName: string;
  editedBy: string;
  editedById: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  editedAt: string;
}

export interface PaymentDeleteLog {
  id: string;
  paymentId: string;
  amount: number;
  deletedBy: string;
  deletedById: string;
  reason: string | null;
  deletedAt: string;
}

export interface DataExportLog {
  id: string;
  exportedBy: string;
  exportedById: string;
  exportType: string;
  recordCount: number;
  fileName: string | null;
  exportedAt: string;
  ipAddress: string | null;
}

export interface StageChangeLog {
  id: string;
  leadId: string;
  leadName: string;
  changedBy: string;
  changedById: string;
  fromStage: string;
  toStage: string;
  changedAt: string;
}

export interface LoginHistory {
  id: string;
  userId: string;
  userName: string;
  email: string;
  loginTime: string;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  status: 'SUCCESS' | 'FAILED';
}

export interface FailedLoginAttempt {
  email: string;
  attemptCount: number;
  lastAttempt: string;
  ipAddresses: string[];
  blocked: boolean;
}

export interface SecurityAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  userId?: string;
  userName?: string;
  timestamp: string;
  details: Record<string, any>;
}

export interface ActivityByEntity {
  entityType: string;
  created: number;
  updated: number;
  deleted: number;
  total: number;
}

export interface ComprehensiveAuditReport {
  summary: AuditSummary;
  leadEdits: LeadEditLog[];
  paymentDeletes: PaymentDeleteLog[];
  dataExports: DataExportLog[];
  stageChanges: StageChangeLog[];
  loginHistory: LoginHistory[];
  failedLogins: FailedLoginAttempt[];
  securityAlerts: SecurityAlert[];
  activityByEntity: ActivityByEntity[];
}

class AuditReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);
    if (filters.action) params.append('action', filters.action);
    if (filters.entityType) params.append('entityType', filters.entityType);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<AuditSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getLeadEdits(filters: ReportFilters = {}, limit = 100): Promise<LeadEditLog[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/lead-edits?${query}&limit=${limit}`);
    return response.data.data.leadEdits;
  }

  async getPaymentDeletes(filters: ReportFilters = {}, limit = 100): Promise<PaymentDeleteLog[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/payment-deletes?${query}&limit=${limit}`);
    return response.data.data.paymentDeletes;
  }

  async getDataExports(filters: ReportFilters = {}, limit = 100): Promise<DataExportLog[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/data-exports?${query}&limit=${limit}`);
    return response.data.data.dataExports;
  }

  async getStageChanges(filters: ReportFilters = {}, limit = 100): Promise<StageChangeLog[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/stage-changes?${query}&limit=${limit}`);
    return response.data.data.stageChanges;
  }

  async getLoginHistory(filters: ReportFilters = {}, limit = 100): Promise<LoginHistory[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/login-history?${query}&limit=${limit}`);
    return response.data.data.loginHistory;
  }

  async getFailedLogins(filters: ReportFilters = {}): Promise<FailedLoginAttempt[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/failed-logins?${query}`);
    return response.data.data.failedLogins;
  }

  async getSecurityAlerts(filters: ReportFilters = {}): Promise<SecurityAlert[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/security-alerts?${query}`);
    return response.data.data.securityAlerts;
  }

  async getActivityByEntity(filters: ReportFilters = {}): Promise<ActivityByEntity[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/activity-by-entity?${query}`);
    return response.data.data.activityByEntity;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensiveAuditReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/audit-reports/comprehensive?${query}`);
    return response.data.data.report;
  }
}

export const auditReportsService = new AuditReportsService();
