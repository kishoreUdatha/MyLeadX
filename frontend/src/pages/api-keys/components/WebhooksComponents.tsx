/**
 * Webhooks Page Components
 */

import React from 'react';
import {
  BellAlertIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PlayIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import { Webhook, DeliveryLog, WebhookFormData, GroupedEvents } from '../webhooks.types';
import { getStatusBadgeClass, getStatusLabel } from '../webhooks.constants';

// Loading State Component
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
  </div>
);

// Header Component
interface HeaderProps {
  onAddClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onAddClick }) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
      <p className="text-sm text-slate-600 mt-1">
        Receive real-time notifications when events occur in your account
      </p>
    </div>
    <button onClick={onAddClick} className="btn btn-primary">
      <PlusIcon className="h-5 w-5" />
      <span>Add Webhook</span>
    </button>
  </div>
);

// Empty State Component
interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <BellAlertIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-slate-900 mb-2">No Webhooks Yet</h3>
    <p className="text-sm text-slate-600 mb-4">
      Create your first webhook to receive real-time event notifications
    </p>
    <button onClick={onCreateClick} className="btn btn-primary">
      <PlusIcon className="h-5 w-5" />
      <span>Create Webhook</span>
    </button>
  </div>
);

// Secret Display Modal Component
interface SecretModalProps {
  secret: string;
  onCopy: () => void;
  onClose: () => void;
}

