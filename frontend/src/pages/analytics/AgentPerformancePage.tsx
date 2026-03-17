import React, { useState, useEffect, useMemo } from 'react';
import {
  TrophyIcon,
  SparklesIcon,
  PhoneIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  StarIcon,
  ArrowPathIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserCircleIcon,
  ChartBarIcon,
  FireIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarDaysIcon,
  BoltIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, TrophyIcon as TrophySolid } from '@heroicons/react/24/solid';
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import api from '../../services/api';

interface AgentMetrics {
  totalCalls: number;
  answeredCalls: number;
  interestedCount: number;
  appointmentsBooked: number;
  paymentsCollected: number;
  paymentsAmount: number;
  totalTalkTime: number;
  avgConversionRate: number;
  avgAnswerRate: number;
  avgSentimentScore: number;
}

interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string | null;
  metrics: AgentMetrics;
}

interface AgentPerformance {
  agentId: string;
  period: { days: number; startDate: string; endDate: string };
  totals: {
    totalCalls: number;
    answeredCalls: number;
    interestedCount: number;
    appointmentsBooked: number;
    paymentsCollected: number;
    totalTalkTime: number;
  };
  averages: {
    callsPerDay: number;
    conversionRate: number;
    answerRate: number;
  };
  dailyTrend: {
    date: string;
    calls: number;
    answered: number;
    interested: number;
    appointments: number;
    conversionRate: number;
  }[];
}

const RANK_CONFIGS = [
  { bg: 'from-yellow-400 to-amber-500', shadow: 'shadow-yellow-500/30', text: 'text-yellow-600', badge: 'Gold' },
  { bg: 'from-slate-300 to-slate-400', shadow: 'shadow-slate-400/30', text: 'text-slate-600', badge: 'Silver' },
  { bg: 'from-orange-400 to-orange-500', shadow: 'shadow-orange-400/30', text: 'text-orange-600', badge: 'Bronze' },
];

