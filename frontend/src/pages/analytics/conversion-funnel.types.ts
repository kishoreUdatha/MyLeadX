/**
 * Conversion Funnel Page Types
 */

export interface FunnelStage {
  name: string;
  order: number;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

export interface FunnelData {
  funnelName: string;
  period: { startDate: string | null; endDate: string | null };
  stages: FunnelStage[];
  totalLeads: number;
  totalConverted: number;
  overallConversionRate: number;
}

export interface StageConfig {
  color: string;
  gradient: string;
  bgLight: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface Insight {
  type: 'warning' | 'success';
  title: string;
  description: string;
}

export type ViewMode = 'visual' | 'table';
