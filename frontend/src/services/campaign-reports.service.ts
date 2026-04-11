/**
 * Campaign/Source Reports Service
 * Frontend API calls for lead source and campaign analytics
 */

import api from './api';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  sourceId?: string;
  campaignId?: string;
  branchId?: string;
}

export interface SourceLeadCount {
  sourceId: string;
  sourceName: string;
  leadCount: number;
  percentage: string;
  trend: number;
}

export interface SourceCost {
  sourceId: string;
  sourceName: string;
  totalCost: number;
  leadCount: number;
  costPerLead: number;
  conversions: number;
  costPerConversion: number;
}

export interface SourceConversion {
  sourceId: string;
  sourceName: string;
  leads: number;
  contacted: number;
  qualified: number;
  conversions: number;
  conversionRate: string;
  avgConversionTime: number;
}

export interface CampaignROI {
  campaignId: string;
  campaignName: string;
  source: string;
  totalSpend: number;
  leads: number;
  conversions: number;
  revenue: number;
  roi: string;
  costPerLead: number;
  costPerConversion: number;
}

export interface BranchSourceReport {
  branchId: string;
  branchName: string;
  sources: {
    sourceId: string;
    sourceName: string;
    leads: number;
    conversions: number;
    conversionRate: string;
  }[];
  totalLeads: number;
  totalConversions: number;
}

export interface SourceTrend {
  period: string;
  sources: { sourceId: string; sourceName: string; count: number }[];
  total: number;
}

export interface ComprehensiveCampaignReport {
  sourceLeadCount: SourceLeadCount[];
  sourceCost: SourceCost[];
  sourceConversion: SourceConversion[];
  campaignROI: CampaignROI[];
  branchSource: BranchSourceReport[];
  trends: SourceTrend[];
}

class CampaignReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sourceId) params.append('sourceId', filters.sourceId);
    if (filters.campaignId) params.append('campaignId', filters.campaignId);
    if (filters.branchId) params.append('branchId', filters.branchId);
    return params.toString();
  }

  async getSourceLeads(filters: ReportFilters = {}): Promise<SourceLeadCount[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/source-leads?${query}`);
    return response.data.data.sourceLeads;
  }

  async getSourceCost(filters: ReportFilters = {}): Promise<SourceCost[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/source-cost?${query}`);
    return response.data.data.sourceCost;
  }

  async getSourceConversion(filters: ReportFilters = {}): Promise<SourceConversion[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/source-conversion?${query}`);
    return response.data.data.sourceConversion;
  }

  async getCampaignROI(filters: ReportFilters = {}): Promise<CampaignROI[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/campaign-roi?${query}`);
    return response.data.data.campaignROI;
  }

  async getBranchSource(filters: ReportFilters = {}): Promise<BranchSourceReport[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/branch-source?${query}`);
    return response.data.data.branchSource;
  }

  async getTrends(filters: ReportFilters = {}, interval: 'day' | 'week' | 'month' = 'week'): Promise<SourceTrend[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/trends?${query}&interval=${interval}`);
    return response.data.data.trends;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensiveCampaignReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/campaign-reports/comprehensive?${query}`);
    return response.data.data.report;
  }
}

export const campaignReportsService = new CampaignReportsService();
