/**
 * Scheduled Messages Components
 * Stats cards, message list items, and create/edit modal
 */

import React from 'react';
import {
  ClockIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  PlayIcon,
  PauseIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import {
  ScheduledMessage,
  ScheduledMessageStats,
  MessageTemplate,
  ScheduledMessageFormData,
} from '../scheduled-messages.types';
import {
  typeIcons,
  typeColors,
  statusColors,
  recurringLabels,
  formatDateTime,
  getTimeUntil,
} from '../scheduled-messages.constants';

// Stats Cards
interface StatsCardsProps {
  stats: ScheduledMessageStats;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => (
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
);

// Message Item
interface MessageItemProps {
  message: ScheduledMessage;
  onEdit: (message: ScheduledMessage) => void;
  onPause: (id: string) => void;
  onCancel: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  onEdit,
  onPause,
  onCancel,
  onResume,
  onDelete,
}) => {
  const TypeIcon = typeIcons[message.type];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
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
                <span className="text-primary-600 font-medium">{getTimeUntil(message.scheduledAt)}</span>
              )}
            </div>

            <p className="text-sm text-slate-600 line-clamp-2">{message.content}</p>

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
              <button onClick={() => onEdit(message)} className="btn btn-ghost btn-sm" title="Edit">
                <PencilIcon className="h-4 w-4" />
              </button>
              <button onClick={() => onPause(message.id)} className="btn btn-ghost btn-sm" title="Pause">
                <PauseIcon className="h-4 w-4" />
              </button>
              <button onClick={() => onCancel(message.id)} className="btn btn-ghost btn-sm text-danger-600" title="Cancel">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </>
          )}
          {message.status === 'PAUSED' && (
            <button onClick={() => onResume(message.id)} className="btn btn-ghost btn-sm text-green-600" title="Resume">
              <PlayIcon className="h-4 w-4" />
            </button>
          )}
          {['COMPLETED', 'FAILED', 'CANCELLED'].includes(message.status) && (
            <button onClick={() => onDelete(message.id)} className="btn btn-ghost btn-sm text-danger-600" title="Delete">
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Empty State
interface EmptyStateProps {
  onCreateClick: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onCreateClick }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
    <ClockIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-slate-900 mb-2">No Scheduled Messages</h3>
    <p className="text-sm text-slate-600 mb-4">Schedule your first message to be sent at a specific time</p>
    <button onClick={onCreateClick} className="btn btn-primary">
      <PlusIcon className="h-5 w-5" />
      <span>Schedule Message</span>
    </button>
  </div>
);

// Create/Edit Modal
interface CreateEditModalProps {
  isOpen: boolean;
  isEditing: boolean;
  formData: ScheduledMessageFormData;
  formError: string;
  saving: boolean;
  templates: MessageTemplate[];
  onClose: () => void;
  onSubmit: () => void;
  onFormChange: React.Dispatch<React.SetStateAction<ScheduledMessageFormData>>;
}

export const CreateEditModal: React.FC<CreateEditModalProps> = ({
  isOpen,
  isEditing,
  formData,
  formError,
  saving,
  templates,
  onClose,
  onSubmit,
  onFormChange,
}) => {
  if (!isOpen) return null;

  return (
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Name (optional)</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => onFormChange({ ...formData, name: e.target.value })}
                className="input"
                placeholder="e.g., Weekly Newsletter"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => onFormChange({ ...formData, type: e.target.value as any })}
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
              onChange={(e) => onFormChange({ ...formData, recipients: e.target.value })}
              className="input min-h-[80px]"
              placeholder={formData.type === 'EMAIL' ? 'email@example.com' : '+1234567890'}
            />
            <p className="text-xs text-slate-500 mt-1">
              {formData.recipients.split(/[,\n]/).filter((r) => r.trim()).length} recipient(s)
            </p>
          </div>

          {formData.type === 'EMAIL' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => onFormChange({ ...formData, subject: e.target.value })}
                className="input"
                placeholder="Email subject line"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Use Template (optional)</label>
            <select
              value={formData.templateId}
              onChange={(e) => onFormChange({ ...formData, templateId: e.target.value })}
              className="input"
            >
              <option value="">No template - use custom content</option>
              {templates
                .filter((t) => t.type === formData.type)
                .map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
            </select>
          </div>

          {!formData.templateId && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
              <textarea
                value={formData.content}
                onChange={(e) => onFormChange({ ...formData, content: e.target.value })}
                className="input min-h-[120px]"
                placeholder="Type your message here..."
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date & Time *</label>
              <input
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => onFormChange({ ...formData, scheduledAt: e.target.value })}
                className="input"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) => onFormChange({ ...formData, timezone: e.target.value })}
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
                onChange={(e) => onFormChange({ ...formData, isRecurring: e.target.checked })}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-slate-700">Make this a recurring message</span>
            </label>

            {formData.isRecurring && (
              <div className="grid grid-cols-2 gap-4 mt-4 pl-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Repeat</label>
                  <select
                    value={formData.recurringRule}
                    onChange={(e) => onFormChange({ ...formData, recurringRule: e.target.value })}
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date (optional)</label>
                  <input
                    type="datetime-local"
                    value={formData.recurringEndAt}
                    onChange={(e) => onFormChange({ ...formData, recurringEndAt: e.target.value })}
                    className="input"
                    min={formData.scheduledAt}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <button onClick={onClose} className="btn btn-secondary">Cancel</button>
          <button onClick={onSubmit} disabled={saving} className="btn btn-primary">
            {saving ? 'Saving...' : isEditing ? 'Update' : 'Schedule Message'}
          </button>
        </div>
      </div>
    </div>
  );
};
