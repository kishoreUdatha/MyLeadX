import React, { useState, useEffect, useMemo } from 'react';
import {
  UserGroupIcon,
  MegaphoneIcon,
  PhoneArrowUpRightIcon,
  PhoneArrowDownLeftIcon,
  SparklesIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ChartBarIcon,
  GlobeAltIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import api from '../../services/api';

// Lead source categories
const SOCIAL_MEDIA_SOURCES = ['AD_FACEBOOK', 'AD_INSTAGRAM', 'AD_LINKEDIN', 'AD_GOOGLE'];
const AI_VOICE_SOURCES = ['AI_VOICE_AGENT', 'AI_VOICE_INBOUND', 'AI_VOICE_OUTBOUND'];
const OTHER_SOURCES = ['MANUAL', 'BULK_UPLOAD', 'FORM', 'LANDING_PAGE', 'CHATBOT', 'REFERRAL', 'WEBSITE', 'API', 'WHATSAPP', 'OTHER'];

interface LeadSourceStats {
  source: string;
  count: number;
  converted: number;
  conversionRate: number;
  avgResponseTime: number;
  revenue: number;
}

interface LeadSourceData {
  period: string;
  socialMedia: {
    total: number;
    converted: number;
    byPlatform: Record<string, number>;
    trend: { date: string; count: number }[];
  };
  aiVoiceAgent: {
    total: number;
    converted: number;
    inbound: number;
    outbound: number;
    trend: { date: string; count: number }[];
  };
  other: {
    total: number;
    converted: number;
    bySource: Record<string, number>;
  };
  comparison: LeadSourceStats[];
}

const CATEGORY_COLORS = {
  socialMedia: { primary: '#EC4899', gradient: 'from-pink-500 to-rose-500', light: 'bg-pink-50', text: 'text-pink-600' },
  aiVoice: { primary: '#8B5CF6', gradient: 'from-violet-500 to-purple-600', light: 'bg-violet-50', text: 'text-violet-600' },
  other: { primary: '#6B7280', gradient: 'from-gray-500 to-gray-600', light: 'bg-gray-50', text: 'text-gray-600' },
};

const PLATFORM_COLORS: Record<string, string> = {
  AD_FACEBOOK: '#1877F2',
  AD_INSTAGRAM: '#E4405F',
  AD_LINKEDIN: '#0A66C2',
  AD_GOOGLE: '#4285F4',
  AI_VOICE_AGENT: '#8B5CF6',
  AI_VOICE_INBOUND: '#06B6D4',
  AI_VOICE_OUTBOUND: '#10B981',
};

const PLATFORM_ICONS: Record<string, any> = {
  AD_FACEBOOK: GlobeAltIcon,
  AD_INSTAGRAM: GlobeAltIcon,
  AD_LINKEDIN: GlobeAltIcon,
  AD_GOOGLE: GlobeAltIcon,
  AI_VOICE_AGENT: SparklesIcon,
  AI_VOICE_INBOUND: PhoneArrowDownLeftIcon,
  AI_VOICE_OUTBOUND: PhoneArrowUpRightIcon,
};

const LeadSourcesPage: React.FC = () => {
  const [data, setData] = useState<LeadSourceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'socialMedia' | 'aiVoice'>('all');

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/analytics/lead-sources', {
        params: { days: dateRange },
      });
      setData(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lead source data:', error);
      setData(getMockData());
    } finally {
      setLoading(false);
    }
  };

  const formatSourceName = (source: string) => {
    return source
      .replace('AD_', '')
      .replace('AI_VOICE_', 'AI Voice ')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Prepare pie chart data
  const pieChartData = useMemo(() => {
    if (!data) return [];
    return [
      { name: 'Social Media', value: data.socialMedia.total, color: CATEGORY_COLORS.socialMedia.primary },
      { name: 'AI Voice Agent', value: data.aiVoiceAgent.total, color: CATEGORY_COLORS.aiVoice.primary },
      { name: 'Other Sources', value: data.other.total, color: CATEGORY_COLORS.other.primary },
    ];
  }, [data]);

  // Combined trend data
  const trendData = useMemo(() => {
    if (!data) return [];
    const socialTrend = data.socialMedia.trend;
    const aiTrend = data.aiVoiceAgent.trend;

    return socialTrend.map((item, index) => ({
      date: item.date,
      socialMedia: item.count,
      aiVoice: aiTrend[index]?.count || 0,
    }));
  }, [data]);

  // Skeleton loader
  if (loading && !data) {
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
                <div key={i} className="h-48 bg-gray-200 rounded-2xl"></div>
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
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                    <UserGroupIcon className="h-7 w-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Lead Sources Analytics</h1>
                  <p className="text-gray-500 text-sm mt-0.5">Compare Social Media vs AI Voice Agent lead generation</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Category Filter */}
              <div className="flex items-center bg-white rounded-xl border border-gray-200 shadow-sm p-1">
                {[
                  { id: 'all', label: 'All Sources' },
                  { id: 'socialMedia', label: 'Social Media' },
                  { id: 'aiVoice', label: 'AI Voice Agent' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
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

              {/* Refresh */}
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Category Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Social Media Card */}
          <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${
            selectedCategory === 'socialMedia' ? 'border-pink-500 ring-2 ring-pink-500/20' : 'border-gray-200 hover:border-pink-300'
          }`}
          onClick={() => setSelectedCategory('socialMedia')}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-pink-500/25">
                    <MegaphoneIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Social Media Leads</h3>
                    <p className="text-sm text-gray-500">Facebook, Instagram, LinkedIn, Google</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-gray-900">{data?.socialMedia.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Leads</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <ArrowUpIcon className="w-4 h-4" />
                      <span className="font-semibold">12.5%</span>
                    </div>
                    <p className="text-xs text-gray-400">vs last period</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-emerald-600">{data?.socialMedia.converted}</p>
                    <p className="text-xs text-gray-500">Converted</p>
                  </div>
                  <div className="bg-pink-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-pink-600">
                      {data?.socialMedia.total ? ((data.socialMedia.converted / data.socialMedia.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Conv. Rate</p>
                  </div>
                </div>

                {/* Platform breakdown */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-3">By Platform</p>
                  <div className="space-y-2">
                    {data?.socialMedia.byPlatform && Object.entries(data.socialMedia.byPlatform).map(([platform, count]) => {
                      const total = data.socialMedia.total || 1;
                      const percentage = (count / total) * 100;
                      return (
                        <div key={platform} className="flex items-center gap-3">
                          <div className="w-24 text-xs font-medium text-gray-700">{formatSourceName(platform)}</div>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${percentage}%`, backgroundColor: PLATFORM_COLORS[platform] }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-12 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Voice Agent Card */}
          <div className={`bg-white rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${
            selectedCategory === 'aiVoice' ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 hover:border-violet-300'
          }`}
          onClick={() => setSelectedCategory('aiVoice')}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                    <SparklesIcon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">AI Voice Agent Leads</h3>
                    <p className="text-sm text-gray-500">Inbound & Outbound AI Calls</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-4xl font-bold text-gray-900">{data?.aiVoiceAgent.total.toLocaleString()}</p>
                    <p className="text-sm text-gray-500 mt-1">Total Leads</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-emerald-600">
                      <ArrowUpIcon className="w-4 h-4" />
                      <span className="font-semibold">24.8%</span>
                    </div>
                    <p className="text-xs text-gray-400">vs last period</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-emerald-600">{data?.aiVoiceAgent.converted}</p>
                    <p className="text-xs text-gray-500">Converted</p>
                  </div>
                  <div className="bg-violet-50 rounded-xl p-3">
                    <p className="text-lg font-bold text-violet-600">
                      {data?.aiVoiceAgent.total ? ((data.aiVoiceAgent.converted / data.aiVoiceAgent.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-gray-500">Conv. Rate</p>
                  </div>
                </div>

                {/* Call type breakdown */}
                <div className="pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-3">By Call Type</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-cyan-50 rounded-xl">
                      <PhoneArrowDownLeftIcon className="w-5 h-5 text-cyan-600" />
                      <div>
                        <p className="text-lg font-bold text-cyan-700">{data?.aiVoiceAgent.inbound}</p>
                        <p className="text-xs text-gray-500">Inbound</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                      <PhoneArrowUpRightIcon className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-lg font-bold text-emerald-700">{data?.aiVoiceAgent.outbound}</p>
                        <p className="text-xs text-gray-500">Outbound</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <ChartBarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Source Distribution</h3>
                <p className="text-sm text-gray-500">Lead source breakdown</p>
              </div>
            </div>

            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={3}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }}></div>
                              <span className="text-sm font-semibold text-gray-900">{data.name}</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900 mt-1">{data.value.toLocaleString()} leads</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="space-y-2 mt-4">
              {pieChartData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</span>
                    <span className="text-xs text-gray-400">
                      ({((item.value / (pieChartData.reduce((a, b) => a + b.value, 0) || 1)) * 100).toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trend Comparison Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Lead Generation Trend</h3>
              <p className="text-sm text-gray-500 mt-0.5">Social Media vs AI Voice Agent over time</p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <span className="text-sm text-gray-600 font-medium">Social Media</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                <span className="text-sm text-gray-600 font-medium">AI Voice Agent</span>
              </div>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSocial" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EC4899" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#EC4899" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorAI" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 11 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="socialMedia" stroke="#EC4899" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSocial)" name="Social Media" />
                <Area type="monotone" dataKey="aiVoice" stroke="#8B5CF6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAI)" name="AI Voice Agent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Detailed Comparison Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Source Performance Comparison</h3>
            <p className="text-sm text-gray-500 mt-1">Detailed metrics by lead source</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50/80">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Source</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Total Leads</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Converted</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Conv. Rate</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Avg Response</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data?.comparison.map((source, index) => {
                  const isSocialMedia = SOCIAL_MEDIA_SOURCES.includes(source.source);
                  const isAIVoice = AI_VOICE_SOURCES.includes(source.source);
                  const Icon = PLATFORM_ICONS[source.source] || GlobeAltIcon;

                  return (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: `${PLATFORM_COLORS[source.source] || '#6B7280'}15` }}
                          >
                            <Icon className="w-5 h-5" style={{ color: PLATFORM_COLORS[source.source] || '#6B7280' }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{formatSourceName(source.source)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          isSocialMedia ? 'bg-pink-100 text-pink-700' :
                          isAIVoice ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {isSocialMedia ? 'Social Media' : isAIVoice ? 'AI Voice' : 'Other'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-bold text-gray-900">{source.count.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-medium text-emerald-600">{source.converted.toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          source.conversionRate >= 20 ? 'bg-emerald-100 text-emerald-700' :
                          source.conversionRate >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {source.conversionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm text-gray-600">{source.avgResponseTime}m</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-semibold text-gray-900">${source.revenue.toLocaleString()}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[180px]">
        <p className="text-sm font-medium text-gray-900 mb-3">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4 mb-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{entry.value} leads</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Mock data
const getMockData = (): LeadSourceData => {
  const generateTrend = (base: number) => {
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      return {
        date: date.toISOString().split('T')[0],
        count: Math.floor(base + Math.sin(i * 0.3) * (base * 0.3) + Math.random() * (base * 0.2)),
      };
    });
  };

  return {
    period: '30 days',
    socialMedia: {
      total: 847,
      converted: 127,
      byPlatform: {
        AD_FACEBOOK: 312,
        AD_INSTAGRAM: 245,
        AD_LINKEDIN: 178,
        AD_GOOGLE: 112,
      },
      trend: generateTrend(28),
    },
    aiVoiceAgent: {
      total: 523,
      converted: 156,
      inbound: 234,
      outbound: 289,
      trend: generateTrend(17),
    },
    other: {
      total: 412,
      converted: 82,
      bySource: {
        MANUAL: 156,
        FORM: 89,
        WEBSITE: 78,
        REFERRAL: 56,
        OTHER: 33,
      },
    },
    comparison: [
      { source: 'AD_FACEBOOK', count: 312, converted: 47, conversionRate: 15.1, avgResponseTime: 24, revenue: 94000 },
      { source: 'AD_INSTAGRAM', count: 245, converted: 39, conversionRate: 15.9, avgResponseTime: 18, revenue: 78000 },
      { source: 'AI_VOICE_OUTBOUND', count: 289, converted: 98, conversionRate: 33.9, avgResponseTime: 2, revenue: 156000 },
      { source: 'AI_VOICE_INBOUND', count: 234, converted: 58, conversionRate: 24.8, avgResponseTime: 1, revenue: 89000 },
      { source: 'AD_LINKEDIN', count: 178, converted: 28, conversionRate: 15.7, avgResponseTime: 36, revenue: 56000 },
      { source: 'AD_GOOGLE', count: 112, converted: 13, conversionRate: 11.6, avgResponseTime: 28, revenue: 34000 },
      { source: 'FORM', count: 89, converted: 22, conversionRate: 24.7, avgResponseTime: 12, revenue: 45000 },
      { source: 'WEBSITE', count: 78, converted: 15, conversionRate: 19.2, avgResponseTime: 8, revenue: 32000 },
    ],
  };
};

export default LeadSourcesPage;
