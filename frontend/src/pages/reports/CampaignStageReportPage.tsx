/**
 * Campaign Stage Report - Lead stage distribution by campaign
 */
import { useState, useEffect } from 'react';
import { FunnelIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportTable } from './components/ReportTemplate';

export default function CampaignStageReportPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      campaigns: [
        { campaign: 'Facebook Leads Q1', new: 85, contacted: 145, qualified: 120, negotiation: 95, proposal: 68, won: 52, lost: 15 },
        { campaign: 'Google Ads March', new: 62, contacted: 118, qualified: 95, negotiation: 72, proposal: 45, won: 38, lost: 10 },
        { campaign: 'Instagram Spring', new: 55, contacted: 95, qualified: 82, negotiation: 65, proposal: 48, won: 32, lost: 8 },
        { campaign: 'LinkedIn B2B', new: 38, contacted: 65, qualified: 55, negotiation: 45, proposal: 28, won: 22, lost: 5 },
        { campaign: 'Website Forms', new: 78, contacted: 135, qualified: 115, negotiation: 88, proposal: 62, won: 45, lost: 12 },
        { campaign: 'Referral Program', new: 42, contacted: 85, qualified: 75, negotiation: 58, proposal: 38, won: 28, lost: 4 },
      ],
    });
    setIsLoading(false);
  };

  const columns = [
    { key: 'campaign', label: 'Campaign' },
    { key: 'new', label: 'New', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'contacted', label: 'Contacted', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'qualified', label: 'Qualified', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'negotiation', label: 'Negotiation', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'proposal', label: 'Proposal', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'won', label: 'Won', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">{val}</span> },
    { key: 'lost', label: 'Lost', align: 'center' as const, render: (val: number) => <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{val}</span> },
  ];

  // Calculate totals
  const totals = data?.campaigns?.reduce((acc: any, c: any) => ({
    new: acc.new + c.new,
    contacted: acc.contacted + c.contacted,
    qualified: acc.qualified + c.qualified,
    negotiation: acc.negotiation + c.negotiation,
    proposal: acc.proposal + c.proposal,
    won: acc.won + c.won,
    lost: acc.lost + c.lost,
  }), { new: 0, contacted: 0, qualified: 0, negotiation: 0, proposal: 0, won: 0, lost: 0 });

  return (
    <ReportTemplate title="Campaign Stage Report" description="Lead progression through stages by campaign" icon={FunnelIcon} iconColor="bg-amber-500" isLoading={isLoading} onRefresh={loadData}>
      {data && (
        <div className="space-y-6">
          {/* Stage Summary Cards */}
          <div className="grid grid-cols-7 gap-3">
            {[
              { label: 'New', value: totals.new, color: 'bg-blue-500' },
              { label: 'Contacted', value: totals.contacted, color: 'bg-yellow-500' },
              { label: 'Qualified', value: totals.qualified, color: 'bg-purple-500' },
              { label: 'Negotiation', value: totals.negotiation, color: 'bg-orange-500' },
              { label: 'Proposal', value: totals.proposal, color: 'bg-cyan-500' },
              { label: 'Won', value: totals.won, color: 'bg-green-500' },
              { label: 'Lost', value: totals.lost, color: 'bg-red-500' },
            ].map((stage) => (
              <div key={stage.label} className="bg-white rounded-lg shadow-sm p-4 text-center">
                <div className={`w-3 h-3 ${stage.color} rounded-full mx-auto mb-2`}></div>
                <div className="text-2xl font-bold text-gray-900">{stage.value}</div>
                <div className="text-xs text-gray-500">{stage.label}</div>
              </div>
            ))}
          </div>
          <ReportTable columns={columns} data={data.campaigns} />
        </div>
      )}
    </ReportTemplate>
  );
}
