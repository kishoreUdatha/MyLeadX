/**
 * Call Details Constants
 */

import { StatusConfig } from './call-details.types';

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  RINGING: { label: 'Ringing', color: 'bg-yellow-100 text-yellow-700' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-700' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  INITIATED: { label: 'Initiated', color: 'bg-purple-100 text-purple-700' },
  QUEUED: { label: 'Queued', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

export const OUTCOME_CONFIG: Record<string, StatusConfig> = {
  INTERESTED: { label: 'Interested', color: 'bg-green-100 text-green-700' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'bg-red-100 text-red-700' },
  CALLBACK_REQUESTED: { label: 'Callback', color: 'bg-blue-100 text-blue-700' },
  WRONG_NUMBER: { label: 'Wrong Number', color: 'bg-gray-100 text-gray-700' },
  VOICEMAIL: { label: 'Voicemail', color: 'bg-yellow-100 text-yellow-700' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-700' },
  DO_NOT_CALL: { label: 'DNC', color: 'bg-red-100 text-red-700' },
  CONVERTED: { label: 'Converted', color: 'bg-green-100 text-green-700' },
  NEEDS_FOLLOWUP: { label: 'Follow-up', color: 'bg-blue-100 text-blue-700' },
};

export const EXCLUDED_QUALIFICATION_KEYS = [
  'name', 'customerName', 'email', 'phone', 'location', 'company'
];

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleDateString();
}

export function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return 'bg-green-100 text-green-700';
    case 'negative': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

export function formatQualificationValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'object') {
    if (value.finalMood || value.mood) {
      const mood = value.finalMood || value.mood;
      const intensity = value.intensity || '';
      const changes = value.moodChanges || value.changes || 0;
      let displayValue = intensity ? `${mood} (${intensity})` : mood;
      if (changes > 0) displayValue += ` - ${changes} changes`;
      return displayValue;
    }
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

export function formatQualificationKey(key: string): string {
  return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
}

export function isLongTextKey(key: string, value: string): boolean {
  return value.length > 40 ||
    ['keyPoints', 'nextAction', 'summary', 'requirements', 'notes'].includes(key);
}
