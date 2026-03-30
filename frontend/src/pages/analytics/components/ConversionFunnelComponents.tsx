/**
 * Conversion Funnel Page Components
 */

import React from 'react';
import {
  FunnelIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { FunnelData, FunnelStage, Insight, ViewMode } from '../conversion-funnel.types';
import {
  formatStageName,
  getStageConfig,
  FUNNEL_OPTIONS,
  DATE_RANGE_OPTIONS,
  VIEW_MODES,
} from '../conversion-funnel.constants';

// Loading Skeleton Component
export const LoadingSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
    <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
      <div className="animate-pulse space-y-8">
        <div className="flex justify-between items-center">
          <div className="h-10 bg-gray-200 rounded-xl w-64"></div>
          <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-2xl"></div>
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  </div>
);

// Header Component
interface HeaderProps {
  funnelName: string;
  dateRange: string;
  viewMode: ViewMode;
  loading: boolean;
  onFunnelChange: (value: string) => void;
  onDateRangeChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  funnelName,
  dateRange,
  viewMode,
  loading,
  onFunnelChange,
  onDateRangeChange,
  onViewModeChange,
  onRefresh,
}) => (
  <div className="mb-8">
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      <div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
              <FunnelIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Conversion Funnel</h1>
            <p className="text-gray-500 text-sm mt-0.5">Track lead progression through your sales pipeline</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {/* Funnel Type */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={funnelName}
            onChange={(e) => onFunnelChange(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pr-8"
          >
            {FUNNEL_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Date Range */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
          <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => onDateRangeChange(e.target.value)}
            className="bg-transparent border-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pr-8"
          >
            {DATE_RANGE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* View Toggle */}
        <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>

        {/* Refresh */}
        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 shadow-sm transition-all disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  </div>
);

// Summary Cards Component
interface SummaryCardsProps {
  data: FunnelData | null;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ data }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
    <SummaryCard
      label="Total Leads"
      value={data?.totalLeads.toLocaleString() || '0'}
      subtext="Entered funnel this period"
      icon={UserGroupIcon}
      gradient="from-blue-500 to-blue-600"
      shadowColor="shadow-blue-500/25"
    />
    <SummaryCard
      label="Converted"
      value={data?.totalConverted.toLocaleString() || '0'}
      subtext="Successfully completed funnel"
      icon={CheckCircleIcon}
      gradient="from-emerald-500 to-emerald-600"
      shadowColor="shadow-emerald-500/25"
      valueColor="text-emerald-600"
    />
    <SummaryCard
      label="Conversion Rate"
      value={`${data?.overallConversionRate || 0}%`}
      icon={ChartBarIcon}
      gradient="from-violet-500 to-purple-600"
      shadowColor="shadow-violet-500/25"
      valueColor="text-violet-600"
      trend={{ value: '+2.4%', positive: true }}
    />
    <SummaryCard
      label="Avg. Time to Convert"
      value="4.2"
      valueSuffix="days"
      subtext="From lead to conversion"
      icon={CalendarDaysIcon}
      gradient="from-amber-500 to-orange-600"
      shadowColor="shadow-amber-500/25"
    />
  </div>
);

interface SummaryCardProps {
  label: string;
  value: string;
  valueSuffix?: string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  shadowColor: string;
  valueColor?: string;
  trend?: { value: string; positive: boolean };
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  valueSuffix,
  subtext,
  icon: Icon,
  gradient,
  shadowColor,
  valueColor = 'text-gray-900',
  trend,
}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className={`text-3xl font-bold ${valueColor} mt-2`}>
          {value}
          {valueSuffix && <span className="text-lg font-normal text-gray-500"> {valueSuffix}</span>}
        </p>
        {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <ArrowUpIcon className={`w-3 h-3 ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`} />
            <span className={`text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.value} vs last period
            </span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ${shadowColor}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

// Insights Component
interface InsightsProps {
  insights: Insight[];
}

export const Insights: React.FC<InsightsProps> = ({ insights }) => {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {insights.map((insight, index) => (
        <div
          key={index}
          className={`flex items-start gap-4 p-4 rounded-xl border ${
            insight.type === 'warning'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-emerald-50 border-emerald-200'
          }`}
        >
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            insight.type === 'warning' ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            <LightBulbIcon className={`w-5 h-5 ${
              insight.type === 'warning' ? 'text-amber-600' : 'text-emerald-600'
            }`} />
          </div>
          <div>
            <h4 className={`font-semibold ${
              insight.type === 'warning' ? 'text-amber-800' : 'text-emerald-800'
            }`}>{insight.title}</h4>
            <p className={`text-sm mt-0.5 ${
              insight.type === 'warning' ? 'text-amber-700' : 'text-emerald-700'
            }`}>{insight.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Funnel Visual Component
interface FunnelVisualProps {
  stages: FunnelStage[];
}

export const FunnelVisual: React.FC<FunnelVisualProps> = ({ stages }) => {
  if (!stages || stages.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <FunnelIcon className="h-10 w-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">No funnel data available</h3>
        <p className="text-gray-500 mt-1">Data will appear once leads enter the funnel</p>
      </div>
    );
  }

  const maxCount = stages[0].count || 1;

  return (
    <div className="space-y-1">
      {stages.map((stage, index) => {
        const widthPercent = (stage.count / maxCount) * 100;
        const stageConfig = getStageConfig(stage.name);
        const StageIcon = stageConfig.icon;
        const nextStage = stages[index + 1];

        return (
          <div key={stage.name}>
            {/* Stage Row */}
            <div className="flex items-center gap-6 group">
              {/* Stage Number & Icon */}
              <div className="flex items-center gap-3 w-48 flex-shrink-0">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stageConfig.gradient} flex items-center justify-center text-white font-bold shadow-lg transition-transform group-hover:scale-110`}>
                  <StageIcon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">{formatStageName(stage.name)}</span>
                  <p className="text-xs text-gray-500">Stage {index + 1}</p>
                </div>
              </div>

              {/* Funnel Bar */}
              <div className="flex-1 relative">
                <div className="h-16 bg-gray-100 rounded-xl overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${stageConfig.gradient} transition-all duration-700 ease-out flex items-center rounded-xl relative overflow-hidden`}
                    style={{ width: `${Math.max(widthPercent, 10)}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                    <div className="flex items-center justify-between w-full px-5 relative z-10">
                      <span className="text-white font-bold text-xl">{stage.count.toLocaleString()}</span>
                      {widthPercent > 30 && (
                        <span className="text-white/90 text-sm font-medium">{widthPercent.toFixed(0)}% of total</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Conversion Badge */}
              <div className="w-28 flex-shrink-0">
                <div className={`px-4 py-2.5 rounded-xl text-center border ${
                  stage.conversionRate >= 60
                    ? 'bg-emerald-50 border-emerald-200'
                    : stage.conversionRate >= 30
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <span className={`text-lg font-bold ${
                    stage.conversionRate >= 60
                      ? 'text-emerald-600'
                      : stage.conversionRate >= 30
                      ? 'text-amber-600'
                      : 'text-red-600'
                  }`}>
                    {stage.conversionRate}%
                  </span>
                </div>
              </div>
            </div>

            {/* Dropoff Indicator */}
            {nextStage && stage.dropoffRate > 0 && (
              <div className="flex items-center gap-6 py-3">
                <div className="w-48 flex-shrink-0"></div>
                <div className="flex-1 flex items-center gap-4">
                  <div className="flex-1 relative h-0.5">
                    <div className="absolute inset-0 border-t-2 border-dashed border-red-200"></div>
                    <ArrowTrendingDownIcon className="w-5 h-5 text-red-400 absolute left-1/2 -translate-x-1/2 -top-2.5 bg-white px-1" />
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-red-50 rounded-full border border-red-200">
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-600">{stage.dropoffRate}% dropoff</span>
                    <span className="text-sm text-red-500">({(stage.count - nextStage.count).toLocaleString()} leads)</span>
                  </div>
                </div>
                <div className="w-28 flex-shrink-0"></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Funnel Table Component
interface FunnelTableProps {
  stages: FunnelStage[];
}

export const FunnelTable: React.FC<FunnelTableProps> = ({ stages }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
    <div className="px-6 py-5 border-b border-gray-100">
      <h2 className="text-lg font-semibold text-gray-900">Stage Details</h2>
      <p className="text-sm text-gray-500 mt-1">Detailed breakdown of each funnel stage</p>
    </div>
    <div className="overflow-x-auto">
      <table className="min-w-full">
        <thead>
          <tr className="bg-gray-50/80">
            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Leads</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">% of Total</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Conversion</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Dropoff</th>
            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Lost Leads</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stages?.map((stage, index) => {
            const stageConfig = getStageConfig(stage.name);
            const percentOfTotal = stages[0].count > 0 ? ((stage.count / stages[0].count) * 100).toFixed(1) : '0';
            const nextStage = stages[index + 1];
            const lostLeads = nextStage ? stage.count - nextStage.count : 0;

            return (
              <tr key={stage.name} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-5 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stageConfig.gradient} flex items-center justify-center text-white text-sm font-bold shadow-md`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-900">{formatStageName(stage.name)}</span>
                      <p className="text-xs text-gray-500">Order {stage.order}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <span className="text-lg font-bold text-gray-900">{stage.count.toLocaleString()}</span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${percentOfTotal}%`, backgroundColor: stageConfig.color }} />
                    </div>
                    <span className="text-sm font-medium text-gray-600 w-12">{percentOfTotal}%</span>
                  </div>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                    stage.conversionRate >= 60 ? 'bg-emerald-100 text-emerald-700' :
                    stage.conversionRate >= 30 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {stage.conversionRate}%
                  </span>
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  {stage.dropoffRate > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-red-600">
                      <ArrowTrendingDownIcon className="h-4 w-4" />
                      {stage.dropoffRate}%
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
                <td className="px-6 py-5 whitespace-nowrap text-right">
                  {lostLeads > 0 ? (
                    <span className="text-sm font-medium text-gray-600">{lostLeads.toLocaleString()}</span>
                  ) : (
                    <span className="text-sm text-gray-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

// Stage Comparison Chart Component
interface StageComparisonChartProps {
  stages: FunnelStage[];
}

export const StageComparisonChart: React.FC<StageComparisonChartProps> = ({ stages }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900">Stage Comparison</h3>
      <p className="text-sm text-gray-500 mt-1">Compare lead counts across all stages</p>
    </div>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={stages || []} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }}
            tickFormatter={(value) => formatStageName(value)}
          />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                    <p className="font-semibold text-gray-900">{formatStageName(data.name)}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{data.count.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Conversion: {data.conversionRate}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
            {stages?.map((stage, index) => (
              <Cell key={index} fill={getStageConfig(stage.name).color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);