const METRIC_OPTIONS = [
  { id: 'calls', label: 'Total Calls', icon: PhoneIcon },
  { id: 'conversions', label: 'Conversions', icon: ArrowTrendingUpIcon },
  { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
  { id: 'payments', label: 'Payments', icon: CurrencyDollarIcon },
  { id: 'sentiment', label: 'Sentiment', icon: HeartIcon },
];

const AgentPerformancePage: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'calls' | 'conversions' | 'appointments' | 'payments' | 'sentiment'>('calls');
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchLeaderboard();
  }, [metric, dateRange]);

  useEffect(() => {
    if (selectedAgent) {
      fetchAgentPerformance(selectedAgent);
    }
  }, [selectedAgent, dateRange]);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const response = await api.get('/call-analytics/agents/leaderboard', {
        params: { metric, startDate: startDate.toISOString(), limit: 10 },
      });
      setLeaderboard(response.data.data);
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
      setLeaderboard(getMockLeaderboard());
    } finally {
      setLoading(false);
    }
  };

  const fetchAgentPerformance = async (agentId: string) => {
    try {
      const response = await api.get(`/call-analytics/agents/${agentId}`, {
        params: { days: dateRange },
      });
      setAgentPerformance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch agent performance:', error);
      setAgentPerformance(getMockAgentPerformance(agentId));
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getMetricValue = (entry: LeaderboardEntry) => {
    switch (metric) {
      case 'calls': return entry.metrics.totalCalls;
      case 'conversions': return entry.metrics.interestedCount;
      case 'appointments': return entry.metrics.appointmentsBooked;
      case 'payments': return entry.metrics.paymentsCollected;
      case 'sentiment': return (entry.metrics.avgSentimentScore * 100).toFixed(0) + '%';
      default: return entry.metrics.totalCalls;
    }
  };

  const getMetricLabel = () => METRIC_OPTIONS.find(m => m.id === metric)?.label || 'Total Calls';

  // Calculate radar chart data for selected agent
  const radarData = useMemo(() => {
    if (!selectedAgent || !agentPerformance) return [];
    const entry = leaderboard.find(e => e.agentId === selectedAgent);
    if (!entry) return [];

    return [
      { subject: 'Calls', value: Math.min(entry.metrics.totalCalls / 10, 100), fullMark: 100 },
      { subject: 'Answer Rate', value: entry.metrics.avgAnswerRate, fullMark: 100 },
      { subject: 'Conversion', value: entry.metrics.avgConversionRate, fullMark: 100 },
      { subject: 'Sentiment', value: entry.metrics.avgSentimentScore * 100, fullMark: 100 },
      { subject: 'Appointments', value: Math.min(entry.metrics.appointmentsBooked * 2, 100), fullMark: 100 },
    ];
  }, [selectedAgent, leaderboard, agentPerformance]);

  // Skeleton loader
  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
        <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="flex justify-between items-center">
              <div className="h-10 bg-gray-200 rounded-xl w-64"></div>
              <div className="h-10 bg-gray-200 rounded-xl w-48"></div>
            </div>
            <div className="grid grid-cols-3 gap-8">
              <div className="h-[600px] bg-gray-200 rounded-2xl"></div>
              <div className="col-span-2 h-[600px] bg-gray-200 rounded-2xl"></div>
            </div>
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
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-500/30">
                    <TrophyIcon className="h-7 w-7 text-white" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                    <StarSolid className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agent Performance</h1>
                  <p className="text-gray-500 text-sm mt-0.5">Track and compare voice agent metrics</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              {/* Metric Selector */}
              <div className="flex items-center gap-1 px-2 py-1.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                {METRIC_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setMetric(option.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      metric === option.id
                        ? 'bg-amber-500 text-white shadow-md'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <option.icon className="w-4 h-4" />
                    <span className="hidden md:inline">{option.label}</span>
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
                onClick={fetchLeaderboard}
                disabled={loading}
                className="p-2.5 bg-white border border-gray-200 rounded-xl text-gray-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 shadow-sm transition-all disabled:opacity-50"
              >
                <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Top 3 Podium */}
        {leaderboard.length >= 3 && (
          <div className="grid grid-cols-3 gap-6 mb-8">
            {[1, 0, 2].map((displayIndex) => {
              const actualIndex = displayIndex;
              const entry = leaderboard[actualIndex];
              if (!entry) return null;

              const config = RANK_CONFIGS[actualIndex];
              const isFirst = actualIndex === 0;

              return (
                <div
                  key={entry.agentId}
                  onClick={() => setSelectedAgent(entry.agentId)}
                  className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 cursor-pointer transition-all hover:shadow-xl ${
                    selectedAgent === entry.agentId ? 'ring-2 ring-amber-500 ring-offset-2' : ''
                  } ${isFirst ? 'transform scale-105 shadow-lg' : ''}`}
                >
                  <div className="text-center">
                    {/* Trophy */}
                    <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${config.bg} flex items-center justify-center shadow-lg ${config.shadow} mb-4`}>
                      {isFirst ? (
                        <TrophySolid className="w-8 h-8 text-white" />
                      ) : (
                        <span className="text-2xl font-bold text-white">{entry.rank}</span>
                      )}
                    </div>

                    {/* Badge */}
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${config.text} bg-gradient-to-r ${config.bg} bg-opacity-10 border border-current mb-3`}>
                      {config.badge}
                    </span>

                    {/* Agent Name */}
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      {entry.agentName || `Agent ${entry.agentId.slice(0, 6)}`}
                    </h3>

                    {/* Metric Value */}
                    <p className={`text-3xl font-bold ${config.text} mb-2`}>
                      {getMetricValue(entry)}
                    </p>
                    <p className="text-sm text-gray-500">{getMetricLabel()}</p>

                    {/* Stats */}
                    <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-gray-100">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">{entry.metrics.avgConversionRate.toFixed(1)}%</p>
                        <p className="text-xs text-gray-500">Conv.</p>
                      </div>
                      <div className="w-px h-8 bg-gray-200"></div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">{entry.metrics.avgAnswerRate.toFixed(0)}%</p>
                        <p className="text-xs text-gray-500">Answer</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Leaderboard */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-amber-50 to-orange-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md">
                      <StarIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Leaderboard</h2>
                      <p className="text-xs text-gray-500">Ranked by {getMetricLabel().toLowerCase()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {leaderboard.length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <UserCircleIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">No agent data available</p>
                  </div>
                ) : (
                  leaderboard.slice(3).map((entry) => (
                    <button
                      key={entry.agentId}
                      onClick={() => setSelectedAgent(entry.agentId)}
                      className={`w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-all ${
                        selectedAgent === entry.agentId ? 'bg-amber-50 border-l-4 border-l-amber-500' : ''
                      }`}
                    >
                      {/* Rank */}
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                        {entry.rank}
                      </div>

                      {/* Agent Info */}
                      <div className="flex-1 text-left min-w-0">
                        <span className="text-sm font-semibold text-gray-900 truncate block">
                          {entry.agentName || `Agent ${entry.agentId.slice(0, 8)}`}
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{entry.metrics.totalCalls} calls</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className="text-xs text-emerald-600 font-medium">{entry.metrics.avgConversionRate.toFixed(1)}%</span>
                        </div>
                      </div>

                      {/* Metric */}
                      <div className="text-right">
                        <span className="text-lg font-bold text-gray-700">{getMetricValue(entry)}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Agent Details */}
          <div className="xl:col-span-2">
            {selectedAgent && agentPerformance ? (
              <div className="space-y-6">
                {/* Agent Header Card */}
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>

                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                          <SparklesIcon className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold">
                            {leaderboard.find(e => e.agentId === selectedAgent)?.agentName || `Agent ${selectedAgent.slice(0, 8)}`}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs font-medium">
                              Rank #{leaderboard.find(e => e.agentId === selectedAgent)?.rank || '-'}
                            </span>
                            <span className="text-white/70 text-sm">Performance Overview</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarSolid key={star} className={`w-5 h-5 ${star <= 4 ? 'text-yellow-400' : 'text-white/30'}`} />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <MetricCard icon={<PhoneIcon className="w-5 h-5" />} value={agentPerformance.totals.totalCalls} label="Total Calls" />
                      <MetricCard icon={<ArrowTrendingUpIcon className="w-5 h-5" />} value={`${agentPerformance.averages.answerRate}%`} label="Answer Rate" />
                      <MetricCard icon={<BoltIcon className="w-5 h-5" />} value={`${agentPerformance.averages.conversionRate}%`} label="Conversion" />
                      <MetricCard icon={<ClockIcon className="w-5 h-5" />} value={formatDuration(agentPerformance.totals.totalTalkTime)} label="Talk Time" />
                    </div>
                  </div>
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Daily Trend Chart */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Daily Performance</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Calls and conversions over time</p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={agentPerformance.dailyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorAgentCalls" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#6366F1" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAgentInterested" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#6B7280', fontSize: 10 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="calls" stroke="#6366F1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAgentCalls)" name="Calls" />
                          <Area type="monotone" dataKey="interested" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAgentInterested)" name="Interested" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900">Performance Profile</h3>
                      <p className="text-sm text-gray-500 mt-0.5">Multi-dimensional agent analysis</p>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                          <PolarGrid stroke="#E5E7EB" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 11 }} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                          <Radar name="Performance" dataKey="value" stroke="#6366F1" fill="#6366F1" fillOpacity={0.3} strokeWidth={2} />
                        </RadarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Performance Breakdown */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">Performance Breakdown</h3>
                  <div className="grid grid-cols-3 gap-6">
                    <BreakdownCard
                      icon={<UserCircleIcon className="w-6 h-6" />}
                      value={agentPerformance.totals.interestedCount}
                      label="Interested Leads"
                      gradient="from-blue-500 to-indigo-600"
                      shadow="shadow-blue-500/25"
                    />
                    <BreakdownCard
                      icon={<CalendarIcon className="w-6 h-6" />}
                      value={agentPerformance.totals.appointmentsBooked}
                      label="Appointments"
                      gradient="from-violet-500 to-purple-600"
                      shadow="shadow-violet-500/25"
                    />
                    <BreakdownCard
                      icon={<CurrencyDollarIcon className="w-6 h-6" />}
                      value={agentPerformance.totals.paymentsCollected}
                      label="Payments"
                      gradient="from-emerald-500 to-teal-600"
                      shadow="shadow-emerald-500/25"
                    />
                  </div>
                </div>

                {/* Daily Activity Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Daily Activity</h3>
                    <p className="text-sm text-gray-500 mt-1">Detailed breakdown by day</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="bg-gray-50/80">
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Calls</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Answered</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Interested</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Appts</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Conv. Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {agentPerformance.dailyTrend.slice(-7).reverse().map((day) => (
                          <tr key={day.date} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-semibold text-gray-900">{day.calls}</td>
                            <td className="px-6 py-4 text-right text-sm text-gray-600">{day.answered}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                {day.interested}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 text-violet-700">
                                {day.appointments}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                day.conversionRate >= 20 ? 'bg-emerald-100 text-emerald-700' :
                                day.conversionRate >= 10 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {day.conversionRate}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-20 text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center mx-auto mb-6">
                  <SparklesIcon className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Select an Agent</h3>
                <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                  Click on an agent from the podium or leaderboard to view their detailed performance metrics
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Card for Header
const MetricCard = ({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
    <div className="text-white/70 mb-2">{icon}</div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-white/70 mt-1">{label}</div>
  </div>
);

// Breakdown Card
const BreakdownCard = ({ icon, value, label, gradient, shadow }: {
  icon: React.ReactNode;
  value: number;
  label: string;
  gradient: string;
  shadow: string;
}) => (
  <div className="text-center p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:shadow-lg transition-all">
    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mx-auto mb-4 shadow-lg ${shadow}`}>
      <div className="text-white">{icon}</div>
    </div>
    <div className="text-3xl font-bold text-gray-900">{value}</div>
    <div className="text-sm text-gray-500 mt-1">{label}</div>
  </div>
);

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-4 min-w-[150px]">
        <p className="text-sm font-medium text-gray-900 mb-2">
          {new Date(label).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-sm text-gray-600">{entry.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Mock data
const getMockLeaderboard = (): LeaderboardEntry[] => [
  { rank: 1, agentId: 'agent-001', agentName: 'Sales Pro Max', metrics: { totalCalls: 542, answeredCalls: 487, interestedCount: 156, appointmentsBooked: 89, paymentsCollected: 45, paymentsAmount: 125000, totalTalkTime: 86400, avgConversionRate: 28.8, avgAnswerRate: 89.9, avgSentimentScore: 0.85 } },
  { rank: 2, agentId: 'agent-002', agentName: 'Lead Converter', metrics: { totalCalls: 478, answeredCalls: 412, interestedCount: 134, appointmentsBooked: 76, paymentsCollected: 38, paymentsAmount: 98000, totalTalkTime: 72000, avgConversionRate: 28.0, avgAnswerRate: 86.2, avgSentimentScore: 0.82 } },
  { rank: 3, agentId: 'agent-003', agentName: 'Appointment Setter', metrics: { totalCalls: 423, answeredCalls: 356, interestedCount: 112, appointmentsBooked: 95, paymentsCollected: 32, paymentsAmount: 78000, totalTalkTime: 64800, avgConversionRate: 26.5, avgAnswerRate: 84.2, avgSentimentScore: 0.79 } },
  { rank: 4, agentId: 'agent-004', agentName: 'Cold Caller', metrics: { totalCalls: 398, answeredCalls: 312, interestedCount: 89, appointmentsBooked: 45, paymentsCollected: 22, paymentsAmount: 56000, totalTalkTime: 54000, avgConversionRate: 22.4, avgAnswerRate: 78.4, avgSentimentScore: 0.75 } },
  { rank: 5, agentId: 'agent-005', agentName: 'Follow-up Agent', metrics: { totalCalls: 356, answeredCalls: 298, interestedCount: 78, appointmentsBooked: 42, paymentsCollected: 19, paymentsAmount: 48000, totalTalkTime: 48600, avgConversionRate: 21.9, avgAnswerRate: 83.7, avgSentimentScore: 0.78 } },
  { rank: 6, agentId: 'agent-006', agentName: 'Premium Agent', metrics: { totalCalls: 312, answeredCalls: 267, interestedCount: 67, appointmentsBooked: 38, paymentsCollected: 17, paymentsAmount: 42000, totalTalkTime: 42300, avgConversionRate: 21.5, avgAnswerRate: 85.6, avgSentimentScore: 0.81 } },
];

const getMockAgentPerformance = (agentId: string): AgentPerformance => ({
  agentId,
  period: { days: 30, startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date().toISOString() },
  totals: { totalCalls: 542, answeredCalls: 487, interestedCount: 156, appointmentsBooked: 89, paymentsCollected: 45, totalTalkTime: 86400 },
  averages: { callsPerDay: 18.1, conversionRate: 28.8, answerRate: 89.9 },
  dailyTrend: Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const baseCalls = 30 + Math.sin(i * 0.5) * 10;
    return {
      date: date.toISOString().split('T')[0],
      calls: Math.floor(baseCalls + Math.random() * 15),
      answered: Math.floor(baseCalls * 0.85 + Math.random() * 10),
      interested: Math.floor(baseCalls * 0.25 + Math.random() * 5),
      appointments: Math.floor(Math.random() * 6) + 2,
      conversionRate: Math.floor(Math.random() * 15) + 18,
    };
  }),
});

export default AgentPerformancePage;
