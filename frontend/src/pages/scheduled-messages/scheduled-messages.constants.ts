/**
 * Scheduled Messages Constants
 */

import {
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';

export const typeIcons = {
  SMS: DevicePhoneMobileIcon,
  EMAIL: EnvelopeIcon,
  WHATSAPP: ChatBubbleLeftIcon,
};

export const typeColors = {
  SMS: 'bg-blue-100 text-blue-700',
  EMAIL: 'bg-purple-100 text-purple-700',
  WHATSAPP: 'bg-green-100 text-green-700',
};

export const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  PAUSED: 'bg-orange-100 text-orange-700',
};

export const recurringLabels: Record<string, string> = {
  daily: 'Every Day',
  weekly: 'Every Week',
  biweekly: 'Every 2 Weeks',
  monthly: 'Every Month',
  quarterly: 'Every 3 Months',
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

export const getTimeUntil = (dateStr: string): string => {
  const now = new Date();
  const target = new Date(dateStr);
  const diff = target.getTime() - now.getTime();

  if (diff < 0) return 'Past';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `In ${days} day${days > 1 ? 's' : ''}`;
  }

  if (hours > 0) {
    return `In ${hours}h ${minutes}m`;
  }

  return `In ${minutes}m`;
};
