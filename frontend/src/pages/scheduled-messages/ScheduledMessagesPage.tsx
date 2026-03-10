import { useState, useEffect } from 'react';
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  DevicePhoneMobileIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface ScheduledMessage {
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

interface Stats {
  total: number;
  pending: number;
  completed: number;
  failed: number;
  recurring: number;
  upcoming24h: number;
}

interface Template {
  id: string;
  name: string;
  type: string;
  content: string;
}

const typeIcons = {
  SMS: DevicePhoneMobileIcon,
  EMAIL: EnvelopeIcon,
  WHATSAPP: ChatBubbleLeftIcon,
};

const typeColors = {
  SMS: 'bg-blue-100 text-blue-700',
  EMAIL: 'bg-purple-100 text-purple-700',
  WHATSAPP: 'bg-green-100 text-green-700',
};

const statusColors = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
  PAUSED: 'bg-orange-100 text-orange-700',
};

const recurringLabels: Record<string, string> = {
  daily: 'Every Day',
  weekly: 'Every Week',
  biweekly: 'Every 2 Weeks',
  monthly: 'Every Month',
  quarterly: 'Every 3 Months',
};

export default function ScheduledMessagesPage() {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'SMS' as 'SMS' | 'EMAIL' | 'WHATSAPP',
    recipients: '',
    subject: '',
    content: '',
    templateId: '',
    scheduledAt: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isRecurring: false,
    recurringRule: '',
    recurringEndAt: '',
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchMessages();
    fetchStats();
    fetchTemplates();
  }, [typeFilter, statusFilter, upcomingOnly]);

  const fetchMessages = async () => {
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.append('type', typeFilter);
      if (statusFilter) params.append('status', statusFilter);
      if (upcomingOnly) params.append('upcoming', 'true');

      const response = await api.get(`/scheduled-messages?${params.toString()}`);
      setMessages(response.data.data);
    } catch (error) {
      console.error('Failed to fetch scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/scheduled-messages/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/templates?limit=100');
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleCreateOrUpdate = async () => {
    // Validation
    if (!formData.scheduledAt) {
      setFormError('Scheduled time is required');
      return;
    }

    if (!formData.recipients.trim()) {
      setFormError('At least one recipient is required');
      return;
    }

    if (!formData.content && !formData.templateId) {
      setFormError('Content or template is required');
      return;
    }

    if (formData.type === 'EMAIL' && !formData.subject && !formData.templateId) {
      setFormError('Subject is required for email messages');
      return;
    }

    // Parse recipients
    const recipientsList = formData.recipients
      .split(/[,\n]/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => {
        if (formData.type === 'EMAIL') {
          return { email: r };
        }
        return { phone: r };
      });

    if (recipientsList.length === 0) {
      setFormError('At least one valid recipient is required');
      return;
    }

    setSaving(true);
    setFormError('');

    try {
      const payload = {
        name: formData.name || undefined,
        type: formData.type,
        recipients: recipientsList,
        subject: formData.subject || undefined,
        content: formData.content || undefined,
        templateId: formData.templateId || undefined,
        scheduledAt: new Date(formData.scheduledAt).toISOString(),
        timezone: formData.timezone,
        isRecurring: formData.isRecurring,
        recurringRule: formData.isRecurring ? formData.recurringRule : undefined,
        recurringEndAt: formData.isRecurring && formData.recurringEndAt
          ? new Date(formData.recurringEndAt).toISOString()
          : undefined,
      };

      if (isEditing && selectedMessage) {
        await api.put(`/scheduled-messages/${selectedMessage.id}`, payload);
      } else {
        await api.post('/scheduled-messages', payload);
      }

      fetchMessages();
      fetchStats();
      resetForm();
      setShowCreateModal(false);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to save scheduled message');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled message?')) return;

    try {
      await api.delete(`/scheduled-messages/${id}`);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Failed to delete scheduled message:', error);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.post(`/scheduled-messages/${id}/cancel`);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Failed to cancel scheduled message:', error);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await api.post(`/scheduled-messages/${id}/pause`);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Failed to pause scheduled message:', error);
    }
  };

  const handleResume = async (id: string) => {
    try {
      await api.post(`/scheduled-messages/${id}/resume`);
      fetchMessages();
      fetchStats();
    } catch (error) {
      console.error('Failed to resume scheduled message:', error);
    }
  };

  const handleEdit = (message: ScheduledMessage) => {
    const recipientStr = message.recipients
      .map((r: any) => r.email || r.phone)
      .join('\n');

    setSelectedMessage(message);
    setFormData({
      name: message.name || '',
      type: message.type,
      recipients: recipientStr,
      subject: message.subject || '',
      content: message.content,
      templateId: message.templateId || '',
      scheduledAt: new Date(message.scheduledAt).toISOString().slice(0, 16),
      timezone: message.timezone,
      isRecurring: message.isRecurring,
      recurringRule: message.recurringRule || '',
      recurringEndAt: message.recurringEndAt
        ? new Date(message.recurringEndAt).toISOString().slice(0, 16)
        : '',
    });
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
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
    });
    setSelectedMessage(null);
    setIsEditing(false);
    setFormError('');
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const getTimeUntil = (dateStr: string) => {
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
          <h1 className="text-2xl font-bold text-slate-900">Scheduled Messages</h1>
          <p className="text-sm text-slate-600 mt-1">
            Schedule SMS, Email, and WhatsApp messages for future delivery
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="btn btn-primary"
        >
          <PlusIcon className="h-5 w-5" />
          <span>Schedule Message</span>
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
            <div className="text-sm text-slate-600">Total</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <div className="text-sm text-slate-600">Pending</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.recurring}</div>
            <div className="text-sm text-slate-600">Recurring</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-2xl font-bold text-purple-600">{stats.upcoming24h}</div>
            <div className="text-sm text-slate-600">Next 24h</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Types</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">Email</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input w-40"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="PAUSED">Paused</option>
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={upcomingOnly}
              onChange={(e) => setUpcomingOnly(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700">Upcoming only</span>
          </label>
        </div>
      </div>

      {/* Messages List */}
      {messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <ClockIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Scheduled Messages</h3>
          <p className="text-sm text-slate-600 mb-4">
            Schedule your first message to be sent at a specific time
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowCreateModal(true);
            }}
            className="btn btn-primary"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Schedule Message</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => {
            const TypeIcon = typeIcons[message.type];
            return (
              <div
                key={message.id}
                className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-xl ${typeColors[message.type]}`}>
                      <TypeIcon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {message.name || `${message.type} Message`}
                        </h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusColors[message.status]}`}>
                          {message.status}
                        </span>
                        {message.isRecurring && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                            <ArrowPathIcon className="h-3 w-3" />
                            {recurringLabels[message.recurringRule || ''] || 'Recurring'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-slate-500 mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {formatDateTime(message.scheduledAt)}
                        </span>
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="h-4 w-4" />
                          {message.totalRecipients} recipient{message.totalRecipients !== 1 ? 's' : ''}
                        </span>
                        {message.status === 'PENDING' && (
                          <span className="text-primary-600 font-medium">
                            {getTimeUntil(message.scheduledAt)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-2">
                        {message.content}
                      </p>

                      {message.status === 'COMPLETED' && (
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircleIcon className="h-4 w-4" />
                            {message.sentCount} sent
                          </span>
                          {message.failedCount > 0 && (
                            <span className="text-red-600 flex items-center gap-1">
                              <ExclamationCircleIcon className="h-4 w-4" />
                              {message.failedCount} failed
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {message.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleEdit(message)}
                          className="btn btn-ghost btn-sm"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePause(message.id)}
                          className="btn btn-ghost btn-sm"
                          title="Pause"
                        >
                          <PauseIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancel(message.id)}
                          className="btn btn-ghost btn-sm text-danger-600"
                          title="Cancel"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    {message.status === 'PAUSED' && (
                      <button
                        onClick={() => handleResume(message.id)}
                        className="btn btn-ghost btn-sm text-green-600"
                        title="Resume"
                      >
                        <PlayIcon className="h-4 w-4" />
                      </button>
                    )}
                    {['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status) && (
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="btn btn-ghost btn-sm text-danger-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {isEditing ? 'Edit Scheduled Message' : 'Schedule New Message'}
            </h3>

            {formError && (
              <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input"
                    placeholder="e.g., Weekly Newsletter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="input"
                    disabled={isEditing}
                  >
                    <option value="SMS">SMS</option>
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Recipients * (one per line or comma-separated)
                </label>
                <textarea
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  className="input min-h-[80px]"
                  placeholder={formData.type === 'EMAIL' ? 'email@example.com' : '+1234567890'}
                />
                <p className="text-xs text-slate-500 mt-1">
                  {formData.recipients.split(/[,\n]/).filter(r => r.trim()).length} recipient(s)
                </p>
              </div>

              {formData.type === 'EMAIL' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input"
                    placeholder="Email subject line"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Use Template (optional)
                </label>
                <select
                  value={formData.templateId}
                  onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                  className="input"
                >
                  <option value="">No template - use custom content</option>
                  {templates
                    .filter(t => t.type === formData.type)
                    .map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))
                  }
                </select>
              </div>

              {!formData.templateId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Content *
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="input min-h-[120px]"
                    placeholder="Type your message here..."
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Scheduled Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="input"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Timezone
                  </label>
                  <input
                    type="text"
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="input"
                    placeholder="UTC"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Make this a recurring message</span>
                </label>

                {formData.isRecurring && (
                  <div className="grid grid-cols-2 gap-4 mt-4 pl-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Repeat
                      </label>
                      <select
                        value={formData.recurringRule}
                        onChange={(e) => setFormData({ ...formData, recurringRule: e.target.value })}
                        className="input"
                      >
                        <option value="">Select frequency</option>
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 Weeks</option>
                        <option value="monthly">Monthly</option>
                        <option value="quarterly">Quarterly</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        End Date (optional)
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.recurringEndAt}
                        onChange={(e) => setFormData({ ...formData, recurringEndAt: e.target.value })}
                        className="input"
                        min={formData.scheduledAt}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrUpdate}
                disabled={saving}
                className="btn btn-primary"
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Schedule Message'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
