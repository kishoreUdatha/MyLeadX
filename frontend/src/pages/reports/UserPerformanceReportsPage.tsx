import { useEffect, useState, useCallback } from 'react';
import {
  UserGroupIcon,
  PhoneIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  CurrencyRupeeIcon,
  ClockIcon,
  ArrowPathIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  userPerformanceReportsService,
  ComprehensiveUserPerformanceReport,
  ReportFilters,
} from '../../services/user-performance-reports.service';

type TabType = 'summary' | 'leads' | 'calls' | 'followups' | 'conversions';

// Mock data for fallback when API fails or times out
const getMockReport = (): ComprehensiveUserPerformanceReport => ({
  summary: [
    { userId: '1', userName: 'John Smith', email: 'john@example.com', role: 'Sales Executive', branch: 'Main Branch', leadsHandled: 45, leadsAssigned: 50, callsMade: 120, callsConnected: 85, followUpsCompleted: 38, followUpsPending: 12, conversions: 8, conversionRate: '16.0', closureValue: 450000, avgResponseTime: 15, lastActivity: new Date().toISOString() },
    { userId: '2', userName: 'Sarah Johnson', email: 'sarah@example.com', role: 'Senior Sales', branch: 'Main Branch', leadsHandled: 62, leadsAssigned: 65, callsMade: 180, callsConnected: 145, followUpsCompleted: 55, followUpsPending: 8, conversions: 15, conversionRate: '23.1', closureValue: 820000, avgResponseTime: 10, lastActivity: new Date().toISOString() },
    { userId: '3', userName: 'Mike Wilson', email: 'mike@example.com', role: 'Sales Executive', branch: 'North Branch', leadsHandled: 38, leadsAssigned: 42, callsMade: 95, callsConnected: 68, followUpsCompleted: 30, followUpsPending: 15, conversions: 5, conversionRate: '11.9', closureValue: 275000, avgResponseTime: 22, lastActivity: new Date().toISOString() },
  ],
  leadsPerUser: [
    { userId: '1', userName: 'John Smith', totalAssigned: 50, newLeads: 12, contacted: 20, qualified: 10, converted: 8, lost: 0 },
    { userId: '2', userName: 'Sarah Johnson', totalAssigned: 65, newLeads: 8, contacted: 25, qualified: 17, converted: 15, lost: 0 },
    { userId: '3', userName: 'Mike Wilson', totalAssigned: 42, newLeads: 15, contacted: 12, qualified: 10, converted: 5, lost: 0 },
  ],
  callsPerUser: [
    { userId: '1', userName: 'John Smith', totalCalls: 120, connectedCalls: 85, missedCalls: 35, avgDuration: 180, totalDuration: 15300, callbacksScheduled: 12 },
    { userId: '2', userName: 'Sarah Johnson', totalCalls: 180, connectedCalls: 145, missedCalls: 35, avgDuration: 210, totalDuration: 30450, callbacksScheduled: 8 },
    { userId: '3', userName: 'Mike Wilson', totalCalls: 95, connectedCalls: 68, missedCalls: 27, avgDuration: 165, totalDuration: 11220, callbacksScheduled: 15 },
  ],
  followUpsPerUser: [
    { userId: '1', userName: 'John Smith', totalScheduled: 50, completed: 38, pending: 8, overdue: 4, completionRate: '76.0' },
    { userId: '2', userName: 'Sarah Johnson', totalScheduled: 63, completed: 55, pending: 6, overdue: 2, completionRate: '87.3' },
    { userId: '3', userName: 'Mike Wilson', totalScheduled: 45, completed: 30, pending: 10, overdue: 5, completionRate: '66.7' },
  ],
  conversionPerUser: [
    { userId: '1', userName: 'John Smith', leadsAssigned: 50, conversions: 8, conversionRate: '16.0', avgConversionTime: 14, closureValue: 450000 },
    { userId: '2', userName: 'Sarah Johnson', leadsAssigned: 65, conversions: 15, conversionRate: '23.1', avgConversionTime: 10, closureValue: 820000 },
    { userId: '3', userName: 'Mike Wilson', leadsAssigned: 42, conversions: 5, conversionRate: '11.9', avgConversionTime: 18, closureValue: 275000 },
  ],
});

