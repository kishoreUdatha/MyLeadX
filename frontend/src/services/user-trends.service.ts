import api from './api';

export interface MetricWithComparison {
  current: {
    value: number;
    startDate: string;
    endDate: string;
  };
  previous: {
    value: number;
    startDate: string;
    endDate: string;
  };
  percentChange: number;
}

export interface UserTrendsSummary {
  averageCallTime: MetricWithComparison;
  totalBreakTime: MetricWithComparison;
  totalCallTime: MetricWithComparison;
  averageBreaks: MetricWithComparison;
}

export interface UserCallMetric {
  userId: string;
  userName: string;
  totalCalls: number;
  connectedCalls: number;
  totalDuration: number;
}

export interface UserDurationMetric {
  userId: string;
  userName: string;
  duration: number;
}

export interface UserLeadMetric {
  userId: string;
  userName: string;
  closedLeads: number;
  convertedLeads: number;
}

export interface UserLostLeadMetric {
  userId: string;
  userName: string;
  lostLeads: number;
}

export interface UserBreakMetric {
  userId: string;
  userName: string;
  totalBreakTime: number;
  totalBreaks: number;
}

export interface UserOption {
  id: string;
  name: string;
}

export interface UserTrendsReport {
  summary: UserTrendsSummary;
  callsPerUser: UserCallMetric[];
  durationPerUser: UserDurationMetric[];
  leadsClosedConverted: UserLeadMetric[];
  lostLeads: UserLostLeadMetric[];
  breaksPerUser: UserBreakMetric[];
}

export interface TrendsFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

class UserTrendsService {
  async getSummary(filters: TrendsFilters = {}): Promise<UserTrendsSummary> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);

    const response = await api.get(`/user-trends/summary?${params.toString()}`);
    return response.data.data.summary;
  }

  async getCallsPerUser(filters: TrendsFilters = {}): Promise<UserCallMetric[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);

    const response = await api.get(`/user-trends/calls-per-user?${params.toString()}`);
    return response.data.data.data;
  }

  async getDurationPerUser(filters: TrendsFilters = {}): Promise<UserDurationMetric[]> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);

    const response = await api.get(`/user-trends/duration-per-user?${params.toString()}`);
    return response.data.data.data;
  }

  async getUsers(): Promise<UserOption[]> {
    const response = await api.get('/user-trends/users');
    return response.data.data.users;
  }

  async getComprehensiveReport(filters: TrendsFilters = {}): Promise<UserTrendsReport> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.userId) params.append('userId', filters.userId);

    const response = await api.get(`/user-trends/comprehensive?${params.toString()}`);
    return response.data.data.report;
  }
}

export const userTrendsService = new UserTrendsService();
