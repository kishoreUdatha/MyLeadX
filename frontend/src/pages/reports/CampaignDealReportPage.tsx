/**
 * Campaign Deal Report - Deal performance by campaign
 */
import { useState, useEffect, useMemo } from 'react';
import { BanknotesIcon, TrophyIcon, ChartBarIcon, MegaphoneIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

interface CampaignDeal {
  campaign: string;
  wonDeals: number;
  lostDeals: number;
  totalRevenue: number;
  avgDealValue: number;
  winRate: string;
  pipelineValue: number;
}

interface DealReportData {
  summary: {
    totalDeals: number;
    totalRevenue: number;
    avgDealValue: number;
    bestCampaign: string;
  };
  campaigns: CampaignDeal[];
}

export default function CampaignDealReportPage() {
  const [data, setData] = useState<DealReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
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
      const response = await api.get('/campaign-reports/campaign-deals', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }
      });
      if (response.data?.success && response.data?.data?.report) {
        setData(response.data.data.report);
      } else {
        setError('Failed to load campaign deal data');
      }
    } catch (err: any) {
      console.error('Error loading campaign deal report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter campaigns based on search
  const filteredCampaigns = useMemo(() => {
    if (!data) return [];
    return data.campaigns.filter(campaign =>
      searchQuery === '' || campaign.campaign.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  // Recalculate summary for filtered data
  const filteredSummary = useMemo(() => {
    if (!data) return null;

    const totalDeals = filteredCampaigns.reduce((sum, c) => sum + c.wonDeals, 0);
    const totalRevenue = filteredCampaigns.reduce((sum, c) => sum + c.totalRevenue, 0);
    const avgDealValue = totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

    let bestCampaign = 'N/A';
    let bestRevenue = 0;
    for (const c of filteredCampaigns) {
      if (c.totalRevenue > bestRevenue) {
        bestRevenue = c.totalRevenue;
        bestCampaign = c.campaign;
      }
    }

    return { totalDeals, totalRevenue, avgDealValue, bestCampaign };
  }, [data, filteredCampaigns]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Export to Excel
  const handleExport = () => {
    if (!data || filteredCampaigns.length === 0) {
      toast.error('No data to export');
      return;
    }

    try {
      // Prepare data for export
      const exportData = filteredCampaigns.map(campaign => ({
        'Campaign': campaign.campaign,
        'Won Deals': campaign.wonDeals,
        'Lost Deals': campaign.lostDeals,
        'Total Revenue': campaign.totalRevenue,
        'Avg Deal Value': campaign.avgDealValue,
        'Win Rate (%)': campaign.winRate,
        'Pipeline Value': campaign.pipelineValue,
      }));

      // Add totals row
      exportData.push({
        'Campaign': 'TOTAL',
        'Won Deals': filteredCampaigns.reduce((sum, c) => sum + c.wonDeals, 0),
        'Lost Deals': filteredCampaigns.reduce((sum, c) => sum + c.lostDeals, 0),
        'Total Revenue': filteredCampaigns.reduce((sum, c) => sum + c.totalRevenue, 0),
        'Avg Deal Value': filteredSummary?.avgDealValue || 0,
        'Win Rate (%)': '-',
        'Pipeline Value': filteredCampaigns.reduce((sum, c) => sum + c.pipelineValue, 0),
      });

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Campaign Deal Report');

      // Download file
      XLSX.writeFile(wb, `Campaign_Deal_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx`);
      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  return (
    <ReportTemplate
      title="Campaign Deal Report"
      description="Revenue and deal performance by campaign"
      icon={BanknotesIcon}
      iconColor="bg-green-600"
      isLoading={isLoading}
      onRefresh={loadData}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search campaigns..."
      onExport={handleExport}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {data && filteredSummary && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <ReportStatsGrid>
            <ReportStatCard
              label="Total Deals"
              value={filteredSummary.totalDeals}
              icon={ChartBarIcon}
              iconColor="bg-blue-500"
            />
            <ReportStatCard
              label="Total Revenue"
              value={formatCurrency(filteredSummary.totalRevenue)}
              icon={BanknotesIcon}
              iconColor="bg-green-500"
            />
            <ReportStatCard
              label="Avg Deal Value"
              value={formatCurrency(filteredSummary.avgDealValue)}
              icon={TrophyIcon}
              iconColor="bg-purple-500"
            />
            <ReportStatCard
              label="Best Campaign"
              value={filteredSummary.bestCampaign}
              icon={MegaphoneIcon}
              iconColor="bg-orange-500"
            />
          </ReportStatsGrid>

          {/* Campaign Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Campaign
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Won Deals
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lost
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Revenue
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Deal
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Win Rate
                    </th>
                    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pipeline
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCampaigns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        {searchQuery ? 'No campaigns found matching your search' : 'No deal data available'}
                      </td>
                    </tr>
                  ) : (
                    filteredCampaigns.map((campaign, idx) => {
                      const winRateNum = parseFloat(campaign.winRate);
                      return (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {campaign.campaign}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-green-600 font-bold">{campaign.wonDeals}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-red-500">{campaign.lostDeals}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="font-bold text-green-700">{formatCurrency(campaign.totalRevenue)}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-700">
                            {formatCurrency(campaign.avgDealValue)}
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              winRateNum >= 12 ? 'bg-green-100 text-green-700' :
                              winRateNum >= 10 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {campaign.winRate}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-blue-600">{formatCurrency(campaign.pipelineValue)}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {filteredCampaigns.length > 0 && (
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td className="px-4 py-3 font-semibold text-gray-900">Total</td>
                      <td className="px-3 py-3 text-center font-semibold text-green-600">
                        {filteredCampaigns.reduce((sum, c) => sum + c.wonDeals, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-red-500">
                        {filteredCampaigns.reduce((sum, c) => sum + c.lostDeals, 0)}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-green-700">
                        {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + c.totalRevenue, 0))}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500">-</td>
                      <td className="px-3 py-3 text-center text-gray-500">-</td>
                      <td className="px-3 py-3 text-center font-semibold text-blue-600">
                        {formatCurrency(filteredCampaigns.reduce((sum, c) => sum + c.pipelineValue, 0))}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
