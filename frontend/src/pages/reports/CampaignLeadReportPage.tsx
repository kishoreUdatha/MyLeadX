/**
 * Campaign Lead Report - Lead details by campaign
 */
import { useState, useEffect } from 'react';
import { UserPlusIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface CampaignLeadStats {
  campaignId: string;
  campaignName: string;
  newLeads: number;
  qualified: number;
  unqualified: number;
  contacted: number;
  notContacted: number;
  avgScore: number;
  topSource: string;
}

interface CampaignLeadSummary {
  totalLeads: number;
  newThisWeek: number;
  qualifiedLeads: number;
  avgLeadScore: number;
}

export default function CampaignLeadReportPage() {
  const [data, setData] = useState<{ campaigns: CampaignLeadStats[]; summary: CampaignLeadSummary } | null>(null);
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
      const response = await api.get('/campaign-reports/campaign-leads', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      const report = response.data.data.report;
      setData({
        campaigns: report.campaigns,
        summary: report.summary,
      });
    } catch (error: any) {
      console.error('Failed to load campaign lead report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      setData({
        campaigns: [],
        summary: {
          totalLeads: 0,
          newThisWeek: 0,
          qualifiedLeads: 0,
          avgLeadScore: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter campaigns by search
  const filteredCampaigns = data?.campaigns.filter((c) =>
    !searchValue.trim() ||
    c.campaignName.toLowerCase().includes(searchValue.toLowerCase()) ||
    c.topSource.toLowerCase().includes(searchValue.toLowerCase())
  ) || [];

  const handleExport = () => {
    if (!filteredCampaigns.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Campaign', 'New Leads', 'Qualified', 'Unqualified', 'Contacted', 'Not Contacted', 'Avg Score', 'Top Source'];
    const csvRows = [headers.join(',')];
    filteredCampaigns.forEach((row) => {
      csvRows.push([
        `"${row.campaignName}"`, row.newLeads, row.qualified, row.unqualified,
        row.contacted, row.notContacted, row.avgScore, `"${row.topSource}"`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `campaign-lead-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="Campaign Lead Report"
      description="Lead acquisition and quality metrics by campaign"
      icon={UserPlusIcon}
      iconColor="bg-blue-600"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by campaign or source..."
    >
      {data && (
        <div className="space-y-4">
          {/* Compact Summary Stats */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">Total Leads</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.totalLeads}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">New This Week</span>
              <span className="text-sm font-bold text-green-700">{data.summary.newThisWeek}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs text-purple-600">Qualified</span>
              <span className="text-sm font-bold text-purple-700">{data.summary.qualifiedLeads}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-xs text-orange-600">Avg Score</span>
              <span className="text-sm font-bold text-orange-700">{data.summary.avgLeadScore}</span>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Campaign</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-blue-50">New Leads</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-green-50">Qualified</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-red-50">Unqualified</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-cyan-50">Contacted</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-yellow-50">Not Contacted</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider bg-purple-50">Avg Score</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Top Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                        {searchValue ? 'No campaigns match your search' : 'No campaign data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((row) => (
                      <tr key={row.campaignId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{row.campaignName}</td>
                        <td className="px-4 py-3 text-sm text-center bg-blue-50/30">
                          <span className="font-medium">{row.newLeads}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-green-50/30">
                          <span className="text-green-600 font-medium">{row.qualified}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-red-50/30">
                          <span className="text-red-500">{row.unqualified}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-cyan-50/30">
                          <span className="text-cyan-600">{row.contacted}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-yellow-50/30">
                          <span className="text-yellow-600">{row.notContacted}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-center bg-purple-50/30">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            row.avgScore >= 70 ? 'bg-green-100 text-green-700' :
                            row.avgScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            row.avgScore > 0 ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {row.avgScore > 0 ? row.avgScore : '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{row.topSource}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filteredCampaigns.length > 0 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
                Showing {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'}
              </div>
            )}
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
