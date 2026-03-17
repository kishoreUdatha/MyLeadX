/**
 * Campaign Analytics Hook
 * Manages data fetching and chart data preparation
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../services/api';
import {
  AnalyticsData,
  Campaign,
  ChartDataPoint,
  HourlyChartData,
  DurationChartData,
  DailyTrendChartData,
  FunnelDataPoint,
} from '../campaign-analytics.types';
import {
  OUTCOME_COLORS,
  OUTCOME_LABELS,
  SENTIMENT_COLORS,
  FUNNEL_COLORS,
  formatDuration,
} from '../campaign-analytics.constants';

export function useCampaignAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignRes, analyticsRes] = await Promise.all([
        api.get(`/outbound-calls/campaigns/${id}`),
        api.get(`/outbound-calls/campaigns/${id}/analytics`),
      ]);

      if (campaignRes.data.success) {
        setCampaign(campaignRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const goBack = useCallback(() => {
    navigate(`/outbound-calls/campaigns/${id}`);
  }, [navigate, id]);

  const exportToCSV = useCallback(() => {
    if (!analytics) return;

    const rows = [
      ['Campaign Analytics Report'],
      ['Campaign', campaign?.name || ''],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Summary Metrics'],
      ['Metric', 'Value'],
      ['Total Contacts', analytics.summary.totalContacts],
      ['Total Calls', analytics.summary.totalCalls],
      ['Answered Calls', analytics.summary.answeredCalls],
      ['Interested Calls', analytics.summary.interestedCalls],
      ['Converted Calls', analytics.summary.convertedCalls],
      ['Average Duration', formatDuration(analytics.summary.avgDuration)],
      ['Answer Rate', `${analytics.summary.answerRate}%`],
      ['Interest Rate', `${analytics.summary.interestRate}%`],
      ['Conversion Rate', `${analytics.summary.conversionRate}%`],
      [],
      ['Outcome Distribution'],
      ['Outcome', 'Count'],
      ...Object.entries(analytics.outcomeDistribution).map(([outcome, count]) => [
        OUTCOME_LABELS[outcome] || outcome,
        count,
      ]),
      [],
      ['Sentiment Distribution'],
      ['Sentiment', 'Count'],
      ...Object.entries(analytics.sentimentDistribution).map(([sentiment, count]) => [
        sentiment,
        count,
      ]),
      [],
      ['Hourly Distribution'],
      ['Hour', 'Total Calls', 'Answered'],
      ...Object.entries(analytics.hourlyDistribution).map(([hour, data]) => [
        `${hour}:00`,
        data.total,
        data.answered,
      ]),
      [],
      ['Call Duration Distribution'],
      ['Duration Range', 'Count'],
      ...Object.entries(analytics.durationBuckets).map(([range, count]) => [range, count]),
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campaign-analytics-${campaign?.name || id}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }, [analytics, campaign, id]);

  // Chart data preparation
  const outcomeData = useMemo<ChartDataPoint[]>(() => {
    if (!analytics) return [];
    return Object.entries(analytics.outcomeDistribution).map(([name, value]) => ({
      name: OUTCOME_LABELS[name] || name,
      value,
      color: OUTCOME_COLORS[name] || '#9CA3AF',
    }));
  }, [analytics]);

  const hourlyData = useMemo<HourlyChartData[]>(() => {
    if (!analytics) return [];
    return Object.entries(analytics.hourlyDistribution).map(([hour, data]) => ({
      hour: `${hour}:00`,
      total: data.total,
      answered: data.answered,
      rate: data.total > 0 ? Math.round((data.answered / data.total) * 100) : 0,
    }));
  }, [analytics]);

  const durationData = useMemo<DurationChartData[]>(() => {
    if (!analytics) return [];
    return Object.entries(analytics.durationBuckets).map(([range, count]) => ({
      range,
      count,
    }));
  }, [analytics]);

  const sentimentData = useMemo<ChartDataPoint[]>(() => {
    if (!analytics) return [];
    return Object.entries(analytics.sentimentDistribution)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: SENTIMENT_COLORS[name] || '#9CA3AF',
      }));
  }, [analytics]);

  const funnelData = useMemo<FunnelDataPoint[]>(() => {
    if (!analytics) return [];
    return [
      { name: 'Contacts', value: analytics.conversionFunnel.contacts, fill: FUNNEL_COLORS[0] },
      { name: 'Called', value: analytics.conversionFunnel.called, fill: FUNNEL_COLORS[1] },
      { name: 'Answered', value: analytics.conversionFunnel.answered, fill: FUNNEL_COLORS[2] },
      { name: 'Interested', value: analytics.conversionFunnel.interested, fill: FUNNEL_COLORS[3] },
      { name: 'Converted', value: analytics.conversionFunnel.converted, fill: FUNNEL_COLORS[4] },
    ];
  }, [analytics]);

  const dailyTrendData = useMemo<DailyTrendChartData[]>(() => {
    if (!analytics) return [];
    return Object.entries(analytics.dailyTrend)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        calls: data.calls,
        successful: data.successful,
      }));
  }, [analytics]);

  return {
    // State
    campaign,
    analytics,
    loading,
    error,
    // Chart data
    outcomeData,
    hourlyData,
    durationData,
    sentimentData,
    funnelData,
    dailyTrendData,
    // Actions
    fetchData,
    goBack,
    exportToCSV,
  };
}
