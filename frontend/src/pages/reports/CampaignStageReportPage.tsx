/**
 * Campaign Stage Report - Lead stage distribution by campaign
 */
import { useState, useEffect, useMemo } from 'react';
import { FunnelIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface CampaignStageData {
  campaign: string;
  stages: Record<string, number>;
  total: number;
}

interface StageReportData {
  stages: string[];
  campaigns: CampaignStageData[];
  totals: Record<string, number>;
}

// Stage colors for visual distinction
const stageColorPalette = [
  { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { bg: 'bg-orange-100', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  { bg: 'bg-teal-100', text: 'text-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-pink-100', text: 'text-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-lime-100', text: 'text-lime-700', dot: 'bg-lime-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' },
];

export default function CampaignStageReportPage() {
  const [data, setData] = useState<StageReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
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
    setError(null);
    try {
      const response = await api.get('/campaign-reports/campaign-stages', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      });
      if (response.data?.success && response.data?.data?.report) {
        setData(response.data.data.report);
      } else {
        setError('Failed to load campaign stage data');
      }
    } catch (err: any) {
      console.error('Error loading campaign stage report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  // Get color for a stage by index
  const getStageColor = (index: number) => {
    return stageColorPalette[index % stageColorPalette.length];
  };

  // Filter campaigns based on search and stage filter
  const filteredCampaigns = useMemo(() => {
    if (!data) return [];

    return data.campaigns.filter(campaign => {
      const matchesSearch = searchQuery === '' ||
        campaign.campaign.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStage = selectedStage === '' ||
        (campaign.stages[selectedStage] && campaign.stages[selectedStage] > 0);
      return matchesSearch && matchesStage;
    });
  }, [data, searchQuery, selectedStage]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    if (!data) return {};
    const totals: Record<string, number> = {};
    for (const stage of data.stages) {
      totals[stage] = filteredCampaigns.reduce((sum, c) => sum + (c.stages[stage] || 0), 0);
    }
    return totals;
  }, [data, filteredCampaigns]);

  const grandTotal = useMemo(() => {
    return Object.values(filteredTotals).reduce((sum, count) => sum + count, 0);
  }, [filteredTotals]);

  // Stage filter options for ReportTemplate
  const stageFilterOptions = useMemo(() => {
    if (!data) return [];
    return [
      { value: '', label: 'All Stages' },
      ...data.stages.map(stage => ({ value: stage, label: stage }))
    ];
  }, [data]);

  // Export to Excel
  const handleExport = () => {
    if (!data || filteredCampaigns.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredCampaigns.map(campaign => {
        const row: Record<string, any> = { Campaign: campaign.campaign };
        data.stages.forEach(stage => {
          row[stage] = campaign.stages[stage] || 0;
        });
        row['Total'] = campaign.total;
        return row;
      });

      // Add totals row
      const totalsRow: Record<string, any> = { Campaign: 'TOTAL' };
      data.stages.forEach(stage => {
        totalsRow[stage] = filteredTotals[stage] || 0;
      });
      totalsRow['Total'] = grandTotal;
      exportData.push(totalsRow);

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign Stage Report');

      // Download file
      XLSX.writeFile(wb, `Campaign_Stage_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <ReportTemplate
      title="Campaign Stage Report"
      description="Lead progression through stages by campaign"
      icon={FunnelIcon}
      iconColor="bg-amber-500"
      isLoading={isLoading}
      onRefresh={loadData}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search campaigns..."
      onExport={handleExport}
      inlineFilters={data ? [
        {
          name: 'Stage',
          value: selectedStage,
          options: stageFilterOptions,
          onChange: setSelectedStage,
        }
      ] : []}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {data && data.stages.length > 0 && (
        <div className="space-y-4">
          {/* Compact Summary Bar */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Stage Distribution</h3>
              <span className="text-sm text-gray-500">
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} |
                <span className="font-semibold text-gray-900 ml-1">{grandTotal}</span> leads
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {data.stages.map((stage, idx) => {
                const count = filteredTotals[stage] || 0;
                const color = getStageColor(idx);
                if (count === 0) return null;
                return (
                  <div
                    key={stage}
                    className={`flex items-center gap-1.5 cursor-pointer px-2 py-1 rounded-md transition-colors ${
                      selectedStage === stage ? 'bg-gray-100' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedStage(selectedStage === stage ? '' : stage)}
                  >
                    <div className={`w-2.5 h-2.5 ${color.dot} rounded-full`}></div>
                    <span className="text-sm text-gray-600">{stage}:</span>
                    <span className="text-sm font-semibold text-gray-900">{count}</span>
                  </div>
                );
              })}
              {Object.values(filteredTotals).every(v => v === 0) && (
                <span className="text-sm text-gray-400">No leads in any stage</span>
              )}
            </div>
          </div>

          {/* Campaign Stage Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                      Campaign
                    </th>
                    {data.stages.map((stage, idx) => (
                      <th
                        key={stage}
                        className={`px-2 py-2 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors ${
                          selectedStage === stage ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedStage(selectedStage === stage ? '' : stage)}
                      >
                        <div className="flex items-center justify-center gap-1">
                          <div className={`w-2 h-2 ${getStageColor(idx).dot} rounded-full`}></div>
                          <span className="truncate max-w-[80px]" title={stage}>{stage}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={data.stages.length + 2} className="px-3 py-8 text-center text-gray-500">
                        No campaigns found matching your search
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((campaign, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">
                          {campaign.campaign}
                        </td>
                        {data.stages.map((stage, stageIdx) => {
                          const count = campaign.stages[stage] || 0;
                          const color = getStageColor(stageIdx);
                          const isHighlighted = selectedStage === stage;
                          return (
                            <td
                              key={stage}
                              className={`px-2 py-2 text-center ${isHighlighted ? 'bg-blue-50' : ''}`}
                            >
                              {count > 0 ? (
                                <span className={`inline-block min-w-[24px] px-1.5 py-0.5 ${color.bg} ${color.text} rounded text-xs font-medium`}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-gray-300">-</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-2 text-center font-semibold text-gray-900">
                          {campaign.total}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {filteredCampaigns.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-3 py-2 font-semibold text-gray-900 sticky left-0 bg-gray-50 z-10">
                        Total
                      </td>
                      {data.stages.map((stage) => {
                        const count = filteredTotals[stage] || 0;
                        const isHighlighted = selectedStage === stage;
                        return (
                          <td
                            key={stage}
                            className={`px-2 py-2 text-center font-semibold text-gray-700 ${isHighlighted ? 'bg-blue-50' : ''}`}
                          >
                            {count > 0 ? count : '-'}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-bold text-gray-900">
                        {grandTotal}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {data && data.stages.length === 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          No stage data available. Leads may not have pipeline stages assigned.
        </div>
      )}

      {data && data.campaigns.length === 0 && data.stages.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
          No campaign data available for the selected period.
        </div>
      )}
    </ReportTemplate>
  );
}
