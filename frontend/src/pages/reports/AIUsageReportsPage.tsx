import { useEffect, useState } from 'react';
import {
  CpuChipIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowsRightLeftIcon,
  CurrencyDollarIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { aiUsageReportsService, ComprehensiveAIUsageReport, ReportFilters } from '../../services/ai-usage-reports.service';

type TabType = 'overview' | 'agents' | 'outcomes' | 'costs';

export default function AIUsageReportsPage() {
  const [report, setReport] = useState<ComprehensiveAIUsageReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
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
    }
    setFilters({ startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await aiUsageReportsService.getComprehensive(filters);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load AI usage reports');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!report) return null;

  const { summary, calls, qualified, transfers, agentPerformance, tokenUsage } = report;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">AI Usage Reports</h1>
          <p className="text-slate-500 text-xs">Voice AI agent analytics and performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="input text-sm py-1.5 px-3">
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
          <button onClick={loadReport} className="btn btn-secondary py-1.5 px-3"><ArrowPathIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total AI Calls</p>
              <p className="text-xl font-bold text-slate-900">{summary.totalCalls}</p>
              <p className="text-xs text-success-600">{summary.successRate}% connected</p>
            </div>
            <PhoneIcon className="w-8 h-8 text-primary-200" />
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Minutes Used</p>
              <p className="text-xl font-bold text-slate-900">{summary.totalMinutes}</p>
              <p className="text-xs text-slate-500">Avg {Math.round(summary.avgCallDuration / 60)}:{(summary.avgCallDuration % 60).toString().padStart(2, '0')}/call</p>
            </div>
            <ClockIcon className="w-8 h-8 text-success-200" />
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Qualified Leads</p>
              <p className="text-xl font-bold text-success-600">{summary.qualifiedLeads}</p>
              <p className="text-xs text-slate-500">{qualified.qualificationRate}% rate</p>
            </div>
            <CheckCircleIcon className="w-8 h-8 text-success-200" />
          </div>
        </div>
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Cost Estimate</p>
              <p className="text-xl font-bold text-slate-900">${summary.costEstimate.toFixed(2)}</p>
              <p className="text-xs text-slate-500">{summary.transfersToHuman} transfers</p>
            </div>
            <CurrencyDollarIcon className="w-8 h-8 text-warning-200" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'agents', label: 'AI Agents' },
            { key: 'outcomes', label: 'Outcomes' },
            { key: 'costs', label: 'Token Usage' },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 py-2 text-sm font-medium border-b-2 ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Call Breakdown */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Call Breakdown</h3>
            </div>
            <div className="p-3 space-y-2">
              {[
                { label: 'Connected', value: calls.connectedCalls, color: 'bg-success-500' },
                { label: 'No Answer', value: calls.noAnswerCalls, color: 'bg-warning-500' },
                { label: 'Failed', value: calls.failedCalls, color: 'bg-danger-500' },
                { label: 'Busy', value: calls.busyCalls, color: 'bg-slate-400' },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="text-xs text-slate-600 flex-1">{item.label}</span>
                  <span className="text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Transfer Report */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Human Transfers</h3>
            </div>
            <div className="p-3">
              <div className="text-center mb-3">
                <p className="text-3xl font-bold text-primary-600">{transfers.totalTransfers}</p>
                <p className="text-xs text-slate-500">{transfers.transferRate}% transfer rate</p>
              </div>
              <div className="space-y-1">
                {transfers.transferReasons.slice(0, 4).map((reason) => (
                  <div key={reason.reason} className="flex justify-between text-xs">
                    <span className="text-slate-600">{reason.reason}</span>
                    <span className="font-medium">{reason.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agents' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Agent</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Calls</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Connected</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Avg Duration</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Qualified</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Transfers</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Success</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {agentPerformance.map((agent) => (
                <tr key={agent.agentId} className="hover:bg-slate-50">
                  <td className="px-3 py-2 text-sm font-medium text-slate-900">{agent.agentName}</td>
                  <td className="px-3 py-2 text-sm text-right">{agent.totalCalls}</td>
                  <td className="px-3 py-2 text-sm text-right text-success-600">{agent.connectedCalls}</td>
                  <td className="px-3 py-2 text-sm text-right">{Math.round(agent.avgDuration / 60)}:{(agent.avgDuration % 60).toString().padStart(2, '0')}</td>
                  <td className="px-3 py-2 text-sm text-right text-primary-600">{agent.qualifiedLeads}</td>
                  <td className="px-3 py-2 text-sm text-right">{agent.transfers}</td>
                  <td className="px-3 py-2 text-sm text-right font-medium">{agent.successRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'outcomes' && (
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Call Outcomes</h3>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              {qualified.byOutcome.map((outcome) => (
                <div key={outcome.outcome} className="flex items-center gap-2">
                  <span className="text-xs text-slate-600 w-32">{outcome.outcome}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-4">
                    <div className="bg-primary-500 h-4 rounded-full" style={{ width: `${outcome.percentage}%` }} />
                  </div>
                  <span className="text-xs font-medium w-12 text-right">{outcome.count}</span>
                  <span className="text-xs text-slate-500 w-12 text-right">{outcome.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="card p-3">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Token Usage Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-slate-600">Total Tokens</span><span className="font-bold">{tokenUsage.totalTokens.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Input Tokens</span><span>{tokenUsage.inputTokens.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-slate-600">Output Tokens</span><span>{tokenUsage.outputTokens.toLocaleString()}</span></div>
              <div className="flex justify-between border-t pt-2"><span className="text-slate-600">Estimated Cost</span><span className="font-bold text-primary-600">${tokenUsage.estimatedCost.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="card p-3">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Usage by Agent</h3>
            <div className="space-y-2">
              {tokenUsage.byAgent.slice(0, 5).map((agent) => (
                <div key={agent.agentId} className="flex justify-between text-sm">
                  <span className="text-slate-600">{agent.agentName}</span>
                  <span className="font-medium">{agent.tokens.toLocaleString()} tokens</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
