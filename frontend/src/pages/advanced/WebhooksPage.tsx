import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive: boolean;
  headers?: Record<string, string>;
  createdAt: string;
  _count?: {
    logs: number;
  };
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    events: [] as string[],
    secret: '',
    headers: '',
    isActive: true,
  });

  const availableEvents = [
    { value: 'call.started', label: 'Call Started' },
    { value: 'call.completed', label: 'Call Completed' },
    { value: 'call.missed', label: 'Call Missed' },
    { value: 'lead.created', label: 'Lead Created' },
    { value: 'lead.updated', label: 'Lead Updated' },
    { value: 'lead.converted', label: 'Lead Converted' },
    { value: 'appointment.booked', label: 'Appointment Booked' },
    { value: 'appointment.cancelled', label: 'Appointment Cancelled' },
    { value: 'form.submitted', label: 'Form Submitted' },
    { value: 'campaign.started', label: 'Campaign Started' },
    { value: 'campaign.completed', label: 'Campaign Completed' },
  ];

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await api.get('/advanced/webhooks');
      setWebhooks(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let headers = {};
      if (formData.headers.trim()) {
        try {
          headers = JSON.parse(formData.headers);
        } catch {
          alert('Invalid JSON for headers');
          return;
        }
      }

      await api.post('/advanced/webhooks', {
        name: formData.name,
        url: formData.url,
        events: formData.events,
        secret: formData.secret || undefined,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
        isActive: formData.isActive,
      });

      setShowModal(false);
      setFormData({
        name: '',
        url: '',
        events: [],
        secret: '',
        headers: '',
        isActive: true,
      });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to create webhook:', error);
      alert('Failed to create webhook');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await api.delete(`/advanced/webhooks/${id}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const toggleEvent = (event: string) => {
    if (formData.events.includes(event)) {
      setFormData({
        ...formData,
        events: formData.events.filter((e) => e !== event),
      });
    } else {
      setFormData({
        ...formData,
        events: [...formData.events, event],
      });
    }
  };

  const generateSecret = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, secret });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to="/advanced" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Webhooks</h1>
          <p className="text-gray-500 mt-1">
            Send real-time notifications to external services when events occur
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
        >
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      <div className="grid gap-4">
        {webhooks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No webhooks configured yet
          </div>
        ) : (
          webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className={`bg-white rounded-lg shadow p-6 ${
                !webhook.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{webhook.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        webhook.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-gray-500 mt-1 font-mono text-sm break-all">{webhook.url}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {webhook.events.map((event) => (
                      <span
                        key={event}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {event}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3 text-sm text-gray-500">
                    <span>Created: {new Date(webhook.createdAt).toLocaleDateString()}</span>
                    {webhook._count && <span>Deliveries: {webhook._count.logs}</span>}
                    {webhook.secret && <span>Secret: ••••••••</span>}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(webhook.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
            <h2 className="text-xl font-bold mb-4">Add Webhook</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  placeholder="My CRM Integration"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Endpoint URL</label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                  placeholder="https://your-server.com/webhook"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Events</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {availableEvents.map((event) => (
                    <label
                      key={event.value}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.events.includes(event.value)}
                        onChange={() => toggleEvent(event.value)}
                        className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700">{event.label}</span>
                    </label>
                  ))}
                </div>
                {formData.events.length === 0 && (
                  <p className="text-red-500 text-xs mt-1">Select at least one event</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Secret (optional)
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={formData.secret}
                    onChange={(e) => setFormData({ ...formData, secret: e.target.value })}
                    className="flex-1 block border rounded-lg px-3 py-2"
                    placeholder="Used to sign webhook payloads"
                  />
                  <button
                    type="button"
                    onClick={generateSecret}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Generate
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Custom Headers (JSON, optional)
                </label>
                <textarea
                  value={formData.headers}
                  onChange={(e) => setFormData({ ...formData, headers: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  rows={3}
                  placeholder='{"Authorization": "Bearer token"}'
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-orange-600 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Webhook is active
                </label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.events.length === 0}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  Add Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
