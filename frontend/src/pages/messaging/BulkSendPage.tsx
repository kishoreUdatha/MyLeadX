/**
 * Bulk Send Page
 * Create and send bulk messaging campaigns
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChatBubbleLeftIcon,
  DevicePhoneMobileIcon,
  SparklesIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  messagingCreditsApi,
  bulkMessagingApi,
  contactsApi,
  templatesApi,
  MessageBalance,
  MessageChannel,
  BulkRecipientSource,
  MessagingContactGroup,
  MessageTemplate,
} from '../../services/messaging.service';

type Step = 'channel' | 'recipients' | 'message' | 'schedule' | 'confirm';

interface CampaignData {
  channel: MessageChannel;
  name: string;
  recipientSource: BulkRecipientSource;
  recipientListId?: string;
  phoneNumbers?: string[];
  templateId?: string;
  message: string;
  mediaUrl?: string;
  scheduledAt?: string;
  variables: string[];
}

export default function BulkSendPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('channel');
  const [balance, setBalance] = useState<MessageBalance | null>(null);
  const [groups, setGroups] = useState<MessagingContactGroup[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [campaign, setCampaign] = useState<CampaignData>({
    channel: 'SMS',
    name: '',
    recipientSource: 'LIST',
    message: '',
    variables: [],
  });

  const [recipientCount, setRecipientCount] = useState(0);
  const [csvContent, setCsvContent] = useState('');
  const [manualNumbers, setManualNumbers] = useState('');

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [balanceData, groupsData] = await Promise.all([
          messagingCreditsApi.getBalance(),
          contactsApi.listGroups(),
        ]);
        setBalance(balanceData);
        setGroups(groupsData);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch templates when channel changes
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templateChannel = campaign.channel === 'SMS' ? 'SMS' : campaign.channel === 'WHATSAPP' ? 'WHATSAPP' : undefined;
        if (templateChannel) {
          const data = await templatesApi.listTemplates(templateChannel);
          setTemplates(data);
        }
      } catch (err) {
        console.error('Failed to fetch templates:', err);
      }
    };
    fetchTemplates();
  }, [campaign.channel]);

  // Update recipient count when source changes
  useEffect(() => {
    if (campaign.recipientSource === 'LIST' && campaign.recipientListId) {
      const group = groups.find((g) => g.id === campaign.recipientListId);
      setRecipientCount(group?.contactCount || 0);
    } else if (campaign.recipientSource === 'MANUAL') {
      const numbers = manualNumbers.split(/[\n,]/).filter((n) => n.trim());
      setRecipientCount(numbers.length);
    } else if (campaign.recipientSource === 'CSV') {
      const lines = csvContent.split('\n').filter((l) => l.trim());
      setRecipientCount(Math.max(0, lines.length - 1)); // Exclude header
    }
  }, [campaign.recipientSource, campaign.recipientListId, manualNumbers, csvContent, groups]);

  const getChannelCredits = () => {
    switch (campaign.channel) {
      case 'SMS': return balance?.smsCredits || 0;
      case 'WHATSAPP': return balance?.whatsappCredits || 0;
      case 'RCS': return balance?.rcsCredits || 0;
    }
  };

  const steps: { id: Step; title: string; description: string }[] = [
    { id: 'channel', title: 'Choose Channel', description: 'Select messaging channel' },
    { id: 'recipients', title: 'Select Recipients', description: 'Choose who to send to' },
    { id: 'message', title: 'Compose Message', description: 'Write your message' },
    { id: 'schedule', title: 'Schedule', description: 'Send now or later' },
    { id: 'confirm', title: 'Confirm', description: 'Review and send' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === step);

  const goNext = () => {
    const idx = currentStepIndex;
    if (idx < steps.length - 1) {
      setStep(steps[idx + 1].id);
    }
  };

  const goBack = () => {
    const idx = currentStepIndex;
    if (idx > 0) {
      setStep(steps[idx - 1].id);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      // Prepare phone numbers for CSV/MANUAL source
      let phoneNumbers: string[] | undefined;
      if (campaign.recipientSource === 'MANUAL') {
        phoneNumbers = manualNumbers.split(/[\n,]/).map((n) => n.trim()).filter(Boolean);
      } else if (campaign.recipientSource === 'CSV') {
        const lines = csvContent.split('\n').slice(1).map((l) => l.trim()).filter(Boolean);
        phoneNumbers = lines.map((l) => l.split(',')[0].trim());
      }

      await bulkMessagingApi.createJob({
        channel: campaign.channel,
        name: campaign.name || `${campaign.channel} Campaign - ${new Date().toLocaleDateString()}`,
        templateId: campaign.templateId,
        message: campaign.message,
        mediaUrl: campaign.mediaUrl,
        recipientSource: campaign.recipientSource,
        recipientListId: campaign.recipientListId,
        phoneNumbers,
        scheduledAt: campaign.scheduledAt,
        startImmediately: !campaign.scheduledAt,
        variables: campaign.variables,
      });

      navigate('/messaging/history');
    } catch (err: any) {
      setError(err.message || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-48"></div>
          <div className="h-64 bg-slate-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Send Bulk Messages</h1>
        <p className="text-slate-600">Create and send campaigns to your contacts</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, idx) => (
            <div key={s.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                idx <= currentStepIndex ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                {idx < currentStepIndex ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              {idx < steps.length - 1 && (
                <div className={`w-24 h-1 mx-2 ${
                  idx < currentStepIndex ? 'bg-indigo-600' : 'bg-slate-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s) => (
            <div key={s.id} className="text-center w-24">
              <p className="text-xs font-medium text-slate-700">{s.title}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mb-6">
        {/* Step 1: Choose Channel */}
        {step === 'channel' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Choose Messaging Channel</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { id: 'SMS' as MessageChannel, name: 'SMS', icon: ChatBubbleLeftIcon, color: 'blue', credits: balance?.smsCredits || 0 },
                { id: 'WHATSAPP' as MessageChannel, name: 'WhatsApp', icon: DevicePhoneMobileIcon, color: 'green', credits: balance?.whatsappCredits || 0 },
                { id: 'RCS' as MessageChannel, name: 'RCS', icon: SparklesIcon, color: 'purple', credits: balance?.rcsCredits || 0 },
              ].map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setCampaign({ ...campaign, channel: ch.id })}
                  className={`p-6 border-2 rounded-lg text-left transition-all ${
                    campaign.channel === ch.id
                      ? `border-${ch.color}-500 bg-${ch.color}-50`
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <ch.icon className={`w-8 h-8 mb-3 text-${ch.color}-600`} />
                  <h3 className="font-semibold text-slate-900">{ch.name}</h3>
                  <p className="text-sm text-slate-500 mt-1">{ch.credits.toLocaleString()} credits available</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Select Recipients */}
        {step === 'recipients' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Select Recipients</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Name (optional)</label>
              <input
                type="text"
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                placeholder={`${campaign.channel} Campaign - ${new Date().toLocaleDateString()}`}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Recipient Source</label>
              <select
                value={campaign.recipientSource}
                onChange={(e) => setCampaign({ ...campaign, recipientSource: e.target.value as BulkRecipientSource })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="LIST">Contact Group</option>
                <option value="MANUAL">Enter Numbers Manually</option>
                <option value="CSV">Paste from CSV</option>
              </select>
            </div>

            {campaign.recipientSource === 'LIST' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Group</label>
                <select
                  value={campaign.recipientListId || ''}
                  onChange={(e) => setCampaign({ ...campaign, recipientListId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select a group...</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.contactCount} contacts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {campaign.recipientSource === 'MANUAL' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone Numbers</label>
                <textarea
                  value={manualNumbers}
                  onChange={(e) => setManualNumbers(e.target.value)}
                  placeholder="Enter phone numbers (one per line or comma-separated)&#10;e.g., 9876543210&#10;9876543211, 9876543212"
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {campaign.recipientSource === 'CSV' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">CSV Content</label>
                <textarea
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  placeholder="phone,name,email&#10;9876543210,John,john@example.com&#10;9876543211,Jane,jane@example.com"
                  rows={6}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
              </div>
            )}

            {recipientCount > 0 && (
              <div className="mt-4 p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                  <span className="font-medium text-indigo-900">{recipientCount.toLocaleString()} recipients selected</span>
                </div>
                {recipientCount > getChannelCredits() && (
                  <p className="text-sm text-red-600 mt-2">
                    Insufficient credits. You need {recipientCount - getChannelCredits()} more {campaign.channel} credits.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Compose Message */}
        {step === 'message' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Compose Message</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Use Template (optional)</label>
              <select
                value={campaign.templateId || ''}
                onChange={(e) => {
                  const template = templates.find((t) => t.id === e.target.value);
                  setCampaign({
                    ...campaign,
                    templateId: e.target.value || undefined,
                    message: template?.content || campaign.message,
                    variables: template?.variables || [],
                  });
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Write custom message</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Message Content</label>
              <textarea
                value={campaign.message}
                onChange={(e) => setCampaign({ ...campaign, message: e.target.value })}
                placeholder="Type your message here. Use {{name}} for personalization."
                rows={6}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <p className="text-sm text-slate-500 mt-1">{campaign.message.length}/1600 characters</p>
            </div>

            {(campaign.channel === 'WHATSAPP' || campaign.channel === 'RCS') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Media URL (optional)</label>
                <input
                  type="url"
                  value={campaign.mediaUrl || ''}
                  onChange={(e) => setCampaign({ ...campaign, mediaUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}

            {/* Preview */}
            <div className="mt-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Preview</h3>
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="whitespace-pre-wrap">{campaign.message || 'Your message will appear here...'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Schedule */}
        {step === 'schedule' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Schedule Campaign</h2>

            <div className="space-y-4">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  checked={!campaign.scheduledAt}
                  onChange={() => setCampaign({ ...campaign, scheduledAt: undefined })}
                  className="w-4 h-4 text-indigo-600"
                />
                <div className="ml-3">
                  <span className="font-medium">Send Now</span>
                  <p className="text-sm text-slate-500">Start sending immediately</p>
                </div>
              </label>

              <label className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="radio"
                  checked={!!campaign.scheduledAt}
                  onChange={() => setCampaign({ ...campaign, scheduledAt: new Date().toISOString().slice(0, 16) })}
                  className="w-4 h-4 text-indigo-600 mt-1"
                />
                <div className="ml-3 flex-1">
                  <span className="font-medium">Schedule for Later</span>
                  <p className="text-sm text-slate-500 mb-2">Choose a specific date and time</p>
                  {campaign.scheduledAt && (
                    <input
                      type="datetime-local"
                      value={campaign.scheduledAt}
                      onChange={(e) => setCampaign({ ...campaign, scheduledAt: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 5: Confirm */}
        {step === 'confirm' && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Review Campaign</h2>

            <div className="space-y-4">
              <div className="flex justify-between py-3 border-b">
                <span className="text-slate-600">Channel</span>
                <span className="font-medium">{campaign.channel}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-slate-600">Recipients</span>
                <span className="font-medium">{recipientCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-slate-600">Credits Required</span>
                <span className="font-medium">{recipientCount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-3 border-b">
                <span className="text-slate-600">Schedule</span>
                <span className="font-medium">
                  {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Send Now'}
                </span>
              </div>

              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <h3 className="text-sm font-medium text-slate-700 mb-2">Message Preview</h3>
                <p className="whitespace-pre-wrap">{campaign.message}</p>
              </div>

              {recipientCount > getChannelCredits() && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  Insufficient credits. You need {recipientCount - getChannelCredits()} more {campaign.channel} credits.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={goBack}
          disabled={currentStepIndex === 0}
          className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back
        </button>

        {step === 'confirm' ? (
          <button
            onClick={handleSubmit}
            disabled={submitting || recipientCount === 0 || recipientCount > getChannelCredits() || !campaign.message}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? 'Sending...' : 'Send Campaign'}
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={goNext}
            disabled={
              (step === 'recipients' && recipientCount === 0) ||
              (step === 'message' && !campaign.message)
            }
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
