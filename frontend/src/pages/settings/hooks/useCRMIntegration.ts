/**
 * CRM Integration Hook
 * Manages CRM configuration state and operations
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';
import toast from 'react-hot-toast';
import { CRMConfig, CRMType, CRMFormData } from '../crm-integration.types';
import { DEFAULT_FIELD_MAPPINGS } from '../crm-integration.constants';

export function useCRMIntegration() {
  const [configs, setConfigs] = useState<CRMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CRMConfig | null>(null);
  const [selectedType, setSelectedType] = useState<CRMType | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState<CRMFormData>({
    name: '',
    webhookUrl: '',
    apiKey: '',
    fieldMappings: DEFAULT_FIELD_MAPPINGS,
  });

  const fetchConfigs = useCallback(async () => {
    try {
      const response = await api.get('/crm-integrations');
      setConfigs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching CRM configs:', error);
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleAddCRM = useCallback((type: CRMType) => {
    setSelectedType(type);
    setFormData({
      name: type === 'CUSTOM' ? '' : type.charAt(0) + type.slice(1).toLowerCase(),
      webhookUrl: '',
      apiKey: '',
      fieldMappings: DEFAULT_FIELD_MAPPINGS,
    });
    setShowConfigModal(true);
  }, []);

  const handleEditConfig = useCallback((config: CRMConfig) => {
    setSelectedConfig(config);
    setSelectedType(config.type);
    setFormData({
      name: config.name,
      webhookUrl: config.webhookUrl,
      apiKey: config.apiKey || '',
      fieldMappings: config.fieldMappings || DEFAULT_FIELD_MAPPINGS,
    });
    setShowConfigModal(true);
  }, []);

  const handleSaveConfig = useCallback(async () => {
    if (!formData.name || !formData.webhookUrl) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        type: selectedType,
        webhookUrl: formData.webhookUrl,
        apiKey: formData.apiKey || undefined,
        fieldMappings: formData.fieldMappings,
      };

      if (selectedConfig) {
        await api.put(`/crm-integrations/${selectedConfig.id}`, payload);
        toast.success('CRM integration updated successfully');
      } else {
        await api.post('/crm-integrations', payload);
        toast.success('CRM integration created successfully');
      }

      fetchConfigs();
      setShowConfigModal(false);
      setSelectedConfig(null);
      setSelectedType(null);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }, [formData, selectedType, selectedConfig, fetchConfigs]);

  const handleTestWebhook = useCallback(async (config: CRMConfig) => {
    setTesting(config.id);
    try {
      await api.post(`/crm-integrations/${config.id}/test`);
      toast.success('Test webhook sent successfully!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Webhook test failed');
    } finally {
      setTesting(null);
    }
  }, []);

  const handleToggleActive = useCallback(async (config: CRMConfig) => {
    try {
      await api.put(`/crm-integrations/${config.id}`, {
        isActive: !config.isActive,
      });
      toast.success(`Integration ${config.isActive ? 'disabled' : 'enabled'}`);
      fetchConfigs();
    } catch {
      toast.error('Failed to update status');
    }
  }, [fetchConfigs]);

  const handleDeleteConfig = useCallback(async (config: CRMConfig) => {
    if (!confirm(`Are you sure you want to delete the ${config.name} integration?`)) {
      return;
    }

    try {
      await api.delete(`/crm-integrations/${config.id}`);
      toast.success('Integration deleted successfully');
      fetchConfigs();
    } catch {
      toast.error('Failed to delete integration');
    }
  }, [fetchConfigs]);

  const handleFieldMappingChange = useCallback((
    index: number,
    field: 'sourceField' | 'targetField',
    value: string
  ) => {
    setFormData(prev => {
      const newMappings = [...prev.fieldMappings];
      newMappings[index] = { ...newMappings[index], [field]: value };
      return { ...prev, fieldMappings: newMappings };
    });
  }, []);

  const addFieldMapping = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: [...prev.fieldMappings, { sourceField: '', targetField: '' }],
    }));
  }, []);

  const removeFieldMapping = useCallback((index: number) => {
    setFormData(prev => ({
      ...prev,
      fieldMappings: prev.fieldMappings.filter((_, i) => i !== index),
    }));
  }, []);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  }, []);

  const closeModal = useCallback(() => {
    setShowConfigModal(false);
    setSelectedConfig(null);
    setSelectedType(null);
  }, []);

  const updateFormData = useCallback((updates: Partial<CRMFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  return {
    // State
    configs,
    loading,
    showConfigModal,
    selectedConfig,
    selectedType,
    testing,
    saving,
    formData,
    // Actions
    handleAddCRM,
    handleEditConfig,
    handleSaveConfig,
    handleTestWebhook,
    handleToggleActive,
    handleDeleteConfig,
    handleFieldMappingChange,
    addFieldMapping,
    removeFieldMapping,
    copyToClipboard,
    closeModal,
    updateFormData,
  };
}
