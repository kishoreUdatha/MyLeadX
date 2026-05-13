/**
 * Scheduled Messages Page
 * Schedule messages for future delivery
 */

import { useState, useEffect } from 'react';
import {
  ClockIcon,
  PlusIcon,
  CalendarIcon,
  PaperAirplaneIcon,
  PauseIcon,
  PlayIcon,
  TrashIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ArrowPathIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import {
  messagingPortalApi,
  ScheduledMessage,
  PaginationMeta,
  contactsApi,
  MessagingContactGroup,
} from '../../services/messaging.service';

const ScheduledMessagesPage = () => {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState({ pending: 0, completed: 0, failed: 0, total: 0 });
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Create/Edit modal state
  const [showModal, setShowModal] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [formData, setFormData] = useState({
    type: 'SMS' as 'SMS' | 'WHATSAPP',
    name: '',
    recipients: '',
    content: '',
    scheduledAt: '',
    scheduledTime: '',
  });
  const [groups, setGroups] = useState<MessagingContactGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadMessages();
    loadGroups();
  }, [currentPage, statusFilter, typeFilter]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const result = await messagingPortalApi.getScheduledMessages(
        currentPage,
        20,
        statusFilter || undefined,
        typeFilter || undefined
      );
      setMessages(result.messages);
      setStats(result.stats);
      setPagination(result.pagination);
    } catch (error) {
      console.error('Failed to load scheduled messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const groupList = await contactsApi.listGroups();
      setGroups(groupList);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };

  const openCreateModal = () => {
    setEditingMessage(null);
    // Set default scheduled time to 1 hour from now
    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    setFormData({
      type: 'SMS',
      name: '',
      recipients: '',
      content: '',
      scheduledAt: now.toISOString().split('T')[0],
      scheduledTime: now.toTimeString().slice(0, 5),
    });
    setSelectedGroupId('');
    setShowModal(true);
  };

  const openEditModal = (message: ScheduledMessage) => {
    setEditingMessage(message);
    const scheduledDate = new Date(message.scheduledAt);
    setFormData({
      type: message.type,
      name: message.name || '',
      recipients: message.recipients.join('\n'),
      content: message.content,
      scheduledAt: scheduledDate.toISOString().split('T')[0],
      scheduledTime: scheduledDate.toTimeString().slice(0, 5),
    });
    setSelectedGroupId('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.recipients.trim() && !selectedGroupId) {
      alert('Please enter recipients or select a group');
      return;
    }
    if (!formData.content.trim()) {
      alert('Please enter message content');
      return;
    }
    if (!formData.scheduledAt || !formData.scheduledTime) {
      alert('Please select date and time');
      return;
    }

    setSaving(true);
    try {
      // Parse recipients
      let recipients: string[] = [];
      if (selectedGroupId) {
        // Fetch group contacts
        const groupContacts = await contactsApi.getGroupContacts(selectedGroupId);
        recipients = groupContacts.contacts.map((c: any) => c.phone);
      } else {
        recipients = formData.recipients
          .split(/[\n,]/)
          .map((r) => r.trim())
          .filter((r) => r.length > 0);
      }

      if (recipients.length === 0) {
        alert('No valid recipients found');
        setSaving(false);
        return;
      }

      const scheduledAt = new Date(`${formData.scheduledAt}T${formData.scheduledTime}`).toISOString();

      if (editingMessage) {
        await messagingPortalApi.updateScheduledMessage(editingMessage.id, {
          name: formData.name || undefined,
          content: formData.content,
          scheduledAt,
          recipients,
        });
      } else {
        await messagingPortalApi.createScheduledMessage({
          type: formData.type,
          name: formData.name || undefined,
          recipients,
          content: formData.content,
          scheduledAt,
        });
      }

      setShowModal(false);
      loadMessages();
    } catch (error: any) {
      console.error('Failed to save scheduled message:', error);
      alert(error.response?.data?.message || 'Failed to save scheduled message');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      await messagingPortalApi.pauseScheduledMessage(id);
      loadMessages();
    } catch (error) {
      console.error('Failed to pause:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string) => {
    setActionLoading(id);
    try {
      await messagingPortalApi.resumeScheduledMessage(id);
      loadMessages();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to resume');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this scheduled message?')) return;
    setActionLoading(id);
    try {
      await messagingPortalApi.cancelScheduledMessage(id);
      loadMessages();
    } catch (error) {
      console.error('Failed to cancel:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendNow = async (id: string) => {
    if (!confirm('Send this message immediately?')) return;
    setActionLoading(id);
    try {
      const result = await messagingPortalApi.sendScheduledMessageNow(id);
      alert(`Sent ${result.sentCount} messages, ${result.failedCount} failed`);
      loadMessages();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to send');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: ArrowPathIcon },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: ExclamationCircleIcon },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: XMarkIcon },
      PAUSED: { bg: 'bg-orange-100', text: 'text-orange-800', icon: PauseIcon },
    };
    const style = styles[status] || styles.PENDING;
    const Icon = style.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </span>
    );
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scheduled Messages</h1>
          <p className="text-sm text-gray-500 mt-1">
            Schedule messages for future delivery
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Schedule Message
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CalendarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="PAUSED">Paused</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Channels</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
            </select>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading scheduled messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No scheduled messages</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter || typeFilter
                ? 'Try adjusting your filters'
                : 'Get started by scheduling your first message'}
            </p>
            {!statusFilter && !typeFilter && (
              <button
                onClick={openCreateModal}
                className="mt-4 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                Schedule a message
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Channel
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recipients
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Scheduled For
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {messages.map((message) => (
                    <tr key={message.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {message.name || 'Scheduled Message'}
                          </p>
                          <p className="text-sm text-gray-500 truncate">{message.content}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          message.type === 'SMS' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {message.type === 'SMS' ? (
                            <PhoneIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <ChatBubbleLeftIcon className="h-3 w-3 mr-1" />
                          )}
                          {message.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {message.recipientCount || message.totalRecipients} contacts
                        </span>
                        {message.status === 'COMPLETED' && (
                          <div className="text-xs text-gray-500">
                            Sent: {message.sentCount}, Failed: {message.failedCount}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatDateTime(message.scheduledAt)}
                        </div>
                        {message.isRecurring && (
                          <span className="inline-flex items-center text-xs text-purple-600">
                            <ArrowPathIcon className="h-3 w-3 mr-1" />
                            Recurring
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(message.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {message.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => openEditModal(message)}
                                disabled={actionLoading === message.id}
                                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handlePause(message.id)}
                                disabled={actionLoading === message.id}
                                className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                                title="Pause"
                              >
                                <PauseIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleSendNow(message.id)}
                                disabled={actionLoading === message.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Send Now"
                              >
                                <PaperAirplaneIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleCancel(message.id)}
                                disabled={actionLoading === message.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Cancel"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {message.status === 'PAUSED' && (
                            <>
                              <button
                                onClick={() => openEditModal(message)}
                                disabled={actionLoading === message.id}
                                className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                                title="Edit"
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleResume(message.id)}
                                disabled={actionLoading === message.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Resume"
                              >
                                <PlayIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleCancel(message.id)}
                                disabled={actionLoading === message.id}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                title="Cancel"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {(message.status === 'COMPLETED' || message.status === 'FAILED' || message.status === 'CANCELLED') && (
                            <button
                              onClick={() => handleCancel(message.id)}
                              disabled={actionLoading === message.id}
                              className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                              title="Delete"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingMessage ? 'Edit Scheduled Message' : 'Schedule New Message'}
                </h3>
                <button onClick={() => setShowModal(false)}>
                  <XMarkIcon className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Channel Selection */}
                {!editingMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Channel</label>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'SMS' })}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                          formData.type === 'SMS'
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <PhoneIcon className="h-5 w-5" />
                        SMS
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, type: 'WHATSAPP' })}
                        className={`flex-1 py-3 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                          formData.type === 'WHATSAPP'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <ChatBubbleLeftIcon className="h-5 w-5" />
                        WhatsApp
                      </button>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Weekly Newsletter"
                  />
                </div>

                {/* Recipients */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipients</label>
                  <div className="space-y-2">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => {
                        setSelectedGroupId(e.target.value);
                        if (e.target.value) {
                          setFormData({ ...formData, recipients: '' });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select a contact group...</option>
                      {groups.map((group) => (
                        <option key={group.id} value={group.id}>
                          {group.name} ({group.contactCount} contacts)
                        </option>
                      ))}
                    </select>
                    {!selectedGroupId && (
                      <>
                        <p className="text-xs text-gray-500 text-center">OR enter phone numbers manually</p>
                        <textarea
                          value={formData.recipients}
                          onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter phone numbers (one per line or comma-separated)&#10;+919876543210&#10;+918765432109"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Enter your message..."
                    maxLength={1600}
                  />
                  <p className="text-xs text-gray-500 text-right mt-1">
                    {formData.content.length}/1600 characters
                  </p>
                </div>

                {/* Schedule Date/Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="date"
                      value={formData.scheduledAt}
                      onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <input
                      type="time"
                      value={formData.scheduledTime}
                      onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50 flex items-center"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <ClockIcon className="h-4 w-4 mr-2" />
                        {editingMessage ? 'Update Schedule' : 'Schedule Message'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduledMessagesPage;
