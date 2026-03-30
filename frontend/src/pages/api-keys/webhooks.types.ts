/**
 * Webhooks Page Types
 */

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export interface WebhookEvent {
  key: string;
  event: string;
  category: string;
  description: string;
}

export interface DeliveryLog {
  id: string;
  eventType: string;
  eventId: string;
  attempt: number;
  maxAttempts: number;
  statusCode: number | null;
  responseTime: number | null;
  status: DeliveryStatus;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export type DeliveryStatus = 'DELIVERED' | 'FAILED' | 'RETRYING' | 'PENDING';

export interface WebhookFormData {
  name: string;
  url: string;
  events: string[];
}

export type GroupedEvents = Record<string, WebhookEvent[]>;
