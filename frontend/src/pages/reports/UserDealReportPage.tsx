/**
 * User Deal Report - Deal performance by user
 */
import { useState, useEffect } from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface UserDealStats {
  userId: string;
  userName: string;
  reportingManager: string;
  dealsWon: number;
  dealsLost: number;
  dealsPending: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  avgConversionDays: number;
}

interface DealSummary {
  totalDeals: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  dealsWon: number;
  dealsLost: number;
  dealsPending: number;
}

export default function UserDealReportPage() {
  const [data, setData] = useState<{ users: UserDealStats[]; summary: DealSummary } | null>(null);
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
      const response = await api.get('/deal-reports/comprehensive', {
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
      console.error('Failed to load deal report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      setData({
        users: [],
        summary: {
          totalDeals: 0,
          totalValue: 0,
          avgDealSize: 0,
          winRate: 0,
          dealsWon: 0,
          dealsLost: 0,
          dealsPending: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value.toLocaleString()}`;
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
    const headers = ['User', 'Reporting Manager', 'Deals Won', 'Deals Lost', 'Deals Pending', 'Total Value', 'Avg Deal Size', 'Win Rate', 'Avg Conversion Days'];
    const csvRows = [headers.join(',')];
    filteredUsers.forEach((row) => {
      csvRows.push([
        `"${row.userName}"`, `"${row.reportingManager}"`, row.dealsWon, row.dealsLost, row.dealsPending,
        row.totalValue, row.avgDealSize, `${row.winRate}%`, `${row.avgConversionDays} days`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user-deal-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="User Deal Report"
      description="Track deal performance and revenue by user"
      icon={CurrencyDollarIcon}
      iconColor="bg-emerald-500"
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
              <span className="text-xs text-blue-600">Total Deals</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.totalDeals}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">Total Value</span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(data.summary.totalValue)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs text-purple-600">Avg Deal Size</span>
              <span className="text-sm font-bold text-purple-700">{formatCurrency(data.summary.avgDealSize)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-xs text-orange-600">Win Rate</span>
              <span className="text-sm font-bold text-orange-700">{data.summary.winRate}%</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs text-emerald-600">Won</span>
              <span className="text-sm font-bold text-emerald-700">{data.summary.dealsWon}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-600">Lost</span>
              <span className="text-sm font-bold text-red-700">{data.summary.dealsLost}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-xs text-yellow-600">Pending</span>
              <span className="text-sm font-bold text-yellow-700">{data.summary.dealsPending}</span>
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
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-green-50">Won</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-red-50">Lost</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-yellow-50">Pending</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider bg-emerald-50">Total Value</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Avg Deal Size</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-orange-50">Win Rate</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Avg Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                        {searchValue ? 'No users match your search' : 'No deal data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.userName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.reportingManager}</td>
                        <td className="px-4 py-3 text-sm text-center bg-green-50/30">
                          <span className="text-green-600 font-bold">{row.dealsWon}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-red-50/30">
                          <span className="text-red-500">{row.dealsLost}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-yellow-50/30">
                          <span className="text-yellow-600">{row.dealsPending}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right bg-emerald-50/30">
                          <span className="font-bold text-emerald-700">{formatCurrency(row.totalValue)}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-slate-700">
                          {formatCurrency(row.avgDealSize)}
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-orange-50/30">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.winRate >= 35 ? 'bg-green-100 text-green-700' :
                            row.winRate >= 25 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {row.winRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-slate-600">
                          {row.avgConversionDays > 0 ? `${row.avgConversionDays} days` : '-'}
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
