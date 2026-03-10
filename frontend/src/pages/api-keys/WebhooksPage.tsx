import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BellAlertIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  PlayIcon,
  KeyIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Webhook {
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

interface WebhookEvent {
  key: string;
  event: string;
  category: string;
  description: string;
}

interface DeliveryLog {
  id: string;
  eventType: string;
  eventId: string;
  attempt: number;
  maxAttempts: number;
  statusCode: number | null;
  responseTime: number | null;
  status: string;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

export default function WebhooksPage() {
  const { t } = useTranslation();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<Record<string, WebhookEvent[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWebhooks();
    fetchEvents();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await api.get('/webhooks');
      setWebhooks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await api.get('/webhooks/events');
      setEvents(response.data.data.grouped);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  };

  const handleCreateWebhook = async () => {
    if (!formData.name || !formData.url || formData.events.length === 0) {
      setFormError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const response = await api.post('/webhooks', formData);
      setNewWebhookSecret(response.data.data.secret);
      fetchWebhooks();
      setFormData({ name: '', url: '', events: [] });
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await api.delete(`/webhooks/${id}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const handleToggleWebhook = async (webhook: Webhook) => {
    try {
      await api.put(`/webhooks/${webhook.id}`, { isActive: !webhook.isActive });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      const response = await api.post(`/webhooks/${id}/test`);
      alert(response.data.success ? 'Test webhook delivered successfully!' : `Test failed: ${response.data.data?.error}`);
    } catch (error: any) {
      alert('Test failed: ' + (error.response?.data?.message || 'Unknown error'));
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    if (!confirm('Are you sure? This will invalidate the current secret.')) return;

    try {
      const response = await api.post(`/webhooks/${id}/regenerate-secret`);
      setNewWebhookSecret(response.data.data.secret);
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
    }
  };

  const viewLogs = async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setShowLogsModal(true);
    try {
      const response = await api.get(`/webhooks/${webhook.id}/logs`);
      setDeliveryLogs(response.data.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleRetryDelivery = async (logId: string) => {
    try {
      await api.post(`/webhooks/logs/${logId}/retry`);
      if (selectedWebhook) {
        const response = await api.get(`/webhooks/${selectedWebhook.id}/logs`);
        setDeliveryLogs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  };

  const toggleEvent = (event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  };

  const selectAllInCategory = (category: string) => {
    const categoryEvents = events[category]?.map(e => e.event) || [];
    const allSelected = categoryEvents.every(e => formData.events.includes(e));

    if (allSelected) {
      setFormData(prev => ({
        ...prev,
        events: prev.events.filter(e => !categoryEvents.includes(e)),
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        events: [...new Set([...prev.events, ...categoryEvents])],
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="badge badge-success">Delivered</span>;
      case 'FAILED':
        return <span className="badge badge-danger">Failed</span>;
      case 'RETRYING':
        return <span className="badge badge-warning">Retrying</span>;
      case 'PENDING':
        return <span className="badge badge-info">Pending</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Webhooks</h1>
          <p className="text-sm text-slate-600 mt-1">
            Receive real-time notifications when events occur in your account
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Add Webhook</span>
        </button>
      </div>

      {/* Secret Display Modal */}
      {newWebhookSecret && (
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
              {newWebhookSecret}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newWebhookSecret);
                alert('Secret copied to clipboard!');
              }}
              className="btn btn-secondary w-full mb-2"
            >
              Copy to Clipboard
            </button>
            <button
              onClick={() => {
                setNewWebhookSecret(null);
                setShowCreateModal(false);
              }}
              className="btn btn-primary w-full"
            >
              I've Saved the Secret
            </button>
          </div>
        </div>
      )}

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <BellAlertIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Webhooks Yet</h3>
          <p className="text-sm text-slate-600 mb-4">
            Create your first webhook to receive real-time event notifications
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Webhook</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-white rounded-xl border border-slate-200 p-6"
            >
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
                  <button
                    onClick={() => viewLogs(webhook)}
                    className="btn btn-ghost btn-sm"
                    title="View Logs"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleTestWebhook(webhook.id)}
                    className="btn btn-ghost btn-sm"
                    title="Test Webhook"
                  >
                    <PlayIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRegenerateSecret(webhook.id)}
                    className="btn btn-ghost btn-sm"
                    title="Regenerate Secret"
                  >
                    <KeyIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleToggleWebhook(webhook)}
                    className={`btn btn-sm ${webhook.isActive ? 'btn-warning' : 'btn-success'}`}
                  >
                    {webhook.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    className="btn btn-ghost btn-sm text-danger-600"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Webhook Modal */}
      {showCreateModal && !newWebhookSecret && (
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
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
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
                          onClick={() => selectAllInCategory(category)}
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
                              onChange={() => toggleEvent(event.event)}
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
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormData({ name: '', url: '', events: [] });
                  setFormError('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWebhook}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Creating...' : 'Create Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Logs Modal */}
      {showLogsModal && selectedWebhook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Delivery Logs - {selectedWebhook.name}
              </h3>
              <button
                onClick={() => {
                  setShowLogsModal(false);
                  setSelectedWebhook(null);
                  setDeliveryLogs([]);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            {deliveryLogs.length === 0 ? (
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
                    {deliveryLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="py-2 px-3 font-mono text-xs">{log.eventType}</td>
                        <td className="py-2 px-3">{getStatusBadge(log.status)}</td>
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
                              onClick={() => handleRetryDelivery(log.id)}
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
      )}
    </div>
  );
}
