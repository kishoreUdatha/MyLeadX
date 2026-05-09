import { useState, useEffect } from 'react';
import {
  Cog6ToothIcon,
  DocumentTextIcon,
  IdentificationIcon,
  KeyIcon,
  ClipboardDocumentIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

// Types
interface DltConfig {
  organizationName: string;
  channels: {
    sms: boolean;
    whatsapp: boolean;
    rcs: boolean;
  };
  dltType: 'PLATFORM' | 'CUSTOM';
  senderId: string | null;
  customDlt: {
    entityId: string;
    senderId: string;
    teleMarketerId: string | null;
    platform: string | null;
    registeredName: string | null;
    configuredAt: string | null;
  } | null;
  notes: string | null;
}

interface DltTemplate {
  id: string;
  name: string;
  description: string | null;
  dltTemplateId: string;
  dltContentType: string;
  content: string;
  variables: string[];
  sampleValues: Record<string, string>;
  isActive: boolean;
  isVerified: boolean;
  verifiedAt: string | null;
  usageCount: number;
  createdAt: string;
}

interface SenderIdRequest {
  id: string;
  requestedSenderId: string;
  businessName: string;
  businessType: string | null;
  purpose: string | null;
  contactName: string;
  contactEmail: string;
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  statusReason: string | null;
  assignedSenderId: string | null;
  createdAt: string;
  processedBy?: { firstName: string; lastName: string } | null;
}

interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  permissions: Record<string, boolean>;
  rateLimit: number;
  dailyLimit: number | null;
  ipWhitelist: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  createdBy?: { firstName: string; lastName: string } | null;
}

const tabs = [
  { id: 'dlt-config', name: 'DLT Configuration', icon: Cog6ToothIcon },
  { id: 'dlt-templates', name: 'DLT Templates', icon: DocumentTextIcon },
  { id: 'sender-id', name: 'Sender ID Requests', icon: IdentificationIcon },
  { id: 'api-keys', name: 'API Keys', icon: KeyIcon },
];

