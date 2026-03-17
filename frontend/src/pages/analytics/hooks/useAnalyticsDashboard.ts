/**
 * Analytics Dashboard Hook
 * Handles data fetching and state management
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';
import { DashboardSummary, UsageTrendData, ChartDataItem, MessagingDataItem, ApiMethodDataItem } from '../analytics-dashboard.types';
import { PIE_COLORS, getMockData, getMockTrendData } from '../analytics-dashboard.constants';

interface UseAnalyticsDashboardReturn {
  loading: boolean;
  summary: DashboardSummary | null;
  usageTrend: UsageTrendData[];
  dateRange: string;
  lastUpdated: Date | null;
  refreshCountdown: number;
  setDateRange: (range: string) => void;
  fetchDashboardData: () => Promise<void>;
  leadSourceData: ChartDataItem[];
  messagingData: MessagingDataItem[];
  conversationChannelData: ChartDataItem[];
  apiMethodData: ApiMethodDataItem[];
}

export function useAnalyticsDashboard(): UseAnalyticsDashboardReturn {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [usageTrend, setUsageTrend] = useState<UsageTrendData[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();

      const [summaryRes, trendRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/usage-trend', { params: { startDate, endDate, interval: 'day' } }),
      ]);

      setSummary(summaryRes.data.data);
      setUsageTrend(trendRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setSummary(getMockData());
      setUsageTrend(getMockTrendData());
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setRefreshCountdown(30);
    }
  }, [dateRange]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(), 30000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Computed data for charts
  const leadSourceData = useMemo(
    () =>
      summary?.leads.bySource
        ? Object.entries(summary.leads.bySource).map(([name, value], index) => ({
            name: name.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase()),
            value,
            color: PIE_COLORS[index % PIE_COLORS.length],
          }))
        : [],
    [summary]
  );

  const messagingData = useMemo(
    () =>
      summary
        ? [
            { name: 'SMS', sent: summary.messaging.sms.sent, delivered: summary.messaging.sms.delivered, failed: summary.messaging.sms.failed, rate: summary.messaging.sms.deliveryRate },
            { name: 'Email', sent: summary.messaging.email.sent, delivered: summary.messaging.email.delivered, failed: summary.messaging.email.failed, rate: summary.messaging.email.deliveryRate },
            { name: 'WhatsApp', sent: summary.messaging.whatsapp.sent, delivered: summary.messaging.whatsapp.delivered, failed: summary.messaging.whatsapp.failed, rate: summary.messaging.whatsapp.deliveryRate },
          ]
        : [],
    [summary]
  );

  const conversationChannelData = useMemo(
    () =>
      summary?.conversations.byChannel
        ? Object.entries(summary.conversations.byChannel).map(([name, value], index) => ({
            name,
            value,
            color: PIE_COLORS[index % PIE_COLORS.length],
          }))
        : [],
    [summary]
  );

  const apiMethodData = useMemo(
    () =>
      summary?.apiUsage.byMethod
        ? Object.entries(summary.apiUsage.byMethod).map(([name, value]) => ({
            name,
            requests: value,
          }))
        : [],
    [summary]
  );

  return {
    loading,
    summary,
    usageTrend,
    dateRange,
    lastUpdated,
    refreshCountdown,
    setDateRange,
    fetchDashboardData,
    leadSourceData,
    messagingData,
    conversationChannelData,
    apiMethodData,
  };
}

export default useAnalyticsDashboard;
