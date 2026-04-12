/**
 * Lead Disposition Report - Calls connected/not connected with status counts
 */
import { useState, useEffect } from 'react';
import { FunnelIcon, PhoneIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable, DateRange } from './components/ReportTemplate';
import { callReportsService, LeadDispositionData } from '../../services/call-reports.service';
import toast from 'react-hot-toast';

export default function LeadDispositionReportPage() {
  const [data, setData] = useState<LeadDispositionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    console.log('[LeadDisposition] loadData called');
    setIsLoading(true);
    setError(null);
    try {
      console.log('[LeadDisposition] Calling API...');
      const result = await callReportsService.getLeadDisposition();
      console.log('[LeadDisposition] API response:', result);
      setData(result);
    } catch (err: any) {
      console.error('[LeadDisposition] Failed to load data:', err);
      console.error('[LeadDisposition] Error response:', err.response);
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      console.log('[LeadDisposition] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  // Filter data by search
  const filteredDispositions = data?.dispositions.filter(d =>
    !searchValue.trim() || d.user.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleExport = () => {
    if (!filteredDispositions.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['User', 'Total Calls', 'Connected', 'Not Connected', 'Interested', 'Not Interested', 'Callback', 'Converted', 'No Answer', 'Busy', 'Wrong Number'];
    const csvRows = [headers.join(',')];
    filteredDispositions.forEach((row: any) => {
      csvRows.push([
        `"${row.user}"`, row.totalCalls, row.connected, row.notConnected, row.interested,
        row.notInterested, row.callback, row.converted, row.noAnswer, row.busy, row.wrongNumber
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `lead-disposition-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  const columns = [
    { key: 'user', label: 'User' },
    { key: 'totalCalls', label: 'Total Calls', align: 'center' as const },
    { key: 'connected', label: 'Connected', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-medium">{val}</span> },
    { key: 'notConnected', label: 'Not Connected', align: 'center' as const, render: (val: number) => <span className="text-red-500">{val}</span> },
    { key: 'interested', label: 'Interested', align: 'center' as const, render: (val: number) => <span className="text-blue-600">{val}</span> },
    { key: 'notInterested', label: 'Not Interested', align: 'center' as const },
    { key: 'callback', label: 'Callback', align: 'center' as const, render: (val: number) => <span className="text-orange-500">{val}</span> },
    { key: 'converted', label: 'Converted', align: 'center' as const, render: (val: number) => <span className="text-emerald-600 font-bold">{val}</span> },
    { key: 'noAnswer', label: 'No Answer', align: 'center' as const },
    { key: 'busy', label: 'Busy', align: 'center' as const },
    { key: 'wrongNumber', label: 'Wrong #', align: 'center' as const },
  ];

  return (
    <ReportTemplate
      title="Lead Disposition Report"
      description="Analysis of calls connected, not connected along with status wise count"
      icon={FunnelIcon}
      iconColor="bg-purple-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by user..."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Calls" value={data.summary.totalCalls} icon={PhoneIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Connected" value={data.summary.connected} icon={CheckCircleIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Not Connected" value={data.summary.notConnected} icon={XCircleIcon} iconColor="bg-red-500" />
            <ReportStatCard label="Connection Rate" value={data.summary.connectionRate} icon={FunnelIcon} iconColor="bg-purple-500" />
          </ReportStatsGrid>
          {filteredDispositions.length > 0 ? (
            <ReportTable columns={columns} data={filteredDispositions} emptyMessage={searchValue ? "No users match your search" : "No call data available"} />
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchValue ? "No users match your search" : "No call data available for the selected period"}
            </div>
          )}
        </div>
      )}
    </ReportTemplate>
  );
}
