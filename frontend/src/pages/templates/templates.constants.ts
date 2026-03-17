/**
 * Templates Constants
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

export const extractVariablesFromContent = (content: string): string[] => {
  const regex = /\{\{(\w+)\}\}/g;
  const vars: string[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (!vars.includes(match[1])) {
      vars.push(match[1]);
    }
  }
  return vars;
};

export const getWhatsAppStatusBadge = (status: string): { className: string; label: string } => {
  switch (status) {
    case 'APPROVED':
      return { className: 'badge badge-success', label: 'Approved' };
    case 'REJECTED':
      return { className: 'badge badge-danger', label: 'Rejected' };
    case 'PENDING':
      return { className: 'badge badge-warning', label: 'Pending' };
    default:
      return { className: 'badge', label: status };
  }
};
