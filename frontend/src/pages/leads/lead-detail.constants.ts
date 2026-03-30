/**
 * Lead Detail Page Constants
 * Shared configuration for lead detail components
 */

import {
  DocumentIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  ChatBubbleOvalLeftIcon,
  PhoneIcon,
  CalendarIcon,
  PaperClipIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

export const statusOptions = [
  { value: 'NEW', label: 'New Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-green-100 text-green-700' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-100 text-purple-700' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'LOST', label: 'Lost', color: 'bg-red-100 text-red-700' },
  { value: 'FOLLOW_UP', label: 'Follow Up', color: 'bg-orange-100 text-orange-700' },
  { value: 'NOT_CONNECTED', label: 'Not Yet Connected', color: 'bg-gray-100 text-gray-700' },
];

export const tabs = [
  { id: 'overview', label: 'Overview', icon: DocumentIcon },
  { id: 'interests', label: 'Interests', icon: ClipboardDocumentListIcon },
  { id: 'timelines', label: 'Timelines', icon: ClockIcon },
  { id: 'notes', label: 'Notes', icon: ChatBubbleOvalLeftIcon },
  { id: 'calls', label: 'Calls', icon: PhoneIcon },
  { id: 'followups', label: 'Follow-ups', icon: CalendarIcon },
  { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { id: 'attachments', label: 'Attachments', icon: PaperClipIcon },
  { id: 'queries', label: 'Queries', icon: QuestionMarkCircleIcon },
  { id: 'applications', label: 'Applications', icon: DocumentTextIcon },
];

export const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

export const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export const followUpStatusColors: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  MISSED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-yellow-100 text-yellow-700',
};

export const queryStatusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export const applicationStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ENROLLED: 'bg-emerald-100 text-emerald-700',
};

export const getStatusInfo = (status: string) => {
  return statusOptions.find(s => s.value === status) || statusOptions[0];
};

export const getActivityIcon = (type: string) => {
  switch (type) {
    case 'NOTE_ADDED': return ChatBubbleOvalLeftIcon;
    case 'CALL_MADE': return PhoneIcon;
    case 'TASK_CREATED':
    case 'TASK_COMPLETED': return ClipboardDocumentListIcon;
    case 'FOLLOWUP_SCHEDULED':
    case 'FOLLOWUP_COMPLETED': return CalendarIcon;
    case 'DOCUMENT_UPLOADED': return PaperClipIcon;
    case 'APPLICATION_SUBMITTED': return DocumentTextIcon;
    default: return DocumentIcon;
  }
};
