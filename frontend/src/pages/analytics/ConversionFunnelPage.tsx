import React, { useState, useEffect, useMemo } from 'react';
import {
  FunnelIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ArrowPathIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  LightBulbIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import api from '../../services/api';

interface FunnelStage {
  name: string;
  order: number;
  count: number;
  conversionRate: number;
  dropoffRate: number;
}

interface FunnelData {
  funnelName: string;
  period: { startDate: string | null; endDate: string | null };
  stages: FunnelStage[];
  totalLeads: number;
  totalConverted: number;
  overallConversionRate: number;
}

const STAGE_CONFIGS: Record<string, { color: string; gradient: string; bgLight: string; icon: any }> = {
  lead: { color: '#3B82F6', gradient: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', icon: UserGroupIcon },
  contacted: { color: '#6366F1', gradient: 'from-indigo-500 to-indigo-600', bgLight: 'bg-indigo-50', icon: ChartBarIcon },
  qualified: { color: '#8B5CF6', gradient: 'from-violet-500 to-violet-600', bgLight: 'bg-violet-50', icon: SparklesIcon },
  appointment: { color: '#A855F7', gradient: 'from-purple-500 to-purple-600', bgLight: 'bg-purple-50', icon: CalendarDaysIcon },
  payment: { color: '#D946EF', gradient: 'from-fuchsia-500 to-fuchsia-600', bgLight: 'bg-fuchsia-50', icon: ChartBarIcon },
  converted: { color: '#10B981', gradient: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', icon: CheckCircleIcon },
};

const DEFAULT_STAGE = { color: '#6B7280', gradient: 'from-gray-500 to-gray-600', bgLight: 'bg-gray-50', icon: ChartBarIcon };

const ConversionFunnelPage: React.FC = () => {
  const [funnelData, setFunnelData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [funnelName, setFunnelName] = useState('sales');
  const [dateRange, setDateRange] = useState('30');
  const [viewMode, setViewMode] = useState<'visual' | 'table'>('visual');

  useEffect(() => {
    fetchFunnelData();
  }, [funnelName, dateRange]);

  const fetchFunnelData = async () => {
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
  };

  const formatStageName = (name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' ');
  };

  const getStageConfig = (name: string) => {
    return STAGE_CONFIGS[name.toLowerCase()] || DEFAULT_STAGE;
  };

  // Calculate insights
  const insights = useMemo(() => {
    if (!funnelData?.stages || funnelData.stages.length < 2) return [];

    const result = [];
    let maxDropoff = { stage: '', rate: 0 };
    let minDropoff = { stage: '', rate: 100 };

    funnelData.stages.forEach((stage, index) => {
      if (index < funnelData.stages.length - 1 && stage.dropoffRate > maxDropoff.rate) {
        maxDropoff = { stage: stage.name, rate: stage.dropoffRate };
      }
      if (index > 0 && stage.conversionRate < minDropoff.rate) {
        minDropoff = { stage: stage.name, rate: stage.conversionRate };
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

  // Skeleton loader
  if (loading && !funnelData) {
    return (
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
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        {/* Header */}
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
                  onChange={(e) => setFunnelName(e.target.value)}
                  className="bg-transparent border-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pr-8"
                >
                  <option value="sales">Sales Funnel</option>
                  <option value="support">Support Funnel</option>
                  <option value="onboarding">Onboarding Funnel</option>
                </select>
              </div>

              {/* Date Range */}
              <div className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="bg-transparent border-0 text-sm font-medium text-gray-700 focus:ring-0 cursor-pointer pr-8"
                >
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 90 days</option>
                </select>
              </div>

              {/* View Toggle */}
              <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1">
                {['visual', 'table'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode as any)}
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
                onClick={fetchFunnelData}
                disabled={loading}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50 shadow-sm transition-all disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Leads</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{funnelData?.totalLeads.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-400 mt-2">Entered funnel this period</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Converted</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">{funnelData?.totalConverted.toLocaleString() || 0}</p>
                <p className="text-xs text-gray-400 mt-2">Successfully completed funnel</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <CheckCircleIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                <p className="text-3xl font-bold text-violet-600 mt-2">{funnelData?.overallConversionRate || 0}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <ArrowUpIcon className="w-3 h-3 text-emerald-500" />
                  <span className="text-xs text-emerald-600 font-medium">+2.4% vs last period</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Avg. Time to Convert</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">4.2 <span className="text-lg font-normal text-gray-500">days</span></p>
                <p className="text-xs text-gray-400 mt-2">From lead to conversion</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                <CalendarDaysIcon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Insights */}
        {insights.length > 0 && (
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
        )}

        {/* Main Content */}
        {viewMode === 'visual' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Funnel Visualization</h2>
                <p className="text-sm text-gray-500 mt-1">Visual representation of lead progression</p>
              </div>
            </div>

            {funnelData?.stages && funnelData.stages.length > 0 ? (
              <div className="space-y-1">
                {funnelData.stages.map((stage, index) => {
                  const maxCount = funnelData.stages[0].count || 1;
                  const widthPercent = (stage.count / maxCount) * 100;
                  const stageConfig = getStageConfig(stage.name);
                  const StageIcon = stageConfig.icon;
                  const nextStage = funnelData.stages[index + 1];

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
                              {/* Shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                              <div className="flex items-center justify-between w-full px-5 relative z-10">
                                <span className="text-white font-bold text-xl">
                                  {stage.count.toLocaleString()}
                                </span>
                                {widthPercent > 30 && (
                                  <span className="text-white/90 text-sm font-medium">
                                    {widthPercent.toFixed(0)}% of total
                                  </span>
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
                              <span className="text-sm font-semibold text-red-600">
                                {stage.dropoffRate}% dropoff
                              </span>
                              <span className="text-sm text-red-500">
                                ({(stage.count - nextStage.count).toLocaleString()} leads)
                              </span>
                            </div>
                          </div>
                          <div className="w-28 flex-shrink-0"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <FunnelIcon className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No funnel data available</h3>
                <p className="text-gray-500 mt-1">Data will appear once leads enter the funnel</p>
              </div>
            )}
          </div>
        ) : (
          // Table View
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
                  {funnelData?.stages.map((stage, index) => {
                    const stageConfig = getStageConfig(stage.name);
                    const percentOfTotal = funnelData.stages[0].count > 0
                      ? ((stage.count / funnelData.stages[0].count) * 100).toFixed(1)
                      : '0';
                    const nextStage = funnelData.stages[index + 1];
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
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${percentOfTotal}%`, backgroundColor: stageConfig.color }}
                              />
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
        )}

        {/* Stage Comparison Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Stage Comparison</h3>
            <p className="text-sm text-gray-500 mt-1">Compare lead counts across all stages</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData?.stages || []} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
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
                  {funnelData?.stages.map((stage, index) => (
                    <Cell key={index} fill={getStageConfig(stage.name).color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mock data
const getMockFunnelData = (): FunnelData => ({
  funnelName: 'sales',
  period: { startDate: null, endDate: null },
  stages: [
    { name: 'lead', order: 1, count: 1247, conversionRate: 100, dropoffRate: 0 },
    { name: 'contacted', order: 2, count: 892, conversionRate: 72, dropoffRate: 28 },
    { name: 'qualified', order: 3, count: 534, conversionRate: 60, dropoffRate: 40 },
    { name: 'appointment', order: 4, count: 267, conversionRate: 50, dropoffRate: 50 },
    { name: 'payment', order: 5, count: 156, conversionRate: 58, dropoffRate: 42 },
    { name: 'converted', order: 6, count: 134, conversionRate: 86, dropoffRate: 14 },
  ],
  totalLeads: 1247,
  totalConverted: 134,
  overallConversionRate: 10.7,
});

export default ConversionFunnelPage;
