/**
 * Lead Reports Service
 * Frontend API calls for lead reporting
 */

import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  branchId?: string;
  sourceId?: string;
  stageId?: string;
  assignedToId?: string;
}

export interface UserStageRow {
  no: number;
  userId: string;
  username: string;
  totalAssignedLeads: number;
  stageBreakdown: Record<string, number>;
  converted: number;
  lost: number;
  inProgress: number;
}

export interface UserStageReportData {
  users: UserStageRow[];
  summary: {
    totalLeads: number;
    totalConverted: number;
    totalInProgress: number;
    totalLost: number;
  };
  stages: { id: string; name: string; slug: string }[];
}

export interface LeadSummary {
  totalLeads: number;
  newLeads: number;
  convertedLeads: number;
  lostLeads: number;
  conversionRate: string;
  avgLeadAge: number;
}

export interface LeadsBySource {
  source: string;
  sourceId: string | null;
  count: number;
  converted: number;
  conversionRate: string;
}

export interface LeadsByStage {
  stageId: string;
  stageName: string;
  stageColor: string;
  count: number;
  percentage: string;
}

export interface LeadsByCounselor {
  userId: string;
  userName: string;
  email: string;
  totalAssigned: number;
  converted: number;
  pending: number;
  conversionRate: string;
  avgResponseTime: number | null;
}

class LeadReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.stageId) params.append('stageId', filters.stageId);
    if (filters.assignedToId) params.append('assignedToId', filters.assignedToId);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<LeadSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/lead-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getBySource(filters: ReportFilters = {}): Promise<LeadsBySource[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/lead-reports/by-source?${query}`);
    return response.data.data.bySource;
  }

  async getByStage(filters: ReportFilters = {}): Promise<LeadsByStage[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/lead-reports/by-stage?${query}`);
    return response.data.data.byStage;
  }

  async getByCounselor(filters: ReportFilters = {}): Promise<LeadsByCounselor[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/lead-reports/by-counselor?${query}`);
    return response.data.data.byCounselor;
  }

  async getUserStageReport(filters: ReportFilters = {}): Promise<UserStageReportData> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/lead-reports/by-user-stage?${query}`);
    return response.data.data;
  }
}

export const leadReportsService = new LeadReportsService();
