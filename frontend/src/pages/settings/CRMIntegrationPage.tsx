import React, { useState, useEffect } from 'react';
import {
  CircleStackIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon,
  LinkIcon,
  KeyIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface CRMConfig {
  id: string;
  name: string;
  type: 'SALESFORCE' | 'HUBSPOT' | 'ZOHO' | 'CUSTOM';
  webhookUrl: string;
  apiKey?: string;
  isActive: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  fieldMappings: FieldMapping[];
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

const crmLogos: Record<string, string> = {
  SALESFORCE: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Salesforce.com_logo.svg/2560px-Salesforce.com_logo.svg.png',
  HUBSPOT: 'https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png',
  ZOHO: 'https://www.zohowebstatic.com/sites/default/files/zoho_logo_color.svg',
  CUSTOM: '',
};

const crmDescriptions: Record<string, string> = {
  SALESFORCE: 'Connect to Salesforce to sync leads and contacts automatically',
  HUBSPOT: 'Integrate with HubSpot CRM for seamless lead management',
  ZOHO: 'Sync your leads with Zoho CRM in real-time',
  CUSTOM: 'Set up a custom webhook to any CRM or system',
};

const defaultFieldMappings: FieldMapping[] = [
  { sourceField: 'name', targetField: 'Name' },
  { sourceField: 'email', targetField: 'Email' },
  { sourceField: 'phone', targetField: 'Phone' },
  { sourceField: 'company', targetField: 'Company' },
  { sourceField: 'source', targetField: 'LeadSource' },
  { sourceField: 'notes', targetField: 'Description' },
];

export const CRMIntegrationPage: React.FC = () => {
  const [configs, setConfigs] = useState<CRMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<CRMConfig | null>(null);
  const [selectedType, setSelectedType] = useState<CRMConfig['type'] | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    webhookUrl: '',
    apiKey: '',
    fieldMappings: defaultFieldMappings,
  });

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    try {
      const response = await api.get('/crm-integrations');
      setConfigs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching CRM configs:', error);
      // For demo, set some sample data if API fails
      setConfigs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCRM = (type: CRMConfig['type']) => {
    setSelectedType(type);
    setFormData({
      name: type === 'CUSTOM' ? '' : type.charAt(0) + type.slice(1).toLowerCase(),
      webhookUrl: '',
      apiKey: '',
      fieldMappings: defaultFieldMappings,
    });
    setShowAddModal(false);
    setShowConfigModal(true);
  };

  const handleEditConfig = (config: CRMConfig) => {
    setSelectedConfig(config);
    setSelectedType(config.type);
    setFormData({
      name: config.name,
      webhookUrl: config.webhookUrl,
      apiKey: config.apiKey || '',
      fieldMappings: config.fieldMappings || defaultFieldMappings,
    });
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
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
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestWebhook = async (config: CRMConfig) => {
    setTesting(config.id);
    try {
      await api.post(`/crm-integrations/${config.id}/test`);
      toast.success('Test webhook sent successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Webhook test failed');
    } finally {
      setTesting(null);
    }
  };

  const handleToggleActive = async (config: CRMConfig) => {
    try {
      await api.put(`/crm-integrations/${config.id}`, {
        isActive: !config.isActive,
      });
      toast.success(`Integration ${config.isActive ? 'disabled' : 'enabled'}`);
      fetchConfigs();
    } catch (error: any) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteConfig = async (config: CRMConfig) => {
    if (!confirm(`Are you sure you want to delete the ${config.name} integration?`)) {
      return;
    }

    try {
      await api.delete(`/crm-integrations/${config.id}`);
      toast.success('Integration deleted successfully');
      fetchConfigs();
    } catch (error: any) {
      toast.error('Failed to delete integration');
    }
  };

  const handleFieldMappingChange = (index: number, field: 'sourceField' | 'targetField', value: string) => {
    const newMappings = [...formData.fieldMappings];
    newMappings[index] = { ...newMappings[index], [field]: value };
    setFormData({ ...formData, fieldMappings: newMappings });
  };

  const addFieldMapping = () => {
    setFormData({
      ...formData,
      fieldMappings: [...formData.fieldMappings, { sourceField: '', targetField: '' }],
    });
  };

  const removeFieldMapping = (index: number) => {
    const newMappings = formData.fieldMappings.filter((_, i) => i !== index);
    setFormData({ ...formData, fieldMappings: newMappings });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <CircleStackIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CRM Integrations</h1>
          </div>
          <p className="text-gray-600 ml-14">
            Connect external CRMs to automatically sync leads from voice conversations
          </p>
        </div>

        {/* Active Integrations */}
        {configs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Integrations</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className={`bg-white rounded-2xl border-2 transition-all duration-200 ${
                    config.isActive
                      ? 'border-green-200 shadow-lg shadow-green-500/10'
                      : 'border-gray-200 opacity-75'
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {config.type !== 'CUSTOM' && crmLogos[config.type] ? (
                          <img
                            src={crmLogos[config.type]}
                            alt={config.type}
                            className="w-10 h-10 object-contain"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                            <LinkIcon className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{config.name}</h3>
                          <span className="text-xs text-gray-500 uppercase">{config.type}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(config)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          config.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            config.isActive ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-4">
                      {config.isActive ? (
                        <>
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-600">Connected</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">Disabled</span>
                        </>
                      )}
                      {config.lastSyncAt && (
                        <span className="text-xs text-gray-400 ml-auto">
                          Last sync: {new Date(config.lastSyncAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {/* Error Message */}
                    {config.lastSyncError && (
                      <div className="mb-4 p-2 bg-red-50 rounded-lg flex items-start gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-xs text-red-600">{config.lastSyncError}</span>
                      </div>
                    )}

                    {/* Webhook URL Preview */}
                    <div className="mb-4 p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                          {config.webhookUrl}
                        </span>
                        <button
                          onClick={() => copyToClipboard(config.webhookUrl)}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleTestWebhook(config)}
                        disabled={testing === config.id || !config.isActive}
                        className="flex-1 px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {testing === config.id ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin mx-auto" />
                        ) : (
                          'Test'
                        )}
                      </button>
                      <button
                        onClick={() => handleEditConfig(config)}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Configure
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Integration */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {configs.length > 0 ? 'Add Another Integration' : 'Connect Your CRM'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Salesforce */}
            <button
              onClick={() => handleAddCRM('SALESFORCE')}
              className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 text-left"
            >
              <img
                src={crmLogos.SALESFORCE}
                alt="Salesforce"
                className="h-8 mb-4 object-contain"
              />
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                Salesforce
              </h3>
              <p className="text-sm text-gray-500">{crmDescriptions.SALESFORCE}</p>
            </button>

            {/* HubSpot */}
            <button
              onClick={() => handleAddCRM('HUBSPOT')}
              className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-orange-400 hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 text-left"
            >
              <img
                src={crmLogos.HUBSPOT}
                alt="HubSpot"
                className="h-8 w-8 mb-4 object-contain"
              />
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-orange-600 transition-colors">
                HubSpot
              </h3>
              <p className="text-sm text-gray-500">{crmDescriptions.HUBSPOT}</p>
            </button>

            {/* Zoho */}
            <button
              onClick={() => handleAddCRM('ZOHO')}
              className="group p-6 bg-white rounded-2xl border-2 border-gray-200 hover:border-red-400 hover:shadow-xl hover:shadow-red-500/10 transition-all duration-300 text-left"
            >
              <img
                src={crmLogos.ZOHO}
                alt="Zoho"
                className="h-8 mb-4 object-contain"
              />
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-red-600 transition-colors">
                Zoho CRM
              </h3>
              <p className="text-sm text-gray-500">{crmDescriptions.ZOHO}</p>
            </button>

            {/* Custom Webhook */}
            <button
              onClick={() => handleAddCRM('CUSTOM')}
              className="group p-6 bg-white rounded-2xl border-2 border-dashed border-gray-300 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 text-left"
            >
              <div className="w-8 h-8 mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <PlusIcon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-purple-600 transition-colors">
                Custom Webhook
              </h3>
              <p className="text-sm text-gray-500">{crmDescriptions.CUSTOM}</p>
            </button>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">How CRM Integration Works</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">1</span>
                  <span>Configure your external CRM webhook URL and API credentials</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">2</span>
                  <span>Map fields from voice conversations to your CRM fields</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">3</span>
                  <span>When a lead is created from a voice call, it's automatically synced to your CRM</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold">4</span>
                  <span>Select this integration in your Voice Agent settings to enable auto-sync</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Configuration Modal */}
        {showConfigModal && selectedType && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  {selectedType !== 'CUSTOM' && crmLogos[selectedType] ? (
                    <img
                      src={crmLogos[selectedType]}
                      alt={selectedType}
                      className="h-10 object-contain"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                      <LinkIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedConfig ? 'Edit' : 'Configure'} {selectedType === 'CUSTOM' ? 'Custom Webhook' : selectedType.charAt(0) + selectedType.slice(1).toLowerCase()}
                    </h2>
                    <p className="text-sm text-gray-500">{crmDescriptions[selectedType]}</p>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="space-y-6">
                  {/* Integration Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Integration Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Production Salesforce"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                  </div>

                  {/* Webhook URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <LinkIcon className="w-4 h-4 inline mr-1" />
                      Webhook URL *
                    </label>
                    <input
                      type="url"
                      value={formData.webhookUrl}
                      onChange={(e) => setFormData({ ...formData, webhookUrl: e.target.value })}
                      placeholder={
                        selectedType === 'SALESFORCE'
                          ? 'https://yourinstance.salesforce.com/services/apexrest/leads'
                          : selectedType === 'HUBSPOT'
                          ? 'https://api.hubapi.com/crm/v3/objects/contacts'
                          : selectedType === 'ZOHO'
                          ? 'https://www.zohoapis.com/crm/v2/Leads'
                          : 'https://your-webhook-url.com/endpoint'
                      }
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      The endpoint where lead data will be sent via POST request
                    </p>
                  </div>

                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <KeyIcon className="w-4 h-4 inline mr-1" />
                      API Key / Bearer Token (Optional)
                    </label>
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                      placeholder="Enter API key or access token"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Will be sent as Authorization: Bearer header
                    </p>
                  </div>

                  {/* Field Mappings */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        <Cog6ToothIcon className="w-4 h-4 inline mr-1" />
                        Field Mappings
                      </label>
                      <button
                        type="button"
                        onClick={addFieldMapping}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        + Add Field
                      </button>
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-4 text-xs font-medium text-gray-500 px-1">
                        <span>Source Field (Our System)</span>
                        <span>Target Field ({selectedType === 'CUSTOM' ? 'Your CRM' : selectedType})</span>
                      </div>
                      {formData.fieldMappings.map((mapping, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={mapping.sourceField}
                            onChange={(e) => handleFieldMappingChange(index, 'sourceField', e.target.value)}
                            placeholder="name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <span className="text-gray-400">→</span>
                          <input
                            type="text"
                            value={mapping.targetField}
                            onChange={(e) => handleFieldMappingChange(index, 'targetField', e.target.value)}
                            placeholder="Name"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => removeFieldMapping(index)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      Available source fields: name, email, phone, company, source, notes, qualification, sentiment
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowConfigModal(false);
                    setSelectedConfig(null);
                    setSelectedType(null);
                  }}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={saving || !formData.name || !formData.webhookUrl}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/25"
                >
                  {saving ? (
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                  ) : selectedConfig ? (
                    'Save Changes'
                  ) : (
                    'Create Integration'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CRMIntegrationPage;
