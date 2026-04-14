/**
 * Call Reports Service
 * Frontend API calls for call reporting
 */

import api from './api';

export interface CallReportFilters {
  startDate?: string;
  endDate?: string;
  agentId?: string;
  campaignId?: string;
}

export interface LeadDispositionSummary {
  totalCalls: number;
  connected: number;
  notConnected: number;
  connectionRate: string;
}

export interface LeadDispositionRow {
  user: string;
  userId: string;
  totalCalls: number;
  connected: number;
  notConnected: number;
  interested: number;
  notInterested: number;
  callback: number;
  converted: number;
  noAnswer: number;
  busy: number;
  wrongNumber: number;
}

export interface LeadDispositionData {
  summary: LeadDispositionSummary;
  dispositions: LeadDispositionRow[];
}

export interface CallSummary {
  totalCalls: number;
  outboundCalls: number;
  inboundCalls: number;
  connectedCalls: number;
  missedCalls: number;
  failedCalls: number;
  totalDuration: number;
  avgDuration: number;
  connectionRate: string;
}

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentType: 'human' | 'ai';
  totalCalls: number;
  connectedCalls: number;
  interested: number;
  converted: number;
  totalDuration: number;
  avgDuration: number;
  conversionRate: string;
  connectionRate: string;
}

class CallReportsService {
  private buildQueryString(filters: CallReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    return params.toString();
  }

  async getLeadDisposition(filters: CallReportFilters = {}): Promise<LeadDispositionData> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/call-reports/lead-disposition?${query}`);
    return response.data.data;
  }

  async getSummary(filters: CallReportFilters = {}): Promise<CallSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/call-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getAgentPerformance(filters: CallReportFilters = {}): Promise<AgentPerformance[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/call-reports/agent-performance?${query}`);
    return response.data.data.agentPerformance;
  }

  async getConnectedVsMissed(filters: CallReportFilters = {}): Promise<{
    connected: { count: number; percentage: string; avgDuration: number };
    missed: { count: number; percentage: string; reasons: { reason: string; count: number }[] };
    byHour: { hour: number; connected: number; missed: number }[];
  }> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/call-reports/connected-vs-missed?${query}`);
    return response.data.data;
  }

  async getTrends(filters: CallReportFilters = {}, interval: 'day' | 'week' | 'month' = 'day'): Promise<{
    date: string;
    totalCalls: number;
    connected: number;
    interested: number;
    converted: number;
  }[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/call-reports/trends?${query}&interval=${interval}`);
    return response.data.data.trends;
  }
}

export const callReportsService = new CallReportsService();
