/**
 * Failure Analysis Report - AI analysis of why calls didn't convert
 */
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, PhoneXMarkIcon, ArrowPathIcon, ChartBarIcon, XMarkIcon, PlayIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface FailureCall {
  id: string;
  contactName: string;
  phoneNumber: string;
  outcome: string;
  duration: number;
  startedAt: string;
  endedAt: string;
  callType: string;
  sentiment: string;
  callQualityScore: number;
  summary: string;
  notes: string;
  recordingUrl: string;
  totalAttempts: number;
  leadStage: string;
  leadName: string;
  telecallerName: string;
  telecallerEmail: string;
  failurePrimaryReason: string;
  failureConfidence: number;
  failureRecoveryProbability: number;
  failureWhyNotConverted: string;
  failureSuggestedFollowUp: string;
  failureObjections: string[];
  failureSecondaryReasons: string[];
}

interface ReasonBreakdown {
  reason: string;
  count: number;
  percentage: number;
}

interface Summary {
  totalFailedCalls: number;
  avgRecoveryProbability: number;
  topFailureReason: string;
  reasonBreakdown: ReasonBreakdown[];
}

const REASON_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  price: { icon: '💰', label: 'Price Concern', color: 'text-red-700', bgColor: 'bg-red-50' },
  timing: { icon: '⏰', label: 'Timing Issue', color: 'text-amber-700', bgColor: 'bg-amber-50' },
  authority: { icon: '👥', label: 'Decision Maker', color: 'text-purple-700', bgColor: 'bg-purple-50' },
  competitor: { icon: '🆚', label: 'Competitor', color: 'text-blue-700', bgColor: 'bg-blue-50' },
  no_need: { icon: '❓', label: 'No Need', color: 'text-gray-700', bgColor: 'bg-gray-50' },
  trust: { icon: '🤝', label: 'Trust Issue', color: 'text-yellow-700', bgColor: 'bg-yellow-50' },
  missing_info: { icon: '📋', label: 'Missing Info', color: 'text-cyan-700', bgColor: 'bg-cyan-50' },
  not_interested: { icon: '🚫', label: 'Not Interested', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  unreachable: { icon: '📵', label: 'Unreachable', color: 'text-gray-600', bgColor: 'bg-gray-50' },
  other: { icon: '📝', label: 'Other', color: 'text-gray-600', bgColor: 'bg-gray-50' },
};

