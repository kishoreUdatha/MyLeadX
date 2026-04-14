/**
 * User Call Report - Call activities of users
 */
import { useState, useEffect } from 'react';
import { PhoneIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UserCallRow {
  no: number;
  username: string;
  oderId: string;
  mobileNumber: string;
  totalCalls: number;
  totalCallsConnected: number;
  totalUnconnectedCalls: number;
  totalDisposedCount: number;
  totalCallTime: string;
  avgCallTime: string;
}

interface Summary {
  totalCalls: number;
  totalConnected: number;
}

export default function UserCallReportPage() {
  const [data, setData] = useState<{ users: UserCallRow[]; summary: Summary } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/call-reports/user-call-report', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setData(response.data.data);
    } catch (err: any) {
      console.error('Failed to load user call data:', err);
      setError(err.response?.data?.message || 'Failed to load report data');
      toast.error('Failed to load call report');
    } finally {
      setIsLoading(false);
    }
  };

  const users = data?.users || [];
  const summary = data?.summary || { totalCalls: 0, totalConnected: 0 };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    !searchValue.trim() ||
    user.username.toLowerCase().includes(searchValue.toLowerCase()) ||
    user.mobileNumber.includes(searchValue)
  );

  const handleExport = () => {
    if (!filteredUsers.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['No', 'Username', 'Mobile Number', 'Total Calls', 'Connected', 'Unconnected', 'Disposed', 'Total Call Time', 'Avg Call Time'];
    const csvRows = [headers.join(',')];
    filteredUsers.forEach((row) => {
      csvRows.push([
        row.no, `"${row.username}"`, row.mobileNumber, row.totalCalls, row.totalCallsConnected,
        row.totalUnconnectedCalls, row.totalDisposedCount, `"${row.totalCallTime}"`, `"${row.avgCallTime}"`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user-call-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="User Call Report"
      description="Insights into call related activities of the users"
      icon={PhoneIcon}
      iconColor="bg-green-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by username or mobile..."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <ReportStatsGrid>
          <ReportStatCard label="Total Calls" value={summary.totalCalls} icon={PhoneIcon} iconColor="bg-blue-500" />
          <ReportStatCard label="Connected Calls" value={summary.totalConnected} icon={CheckCircleIcon} iconColor="bg-green-500" />
        </ReportStatsGrid>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">No</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Username</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Mobile Number</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Total Calls</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Connected</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Unconnected</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Disposed</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-indigo-50">Total Call Time</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-indigo-50">Avg Call Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((row) => (
                    <tr key={row.no} className="hover:bg-slate-50">
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{row.no}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{row.username}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 font-mono">{row.mobileNumber}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-semibold text-blue-700 bg-blue-50/50">{row.totalCalls}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-green-600 bg-green-50/50">{row.totalCallsConnected}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-red-500 bg-red-50/50">{row.totalUnconnectedCalls}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-orange-50/50">{row.totalDisposedCount}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-medium bg-indigo-50/50">{row.totalCallTime}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-indigo-50/50">{row.avgCallTime}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-sm text-slate-500">
                      No call data found for the selected date range
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredUsers.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td className="px-3 py-3 text-sm"></td>
                    <td className="px-3 py-3 text-sm font-bold">TOTAL ({filteredUsers.length})</td>
                    <td className="px-3 py-3 text-sm"></td>
                    <td className="px-3 py-3 text-sm text-center font-bold text-blue-700">{filteredUsers.reduce((sum, r) => sum + r.totalCalls, 0)}</td>
                    <td className="px-3 py-3 text-sm text-center text-green-600">{filteredUsers.reduce((sum, r) => sum + r.totalCallsConnected, 0)}</td>
                    <td className="px-3 py-3 text-sm text-center text-red-500">{filteredUsers.reduce((sum, r) => sum + r.totalUnconnectedCalls, 0)}</td>
                    <td className="px-3 py-3 text-sm text-center">{filteredUsers.reduce((sum, r) => sum + r.totalDisposedCount, 0)}</td>
                    <td className="px-3 py-3 text-sm text-center">-</td>
                    <td className="px-3 py-3 text-sm text-center">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </ReportTemplate>
  );
}
