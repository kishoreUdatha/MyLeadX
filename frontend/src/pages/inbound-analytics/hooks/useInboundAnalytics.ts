/**
 * Inbound Analytics Hook
 * Manages data fetching and state for the analytics dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import {
  DateRangeType,
  CallVolumeData,
  HourlyDistribution,
  QueueMetrics,
  AgentPerformance,
  LiveDashboardData,
  AnalyticsSummary,
} from '../inbound-analytics.types';
import {
  INITIAL_LIVE_DATA,
  INITIAL_SUMMARY,
  LIVE_DATA_REFRESH_INTERVAL,
  getDateParams,
} from '../inbound-analytics.constants';

export function useInboundAnalytics() {
  const [dateRange, setDateRange] = useState<DateRangeType>('7days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [liveData, setLiveData] = useState<LiveDashboardData>(INITIAL_LIVE_DATA);
  const [summary, setSummary] = useState<AnalyticsSummary>(INITIAL_SUMMARY);
  const [callVolume, setCallVolume] = useState<CallVolumeData[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);

  const loadLiveData = useCallback(async () => {
    try {
      const response = await fetch('/api/inbound-analytics/live');
      if (response.ok) {
        const data = await response.json();
        setLiveData(data.data);
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/call-volume?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.data?.summary || INITIAL_SUMMARY);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  }, [dateRange, startDate, endDate]);

  const loadCallVolume = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/call-volume?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCallVolume(data.data?.daily || []);
      }
    } catch (error) {
      console.error('Failed to load call volume:', error);
    }
  }, [dateRange, startDate, endDate]);

  const loadHourlyDistribution = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/hourly-distribution?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHourlyDistribution(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load hourly distribution:', error);
    }
  }, [dateRange, startDate, endDate]);

  const loadQueueMetrics = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/queue-metrics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueueMetrics(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load queue metrics:', error);
    }
  }, [dateRange, startDate, endDate]);

  const loadAgentPerformance = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/agent-performance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAgentPerformance(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load agent performance:', error);
    }
  }, [dateRange, startDate, endDate]);

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLiveData(),
        loadSummary(),
        loadCallVolume(),
        loadHourlyDistribution(),
        loadQueueMetrics(),
        loadAgentPerformance(),
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadLiveData, loadSummary, loadCallVolume, loadHourlyDistribution, loadQueueMetrics, loadAgentPerformance]);

  useEffect(() => {
    loadAnalytics();
    const liveInterval = setInterval(loadLiveData, LIVE_DATA_REFRESH_INTERVAL);
    return () => clearInterval(liveInterval);
  }, [loadAnalytics, loadLiveData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  }, [loadAnalytics]);

  const exportReport = useCallback(async () => {
    try {
      const params = getDateParams(dateRange, startDate, endDate);
      const response = await fetch(`/api/inbound-analytics/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inbound-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  }, [dateRange, startDate, endDate]);

  const maxVolume = Math.max(...callVolume.map(d => d.total), 1);
  const maxHourly = Math.max(...hourlyDistribution.map(d => d.calls), 1);

  return {
    // State
    dateRange,
    startDate,
    endDate,
    isLoading,
    isRefreshing,
    liveData,
    summary,
    callVolume,
    hourlyDistribution,
    queueMetrics,
    agentPerformance,
    maxVolume,
    maxHourly,
    // Actions
    setDateRange,
    setStartDate,
    setEndDate,
    handleRefresh,
    exportReport,
  };
}