const getReasonConfig = (reason: string) => {
  return REASON_CONFIG[reason?.toLowerCase()] || REASON_CONFIG.other;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getRecoveryColor = (probability: number): string => {
  if (probability >= 70) return 'text-green-600 bg-green-50';
  if (probability >= 40) return 'text-amber-600 bg-amber-50';
  return 'text-red-600 bg-red-50';
};

export default function FailureAnalysisReportPage() {
  const [data, setData] = useState<{ calls: FailureCall[]; summary: Summary } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('all');
  const [selectedCall, setSelectedCall] = useState<FailureCall | null>(null);
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
    setError(null);
    try {
      const response = await api.get('/call-reports/failure-analysis', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });
      setData(response.data.data);
    } catch (err: any) {
      console.error('Failed to load failure analysis data:', err);
      setError(err.response?.data?.message || 'Failed to load report data');
      toast.error('Failed to load failure analysis report');
    } finally {
      setIsLoading(false);
    }
  };

  const calls = data?.calls || [];
  const summary = data?.summary || {
    totalFailedCalls: 0,
    avgRecoveryProbability: 0,
    topFailureReason: 'N/A',
    reasonBreakdown: []
  };

  // Filter calls
  const filteredCalls = calls.filter(call => {
    const matchesSearch = !searchValue.trim() ||
      call.contactName?.toLowerCase().includes(searchValue.toLowerCase()) ||
      call.phoneNumber?.includes(searchValue) ||
      call.telecallerName?.toLowerCase().includes(searchValue.toLowerCase());

    const matchesReason = selectedReason === 'all' ||
      call.failurePrimaryReason?.toLowerCase() === selectedReason.toLowerCase();

    return matchesSearch && matchesReason;
  });

  const handleExport = () => {
    if (!filteredCalls.length) {
      toast.error('No data to export');
      return;
    }
    const headers = [
      'Contact', 'Phone', 'Lead Name', 'Telecaller', 'Telecaller Email', 'Outcome',
      'Duration', 'Attempts', 'Call Quality', 'Sentiment', 'Lead Stage',
      'Failure Reason', 'Confidence %', 'Recovery %',
      'AI Analysis', 'Suggested Follow-up', 'Call Summary', 'Date', 'Time'
    ];
    const csvRows = [headers.join(',')];
    filteredCalls.forEach((call) => {
      csvRows.push([
        `"${call.contactName || 'Unknown'}"`,
        call.phoneNumber,
        `"${call.leadName || ''}"`,
        `"${call.telecallerName}"`,
        call.telecallerEmail || '',
        call.outcome,
        formatDuration(call.duration || 0),
        call.totalAttempts || 1,
        call.callQualityScore ? `${call.callQualityScore}%` : '-',
        call.sentiment || 'neutral',
        call.leadStage || '-',
        call.failurePrimaryReason || 'Unknown',
        call.failureConfidence ? `${call.failureConfidence}%` : '-',
        `${call.failureRecoveryProbability || 0}%`,
        `"${(call.failureWhyNotConverted || '').replace(/"/g, '""')}"`,
        `"${(call.failureSuggestedFollowUp || '').replace(/"/g, '""')}"`,
        `"${(call.summary || '').replace(/"/g, '""')}"`,
        call.startedAt ? new Date(call.startedAt).toLocaleDateString() : '-',
        call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : '-'
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `failure-analysis-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  const topReasonConfig = getReasonConfig(summary.topFailureReason);

  return (
    <ReportTemplate
      title="Call Failure Analysis"
      description="AI-powered insights into why calls didn't convert"
      icon={ExclamationTriangleIcon}
      iconColor="bg-red-500"
      isLoading={isLoading}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search by contact, phone, or telecaller..."
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Stats Grid */}
        <ReportStatsGrid>
          <ReportStatCard
            label="Failed Calls"
            value={summary.totalFailedCalls}
            icon={PhoneXMarkIcon}
            iconColor="bg-red-500"
          />
          <ReportStatCard
            label="Avg Recovery %"
            value={`${summary.avgRecoveryProbability}%`}
            icon={ArrowPathIcon}
            iconColor="bg-amber-500"
          />
          <ReportStatCard
            label="Top Blocker"
            value={topReasonConfig.label}
            icon={ChartBarIcon}
            iconColor="bg-purple-500"
          />
        </ReportStatsGrid>

        {/* Reason Breakdown Chart */}
        {summary.reasonBreakdown.length > 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Failure Reasons Breakdown</h3>
            <div className="space-y-2">
              {summary.reasonBreakdown.map((item) => {
                const config = getReasonConfig(item.reason);
                return (
                  <div key={item.reason} className="flex items-center gap-3">
                    <div className="w-32 flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span className="text-xs font-medium text-slate-600">{config.label}</span>
                    </div>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bgColor} flex items-center justify-end pr-2 transition-all`}
                        style={{ width: `${Math.max(item.percentage, 5)}%` }}
                      >
                        <span className="text-xs font-semibold text-slate-700">{item.count}</span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 w-12 text-right">{item.percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter by Reason */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600">Filter by reason:</span>
          <select
            value={selectedReason}
            onChange={(e) => setSelectedReason(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Reasons</option>
            {Object.entries(REASON_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>{config.icon} {config.label}</option>
            ))}
          </select>
        </div>

        {/* Calls Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Contact</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Telecaller</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Outcome</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-indigo-50">Duration</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Attempts</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Quality</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-teal-50">Sentiment</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Lead Stage</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Blocker</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-amber-50">Recovery %</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">AI Analysis</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Suggested Action</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Summary</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Date & Time</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Recording</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCalls.length > 0 ? (
                  filteredCalls.map((call) => {
                    const reasonConfig = getReasonConfig(call.failurePrimaryReason);
                    const sentimentColor = call.sentiment === 'positive' ? 'text-green-600 bg-green-50' :
                                           call.sentiment === 'negative' ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50';
                    const isSelected = selectedCall?.id === call.id;
                    return (
                      <tr
                        key={call.id}
                        className={`hover:bg-slate-50 cursor-pointer ${isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                        onClick={() => setSelectedCall(call)}
                      >
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-slate-900">{call.contactName || 'Unknown'}</div>
                            <div className="text-xs text-slate-500 font-mono">{call.phoneNumber}</div>
                            {call.leadName && <div className="text-xs text-blue-600">{call.leadName}</div>}
                          </div>
                        </td>
                          <td className="px-3 py-3 whitespace-nowrap">
                            <div className="text-sm text-slate-600">{call.telecallerName}</div>
                            {call.telecallerEmail && <div className="text-xs text-slate-400">{call.telecallerEmail}</div>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              {call.outcome}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-indigo-50/30">
                            <span className="text-xs font-medium text-indigo-700">{formatDuration(call.duration || 0)}</span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-purple-50/30">
                            <span className="px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-700">
                              {call.totalAttempts || 1}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-cyan-50/30">
                            {call.callQualityScore ? (
                              <span className={`text-xs font-bold ${call.callQualityScore >= 70 ? 'text-green-600' : call.callQualityScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                                {call.callQualityScore}%
                              </span>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-teal-50/30">
                            <span className={`px-2 py-1 text-xs font-medium rounded capitalize ${sentimentColor}`}>
                              {call.sentiment || 'neutral'}
                            </span>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            {call.leadStage ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-slate-100 text-slate-700">
                                {call.leadStage}
                              </span>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-red-50/30">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${reasonConfig.bgColor} ${reasonConfig.color}`}>
                              {reasonConfig.icon} {reasonConfig.label}
                            </span>
                            {call.failureConfidence && (
                              <div className="text-[10px] text-slate-400 mt-0.5">{call.failureConfidence}% conf</div>
                            )}
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center bg-amber-50/30">
                            <span className={`px-2 py-1 text-xs font-bold rounded ${getRecoveryColor(call.failureRecoveryProbability || 0)}`}>
                              {call.failureRecoveryProbability || 0}%
                            </span>
                          </td>
                          <td className="px-3 py-3 bg-blue-50/30 max-w-[200px]">
                            <p className="text-xs text-slate-700 line-clamp-2">
                              {call.failureWhyNotConverted || 'No analysis available'}
                            </p>
                          </td>
                          <td className="px-3 py-3 bg-green-50/30 max-w-[150px]">
                            <p className="text-xs text-slate-700 line-clamp-1">
                              {call.failureSuggestedFollowUp || '-'}
                            </p>
                          </td>
                          <td className="px-3 py-3 bg-orange-50/30 max-w-[180px]">
                            <p className="text-xs text-slate-700 line-clamp-1">
                              {call.summary || '-'}
                            </p>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            <div className="text-xs text-slate-700">{call.startedAt ? new Date(call.startedAt).toLocaleDateString() : '-'}</div>
                            <div className="text-[10px] text-slate-400">{call.startedAt ? new Date(call.startedAt).toLocaleTimeString() : ''}</div>
                          </td>
                          <td className="px-3 py-3 whitespace-nowrap text-center">
                            {call.recordingUrl ? (
                              <a
                                href={call.recordingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Play
                              </a>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                        </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={15} className="px-3 py-8 text-center text-sm text-slate-500">
                      No failed calls with analysis found for the selected filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        {filteredCalls.length > 0 && (
          <div className="text-sm text-slate-500 text-right">
            Showing {filteredCalls.length} of {calls.length} failed calls
          </div>
        )}
      </div>

      {/* Right Side Panel */}
      {selectedCall && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 transition-opacity"
            onClick={() => setSelectedCall(null)}
          />

          {/* Panel */}
          <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl z-50 overflow-y-auto animate-slide-in-right">
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-red-500 to-amber-500 text-white px-6 py-4 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedCall.contactName || 'Unknown Contact'}</h2>
                  <p className="text-sm opacity-90">{selectedCall.phoneNumber}</p>
                </div>
                <button
                  onClick={() => setSelectedCall(null)}
                  className="p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <div className="text-2xl font-bold text-red-600">{selectedCall.outcome}</div>
                  <div className="text-xs text-red-700">Outcome</div>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                  <div className="text-2xl font-bold text-indigo-600">{formatDuration(selectedCall.duration || 0)}</div>
                  <div className="text-xs text-indigo-700">Duration</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                  <div className="text-2xl font-bold text-purple-600">{selectedCall.totalAttempts || 1}</div>
                  <div className="text-xs text-purple-700">Attempts</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                  <div className="text-2xl font-bold text-amber-600">{selectedCall.failureRecoveryProbability || 0}%</div>
                  <div className="text-xs text-amber-700">Recovery</div>
                </div>
              </div>

              {/* Primary Blocker */}
              <div className="bg-red-50 rounded-xl p-4 border border-red-200">
                <h3 className="text-sm font-semibold text-red-800 mb-2 flex items-center gap-2">
                  <span className="text-lg">{getReasonConfig(selectedCall.failurePrimaryReason).icon}</span>
                  Primary Blocker
                </h3>
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1.5 text-sm font-medium rounded-full ${getReasonConfig(selectedCall.failurePrimaryReason).bgColor} ${getReasonConfig(selectedCall.failurePrimaryReason).color}`}>
                    {getReasonConfig(selectedCall.failurePrimaryReason).label}
                  </span>
                  {selectedCall.failureConfidence && (
                    <span className="text-sm text-red-600">{selectedCall.failureConfidence}% confidence</span>
                  )}
                </div>
              </div>

              {/* AI Analysis */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-2">
                  <span>🤖</span> AI Analysis - Why Call Didn't Convert
                </h3>
                <p className="text-sm text-blue-900 leading-relaxed">
                  {selectedCall.failureWhyNotConverted || 'No analysis available'}
                </p>
              </div>

              {/* Suggested Follow-up */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                  <span>📋</span> Suggested Follow-up Action
                </h3>
                <p className="text-sm text-green-900 leading-relaxed">
                  {selectedCall.failureSuggestedFollowUp || 'No suggestion available'}
                </p>
              </div>

              {/* Call Summary */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <h3 className="text-sm font-semibold text-orange-800 mb-3 flex items-center gap-2">
                  <span>📝</span> Call Summary
                </h3>
                <p className="text-sm text-orange-900 leading-relaxed">
                  {selectedCall.summary || 'No summary available'}
                </p>
              </div>

              {/* Customer Objections */}
              {selectedCall.failureObjections && Array.isArray(selectedCall.failureObjections) && selectedCall.failureObjections.length > 0 && (
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-800 mb-3 flex items-center gap-2">
                    <span>🗣️</span> Customer Objections
                  </h3>
                  <ul className="space-y-2">
                    {selectedCall.failureObjections.map((obj: string, idx: number) => (
                      <li key={idx} className="text-sm text-amber-900 flex items-start gap-2 bg-white/50 rounded-lg p-2">
                        <span className="text-amber-500 mt-0.5">❝</span>
                        <span className="italic">{obj}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Secondary Reasons */}
              {selectedCall.failureSecondaryReasons && Array.isArray(selectedCall.failureSecondaryReasons) && selectedCall.failureSecondaryReasons.length > 0 && (
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-2">
                    <span>📊</span> Additional Contributing Factors
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCall.failureSecondaryReasons.map((reason: string, idx: number) => {
                      const config = getReasonConfig(reason);
                      return (
                        <span key={idx} className={`text-sm px-3 py-1.5 rounded-full ${config.bgColor} ${config.color}`}>
                          {config.icon} {config.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Call Details */}
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span>📞</span> Call Details
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-slate-500">Telecaller:</span>
                    <span className="ml-2 font-medium text-slate-800">{selectedCall.telecallerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Date:</span>
                    <span className="ml-2 font-medium text-slate-800">
                      {selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleDateString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Time:</span>
                    <span className="ml-2 font-medium text-slate-800">
                      {selectedCall.startedAt ? new Date(selectedCall.startedAt).toLocaleTimeString() : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Quality:</span>
                    <span className={`ml-2 font-medium ${selectedCall.callQualityScore && selectedCall.callQualityScore >= 70 ? 'text-green-600' : selectedCall.callQualityScore && selectedCall.callQualityScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {selectedCall.callQualityScore ? `${selectedCall.callQualityScore}%` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Sentiment:</span>
                    <span className={`ml-2 font-medium capitalize ${selectedCall.sentiment === 'positive' ? 'text-green-600' : selectedCall.sentiment === 'negative' ? 'text-red-600' : 'text-slate-600'}`}>
                      {selectedCall.sentiment || 'neutral'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lead Stage:</span>
                    <span className="ml-2 font-medium text-slate-800">{selectedCall.leadStage || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedCall.notes && (
                <div className="bg-slate-100 rounded-xl p-4 border border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <span>📌</span> Agent Notes
                  </h3>
                  <p className="text-sm text-slate-700">{selectedCall.notes}</p>
                </div>
              )}

              {/* Recording */}
              {selectedCall.recordingUrl && (
                <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
                  <h3 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
                    <span>🎵</span> Call Recording
                  </h3>
                  <a
                    href={selectedCall.recordingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <PlayIcon className="w-4 h-4" />
                    Play Recording
                  </a>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  <span>📄</span> Send Document
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
                  <span>📞</span> Schedule Follow-up
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </ReportTemplate>
  );
}