export const SecretModal: React.FC<SecretModalProps> = ({ secret, onCopy, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-warning-100 rounded-lg">
          <KeyIcon className="h-6 w-6 text-warning-600" />
        </div>
        <h3 className="text-lg font-semibold">Save Your Webhook Secret</h3>
      </div>
      <p className="text-sm text-slate-600 mb-4">
        This secret is used to verify webhook signatures. Store it securely - it won't be shown again.
      </p>
      <div className="bg-slate-100 rounded-lg p-4 font-mono text-sm break-all mb-4">
        {secret}
      </div>
      <button onClick={onCopy} className="btn btn-secondary w-full mb-2">
        Copy to Clipboard
      </button>
      <button onClick={onClose} className="btn btn-primary w-full">
        I've Saved the Secret
      </button>
    </div>
  </div>
);

// Webhook Card Component
interface WebhookCardProps {
  webhook: Webhook;
  onViewLogs: (webhook: Webhook) => void;
  onTest: (id: string) => void;
  onRegenerateSecret: (id: string) => void;
  onToggle: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
}

export const WebhookCard: React.FC<WebhookCardProps> = ({
  webhook,
  onViewLogs,
  onTest,
  onRegenerateSecret,
  onToggle,
  onDelete,
}) => (
  <div className="bg-white rounded-xl border border-slate-200 p-6">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold text-slate-900">{webhook.name}</h3>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            webhook.isActive
              ? 'bg-success-100 text-success-700'
              : 'bg-slate-100 text-slate-600'
          }`}>
            {webhook.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <p className="text-sm text-slate-600 font-mono mb-3">{webhook.url}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {(webhook.events as string[]).slice(0, 5).map((event) => (
            <span key={event} className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
              {event}
            </span>
          ))}
          {(webhook.events as string[]).length > 5 && (
            <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
              +{(webhook.events as string[]).length - 5} more
            </span>
          )}
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4 text-success-500" />
            <span className="text-slate-600">{webhook.successCount} delivered</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircleIcon className="h-4 w-4 text-danger-500" />
            <span className="text-slate-600">{webhook.failureCount} failed</span>
          </div>
          {webhook.lastTriggeredAt && (
            <div className="flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600">
                Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>
        {webhook.lastError && (
          <p className="text-sm text-danger-600 mt-2">Last error: {webhook.lastError}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onViewLogs(webhook)} className="btn btn-ghost btn-sm" title="View Logs">
          <EyeIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onTest(webhook.id)} className="btn btn-ghost btn-sm" title="Test Webhook">
          <PlayIcon className="h-4 w-4" />
        </button>
        <button onClick={() => onRegenerateSecret(webhook.id)} className="btn btn-ghost btn-sm" title="Regenerate Secret">
          <KeyIcon className="h-4 w-4" />
        </button>
        <button
          onClick={() => onToggle(webhook)}
          className={`btn btn-sm ${webhook.isActive ? 'btn-warning' : 'btn-success'}`}
        >
          {webhook.isActive ? 'Disable' : 'Enable'}
        </button>
        <button onClick={() => onDelete(webhook.id)} className="btn btn-ghost btn-sm text-danger-600" title="Delete">
          <TrashIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

// Webhooks List Component
interface WebhooksListProps {
  webhooks: Webhook[];
  onViewLogs: (webhook: Webhook) => void;
  onTest: (id: string) => void;
  onRegenerateSecret: (id: string) => void;
  onToggle: (webhook: Webhook) => void;
  onDelete: (id: string) => void;
}

export const WebhooksList: React.FC<WebhooksListProps> = ({
  webhooks,
  onViewLogs,
  onTest,
  onRegenerateSecret,
  onToggle,
  onDelete,
}) => (
  <div className="space-y-4">
    {webhooks.map((webhook) => (
      <WebhookCard
        key={webhook.id}
        webhook={webhook}
        onViewLogs={onViewLogs}
        onTest={onTest}
        onRegenerateSecret={onRegenerateSecret}
        onToggle={onToggle}
        onDelete={onDelete}
      />
    ))}
  </div>
);

// Create Webhook Modal Component
interface CreateWebhookModalProps {
  formData: WebhookFormData;
  events: GroupedEvents;
  formError: string;
  saving: boolean;
  onFormChange: React.Dispatch<React.SetStateAction<WebhookFormData>>;
  onToggleEvent: (event: string) => void;
  onSelectAllInCategory: (category: string) => void;
  onCreate: () => void;
  onClose: () => void;
}

export const CreateWebhookModal: React.FC<CreateWebhookModalProps> = ({
  formData,
  events,
  formError,
  saving,
  onFormChange,
  onToggleEvent,
  onSelectAllInCategory,
  onCreate,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">Create Webhook</h3>

      {formError && (
        <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Webhook Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => onFormChange(prev => ({ ...prev, name: e.target.value }))}
            className="input"
            placeholder="e.g., Lead Notifications"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Endpoint URL *
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(e) => onFormChange(prev => ({ ...prev, url: e.target.value }))}
            className="input font-mono text-sm"
            placeholder="https://your-server.com/webhook"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Events to Subscribe * ({formData.events.length} selected)
          </label>
          <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-4">
            {Object.entries(events).map(([category, categoryEvents]) => (
              <div key={category}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-slate-900 capitalize">{category}</h4>
                  <button
                    type="button"
                    onClick={() => onSelectAllInCategory(category)}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    {categoryEvents.every(e => formData.events.includes(e.event))
                      ? 'Deselect All'
                      : 'Select All'}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {categoryEvents.map((event) => (
                    <label
                      key={event.event}
                      className="flex items-start gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.event)}
                        onChange={() => onToggleEvent(event.event)}
                        className="mt-1"
                      />
                      <div>
                        <div className="text-sm font-medium">{event.event}</div>
                        <div className="text-xs text-slate-500">{event.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn btn-secondary">
          Cancel
        </button>
        <button onClick={onCreate} disabled={saving} className="btn btn-primary">
          {saving ? 'Creating...' : 'Create Webhook'}
        </button>
      </div>
    </div>
  </div>
);

// Delivery Logs Modal Component
interface DeliveryLogsModalProps {
  webhook: Webhook;
  logs: DeliveryLog[];
  onRetry: (logId: string) => void;
  onClose: () => void;
}

export const DeliveryLogsModal: React.FC<DeliveryLogsModalProps> = ({
  webhook,
  logs,
  onRetry,
  onClose,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Delivery Logs - {webhook.name}
        </h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <XCircleIcon className="h-6 w-6" />
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          No delivery logs yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-3">Event</th>
                <th className="text-left py-2 px-3">Status</th>
                <th className="text-left py-2 px-3">Response</th>
                <th className="text-left py-2 px-3">Attempts</th>
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2 px-3 font-mono text-xs">{log.eventType}</td>
                  <td className="py-2 px-3">
                    <span className={getStatusBadgeClass(log.status)}>
                      {getStatusLabel(log.status)}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {log.statusCode && (
                      <span className={`text-xs ${
                        log.statusCode < 300 ? 'text-success-600' : 'text-danger-600'
                      }`}>
                        HTTP {log.statusCode}
                      </span>
                    )}
                    {log.responseTime && (
                      <span className="text-xs text-slate-500 ml-2">
                        {log.responseTime}ms
                      </span>
                    )}
                    {log.error && (
                      <div className="text-xs text-danger-600 truncate max-w-xs" title={log.error}>
                        {log.error}
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {log.attempt}/{log.maxAttempts}
                  </td>
                  <td className="py-2 px-3 text-xs text-slate-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 px-3">
                    {(log.status === 'FAILED' || log.status === 'RETRYING') && (
                      <button
                        onClick={() => onRetry(log.id)}
                        className="btn btn-ghost btn-sm"
                        title="Retry"
                      >
                        <ArrowPathIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
);
