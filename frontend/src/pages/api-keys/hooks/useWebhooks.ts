/**
 * Webhooks Hook
 * Manages webhook state and API operations
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import { Webhook, DeliveryLog, WebhookFormData, GroupedEvents } from '../webhooks.types';
import { INITIAL_FORM_DATA } from '../webhooks.constants';

export function useWebhooks() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [events, setEvents] = useState<GroupedEvents>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedWebhook, setSelectedWebhook] = useState<Webhook | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<WebhookFormData>(INITIAL_FORM_DATA);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchWebhooks = useCallback(async () => {
    try {
      const response = await api.get('/webhooks');
      setWebhooks(response.data.data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get('/webhooks/events');
      setEvents(response.data.data.grouped);
    } catch (error) {
      console.error('Failed to fetch events:', error);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
    fetchEvents();
  }, [fetchWebhooks, fetchEvents]);

  const handleCreateWebhook = useCallback(async () => {
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
      setFormData(INITIAL_FORM_DATA);
    } catch (error: any) {
      setFormError(error.response?.data?.message || 'Failed to create webhook');
    } finally {
      setSaving(false);
    }
  }, [formData, fetchWebhooks]);

  const handleDeleteWebhook = useCallback(async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      await api.delete(`/webhooks/${id}`);
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  }, [fetchWebhooks]);

  const handleToggleWebhook = useCallback(async (webhook: Webhook) => {
    try {
      await api.put(`/webhooks/${webhook.id}`, { isActive: !webhook.isActive });
      fetchWebhooks();
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  }, [fetchWebhooks]);

  const handleTestWebhook = useCallback(async (id: string) => {
    try {
      const response = await api.post(`/webhooks/${id}/test`);
      alert(response.data.success ? 'Test webhook delivered successfully!' : `Test failed: ${response.data.data?.error}`);
    } catch (error: any) {
      alert('Test failed: ' + (error.response?.data?.message || 'Unknown error'));
    }
  }, []);

  const handleRegenerateSecret = useCallback(async (id: string) => {
    if (!confirm('Are you sure? This will invalidate the current secret.')) return;

    try {
      const response = await api.post(`/webhooks/${id}/regenerate-secret`);
      setNewWebhookSecret(response.data.data.secret);
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
    }
  }, []);

  const viewLogs = useCallback(async (webhook: Webhook) => {
    setSelectedWebhook(webhook);
    setShowLogsModal(true);
    try {
      const response = await api.get(`/webhooks/${webhook.id}/logs`);
      setDeliveryLogs(response.data.data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  }, []);

  const handleRetryDelivery = useCallback(async (logId: string) => {
    try {
      await api.post(`/webhooks/logs/${logId}/retry`);
      if (selectedWebhook) {
        const response = await api.get(`/webhooks/${selectedWebhook.id}/logs`);
        setDeliveryLogs(response.data.data);
      }
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  }, [selectedWebhook]);

  const toggleEvent = useCallback((event: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter(e => e !== event)
        : [...prev.events, event],
    }));
  }, []);

  const selectAllInCategory = useCallback((category: string) => {
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
  }, [events, formData.events]);

  const closeCreateModal = useCallback(() => {
    setShowCreateModal(false);
    setFormData(INITIAL_FORM_DATA);
    setFormError('');
  }, []);

  const closeSecretModal = useCallback(() => {
    setNewWebhookSecret(null);
    setShowCreateModal(false);
  }, []);

  const closeLogsModal = useCallback(() => {
    setShowLogsModal(false);
    setSelectedWebhook(null);
    setDeliveryLogs([]);
  }, []);

  const copySecret = useCallback(() => {
    if (newWebhookSecret) {
      navigator.clipboard.writeText(newWebhookSecret);
      alert('Secret copied to clipboard!');
    }
  }, [newWebhookSecret]);

  return {
    // State
    webhooks,
    events,
    loading,
    showCreateModal,
    showLogsModal,
    selectedWebhook,
    deliveryLogs,
    newWebhookSecret,
    formData,
    formError,
    saving,

    // Actions
    setShowCreateModal,
    handleCreateWebhook,
    handleDeleteWebhook,
    handleToggleWebhook,
    handleTestWebhook,
    handleRegenerateSecret,
    viewLogs,
    handleRetryDelivery,
    toggleEvent,
    selectAllInCategory,
    closeCreateModal,
    closeSecretModal,
    closeLogsModal,
    copySecret,
    setFormData,
  };
}
