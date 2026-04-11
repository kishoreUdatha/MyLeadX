/**
 * Campaign Report - Overall campaign performance
 */
import { useState, useEffect } from 'react';
import { MegaphoneIcon, UserGroupIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable } from './components/ReportTemplate';

export default function CampaignReportPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      summary: { totalCampaigns: 12, activeLeads: 2450, totalConversions: 285, totalRevenue: '$425,000' },
      campaigns: [
        { campaign: 'Facebook Leads Q1', status: 'active', leads: 580, contacted: 520, qualified: 185, converted: 68, conversionRate: '11.7%', revenue: '$125,000', cost: '$8,500', roi: '1,370%' },
        { campaign: 'Google Ads March', status: 'active', leads: 420, contacted: 395, qualified: 145, converted: 52, conversionRate: '12.4%', revenue: '$98,000', cost: '$12,000', roi: '717%' },
        { campaign: 'Instagram Spring', status: 'active', leads: 385, contacted: 340, qualified: 120, converted: 42, conversionRate: '10.9%', revenue: '$72,000', cost: '$6,500', roi: '1,008%' },
        { campaign: 'LinkedIn B2B', status: 'paused', leads: 245, contacted: 220, qualified: 95, converted: 38, conversionRate: '15.5%', revenue: '$85,000', cost: '$15,000', roi: '467%' },
        { campaign: 'Website Forms', status: 'active', leads: 520, contacted: 485, qualified: 195, converted: 58, conversionRate: '11.2%', revenue: '$32,000', cost: '$2,500', roi: '1,180%' },
        { campaign: 'Referral Program', status: 'active', leads: 300, contacted: 290, qualified: 145, converted: 27, conversionRate: '9.0%', revenue: '$13,000', cost: '$1,000', roi: '1,200%' },
      ],
    });
    setIsLoading(false);
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
    <ReportTemplate title="Campaign Report" description="Overview of all campaign performance metrics" icon={MegaphoneIcon} iconColor="bg-rose-500" isLoading={isLoading} onRefresh={loadData}>
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Campaigns" value={data.summary.totalCampaigns} icon={MegaphoneIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Active Leads" value={data.summary.activeLeads} icon={UserGroupIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Total Conversions" value={data.summary.totalConversions} icon={ChartBarIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="Total Revenue" value={data.summary.totalRevenue} icon={CurrencyDollarIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable columns={columns} data={data.campaigns} />
        </div>
      )}
    </ReportTemplate>
  );
}
