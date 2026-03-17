/**
 * Scheduled Messages Types
 */

export interface ScheduledMessage {
  id: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  recipients: any[];
  subject: string | null;
  content: string;
  templateId: string | null;
  scheduledAt: string;
  timezone: string;
  isRecurring: boolean;
  recurringRule: string | null;
  recurringEndAt: string | null;
  nextRunAt: string | null;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'PAUSED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  name: string | null;
  createdAt: string;
}

export interface ScheduledMessageStats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  recurring: number;
  upcoming24h: number;
}

export interface MessageTemplate {
  id: string;
  name: string;
  type: string;
  content: string;
}

export interface ScheduledMessageFormData {
  name: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  recipients: string;
  subject: string;
  content: string;
  templateId: string;
  scheduledAt: string;
  timezone: string;
  isRecurring: boolean;
  recurringRule: string;
  recurringEndAt: string;
}

export const initialFormData: ScheduledMessageFormData = {
  name: '',
  type: 'SMS',
  recipients: '',
  subject: '',
  content: '',
  templateId: '',
  scheduledAt: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  isRecurring: false,
  recurringRule: '',
  recurringEndAt: '',
};