const SettingsPage = () => {
  const [activeTab, setActiveTab] = useState('dlt-config');
  const [loading, setLoading] = useState(false);

  // DLT Config state
  const [dltConfig, setDltConfig] = useState<DltConfig | null>(null);

  // DLT Templates state
  const [dltTemplates, setDltTemplates] = useState<DltTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<DltTemplate | null>(null);

  // Sender ID Requests state
  const [senderIdRequests, setSenderIdRequests] = useState<SenderIdRequest[]>([]);
  const [showSenderIdModal, setShowSenderIdModal] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dlt-config':
          const configRes = await api.get('/messaging-portal/settings/dlt-config');
          setDltConfig(configRes.data);
          break;
        case 'dlt-templates':
          try {
            const templatesRes = await api.get('/messaging-portal/settings/dlt-templates');
            setDltTemplates(templatesRes.data);
          } catch (error: any) {
            if (error.response?.status === 403) {
              setDltTemplates([]);
            }
          }
          break;
        case 'sender-id':
          const requestsRes = await api.get('/messaging-portal/settings/sender-id-requests');
          setSenderIdRequests(requestsRes.data);
          break;
        case 'api-keys':
          const keysRes = await api.get('/messaging-portal/settings/api-keys');
          setApiKeys(keysRes.data);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  // DLT Config Tab
  const renderDltConfig = () => {
    if (!dltConfig) {
      return <div className="text-center py-8 text-gray-500">Loading configuration...</div>;
    }

    return (
      <div className="space-y-6">
        {/* Status Overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Messaging Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${dltConfig.channels.sms ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-700">SMS: {dltConfig.channels.sms ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${dltConfig.channels.whatsapp ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-700">WhatsApp: {dltConfig.channels.whatsapp ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${dltConfig.channels.rcs ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-gray-700">RCS: {dltConfig.channels.rcs ? 'Enabled' : 'Disabled'}</span>
            </div>
          </div>
        </div>

        {/* DLT Details */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">DLT Configuration</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">DLT Type</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                dltConfig.dltType === 'CUSTOM'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {dltConfig.dltType === 'CUSTOM' ? 'Own DLT Registration' : 'Platform DLT'}
              </span>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-600">Sender ID</span>
              <span className="font-mono text-gray-900">{dltConfig.senderId || 'Not Assigned'}</span>
            </div>

            {dltConfig.dltType === 'CUSTOM' && dltConfig.customDlt && (
              <>
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-gray-600">PE ID (Entity ID)</span>
                  <span className="font-mono text-gray-900">{dltConfig.customDlt.entityId}</span>
                </div>
                {dltConfig.customDlt.platform && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">DLT Platform</span>
                    <span className="text-gray-900">{dltConfig.customDlt.platform}</span>
                  </div>
                )}
                {dltConfig.customDlt.registeredName && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Registered Name</span>
                    <span className="text-gray-900">{dltConfig.customDlt.registeredName}</span>
                  </div>
                )}
                {dltConfig.customDlt.configuredAt && (
                  <div className="flex items-center justify-between py-3">
                    <span className="text-gray-600">Configured On</span>
                    <span className="text-gray-900">
                      {new Date(dltConfig.customDlt.configuredAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {dltConfig.notes && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">{dltConfig.notes}</p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need to change your DLT configuration?</h3>
          <p className="text-blue-700 text-sm">
            DLT configuration changes require verification. Please contact our support team or submit a
            Sender ID request to make changes to your DLT settings.
          </p>
        </div>
      </div>
    );
  };

  // DLT Templates Tab
  const renderDltTemplates = () => {
    if (dltConfig?.dltType !== 'CUSTOM') {
      return (
        <div className="text-center py-12">
          <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">DLT Templates Not Available</h3>
          <p className="text-gray-500">
            DLT template management is only available for organizations with their own DLT registration.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your DLT Templates</h3>
          <button
            onClick={() => {
              setEditingTemplate(null);
              setShowTemplateModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Template
          </button>
        </div>

        {dltTemplates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No templates added yet. Add your DLT-registered templates to use them in campaigns.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {dltTemplates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{template.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        template.isVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {template.isVerified ? 'Verified' : 'Pending Verification'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        template.dltContentType === 'TRANSACTIONAL' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {template.dltContentType}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">DLT ID: {template.dltTemplateId}</p>
                    <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded font-mono">
                      {template.content}
                    </p>
                    {template.variables.length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        Variables: {template.variables.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => {
                        setEditingTemplate(template);
                        setShowTemplateModal(true);
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Sender ID Requests Tab
  const renderSenderIdRequests = () => {
    const getStatusBadge = (status: string) => {
      const styles: Record<string, string> = {
        PENDING: 'bg-yellow-100 text-yellow-800',
        REVIEWING: 'bg-blue-100 text-blue-800',
        APPROVED: 'bg-green-100 text-green-800',
        REJECTED: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800',
      };
      return styles[status] || styles.PENDING;
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Sender ID Requests</h3>
          <button
            onClick={() => setShowSenderIdModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Request New Sender ID
          </button>
        </div>

        {senderIdRequests.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <IdentificationIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No sender ID requests yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {senderIdRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-lg font-bold text-gray-900">
                        {request.requestedSenderId}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{request.businessName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Requested on {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.status === 'APPROVED' && request.assignedSenderId && (
                      <p className="text-sm text-green-600 mt-2">
                        Assigned Sender ID: <span className="font-mono font-bold">{request.assignedSenderId}</span>
                      </p>
                    )}
                    {request.status === 'REJECTED' && request.statusReason && (
                      <p className="text-sm text-red-600 mt-2">Reason: {request.statusReason}</p>
                    )}
                  </div>
                  {request.status === 'PENDING' && (
                    <button
                      onClick={() => handleCancelSenderIdRequest(request.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // API Keys Tab
  const renderApiKeys = () => {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">API Keys</h3>
            <p className="text-sm text-gray-500">Manage API keys for programmatic access to the messaging API</p>
          </div>
          <button
            onClick={() => setShowApiKeyModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create API Key
          </button>
        </div>

        {newApiKey && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800">API Key Created</h4>
                <p className="text-sm text-green-700 mt-1">
                  Save this key securely - it won't be shown again:
                </p>
                <div className="flex items-center mt-2 space-x-2">
                  <code className="flex-1 bg-white px-3 py-2 rounded border border-green-300 text-sm font-mono">
                    {newApiKey}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(newApiKey);
                    }}
                    className="p-2 text-green-600 hover:text-green-800"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={() => setNewApiKey(null)}
                  className="mt-3 text-sm text-green-700 hover:text-green-900"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <KeyIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No API keys created yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-gray-900">{apiKey.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        apiKey.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {apiKey.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 font-mono mt-1">{apiKey.keyPrefix}...</p>
                    {apiKey.description && (
                      <p className="text-sm text-gray-600 mt-1">{apiKey.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span>Rate: {apiKey.rateLimit}/min</span>
                      {apiKey.dailyLimit && <span>Daily: {apiKey.dailyLimit}</span>}
                      {apiKey.lastUsedAt && (
                        <span>Last used: {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
                      )}
                      <span>Uses: {apiKey.usageCount}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-2">
                      {Object.entries(apiKey.permissions as Record<string, boolean>).map(([channel, enabled]) => (
                        <span
                          key={channel}
                          className={`px-2 py-0.5 rounded text-xs ${
                            enabled ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500 line-through'
                          }`}
                        >
                          {channel.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleToggleApiKey(apiKey.id, !apiKey.isActive)}
                      className={`p-2 ${apiKey.isActive ? 'text-gray-400 hover:text-yellow-600' : 'text-yellow-600 hover:text-green-600'}`}
                      title={apiKey.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {apiKey.isActive ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteApiKey(apiKey.id)}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Handlers
  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    try {
      await api.delete(`/messaging-portal/settings/dlt-templates/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleCancelSenderIdRequest = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    try {
      await api.delete(`/messaging-portal/settings/sender-id-requests/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to cancel request:', error);
    }
  };

  const handleToggleApiKey = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/messaging-portal/settings/api-keys/${id}`, { isActive });
      loadData();
    } catch (error) {
      console.error('Failed to toggle API key:', error);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) return;
    try {
      await api.delete(`/messaging-portal/settings/api-keys/${id}`);
      loadData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage your messaging configuration and API access</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {activeTab === 'dlt-config' && renderDltConfig()}
          {activeTab === 'dlt-templates' && renderDltTemplates()}
          {activeTab === 'sender-id' && renderSenderIdRequests()}
          {activeTab === 'api-keys' && renderApiKeys()}
        </>
      )}

      {/* Template Modal */}
      {showTemplateModal && (
        <TemplateModal
          template={editingTemplate}
          onClose={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            setShowTemplateModal(false);
            setEditingTemplate(null);
            loadData();
          }}
        />
      )}

      {/* Sender ID Request Modal */}
      {showSenderIdModal && (
        <SenderIdRequestModal
          onClose={() => setShowSenderIdModal(false)}
          onSave={() => {
            setShowSenderIdModal(false);
            loadData();
          }}
        />
      )}

      {/* API Key Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          onClose={() => setShowApiKeyModal(false)}
          onSave={(key) => {
            setShowApiKeyModal(false);
            setNewApiKey(key);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Template Modal Component
const TemplateModal = ({
  template,
  onClose,
  onSave,
}: {
  template: DltTemplate | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    dltTemplateId: template?.dltTemplateId || '',
    dltContentType: template?.dltContentType || 'TRANSACTIONAL',
    content: template?.content || '',
    variables: template?.variables?.join(', ') || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        variables: formData.variables.split(',').map((v) => v.trim()).filter(Boolean),
      };

      if (template) {
        await api.put(`/messaging-portal/settings/dlt-templates/${template.id}`, data);
      } else {
        await api.post('/messaging-portal/settings/dlt-templates', data);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {template ? 'Edit DLT Template' : 'Add DLT Template'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Template Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">DLT Template ID</label>
              <input
                type="text"
                value={formData.dltTemplateId}
                onChange={(e) => setFormData({ ...formData, dltTemplateId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono px-3 py-2"
                placeholder="1234567890123456789"
                required
                disabled={!!template}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Content Type</label>
              <select
                value={formData.dltContentType}
                onChange={(e) => setFormData({ ...formData, dltContentType: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
              >
                <option value="TRANSACTIONAL">Transactional</option>
                <option value="PROMOTIONAL">Promotional</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Template Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm px-3 py-2"
                placeholder="Your OTP is {#var#}. Valid for 10 minutes."
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Variables (comma-separated)</label>
              <input
                type="text"
                value={formData.variables}
                onChange={(e) => setFormData({ ...formData, variables: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="otp, name, date"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Sender ID Request Modal
const SenderIdRequestModal = ({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    requestedSenderId: '',
    businessName: '',
    businessType: '',
    purpose: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    hasOwnDlt: false,
    dltEntityId: '',
    dltPlatform: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/messaging-portal/settings/sender-id-requests', formData);
      onSave();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Request New Sender ID</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Requested Sender ID</label>
              <input
                type="text"
                value={formData.requestedSenderId}
                onChange={(e) => setFormData({ ...formData, requestedSenderId: e.target.value.toUpperCase() })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono uppercase px-3 py-2"
                placeholder="ABCDEF"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">6 uppercase letters only</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Name</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Business Type</label>
              <select
                value={formData.businessType}
                onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
              >
                <option value="">Select type...</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Education">Education</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Technology">Technology</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Purpose</label>
              <textarea
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                rows={2}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="Describe how you'll use this sender ID..."
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Name</label>
                  <input
                    type="text"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contact Email</label>
                  <input
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">Contact Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                />
              </div>
            </div>
            <div className="border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.hasOwnDlt}
                  onChange={(e) => setFormData({ ...formData, hasOwnDlt: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">I have my own DLT registration</span>
              </label>
              {formData.hasOwnDlt && (
                <div className="mt-3 space-y-3 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DLT Entity ID (PE ID)</label>
                    <input
                      type="text"
                      value={formData.dltEntityId}
                      onChange={(e) => setFormData({ ...formData, dltEntityId: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono px-3 py-2"
                      placeholder="1234567890123456789"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DLT Platform</label>
                    <select
                      value={formData.dltPlatform}
                      onChange={(e) => setFormData({ ...formData, dltPlatform: e.target.value })}
                      className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                    >
                      <option value="">Select platform...</option>
                      <option value="JIO">Jio DLT</option>
                      <option value="AIRTEL">Airtel DLT</option>
                      <option value="VI">Vi DLT</option>
                      <option value="BSNL">BSNL DLT</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// API Key Modal
const ApiKeyModal = ({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (key: string) => void;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: { sms: true, whatsapp: true, rcs: true },
    rateLimit: 100,
    dailyLimit: '',
    ipWhitelist: '',
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = {
        ...formData,
        dailyLimit: formData.dailyLimit ? parseInt(formData.dailyLimit) : null,
        ipWhitelist: formData.ipWhitelist ? formData.ipWhitelist.split(',').map((ip) => ip.trim()) : [],
        expiresAt: formData.expiresAt || null,
      };

      const response = await api.post('/messaging-portal/settings/api-keys', data);
      onSave(response.data.apiKey);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create API key');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-lg w-full p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Create API Key</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="Production API Key"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description (optional)</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="Used for main application"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div className="flex space-x-4">
                {['sms', 'whatsapp', 'rcs'].map((channel) => (
                  <label key={channel} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={(formData.permissions as any)[channel]}
                      onChange={(e) => setFormData({
                        ...formData,
                        permissions: { ...formData.permissions, [channel]: e.target.checked },
                      })}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700 capitalize">{channel}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Limit (per minute)</label>
                <input
                  type="number"
                  value={formData.rateLimit}
                  onChange={(e) => setFormData({ ...formData, rateLimit: parseInt(e.target.value) || 100 })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                  min={1}
                  max={1000}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Daily Limit (optional)</label>
                <input
                  type="number"
                  value={formData.dailyLimit}
                  onChange={(e) => setFormData({ ...formData, dailyLimit: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                  placeholder="Unlimited"
                  min={1}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">IP Whitelist (optional)</label>
              <input
                type="text"
                value={formData.ipWhitelist}
                onChange={(e) => setFormData({ ...formData, ipWhitelist: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono text-sm px-3 py-2"
                placeholder="192.168.1.1, 10.0.0.0/24"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated IPs or CIDR ranges</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Expiry Date (optional)</label>
              <input
                type="date"
                value={formData.expiresAt}
                onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
              />
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create API Key'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
