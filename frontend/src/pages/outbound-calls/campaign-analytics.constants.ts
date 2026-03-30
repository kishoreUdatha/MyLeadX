/**
 * Campaign Analytics Constants
 */

export const OUTCOME_COLORS: Record<string, string> = {
  INTERESTED: '#10B981',
  NOT_INTERESTED: '#EF4444',
  CALLBACK_REQUESTED: '#3B82F6',
  NEEDS_FOLLOWUP: '#F59E0B',
  CONVERTED: '#8B5CF6',
  NO_ANSWER: '#6B7280',
  BUSY: '#F97316',
  VOICEMAIL: '#EC4899',
  NO_OUTCOME: '#9CA3AF',
};

export const OUTCOME_LABELS: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback Requested',
  NEEDS_FOLLOWUP: 'Needs Follow-up',
  CONVERTED: 'Converted',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  VOICEMAIL: 'Voicemail',
  NO_OUTCOME: 'No Outcome',
};

export const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: '#10B981',
  NEUTRAL: '#6B7280',
  NEGATIVE: '#EF4444',
};

export const FUNNEL_COLORS = ['#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#10B981'];

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}
