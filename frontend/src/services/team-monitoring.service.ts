/**
 * Team Monitoring Service
 * Frontend API service for team performance monitoring
 */

import api from './api';
import {
  TeamOverview,
  TelecallerMetrics,
  ManagerMetrics,
  LeadAgingBucket,
  CallOutcomeData,
  ConversionTrendData,
  ResponseTimeMetrics,
  PendingFollowUpsData,
  ExportType,
} from '../pages/team-monitoring/team-monitoring.types';

export interface TeamMonitoringParams {
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  managerId?: string;
}

export interface LiveTeamStatus {
  summary: {
    total: number;
    active: number;
    onBreak: number;
    offline: number;
  };
  members: Array<{
    id: string;
    name: string;
    avatar?: string;
    role: string;
    status: 'active' | 'break' | 'offline';
    lastActivity?: string;
  }>;
}

export const teamMonitoringService = {
  async getOverview(params?: TeamMonitoringParams): Promise<TeamOverview> {
    const response = await api.get('/team-monitoring/overview', { params });
    return response.data.data;
  },

  async getTelecallers(params?: TeamMonitoringParams): Promise<TelecallerMetrics[]> {
    const response = await api.get('/team-monitoring/telecallers', { params });
    return response.data.data;
  },

  async getManagers(params?: TeamMonitoringParams): Promise<ManagerMetrics[]> {
    const response = await api.get('/team-monitoring/managers', { params });
    return response.data.data;
  },

  async getResponseTime(params?: TeamMonitoringParams): Promise<ResponseTimeMetrics> {
    const response = await api.get('/team-monitoring/response-time', { params });
    return response.data.data;
  },

  async getLeadAging(params?: TeamMonitoringParams): Promise<LeadAgingBucket[]> {
    const response = await api.get('/team-monitoring/lead-aging', { params });
    return response.data.data;
  },

  async getFollowUps(params?: TeamMonitoringParams): Promise<PendingFollowUpsData> {
    const response = await api.get('/team-monitoring/follow-ups', { params });
    return response.data.data;
  },

  async getOutcomes(params?: TeamMonitoringParams): Promise<CallOutcomeData[]> {
    const response = await api.get('/team-monitoring/outcomes', { params });
    return response.data.data;
  },

  async getConversions(params?: TeamMonitoringParams): Promise<ConversionTrendData[]> {
    const response = await api.get('/team-monitoring/conversions', { params });
    return response.data.data;
  },

  async exportData(type: ExportType, params?: TeamMonitoringParams): Promise<Blob> {
    const response = await api.get('/team-monitoring/export', {
      params: { ...params, type },
      responseType: 'blob',
    });
    return response.data;
  },

  downloadExport(blob: Blob, type: ExportType): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-monitoring-${type}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async getLiveStatus(): Promise<LiveTeamStatus> {
    const response = await api.get('/team-monitoring/live-status');
    return response.data.data;
  },

  async updateStatus(status: 'active' | 'break' | 'offline'): Promise<void> {
    await api.post('/team-monitoring/update-status', { status });
  },
};
