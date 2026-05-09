/**
 * Super Admin Messaging Management Page
 * Manage credits, pricing, and view analytics across all organizations
 */
import { useState, useEffect, useCallback } from 'react';
import {
  ChatBubbleLeftIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  CurrencyRupeeIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  AdjustmentsHorizontalIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  MinusIcon,
  PencilIcon,
  IdentificationIcon,
  CheckCircleIcon,
  XCircleIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  InboxIcon,
  ClockIcon,
  EyeIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface OrgBalance {
  organizationId: string;
  organizationName: string;
  slug: string;
  smsSenderId: string | null;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  rcsEnabled: boolean;
  smsCredits: number;
  whatsappCredits: number;
  rcsCredits: number;
  // DLT Configuration
  smsProviderType?: 'PLATFORM' | 'CUSTOM';
  customDltEntityId?: string | null;
  customDltSenderId?: string | null;
  dltPlatform?: string | null;
}

interface DltConfig {
  smsProviderType: 'PLATFORM' | 'CUSTOM';
  customDltEntityId: string;
  customDltSenderId: string;
  customDltTeleMarketerId: string;
  dltPlatform: string;
  dltRegisteredName: string;
}

interface DltTemplate {
  id: string;
  name: string;
  dltTemplateId: string;
  content: string;
  dltContentType: string;
  variables: string[];
  isActive: boolean;
}

interface PricingConfig {
  id: string;
  organizationId: string | null;
  smsPrice: number;
  whatsappPrice: number;
  rcsPrice: number;
  smsBulkDiscount: Record<string, number>;
  whatsappBulkDiscount: Record<string, number>;
  rcsBulkDiscount: Record<string, number>;
  minPurchase: number;
  isActive: boolean;
}

interface MessagingStats {
  totalSmsCredits: number;
  totalWhatsappCredits: number;
  totalRcsCredits: number;
  totalOrganizations: number;
  totalMessagesSent: number;
  totalRevenue: number;
  todayMessagesSent: number;
  todayRevenue: number;
}

interface SenderIdRequest {
  id: string;
  organizationId: string;
  requestedSenderId: string;
  businessName: string;
  businessType: string | null;
  purpose: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  hasOwnDlt: boolean;
  dltEntityId: string | null;
  dltPlatform: string | null;
  status: 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  statusReason: string | null;
  assignedSenderId: string | null;
  processedAt: string | null;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  processedBy: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface AdjustCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrgBalance | null;
  onSuccess: () => void;
}

function AdjustCreditsModal({ isOpen, onClose, organization, onSuccess }: AdjustCreditsModalProps) {
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP' | 'RCS'>('SMS');
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!organization || amount === 0 || !reason.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post('/super-admin/messaging/adjust-credits', {
        organizationId: organization.organizationId,
        channel,
        amount,
        reason,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust credits');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-4">Adjust Credits</h3>
          <p className="text-sm text-slate-600 mb-4">{organization.organizationName}</p>
          {organization.smsSenderId && (
            <p className="text-xs text-indigo-600 mb-4">Sender ID: {organization.smsSenderId}</p>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="SMS">SMS ({organization.smsCredits} credits)</option>
              <option value="WHATSAPP">WhatsApp ({organization.whatsappCredits} credits)</option>
              <option value="RCS">RCS ({organization.rcsCredits} credits)</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAmount((a) => a - 100)}
                className="p-2 border rounded hover:bg-slate-50"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-center"
              />
              <button
                onClick={() => setAmount((a) => a + 100)}
                className="p-2 border rounded hover:bg-slate-50"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">Use negative value to deduct credits</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for adjustment..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || amount === 0 || !reason.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Adjust Credits'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditSenderIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrgBalance | null;
  onSuccess: () => void;
}

function EditSenderIdModal({ isOpen, onClose, organization, onSuccess }: EditSenderIdModalProps) {
  const [senderId, setSenderId] = useState('');
  const [smsEnabled, setSmsEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [rcsEnabled, setRcsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when organization changes
  useEffect(() => {
    if (organization) {
      setSenderId(organization.smsSenderId || '');
      setSmsEnabled(organization.smsEnabled);
      setWhatsappEnabled(organization.whatsappEnabled);
      setRcsEnabled(organization.rcsEnabled);
    }
  }, [organization]);

  const handleSubmit = async () => {
    if (!organization) return;

    // Validate sender ID format (6 characters, uppercase alphanumeric)
    if (senderId && !/^[A-Z0-9]{6}$/.test(senderId.toUpperCase())) {
      setError('Sender ID must be exactly 6 alphanumeric characters');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.put(`/super-admin/messaging/organizations/${organization.organizationId}/messaging-settings`, {
        smsSenderId: senderId.toUpperCase() || null,
        smsEnabled,
        whatsappEnabled,
        rcsEnabled,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <h3 className="text-lg font-semibold mb-2">Messaging Settings</h3>
          <p className="text-sm text-slate-600 mb-4">{organization.organizationName}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <IdentificationIcon className="w-4 h-4 inline mr-1" />
              SMS Sender ID (White-Label)
            </label>
            <input
              type="text"
              value={senderId}
              onChange={(e) => setSenderId(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="e.g., RESELL1"
              maxLength={6}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
            />
            <p className="text-xs text-slate-500 mt-1">
              Must be a DLT-registered sender ID (6 characters). Leave empty to use default.
            </p>
          </div>

          <div className="mb-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700 mb-2">Channel Settings</label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">SMS</span>
                <p className="text-xs text-slate-500">Enable bulk SMS messaging</p>
              </div>
              {smsEnabled ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-slate-300" />
              )}
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">WhatsApp</span>
                <p className="text-xs text-slate-500">Enable WhatsApp messaging</p>
              </div>
              {whatsappEnabled ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-slate-300" />
              )}
            </label>

            <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={rcsEnabled}
                onChange={(e) => setRcsEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded"
              />
              <div className="flex-1">
                <span className="font-medium">RCS</span>
                <p className="text-xs text-slate-500">Enable RCS rich messaging</p>
              </div>
              {rcsEnabled ? (
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
              ) : (
                <XCircleIcon className="w-5 h-5 text-slate-300" />
              )}
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DltConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  organization: OrgBalance | null;
  onSuccess: () => void;
}

function DltConfigModal({ isOpen, onClose, organization, onSuccess }: DltConfigModalProps) {
  const [providerType, setProviderType] = useState<'PLATFORM' | 'CUSTOM'>('PLATFORM');
  const [entityId, setEntityId] = useState('');
  const [senderId, setSenderId] = useState('');
  const [teleMarketerId, setTeleMarketerId] = useState('');
  const [platform, setPlatform] = useState('');
  const [registeredName, setRegisteredName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<DltTemplate[]>([]);
  const [showAddTemplate, setShowAddTemplate] = useState(false);
  const [newTemplate, setNewTemplate] = useState({ name: '', dltTemplateId: '', content: '', dltContentType: 'TRANSACTIONAL' });

  // Load existing config when modal opens
  useEffect(() => {
    if (organization && isOpen) {
      loadDltConfig();
    }
  }, [organization, isOpen]);

  const loadDltConfig = async () => {
    if (!organization) return;
    try {
      setLoadingConfig(true);
      const res = await api.get(`/super-admin/messaging/organizations/${organization.organizationId}/dlt-config`);
      const data = res.data.data;
      setProviderType(data.smsProviderType || 'PLATFORM');
      setEntityId(data.customDltEntityId || '');
      setSenderId(data.customDltSenderId || '');
      setTeleMarketerId(data.customDltTeleMarketerId || '');
      setPlatform(data.dltPlatform || '');
      setRegisteredName(data.dltRegisteredName || '');
      setTemplates(data.organizationSmsTemplates || []);
    } catch (err) {
      console.error('Failed to load DLT config:', err);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSubmit = async () => {
    if (!organization) return;

    if (providerType === 'CUSTOM') {
      if (!entityId.trim()) {
        setError('DLT Entity ID (PE_ID) is required');
        return;
      }
      if (!senderId.trim()) {
        setError('DLT Sender ID is required');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      await api.put(`/super-admin/messaging/organizations/${organization.organizationId}/dlt-config`, {
        smsProviderType: providerType,
        customDltEntityId: entityId || null,
        customDltSenderId: senderId || null,
        customDltTeleMarketerId: teleMarketerId || null,
        dltPlatform: platform || null,
        dltRegisteredName: registeredName || null,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update DLT configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!organization || !newTemplate.name || !newTemplate.dltTemplateId || !newTemplate.content) {
      setError('All template fields are required');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/super-admin/messaging/organizations/${organization.organizationId}/dlt-templates`, newTemplate);
      setNewTemplate({ name: '', dltTemplateId: '', content: '', dltContentType: 'TRANSACTIONAL' });
      setShowAddTemplate(false);
      loadDltConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!organization || !confirm('Delete this template?')) return;
    try {
      await api.delete(`/super-admin/messaging/organizations/${organization.organizationId}/dlt-templates/${templateId}`);
      loadDltConfig();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete template');
    }
  };

  if (!isOpen || !organization) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">DLT Configuration</h3>
          <p className="text-sm text-slate-600 mb-4">{organization.organizationName}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}

          {loadingConfig ? (
            <div className="py-8 text-center text-slate-500">Loading configuration...</div>
          ) : (
            <>
              {/* Provider Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-3">DLT Provider Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setProviderType('PLATFORM')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      providerType === 'PLATFORM'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium">Platform (MyLeadex)</div>
                    <p className="text-xs text-slate-500 mt-1">Use MyLeadex's DLT registration</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProviderType('CUSTOM')}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      providerType === 'CUSTOM'
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-medium">Custom (Own DLT)</div>
                    <p className="text-xs text-slate-500 mt-1">Customer's own DLT registration</p>
                  </button>
                </div>
              </div>

              {/* Custom DLT Fields */}
              {providerType === 'CUSTOM' && (
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg mb-6">
                  <h4 className="font-medium text-slate-700">Customer's DLT Details</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        PE ID (Entity ID) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={entityId}
                        onChange={(e) => setEntityId(e.target.value)}
                        placeholder="19-digit PE ID"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                      <p className="text-xs text-slate-500 mt-1">From customer's DLT portal</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Sender ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={senderId}
                        onChange={(e) => setSenderId(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="e.g., CUSTBR"
                        maxLength={6}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">DLT Platform</label>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      >
                        <option value="">Select Platform</option>
                        <option value="JIO">Jio</option>
                        <option value="AIRTEL">Airtel</option>
                        <option value="VI">Vi (Vodafone Idea)</option>
                        <option value="BSNL">BSNL</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Telemarketer ID</label>
                      <input
                        type="text"
                        value={teleMarketerId}
                        onChange={(e) => setTeleMarketerId(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Registered Company Name</label>
                      <input
                        type="text"
                        value={registeredName}
                        onChange={(e) => setRegisteredName(e.target.value)}
                        placeholder="As registered on DLT portal"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>
                  </div>

                  {/* DLT Templates */}
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-slate-700">DLT Templates</h4>
                      <button
                        type="button"
                        onClick={() => setShowAddTemplate(!showAddTemplate)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        {showAddTemplate ? 'Cancel' : '+ Add Template'}
                      </button>
                    </div>

                    {showAddTemplate && (
                      <div className="p-3 bg-white rounded border mb-3 space-y-3">
                        <input
                          type="text"
                          value={newTemplate.name}
                          onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                          placeholder="Template Name (e.g., Appointment Reminder)"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        />
                        <input
                          type="text"
                          value={newTemplate.dltTemplateId}
                          onChange={(e) => setNewTemplate({ ...newTemplate, dltTemplateId: e.target.value })}
                          placeholder="DLT Template ID"
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        />
                        <textarea
                          value={newTemplate.content}
                          onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                          placeholder="Template content with {#var#} placeholders"
                          rows={3}
                          className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleAddTemplate}
                          disabled={loading}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add Template
                        </button>
                      </div>
                    )}

                    {templates.length === 0 ? (
                      <p className="text-sm text-slate-500">No templates added yet</p>
                    ) : (
                      <div className="space-y-2">
                        {templates.map((t) => (
                          <div key={t.id} className="p-3 bg-white rounded border flex justify-between items-start">
                            <div>
                              <div className="font-medium text-sm">{t.name}</div>
                              <div className="text-xs text-slate-500">ID: {t.dltTemplateId}</div>
                              <div className="text-xs text-slate-600 mt-1 font-mono">{t.content.slice(0, 50)}...</div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteTemplate(t.id)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={onClose} className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg">
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== VIEW REQUEST DETAILS MODAL ====================

interface ViewRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: SenderIdRequest | null;
  onProcess: () => void;
}

function ViewRequestModal({ isOpen, onClose, request, onProcess }: ViewRequestModalProps) {
  if (!isOpen || !request) return null;

  const statusColors: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700',
    REVIEWING: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-green-100 text-green-700',
    REJECTED: 'bg-red-100 text-red-700',
    CANCELLED: 'bg-slate-100 text-slate-600',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />

      {/* Right Side Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Request Details</h2>
                  <p className="text-sm text-slate-500">{request.organization.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-slate-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-5">
                {/* Status Badge */}
                <div className="flex justify-center">
                  <span className={`px-4 py-1.5 rounded-full text-sm font-medium ${statusColors[request.status]}`}>
                    {request.status}
                  </span>
                </div>

                {/* Requested Sender ID */}
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl text-center border border-indigo-100">
                  <p className="text-xs text-indigo-600 mb-2 uppercase tracking-wide">Requested Sender ID</p>
                  <p className="text-4xl font-mono font-bold text-indigo-700 tracking-widest">{request.requestedSenderId}</p>
                </div>

                {/* Business Information */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4" />
                    Business Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Business Name</span>
                      <span className="font-medium text-slate-700">{request.businessName}</span>
                    </div>
                    {request.businessType && (
                      <div className="flex justify-between py-1 border-b border-slate-100">
                        <span className="text-slate-500">Business Type</span>
                        <span className="font-medium text-slate-700">{request.businessType}</span>
                      </div>
                    )}
                    {request.purpose && (
                      <div className="py-1">
                        <span className="text-slate-500 block mb-1">Purpose</span>
                        <span className="font-medium text-slate-700">{request.purpose}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact Information */}
                <div className="p-4 bg-slate-50 rounded-xl space-y-3">
                  <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                    <IdentificationIcon className="w-4 h-4" />
                    Contact Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Name</span>
                      <span className="font-medium text-slate-700">{request.contactName}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Email</span>
                      <span className="font-medium text-slate-700">{request.contactEmail}</span>
                    </div>
                    {request.contactPhone && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-medium text-slate-700">{request.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* DLT Information */}
                {request.hasOwnDlt && (
                  <div className="p-4 bg-amber-50 rounded-xl space-y-3 border border-amber-100">
                    <h4 className="font-semibold text-amber-700 flex items-center gap-2">
                      <Cog6ToothIcon className="w-4 h-4" />
                      Own DLT Registration
                    </h4>
                    <div className="space-y-2 text-sm">
                      {request.dltEntityId && (
                        <div className="py-1 border-b border-amber-100">
                          <span className="text-amber-600 block mb-1">PE ID (Entity ID)</span>
                          <span className="font-mono text-xs bg-amber-100 px-2 py-1 rounded">{request.dltEntityId}</span>
                        </div>
                      )}
                      {request.dltPlatform && (
                        <div className="flex justify-between py-1">
                          <span className="text-amber-600">DLT Platform</span>
                          <span className="font-medium text-amber-700">{request.dltPlatform}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Processing Information */}
                {(request.assignedSenderId || request.statusReason || request.processedAt) && (
                  <div className="p-4 bg-green-50 rounded-xl space-y-3 border border-green-100">
                    <h4 className="font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4" />
                      Processing Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      {request.assignedSenderId && (
                        <div className="flex justify-between py-1 border-b border-green-100">
                          <span className="text-green-600">Assigned Sender ID</span>
                          <span className="font-mono font-bold text-green-700">{request.assignedSenderId}</span>
                        </div>
                      )}
                      {request.statusReason && (
                        <div className="py-1 border-b border-green-100">
                          <span className="text-green-600 block mb-1">Reason/Notes</span>
                          <span className="text-green-700">{request.statusReason}</span>
                        </div>
                      )}
                      {request.processedAt && (
                        <div className="flex justify-between py-1 border-b border-green-100">
                          <span className="text-green-600">Processed At</span>
                          <span className="text-green-700">{new Date(request.processedAt).toLocaleString()}</span>
                        </div>
                      )}
                      {request.processedBy && (
                        <div className="flex justify-between py-1">
                          <span className="text-green-600">Processed By</span>
                          <span className="text-green-700">{request.processedBy.firstName} {request.processedBy.lastName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="text-xs text-slate-400 text-center py-2">
                  <ClockIcon className="w-3 h-3 inline mr-1" />
                  Submitted on {new Date(request.createdAt).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-slate-50">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Close
                </button>
                {['PENDING', 'REVIEWING'].includes(request.status) && (
                  <button
                    onClick={() => {
                      onClose();
                      onProcess();
                    }}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
                  >
                    Process Request
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SENDER ID REQUEST PROCESSING MODAL ====================

interface ProcessRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: SenderIdRequest | null;
  onSuccess: () => void;
}

function ProcessRequestModal({ isOpen, onClose, request, onSuccess }: ProcessRequestModalProps) {
  const [action, setAction] = useState<'approve' | 'reject'>('approve');
  const [assignedSenderId, setAssignedSenderId] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when request changes
  useEffect(() => {
    if (request) {
      setAssignedSenderId(request.requestedSenderId || '');
      setAction('approve');
      setRejectReason('');
      setNotes('');
      setError(null);
    }
  }, [request]);

  const handleSubmit = async () => {
    console.log('[ProcessRequest] handleSubmit called', { request, action, assignedSenderId });

    if (!request) {
      console.log('[ProcessRequest] No request object');
      return;
    }

    if (action === 'approve' && (!assignedSenderId || assignedSenderId.length !== 6)) {
      setError('Sender ID must be exactly 6 characters');
      return;
    }

    if (action === 'reject' && !rejectReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = action === 'approve'
        ? `/super-admin/messaging/sender-id-requests/${request.id}/approve`
        : `/super-admin/messaging/sender-id-requests/${request.id}/reject`;

      const payload = action === 'approve'
        ? { assignedSenderId: assignedSenderId.toUpperCase(), notes }
        : { reason: rejectReason };

      console.log('[ProcessRequest] Making API call', { url, payload });

      const response = await api.put(url, payload);
      console.log('[ProcessRequest] API response', response);

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('[ProcessRequest] API error', err);
      setError(err.response?.data?.message || `Failed to ${action} request`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-30 transition-opacity" onClick={onClose} />

      {/* Right Side Panel */}
      <div className="fixed inset-y-0 right-0 flex max-w-full">
        <div className="w-screen max-w-md transform transition-transform duration-300 ease-in-out">
          <div className="flex h-full flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-6 py-4 border-b bg-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Process Request</h2>
                  <p className="text-sm text-slate-500">{request.organization.name}</p>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-slate-200 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="space-y-5">
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                {/* Request Summary */}
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <p className="text-xs text-indigo-600 mb-2 uppercase tracking-wide text-center">Requested Sender ID</p>
                  <p className="text-3xl font-mono font-bold text-indigo-700 tracking-widest text-center">{request.requestedSenderId}</p>
                  <div className="mt-3 pt-3 border-t border-indigo-100 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-600">Business</span>
                      <span className="font-medium text-indigo-700">{request.businessName}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-indigo-600">Contact</span>
                      <span className="font-medium text-indigo-700">{request.contactName}</span>
                    </div>
                    {request.hasOwnDlt && (
                      <div className="flex justify-between text-sm pt-2 border-t border-indigo-100 mt-2">
                        <span className="text-amber-600 font-medium">Has Own DLT</span>
                        <span className="text-amber-700">{request.dltPlatform || 'Yes'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Select Action</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setAction('approve')}
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        action === 'approve'
                          ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <CheckCircleIcon className="w-8 h-8" />
                      <span className="font-semibold">Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAction('reject')}
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                        action === 'reject'
                          ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <XCircleIcon className="w-8 h-8" />
                      <span className="font-semibold">Reject</span>
                    </button>
                  </div>
                </div>

                {/* Approve Form */}
                {action === 'approve' && (
                  <div className="p-4 bg-green-50 rounded-xl border border-green-100 space-y-4">
                    <h4 className="font-semibold text-green-700 flex items-center gap-2">
                      <CheckCircleIcon className="w-5 h-5" />
                      Approval Details
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">
                        Assigned Sender ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={assignedSenderId}
                        onChange={(e) => setAssignedSenderId(e.target.value.toUpperCase().slice(0, 6))}
                        placeholder="XXXXXX"
                        maxLength={6}
                        className="w-full px-4 py-3 border-2 border-green-200 rounded-lg uppercase font-mono text-2xl tracking-widest text-center focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                      />
                      <p className="text-xs text-green-600 mt-2">
                        Must be registered on JIO DLT portal. Use requested ID or assign a different one.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-green-700 mb-2">Notes (optional)</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes for this approval..."
                        rows={3}
                        className="w-full px-3 py-2 border border-green-200 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Reject Form */}
                {action === 'reject' && (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 space-y-4">
                    <h4 className="font-semibold text-red-700 flex items-center gap-2">
                      <XCircleIcon className="w-5 h-5" />
                      Rejection Details
                    </h4>
                    <div>
                      <label className="block text-sm font-medium text-red-700 mb-2">
                        Rejection Reason <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why this request is being rejected..."
                        rows={4}
                        className="w-full px-3 py-2 border border-red-200 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
                      />
                      <p className="text-xs text-red-600 mt-2">
                        This reason will be visible to the requester.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-6 py-4 border-t bg-slate-50">
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 ${
                    action === 'approve'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {loading ? 'Processing...' : action === 'approve' ? 'Approve Request' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagingManagementPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'requests' | 'pricing' | 'analytics'>('overview');
  const [stats, setStats] = useState<MessagingStats | null>(null);
  const [organizations, setOrganizations] = useState<OrgBalance[]>([]);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrgBalance | null>(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [senderIdModalOpen, setSenderIdModalOpen] = useState(false);
  const [dltConfigModalOpen, setDltConfigModalOpen] = useState(false);

  // Sender ID Requests state
  const [senderIdRequests, setSenderIdRequests] = useState<SenderIdRequest[]>([]);
  const [requestCounts, setRequestCounts] = useState({ PENDING: 0, REVIEWING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<SenderIdRequest | null>(null);
  const [processRequestModalOpen, setProcessRequestModalOpen] = useState(false);
  const [viewRequestModalOpen, setViewRequestModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch stats, organizations, pricing, and sender ID requests in parallel
      const [statsRes, orgsRes, pricingRes, requestsRes] = await Promise.all([
        api.get('/super-admin/messaging/stats').catch(() => ({ data: { data: null } })),
        api.get('/super-admin/messaging/organizations').catch(() => ({ data: { data: [] } })),
        api.get('/super-admin/messaging/pricing').catch(() => ({ data: { data: null } })),
        api.get('/super-admin/messaging/sender-id-requests').catch(() => ({ data: { data: [], counts: {} } })),
      ]);

      setStats(statsRes.data.data || {
        totalSmsCredits: 0,
        totalWhatsappCredits: 0,
        totalRcsCredits: 0,
        totalOrganizations: 0,
        totalMessagesSent: 0,
        totalRevenue: 0,
        todayMessagesSent: 0,
        todayRevenue: 0,
      });
      setOrganizations(orgsRes.data.data || []);
      setPricing(pricingRes.data.data);
      setSenderIdRequests(requestsRes.data.data || []);
      setRequestCounts(requestsRes.data.counts || { PENDING: 0, REVIEWING: 0, APPROVED: 0, REJECTED: 0, CANCELLED: 0 });
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSavePricing = async () => {
    if (!pricing) return;
    try {
      await api.put('/super-admin/messaging/pricing', pricing);
      alert('Pricing saved successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save pricing');
    }
  };

  const filteredOrganizations = organizations.filter(
    (org) => org.organizationName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-64"></div>
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Messaging Management</h1>
        <p className="text-slate-600">Manage credits, pricing, and view messaging analytics</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-4">
          {[
            { id: 'overview', label: 'Overview', icon: ChartBarIcon, badge: 0 },
            { id: 'organizations', label: 'Organizations', icon: BuildingOfficeIcon, badge: 0 },
            { id: 'requests', label: 'Requests', icon: InboxIcon, badge: requestCounts.PENDING },
            { id: 'pricing', label: 'Pricing', icon: CurrencyRupeeIcon, badge: 0 },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon, badge: 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ChatBubbleLeftIcon className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-slate-600">Total SMS Credits</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalSmsCredits.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-sm font-medium text-slate-600">Total WhatsApp Credits</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalWhatsappCredits.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <SparklesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <span className="text-sm font-medium text-slate-600">Total RCS Credits</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalRcsCredits.toLocaleString()}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <CurrencyRupeeIcon className="w-5 h-5 text-amber-600" />
                </div>
                <span className="text-sm font-medium text-slate-600">Total Revenue</span>
              </div>
              <p className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Today's Activity</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-slate-600">Messages Sent</p>
                <p className="text-3xl font-bold">{stats.todayMessagesSent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-slate-600">Revenue</p>
                <p className="text-3xl font-bold text-green-600">₹{stats.todayRevenue.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Organizations Tab */}
      {activeTab === 'organizations' && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Sender ID</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Channels</th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">SMS</th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">WhatsApp</th>
                <th className="text-right py-3 px-4 font-medium text-slate-700">RCS</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No organizations found
                  </td>
                </tr>
              ) : (
                filteredOrganizations.map((org) => (
                  <tr key={org.organizationId} className="border-b hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">{org.organizationName}</div>
                      <div className="text-xs text-slate-500">{org.slug}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1">
                        {org.smsProviderType === 'CUSTOM' ? (
                          <>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium w-fit">
                              Own DLT
                            </span>
                            {org.customDltSenderId && (
                              <span className="text-xs font-mono text-slate-600">{org.customDltSenderId}</span>
                            )}
                          </>
                        ) : org.smsSenderId ? (
                          <>
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium w-fit">
                              White-Label
                            </span>
                            <span className="text-xs font-mono text-slate-600">{org.smsSenderId}</span>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">Platform Default</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        {org.smsEnabled && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">SMS</span>
                        )}
                        {org.whatsappEnabled && (
                          <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">WA</span>
                        )}
                        {org.rcsEnabled && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">RCS</span>
                        )}
                        {!org.smsEnabled && !org.whatsappEnabled && !org.rcsEnabled && (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-blue-600">{org.smsCredits.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-green-600">{org.whatsappCredits.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-purple-600">{org.rcsCredits.toLocaleString()}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setDltConfigModalOpen(true);
                          }}
                          className="px-2 py-1 text-sm text-amber-600 hover:bg-amber-50 rounded"
                          title="DLT Configuration"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setSenderIdModalOpen(true);
                          }}
                          className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                          title="Edit Sender ID & Settings"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOrg(org);
                            setAdjustModalOpen(true);
                          }}
                          className="px-2 py-1 text-sm text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Adjust Credits"
                        >
                          <AdjustmentsHorizontalIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Requests Tab */}
      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Status Filter Tabs */}
          <div className="p-4 border-b flex items-center gap-2 flex-wrap">
            {[
              { id: 'ALL', label: 'All', count: Object.values(requestCounts).reduce((a, b) => a + b, 0) },
              { id: 'PENDING', label: 'Pending', count: requestCounts.PENDING, color: 'amber' },
              { id: 'REVIEWING', label: 'Reviewing', count: requestCounts.REVIEWING, color: 'blue' },
              { id: 'APPROVED', label: 'Approved', count: requestCounts.APPROVED, color: 'green' },
              { id: 'REJECTED', label: 'Rejected', count: requestCounts.REJECTED, color: 'red' },
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setRequestStatusFilter(filter.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  requestStatusFilter === filter.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
                <span className="ml-1.5 text-xs opacity-75">({filter.count})</span>
              </button>
            ))}
          </div>

          {/* Requests Table */}
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Organization</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Requested ID</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Business</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">DLT Type</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Submitted</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {senderIdRequests
                .filter((r) => requestStatusFilter === 'ALL' || r.status === requestStatusFilter)
                .length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No sender ID requests found
                  </td>
                </tr>
              ) : (
                senderIdRequests
                  .filter((r) => requestStatusFilter === 'ALL' || r.status === requestStatusFilter)
                  .map((request) => (
                    <tr key={request.id} className="border-b hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-medium">{request.organization.name}</div>
                        <div className="text-xs text-slate-500">{request.organization.slug}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-indigo-600">{request.requestedSenderId}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-sm">{request.businessName}</div>
                        {request.businessType && (
                          <div className="text-xs text-slate-500">{request.businessType}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {request.hasOwnDlt ? (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                            Own DLT
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            Platform
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-700'
                              : request.status === 'REVIEWING'
                              ? 'bg-blue-100 text-blue-700'
                              : request.status === 'APPROVED'
                              ? 'bg-green-100 text-green-700'
                              : request.status === 'REJECTED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {request.status}
                        </span>
                        {request.assignedSenderId && (
                          <div className="text-xs text-green-600 mt-1">
                            Assigned: {request.assignedSenderId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(request.createdAt).toLocaleDateString()}
                        <div className="text-xs text-slate-400">
                          {new Date(request.createdAt).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          {['PENDING', 'REVIEWING'].includes(request.status) && (
                            <button
                              onClick={() => {
                                setSelectedRequest(request);
                                setProcessRequestModalOpen(true);
                              }}
                              className="px-2 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              title="Process Request"
                            >
                              Process
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setViewRequestModalOpen(true);
                            }}
                            className="px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded"
                            title="View Details"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pricing Tab */}
      {activeTab === 'pricing' && pricing && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Default Pricing Configuration</h2>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">SMS Price (per message)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.smsPrice}
                  onChange={(e) => setPricing({ ...pricing, smsPrice: Number(e.target.value) })}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">WhatsApp Price (per message)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.whatsappPrice}
                  onChange={(e) => setPricing({ ...pricing, whatsappPrice: Number(e.target.value) })}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">RCS Price (per message)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                <input
                  type="number"
                  step="0.01"
                  value={pricing.rcsPrice}
                  onChange={(e) => setPricing({ ...pricing, rcsPrice: Number(e.target.value) })}
                  className="w-full pl-8 pr-4 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">Minimum Purchase Quantity</label>
            <input
              type="number"
              value={pricing.minPurchase}
              onChange={(e) => setPricing({ ...pricing, minPurchase: Number(e.target.value) })}
              className="w-32 px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePricing}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Save Pricing
            </button>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold mb-4">Messaging Analytics</h2>
          <p className="text-slate-500">Coming soon - Detailed analytics and reports</p>
          {/* Add charts and analytics here */}
        </div>
      )}

      {/* Adjust Credits Modal */}
      <AdjustCreditsModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        organization={selectedOrg}
        onSuccess={() => {
          setAdjustModalOpen(false);
          fetchData();
        }}
      />

      {/* Edit Sender ID Modal */}
      <EditSenderIdModal
        isOpen={senderIdModalOpen}
        onClose={() => setSenderIdModalOpen(false)}
        organization={selectedOrg}
        onSuccess={() => {
          setSenderIdModalOpen(false);
          fetchData();
        }}
      />

      {/* DLT Configuration Modal */}
      <DltConfigModal
        isOpen={dltConfigModalOpen}
        onClose={() => setDltConfigModalOpen(false)}
        organization={selectedOrg}
        onSuccess={() => {
          setDltConfigModalOpen(false);
          fetchData();
        }}
      />

      {/* Process Sender ID Request Modal */}
      <ProcessRequestModal
        isOpen={processRequestModalOpen}
        onClose={() => setProcessRequestModalOpen(false)}
        request={selectedRequest}
        onSuccess={() => {
          setProcessRequestModalOpen(false);
          fetchData();
        }}
      />

      {/* View Request Details Modal */}
      <ViewRequestModal
        isOpen={viewRequestModalOpen}
        onClose={() => setViewRequestModalOpen(false)}
        request={selectedRequest}
        onProcess={() => setProcessRequestModalOpen(true)}
      />
    </div>
  );
}
