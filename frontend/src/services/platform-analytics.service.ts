import api from './api';
import {
  ProspectSource,
  ProspectStage,
  PROSPECT_SOURCE_LABELS,
} from './platform-prospect.service';

export interface ChannelMetric {
  source: ProspectSource;
  prospects: number;
  mqlPlus: number;
  demos: number;
  trials: number;
  paid: number;
  lost: number;
  totalRevenue: number;
  cpl: number | null;
  cac: number | null;
  ltv: number | null;
  roi: number | null;
  spend: number;
  conversionRate: number;
}

export interface FunnelStep {
  stage: ProspectStage;
  count: number;
  pctOfTop: number;
}

export interface SalesRepMetric {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  prospectsAssigned: number;
  callsMade: number;
  demosScheduled: number;
  trialsStarted: number;
  paidConversions: number;
  totalRevenue: number;
}

export interface DailyProspectCount {
  date: string;
  count: number;
}

interface DateRange {
  fromDate?: string;
  toDate?: string;
}

function rangeToParams(range: DateRange): Record<string, string> {
  const params: Record<string, string> = {};
  if (range.fromDate) params.fromDate = range.fromDate;
  if (range.toDate) params.toDate = range.toDate;
  return params;
}

export const platformAnalyticsService = {
  async channelBreakdown(range: DateRange = {}): Promise<ChannelMetric[]> {
    const response = await api.get('/platform-analytics/channel-breakdown', {
      params: rangeToParams(range),
    });
    return response.data.data;
  },

  async conversionFunnel(
    source: ProspectSource | undefined,
    range: DateRange = {},
  ): Promise<FunnelStep[]> {
    const params = rangeToParams(range);
    if (source) params.source = source;
    const response = await api.get('/platform-analytics/conversion-funnel', { params });
    return response.data.data;
  },

  async salesRepLeaderboard(range: DateRange = {}): Promise<SalesRepMetric[]> {
    const response = await api.get('/platform-analytics/sales-rep-leaderboard', {
      params: rangeToParams(range),
    });
    return response.data.data;
  },

  async dailyProspectCounts(range: DateRange = {}): Promise<DailyProspectCount[]> {
    const response = await api.get('/platform-analytics/daily-prospects', {
      params: rangeToParams(range),
    });
    return response.data.data;
  },
};

export { PROSPECT_SOURCE_LABELS };
