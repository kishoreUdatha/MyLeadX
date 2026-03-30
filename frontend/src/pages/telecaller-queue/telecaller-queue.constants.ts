/**
 * Telecaller Queue Page Constants
 */

import { SentimentColor, CompleteFormData } from './telecaller-queue.types';

export const SENTIMENT_COLORS: Record<string, SentimentColor> = {
  positive: { bg: 'bg-success-50', text: 'text-success-700' },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-700' },
  negative: { bg: 'bg-danger-50', text: 'text-danger-700' },
};

export const OUTCOME_LABELS: Record<string, string> = {
  CONVERTED: 'Converted',
  APPOINTMENT_SET: 'Appointment Set',
  CALLBACK_SET: 'Callback Scheduled',
  NOT_INTERESTED: 'Not Interested',
  WRONG_NUMBER: 'Wrong Number',
  NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail',
  DO_NOT_CALL: 'Do Not Call',
};

export const INITIAL_COMPLETE_FORM: CompleteFormData = {
  outcome: '',
  notes: '',
  callbackDate: '',
  callbackTime: '',
};

export const REFRESH_INTERVAL = 30000; // 30 seconds

export function getSentimentClasses(sentiment: string | null | undefined): { bg: string; text: string } {
  if (!sentiment) return { bg: 'bg-slate-100', text: 'text-slate-700' };
  return SENTIMENT_COLORS[sentiment] || { bg: 'bg-slate-100', text: 'text-slate-700' };
}

export function formatCallDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
