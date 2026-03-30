/**
 * Campaign Analytics Components
 */

import React from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Phone,
  Users,
  TrendingUp,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Target,
  BarChart3,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Funnel,
  FunnelChart,
  LabelList,
} from 'recharts';
import {
  AnalyticsData,
  Campaign,
  ChartDataPoint,
  HourlyChartData,
  DurationChartData,
  DailyTrendChartData,
  FunnelDataPoint,
} from '../campaign-analytics.types';
import { OUTCOME_COLORS, OUTCOME_LABELS, formatDuration } from '../campaign-analytics.constants';

// Loading State
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Error State
interface ErrorStateProps {
  error: string;
  onBack: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onBack }) => (
  <div className="p-6 text-center">
    <p className="text-red-600">{error}</p>
    <button onClick={onBack} className="mt-4 text-blue-600 hover:underline">
      Back to Campaign
    </button>
  </div>
);

// Header
interface HeaderProps {
  campaign: Campaign | null;
  onBack: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ campaign, onBack, onRefresh, onExport }) => (
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition">
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
        <p className="text-gray-600">{campaign?.name}</p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <button onClick={onRefresh} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg" title="Refresh">
        <RefreshCw size={20} />
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        <Download size={18} />
        Export CSV
      </button>
    </div>
  </div>
);

// Summary Cards
interface SummaryCardsProps {
  analytics: AnalyticsData;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ analytics }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Users className="text-blue-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalContacts}</p>
          <p className="text-sm text-gray-500">Contacts</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Phone className="text-indigo-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{analytics.summary.totalCalls}</p>
          <p className="text-sm text-gray-500">Calls Made</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <TrendingUp className="text-green-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{analytics.summary.answerRate}%</p>
          <p className="text-sm text-gray-500">Answer Rate</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Target className="text-purple-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{analytics.summary.interestRate}%</p>
          <p className="text-sm text-gray-500">Interest Rate</p>
        </div>
      </div>
    </div>

    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-lg">
          <Clock className="text-amber-600" size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(analytics.summary.avgDuration)}</p>
          <p className="text-sm text-gray-500">Avg Duration</p>
        </div>
      </div>
    </div>
  </div>
);

// Outcome Chart
interface OutcomeChartProps {
  data: ChartDataPoint[];
}

export const OutcomeChart: React.FC<OutcomeChartProps> = ({ data }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <BarChart3 size={20} />
      Call Outcomes
    </h2>
    {data.length > 0 ? (
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="h-72 flex items-center justify-center text-gray-500">
        No call data available
      </div>
    )}
  </div>
);

// Conversion Funnel Chart
interface ConversionFunnelChartProps {
  data: FunnelDataPoint[];
}

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <TrendingUp size={20} />
      Conversion Funnel
    </h2>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart>
          <Tooltip />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
            <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Hourly Distribution Chart
interface HourlyChartProps {
  data: HourlyChartData[];
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ data }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Clock size={20} />
      Hourly Call Distribution
    </h2>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="total" name="Total Calls" fill="#6366F1" />
          <Bar dataKey="answered" name="Answered" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Duration Distribution Chart
interface DurationChartProps {
  data: DurationChartData[];
}

export const DurationChart: React.FC<DurationChartProps> = ({ data }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Clock size={20} />
      Call Duration Distribution
    </h2>
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="range" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" name="Calls" fill="#8B5CF6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// Sentiment Analysis Chart
interface SentimentChartProps {
  data: ChartDataPoint[];
  analytics: AnalyticsData;
}

export const SentimentChart: React.FC<SentimentChartProps> = ({ data, analytics }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <ThumbsUp size={20} />
      Sentiment Analysis
    </h2>
    {data.length > 0 ? (
      <>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <ThumbsUp size={16} className="text-green-500" />
            <span className="text-sm text-gray-600">
              Positive: {analytics.sentimentDistribution.POSITIVE || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Minus size={16} className="text-gray-500" />
            <span className="text-sm text-gray-600">
              Neutral: {analytics.sentimentDistribution.NEUTRAL || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown size={16} className="text-red-500" />
            <span className="text-sm text-gray-600">
              Negative: {analytics.sentimentDistribution.NEGATIVE || 0}
            </span>
          </div>
        </div>
      </>
    ) : (
      <div className="h-48 flex items-center justify-center text-gray-500">
        No sentiment data available
      </div>
    )}
  </div>
);

// Daily Trend Chart
interface DailyTrendChartProps {
  data: DailyTrendChartData[];
}

export const DailyTrendChart: React.FC<DailyTrendChartProps> = ({ data }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <TrendingUp size={20} />
      Daily Call Trend
    </h2>
    {data.length > 0 ? (
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="calls" name="Total Calls" stroke="#6366F1" strokeWidth={2} />
            <Line type="monotone" dataKey="successful" name="Successful" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="h-64 flex items-center justify-center text-gray-500">
        No daily trend data available
      </div>
    )}
  </div>
);

// Statistics Table
interface StatisticsTableProps {
  analytics: AnalyticsData;
}

export const StatisticsTable: React.FC<StatisticsTableProps> = ({ analytics }) => (
  <div className="bg-white rounded-lg shadow border p-4">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Statistics</h2>
    <div className="grid md:grid-cols-3 gap-6">
      <div>
        <h3 className="font-medium text-gray-700 mb-2">Call Outcomes</h3>
        <div className="space-y-2">
          {Object.entries(analytics.outcomeDistribution).map(([outcome, count]) => (
            <div key={outcome} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: OUTCOME_COLORS[outcome] || '#9CA3AF' }}
                />
                <span className="text-sm text-gray-600">{OUTCOME_LABELS[outcome] || outcome}</span>
              </div>
              <span className="font-medium text-gray-900">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-700 mb-2">Conversion Metrics</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Contact to Call Rate</span>
            <span className="font-medium text-gray-900">
              {analytics.summary.totalContacts > 0
                ? Math.round((analytics.summary.totalCalls / analytics.summary.totalContacts) * 100)
                : 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Answer Rate</span>
            <span className="font-medium text-gray-900">{analytics.summary.answerRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Interest Rate (of answered)</span>
            <span className="font-medium text-gray-900">{analytics.summary.interestRate}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Conversion Rate</span>
            <span className="font-medium text-gray-900">{analytics.summary.conversionRate}%</span>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium text-gray-700 mb-2">Performance Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Contacts</span>
            <span className="font-medium text-gray-900">{analytics.summary.totalContacts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Calls Made</span>
            <span className="font-medium text-gray-900">{analytics.summary.totalCalls}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Interested Leads</span>
            <span className="font-medium text-green-600">{analytics.summary.interestedCalls}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Converted</span>
            <span className="font-medium text-purple-600">{analytics.summary.convertedCalls}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
);
