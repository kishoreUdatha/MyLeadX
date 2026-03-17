/**
 * Campaign Analytics Types
 */

export interface AnalyticsSummary {
  totalContacts: number;
  totalCalls: number;
  answeredCalls: number;
  interestedCalls: number;
  convertedCalls: number;
  avgDuration: number;
  answerRate: number;
  interestRate: number;
  conversionRate: number;
}

export interface ConversionFunnel {
  contacts: number;
  called: number;
  answered: number;
  interested: number;
  converted: number;
}

export interface HourlyData {
  total: number;
  answered: number;
}

export interface DailyData {
  calls: number;
  successful: number;
}

export interface AnalyticsData {
  summary: AnalyticsSummary;
  outcomeDistribution: Record<string, number>;
  hourlyDistribution: Record<number, HourlyData>;
  durationBuckets: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  conversionFunnel: ConversionFunnel;
  dailyTrend: Record<string, DailyData>;
}

export interface Campaign {
  id: string;
  name: string;
  status: string;
}

export interface ChartDataPoint {
  name: string;
  value: number;
  color: string;
}

export interface HourlyChartData {
  hour: string;
  total: number;
  answered: number;
  rate: number;
}

export interface DurationChartData {
  range: string;
  count: number;
}

export interface DailyTrendChartData {
  date: string;
  calls: number;
  successful: number;
}

export interface FunnelDataPoint {
  name: string;
  value: number;
  fill: string;
}
