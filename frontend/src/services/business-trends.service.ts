import api from './api';

export interface BusinessTrendsSummary {
  totalSms: number;
  totalCalls: number;
  convertedLeads: number;
  totalCallTime: string;
  totalCallTimeSeconds: number;
  callsConnected: number;
  lostLeads: number;
}

export interface CallsVsConnectedData {
  weekRange: string;
  totalCalls: number;
  connectedCalls: number;
}

export interface CallDurationData {
  date: string;
  duration: number;
}

export interface ConversionRatioData {
  date: string;
  ratio: number;
  total: number;
  converted: number;
}

export interface LeadsAddedData {
  date: string;
  count: number;
}

export interface LeadSourceData {
  source: string;
  count: number;
}

export interface LostLeadsData {
  date: string;
  count: number;
}

export interface ComprehensiveReport {
  summary: BusinessTrendsSummary;
  callsVsConnected: CallsVsConnectedData[];
  callDuration: CallDurationData[];
  conversionRatio: ConversionRatioData[];
  leadsAdded: LeadsAddedData[];
  leadSources: LeadSourceData[];
  lostLeads: LostLeadsData[];
}

export interface TrendsFilters {
  startDate?: string;
  endDate?: string;
}

class BusinessTrendsService {
  async getSummary(filters: TrendsFilters = {}): Promise<BusinessTrendsSummary> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/summary?${params.toString()}`);
    return response.data.data.summary;
  }

  async getCallsVsConnected(filters: TrendsFilters = {}): Promise<CallsVsConnectedData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/calls-vs-connected?${params.toString()}`);
    return response.data.data.data;
  }

  async getCallDuration(filters: TrendsFilters = {}): Promise<CallDurationData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/call-duration?${params.toString()}`);
    return response.data.data.data;
  }

  async getConversionRatio(filters: TrendsFilters = {}): Promise<ConversionRatioData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/conversion-ratio?${params.toString()}`);
    return response.data.data.data;
  }

  async getLeadsAdded(filters: TrendsFilters = {}): Promise<LeadsAddedData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/leads-added?${params.toString()}`);
    return response.data.data.data;
  }

  async getLeadSources(filters: TrendsFilters = {}): Promise<LeadSourceData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/lead-sources?${params.toString()}`);
    return response.data.data.data;
  }

  async getLostLeads(filters: TrendsFilters = {}): Promise<LostLeadsData[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/lost-leads?${params.toString()}`);
    return response.data.data.data;
  }

  async getComprehensiveReport(filters: TrendsFilters = {}): Promise<ComprehensiveReport> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);

    const response = await api.get(`/business-trends/comprehensive?${params.toString()}`);
    return response.data.data.report;
  }
}

export const businessTrendsService = new BusinessTrendsService();
