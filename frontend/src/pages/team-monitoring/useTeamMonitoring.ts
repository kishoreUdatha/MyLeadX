/**
 * Team Monitoring Hook
 * Manages state and data fetching for team monitoring dashboard
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { teamMonitoringService, TeamMonitoringParams, LiveTeamStatus } from '../../services/team-monitoring.service';
import {
  TeamOverview,
  TelecallerMetrics,
  ManagerMetrics,
  LeadAgingBucket,
  CallOutcomeData,
  ConversionTrendData,
  ResponseTimeMetrics,
  PendingFollowUpsData,
  TeamMonitoringFilters,
  ExportType,
} from './team-monitoring.types';

interface UseTeamMonitoringReturn {
  // Data
  overview: TeamOverview | null;
  telecallers: TelecallerMetrics[];
  managers: ManagerMetrics[];
  leadAging: LeadAgingBucket[];
  callOutcomes: CallOutcomeData[];
  conversionTrend: ConversionTrendData[];
  responseTime: ResponseTimeMetrics | null;
  followUps: PendingFollowUpsData | null;
  liveStatus: LiveTeamStatus | null;

  // Loading states
  loading: boolean;
  overviewLoading: boolean;
  telecallersLoading: boolean;
  managersLoading: boolean;

  // Filters
  filters: TeamMonitoringFilters;
  setFilters: (filters: TeamMonitoringFilters) => void;

  // Actions
  refresh: () => void;
  exportData: (type: ExportType) => Promise<void>;

  // Error
  error: string | null;
}

const getDateRange = (range: TeamMonitoringFilters['dateRange'], customFrom?: Date, customTo?: Date) => {
  const now = new Date();
  let dateFrom: Date;
  let dateTo: Date = now;

  switch (range) {
    case 'today':
      dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case '7days':
      dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30days':
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'custom':
      dateFrom = customFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateTo = customTo || now;
      break;
    default:
      dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  return { dateFrom, dateTo };
};

export function useTeamMonitoring(): UseTeamMonitoringReturn {
  // Data states
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [telecallers, setTelecallers] = useState<TelecallerMetrics[]>([]);
  const [managers, setManagers] = useState<ManagerMetrics[]>([]);
  const [leadAging, setLeadAging] = useState<LeadAgingBucket[]>([]);
  const [callOutcomes, setCallOutcomes] = useState<CallOutcomeData[]>([]);
  const [conversionTrend, setConversionTrend] = useState<ConversionTrendData[]>([]);
  const [responseTime, setResponseTime] = useState<ResponseTimeMetrics | null>(null);
  const [followUps, setFollowUps] = useState<PendingFollowUpsData | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveTeamStatus | null>(null);

  // Loading states
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [telecallersLoading, setTelecallersLoading] = useState(true);
  const [managersLoading, setManagersLoading] = useState(true);
  const [chartsLoading, setChartsLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState<TeamMonitoringFilters>({
    dateRange: '30days',
  });

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Build API params from filters
  const apiParams = useMemo((): TeamMonitoringParams => {
    const { dateFrom, dateTo } = getDateRange(filters.dateRange, filters.dateFrom, filters.dateTo);
    return {
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
      branchId: filters.branchId,
      managerId: filters.managerId,
    };
  }, [filters]);

  // Fetch live status
  const fetchLiveStatus = useCallback(async () => {
    try {
      const data = await teamMonitoringService.getLiveStatus();
      setLiveStatus(data);
    } catch (err) {
      console.error('Failed to fetch live status:', err);
    }
  }, []);

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      console.log('[TeamMonitoring] Fetching overview with params:', apiParams);
      const data = await teamMonitoringService.getOverview(apiParams);
      console.log('[TeamMonitoring] Overview data received:', data);
      setOverview(data);
    } catch (err) {
      console.error('Failed to fetch overview:', err);
      setError('Failed to fetch overview data');
    } finally {
      setOverviewLoading(false);
    }
  }, [apiParams]);

  // Fetch telecallers
  const fetchTelecallers = useCallback(async () => {
    try {
      setTelecallersLoading(true);
      const data = await teamMonitoringService.getTelecallers(apiParams);
      setTelecallers(data);
    } catch (err) {
      console.error('Failed to fetch telecallers:', err);
    } finally {
      setTelecallersLoading(false);
    }
  }, [apiParams]);

  // Fetch managers
  const fetchManagers = useCallback(async () => {
    try {
      setManagersLoading(true);
      const data = await teamMonitoringService.getManagers(apiParams);
      setManagers(data);
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    } finally {
      setManagersLoading(false);
    }
  }, [apiParams]);

  // Fetch chart data
  const fetchChartData = useCallback(async () => {
    try {
      setChartsLoading(true);
      const [agingData, outcomesData, trendData, responseData, followUpsData] = await Promise.all([
        teamMonitoringService.getLeadAging(apiParams),
        teamMonitoringService.getOutcomes(apiParams),
        teamMonitoringService.getConversions(apiParams),
        teamMonitoringService.getResponseTime(apiParams),
        teamMonitoringService.getFollowUps(apiParams),
      ]);
      setLeadAging(agingData);
      setCallOutcomes(outcomesData);
      setConversionTrend(trendData);
      setResponseTime(responseData);
      setFollowUps(followUpsData);
    } catch (err) {
      console.error('Failed to fetch chart data:', err);
    } finally {
      setChartsLoading(false);
    }
  }, [apiParams]);

  // Refresh all data
  const refresh = useCallback(() => {
    setError(null);
    fetchLiveStatus();
    fetchOverview();
    fetchTelecallers();
    fetchManagers();
    fetchChartData();
  }, [fetchLiveStatus, fetchOverview, fetchTelecallers, fetchManagers, fetchChartData]);

  // Export data
  const exportData = useCallback(async (type: ExportType) => {
    try {
      const blob = await teamMonitoringService.exportData(type, apiParams);
      teamMonitoringService.downloadExport(blob, type);
    } catch (err) {
      console.error('Failed to export data:', err);
      setError('Failed to export data');
    }
  }, [apiParams]);

  // Initial fetch and refetch on filter change
  useEffect(() => {
    refresh();
  }, [refresh]);

  const loading = overviewLoading || telecallersLoading || managersLoading || chartsLoading;

  return {
    // Data
    overview,
    telecallers,
    managers,
    leadAging,
    callOutcomes,
    conversionTrend,
    responseTime,
    followUps,
    liveStatus,

    // Loading states
    loading,
    overviewLoading,
    telecallersLoading,
    managersLoading,

    // Filters
    filters,
    setFilters,

    // Actions
    refresh,
    exportData,

    // Error
    error,
  };
}
