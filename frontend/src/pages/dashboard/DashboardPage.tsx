import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadStats } from '../../store/slices/leadSlice';
import { fetchStats } from '../../store/slices/rawImportSlice';
import subscriptionService, { Subscription } from '../../services/subscription.service';
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
  ResponsiveContainer,
} from 'recharts';
import {
  UsersIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  PlusIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
} from '@heroicons/react/24/outline';

const STATUS_COLORS: Record<string, string> = {
  NEW: '#3B82F6',
  CONTACTED: '#F59E0B',
  QUALIFIED: '#10B981',
  NEGOTIATION: '#8B5CF6',
  WON: '#059669',
  LOST: '#EF4444',
  FOLLOW_UP: '#F97316',
};

const PIE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#3B82F6'];
const SOURCE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#06B6D4', '#EF4444', '#84CC16'];

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats } = useSelector((state: RootState) => state.leads);
  const { stats: rawImportStats } = useSelector((state: RootState) => state.rawImports);
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());

    // Fetch subscription info
    subscriptionService.getCurrentSubscription()
      .then(setSubscription)
      .catch(console.error);

    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => {
      dispatch(fetchLeadStats());
      dispatch(fetchStats());
      setLastRefresh(new Date());
    }, 30000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
    };
  }, [dispatch]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STATUS_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  const sourceBarData = stats?.bySource
    ? Object.entries(stats.bySource).map(([source, count], index) => ({
        name: source.replace(/_/g, ' '),
        leads: count as number,
        color: SOURCE_COLORS[index % SOURCE_COLORS.length],
      }))
    : [];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-xl">
          <p className="font-medium">{payload[0].name || payload[0].payload?.name}</p>
          <p className="text-gray-300">{payload[0].value} leads</p>
        </div>
      );
    }
    return null;
  };

  const handleRefresh = () => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());
  };

  // Check if user is on free plan or trial
  const isFreePlan = subscription?.planId === 'free' || !subscription?.planId;
  const isTrial = subscription?.status === 'TRIAL';
  const showUpgradeBanner = isFreePlan || isTrial;

  return (
    <div className="space-y-4">
      {/* Upgrade Banner for Free/Trial Users */}
      {showUpgradeBanner && subscription && (
        <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 rounded-xl p-4 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-white/20 rounded-xl">
                {isFreePlan ? (
                  <SparklesIcon className="w-6 h-6" />
                ) : (
                  <RocketLaunchIcon className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="font-semibold text-lg">
                  {isFreePlan ? "You're on the Free Plan" : `${subscription.plan?.name || 'Trial'} - Trial Period`}
                </h3>
                <p className="text-white/80 text-sm mt-0.5">
                  {isFreePlan
                    ? `Upgrade to unlock AI calling, WhatsApp campaigns, and more features.`
                    : `Your trial ends on ${new Date(subscription.currentPeriodEnd || '').toLocaleDateString()}. Subscribe to continue.`
                  }
                </p>

                {/* Usage Summary */}
                <div className="flex flex-wrap gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/60">Leads:</span>
                    <span className="font-medium">
                      {subscription.usage?.leadsCount || 0} / {subscription.plan?.features?.maxLeads === -1 ? '∞' : (subscription.plan?.features?.maxLeads || 100)}
                    </span>
                  </div>
                  {subscription.plan?.features?.aiCallsPerMonth > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">AI Calls:</span>
                      <span className="font-medium">
                        {subscription.usage?.aiCallsCount || 0} / {subscription.plan?.features?.aiCallsPerMonth || 0}
                      </span>
                    </div>
                  )}
                  {subscription.plan?.features?.emailsPerMonth > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/60">Emails:</span>
                      <span className="font-medium">
                        {subscription.usage?.emailsCount || 0} / {subscription.plan?.features?.emailsPerMonth || 100}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <Link
                to="/subscription"
                className="flex-1 sm:flex-none px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium text-sm text-center transition-colors"
              >
                View Plan
              </Link>
              <Link
                to="/pricing"
                className="flex-1 sm:flex-none px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 rounded-lg font-semibold text-sm text-center transition-colors"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header with Inline Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Greeting */}
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {getGreeting()}, {user?.firstName}
              </h1>
              <p className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>

            {/* Inline Stats */}
            <div className="hidden md:flex items-center gap-6 pl-6 border-l border-gray-200">
              <Link to="/leads" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-gray-900">{stats?.total || 0}</span>
                <span className="text-xs text-gray-500">Total<br/>Leads</span>
              </Link>
              <Link to="/leads?status=NEW" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-green-600">{stats?.todayCount || 0}</span>
                <span className="text-xs text-gray-500">New<br/>Today</span>
              </Link>
              <Link to="/raw-imports" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-purple-600">{rawImportStats?.pendingRecords || 0}</span>
                <span className="text-xs text-gray-500">Pending<br/>Review</span>
              </Link>
              <Link to="/raw-imports" className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded">
                <span className="text-2xl font-bold text-amber-600">{rawImportStats?.interestedRecords || 0}</span>
                <span className="text-xs text-gray-500">Ready to<br/>Convert</span>
              </Link>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="w-4 h-4" />
            </button>
            <Link
              to="/leads/bulk-upload"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              Upload
            </Link>
            <Link
              to="/leads/new"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              Add Lead
            </Link>
          </div>
        </div>

        {/* Mobile Stats Row */}
        <div className="flex md:hidden items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <Link to="/leads" className="text-center">
            <p className="text-xl font-bold text-gray-900">{stats?.total || 0}</p>
            <p className="text-xs text-gray-500">Leads</p>
          </Link>
          <Link to="/leads?status=NEW" className="text-center">
            <p className="text-xl font-bold text-green-600">{stats?.todayCount || 0}</p>
            <p className="text-xs text-gray-500">Today</p>
          </Link>
          <Link to="/raw-imports" className="text-center">
            <p className="text-xl font-bold text-purple-600">{rawImportStats?.pendingRecords || 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </Link>
          <Link to="/raw-imports" className="text-center">
            <p className="text-xl font-bold text-amber-600">{rawImportStats?.interestedRecords || 0}</p>
            <p className="text-xs text-gray-500">Convert</p>
          </Link>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead Status Pie Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              View all <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {statusPieData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <UsersIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No leads yet</p>
              </div>
            </div>
          )}

          {/* Legend */}
          {statusPieData.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {statusPieData.map((entry, index) => (
                <div key={index} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-gray-600">{entry.name}</span>
                  <span className="font-medium text-gray-900">{entry.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lead Sources Bar Chart */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Sources</h2>
            <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Import <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          {sourceBarData.length > 0 ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} layout="vertical" margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={80}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#374151' }}
                    tickFormatter={(v) => (v.length > 10 ? v.substring(0, 10) + '..' : v)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="leads" radius={[0, 4, 4, 0]} barSize={20}>
                    {sourceBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <div className="text-center">
                <DocumentArrowUpIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No source data</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Pipeline & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Import Pipeline */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Import Pipeline</h2>
            <Link to="/raw-imports" className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Manage <ArrowUpRightIcon className="w-3 h-3" />
            </Link>
          </div>

          <div className="grid grid-cols-5 gap-2">
            <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
              <p className="text-xl font-bold text-gray-900">{rawImportStats?.totalRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-100">
              <p className="text-xl font-bold text-yellow-600">{rawImportStats?.pendingRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Pending</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
              <p className="text-xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Assigned</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xl font-bold text-green-600">{rawImportStats?.interestedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Interested</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
              <p className="text-xl font-bold text-purple-600">{rawImportStats?.convertedRecords || 0}</p>
              <p className="text-xs text-gray-500 mt-0.5">Converted</p>
            </div>
          </div>

          {/* Progress Bar */}
          {(rawImportStats?.totalRecords || 0) > 0 && (
            <div className="mt-4">
              <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-yellow-400"
                  style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-green-500"
                  style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
                <div
                  className="bg-purple-500"
                  style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              to="/leads/bulk-upload"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                <DocumentArrowUpIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Bulk Upload</p>
                <p className="text-xs text-gray-500">Import CSV/Excel</p>
              </div>
            </Link>
            <Link
              to="/raw-imports"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <UsersIcon className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Review Imports</p>
                <p className="text-xs text-gray-500">Assign & convert</p>
              </div>
            </Link>
            <Link
              to="/voice-ai"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">AI Voice Agents</p>
                <p className="text-xs text-gray-500">Manage agents</p>
              </div>
            </Link>
            <Link
              to="/outbound-calls"
              className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 border border-gray-100 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Call Campaigns</p>
                <p className="text-xs text-gray-500">Outbound calls</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
