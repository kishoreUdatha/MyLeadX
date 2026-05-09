import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDownTrayIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ClockIcon,
  EyeIcon,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { messagingPortalApi } from '../../services/messaging.service';

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

interface CampaignReport {
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

const ReportsPage = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [stats, setStats] = useState({
    totalMessages: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    pending: 0,
    deliveryRate: 0,
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [channelStats, setChannelStats] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignReport[]>([]);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [summaryData, trendsData, channelData, campaignsData] = await Promise.all([
        messagingPortalApi.getReportsSummary(dateRange.startDate, dateRange.endDate),
        messagingPortalApi.getDashboardTrends().catch(() => []),
        messagingPortalApi.getDashboardChannelStats().catch(() => ({ distribution: [], totalByChannel: [] })),
        messagingPortalApi.listCampaigns(1, 10, { status: 'COMPLETED' }).catch(() => ({ jobs: [] })),
      ]);

      const cs = summaryData.campaignStats;
      setStats({
        totalMessages: cs.totalMessages,
        sent: cs.sent,
        delivered: cs.delivered,
        failed: cs.failed,
        pending: cs.totalMessages - cs.sent - cs.failed,
        deliveryRate: cs.sent > 0 ? Math.round((cs.delivered / cs.sent) * 100) : 0,
      });

      setTrendData(trendsData || []);
      setChannelStats(channelData?.totalByChannel || []);
      setCampaigns((campaignsData?.jobs || []).map((j: any) => ({
        id: j.id, name: j.name, channel: j.channel, totalCount: j.totalCount,
        sentCount: j.sentCount, deliveredCount: j.deliveredCount || 0,
        failedCount: j.failedCount, status: j.status, createdAt: j.createdAt,
      })));
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const csv = [
      ['Campaign', 'Channel', 'Total', 'Sent', 'Delivered', 'Failed', 'Date'].join(','),
      ...campaigns.map(c => [c.name || c.id.slice(0, 8), c.channel, c.totalCount, c.sentCount, c.deliveredCount, c.failedCount, new Date(c.createdAt).toLocaleDateString()].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `report-${dateRange.startDate}-${dateRange.endDate}.csv`;
    a.click();
  };

  const getChannelIcon = (ch: string) => {
    if (ch?.toLowerCase() === 'sms') return <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />;
    if (ch?.toLowerCase() === 'whatsapp') return <WhatsAppIcon className="h-3.5 w-3.5" />;
    return <DevicePhoneMobileIcon className="h-3.5 w-3.5" />;
  };

  const pieData = [
    { name: 'Delivered', value: stats.delivered, color: '#22C55E' },
    { name: 'Failed', value: stats.failed, color: '#EF4444' },
    { name: 'Pending', value: stats.pending, color: '#F59E0B' },
  ].filter(d => d.value > 0);

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Reports & Analytics</h1>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm">
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="px-2 py-1 border border-gray-200 rounded text-xs" />
            <span className="text-gray-400">to</span>
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="px-2 py-1 border border-gray-200 rounded text-xs" />
          </div>
          <button onClick={downloadReport} className="flex items-center px-2.5 py-1.5 bg-white border border-gray-200 rounded text-xs text-gray-600 hover:bg-gray-50">
            <ArrowDownTrayIcon className="h-3.5 w-3.5 mr-1" /> Export
          </button>
        </div>
      </div>

      {/* Stats Row - Compact */}
      <div className="grid grid-cols-6 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Total</p>
          <p className="text-lg font-semibold text-gray-900">{stats.totalMessages.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Sent</p>
          <p className="text-lg font-semibold text-blue-600">{stats.sent.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Delivered</p>
          <p className="text-lg font-semibold text-green-600">{stats.delivered.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Failed</p>
          <p className="text-lg font-semibold text-red-600">{stats.failed.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pending</p>
          <p className="text-lg font-semibold text-yellow-600">{stats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Rate</p>
          <p className={`text-lg font-semibold ${stats.deliveryRate >= 80 ? 'text-green-600' : stats.deliveryRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>{stats.deliveryRate}%</p>
        </div>
      </div>

      {/* Charts Row - Compact */}
      <div className="grid grid-cols-12 gap-4">
        {/* Trend Chart */}
        <div className="col-span-8 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-700">Message Trends (7 days)</p>
            <div className="flex items-center space-x-3 text-[10px] text-gray-500">
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-1"></span>Sent</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Delivered</span>
              <span className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>Failed</span>
            </div>
          </div>
          <div className="h-36">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gSent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDel" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '6px', border: '1px solid #e5e7eb' }} />
                  <Area type="monotone" dataKey="sent" stroke="#3B82F6" strokeWidth={1.5} fill="url(#gSent)" />
                  <Area type="monotone" dataKey="delivered" stroke="#22C55E" strokeWidth={1.5} fill="url(#gDel)" />
                  <Area type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No trend data</div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="col-span-4 bg-white rounded-lg border border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-700 mb-2">Status Distribution</p>
          <div className="h-28">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={45} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">No data</div>
            )}
          </div>
          <div className="flex justify-center space-x-3 text-[10px] text-gray-500">
            <span className="flex items-center"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>Delivered</span>
            <span className="flex items-center"><span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-1"></span>Failed</span>
            <span className="flex items-center"><span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mr-1"></span>Pending</span>
          </div>
        </div>
      </div>

      {/* Channel Stats - Compact */}
      <div className="grid grid-cols-3 gap-3">
        {['SMS', 'WHATSAPP', 'RCS'].map(ch => {
          const data = channelStats.find(c => c.channel === ch) || { sent: 0, delivered: 0, failed: 0 };
          const color = ch === 'SMS' ? 'blue' : ch === 'WHATSAPP' ? 'green' : 'purple';
          return (
            <div key={ch} className={`bg-${color}-50 rounded-lg border border-${color}-100 p-3`}>
              <div className="flex items-center space-x-2 mb-2">
                <span className={`p-1 bg-${color}-100 text-${color}-600 rounded`}>{getChannelIcon(ch)}</span>
                <span className="text-xs font-medium text-gray-700">{ch}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{data.sent}</p>
                  <p className="text-[10px] text-gray-500">Sent</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-600">{data.delivered}</p>
                  <p className="text-[10px] text-gray-500">Delivered</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600">{data.failed}</p>
                  <p className="text-[10px] text-gray-500">Failed</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Campaign Table - Compact */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
          <p className="text-xs font-medium text-gray-700">Recent Campaigns</p>
          <Link to="/messaging-portal/campaigns" className="text-[10px] text-primary-600 hover:underline">View all</Link>
        </div>
        {campaigns.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Channel</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Total</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Delivered</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Failed</th>
                <th className="px-3 py-2 text-center text-[10px] font-medium text-gray-500 uppercase">Rate</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {campaigns.map(c => {
                const rate = c.totalCount > 0 ? Math.round((c.deliveredCount / c.totalCount) * 100) : 0;
                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[120px]">{c.name || c.id.slice(0, 8)}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] ${
                        c.channel === 'SMS' ? 'bg-blue-100 text-blue-700' :
                        c.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {getChannelIcon(c.channel)}<span className="ml-1">{c.channel}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-600">{c.totalCount}</td>
                    <td className="px-3 py-2 text-center text-blue-600">{c.sentCount}</td>
                    <td className="px-3 py-2 text-center text-green-600">{c.deliveredCount}</td>
                    <td className="px-3 py-2 text-center text-red-600">{c.failedCount}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-gray-500">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                    <td className="px-3 py-2">
                      <Link to={`/messaging-portal/campaigns/${c.id}`} className="text-gray-400 hover:text-primary-600"><EyeIcon className="h-3.5 w-3.5" /></Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="px-3 py-8 text-center text-xs text-gray-400">No campaigns yet</div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
