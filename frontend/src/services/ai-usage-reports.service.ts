/**
 * AI Usage Reports Service
 * Frontend API calls for AI voice/chat agent analytics
 */

import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  agentId?: string;
}

export interface AIUsageSummary {
  totalCalls: number;
  connectedCalls: number;
  totalMinutes: number;
  avgCallDuration: number;
  qualifiedLeads: number;
  transfersToHuman: number;
  successRate: string;
  costEstimate: number;
}

export interface AICallsReport {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  connectedCalls: number;
  failedCalls: number;
  busyCalls: number;
  noAnswerCalls: number;
  connectionRate: string;
}

export interface AIMinutesReport {
  totalMinutes: number;
  avgMinutesPerCall: number;
  peakHour: string;
  byDay: { date: string; minutes: number; calls: number }[];
}

export interface AIQualifiedLeads {
  totalQualified: number;
  qualificationRate: string;
  byOutcome: { outcome: string; count: number; percentage: string }[];
  topQualifyingAgents: { agentId: string; agentName: string; qualified: number }[];
}

export interface AITransferReport {
  totalTransfers: number;
  transferRate: string;
  avgTimeBeforeTransfer: number;
  transferReasons: { reason: string; count: number }[];
  transfersByAgent: { agentId: string; agentName: string; transfers: number }[];
}

export interface AIAgentPerformance {
  agentId: string;
  agentName: string;
  totalCalls: number;
  connectedCalls: number;
  avgDuration: number;
  qualifiedLeads: number;
  transfers: number;
  successRate: string;
}

export interface AIScriptPerformance {
  scriptId: string;
  scriptName: string;
  callsUsed: number;
  avgDuration: number;
  qualificationRate: string;
  transferRate: string;
}

export interface TokenUsageSummary {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  byModel: { model: string; tokens: number; cost: number }[];
  byAgent: { agentId: string; agentName: string; tokens: number }[];
}

export interface ComprehensiveAIUsageReport {
  summary: AIUsageSummary;
  calls: AICallsReport;
  minutes: AIMinutesReport;
  qualified: AIQualifiedLeads;
  transfers: AITransferReport;
  agentPerformance: AIAgentPerformance[];
  scriptPerformance: AIScriptPerformance[];
  tokenUsage: TokenUsageSummary;
}

class AIUsageReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.agentId) params.append('agentId', filters.agentId);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<AIUsageSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getCalls(filters: ReportFilters = {}): Promise<AICallsReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/calls?${query}`);
    return response.data.data.calls;
  }

  async getMinutes(filters: ReportFilters = {}): Promise<AIMinutesReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/minutes?${query}`);
    return response.data.data.minutes;
  }

  async getQualifiedLeads(filters: ReportFilters = {}): Promise<AIQualifiedLeads> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/qualified-leads?${query}`);
    return response.data.data.qualifiedLeads;
  }

  async getTransfers(filters: ReportFilters = {}): Promise<AITransferReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/transfers?${query}`);
    return response.data.data.transfers;
  }

  async getAgentPerformance(filters: ReportFilters = {}): Promise<AIAgentPerformance[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/agent-performance?${query}`);
    return response.data.data.agentPerformance;
  }

  async getScriptPerformance(filters: ReportFilters = {}): Promise<AIScriptPerformance[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/script-performance?${query}`);
    return response.data.data.scriptPerformance;
  }

  async getTokenUsage(filters: ReportFilters = {}): Promise<TokenUsageSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/token-usage?${query}`);
    return response.data.data.tokenUsage;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensiveAIUsageReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/ai-usage-reports/comprehensive?${query}`);
    return response.data.data.report;
  }
}

export const aiUsageReportsService = new AIUsageReportsService();
