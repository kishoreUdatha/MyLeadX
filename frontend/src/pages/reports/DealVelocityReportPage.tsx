/**
 * Deal Velocity Report - Pipeline velocity, stage analysis, and bottleneck identification
 */
import { useState, useEffect } from 'react';
import { ClockIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface StageMetrics {
  stage: string;
  stageName: string;
  count: number;
  value: number;
  avgDaysInStage: number;
  percentOfTotal: number;
  stageStatus: string | null; // WON, LOST, or null (active)
  order: number;
}

interface VelocitySummary {
  totalDeals: number;
  activeDeals: number;
  avgCycleTimeDays: number;
  pipelineValue: number;
  pipelineVelocity: number;
  stalledDealsCount: number;
  stalledDealsValue: number;
}

interface StalledDeal {
  dealId: string;
  dealName: string;
  stage: string;
  daysStalled: number;
  amount: number;
  assignedTo: string;
  leadName: string;
}

interface VelocityTrend {
  weekLabel: string;
  weekStart: string;
  dealsCreated: number;
  dealsClosed: number;
  valueCreated: number;
  valueClosed: number;
}

interface VelocityReport {
  stageMetrics: StageMetrics[];
  velocitySummary: VelocitySummary;
  stalledDeals: StalledDeal[];
  trends: VelocityTrend[];
}

export default function DealVelocityReportPage() {
  const [data, setData] = useState<VelocityReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'stages' | 'stalled' | 'trends'>('stages');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/deal-reports/velocity', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setData(response.data.data.report);
    } catch (error: any) {
      console.error('Failed to load velocity report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
    return `₹${value.toLocaleString()}`;
  };

  const getStageColor = (stage: string) => {
    const colors: Record<string, string> = {
      PROSPECTING: 'bg-slate-100 text-slate-700 border-slate-300',
      FIRST_MEETING: 'bg-blue-100 text-blue-700 border-blue-300',
      NEEDS_ANALYSIS: 'bg-indigo-100 text-indigo-700 border-indigo-300',
      PROPOSAL_SENT: 'bg-purple-100 text-purple-700 border-purple-300',
      NEGOTIATION: 'bg-orange-100 text-orange-700 border-orange-300',
      DECISION_PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      WON: 'bg-green-100 text-green-700 border-green-300',
      LOST: 'bg-red-100 text-red-700 border-red-300',
      ON_HOLD: 'bg-gray-100 text-gray-700 border-gray-300',
    };
    return colors[stage] || 'bg-slate-100 text-slate-700 border-slate-300';
  };

  const handleExport = () => {
    if (!data) {
      toast.error('No data to export');
      return;
    }
    const headers = ['Stage', 'Count', 'Value', 'Avg Days', '% of Total'];
    const csvRows = [headers.join(',')];
    data.stageMetrics.forEach((row) => {
      csvRows.push([
        `"${row.stageName}"`, row.count, row.value, row.avgDaysInStage, `${row.percentOfTotal}%`
      ].join(','));
    });
    csvRows.push('');
    csvRows.push('Stalled Deals');
    csvRows.push(['Deal Name', 'Stage', 'Days Stalled', 'Amount', 'Assigned To', 'Lead'].join(','));
    data.stalledDeals.forEach((deal) => {
      csvRows.push([
        `"${deal.dealName}"`, `"${deal.stage}"`, deal.daysStalled, deal.amount, `"${deal.assignedTo}"`, `"${deal.leadName}"`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `deal-velocity-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="Deal Velocity Report"
      description="Pipeline velocity, stage analysis, and bottleneck identification"
      icon={ClockIcon}
      iconColor="bg-indigo-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      {data && (
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">Total Deals</span>
              <span className="text-sm font-bold text-blue-700">{data.velocitySummary.totalDeals}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">Active Deals</span>
              <span className="text-sm font-bold text-green-700">{data.velocitySummary.activeDeals}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
              <span className="text-xs text-purple-600">Pipeline Value</span>
              <span className="text-sm font-bold text-purple-700">{formatCurrency(data.velocitySummary.pipelineValue)}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
              <span className="text-xs text-indigo-600">Avg Cycle Time</span>
              <span className="text-sm font-bold text-indigo-700">{data.velocitySummary.avgCycleTimeDays} days</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
              <span className="text-xs text-emerald-600">Velocity</span>
              <span className="text-sm font-bold text-emerald-700">{formatCurrency(data.velocitySummary.pipelineVelocity)}/day</span>
            </div>
            {data.velocitySummary.stalledDealsCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                <span className="text-xs text-red-600">Stalled</span>
                <span className="text-sm font-bold text-red-700">{data.velocitySummary.stalledDealsCount} ({formatCurrency(data.velocitySummary.stalledDealsValue)})</span>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('stages')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'stages' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stage Analysis
            </button>
            <button
              onClick={() => setActiveTab('stalled')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'stalled' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Stalled Deals ({data.stalledDeals.length})
            </button>
            <button
              onClick={() => setActiveTab('trends')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'trends' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Weekly Trends
            </button>
          </div>

          {/* Stage Analysis Tab - Two Panel Layout */}
          {activeTab === 'stages' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Panel - Pipeline Stages Visualization (Active stages only) */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Pipeline Stages</h3>
                <div className="space-y-2">
                  {data.stageMetrics
                    .filter(s => !s.stageStatus) // Only show active pipeline stages (not WON/LOST)
                    .sort((a, b) => a.order - b.order) // Sort by order
                    .map((stage) => (
                    <div key={stage.stage} className="flex items-center gap-3">
                      <div className="w-28 text-sm text-slate-600 truncate">{stage.stageName}</div>
                      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
                        <div
                          className={`h-full ${stage.avgDaysInStage > 14 ? 'bg-red-400' : stage.avgDaysInStage > 7 ? 'bg-yellow-400' : 'bg-green-400'}`}
                          style={{ width: `${Math.min(100, Math.max(5, stage.percentOfTotal * 3))}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-between px-3">
                          <span className="text-xs font-medium text-slate-700">{stage.count} {stage.count === 1 ? 'lead' : 'leads'}</span>
                          <span className="text-xs text-slate-600">{formatCurrency(stage.value)}</span>
                        </div>
                      </div>
                      <div className={`w-16 text-center text-xs font-medium px-2 py-1 rounded ${
                        stage.avgDaysInStage > 14 ? 'bg-red-100 text-red-700' :
                        stage.avgDaysInStage > 7 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {stage.avgDaysInStage} {stage.avgDaysInStage === 1 ? 'day' : 'days'}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-400"></div>
                    <span className="text-xs text-slate-600">Healthy (&lt;7 days)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-400"></div>
                    <span className="text-xs text-slate-600">Slowing (7-14 days)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-red-400"></div>
                    <span className="text-xs text-slate-600">Bottleneck (&gt;14 days)</span>
                  </div>
                </div>
              </div>

              {/* Right Panel - Stage Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Stage</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase">Leads</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase">Value</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase">Avg Days</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase">%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Active pipeline stages first, then WON, then LOST at bottom */}
                      {data.stageMetrics
                        .slice()
                        .sort((a, b) => {
                          // LOST stages go to bottom
                          if (a.stageStatus === 'LOST' && b.stageStatus !== 'LOST') return 1;
                          if (b.stageStatus === 'LOST' && a.stageStatus !== 'LOST') return -1;
                          // Then sort by order
                          return a.order - b.order;
                        })
                        .map((stage) => (
                        <tr key={stage.stage} className={`hover:bg-slate-50 ${stage.stageStatus === 'WON' ? 'bg-green-50/30' : stage.stageStatus === 'LOST' ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2.5">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${
                              stage.stageStatus === 'WON' ? 'bg-green-100 text-green-700 border-green-300' :
                              stage.stageStatus === 'LOST' ? 'bg-red-100 text-red-700 border-red-300' :
                              'bg-slate-100 text-slate-700 border-slate-300'
                            }`}>
                              {stage.stageName}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center font-medium">{stage.count}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-emerald-600">{formatCurrency(stage.value)}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${
                              stage.avgDaysInStage > 14 ? 'bg-red-100 text-red-700' :
                              stage.avgDaysInStage > 7 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {stage.avgDaysInStage} {stage.avgDaysInStage === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{stage.percentOfTotal}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Stalled Deals Tab */}
          {activeTab === 'stalled' && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {data.stalledDeals.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500">
                  <div className="text-green-500 mb-2">
                    <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  No stalled deals! All deals are moving through the pipeline.
                </div>
              ) : (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-red-50 border-b border-red-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Deal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Stage</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-red-700 uppercase">Days Stalled</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-red-700 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Assigned To</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-red-700 uppercase">Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.stalledDeals.map((deal) => (
                      <tr key={deal.dealId} className="hover:bg-red-50/30">
                        <td className="px-4 py-3 font-medium text-slate-900">{deal.dealName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-medium rounded border ${getStageColor(deal.stage)}`}>
                            {deal.stage.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded ${
                            deal.daysStalled > 21 ? 'bg-red-100 text-red-700' :
                            deal.daysStalled > 14 ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {deal.daysStalled} days
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{formatCurrency(deal.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{deal.assignedTo}</td>
                        <td className="px-4 py-3 text-slate-600">{deal.leadName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {data.stalledDeals.length > 0 && (
                <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600">
                  {data.stalledDeals.length} deals stalled for 7+ days, totaling {formatCurrency(data.velocitySummary.stalledDealsValue)}
                </div>
              )}
            </div>
          )}

          {/* Trends Tab - Two Panel Layout */}
          {activeTab === 'trends' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Panel - Trend Chart Visualization */}
              <div className="bg-white rounded-lg border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Weekly Pipeline Activity (Last 8 Weeks)</h3>
                <div className="space-y-3">
                  {data.trends.map((week) => (
                    <div key={week.weekLabel} className="flex items-center gap-3">
                      <div className="w-10 text-sm font-medium text-slate-600">{week.weekLabel}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-xs text-slate-500">Created</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-400"
                              style={{ width: `${Math.min(100, Math.max(3, week.dealsCreated * 10))}%` }}
                            />
                          </div>
                          <span className="w-24 text-xs text-right text-slate-600">{week.dealsCreated} ({formatCurrency(week.valueCreated)})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="w-14 text-xs text-slate-500">Closed</span>
                          <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-400"
                              style={{ width: `${Math.min(100, Math.max(3, week.dealsClosed * 10))}%` }}
                            />
                          </div>
                          <span className="w-24 text-xs text-right text-slate-600">{week.dealsClosed} ({formatCurrency(week.valueClosed)})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-blue-400"></div>
                    <span className="text-xs text-slate-600">Deals Created</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-400"></div>
                    <span className="text-xs text-slate-600">Deals Closed</span>
                  </div>
                </div>
              </div>

              {/* Right Panel - Trends Table */}
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase">Week</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase bg-blue-50">Created</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase bg-blue-50">Value</th>
                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase bg-green-50">Closed</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase bg-green-50">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.trends.map((week) => (
                        <tr key={week.weekLabel} className="hover:bg-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-900">
                            <div>{week.weekLabel}</div>
                            <div className="text-xs text-slate-500">{week.weekStart}</div>
                          </td>
                          <td className="px-3 py-2 text-center bg-blue-50/30 font-medium text-blue-700">{week.dealsCreated}</td>
                          <td className="px-3 py-2 text-right bg-blue-50/30 text-blue-600">{formatCurrency(week.valueCreated)}</td>
                          <td className="px-3 py-2 text-center bg-green-50/30 font-medium text-green-700">{week.dealsClosed}</td>
                          <td className="px-3 py-2 text-right bg-green-50/30 text-green-600">{formatCurrency(week.valueClosed)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-semibold">
                        <td className="px-3 py-2.5">Total</td>
                        <td className="px-3 py-2.5 text-center text-blue-700">
                          {data.trends.reduce((sum, w) => sum + w.dealsCreated, 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-blue-700">
                          {formatCurrency(data.trends.reduce((sum, w) => sum + w.valueCreated, 0))}
                        </td>
                        <td className="px-3 py-2.5 text-center text-green-700">
                          {data.trends.reduce((sum, w) => sum + w.dealsClosed, 0)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-green-700">
                          {formatCurrency(data.trends.reduce((sum, w) => sum + w.valueClosed, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ReportTemplate>
  );
}
