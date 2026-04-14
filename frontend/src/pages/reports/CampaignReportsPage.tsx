import { useEffect, useState } from 'react';
import {
  MegaphoneIcon,
  ArrowTrendingUpIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { campaignReportsService, ComprehensiveCampaignReport, ReportFilters } from '../../services/campaign-reports.service';

type TabType = 'sources' | 'roi' | 'branches' | 'trends';

export default function CampaignReportsPage() {
  const [report, setReport] = useState<ComprehensiveCampaignReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('sources');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [datePreset, setDatePreset] = useState('thisMonth');

  useEffect(() => {
    applyDatePreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) loadReport();
  }, [filters]);

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = now;
    if (preset === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'thisQuarter') {
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
    }
    setFilters({ startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await campaignReportsService.getComprehensive(filters);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load campaign reports');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) return <div className="flex items-center justify-center h-64"><ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!report) return null;

  const { sourceLeadCount, sourceCost, sourceConversion, campaignROI, branchSource } = report;
  const totalLeads = sourceLeadCount.reduce((sum, s) => sum + s.leadCount, 0);
  const totalConversions = sourceConversion.reduce((sum, s) => sum + s.conversions, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Campaign & Source Reports</h1>
          <p className="text-slate-500 text-xs">Lead source analytics and campaign ROI</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="input text-sm py-1.5 px-3">
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
            <option value="thisQuarter">This Quarter</option>
          </select>
          <button onClick={loadReport} className="btn btn-secondary py-1.5 px-3"><ArrowPathIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <MegaphoneIcon className="w-5 h-5 mx-auto text-primary-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{sourceLeadCount.length}</p>
          <p className="text-xs text-slate-500">Active Sources</p>
        </div>
        <div className="card p-3 text-center">
          <ChartBarIcon className="w-5 h-5 mx-auto text-success-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totalLeads}</p>
          <p className="text-xs text-slate-500">Total Leads</p>
        </div>
        <div className="card p-3 text-center">
          <ArrowTrendingUpIcon className="w-5 h-5 mx-auto text-purple-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totalConversions}</p>
          <p className="text-xs text-slate-500">Conversions</p>
        </div>
        <div className="card p-3 text-center">
          <CurrencyRupeeIcon className="w-5 h-5 mx-auto text-warning-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{totalLeads > 0 ? ((totalConversions / totalLeads) * 100).toFixed(1) : 0}%</p>
          <p className="text-xs text-slate-500">Avg Conversion</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { key: 'sources', label: 'Lead Sources' },
            { key: 'roi', label: 'Campaign ROI' },
            { key: 'branches', label: 'Branch-wise' },
            { key: 'trends', label: 'Cost Analysis' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'sources' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Source Lead Count */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Leads by Source</h3>
            </div>
            <div className="p-3 space-y-2">
              {sourceLeadCount.slice(0, 8).map((source) => (
                <div key={source.sourceId} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-28 truncate">{source.sourceName}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4">
                    <div className="bg-primary-500 h-4 rounded-full flex items-center justify-end pr-1" style={{ width: `${Math.max(parseFloat(source.percentage), 5)}%` }}>
                      <span className="text-[9px] text-white font-medium">{source.leadCount}</span>
                    </div>
                  </div>
                  <span className={`text-xs w-12 text-right ${source.trend > 0 ? 'text-success-600' : source.trend < 0 ? 'text-danger-600' : 'text-slate-500'}`}>
                    {source.trend > 0 ? '+' : ''}{source.trend}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Source Conversion */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Conversion by Source</h3>
            </div>
            <div className="p-3 space-y-2">
              {sourceConversion.slice(0, 8).map((source) => (
                <div key={source.sourceId} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div>
                    <p className="text-xs font-medium text-slate-900">{source.sourceName}</p>
                    <p className="text-[10px] text-slate-500">{source.leads} leads → {source.conversions} converted</p>
                  </div>
                  <span className={`text-sm font-bold ${parseFloat(source.conversionRate) >= 10 ? 'text-success-600' : 'text-slate-600'}`}>
                    {source.conversionRate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'roi' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Campaign</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Source</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Spend</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Leads</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Conv.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Revenue</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">ROI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {campaignROI.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-slate-500">No campaign data</td></tr>
              ) : (
                campaignROI.map((campaign) => (
                  <tr key={campaign.campaignId} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">{campaign.campaignName}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{campaign.source}</td>
                    <td className="px-3 py-2 text-sm text-right">{formatCurrency(campaign.totalSpend)}</td>
                    <td className="px-3 py-2 text-sm text-right">{campaign.leads}</td>
                    <td className="px-3 py-2 text-sm text-right">{campaign.conversions}</td>
                    <td className="px-3 py-2 text-sm text-right text-success-600">{formatCurrency(campaign.revenue)}</td>
                    <td className={`px-3 py-2 text-sm text-right font-bold ${parseFloat(campaign.roi) > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                      {campaign.roi}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'branches' && (
        <div className="space-y-3">
          {branchSource.map((branch) => (
            <div key={branch.branchId} className="card">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-slate-400" />
                  <h3 className="text-sm font-semibold text-slate-900">{branch.branchName}</h3>
                </div>
                <div className="text-xs text-slate-500">
                  {branch.totalLeads} leads | {branch.totalConversions} conversions
                </div>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {branch.sources.slice(0, 4).map((source) => (
                    <div key={source.sourceId} className="p-2 bg-slate-50 rounded text-center">
                      <p className="text-xs text-slate-600 truncate">{source.sourceName}</p>
                      <p className="text-lg font-bold text-slate-900">{source.leads}</p>
                      <p className="text-[10px] text-success-600">{source.conversionRate}% conv.</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'trends' && (
        <div className="card overflow-x-auto">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Cost Analysis by Source</h3>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Source</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total Cost</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Leads</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">CPL</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Conv.</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">CPC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sourceCost.map((source) => (
                <tr key={source.sourceId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{source.sourceName}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(source.totalCost)}</td>
                  <td className="px-3 py-2 text-sm text-right">{source.leadCount}</td>
                  <td className="px-3 py-2 text-sm text-right">{formatCurrency(source.costPerLead)}</td>
                  <td className="px-3 py-2 text-sm text-right">{source.conversions}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium">{formatCurrency(source.costPerConversion)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