export default function UserPerformanceReportsPage() {
  const [report, setReport] = useState<ComprehensiveUserPerformanceReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useMockData, setUseMockData] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [datePreset, setDatePreset] = useState('thisMonth');

  // Initialize filters with current month dates
  const getInitialFilters = (): ReportFilters => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  };

  const [filters, setFilters] = useState<ReportFilters>(getInitialFilters);

  // Load report function
  const loadReport = async (currentFilters: ReportFilters) => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Loading report with filters:', currentFilters);
      const data = await userPerformanceReportsService.getComprehensive(currentFilters);
      console.log('Report loaded successfully:', data);
      setReport(data);
      setUseMockData(false);
    } catch (err: any) {
      console.error('Failed to load report:', err);
      const errorMsg = err?.response?.status === 401
        ? 'Session expired. Please login again.'
        : 'Failed to load data. Showing sample data.';
      setError(errorMsg);
      // Use mock data as fallback
      setReport(getMockReport());
      setUseMockData(true);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Load on mount
  useEffect(() => {
    loadReport(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle date preset change
  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      default:
        return;
    }

    const newFilters = {
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0]
    };
    setFilters(newFilters);
    loadReport(newFilters);
  };

  // Manual refresh
  const handleRefresh = () => {
    loadReport(filters);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm text-slate-500">Loading performance data...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <UserGroupIcon className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">No Performance Data</h3>
        <p className="text-sm text-slate-500 mb-4">Unable to load performance reports. Please try again.</p>
        <button onClick={handleRefresh} className="btn btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  const { summary, leadsPerUser, callsPerUser, followUpsPerUser, conversionPerUser } = report;

  // Calculate totals
  const totals = {
    leads: summary.reduce((sum, u) => sum + u.leadsAssigned, 0),
    calls: summary.reduce((sum, u) => sum + u.callsMade, 0),
    followUps: summary.reduce((sum, u) => sum + u.followUpsCompleted, 0),
    conversions: summary.reduce((sum, u) => sum + u.conversions, 0),
    closureValue: summary.reduce((sum, u) => sum + u.closureValue, 0),
  };

  return (
    <div className="space-y-4">
      {/* Mock Data Banner */}
      {useMockData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-amber-800 font-medium">Showing sample data</p>
            <p className="text-xs text-amber-600">Could not load live data from server. Displaying sample performance data for demonstration.</p>
          </div>
          <button onClick={handleRefresh} className="btn btn-secondary text-xs py-1 px-2 flex items-center gap-1">
            <ArrowPathIcon className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">User Performance Reports</h1>
          <p className="text-slate-500 text-xs">Track staff performance and productivity</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={datePreset} onChange={(e) => handleDatePresetChange(e.target.value)} className="input text-sm py-1.5 px-3">
            <option value="today">Today</option>
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
          <button onClick={handleRefresh} disabled={isLoading} className="btn btn-secondary py-1.5 px-3 disabled:opacity-50">
            <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="card p-3 text-center">
          <UserGroupIcon className="w-5 h-5 mx-auto text-primary-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totals.leads}</p>
          <p className="text-xs text-slate-500">Leads Assigned</p>
        </div>
        <div className="card p-3 text-center">
          <PhoneIcon className="w-5 h-5 mx-auto text-success-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totals.calls}</p>
          <p className="text-xs text-slate-500">Calls Made</p>
        </div>
        <div className="card p-3 text-center">
          <CheckCircleIcon className="w-5 h-5 mx-auto text-warning-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totals.followUps}</p>
          <p className="text-xs text-slate-500">Follow-ups Done</p>
        </div>
        <div className="card p-3 text-center">
          <ArrowTrendingUpIcon className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totals.conversions}</p>
          <p className="text-xs text-slate-500">Conversions</p>
        </div>
        <div className="card p-3 text-center">
          <CurrencyRupeeIcon className="w-5 h-5 mx-auto text-green-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{formatCurrency(totals.closureValue)}</p>
          <p className="text-xs text-slate-500">Closure Value</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { key: 'summary', label: 'Summary' },
            { key: 'leads', label: 'Leads' },
            { key: 'calls', label: 'Calls' },
            { key: 'followups', label: 'Follow-ups' },
            { key: 'conversions', label: 'Conversions' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Table */}
      {activeTab === 'summary' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">#</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Leads</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Calls</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Follow-ups</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Conversions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Rate</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary.map((user, idx) => (
                <tr key={user.userId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm">{idx + 1}</td>
                  <td className="px-3 py-2">
                    <p className="text-sm font-medium text-slate-900">{user.userName}</p>
                    <p className="text-xs text-slate-500">{user.role}</p>
                  </td>
                  <td className="px-3 py-2 text-sm text-right">{user.leadsAssigned}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.callsMade}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.followUpsCompleted}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-primary-600">{user.conversions}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.conversionRate}%</td>
                  <td className="px-3 py-2 text-sm text-right font-medium text-success-600">{formatCurrency(user.closureValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leads Per User */}
      {activeTab === 'leads' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">New</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Contacted</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qualified</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Converted</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Lost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadsPerUser.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{user.userName}</td>
                  <td className="px-3 py-2 text-sm text-right font-bold">{user.totalAssigned}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.newLeads}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.contacted}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.qualified}</td>
                  <td className="px-3 py-2 text-sm text-right text-success-600">{user.converted}</td>
                  <td className="px-3 py-2 text-sm text-right text-danger-600">{user.lost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Calls Per User */}
      {activeTab === 'calls' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Connected</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Missed</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Avg Duration</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {callsPerUser.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{user.userName}</td>
                  <td className="px-3 py-2 text-sm text-right font-bold">{user.totalCalls}</td>
                  <td className="px-3 py-2 text-sm text-right text-success-600">{user.connectedCalls}</td>
                  <td className="px-3 py-2 text-sm text-right text-danger-600">{user.missedCalls}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatDuration(user.avgDuration)}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatDuration(user.totalDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Follow-ups Per User */}
      {activeTab === 'followups' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Scheduled</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Completed</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Pending</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Overdue</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {followUpsPerUser.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{user.userName}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.totalScheduled}</td>
                  <td className="px-3 py-2 text-sm text-right text-success-600">{user.completed}</td>
                  <td className="px-3 py-2 text-sm text-right text-warning-600">{user.pending}</td>
                  <td className="px-3 py-2 text-sm text-right text-danger-600">{user.overdue}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium">{user.completionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Conversions Per User */}
      {activeTab === 'conversions' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Leads</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Conversions</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Rate</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Closure Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversionPerUser.map((user) => (
                <tr key={user.userId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{user.userName}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.leadsAssigned}</td>
                  <td className="px-3 py-2 text-sm text-right font-bold text-primary-600">{user.conversions}</td>
                  <td className="px-3 py-2 text-sm text-right">{user.conversionRate}%</td>
                  <td className="px-3 py-2 text-sm text-right font-bold text-success-600">{formatCurrency(user.closureValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
