/**
 * Campaign Report - Overall campaign performance
 */
import { useState, useEffect } from 'react';
import { MegaphoneIcon, UserGroupIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable, DateRange } from './components/ReportTemplate';
import { campaignReportsService, SourceConversion } from '../../services/campaign-reports.service';
import toast from 'react-hot-toast';

interface CampaignData {
  campaign: string;
  status: string;
  leads: number;
  contacted: number;
  qualified: number;
  converted: number;
  conversionRate: string;
  revenue: string;
  cost: string;
  roi: string;
}

export default function CampaignReportPage() {
  const [data, setData] = useState<any>(null);
  const [filteredData, setFilteredData] = useState<CampaignData[]>([]);
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

  // Filter data when search changes
  useEffect(() => {
    if (!data?.campaigns) {
      setFilteredData([]);
      return;
    }

    if (!searchValue.trim()) {
      setFilteredData(data.campaigns);
      return;
    }

    const search = searchValue.toLowerCase();
    const filtered = data.campaigns.filter((row: CampaignData) =>
      row.campaign.toLowerCase().includes(search) ||
      row.status.toLowerCase().includes(search)
    );
    setFilteredData(filtered);
  }, [searchValue, data]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch real data from API - source conversion data by lead source with date filter
      const sourceConversion = await campaignReportsService.getSourceConversion({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // Map source conversion data to campaign format
      const campaigns: CampaignData[] = sourceConversion.map((source: SourceConversion) => ({
        campaign: source.sourceName,
        status: 'active',
        leads: source.leads,
        contacted: source.contacted,
        qualified: source.qualified,
        converted: source.conversions,
        conversionRate: `${source.conversionRate}%`,
        revenue: '-',
        cost: '-',
        roi: '-',
      }));

      // Calculate summary
      const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
      const totalConversions = campaigns.reduce((sum, c) => sum + c.converted, 0);

      setData({
        summary: {
          totalCampaigns: campaigns.length,
          activeLeads: totalLeads,
          totalConversions: totalConversions,
          totalRevenue: '-',
        },
        campaigns: campaigns,
      });
    } catch (error: any) {
      console.error('Failed to load campaign report:', error);
      toast.error('Failed to load campaign report');
      setData({
        summary: { totalCampaigns: 0, activeLeads: 0, totalConversions: 0, totalRevenue: '-' },
        campaigns: [],
      });
    }
    setIsLoading(false);
  };

  const handleExport = () => {
    if (!data || !data.campaigns || data.campaigns.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Create CSV content
      const headers = ['Campaign', 'Status', 'Leads', 'Contacted', 'Qualified', 'Converted', 'Conv. Rate', 'Revenue', 'ROI'];
      const csvRows = [headers.join(',')];

      data.campaigns.forEach((row: CampaignData) => {
        const values = [
          `"${row.campaign}"`,
          row.status,
          row.leads,
          row.contacted,
          row.qualified,
          row.converted,
          row.conversionRate,
          `"${row.revenue}"`,
          row.roi,
        ];
        csvRows.push(values.join(','));
      });

      // Add summary row
      csvRows.push('');
      csvRows.push(`"Summary","","${data.summary.activeLeads}","","","${data.summary.totalConversions}","","${data.summary.totalRevenue}",""`);

      const csvContent = csvRows.join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `campaign-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const columns = [
    { key: 'campaign', label: 'Campaign' },
    { key: 'status', label: 'Status', align: 'center' as const, render: (val: string) => (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${val === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
        {val.charAt(0).toUpperCase() + val.slice(1)}
      </span>
    )},
    { key: 'leads', label: 'Leads', align: 'center' as const },
    { key: 'contacted', label: 'Contacted', align: 'center' as const },
    { key: 'qualified', label: 'Qualified', align: 'center' as const, render: (val: number) => <span className="text-purple-600">{val}</span> },
    { key: 'converted', label: 'Converted', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-bold">{val}</span> },
    { key: 'conversionRate', label: 'Conv. Rate', align: 'center' as const, render: (val: string) => {
      const num = parseFloat(val);
      return <span className={`font-medium ${num >= 12 ? 'text-green-600' : num >= 10 ? 'text-yellow-600' : 'text-red-600'}`}>{val}</span>;
    }},
    { key: 'revenue', label: 'Revenue', align: 'center' as const, render: (val: string) => <span className="font-bold text-green-700">{val}</span> },
    { key: 'roi', label: 'ROI', align: 'center' as const, render: (val: string) => <span className="text-blue-600 font-medium">{val}</span> },
  ];

  return (
    <ReportTemplate
      title="Campaign Report"
      description="Overview of all campaign performance metrics"
      icon={MegaphoneIcon}
      iconColor="bg-rose-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      showDateFilter={true}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search campaigns..."
    >
      {data && (
        <div className="space-y-3">
          <ReportStatsGrid>
            <ReportStatCard label="Total Sources" value={data.summary.totalCampaigns} icon={MegaphoneIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Total Leads" value={data.summary.activeLeads} icon={UserGroupIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Conversions" value={data.summary.totalConversions} icon={ChartBarIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="Revenue" value={data.summary.totalRevenue} icon={CurrencyDollarIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable
            columns={columns}
            data={filteredData}
            emptyMessage={searchValue ? "No campaigns match your search" : "No data available for this period"}
          />
        </div>
      )}
    </ReportTemplate>
  );
}
