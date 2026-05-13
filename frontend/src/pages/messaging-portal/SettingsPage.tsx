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
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  InformationCircleIcon,
  SignalIcon,
  StarIcon,
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

interface OrganizationSenderId {
  id: string;
  senderId: string;
  name: string;
  description: string | null;
  dltEntityId: string | null;
  dltPlatform: string | null;
  smsType: 'TRANSACTIONAL' | 'PROMOTIONAL';
  isDefault: boolean;
  isActive: boolean;
  isVerified: boolean;
  usageCount: number;
  createdAt: string;
}

const tabs = [
  { id: 'dlt-config', name: 'DLT Configuration', icon: Cog6ToothIcon },
  { id: 'sender-ids', name: 'Sender IDs', icon: SignalIcon },
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

  // Organization Sender IDs state
  const [senderIds, setSenderIds] = useState<OrganizationSenderId[]>([]);
  const [showSenderIdFormModal, setShowSenderIdFormModal] = useState(false);
  const [editingSenderId, setEditingSenderId] = useState<OrganizationSenderId | null>(null);

  // DLT Validation state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validating, setValidating] = useState(false);
  const [preChecking, setPreChecking] = useState(false);

  // DLT Configuration Edit state
  const [showDltConfigModal, setShowDltConfigModal] = useState(false);
  const [savingDltConfig, setSavingDltConfig] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    validation: {
      preChecks?: {
        smsEnabled: boolean;
        hasCredits: boolean;
        peIdConfigured: boolean;
        peIdFormatValid: boolean;
        senderIdConfigured: boolean;
        senderIdFormatValid: boolean;
        telemarketerIdValid: boolean;
        templateConfigured: boolean;
        msg91Configured: boolean;
      };
      preChecksPassed?: boolean;
      peIdValid: boolean;
      senderIdValid: boolean;
      templateValid: boolean;
      testSmsSent: boolean;
      errors: string[];
      warnings: string[];
    };
    configuration: {
      providerType: string;
      peId: string;
      senderId: string;
      teleMarketerId: string | null;
      smsEnabled?: boolean;
      credits?: number;
    };
    recommendations: string[];
  } | null>(null);
  const [dltRequirements, setDltRequirements] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'dlt-config':
          const [configRes, requirementsRes] = await Promise.all([
            api.get('/messaging-portal/settings/dlt-config'),
            api.get('/messaging-portal/settings/dlt-requirements'),
          ]);
          setDltConfig(configRes.data);
          setDltRequirements(requirementsRes.data);
          break;
        case 'sender-ids':
          const senderIdsRes = await api.get('/messaging-portal/settings/sender-ids');
          setSenderIds(senderIdsRes.data);
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

  // DLT Pre-Check handler (free, instant)
  const handlePreCheck = async () => {
    setPreChecking(true);
    setValidationResult(null);
    try {
      const response = await api.post('/messaging-portal/settings/dlt-precheck');
      // Convert precheck response to validation result format
      setValidationResult({
        isValid: response.data.preChecksPassed,
        validation: {
          preChecks: response.data.preChecks,
          preChecksPassed: response.data.preChecksPassed,
          peIdValid: response.data.preChecks.peIdFormatValid,
          senderIdValid: response.data.preChecks.senderIdFormatValid,
          templateValid: false,
          testSmsSent: false,
          errors: response.data.preChecks.errors || [],
          warnings: response.data.preChecksPassed
            ? ['Pre-checks passed! Send a test SMS to verify with MSG91.']
            : [],
        },
        configuration: {
          providerType: dltConfig?.dltType || 'UNKNOWN',
          peId: dltConfig?.customDlt?.entityId || dltConfig?.senderId || 'N/A',
          senderId: dltConfig?.senderId || 'N/A',
          teleMarketerId: dltConfig?.customDlt?.teleMarketerId || null,
        },
        recommendations: response.data.preChecksPassed
          ? ['Click "Send Test SMS" to verify your configuration works with MSG91']
          : response.data.preChecks.errors || [],
      });
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        validation: {
          peIdValid: false,
          senderIdValid: false,
          templateValid: false,
          testSmsSent: false,
          errors: [error.response?.data?.error || 'Pre-check failed'],
          warnings: [],
        },
        configuration: {
          providerType: 'UNKNOWN',
          peId: 'N/A',
          senderId: 'N/A',
          teleMarketerId: null,
        },
        recommendations: ['Please try again or contact support'],
      });
    } finally {
      setPreChecking(false);
    }
  };

  // DLT Validation handler (sends test SMS)
  const handleValidateDlt = async (testPhone: string, templateId?: string) => {
    setValidating(true);
    setValidationResult(null);
    try {
      const response = await api.post('/messaging-portal/settings/dlt-validate', {
        testPhone,
        templateId,
        sendTestSms: true,
      });
      setValidationResult(response.data);
      setShowValidationModal(false); // Close modal after successful validation
    } catch (error: any) {
      setValidationResult({
        isValid: false,
        validation: {
          peIdValid: false,
          senderIdValid: false,
          templateValid: false,
          testSmsSent: false,
          errors: [error.response?.data?.error || 'Validation failed'],
          warnings: [],
        },
        configuration: {
          providerType: 'UNKNOWN',
          peId: 'N/A',
          senderId: 'N/A',
          teleMarketerId: null,
        },
        recommendations: ['Please try again or contact support'],
      });
      setShowValidationModal(false); // Close modal even on error to show results
    } finally {
      setValidating(false);
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">DLT Configuration</h3>
            <button
              onClick={() => setShowDltConfigModal(true)}
              className="inline-flex items-center px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              {dltConfig.dltType === 'CUSTOM' ? 'Edit Configuration' : 'Configure Own DLT'}
            </button>
          </div>

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
                {dltConfig.customDlt.teleMarketerId && (
                  <div className="flex items-center justify-between py-3 border-b border-gray-100">
                    <span className="text-gray-600">Telemarketer ID</span>
                    <span className="font-mono text-gray-900">{dltConfig.customDlt.teleMarketerId}</span>
                  </div>
                )}
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

          {dltConfig.dltType === 'PLATFORM' && !dltConfig.senderId && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">No Sender ID Assigned</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    You need a Sender ID to send SMS. Either:
                  </p>
                  <ul className="text-sm text-yellow-700 mt-2 list-disc list-inside">
                    <li>Request a Sender ID from the "Sender ID Requests" tab (Platform DLT)</li>
                    <li>Or click "Configure Own DLT" above if you have your own DLT registration</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* DLT Validation */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <ShieldCheckIcon className="h-6 w-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">Validate DLT Configuration</h3>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handlePreCheck}
                disabled={preChecking}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                {preChecking ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-5 w-5 mr-2" />
                    Quick Pre-Check
                  </>
                )}
              </button>
              <button
                onClick={() => setShowValidationModal(true)}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <ShieldCheckIcon className="h-5 w-5 mr-2" />
                Send Test SMS
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            <strong>Quick Pre-Check (Free):</strong> Instantly verify your configuration format and settings.<br/>
            <strong>Send Test SMS (1 Credit):</strong> Send a real SMS to verify end-to-end connectivity with MSG91.
          </p>

          {/* Validation Result Display */}
          {validationResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center mb-3">
                {validationResult.isValid ? (
                  <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                ) : (
                  <XCircleIcon className="h-6 w-6 text-red-600 mr-2" />
                )}
                <span className={`font-semibold ${validationResult.isValid ? 'text-green-800' : 'text-red-800'}`}>
                  {validationResult.isValid ? 'Configuration Valid!' : 'Configuration Issues Found'}
                </span>
                {validationResult.configuration.credits !== undefined && (
                  <span className="ml-auto text-sm text-gray-600">
                    Credits: {validationResult.configuration.credits}
                  </span>
                )}
              </div>

              {/* Pre-Checks Grid */}
              {validationResult.validation.preChecks && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Pre-Checks:</p>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    <div className={`p-2 rounded-lg text-center ${validationResult.validation.preChecks.smsEnabled ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="flex items-center justify-center">
                        {validationResult.validation.preChecks.smsEnabled ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs">SMS Enabled</span>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${validationResult.validation.preChecks.hasCredits ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="flex items-center justify-center">
                        {validationResult.validation.preChecks.hasCredits ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs">Has Credits</span>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${validationResult.validation.preChecks.peIdFormatValid ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="flex items-center justify-center">
                        {validationResult.validation.preChecks.peIdFormatValid ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs">PE ID</span>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${validationResult.validation.preChecks.senderIdFormatValid ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="flex items-center justify-center">
                        {validationResult.validation.preChecks.senderIdFormatValid ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs">Sender ID</span>
                    </div>
                    <div className={`p-2 rounded-lg text-center ${validationResult.validation.preChecks.msg91Configured ? 'bg-green-100' : 'bg-red-100'}`}>
                      <div className="flex items-center justify-center">
                        {validationResult.validation.preChecks.msg91Configured ? (
                          <CheckCircleIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircleIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <span className="text-xs">MSG91</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Status Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className={`p-3 rounded-lg ${validationResult.validation.peIdValid ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className="flex items-center">
                    {validationResult.validation.peIdValid ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className="text-sm font-medium">PE ID Valid</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${validationResult.validation.senderIdValid ? 'bg-green-100' : 'bg-red-100'}`}>
                  <div className="flex items-center">
                    {validationResult.validation.senderIdValid ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <XCircleIcon className="h-4 w-4 text-red-600 mr-1" />
                    )}
                    <span className="text-sm font-medium">Sender ID Valid</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${validationResult.validation.templateValid ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <div className="flex items-center">
                    {validationResult.validation.templateValid ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600 mr-1" />
                    )}
                    <span className="text-sm font-medium">Template</span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${validationResult.validation.testSmsSent ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <div className="flex items-center">
                    {validationResult.validation.testSmsSent ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-600 mr-1" />
                    ) : (
                      <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
                    )}
                    <span className="text-sm font-medium">Test SMS</span>
                  </div>
                </div>
              </div>

              {validationResult.validation.errors.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
                  <ul className="list-disc list-inside text-sm text-red-700">
                    {validationResult.validation.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.validation.warnings.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {validationResult.validation.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.recommendations.length > 0 && !validationResult.isValid && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {validationResult.recommendations.map((rec, index) => (
                      <li key={index}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* DLT Requirements Info */}
        {dltRequirements && (
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <div className="flex items-center mb-4">
              <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900">DLT Requirements (India)</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {Object.entries(dltRequirements.requirements || {}).map(([key, req]: [string, any]) => (
                <div key={key} className="bg-white p-4 rounded-lg border border-gray-200">
                  <h4 className="font-medium text-gray-900">{req.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">{req.description}</p>
                  <div className="mt-2 flex items-center space-x-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{req.format}</span>
                    {!req.required && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Optional</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Example: {req.example}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="font-medium text-gray-900 mb-2">DLT Platforms</h4>
              <div className="flex flex-wrap gap-2">
                {(dltRequirements.platforms || []).map((platform: any) => (
                  <a
                    key={platform.code}
                    href={platform.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm hover:bg-blue-100"
                  >
                    {platform.name}
                    <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {dltRequirements.steps && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Setup Steps</h4>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  {dltRequirements.steps.map((step: string, index: number) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        )}

        {/* Help Section */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">DLT Configuration Help</h3>
          <div className="text-blue-700 text-sm space-y-2">
            <p><strong>Platform DLT:</strong> Use MyLeadX's DLT registration. Request a Sender ID and we handle the rest.</p>
            <p><strong>Own DLT Registration:</strong> If you have your own DLT account (Jio, Airtel, Vi, BSNL), click "Configure Own DLT" to enter your credentials directly.</p>
            <p className="pt-2 text-blue-600">Need help? Contact support at support@myleadx.com</p>
          </div>
        </div>
      </div>
    );
  };

  // Sender IDs Tab
  const renderSenderIds = () => {
    const handleDeleteSenderId = async (id: string) => {
      if (!confirm('Are you sure you want to delete this Sender ID?')) return;
      try {
        await api.delete(`/messaging-portal/settings/sender-ids/${id}`);
        loadData();
      } catch (error) {
        console.error('Failed to delete sender ID:', error);
      }
    };

    const handleSetDefault = async (id: string) => {
      try {
        await api.post(`/messaging-portal/settings/sender-ids/${id}/set-default`);
        loadData();
      } catch (error) {
        console.error('Failed to set default sender ID:', error);
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Your Sender IDs</h3>
            <p className="text-sm text-gray-500">Manage multiple sender IDs for different purposes</p>
          </div>
          <button
            onClick={() => {
              setEditingSenderId(null);
              setShowSenderIdFormModal(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Sender ID
          </button>
        </div>

        {senderIds.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <SignalIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Sender IDs Yet</h4>
            <p className="text-gray-500 mb-4">Add your DLT-registered sender IDs to use them when sending SMS.</p>
            <button
              onClick={() => {
                setEditingSenderId(null);
                setShowSenderIdFormModal(true);
              }}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Your First Sender ID
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {senderIds.map((sid) => (
              <div key={sid.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-lg font-bold text-gray-900">{sid.senderId}</span>
                      {sid.isDefault && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                          <StarIcon className="h-3 w-3 mr-1" />
                          Default
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        sid.smsType === 'TRANSACTIONAL' ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {sid.smsType}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        sid.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sid.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-700 mt-1">{sid.name}</p>
                    {sid.description && (
                      <p className="text-sm text-gray-500 mt-1">{sid.description}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      {sid.dltPlatform && <span>Platform: {sid.dltPlatform}</span>}
                      <span>Used: {sid.usageCount} times</span>
                      <span>Added: {new Date(sid.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Legacy or approved request sender IDs - read only */}
                    {sid.id === 'legacy-org-sender-id' ? (
                      <span className="text-xs text-gray-400 italic">From org settings</span>
                    ) : sid.id.startsWith('request-') ? (
                      <span className="text-xs text-green-600 italic">Approved request</span>
                    ) : (
                      <>
                        {!sid.isDefault && (
                          <button
                            onClick={() => handleSetDefault(sid.id)}
                            className="p-2 text-gray-400 hover:text-yellow-600"
                            title="Set as default"
                          >
                            <StarIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingSenderId(sid);
                            setShowSenderIdFormModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSenderId(sid.id)}
                          className="p-2 text-gray-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start">
            <InformationCircleIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">About Multiple Sender IDs</p>
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li><strong>Transactional:</strong> For OTPs, alerts, confirmations (24/7, bypasses DND)</li>
                <li><strong>Promotional:</strong> For marketing, offers (9 AM - 9 PM, blocked by DND)</li>
                <li>Set a default sender ID for each type to use when not specified</li>
                <li>All sender IDs must be registered in your DLT portal</li>
              </ul>
            </div>
          </div>
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
          {activeTab === 'sender-ids' && renderSenderIds()}
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

      {/* DLT Validation Modal */}
      {showValidationModal && (
        <DltValidationModal
          dltTemplates={dltTemplates}
          validating={validating}
          onValidate={handleValidateDlt}
          onClose={() => {
            setShowValidationModal(false);
          }}
        />
      )}

      {/* DLT Configuration Modal */}
      {showDltConfigModal && (
        <DltConfigModal
          currentConfig={dltConfig}
          saving={savingDltConfig}
          onSave={async (config) => {
            setSavingDltConfig(true);
            try {
              await api.put('/messaging-portal/settings/dlt-config', config);
              setShowDltConfigModal(false);
              loadData(); // Reload config
            } catch (error: any) {
              alert(error.response?.data?.error || 'Failed to save DLT configuration');
            } finally {
              setSavingDltConfig(false);
            }
          }}
          onClose={() => setShowDltConfigModal(false)}
        />
      )}

      {/* Sender ID Form Modal */}
      {showSenderIdFormModal && (
        <SenderIdFormModal
          senderId={editingSenderId}
          onSave={async (data) => {
            try {
              if (editingSenderId) {
                await api.put(`/messaging-portal/settings/sender-ids/${editingSenderId.id}`, data);
              } else {
                await api.post('/messaging-portal/settings/sender-ids', data);
              }
              setShowSenderIdFormModal(false);
              setEditingSenderId(null);
              loadData();
            } catch (error: any) {
              alert(error.response?.data?.error || 'Failed to save sender ID');
            }
          }}
          onClose={() => {
            setShowSenderIdFormModal(false);
            setEditingSenderId(null);
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

// DLT Validation Modal
const DltValidationModal = ({
  dltTemplates,
  validating,
  onValidate,
  onClose,
}: {
  dltTemplates: DltTemplate[];
  validating: boolean;
  onValidate: (testPhone: string, templateId?: string) => void;
  onClose: () => void;
}) => {
  const [testPhone, setTestPhone] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      alert('Please enter a phone number');
      return;
    }
    onValidate(testPhone, selectedTemplateId || undefined);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-primary-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">Validate DLT Configuration</h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Send a test SMS to verify your DLT configuration is working correctly. A test message will be
            sent to the phone number you provide.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Test Phone Number *</label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="9876543210"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter your mobile number to receive the test SMS
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">DLT Template (Optional)</label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
              >
                <option value="">Use default test template</option>
                {dltTemplates.map((template) => (
                  <option key={template.id} value={template.dltTemplateId}>
                    {template.name} ({template.dltTemplateId})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select a specific template to test, or use the system default
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Note:</p>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>This will send a real SMS to the provided number</li>
                    <li>Standard SMS charges apply (1 credit)</li>
                    <li>Make sure the phone number is correct</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={validating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={validating || !testPhone}
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <ShieldCheckIcon className="h-5 w-5 mr-2" />
                    Send Test SMS
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Sender ID Form Modal
const SenderIdFormModal = ({
  senderId,
  onSave,
  onClose,
}: {
  senderId: OrganizationSenderId | null;
  onSave: (data: any) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    senderId: senderId?.senderId || '',
    name: senderId?.name || '',
    description: senderId?.description || '',
    dltEntityId: senderId?.dltEntityId || '',
    dltPlatform: senderId?.dltPlatform || '',
    smsType: senderId?.smsType || 'TRANSACTIONAL',
    isDefault: senderId?.isDefault || false,
    isActive: senderId?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
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
            {senderId ? 'Edit Sender ID' : 'Add Sender ID'}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sender ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.senderId}
                  onChange={(e) => setFormData({
                    ...formData,
                    senderId: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 font-mono uppercase"
                  placeholder="MYBRAND"
                  maxLength={6}
                  required
                  disabled={!!senderId} // Can't change sender ID after creation
                />
                <p className="text-xs text-gray-500 mt-1">{formData.senderId.length}/6 letters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  SMS Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.smsType}
                  onChange={(e) => setFormData({ ...formData, smsType: e.target.value as any })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                  required
                >
                  <option value="TRANSACTIONAL">Transactional</option>
                  <option value="PROMOTIONAL">Promotional</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="e.g., Marketing, Alerts, OTP"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">DLT Platform</label>
                <select
                  value={formData.dltPlatform}
                  onChange={(e) => setFormData({ ...formData, dltPlatform: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                >
                  <option value="">Select platform...</option>
                  <option value="JIO">Jio TrueConnect</option>
                  <option value="AIRTEL">Airtel DLT</option>
                  <option value="VI">Vi (Vodafone-Idea)</option>
                  <option value="BSNL">BSNL</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">PE ID (Entity ID)</label>
                <input
                  type="text"
                  value={formData.dltEntityId}
                  onChange={(e) => setFormData({
                    ...formData,
                    dltEntityId: e.target.value.replace(/\D/g, '').slice(0, 19)
                  })}
                  className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2 font-mono"
                  placeholder="19-digit PE ID"
                  maxLength={19}
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Set as default for {formData.smsType.toLowerCase()} SMS</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || formData.senderId.length !== 6 || !formData.name}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : (senderId ? 'Update' : 'Add Sender ID')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// DLT Configuration Modal
const DltConfigModal = ({
  currentConfig,
  saving,
  onSave,
  onClose,
}: {
  currentConfig: DltConfig | null;
  saving: boolean;
  onSave: (config: any) => void;
  onClose: () => void;
}) => {
  const [dltType, setDltType] = useState<'PLATFORM' | 'CUSTOM'>(
    currentConfig?.dltType || 'PLATFORM'
  );
  const [formData, setFormData] = useState({
    entityId: currentConfig?.customDlt?.entityId || '',
    senderId: currentConfig?.customDlt?.senderId || '',
    teleMarketerId: currentConfig?.customDlt?.teleMarketerId || '',
    platform: currentConfig?.customDlt?.platform || '',
    registeredName: currentConfig?.customDlt?.registeredName || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      dltType,
      ...formData,
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Configure DLT Settings</h3>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* DLT Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">DLT Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setDltType('PLATFORM')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    dltType === 'PLATFORM'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">Platform DLT</div>
                  <div className="text-sm text-gray-500 mt-1">Use MyLeadX's DLT registration</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDltType('CUSTOM')}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    dltType === 'CUSTOM'
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900">Own DLT</div>
                  <div className="text-sm text-gray-500 mt-1">I have my own DLT registration</div>
                </button>
              </div>
            </div>

            {/* Custom DLT Fields */}
            {dltType === 'CUSTOM' && (
              <div className="space-y-4 border-t pt-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-purple-800">
                    Enter your DLT credentials from your DLT portal (Jio, Airtel, Vi, or BSNL)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    PE ID (Principal Entity ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.entityId}
                    onChange={(e) => setFormData({ ...formData, entityId: e.target.value.replace(/\D/g, '').slice(0, 19) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono px-3 py-2"
                    placeholder="1234567890123456789"
                    maxLength={19}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    19-digit ID from your DLT portal. {formData.entityId.length}/19 digits
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Sender ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.senderId}
                    onChange={(e) => setFormData({ ...formData, senderId: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono uppercase px-3 py-2"
                    placeholder="MYBRAND"
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    6 uppercase letters registered in your DLT portal. {formData.senderId.length}/6 letters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">DLT Platform</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                  >
                    <option value="">Select platform...</option>
                    <option value="JIO">Jio TrueConnect</option>
                    <option value="AIRTEL">Airtel DLT</option>
                    <option value="VI">Vi (Vodafone-Idea)</option>
                    <option value="BSNL">BSNL</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Telemarketer ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.teleMarketerId}
                    onChange={(e) => setFormData({ ...formData, teleMarketerId: e.target.value.replace(/\D/g, '').slice(0, 19) })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 font-mono px-3 py-2"
                    placeholder="1234567890123456789"
                    maxLength={19}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Required only if using an SMS aggregator/telemarketer
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Registered Business Name (Optional)</label>
                  <input
                    type="text"
                    value={formData.registeredName}
                    onChange={(e) => setFormData({ ...formData, registeredName: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
                    placeholder="Your Company Pvt Ltd"
                  />
                </div>
              </div>
            )}

            {/* Platform DLT Info */}
            {dltType === 'PLATFORM' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Platform DLT</h4>
                <p className="text-sm text-blue-700">
                  With Platform DLT, you'll use MyLeadX's DLT registration. After saving:
                </p>
                <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                  <li>Go to "Sender ID Requests" tab to request a Sender ID</li>
                  <li>Our team will assign a Sender ID for your business</li>
                  <li>Templates will be shared from our DLT account</li>
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (dltType === 'CUSTOM' && (formData.entityId.length !== 19 || formData.senderId.length !== 6))}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
