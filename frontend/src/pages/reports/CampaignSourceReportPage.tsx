/**
 * Campaign Source Report - Lead sources by campaign
 */
import { useState, useEffect } from 'react';
import { GlobeAltIcon, LinkIcon, UserGroupIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface SourceData {
  sourceId: string;
  sourceName: string;
  totalCost: number;
  leadCount: number;
  costPerLead: number;
  conversions: number;
  costPerConversion: number;
}

export default function CampaignSourceReportPage() {
  const [data, setData] = useState<SourceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/campaign-reports/source-cost', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setData(response.data.data?.sourceCost || []);
    } catch (err: any) {
      console.error('Failed to load campaign source data:', err);
      toast.error('Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const totalLeads = data.reduce((sum, s) => sum + s.leadCount, 0);
  const totalConverted = data.reduce((sum, s) => sum + s.conversions, 0);
  const totalCost = data.reduce((sum, s) => sum + s.totalCost, 0);
  const topSource = data.length > 0 ? data[0].sourceName : '-';
  const avgConversion = totalLeads > 0 ? ((totalConverted / totalLeads) * 100).toFixed(1) + '%' : '0%';

  const getQualityLabel = (convRate: number) => {
    if (convRate >= 15) return { label: 'Very High', color: 'bg-green-100 text-green-700' };
    if (convRate >= 10) return { label: 'High', color: 'bg-blue-100 text-blue-700' };
    if (convRate >= 5) return { label: 'Medium', color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Low', color: 'bg-red-100 text-red-700' };
  };

  return (
    <ReportTemplate
      title="Campaign Source Report"
      description="Lead source performance and quality analysis"
      icon={GlobeAltIcon}
      iconColor="bg-sky-500"
      isLoading={isLoading}
      onRefresh={loadData}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      <div className="space-y-6">
        <ReportStatsGrid>
          <ReportStatCard label="Total Sources" value={data.length} icon={LinkIcon} iconColor="bg-blue-500" />
          <ReportStatCard label="Top Source" value={topSource} icon={GlobeAltIcon} iconColor="bg-green-500" />
          <ReportStatCard label="Total Leads" value={totalLeads} icon={UserGroupIcon} iconColor="bg-purple-500" />
          <ReportStatCard label="Avg Conversion" value={avgConversion} icon={ArrowTrendingUpIcon} iconColor="bg-orange-500" />
        </ReportStatsGrid>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Source</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Leads</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Converted</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Conv. Rate</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Cost</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">CPL</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Cost/Conv</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Quality</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.length > 0 ? (
                  data.map((row) => {
                    const convRate = row.leadCount > 0 ? (row.conversions / row.leadCount) * 100 : 0;
                    const quality = getQualityLabel(convRate);
                    return (
                      <tr key={row.sourceId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{row.sourceName}</td>
                        <td className="px-4 py-3 text-center">{row.leadCount}</td>
                        <td className="px-4 py-3 text-center text-green-600 font-bold">{row.conversions}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-medium ${convRate >= 10 ? 'text-green-600' : convRate >= 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {convRate.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-slate-400">{row.totalCost > 0 ? `₹${row.totalCost.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{row.costPerLead > 0 ? `₹${row.costPerLead.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="px-4 py-3 text-center text-slate-400">{row.costPerConversion > 0 ? `₹${row.costPerConversion.toLocaleString('en-IN')}` : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${quality.color}`}>
                            {quality.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No source data found for the selected date range
                    </td>
                  </tr>
                )}
              </tbody>
              {data.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-semibold">
                    <td className="px-4 py-3 font-bold">TOTAL</td>
                    <td className="px-4 py-3 text-center">{totalLeads}</td>
                    <td className="px-4 py-3 text-center text-green-600 font-bold">{totalConverted}</td>
                    <td className="px-4 py-3 text-center">{avgConversion}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{totalCost > 0 ? `₹${totalCost.toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{totalCost > 0 && totalLeads > 0 ? `₹${Math.round(totalCost / totalLeads).toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-400">{totalCost > 0 && totalConverted > 0 ? `₹${Math.round(totalCost / totalConverted).toLocaleString('en-IN')}` : '-'}</td>
                    <td className="px-4 py-3 text-center">-</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </ReportTemplate>
  );
}
