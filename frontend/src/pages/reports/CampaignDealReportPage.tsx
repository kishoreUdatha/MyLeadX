/**
 * Campaign Deal Report - Deal performance by campaign
 */
import { useState, useEffect } from 'react';
import { BanknotesIcon, MegaphoneIcon, TrophyIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable } from './components/ReportTemplate';

export default function CampaignDealReportPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      summary: { totalDeals: 217, totalRevenue: '$425,000', avgDealValue: '$1,959', bestCampaign: 'Facebook Leads Q1' },
      campaigns: [
        { campaign: 'Facebook Leads Q1', deals: 52, totalValue: '$125,000', avgValue: '$2,404', winRate: '11.7%', lostDeals: 15, pipelineValue: '$85,000', cost: '$8,500', roas: '14.7x' },
        { campaign: 'Google Ads March', deals: 38, totalValue: '$98,000', avgValue: '$2,579', winRate: '12.4%', lostDeals: 10, pipelineValue: '$62,000', cost: '$12,000', roas: '8.2x' },
        { campaign: 'Instagram Spring', deals: 32, totalValue: '$72,000', avgValue: '$2,250', winRate: '10.9%', lostDeals: 8, pipelineValue: '$48,000', cost: '$6,500', roas: '11.1x' },
        { campaign: 'LinkedIn B2B', deals: 22, totalValue: '$85,000', avgValue: '$3,864', winRate: '15.5%', lostDeals: 5, pipelineValue: '$42,000', cost: '$15,000', roas: '5.7x' },
        { campaign: 'Website Forms', deals: 45, totalValue: '$32,000', avgValue: '$711', winRate: '11.2%', lostDeals: 12, pipelineValue: '$28,000', cost: '$2,500', roas: '12.8x' },
        { campaign: 'Referral Program', deals: 28, totalValue: '$13,000', avgValue: '$464', winRate: '9.0%', lostDeals: 4, pipelineValue: '$15,000', cost: '$1,000', roas: '13.0x' },
      ],
    });
    setIsLoading(false);
  };

  const columns = [
    { key: 'campaign', label: 'Campaign' },
    { key: 'deals', label: 'Won Deals', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-bold">{val}</span> },
    { key: 'lostDeals', label: 'Lost', align: 'center' as const, render: (val: number) => <span className="text-red-500">{val}</span> },
    { key: 'totalValue', label: 'Total Revenue', align: 'center' as const, render: (val: string) => <span className="font-bold text-green-700">{val}</span> },
    { key: 'avgValue', label: 'Avg Deal', align: 'center' as const },
    { key: 'winRate', label: 'Win Rate', align: 'center' as const, render: (val: string) => {
      const num = parseFloat(val);
      return <span className={`px-2 py-1 rounded text-xs font-medium ${num >= 12 ? 'bg-green-100 text-green-700' : num >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{val}</span>;
    }},
    { key: 'pipelineValue', label: 'Pipeline', align: 'center' as const, render: (val: string) => <span className="text-blue-600">{val}</span> },
    { key: 'cost', label: 'Ad Spend', align: 'center' as const },
    { key: 'roas', label: 'ROAS', align: 'center' as const, render: (val: string) => <span className="text-purple-600 font-medium">{val}</span> },
  ];

  return (
    <ReportTemplate title="Campaign Deal Report" description="Revenue and deal performance by campaign" icon={BanknotesIcon} iconColor="bg-green-600" isLoading={isLoading} onRefresh={loadData}>
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Deals" value={data.summary.totalDeals} icon={ChartBarIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Total Revenue" value={data.summary.totalRevenue} icon={BanknotesIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Avg Deal Value" value={data.summary.avgDealValue} icon={TrophyIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="Best Campaign" value={data.summary.bestCampaign} icon={MegaphoneIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable columns={columns} data={data.campaigns} />
        </div>
      )}
    </ReportTemplate>
  );
}
