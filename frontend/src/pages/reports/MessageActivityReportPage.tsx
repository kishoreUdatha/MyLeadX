/**
 * Message Activity Report - SMS/WhatsApp/Email activity tracking
 */
import { useState, useEffect } from 'react';
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UserMessageStats {
  userId: string;
  userName: string;
  reportingManager: string;
  sms: number;
  whatsapp: number;
  email: number;
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

interface MessageSummary {
  totalMessages: number;
  sms: number;
  whatsapp: number;
  email: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

export default function MessageActivityReportPage() {
  const [data, setData] = useState<{ users: UserMessageStats[]; summary: MessageSummary } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/message-activity-reports/comprehensive', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      const report = response.data.data.report;
      setData({
        users: report.users,
        summary: report.summary,
      });
    } catch (error: any) {
      console.error('Failed to load message activity report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      setData({
        users: [],
        summary: {
          totalMessages: 0,
          sms: 0,
          whatsapp: 0,
          email: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
          deliveryRate: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter users by search
  const filteredUsers = data?.users.filter((u) =>
    !searchValue.trim() ||
    u.userName.toLowerCase().includes(searchValue.toLowerCase()) ||
    u.reportingManager.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleExport = () => {
    if (!filteredUsers.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['User', 'Reporting Manager', 'SMS', 'WhatsApp', 'Email', 'Total', 'Delivered', 'Failed', 'Pending', 'Delivery Rate'];
    const csvRows = [headers.join(',')];
    filteredUsers.forEach((row) => {
      csvRows.push([
        `"${row.userName}"`, `"${row.reportingManager}"`, row.sms, row.whatsapp, row.email,
        row.total, row.delivered, row.failed, row.pending, `${row.deliveryRate}%`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `message-activity-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="Message Activity Report"
      description="Track SMS, WhatsApp, and Email messaging activities"
      icon={ChatBubbleLeftRightIcon}
      iconColor="bg-cyan-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by user or manager..."
    >
      {data && (
        <div className="space-y-4">
          {/* Compact Summary Stats */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">Total Messages</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.totalMessages}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs text-purple-600">SMS</span>
              <span className="text-sm font-bold text-purple-700">{data.summary.sms}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">WhatsApp</span>
              <span className="text-sm font-bold text-green-700">{data.summary.whatsapp}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="text-xs text-indigo-600">Email</span>
              <span className="text-sm font-bold text-indigo-700">{data.summary.email}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs text-emerald-600">Delivered</span>
              <span className="text-sm font-bold text-emerald-700">{data.summary.delivered}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-600">Failed</span>
              <span className="text-sm font-bold text-red-700">{data.summary.failed}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-xs text-orange-600">Delivery Rate</span>
              <span className="text-sm font-bold text-orange-700">{data.summary.deliveryRate}%</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reporting Manager</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-purple-50">SMS</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-green-50">WhatsApp</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-indigo-50">Email</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-blue-50">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-emerald-50">Delivered</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-red-50">Failed</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-yellow-50">Pending</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-orange-50">Delivery Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                        {searchValue ? 'No users match your search' : 'No message activity data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.userName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.reportingManager}</td>
                        <td className="px-4 py-3 text-sm text-center bg-purple-50/30">
                          <span className="text-purple-600 font-medium">{row.sms}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-green-50/30">
                          <span className="text-green-600 font-medium">{row.whatsapp}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-indigo-50/30">
                          <span className="text-indigo-600 font-medium">{row.email}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-blue-50/30">
                          <span className="font-bold text-slate-900">{row.total}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-emerald-50/30">
                          <span className="text-emerald-600 font-medium">{row.delivered}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-red-50/30">
                          <span className="text-red-500">{row.failed}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-yellow-50/30">
                          <span className="text-yellow-600">{row.pending}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-orange-50/30">
                          <span className={`font-medium ${
                            row.deliveryRate >= 95 ? 'text-green-600' :
                            row.deliveryRate >= 90 ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {row.deliveryRate}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredUsers.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Showing {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              </div>
            )}
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
