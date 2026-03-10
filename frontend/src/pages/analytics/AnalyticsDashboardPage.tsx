import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  ChartBarIcon,
  UserGroupIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  KeyIcon,
  ArrowPathIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  PhoneIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface DashboardSummary {
  period: string;
  apiUsage: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    successRate: string;
    byEndpoint: Record<string, number>;
    byMethod: Record<string, number>;
  };
  leads: {
    totalLeads: number;
    newLeads: number;
    convertedLeads: number;
    conversionRate: string;
    bySource: Record<string, number>;
    byStage: Record<string, number>;
  };
  messaging: {
    sms: { sent: number; delivered: number; failed: number; deliveryRate: string };
    email: { sent: number; delivered: number; failed: number; deliveryRate: string };
    whatsapp: { sent: number; delivered: number; failed: number; deliveryRate: string };
    total: { sent: number; delivered: number; failed: number };
  };
  contactLists: {
    totalLists: number;
    activeLists: number;
    totalContacts: number;
    activeContacts: number;
    unsubscribed: number;
    bounced: number;
    healthScore: number;
  };
  conversations: {
    totalConversations: number;
    openConversations: number;
    closedConversations: number;
    avgMessagesPerConversation: string;
    byChannel: Record<string, number>;
  };
}

interface UsageTrendData {
  date: string;
  total: number;
  api: number;
  user: number;
}

const COLORS = {
  primary: '#6366F1',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  pink: '#EC4899',
  cyan: '#06B6D4',
  orange: '#F97316',
};

const PIE_COLORS = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

const AnalyticsDashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [usageTrend, setUsageTrend] = useState<UsageTrendData[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(30);

  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, [dateRange]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();

      const [summaryRes, trendRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/analytics/usage-trend', { params: { startDate, endDate, interval: 'day' } }),
      ]);

      setSummary(summaryRes.data.data);
      setUsageTrend(trendRes.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set mock data for demo
      setSummary(getMockData());
      setUsageTrend(getMockTrendData());
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
      setRefreshCountdown(30);
    }
  };

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Prepare chart data
  const leadSourceData = summary?.leads.bySource
    ? Object.entries(summary.leads.bySource).map(([name, value], index) => ({
        name: name.replace(/_/g, ' '),
        value,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  const messagingData = summary
    ? [
        { name: 'SMS', sent: summary.messaging.sms.sent, delivered: summary.messaging.sms.delivered, failed: summary.messaging.sms.failed },
        { name: 'Email', sent: summary.messaging.email.sent, delivered: summary.messaging.email.delivered, failed: summary.messaging.email.failed },
        { name: 'WhatsApp', sent: summary.messaging.whatsapp.sent, delivered: summary.messaging.whatsapp.delivered, failed: summary.messaging.whatsapp.failed },
      ]
    : [];

  const conversationChannelData = summary?.conversations.byChannel
    ? Object.entries(summary.conversations.byChannel).map(([name, value], index) => ({
        name,
        value,
        color: PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  const apiMethodData = summary?.apiUsage.byMethod
    ? Object.entries(summary.apiUsage.byMethod).map(([name, value]) => ({
        name,
        requests: value,
      }))
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compact Header with Inline Stats */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title & Controls */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Analytics</h1>
              <p className="text-xs text-gray-500">Performance overview</p>
            </div>
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-gray-400">
                  Updated {lastUpdated.toLocaleTimeString()} • {refreshCountdown}s
                </span>
              )}
              <button
                onClick={fetchDashboardData}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Refresh now"
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7">7 days</option>
                <option value="30">30 days</option>
                <option value="90">90 days</option>
              </select>
            </div>
          </div>

          {/* Inline KPI Stats */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <UserGroupIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary?.leads.totalLeads || 0)}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <KeyIcon className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary?.apiUsage.totalRequests || 0)}</p>
                <p className="text-xs text-gray-500">API Calls</p>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <EnvelopeIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary?.messaging.total.sent || 0)}</p>
                <p className="text-xs text-gray-500">Messages</p>
              </div>
            </div>

            <div className="w-px h-8 bg-gray-200 hidden sm:block"></div>

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{formatNumber(summary?.conversations.totalConversations || 0)}</p>
                <p className="text-xs text-gray-500">Chats</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Trend Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Usage Trend</h2>
            <p className="text-sm text-gray-500">Daily activity over time</p>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={usageTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorApi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6B7280', fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="total"
                stroke={COLORS.primary}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorTotal)"
                name="Total"
              />
              <Area
                type="monotone"
                dataKey="api"
                stroke={COLORS.success}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorApi)"
                name="API"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Sources Pie Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead Sources</h3>
          <p className="text-sm text-gray-500 mb-4">Distribution by acquisition channel</p>
          <div className="h-72">
            {leadSourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={leadSourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {leadSourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No lead source data" />
            )}
          </div>
        </div>

        {/* Messaging Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Messaging Performance</h3>
          <p className="text-sm text-gray-500 mb-4">Messages by channel and status</p>
          <div className="h-72">
            {messagingData.some(d => d.sent > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={messagingData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #E5E7EB',
                      borderRadius: '12px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill={COLORS.primary} radius={[4, 4, 0, 0]} name="Sent" />
                  <Bar dataKey="delivered" fill={COLORS.success} radius={[4, 4, 0, 0]} name="Delivered" />
                  <Bar dataKey="failed" fill={COLORS.danger} radius={[4, 4, 0, 0]} name="Failed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No messaging data" />
            )}
          </div>
        </div>

        {/* Conversations by Channel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Conversations by Channel</h3>
          <p className="text-sm text-gray-500 mb-4">Communication channel distribution</p>
          <div className="h-72">
            {conversationChannelData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={conversationChannelData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {conversationChannelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No conversation data" />
            )}
          </div>
        </div>

        {/* API Methods */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">API Usage by Method</h3>
          <p className="text-sm text-gray-500 mb-4">Request distribution by HTTP method</p>
          <div className="h-72">
            {apiMethodData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apiMethodData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={true} vertical={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#374151', fontSize: 12, fontWeight: 500 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="requests" radius={[0, 6, 6, 0]} barSize={24}>
                    {apiMethodData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No API usage data" />
            )}
          </div>
        </div>
      </div>

      {/* Contact List Health */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Contact List Health</h3>
            <p className="text-sm text-gray-500">Overall list quality and engagement</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="col-span-2 md:col-span-1 flex items-center justify-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center text-3xl font-bold border-8 ${
                (summary?.contactLists.healthScore || 0) >= 80
                  ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                  : (summary?.contactLists.healthScore || 0) >= 60
                  ? 'border-amber-500 text-amber-600 bg-amber-50'
                  : 'border-red-500 text-red-600 bg-red-50'
              }`}
            >
              {summary?.contactLists.healthScore || 0}%
            </div>
          </div>
          <HealthStatCard label="Total Contacts" value={summary?.contactLists.totalContacts || 0} color="gray" />
          <HealthStatCard label="Active" value={summary?.contactLists.activeContacts || 0} color="emerald" />
          <HealthStatCard label="Unsubscribed" value={summary?.contactLists.unsubscribed || 0} color="amber" />
          <HealthStatCard label="Bounced" value={summary?.contactLists.bounced || 0} color="red" />
        </div>
      </div>
    </div>
  );
};

// Health Stat Card
const HealthStatCard = ({ label, value, color }: { label: string; value: number; color: string }) => {
  const colorStyles: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };

  return (
    <div className={`rounded-xl border p-4 text-center ${colorStyles[color]}`}>
      <p className="text-2xl font-bold">{value.toLocaleString()}</p>
      <p className="text-sm mt-1 opacity-80">{label}</p>
    </div>
  );
};

// Empty State Component
const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <ChartBarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">{message}</p>
    </div>
  </div>
);

// Mock data for demo
const getMockData = (): DashboardSummary => ({
  period: '30 days',
  apiUsage: {
    totalRequests: 12847,
    successfulRequests: 12456,
    failedRequests: 391,
    successRate: '96.9',
    byEndpoint: { '/leads': 4521, '/users': 2341, '/forms': 1892, '/campaigns': 1456 },
    byMethod: { GET: 8234, POST: 3456, PUT: 892, DELETE: 265 },
  },
  leads: {
    totalLeads: 1247,
    newLeads: 342,
    convertedLeads: 156,
    conversionRate: '12.5',
    bySource: { MANUAL: 234, FORM: 456, WEBSITE: 189, BULK_UPLOAD: 234, REFERRAL: 134 },
    byStage: { NEW: 342, CONTACTED: 289, QUALIFIED: 234, NEGOTIATION: 178, WON: 156, LOST: 48 },
  },
  messaging: {
    sms: { sent: 2341, delivered: 2156, failed: 185, deliveryRate: '92.1' },
    email: { sent: 4567, delivered: 4234, failed: 333, deliveryRate: '92.7' },
    whatsapp: { sent: 1892, delivered: 1756, failed: 136, deliveryRate: '92.8' },
    total: { sent: 8800, delivered: 8146, failed: 654 },
  },
  contactLists: {
    totalLists: 12,
    activeLists: 8,
    totalContacts: 15678,
    activeContacts: 12456,
    unsubscribed: 2341,
    bounced: 881,
    healthScore: 79,
  },
  conversations: {
    totalConversations: 3456,
    openConversations: 234,
    closedConversations: 3222,
    avgMessagesPerConversation: '8.4',
    byChannel: { SMS: 1234, WhatsApp: 1567, Email: 456, Voice: 199 },
  },
});

const getMockTrendData = (): UsageTrendData[] => {
  const data: UsageTrendData[] = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      total: Math.floor(Math.random() * 500) + 200,
      api: Math.floor(Math.random() * 300) + 100,
      user: Math.floor(Math.random() * 200) + 50,
    });
  }
  return data;
};

export default AnalyticsDashboardPage;
