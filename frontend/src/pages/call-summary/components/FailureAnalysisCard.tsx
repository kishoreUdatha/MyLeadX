/**
 * Failure Analysis Card Component (Isolated Feature)
 *
 * Displays AI-generated analysis for why a call didn't convert.
 * Only shown for non-won calls (NOT_INTERESTED, NEEDS_FOLLOWUP, etc.)
 *
 * Design: Hybrid of Vercel (clean metrics) + Conversational AI (natural explanation)
 */

import React, { useState } from 'react';
import {
  CallFailureAnalysis,
  FailureReasonCategory,
  KeyMoment,
  MissedOpportunity,
  RecoveryAction,
} from '../call-summary.types';

// =====================
// Helper Functions
// =====================

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
};

const getReasonConfig = (reason: FailureReasonCategory): { icon: string; label: string; color: string; bgColor: string } => {
  const configs: Record<FailureReasonCategory, { icon: string; label: string; color: string; bgColor: string }> = {
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
  return configs[reason] || configs.other;
};

const getPriorityColor = (priority: string): string => {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-700 border-red-200';
    case 'medium': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'low': return 'bg-green-100 text-green-700 border-green-200';
    default: return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getRecoveryColor = (probability: number): { text: string; bar: string; label: string } => {
  if (probability >= 70) return { text: 'text-green-600', bar: 'bg-green-500', label: 'High Chance' };
  if (probability >= 40) return { text: 'text-amber-600', bar: 'bg-amber-500', label: 'Moderate' };
  return { text: 'text-red-600', bar: 'bg-red-500', label: 'Low Chance' };
};

const getMomentTypeConfig = (type: KeyMoment['type']): { icon: string; color: string } => {
  const configs: Record<KeyMoment['type'], { icon: string; color: string }> = {
    objection: { icon: '⚠️', color: 'text-amber-600' },
    hesitation: { icon: '🤔', color: 'text-yellow-600' },
    missed_opportunity: { icon: '❌', color: 'text-red-600' },
    positive: { icon: '✅', color: 'text-green-600' },
    negative: { icon: '👎', color: 'text-red-600' },
  };
  return configs[type] || { icon: '•', color: 'text-gray-600' };
};

// =====================
// Sub-Components
// =====================

interface MetricCardProps {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, subValue, className = '' }) => (
  <div className={`bg-white rounded-lg p-3 border border-gray-100 ${className}`}>
    <div className="text-xl mb-1">{icon}</div>
    <div className="text-lg font-bold text-gray-800">{value}</div>
    <div className="text-[10px] text-gray-500">{label}</div>
    {subValue && <div className="text-[10px] text-gray-400 mt-0.5">{subValue}</div>}
  </div>
);

// =====================
// Main Component
// =====================

interface FailureAnalysisCardProps {
  analysis: CallFailureAnalysis;
  isExpanded?: boolean;
  onToggle?: () => void;
  onScheduleFollowUp?: () => void;
  onSendDocument?: () => void;
  onAddNote?: () => void;
}

export const FailureAnalysisCard: React.FC<FailureAnalysisCardProps> = ({
  analysis,
  isExpanded = true,
  onToggle,
  onScheduleFollowUp,
  onSendDocument,
  onAddNote,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'moments' | 'actions'>('overview');

  const reasonConfig = getReasonConfig(analysis.primaryReason);
  const recoveryColor = getRecoveryColor(analysis.recoveryProbability);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-red-50 to-amber-50 cursor-pointer hover:from-red-100 hover:to-amber-100 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🔍</span>
          <span className="text-sm font-semibold text-gray-800">Why This Call Didn't Convert</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {isExpanded && (
        <div className="p-4">
          {/* Metric Cards */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <MetricCard
              icon="❌"
              label="Result"
              value="Lost"
              className="border-l-4 border-l-red-400"
            />
            <MetricCard
              icon={reasonConfig.icon}
              label="Blocker"
              value={reasonConfig.label.split(' ')[0]}
              className={`border-l-4 border-l-amber-400`}
            />
            <MetricCard
              icon="🎯"
              label="Recovery"
              value={`${analysis.recoveryProbability}%`}
              subValue={recoveryColor.label}
              className="border-l-4 border-l-blue-400"
            />
            <MetricCard
              icon="📅"
              label="Follow-up"
              value={analysis.suggestedFollowUp.split(' ')[0] || '3'}
              subValue={analysis.suggestedFollowUp.includes('day') ? 'days' : 'soon'}
              className="border-l-4 border-l-green-400"
            />
          </div>

          {/* AI Analysis Summary */}
          <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">🤖</span>
              <span className="text-xs font-semibold text-blue-800">AI Analysis</span>
            </div>
            <p className="text-xs text-blue-900 leading-relaxed">
              {analysis.whyNotConverted}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
            {(['overview', 'moments', 'actions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
                  activeTab === tab
                    ? 'bg-gray-100 text-gray-800'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {tab === 'overview' && 'Overview'}
                {tab === 'moments' && `Key Moments (${analysis.keyMoments.length})`}
                {tab === 'actions' && `Actions (${analysis.recoveryActions.length})`}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Customer Objections */}
              {analysis.customerObjections.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs">🗣️</span>
                    <span className="text-xs font-semibold text-gray-700">Customer Objections</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.customerObjections.map((objection, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 rounded p-2 border-l-2 border-amber-400"
                      >
                        <p className="text-xs text-gray-700 italic">"{objection}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Missed Opportunities */}
              {analysis.missedOpportunities.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs">⚠️</span>
                    <span className="text-xs font-semibold text-gray-700">Missed Opportunities</span>
                  </div>
                  <div className="space-y-2">
                    {analysis.missedOpportunities.map((opp, idx) => (
                      <div key={idx} className="bg-amber-50 rounded p-2 border border-amber-100">
                        <div className="text-xs text-amber-800 font-medium mb-1">
                          ❌ {opp.issue}
                        </div>
                        <div className="text-[11px] text-amber-700">
                          💡 Better: {opp.betterResponse}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secondary Reasons */}
              {analysis.secondaryReasons.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <span className="text-xs">📊</span>
                    <span className="text-xs font-semibold text-gray-700">Contributing Factors</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {analysis.secondaryReasons.map((reason, idx) => {
                      const config = getReasonConfig(reason);
                      return (
                        <span
                          key={idx}
                          className={`text-[10px] px-2 py-1 rounded-full ${config.bgColor} ${config.color}`}
                        >
                          {config.icon} {config.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'moments' && (
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {analysis.keyMoments.length > 0 ? (
                analysis.keyMoments.map((moment, idx) => {
                  const config = getMomentTypeConfig(moment.type);
                  return (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded p-2 border border-gray-100 hover:border-gray-200 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${config.color}`}>{config.icon}</span>
                          <span className="text-[10px] text-blue-600 font-medium">
                            {formatDuration(moment.timestamp)}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-400 capitalize">
                          {moment.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 italic mb-1">"{moment.quote}"</p>
                      <p className="text-[11px] text-gray-500">{moment.analysis}</p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4 text-xs text-gray-400">
                  No key moments identified
                </div>
              )}
            </div>
          )}

          {activeTab === 'actions' && (
            <div className="space-y-3">
              {/* Recovery Probability Bar */}
              <div className="bg-gray-50 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">Recovery Probability</span>
                  <span className={`text-sm font-bold ${recoveryColor.text}`}>
                    {analysis.recoveryProbability}%
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${recoveryColor.bar} rounded-full transition-all`}
                    style={{ width: `${analysis.recoveryProbability}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">
                  {analysis.suggestedFollowUp}
                </p>
              </div>

              {/* Recovery Actions */}
              {analysis.recoveryActions.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-gray-700 mb-2">Recommended Actions</div>
                  <div className="space-y-2">
                    {analysis.recoveryActions.map((action, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded border ${getPriorityColor(action.priority)}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{action.action}</span>
                          <span className="text-[9px] uppercase">{action.priority}</span>
                        </div>
                        <span className="text-[10px] opacity-75">{action.timeframe}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={onSendDocument}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 text-blue-700 rounded text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <span>📄</span> Send Doc
                </button>
                <button
                  onClick={onScheduleFollowUp}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded text-xs font-medium hover:bg-green-100 transition-colors"
                >
                  <span>📞</span> Schedule
                </button>
                <button
                  onClick={onAddNote}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-50 text-gray-700 rounded text-xs font-medium hover:bg-gray-100 transition-colors"
                >
                  <span>📝</span> Add Note
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =====================
// Utility: Check if call should show failure analysis
// =====================

const NON_WON_OUTCOMES = [
  'NOT_INTERESTED',
  'NEEDS_FOLLOWUP',
  'CALLBACK_REQUESTED',
  'NO_ANSWER',
  'VOICEMAIL',
  'WRONG_NUMBER',
  'BUSY',
  'DROPPED',
  'DNC_REQUESTED',
  'DO_NOT_CALL',
];

export const shouldShowFailureAnalysis = (outcome: string | null | undefined): boolean => {
  if (!outcome) return false;
  return NON_WON_OUTCOMES.includes(outcome.toUpperCase());
};

export default FailureAnalysisCard;
