import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Check,
  X,
  Loader2,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  TestTube,
  Webhook,
  Database,
  Cloud,
  FileText,
  Settings,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

interface CRMIntegration {
  id: string;
  type: string;
  name: string;
  isActive: boolean;
  connected: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
}

interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  trigger: string;
  isActive: boolean;
  lastCalledAt?: string;
  lastError?: string;
}

interface FieldMapping {
  sourceField: string;
  targetField: string;
}

const IntegrationSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'crm' | 'webhook' | 'knowledge' | 'field-mapping'>('crm');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  // CRM Integrations
  const [crmIntegrations, setCrmIntegrations] = useState<CRMIntegration[]>([]);
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  // Custom Webhooks/APIs
  const [customEndpoints, setCustomEndpoints] = useState<CustomEndpoint[]>([]);
  const [newEndpoint, setNewEndpoint] = useState({
    name: '',
    url: '',
    method: 'POST' as const,
    trigger: 'on_call_end',
    apiKey: '',
    headers: {} as Record<string, string>,
  });

  // Field Mappings (CRM field to VoiceBridge field)
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([
    { sourceField: 'firstName', targetField: 'first_name' },
    { sourceField: 'lastName', targetField: 'last_name' },
    { sourceField: 'phone', targetField: 'phone' },
    { sourceField: 'email', targetField: 'email' },
  ]);

  // Webhook URL for clients to receive data
  const [inboundWebhookUrl, setInboundWebhookUrl] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  // Available CRM providers
  const crmProviders = [
    { id: 'salesforce', name: 'Salesforce', logo: '☁️', color: 'bg-blue-500', authType: 'oauth' },
    { id: 'hubspot', name: 'HubSpot', logo: '🟠', color: 'bg-orange-500', authType: 'oauth' },
    { id: 'zoho', name: 'Zoho CRM', logo: '🟢', color: 'bg-green-500', authType: 'oauth' },
    { id: 'pipedrive', name: 'Pipedrive', logo: '🟣', color: 'bg-purple-500', authType: 'api_key' },
    { id: 'freshsales', name: 'Freshsales', logo: '🔵', color: 'bg-cyan-500', authType: 'api_key' },
    { id: 'custom', name: 'Custom CRM', logo: '⚙️', color: 'bg-gray-500', authType: 'webhook' },
  ];

  // VoiceBridge fields available for mapping
  const voiceBridgeFields = [
    { id: 'firstName', label: 'First Name' },
    { id: 'lastName', label: 'Last Name' },
    { id: 'phone', label: 'Phone Number' },
    { id: 'email', label: 'Email' },
    { id: 'company', label: 'Company' },
    { id: 'source', label: 'Lead Source' },
    { id: 'status', label: 'Lead Status' },
    { id: 'callSummary', label: 'Call Summary' },
    { id: 'appointmentDate', label: 'Appointment Date' },
    { id: 'notes', label: 'Notes' },
    { id: 'tags', label: 'Tags' },
    { id: 'customField1', label: 'Custom Field 1' },
    { id: 'customField2', label: 'Custom Field 2' },
  ];

  // Trigger options for webhooks
  const triggerOptions = [
    { id: 'on_call_start', label: 'When call starts' },
    { id: 'on_call_end', label: 'When call ends' },
    { id: 'on_lead_created', label: 'When lead is created' },
    { id: 'on_appointment_booked', label: 'When appointment is booked' },
    { id: 'on_transfer_requested', label: 'When human transfer requested' },
    { id: 'on_payment_completed', label: 'When payment is completed' },
  ];

  useEffect(() => {
    fetchIntegrations();
    generateWebhookUrl();
  }, []);

  const fetchIntegrations = async () => {
    setLoading(true);
    try {
      const [crmRes, endpointsRes] = await Promise.all([
        api.get('/integrations/crm'),
        api.get('/integrations/custom-api'),
      ]);

      if (crmRes.data.success) {
        setCrmIntegrations(crmRes.data.data);
      }
      if (endpointsRes.data.success) {
        setCustomEndpoints(endpointsRes.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateWebhookUrl = () => {
    // Generate unique webhook URL for this organization
    const orgId = localStorage.getItem('organizationId') || 'demo';
    setInboundWebhookUrl(`${window.location.origin}/api/webhooks/inbound/${orgId}`);
    setWebhookSecret(`whsec_${Math.random().toString(36).substring(2, 15)}`);
  };

  const connectCRM = async (provider: string) => {
    try {
      if (provider === 'custom') {
        // For custom CRM, show the webhook setup
        setActiveSection('webhook');
        return;
      }

      const response = await api.get(`/integrations/calendar/auth/${provider}`);
      if (response.data.success && response.data.data.authUrl) {
        // Open OAuth popup
        const popup = window.open(response.data.data.authUrl, 'crm-auth', 'width=600,height=700');

        // Listen for OAuth completion
        const checkClosed = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkClosed);
            fetchIntegrations();
          }
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to connect CRM:', err);
    }
  };

  const disconnectCRM = async (integrationId: string) => {
    try {
      await api.delete(`/integrations/crm/${integrationId}`);
      fetchIntegrations();
    } catch (err) {
      console.error('Failed to disconnect CRM:', err);
    }
  };

  const testConnection = async (integrationId: string) => {
    setTestingConnection(integrationId);
    try {
      const response = await api.post(`/integrations/crm/${integrationId}/test`);
      if (response.data.success) {
        alert('Connection successful!');
      }
    } catch (err) {
      alert('Connection failed. Please check your credentials.');
    } finally {
      setTestingConnection(null);
    }
  };

  const addCustomEndpoint = async () => {
    if (!newEndpoint.name || !newEndpoint.url) return;

    setSaving(true);
    try {
      const response = await api.post('/integrations/custom-api', newEndpoint);
      if (response.data.success) {
        setCustomEndpoints([...customEndpoints, response.data.data]);
        setNewEndpoint({
          name: '',
          url: '',
          method: 'POST',
          trigger: 'on_call_end',
          apiKey: '',
          headers: {},
        });
      }
    } catch (err) {
      console.error('Failed to add endpoint:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteEndpoint = async (endpointId: string) => {
    try {
      await api.delete(`/integrations/custom-api/${endpointId}`);
      setCustomEndpoints(customEndpoints.filter(e => e.id !== endpointId));
    } catch (err) {
      console.error('Failed to delete endpoint:', err);
    }
  };

  const testEndpoint = async (endpointId: string) => {
    setTestingConnection(endpointId);
    try {
      const response = await api.post(`/integrations/custom-api/${endpointId}/test`, {
        sampleData: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+1234567890',
          email: 'test@example.com',
        },
      });
      if (response.data.success) {
        alert('Webhook test successful!');
      }
    } catch (err) {
      alert('Webhook test failed. Please check the URL and credentials.');
    } finally {
      setTestingConnection(null);
    }
  };

  const saveFieldMappings = async () => {
    setSaving(true);
    try {
      await api.post('/integrations/field-mappings', { mappings: fieldMappings });
      alert('Field mappings saved!');
    } catch (err) {
      console.error('Failed to save field mappings:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Integration Settings</h1>
            <p className="text-sm text-gray-500">Connect your CRM, configure webhooks, and map data fields</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-lg border border-gray-200">
          {[
            { id: 'crm', label: 'CRM Connections', icon: Cloud },
            { id: 'webhook', label: 'Webhooks & APIs', icon: Webhook },
            { id: 'field-mapping', label: 'Field Mapping', icon: Database },
            { id: 'knowledge', label: 'Knowledge Base', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                activeSection === tab.id
                  ? 'bg-teal-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* CRM Connections Section */}
        {activeSection === 'crm' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-sm font-medium text-blue-800">Connect Your CRM</p>
                <p className="text-xs text-blue-700 mt-1">
                  Connect your existing CRM to automatically sync leads, appointments, and call data.
                  Your AI agents will have access to customer information during calls.
                </p>
              </div>
            </div>

            {/* CRM Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {crmProviders.map((provider) => {
                const integration = crmIntegrations.find(i => i.type.toLowerCase() === provider.id);
                const isConnected = integration?.connected;

                return (
                  <div
                    key={provider.id}
                    className={`bg-white border rounded-xl p-5 transition ${
                      isConnected ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${provider.color} text-white text-2xl`}>
                          {provider.logo}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{provider.name}</h3>
                          <p className="text-xs text-gray-500">
                            {provider.authType === 'oauth' ? 'OAuth 2.0' : provider.authType === 'api_key' ? 'API Key' : 'Webhook'}
                          </p>
                        </div>
                      </div>
                      {isConnected && (
                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                          <CheckCircle size={12} />
                          Connected
                        </span>
                      )}
                    </div>

                    {isConnected ? (
                      <div className="space-y-3">
                        {integration?.lastSyncAt && (
                          <p className="text-xs text-gray-500">
                            Last synced: {new Date(integration.lastSyncAt).toLocaleString()}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={() => testConnection(integration!.id)}
                            disabled={testingConnection === integration?.id}
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center justify-center gap-2"
                          >
                            {testingConnection === integration?.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <TestTube size={14} />
                            )}
                            Test
                          </button>
                          <button
                            onClick={() => disconnectCRM(integration!.id)}
                            className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition"
                          >
                            Disconnect
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => connectCRM(provider.id)}
                        className="w-full px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition flex items-center justify-center gap-2"
                      >
                        <Plus size={16} />
                        Connect {provider.name}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Webhooks & APIs Section */}
        {activeSection === 'webhook' && (
          <div className="space-y-6">
            {/* Inbound Webhook (for receiving data from client's system) */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Data from Your System</h3>
              <p className="text-sm text-gray-500 mb-4">
                Send lead data to this webhook URL from your CRM or application. We'll create leads and make them available to your AI agents.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Webhook URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inboundWebhookUrl}
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(inboundWebhookUrl)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-600 mb-1 block">Webhook Secret</label>
                  <div className="flex gap-2">
                    <input
                      type={showApiKey['secret'] ? 'text' : 'password'}
                      value={webhookSecret}
                      readOnly
                      className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => setShowApiKey({ ...showApiKey, secret: !showApiKey['secret'] })}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      {showApiKey['secret'] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(webhookSecret)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                      <Copy size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Example Request:</p>
                  <pre className="text-xs text-gray-600 overflow-x-auto">
{`POST ${inboundWebhookUrl}
Content-Type: application/json
X-Webhook-Secret: ${webhookSecret}

{
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+919876543210",
  "email": "john@example.com",
  "company": "Acme Inc",
  "source": "Website",
  "notes": "Interested in premium plan"
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Outbound Webhooks (send data to client's system) */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Send Data to Your System</h3>
                  <p className="text-sm text-gray-500">Configure webhooks to send call data, leads, and events to your system</p>
                </div>
              </div>

              {/* Existing Endpoints */}
              {customEndpoints.length > 0 && (
                <div className="space-y-3 mb-6">
                  {customEndpoints.map((endpoint) => (
                    <div
                      key={endpoint.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${endpoint.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{endpoint.name}</p>
                          <p className="text-xs text-gray-500">{endpoint.method} {endpoint.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                          {triggerOptions.find(t => t.id === endpoint.trigger)?.label}
                        </span>
                        <button
                          onClick={() => testEndpoint(endpoint.id)}
                          disabled={testingConnection === endpoint.id}
                          className="p-2 hover:bg-gray-200 rounded-lg transition"
                        >
                          {testingConnection === endpoint.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <TestTube size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => deleteEndpoint(endpoint.id)}
                          className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Endpoint Form */}
              <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Add New Webhook</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Name</label>
                    <input
                      type="text"
                      value={newEndpoint.name}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, name: e.target.value })}
                      placeholder="My CRM Webhook"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Trigger</label>
                    <select
                      value={newEndpoint.trigger}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, trigger: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      {triggerOptions.map((opt) => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs text-gray-600 mb-1 block">Method</label>
                    <select
                      value={newEndpoint.method}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, method: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="GET">GET</option>
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-gray-600 mb-1 block">Endpoint URL</label>
                    <input
                      type="url"
                      value={newEndpoint.url}
                      onChange={(e) => setNewEndpoint({ ...newEndpoint, url: e.target.value })}
                      placeholder="https://your-system.com/api/webhook"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-600 mb-1 block">API Key / Bearer Token (optional)</label>
                  <input
                    type="password"
                    value={newEndpoint.apiKey}
                    onChange={(e) => setNewEndpoint({ ...newEndpoint, apiKey: e.target.value })}
                    placeholder="Your API key for authentication"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>

                <button
                  onClick={addCustomEndpoint}
                  disabled={saving || !newEndpoint.name || !newEndpoint.url}
                  className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Add Webhook
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Field Mapping Section */}
        {activeSection === 'field-mapping' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Field Mapping</h3>
                  <p className="text-sm text-gray-500">Map VoiceBridge fields to your CRM fields</p>
                </div>
                <button
                  onClick={saveFieldMappings}
                  disabled={saving}
                  className="px-4 py-2 bg-teal-500 text-white text-sm font-medium rounded-lg hover:bg-teal-600 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Save Mappings
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
                  <div className="col-span-2">VoiceBridge Field</div>
                  <div className="text-center">→</div>
                  <div className="col-span-2">Your CRM Field</div>
                </div>

                {fieldMappings.map((mapping, index) => (
                  <div key={index} className="grid grid-cols-5 gap-4 items-center">
                    <div className="col-span-2">
                      <select
                        value={mapping.sourceField}
                        onChange={(e) => {
                          const newMappings = [...fieldMappings];
                          newMappings[index].sourceField = e.target.value;
                          setFieldMappings(newMappings);
                        }}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      >
                        {voiceBridgeFields.map((field) => (
                          <option key={field.id} value={field.id}>{field.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-center text-gray-400">
                      <ChevronRight size={20} />
                    </div>
                    <div className="col-span-2 flex gap-2">
                      <input
                        type="text"
                        value={mapping.targetField}
                        onChange={(e) => {
                          const newMappings = [...fieldMappings];
                          newMappings[index].targetField = e.target.value;
                          setFieldMappings(newMappings);
                        }}
                        placeholder="your_crm_field_name"
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => {
                          setFieldMappings(fieldMappings.filter((_, i) => i !== index));
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setFieldMappings([...fieldMappings, { sourceField: 'firstName', targetField: '' }])}
                  className="flex items-center gap-2 text-sm text-teal-600 hover:text-teal-700 transition"
                >
                  <Plus size={16} />
                  Add Field Mapping
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Knowledge Base Section */}
        {activeSection === 'knowledge' && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base</h3>
              <p className="text-sm text-gray-500 mb-6">
                Upload documents, FAQs, and product information that your AI agents can reference during calls.
              </p>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition cursor-pointer">
                <FileText size={40} className="mx-auto text-gray-400 mb-4" />
                <p className="text-sm font-medium text-gray-900 mb-1">Drop files here or click to upload</p>
                <p className="text-xs text-gray-500">PDF, Word, Excel, TXT (max 10MB each)</p>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    // Handle file upload
                    console.log('Files:', e.target.files);
                  }}
                />
              </div>

              {/* Quick Links */}
              <div className="mt-6 grid grid-cols-3 gap-4">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
                  <p className="text-sm font-medium text-gray-900">Import FAQs</p>
                  <p className="text-xs text-gray-500">Add common Q&A pairs</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
                  <p className="text-sm font-medium text-gray-900">Sync from URL</p>
                  <p className="text-xs text-gray-500">Import from website</p>
                </button>
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-left">
                  <p className="text-sm font-medium text-gray-900">Connect Drive</p>
                  <p className="text-xs text-gray-500">Google Drive / SharePoint</p>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationSettingsPage;
