/**
 * Campaign Lead Report - Lead details by campaign
 */
import { useState, useEffect } from 'react';
import { UserPlusIcon, MegaphoneIcon, UserGroupIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable } from './components/ReportTemplate';

export default function CampaignLeadReportPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      summary: { totalLeads: 2450, newThisWeek: 185, qualifiedLeads: 645, avgLeadScore: 68 },
      campaigns: [
        { campaign: 'Facebook Leads Q1', newLeads: 580, qualified: 185, unqualified: 120, contacted: 520, notContacted: 60, avgScore: 72, topSource: 'FB Ad Set 1' },
        { campaign: 'Google Ads March', newLeads: 420, qualified: 145, unqualified: 95, contacted: 395, notContacted: 25, avgScore: 68, topSource: 'Search - Keywords' },
        { campaign: 'Instagram Spring', newLeads: 385, qualified: 120, unqualified: 85, contacted: 340, notContacted: 45, avgScore: 65, topSource: 'Story Ads' },
        { campaign: 'LinkedIn B2B', newLeads: 245, qualified: 95, unqualified: 45, contacted: 220, notContacted: 25, avgScore: 78, topSource: 'Sponsored Content' },
        { campaign: 'Website Forms', newLeads: 520, qualified: 195, unqualified: 110, contacted: 485, notContacted: 35, avgScore: 70, topSource: 'Contact Form' },
        { campaign: 'Referral Program', newLeads: 300, qualified: 145, unqualified: 55, contacted: 290, notContacted: 10, avgScore: 75, topSource: 'Customer Referrals' },
      ],
    });
    setIsLoading(false);
  };

  const columns = [
    { key: 'campaign', label: 'Campaign' },
    { key: 'newLeads', label: 'New Leads', align: 'center' as const, render: (val: number) => <span className="font-medium">{val}</span> },
    { key: 'qualified', label: 'Qualified', align: 'center' as const, render: (val: number) => <span className="text-green-600 font-medium">{val}</span> },
    { key: 'unqualified', label: 'Unqualified', align: 'center' as const, render: (val: number) => <span className="text-red-500">{val}</span> },
    { key: 'contacted', label: 'Contacted', align: 'center' as const, render: (val: number) => <span className="text-blue-600">{val}</span> },
    { key: 'notContacted', label: 'Not Contacted', align: 'center' as const, render: (val: number) => <span className="text-yellow-600">{val}</span> },
    { key: 'avgScore', label: 'Avg Score', align: 'center' as const, render: (val: number) => (
      <span className={`px-2 py-1 rounded text-xs font-medium ${val >= 70 ? 'bg-green-100 text-green-700' : val >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{val}</span>
    )},
    { key: 'topSource', label: 'Top Source', align: 'center' as const },
  ];

  return (
    <ReportTemplate title="Campaign Lead Report" description="Lead acquisition and quality metrics by campaign" icon={UserPlusIcon} iconColor="bg-blue-600" isLoading={isLoading} onRefresh={loadData}>
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Leads" value={data.summary.totalLeads} icon={UserGroupIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="New This Week" value={data.summary.newThisWeek} icon={UserPlusIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Qualified Leads" value={data.summary.qualifiedLeads} icon={ArrowTrendingUpIcon} iconColor="bg-purple-500" />
            <ReportStatCard label="Avg Lead Score" value={data.summary.avgLeadScore} icon={MegaphoneIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>
          <ReportTable columns={columns} data={data.campaigns} />
        </div>
      )}
    </ReportTemplate>
  );
}
