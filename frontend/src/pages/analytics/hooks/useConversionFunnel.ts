/**
 * Conversion Funnel Hook
 * Manages funnel data fetching and insights calculation
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../../../services/api';
import { FunnelData, Insight, ViewMode } from '../conversion-funnel.types';
import { getMockFunnelData, formatStageName } from '../conversion-funnel.constants';

export function useConversionFunnel() {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnelName, setFunnelName] = useState('sales');
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState<ViewMode>('visual');

  const fetchFunnelData = useCallback(async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await api.get(`/call-analytics/funnels/${funnelName}`, {
        params: { startDate: startDate.toISOString() },
      });
      setFunnelData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch funnel data:', error);
      setFunnelData(getMockFunnelData());
    } finally {
      setLoading(false);
    }
  }, [funnelName, dateRange]);

  useEffect(() => {
    fetchFunnelData();
  }, [fetchFunnelData]);

  // Calculate insights
  const insights = useMemo<Insight[]>(() => {
    if (!funnelData?.stages || funnelData.stages.length < 2) return [];

    const result: Insight[] = [];
    let maxDropoff = { stage: '', rate: 0 };

    funnelData.stages.forEach((stage, index) => {
      if (index < funnelData.stages.length - 1 && stage.dropoffRate > maxDropoff.rate) {
        maxDropoff = { stage: stage.name, rate: stage.dropoffRate };
      }
    });

    if (maxDropoff.rate > 30) {
      result.push({
        type: 'warning',
        title: 'High Dropoff Detected',
        description: `${formatStageName(maxDropoff.stage)} stage has a ${maxDropoff.rate}% dropoff rate. Consider optimizing this step.`,
      });
    }

    if (funnelData.overallConversionRate > 15) {
      result.push({
        type: 'success',
        title: 'Strong Conversion Rate',
        description: `Your overall ${funnelData.overallConversionRate}% conversion rate is above industry average.`,
      });
    }

    return result;
  }, [funnelData]);

  return {
    funnelData,
    loading,
    funnelName,
    dateRange,
    viewMode,
    insights,
    setFunnelName,
    setDateRange,
    setViewMode,
    fetchFunnelData,
  };
}
