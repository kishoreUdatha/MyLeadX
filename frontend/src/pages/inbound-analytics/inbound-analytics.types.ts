/**
 * Inbound Analytics Types
 */

export type DateRangeType = 'today' | '7days' | '30days' | 'custom';

export interface CallVolumeData {
  date: string;
  total: number;
  answered: number;
  missed: number;
  voicemail: number;
}

export interface HourlyDistribution {
  hour: number;
  calls: number;
}

export interface QueueMetrics {
  queueId: string;
  queueName: string;
  totalCalls: number;
  avgWaitTime: number;
  avgHandleTime: number;
  abandonmentRate: number;
  serviceLevelPercent: number;
}

export interface AgentPerformance {
  userId: string;
  userName: string;
  callsHandled: number;
  avgHandleTime: number;
  avgWrapUpTime: number;
  utilizationPercent: number;
}

export interface LiveDashboardData {
  activeCalls: number;
  callsInQueue: number;
  availableAgents: number;
  avgWaitTime: number;
  longestWaitTime: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
}

export interface AnalyticsSummary {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  voicemails: number;
  avgWaitTime: number;
  avgHandleTime: number;
  serviceLevelPercent: number;
  abandonmentRate: number;
  callsChange: number;
  answeredChange: number;
  waitTimeChange: number;
  handleTimeChange: number;
}
