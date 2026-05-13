/**
 * Quick Send Page
 * Send a single message to one recipient without creating a campaign
 */
import { useState, useEffect } from 'react';
import {
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
  UserIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { messagingPortalApi, templatesApi, MessageTemplate, MessageChannel } from '../../services/messaging.service';

interface OrganizationSenderId {
  id: string;
  senderId: string;
  name: string;
  smsType: 'TRANSACTIONAL' | 'PROMOTIONAL';
  isDefault: boolean;
  isActive: boolean;
}

interface QuickSendHistory {
  id: string;
  phone: string;
  name?: string;
  message: string;
  channel: MessageChannel;
  status: string;
  sentAt?: string;
  createdAt: string;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function QuickSendPage() {
  const [channel, setChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [phone, setPhone] = useState('');
  const [contactName, setContactName] = useState('');
  const [message, setMessage] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [balance, setBalance] = useState({ smsCredits: 0, whatsappCredits: 0 });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [history, setHistory] = useState<QuickSendHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Sender ID selection
  const [senderIds, setSenderIds] = useState<OrganizationSenderId[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState('');

  useEffect(() => {
    loadData();
    loadSenderIds();
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [channel]);

  const loadData = async () => {
    try {
      const [balanceData, historyData] = await Promise.all([
        messagingPortalApi.getBalance(),
        loadHistory(),
      ]);
      setBalance(balanceData);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await templatesApi.listTemplates(channel);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadSenderIds = async () => {
    try {
      const response = await api.get('/messaging-portal/settings/sender-ids');
      const ids = response.data.filter((s: OrganizationSenderId) => s.isActive);
      setSenderIds(ids);
      // Auto-select default sender ID
      const defaultId = ids.find((s: OrganizationSenderId) => s.isDefault);
      if (defaultId) {
        setSelectedSenderId(defaultId.id);
      } else if (ids.length > 0) {
        setSelectedSenderId(ids[0].id);
      }
    } catch (error) {
      console.error('Failed to load sender IDs:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await messagingPortalApi.getQuickSendHistory(1, 10, channel);
      setHistory(data.messages);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleTemplateSelect = (id: string) => {
    setTemplateId(id);
    const template = templates.find(t => t.id === id);
    if (template) {
      setMessage(template.content);
    }
  };

  const handleSend = async () => {
    if (!phone.trim()) {
      setResult({ success: false, message: 'Please enter a phone number' });
      return;
    }
    if (!message.trim()) {
      setResult({ success: false, message: 'Please enter a message' });
      return;
    }

    const currentBalance = channel === 'SMS' ? balance.smsCredits : balance.whatsappCredits;
    if (currentBalance < 1) {
      setResult({ success: false, message: `Insufficient ${channel} credits. Please purchase more credits.` });
      return;
    }

    try {
      setSending(true);
      setResult(null);

      const selectedSender = senderIds.find(s => s.id === selectedSenderId);
      const response = await messagingPortalApi.quickSend({
        channel,
        phone: phone.trim(),
        message: message.trim(),
        templateId: templateId || undefined,
        contactName: contactName.trim() || undefined,
        senderId: selectedSender?.senderId || undefined,
      });

      setResult({ success: true, message: 'Message sent successfully!' });

      // Update balance
      setBalance(prev => ({
        ...prev,
        [channel === 'SMS' ? 'smsCredits' : 'whatsappCredits']:
          prev[channel === 'SMS' ? 'smsCredits' : 'whatsappCredits'] - 1,
      }));

      // Clear form
      setPhone('');
      setContactName('');
      setMessage('');
      setTemplateId('');

      // Reload history
      loadHistory();
    } catch (error: any) {
      setResult({
        success: false,
        message: error.response?.data?.message || error.message || 'Failed to send message'
      });
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">Delivered</span>;
      case 'SENT':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700">Sent</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">Failed</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const currentCredits = channel === 'SMS' ? balance.smsCredits : balance.whatsappCredits;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Quick Send</h1>
        <p className="text-slate-600">Send a single message to one recipient</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Send Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            {/* Channel Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Channel</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setChannel('SMS')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    channel === 'SMS'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ChatBubbleLeftRightIcon className="w-5 h-5" />
                  <span className="font-medium">SMS</span>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                    {balance.smsCredits} credits
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setChannel('WHATSAPP')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                    channel === 'WHATSAPP'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <WhatsAppIcon className="w-5 h-5" />
                  <span className="font-medium">WhatsApp</span>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                    {balance.whatsappCredits} credits
                  </span>
                </button>
              </div>
            </div>

            {/* Sender ID Selection (SMS only) */}
            {channel === 'SMS' && senderIds.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sender ID
                </label>
                <select
                  value={selectedSenderId}
                  onChange={(e) => setSelectedSenderId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {senderIds.map((sid) => (
                    <option key={sid.id} value={sid.id}>
                      {sid.senderId} - {sid.name} ({sid.smsType})
                      {sid.isDefault && ' ★'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Select which sender ID to use for this message
                </p>
              </div>
            )}

            {/* Phone Number */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <DevicePhoneMobileIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number (e.g., 9876543210)"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">Enter 10-digit mobile number (country code will be added automatically)</p>
            </div>

            {/* Contact Name (Optional) */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contact Name <span className="text-slate-400">(Optional)</span>
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Enter contact name for reference"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Template Selection (Optional) */}
            {templates.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Use Template <span className="text-slate-400">(Optional)</span>
                </label>
                <div className="relative">
                  <DocumentTextIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <select
                    value={templateId}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none"
                  >
                    <option value="">Select a template (optional)</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Message */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={4}
                maxLength={1600}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <p className="text-xs text-slate-500">
                  {channel === 'SMS' && 'DLT template required for India. Use approved templates.'}
                </p>
                <p className="text-xs text-slate-500">{message.length}/1600</p>
              </div>
            </div>

            {/* Result Message */}
            {result && (
              <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
                result.success
                  ? 'bg-green-50 border border-green-200 text-green-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {result.success ? (
                  <CheckCircleIcon className="w-5 h-5 flex-shrink-0" />
                ) : (
                  <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                )}
                <span>{result.message}</span>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={sending || currentCredits < 1}
              className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                channel === 'SMS'
                  ? 'bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-300'
                  : 'bg-green-600 hover:bg-green-700 text-white disabled:bg-green-300'
              } disabled:cursor-not-allowed`}
            >
              {sending ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <PaperAirplaneIcon className="w-5 h-5" />
                  <span>Send Message</span>
                  <span className="text-sm opacity-75">(1 credit)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent History */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Recent Messages</h3>
              <button
                onClick={loadHistory}
                disabled={loadingHistory}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                Refresh
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-8 text-slate-500">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No messages sent yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((msg) => (
                  <div key={msg.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {msg.channel === 'SMS' ? (
                          <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
                        ) : (
                          <WhatsAppIcon className="w-4 h-4 text-green-600" />
                        )}
                        <span className="font-medium text-sm text-slate-900">
                          {msg.name || msg.phone}
                        </span>
                      </div>
                      {getStatusBadge(msg.status)}
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-2 mb-1">{msg.message}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(msg.sentAt || msg.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
