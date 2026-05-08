import { useState, useEffect } from 'react';
import { superAdminService } from '../../services/super-admin.service';
import {
  ClockIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PaperAirplaneIcon,
} from '@heroicons/react/24/outline';

interface TrialStats {
  totalTrials: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
  expiringToday: number;
  expiredNotConverted: number;
  convertedThisMonth: number;
  conversionRate: number;
}

interface TrialOrganization {
  id: string;
  name: string;
  slug: string;
  email: string;
  contactPerson: string | null;
  trialEndsAt: string | null;
  daysRemaining: number;
  subscriptionStatus: string | null;
  createdAt: string;
  usersCount: number;
  leadsCount: number;
}

interface ConversionData {
  month: string;
  year: number;
  trialsStarted: number;
  converted: number;
  expired: number;
  conversionRate: number;
}

export default function TrialManagementPage() {
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [organizations, setOrganizations] = useState<TrialOrganization[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination & filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<'all' | 'expiring_soon' | 'expired' | 'active'>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal states
  const [extendModalOpen, setExtendModalOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<TrialOrganization | null>(null);
  const [extendDays, setExtendDays] = useState(7);
  const [extendReason, setExtendReason] = useState('');
  const [extending, setExtending] = useState(false);

  const [reminderModalOpen, setReminderModalOpen] = useState(false);
  const [reminderType, setReminderType] = useState<'7_days' | '3_days' | '1_day' | 'expired'>('7_days');
  const [sendingReminder, setSendingReminder] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, filter, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, orgsRes, funnelRes] = await Promise.all([
        superAdminService.getTrialStats(),
        superAdminService.getTrialOrganizations({ page, limit: 10, filter, search }),
        superAdminService.getTrialConversionFunnel(6),
      ]);

      setStats(statsRes.data);
      setOrganizations(orgsRes.data);
      setTotalPages(orgsRes.pagination?.totalPages || 1);
      setConversionData(funnelRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load trial data');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleExtendTrial = async () => {
    if (!selectedOrg || !extendReason.trim()) return;

    setExtending(true);
    try {
      await superAdminService.extendTrial(selectedOrg.id, extendDays, extendReason);
      setSuccess(`Extended trial for ${selectedOrg.name} by ${extendDays} days`);
      setExtendModalOpen(false);
      setSelectedOrg(null);
      setExtendDays(7);
      setExtendReason('');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to extend trial');
    } finally {
      setExtending(false);
    }
  };

  const handleSendReminder = async () => {
    if (!selectedOrg) return;

    setSendingReminder(true);
    try {
      await superAdminService.sendTrialReminder(selectedOrg.id, reminderType);
      setSuccess(`Reminder sent to ${selectedOrg.name}`);
      setReminderModalOpen(false);
      setSelectedOrg(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const getStatusBadge = (org: TrialOrganization) => {
    if (org.daysRemaining <= 0) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Expired</span>;
    }
    if (org.daysRemaining <= 3) {
      return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Expiring Soon</span>;
    }
    if (org.daysRemaining <= 7) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded-full">{org.daysRemaining} days left</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">{org.daysRemaining} days left</span>;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trial Management</h1>
          <p className="text-sm text-slate-500 mt-1">
            Track and manage tenant trials, send reminders, and monitor conversions
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-500 hover:text-red-700">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-500 hover:text-green-700">
            <CheckCircleIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.totalTrials}</p>
                <p className="text-xs text-slate-500">Active Trials</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.expiringIn7Days}</p>
                <p className="text-xs text-slate-500">Expiring in 7d</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.expiringIn3Days}</p>
                <p className="text-xs text-slate-500">Expiring in 3d</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.expiringToday}</p>
                <p className="text-xs text-slate-500">Expiring Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <CalendarDaysIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.expiredNotConverted}</p>
                <p className="text-xs text-slate-500">Expired (Lost)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.convertedThisMonth}</p>
                <p className="text-xs text-slate-500">Converted</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</p>
                <p className="text-xs text-slate-500">Conversion</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversion Funnel Chart */}
      {conversionData.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Trial Conversion Funnel</h3>
          <div className="grid grid-cols-6 gap-4">
            {conversionData.map((data, index) => (
              <div key={index} className="text-center">
                <div className="text-sm font-medium text-slate-600 mb-2">
                  {data.month} {data.year}
                </div>
                <div className="space-y-2">
                  <div className="bg-blue-100 rounded p-2">
                    <p className="text-lg font-bold text-blue-700">{data.trialsStarted}</p>
                    <p className="text-xs text-blue-600">Started</p>
                  </div>
                  <div className="bg-green-100 rounded p-2">
                    <p className="text-lg font-bold text-green-700">{data.converted}</p>
                    <p className="text-xs text-green-600">Converted</p>
                  </div>
                  <div className="bg-red-100 rounded p-2">
                    <p className="text-lg font-bold text-red-700">{data.expired}</p>
                    <p className="text-xs text-red-600">Expired</p>
                  </div>
                  <div className="bg-purple-100 rounded p-2">
                    <p className="text-lg font-bold text-purple-700">{data.conversionRate}%</p>
                    <p className="text-xs text-purple-600">Rate</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or slug..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </form>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value as any); setPage(1); }}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Trials</option>
              <option value="active">Active Trials</option>
              <option value="expiring_soon">Expiring Soon (7 days)</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Organization
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Trial Ends
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Usage
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {organizations.map((org) => (
              <tr key={org.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{org.name}</p>
                    <p className="text-sm text-slate-500">{org.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(org)}
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-slate-600">
                    {org.trialEndsAt
                      ? new Date(org.trialEndsAt).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-slate-600">
                    <p>{org.usersCount} users</p>
                    <p>{org.leadsCount} leads</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => { setSelectedOrg(org); setReminderModalOpen(true); }}
                      className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Send Reminder"
                    >
                      <EnvelopeIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => { setSelectedOrg(org); setExtendModalOpen(true); }}
                      className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                      Extend
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {organizations.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                  No trial organizations found
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Extend Trial Modal */}
      {extendModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Extend Trial</h3>
            <p className="text-slate-600 mb-4">
              Extend trial for <strong>{selectedOrg.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Days to Extend
                </label>
                <select
                  value={extendDays}
                  onChange={(e) => setExtendDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                  <option value={60}>60 days</option>
                  <option value={90}>90 days</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason *
                </label>
                <textarea
                  value={extendReason}
                  onChange={(e) => setExtendReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Why are you extending this trial?"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setExtendModalOpen(false); setSelectedOrg(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrial}
                disabled={extending || !extendReason.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {extending ? 'Extending...' : 'Extend Trial'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Reminder Modal */}
      {reminderModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Send Reminder</h3>
            <p className="text-slate-600 mb-4">
              Send a reminder to <strong>{selectedOrg.name}</strong>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reminder Type
                </label>
                <select
                  value={reminderType}
                  onChange={(e) => setReminderType(e.target.value as any)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="7_days">7 Days Remaining</option>
                  <option value="3_days">3 Days Remaining</option>
                  <option value="1_day">1 Day Remaining (Urgent)</option>
                  <option value="expired">Trial Expired</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setReminderModalOpen(false); setSelectedOrg(null); }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
