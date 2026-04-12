/**
 * User Deal Report - Deal performance by user
 */
import { useState, useEffect } from 'react';
import { CurrencyDollarIcon, TrophyIcon, ChartBarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable, DateRange } from './components/ReportTemplate';
import toast from 'react-hot-toast';

export default function UserDealReportPage() {
  const [data, setData] = useState<any>(null);
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
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      summary: { totalDeals: 245, totalValue: '$1,850,000', avgDealSize: '$7,551', winRate: '32.5%' },
      users: [
        { user: 'John Smith', dealsWon: 18, dealsLost: 35, dealsPending: 12, totalValue: '$285,000', avgDealSize: '$15,833', winRate: '34.0%', conversionTime: '18 days' },
        { user: 'Sarah Johnson', dealsWon: 25, dealsLost: 42, dealsPending: 18, totalValue: '$425,000', avgDealSize: '$17,000', winRate: '37.3%', conversionTime: '15 days' },
        { user: 'Mike Wilson', dealsWon: 12, dealsLost: 38, dealsPending: 8, totalValue: '$165,000', avgDealSize: '$13,750', winRate: '24.0%', conversionTime: '22 days' },
        { user: 'Emily Brown', dealsWon: 22, dealsLost: 40, dealsPending: 15, totalValue: '$385,000', avgDealSize: '$17,500', winRate: '35.5%', conversionTime: '16 days' },
        { user: 'David Lee', dealsWon: 8, dealsLost: 32, dealsPending: 15, totalValue: '$115,000', avgDealSize: '$14,375', winRate: '20.0%', conversionTime: '25 days' },
      ],
    });
    setIsLoading(false);
  };

  // Filter users by search
  const filteredUsers = data?.users.filter((u: any) =>
    !searchValue.trim() || u.user.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleExport = () => {
    if (!filteredUsers.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['User', 'Deals Won', 'Deals Lost', 'Deals Pending', 'Total Value', 'Avg Deal Size', 'Win Rate', 'Avg Conversion Time'];
    const csvRows = [headers.join(',')];
    filteredUsers.forEach((row: any) => {
      csvRows.push([
        `"${row.user}"`, row.dealsWon, row.dealsLost, row.dealsPending, `"${row.totalValue}"`, `"${row.avgDealSize}"`, row.winRate, `"${row.conversionTime}"`
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

  const columns = [
    { key: 'user', label: 'User' },
    { key: 'dealsWon', label: 'Won', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-bold">{val}</span> },
    { key: 'dealsLost', label: 'Lost', align: 'center' as const, render: (val: number) => <span className="text-red-500">{val}</span> },
    { key: 'dealsPending', label: 'Pending', align: 'center' as const, render: (val: number) => <span className="text-yellow-600">{val}</span> },
    { key: 'totalValue', label: 'Total Value', align: 'center' as const, render: (val: string) => <span className="font-bold text-green-700">{val}</span> },
    { key: 'avgDealSize', label: 'Avg Deal Size', align: 'center' as const },
    { key: 'winRate', label: 'Win Rate', align: 'center' as const, render: (val: string) => {
      const num = parseFloat(val);
      return <span className={`px-2 py-1 rounded text-xs font-medium ${num >= 35 ? 'bg-green-100 text-green-700' : num >= 25 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{val}</span>;
    }},
    { key: 'conversionTime', label: 'Avg Conversion', align: 'center' as const },
  ];

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
      searchPlaceholder="Search by user..."
    >
      {data && (
        <div className="space-y-3">
          <ReportStatsGrid>
            <ReportStatCard label="Total Deals" value={data.summary.totalDeals} icon={ChartBarIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Total Value" value={data.summary.totalValue} icon={CurrencyDollarIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Avg Deal Size" value={data.summary.avgDealSize} icon={ArrowTrendingUpIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="Win Rate" value={data.summary.winRate} icon={TrophyIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable columns={columns} data={filteredUsers} emptyMessage={searchValue ? "No users match your search" : "No deal data available"} />
        </div>
      )}
    </ReportTemplate>
  );
}
