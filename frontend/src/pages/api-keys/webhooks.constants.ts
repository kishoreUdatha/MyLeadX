/**
 * Webhooks Page Constants
 */

import { WebhookFormData } from './webhooks.types';

export const INITIAL_FORM_DATA: WebhookFormData = {
  name: '',
  url: '',
  events: [],
};

export const STATUS_BADGE_CLASSES: Record<string, string> = {
  DELIVERED: 'badge badge-success',
  FAILED: 'badge badge-danger',
  RETRYING: 'badge badge-warning',
  PENDING: 'badge badge-info',
};

export const STATUS_LABELS: Record<string, string> = {
  DELIVERED: 'Delivered',
  FAILED: 'Failed',
  RETRYING: 'Retrying',
  PENDING: 'Pending',
};

export function getStatusBadgeClass(status: string): string {
  return STATUS_BADGE_CLASSES[status] || 'badge';
}

export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}
