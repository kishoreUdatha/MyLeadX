import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import api from '../../services/api';

interface AnalyticsData {
  summary: {
    totalContacts: number;
    totalCalls: number;
    answeredCalls: number;
    interestedCalls: number;
    convertedCalls: number;
    avgDuration: number;
    answerRate: number;
    interestRate: number;
    conversionRate: number;
  };
  outcomeDistribution: Record<string, number>;
  hourlyDistribution: Record<number, { total: number; answered: number }>;
  durationBuckets: Record<string, number>;
  sentimentDistribution: Record<string, number>;
  conversionFunnel: {
    contacts: number;
    called: number;
    answered: number;
    interested: number;
    converted: number;
  };
  dailyTrend: Record<string, { calls: number; successful: number }>;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
}

const OUTCOME_COLORS: Record<string, string> = {
  INTERESTED: '#10B981',
  NOT_INTERESTED: '#EF4444',
  CALLBACK_REQUESTED: '#3B82F6',
  NEEDS_FOLLOWUP: '#F59E0B',
  CONVERTED: '#8B5CF6',
  NO_ANSWER: '#6B7280',
  BUSY: '#F97316',
  VOICEMAIL: '#EC4899',
  NO_OUTCOME: '#9CA3AF',
};

const OUTCOME_LABELS: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback Requested',
  NEEDS_FOLLOWUP: 'Needs Follow-up',
  CONVERTED: 'Converted',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  VOICEMAIL: 'Voicemail',
  NO_OUTCOME: 'No Outcome',
};

const SENTIMENT_COLORS = {
  POSITIVE: '#10B981',
  NEUTRAL: '#6B7280',
  NEGATIVE: '#EF4444',
};

const FUNNEL_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#10B981'];

export const CampaignAnalytics: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [campaignRes, analyticsRes] = await Promise.all([
        api.get(`/outbound-calls/campaigns/${id}`),
        api.get(`/outbound-calls/campaigns/${id}/analytics`),
      ]);

      if (campaignRes.data.success) {
        setCampaign(campaignRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportToCSV = () => {
    if (!analytics) return;

    const rows = [
      ['Campaign Analytics Report'],
      ['Campaign', campaign?.name || ''],
      ['Generated', new Date().toLocaleString()],
      [],
      ['Summary Metrics'],
      ['Metric', 'Value'],
      ['Total Contacts', analytics.summary.totalContacts],
      ['Total Calls', analytics.summary.totalCalls],
      ['Answered Calls', analytics.summary.answeredCalls],
      ['Interested Calls', analytics.summary.interestedCalls],
      ['Converted Calls', analytics.summary.convertedCalls],
      ['Average Duration', formatDuration(analytics.summary.avgDuration)],
      ['Answer Rate', `${analytics.summary.answerRate}%`],
      ['Interest Rate', `${analytics.summary.interestRate}%`],
      ['Conversion Rate', `${analytics.summary.conversionRate}%`],
      [],
      ['Outcome Distribution'],
      ['Outcome', 'Count'],
      ...Object.entries(analytics.outcomeDistribution).map(([outcome, count]) => [
        OUTCOME_LABELS[outcome] || outcome,
        count,
      ]),
      [],
      ['Sentiment Distribution'],
      ['Sentiment', 'Count'],
      ...Object.entries(analytics.sentimentDistribution).map(([sentiment, count]) => [
        sentiment,
        count,
      ]),
      [],
      ['Hourly Distribution'],
      ['Hour', 'Total Calls', 'Answered'],
      ...Object.entries(analytics.hourlyDistribution).map(([hour, data]) => [
        `${hour}:00`,
        data.total,
        data.answered,
      ]),
      [],
      ['Call Duration Distribution'],
      ['Duration Range', 'Count'],
      ...Object.entries(analytics.durationBuckets).map(([range, count]) => [range, count]),
    ];

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campaign-analytics-${campaign?.name || id}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">{error || 'Failed to load analytics'}</p>
        <button
          onClick={() => navigate(`/outbound-calls/campaigns/${id}`)}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Campaign
        </button>
      </div>
    );
  }

  // Prepare chart data
  const outcomeData = Object.entries(analytics.outcomeDistribution).map(([name, value]) => ({
    name: OUTCOME_LABELS[name] || name,
    value,
    color: OUTCOME_COLORS[name] || '#9CA3AF',
  }));

  const hourlyData = Object.entries(analytics.hourlyDistribution).map(([hour, data]) => ({
    hour: `${hour}:00`,
    total: data.total,
    answered: data.answered,
    rate: data.total > 0 ? Math.round((data.answered / data.total) * 100) : 0,
  }));

  const durationData = Object.entries(analytics.durationBuckets).map(([range, count]) => ({
    range,
    count,
  }));

  const sentimentData = Object.entries(analytics.sentimentDistribution)
    .filter(([_, count]) => count > 0)
    .map(([name, value]) => ({
      name,
      value,
      color: SENTIMENT_COLORS[name as keyof typeof SENTIMENT_COLORS] || '#9CA3AF',
    }));

  const funnelData = [
    { name: 'Contacts', value: analytics.conversionFunnel.contacts, fill: FUNNEL_COLORS[0] },
    { name: 'Called', value: analytics.conversionFunnel.called, fill: FUNNEL_COLORS[1] },
    { name: 'Answered', value: analytics.conversionFunnel.answered, fill: FUNNEL_COLORS[2] },
    { name: 'Interested', value: analytics.conversionFunnel.interested, fill: FUNNEL_COLORS[3] },
    { name: 'Converted', value: analytics.conversionFunnel.converted, fill: FUNNEL_COLORS[4] },
  ];

  const dailyTrendData = Object.entries(analytics.dailyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls: data.calls,
      successful: data.successful,
    }));

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(`/outbound-calls/campaigns/${id}`)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Campaign Analytics</h1>
            <p className="text-gray-600">{campaign?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
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

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Call Outcome Distribution */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Call Outcomes
          </h2>
          {outcomeData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {outcomeData.map((entry, index) => (
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

        {/* Conversion Funnel */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Conversion Funnel
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <FunnelChart>
                <Tooltip />
                <Funnel
                  dataKey="value"
                  data={funnelData}
                  isAnimationActive
                >
                  <LabelList position="right" fill="#000" stroke="none" dataKey="name" />
                  <LabelList position="center" fill="#fff" stroke="none" dataKey="value" />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Hourly Call Distribution
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
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

        {/* Call Duration Distribution */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} />
            Call Duration Distribution
          </h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={durationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" name="Calls" fill="#8B5CF6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Sentiment Analysis */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ThumbsUp size={20} />
            Sentiment Analysis
          </h2>
          {sentimentData.length > 0 ? (
            <>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sentimentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sentimentData.map((entry, index) => (
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

        {/* Daily Trend */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Daily Call Trend
          </h2>
          {dailyTrendData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    name="Total Calls"
                    stroke="#6366F1"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    name="Successful"
                    stroke="#10B981"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No daily trend data available
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats Table */}
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
                    <span className="text-sm text-gray-600">
                      {OUTCOME_LABELS[outcome] || outcome}
                    </span>
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
    </div>
  );
};

export default CampaignAnalytics;
