import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  PaperAirplaneIcon,
  UsersIcon,
  PlusIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts';
import { messagingPortalApi } from '../../services/messaging.service';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface RecentCampaign {
  id: string;
  name?: string;
  channel: string;
  totalCount: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
}

const DashboardPage = () => {
  const [stats, setStats] = useState({
    smsCredits: 0, whatsappCredits: 0, rcsCredits: 0,
    totalContacts: 0, campaignsSentToday: 0, deliveredToday: 0, deliveryRate: 0,
  });
  const [recentCampaigns, setRecentCampaigns] = useState<RecentCampaign[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [channelStats, setChannelStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadDashboardData(); }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboardData, trendsData, channelData] = await Promise.all([
        messagingPortalApi.getDashboard(),
        messagingPortalApi.getDashboardTrends().catch(() => []),
        messagingPortalApi.getDashboardChannelStats().catch(() => ({ distribution: [], totalByChannel: [] })),
      ]);
      setStats({
        smsCredits: dashboardData.balance?.smsCredits ?? 0,
        whatsappCredits: dashboardData.balance?.whatsappCredits ?? 0,
        rcsCredits: dashboardData.balance?.rcsCredits ?? 0,
        totalContacts: dashboardData.contactCount ?? 0,
        campaignsSentToday: dashboardData.todayStats?.sent ?? 0,
        deliveredToday: dashboardData.todayStats?.delivered ?? 0,
        deliveryRate: dashboardData.todayStats?.deliveryRate ?? 0,
      });
      setRecentCampaigns(dashboardData.recentCampaigns || []);
      setTrendData(trendsData || []);
      setChannelStats(channelData?.totalByChannel || []);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChannelIcon = (ch: string) => {
    if (ch?.toLowerCase() === 'sms') return <ChatBubbleLeftRightIcon className="h-3 w-3" />;
    if (ch?.toLowerCase() === 'whatsapp') return <WhatsAppIcon className="h-3 w-3" />;
    return <DevicePhoneMobileIcon className="h-3 w-3" />;
  };

  // Calculate totals
  const totalSent = trendData.reduce((s, d) => s + d.sent, 0);
  const totalDelivered = trendData.reduce((s, d) => s + d.delivered, 0);
  const totalFailed = trendData.reduce((s, d) => s + d.failed, 0);
  const totalCredits = stats.smsCredits + stats.whatsappCredits + stats.rcsCredits;
  const successRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;

  // Channel distribution data for donut chart
  const channelDistribution = [
    { name: 'SMS', value: channelStats.find(c => c.channel === 'SMS')?.sent || stats.smsCredits > 0 ? 1 : 0, color: '#3B82F6' },
    { name: 'WhatsApp', value: channelStats.find(c => c.channel === 'WHATSAPP')?.sent || 0, color: '#25D366' },
    { name: 'RCS', value: channelStats.find(c => c.channel === 'RCS')?.sent || 0, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  // Delivery status donut
  const deliveryDonut = [
    { name: 'Delivered', value: totalDelivered || 1, color: '#22C55E' },
    { name: 'Failed', value: totalFailed || 0, color: '#EF4444' },
    { name: 'Pending', value: Math.max(0, totalSent - totalDelivered - totalFailed), color: '#F59E0B' },
  ].filter(d => d.value > 0);

  // Credit distribution donut
  const creditDonut = [
    { name: 'SMS', value: stats.smsCredits || 0, color: '#3B82F6' },
    { name: 'WhatsApp', value: stats.whatsappCredits || 0, color: '#25D366' },
    { name: 'RCS', value: stats.rcsCredits || 0, color: '#8B5CF6' },
  ].filter(d => d.value > 0);

  // Channel bar chart data
  const channelBarData = [
    { name: 'SMS', sent: channelStats.find(c => c.channel === 'SMS')?.sent || totalSent, delivered: channelStats.find(c => c.channel === 'SMS')?.delivered || totalDelivered, failed: channelStats.find(c => c.channel === 'SMS')?.failed || totalFailed },
    { name: 'WhatsApp', sent: channelStats.find(c => c.channel === 'WHATSAPP')?.sent || 0, delivered: channelStats.find(c => c.channel === 'WHATSAPP')?.delivered || 0, failed: 0 },
    { name: 'RCS', sent: channelStats.find(c => c.channel === 'RCS')?.sent || 0, delivered: channelStats.find(c => c.channel === 'RCS')?.delivered || 0, failed: 0 },
  ];

  // Weekly comparison data
  const weeklyData = trendData.length > 0 ? trendData : [
    { name: 'Sun', sent: 0, delivered: 0, failed: 0 },
    { name: 'Mon', sent: 0, delivered: 0, failed: 0 },
    { name: 'Tue', sent: 0, delivered: 0, failed: 0 },
    { name: 'Wed', sent: 0, delivered: 0, failed: 0 },
    { name: 'Thu', sent: 0, delivered: 0, failed: 0 },
    { name: 'Fri', sent: totalSent, delivered: totalDelivered, failed: totalFailed },
    { name: 'Sat', sent: 0, delivered: 0, failed: 0 },
  ];

  if (loading) return <div className="flex items-center justify-center h-32"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div></div>;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's your messaging overview.</p>
        </div>
        <Link to="/messaging-portal/campaigns/create" className="flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 shadow-sm">
          <PlusIcon className="h-4 w-4 mr-2" /> New Campaign
        </Link>
      </div>

      {/* Credit Balance Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-4 mb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-primary-100 text-sm">Total Credit Balance</p>
            <p className="text-3xl font-bold">{totalCredits.toLocaleString()}</p>
          </div>
          <div className="flex items-center space-x-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.smsCredits.toLocaleString()}</p>
              <p className="text-primary-200 text-xs">SMS</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.whatsappCredits.toLocaleString()}</p>
              <p className="text-primary-200 text-xs">WhatsApp</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.rcsCredits.toLocaleString()}</p>
              <p className="text-primary-200 text-xs">RCS</p>
            </div>
            <Link to="/messaging-portal/billing" className="ml-4 px-4 py-2 bg-white text-primary-600 text-sm font-medium rounded-lg hover:bg-primary-50">
              Buy Credits
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <PaperAirplaneIcon className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Today</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.campaignsSentToday.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Messages Sent</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircleIcon className="h-5 w-5 text-green-500" />
            <span className="text-xs text-gray-500">{stats.deliveryRate}% rate</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.deliveredToday.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Delivered</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <XCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalFailed.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Failed</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <UsersIcon className="h-5 w-5 text-indigo-500" />
            <Link to="/messaging-portal/contacts" className="text-xs text-primary-600 hover:underline">Manage</Link>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalContacts.toLocaleString()}</p>
          <p className="text-sm text-gray-500">Total Contacts</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Main Chart */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-base font-semibold text-gray-900">Message Activity</p>
              <p className="text-xs text-gray-500">Last 7 days performance</p>
            </div>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center"><span className="w-3 h-3 bg-blue-500 rounded mr-1.5"></span>Sent</span>
              <span className="flex items-center"><span className="w-3 h-3 bg-green-500 rounded mr-1.5"></span>Delivered</span>
              <span className="flex items-center"><span className="w-3 h-3 bg-red-400 rounded mr-1.5"></span>Failed</span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} width={40} />
                <Tooltip contentStyle={{ fontSize: '12px', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="sent" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delivered" fill="#22C55E" radius={[4, 4, 0, 0]} />
                <Bar dataKey="failed" fill="#F87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Rate Donut */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-base font-semibold text-gray-900 mb-1">Delivery Rate</p>
          <p className="text-xs text-gray-500 mb-3">Overall success rate</p>
          <div className="h-44 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deliveryDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {deliveryDonut.map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-3xl font-bold ${successRate >= 80 ? 'text-green-600' : successRate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{successRate}%</span>
              <span className="text-xs text-gray-500">Success</span>
            </div>
          </div>
          <div className="flex justify-center space-x-4 text-xs mt-3">
            <span className="flex items-center"><span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-1.5"></span>Delivered ({totalDelivered})</span>
            <span className="flex items-center"><span className="w-2.5 h-2.5 bg-red-500 rounded-full mr-1.5"></span>Failed ({totalFailed})</span>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-3 gap-4">
        {/* Recent Campaigns */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-base font-semibold text-gray-900">Recent Campaigns</p>
            <Link to="/messaging-portal/campaigns" className="text-sm text-primary-600 hover:underline">View all</Link>
          </div>
          {recentCampaigns.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {recentCampaigns.slice(0, 4).map(c => {
                const rate = c.totalCount > 0 ? Math.round(((c.deliveredCount || 0) / c.totalCount) * 100) : 0;
                return (
                  <Link key={c.id} to={`/messaging-portal/campaigns/${c.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        c.channel === 'SMS' ? 'bg-blue-100 text-blue-600' :
                        c.channel === 'WHATSAPP' ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                      }`}>
                        {getChannelIcon(c.channel)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{c.name || 'Campaign'}</p>
                        <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{c.sentCount}/{c.totalCount}</p>
                        <p className="text-xs text-gray-500">sent</p>
                      </div>
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-500">Delivery</span>
                          <span className={`font-medium ${rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>{rate}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`} style={{ width: `${rate}%` }}></div>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        c.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        c.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>{c.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <PaperAirplaneIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-2">No campaigns yet</p>
              <Link to="/messaging-portal/campaigns/create" className="text-sm text-primary-600 hover:underline">Create your first campaign</Link>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-base font-semibold text-gray-900 mb-4">Quick Actions</p>
          <div className="space-y-2">
            <Link to="/messaging-portal/campaigns/create" className="flex items-center p-3 rounded-lg bg-primary-50 border border-primary-100 hover:bg-primary-100 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-primary-500 text-white flex items-center justify-center mr-3">
                <PaperAirplaneIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Send Campaign</p>
                <p className="text-xs text-gray-500">Create and send messages</p>
              </div>
            </Link>
            <Link to="/messaging-portal/contacts" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mr-3">
                <UsersIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Import Contacts</p>
                <p className="text-xs text-gray-500">Upload CSV or add manually</p>
              </div>
            </Link>
            <Link to="/messaging-portal/templates" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mr-3">
                <ChatBubbleLeftRightIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Message Templates</p>
                <p className="text-xs text-gray-500">Manage DLT templates</p>
              </div>
            </Link>
            <Link to="/messaging-portal/reports" className="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center mr-3">
                <ArrowTrendingUpIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">View Reports</p>
                <p className="text-xs text-gray-500">Analytics and insights</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
