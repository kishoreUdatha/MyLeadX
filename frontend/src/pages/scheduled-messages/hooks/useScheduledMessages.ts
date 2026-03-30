/**
 * Scheduled Messages Hook
 * Handles data fetching, CRUD operations, and form management
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import {
  ScheduledMessage,
  ScheduledMessageStats,
  MessageTemplate,
  ScheduledMessageFormData,
  initialFormData,
} from '../scheduled-messages.types';

interface UseScheduledMessagesReturn {
  // Data
  messages: ScheduledMessage[];
  stats: ScheduledMessageStats | null;
  templates: MessageTemplate[];
  loading: boolean;

  // Filters
  typeFilter: string;
  statusFilter: string;
  upcomingOnly: boolean;
  setTypeFilter: (filter: string) => void;
  setStatusFilter: (filter: string) => void;
  setUpcomingOnly: (value: boolean) => void;

  // Form state
  formData: ScheduledMessageFormData;
  formError: string;
  saving: boolean;
  isEditing: boolean;
  showCreateModal: boolean;
  selectedMessage: ScheduledMessage | null;

  // Actions
  setFormData: React.Dispatch<React.SetStateAction<ScheduledMessageFormData>>;
  setShowCreateModal: (show: boolean) => void;
  handleCreateOrUpdate: () => Promise<void>;
  handleEdit: (message: ScheduledMessage) => void;
  handleDelete: (id: string) => Promise<void>;
  handleCancel: (id: string) => Promise<void>;
  handlePause: (id: string) => Promise<void>;
  handleResume: (id: string) => Promise<void>;
  resetForm: () => void;
  fetchMessages: () => Promise<void>;
}

export function useScheduledMessages(): UseScheduledMessagesReturn {
  const [messages, setMessages] = useState<ScheduledMessage[]>([]);
  const [stats, setStats] = useState<ScheduledMessageStats | null>(null);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<ScheduledMessage | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  // Form state
  const [formData, setFormData] = useState<ScheduledMessageFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fetchMessages = useCallback(async () => {
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
  }, [typeFilter, statusFilter, upcomingOnly]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/scheduled-messages/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/templates?limit=100');
      setTemplates(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  }, []);

  useEffect(() => {
    fetchMessages();
    fetchStats();
    fetchTemplates();
  }, [fetchMessages, fetchStats, fetchTemplates]);

  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedMessage(null);
    setIsEditing(false);
    setFormError('');
  }, []);

  const handleCreateOrUpdate = useCallback(async () => {
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
      .map((r) => r.trim())
      .filter((r) => r.length > 0)
      .map((r) => {
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
        recurringEndAt:
          formData.isRecurring && formData.recurringEndAt
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
  }, [formData, isEditing, selectedMessage, fetchMessages, fetchStats, resetForm]);

  const handleEdit = useCallback((message: ScheduledMessage) => {
    const recipientStr = message.recipients.map((r: any) => r.email || r.phone).join('\n');

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
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this scheduled message?')) return;

      try {
        await api.delete(`/scheduled-messages/${id}`);
        fetchMessages();
        fetchStats();
      } catch (error) {
        console.error('Failed to delete scheduled message:', error);
      }
    },
    [fetchMessages, fetchStats]
  );

  const handleCancel = useCallback(
    async (id: string) => {
      try {
        await api.post(`/scheduled-messages/${id}/cancel`);
        fetchMessages();
        fetchStats();
      } catch (error) {
        console.error('Failed to cancel scheduled message:', error);
      }
    },
    [fetchMessages, fetchStats]
  );

  const handlePause = useCallback(
    async (id: string) => {
      try {
        await api.post(`/scheduled-messages/${id}/pause`);
        fetchMessages();
        fetchStats();
      } catch (error) {
        console.error('Failed to pause scheduled message:', error);
      }
    },
    [fetchMessages, fetchStats]
  );

  const handleResume = useCallback(
    async (id: string) => {
      try {
        await api.post(`/scheduled-messages/${id}/resume`);
        fetchMessages();
        fetchStats();
      } catch (error) {
        console.error('Failed to resume scheduled message:', error);
      }
    },
    [fetchMessages, fetchStats]
  );

  return {
    messages,
    stats,
    templates,
    loading,
    typeFilter,
    statusFilter,
    upcomingOnly,
    setTypeFilter,
    setStatusFilter,
    setUpcomingOnly,
    formData,
    formError,
    saving,
    isEditing,
    showCreateModal,
    selectedMessage,
    setFormData,
    setShowCreateModal,
    handleCreateOrUpdate,
    handleEdit,
    handleDelete,
    handleCancel,
    handlePause,
    handleResume,
    resetForm,
    fetchMessages,
  };
}

export default useScheduledMessages;
