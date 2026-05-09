import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  UsersIcon,
  FolderIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  ClockIcon,
  PaperAirplaneIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  bulkMessagingApi,
  contactsApi,
  templatesApi,
  messagingCreditsApi,
  MessagingContactGroup,
  MessageTemplate,
  MessageBalance,
} from '../../services/messaging.service';

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

type Channel = 'sms' | 'whatsapp' | 'rcs';
type RecipientSource = 'group' | 'all' | 'csv';

interface CampaignData {
  channel: Channel;
  recipientSource: RecipientSource;
  groupId: string;
  phoneNumbers: string[];
  templateId: string;
  customMessage: string;
  mediaUrl: string;
  scheduleAt: string;
  sendNow: boolean;
}

interface CsvRecipient {
  phone: string;
  variables: Record<string, string>;
}

const CreateCampaignPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState<MessageBalance | null>(null);
  const [groups, setGroups] = useState<MessagingContactGroup[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [recipientCount, setRecipientCount] = useState(0);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPhones, setCsvPhones] = useState<string[]>([]);
  const [csvRecipients, setCsvRecipients] = useState<CsvRecipient[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  const [campaignData, setCampaignData] = useState<CampaignData>({
    channel: 'sms',
    recipientSource: 'group',
    groupId: '',
    phoneNumbers: [],
    templateId: '',
    customMessage: '',
    mediaUrl: '',
    scheduleAt: '',
    sendNow: true,
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (campaignData.recipientSource === 'group' && campaignData.groupId) {
      const group = groups.find((g) => g.id === campaignData.groupId);
      setRecipientCount(group?.contactCount || 0);
    } else if (campaignData.recipientSource === 'csv') {
      setRecipientCount(csvPhones.length);
    } else if (campaignData.recipientSource === 'all') {
      loadAllContactsCount();
    }
  }, [campaignData.recipientSource, campaignData.groupId, csvPhones, groups]);

  const loadInitialData = async () => {
    try {
      const [balanceData, groupsData, templatesData] = await Promise.all([
        messagingCreditsApi.getBalance(),
        contactsApi.listGroups(),
        templatesApi.listTemplates(),
      ]);
      console.log('[CreateCampaign] Balance loaded:', balanceData);
      setBalance(balanceData);
      setGroups(groupsData || []);
      setTemplates(templatesData || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const loadAllContactsCount = async () => {
    try {
      const response = await contactsApi.listContacts(1, 1);
      setRecipientCount(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load contacts count:', error);
    }
  };

  // Helper to parse CSV line (handles quoted values with commas)
  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    const reader = new FileReader();

    reader.onerror = () => {
      console.error('[CSV] Failed to read file');
      alert('Failed to read CSV file');
    };

    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        // Handle both \r\n and \n line endings
        const lines = text.split(/\r?\n/).filter((line) => line.trim());

        console.log('[CSV] Total lines:', lines.length);
        console.log('[CSV] Header:', lines[0]);

        if (lines.length < 2) {
          setCsvPhones([]);
          setCsvRecipients([]);
          setCsvHeaders([]);
          alert('CSV must have at least a header row and one data row');
          return;
        }

        // Parse header - keep original case for variable names
        const headerRaw = parseCsvLine(lines[0]);
        const header = headerRaw.map(h => h.toLowerCase());
        setCsvHeaders(headerRaw);
        console.log('[CSV] Parsed headers:', headerRaw);

        let phoneColumnIndex = header.findIndex(h =>
          h.includes('phone') || h.includes('mobile') || h.includes('contact') ||
          h.includes('number') || h.includes('cell') || h.includes('whatsapp')
        );

        console.log('[CSV] Phone column index:', phoneColumnIndex);

        // If no phone column found, scan all columns for phone-like data
        if (phoneColumnIndex === -1) {
          const firstDataRow = parseCsvLine(lines[1]);
          phoneColumnIndex = firstDataRow.findIndex(val => {
            const cleaned = val.replace(/[\s\-\(\)\.+]/g, '');
            return cleaned.match(/^[0-9]{10,15}$/);
          });
          console.log('[CSV] Auto-detected phone column:', phoneColumnIndex);
        }

        if (phoneColumnIndex === -1) phoneColumnIndex = 0;

        const phones: string[] = [];
        const recipients: CsvRecipient[] = [];

        lines.slice(1).forEach((line, idx) => {
          const columns = parseCsvLine(line);
          const rawPhone = columns[phoneColumnIndex] || '';

          // Clean phone number
          let cleanPhone = rawPhone.replace(/[^\d+]/g, '');
          const hasPlus = cleanPhone.startsWith('+');
          cleanPhone = cleanPhone.replace(/^\+/, '');

          // Accept 10-15 digit numbers
          if (cleanPhone && cleanPhone.match(/^[0-9]{10,15}$/)) {
            const finalPhone = hasPlus ? '+' + cleanPhone : cleanPhone;
            phones.push(finalPhone);

            // Extract all columns as variables
            const variables: Record<string, string> = {};
            headerRaw.forEach((colName, colIdx) => {
              if (colIdx !== phoneColumnIndex && columns[colIdx]) {
                variables[colName.toLowerCase()] = columns[colIdx];
              }
            });

            recipients.push({ phone: finalPhone, variables });

            if (idx < 3) {
              console.log(`[CSV] Row ${idx + 1}: phone="${finalPhone}", variables=`, variables);
            }
          }
        });

        console.log('[CSV] Total valid phones found:', phones.length);
        console.log('[CSV] Variables available:', headerRaw.filter((_, i) => i !== phoneColumnIndex));
        if (recipients.length > 0) {
          console.log('[CSV] Sample recipient:', recipients[0]);
        }

        setCsvPhones(phones);
        setCsvRecipients(recipients);

        if (phones.length === 0) {
          alert('No valid phone numbers found in CSV. Make sure you have a column with 10-15 digit phone numbers.');
        }
      } catch (error) {
        console.error('[CSV] Parse error:', error);
        alert('Failed to parse CSV file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };

  const getAvailableCredits = () => {
    if (!balance) return 0;
    switch (campaignData.channel) {
      case 'sms':
        return balance.smsCredits;
      case 'whatsapp':
        return balance.whatsappCredits;
      case 'rcs':
        return balance.rcsCredits;
      default:
        return 0;
    }
  };

  const hasEnoughCredits = () => {
    return getAvailableCredits() >= recipientCount;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        channel: campaignData.channel.toUpperCase(), // Backend expects uppercase
        message: campaignData.templateId
          ? templates.find((t) => t.id === campaignData.templateId)?.content
          : campaignData.customMessage,
        templateId: campaignData.templateId || undefined,
        mediaUrl: campaignData.mediaUrl || undefined,
        scheduledAt: campaignData.sendNow ? undefined : campaignData.scheduleAt,
        startImmediately: campaignData.sendNow, // Start the job immediately if sendNow is true
      };

      if (campaignData.recipientSource === 'group') {
        payload.recipientListId = campaignData.groupId;
        payload.recipientSource = 'LIST';
      } else if (campaignData.recipientSource === 'csv') {
        // Pass recipients with variables for personalization
        payload.recipients = csvRecipients;
        payload.phoneNumbers = csvPhones;
        payload.recipientSource = 'CSV';
      } else {
        payload.recipientSource = 'FILTER';
        payload.recipientFilter = {};
      }

      console.log('[Campaign] Submitting payload:', payload);
      await bulkMessagingApi.createJob(payload);
      navigate('/messaging-portal/campaigns');
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create campaign';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const channelTemplates = templates.filter((t) => t.type?.toLowerCase() === campaignData.channel);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-1" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Create Campaign</h1>
        <p className="text-gray-600">Send bulk messages to your contacts</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Channel', 'Recipients', 'Message', 'Review'].map((label, idx) => (
            <div key={label} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  step > idx + 1
                    ? 'bg-green-500 text-white'
                    : step === idx + 1
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step > idx + 1 ? <CheckCircleIcon className="h-5 w-5" /> : idx + 1}
              </div>
              <span className={`ml-2 text-sm ${step === idx + 1 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                {label}
              </span>
              {idx < 3 && <div className="w-12 lg:w-24 h-0.5 bg-gray-200 mx-4" />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Step 1: Choose Channel */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Channel</h2>
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setCampaignData({ ...campaignData, channel: 'sms' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  campaignData.channel === 'sms'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-3 text-blue-600" />
                <p className="font-medium text-gray-900">SMS</p>
                <p className="text-xs text-gray-500 mt-1">{balance?.smsCredits || 0} credits</p>
              </button>

              <button
                onClick={() => setCampaignData({ ...campaignData, channel: 'whatsapp' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  campaignData.channel === 'whatsapp'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <WhatsAppIcon className="h-8 w-8 mx-auto mb-3 text-green-600" />
                <p className="font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500 mt-1">{balance?.whatsappCredits || 0} credits</p>
              </button>

              <button
                onClick={() => setCampaignData({ ...campaignData, channel: 'rcs' })}
                className={`p-6 rounded-xl border-2 transition-all ${
                  campaignData.channel === 'rcs'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <DevicePhoneMobileIcon className="h-8 w-8 mx-auto mb-3 text-purple-600" />
                <p className="font-medium text-gray-900">RCS</p>
                <p className="text-xs text-gray-500 mt-1">{balance?.rcsCredits || 0} credits</p>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Select Recipients */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Recipients</h2>
            <div className="space-y-4">
              <button
                onClick={() => setCampaignData({ ...campaignData, recipientSource: 'group', groupId: '' })}
                className={`w-full p-4 rounded-xl border-2 text-left flex items-center ${
                  campaignData.recipientSource === 'group'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FolderIcon className="h-6 w-6 mr-4 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Select from Group</p>
                  <p className="text-sm text-gray-500">Choose a contact group</p>
                </div>
              </button>

              <button
                onClick={() => setCampaignData({ ...campaignData, recipientSource: 'all' })}
                className={`w-full p-4 rounded-xl border-2 text-left flex items-center ${
                  campaignData.recipientSource === 'all'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <UsersIcon className="h-6 w-6 mr-4 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">All Contacts</p>
                  <p className="text-sm text-gray-500">Send to all your contacts</p>
                </div>
              </button>

              <button
                onClick={() => setCampaignData({ ...campaignData, recipientSource: 'csv' })}
                className={`w-full p-4 rounded-xl border-2 text-left flex items-center ${
                  campaignData.recipientSource === 'csv'
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <ArrowUpTrayIcon className="h-6 w-6 mr-4 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Upload CSV</p>
                  <p className="text-sm text-gray-500">Upload a list of phone numbers</p>
                </div>
              </button>
            </div>

            {campaignData.recipientSource === 'group' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Group</label>
                <select
                  value={campaignData.groupId}
                  onChange={(e) => setCampaignData({ ...campaignData, groupId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name} ({group.contactCount || 0} contacts)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {campaignData.recipientSource === 'csv' && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                {csvFile && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700">
                      {csvPhones.length} valid phone numbers found
                    </p>
                    {csvHeaders.length > 1 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Variables detected for personalization:</p>
                        <div className="flex flex-wrap gap-1">
                          {csvHeaders.filter(h => !h.toLowerCase().includes('phone') && !h.toLowerCase().includes('mobile')).map((header) => (
                            <span key={header} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {`{${header.toLowerCase()}}`}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Use these in your template like: Dear {'{name}'}, your {'{date}'} is confirmed.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {recipientCount > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">{recipientCount}</span> recipients selected
                </p>
                {!hasEnoughCredits() && (
                  <p className="text-sm text-red-600 mt-1">
                    Insufficient credits. You need {recipientCount} but have {getAvailableCredits()}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Compose Message */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Compose Message</h2>

            {/* SMS requires templates */}
            {campaignData.channel === 'sms' && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>SMS Templates:</strong> Select a template from your saved templates.
                  DLT compliance is automatically handled.
                </p>
              </div>
            )}

            {/* Template selection - mandatory for SMS */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {campaignData.channel === 'sms' ? 'Select DLT Template *' : 'Use Template (Optional)'}
              </label>
              {channelTemplates.length > 0 ? (
                <select
                  value={campaignData.templateId}
                  onChange={(e) => setCampaignData({ ...campaignData, templateId: e.target.value, customMessage: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  {campaignData.channel === 'sms' ? (
                    <option value="">-- Select a template --</option>
                  ) : (
                    <option value="">Write custom message</option>
                  )}
                  {channelTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                  <p className="text-sm text-gray-600 mb-2">No templates found for {campaignData.channel.toUpperCase()}</p>
                  <button
                    type="button"
                    onClick={() => navigate('/messaging-portal/templates')}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    + Create Template
                  </button>
                </div>
              )}
            </div>

            {campaignData.templateId ? (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center mb-2">
                  <DocumentTextIcon className="h-5 w-5 text-gray-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">Template Preview</span>
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {templates.find((t) => t.id === campaignData.templateId)?.content}
                </p>
                {templates.find((t) => t.id === campaignData.templateId)?.dltTemplateId && (
                  <p className="text-xs text-gray-400 mt-2">
                    DLT ID: {templates.find((t) => t.id === campaignData.templateId)?.dltTemplateId}
                  </p>
                )}
              </div>
            ) : campaignData.channel !== 'sms' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={campaignData.customMessage}
                  onChange={(e) => setCampaignData({ ...campaignData, customMessage: e.target.value })}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Type your message here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {campaignData.customMessage.length} characters
                </p>
              </div>
            ) : null}

            {(campaignData.channel === 'whatsapp' || campaignData.channel === 'rcs') && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Media URL (Optional)</label>
                <input
                  type="url"
                  value={campaignData.mediaUrl}
                  onChange={(e) => setCampaignData({ ...campaignData, mediaUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">When to send?</h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={campaignData.sendNow}
                    onChange={() => setCampaignData({ ...campaignData, sendNow: true })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Send now</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    checked={!campaignData.sendNow}
                    onChange={() => setCampaignData({ ...campaignData, sendNow: false })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Schedule for later</span>
                </label>
              </div>

              {!campaignData.sendNow && (
                <div className="mt-3 flex items-center">
                  <ClockIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <input
                    type="datetime-local"
                    value={campaignData.scheduleAt}
                    onChange={(e) => setCampaignData({ ...campaignData, scheduleAt: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Review Campaign</h2>
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Channel</p>
                <p className="font-medium text-gray-900 capitalize">{campaignData.channel}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Recipients</p>
                <p className="font-medium text-gray-900">{recipientCount} contacts</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Message</p>
                <p className="font-medium text-gray-900">
                  {campaignData.templateId
                    ? templates.find((t) => t.id === campaignData.templateId)?.content
                    : campaignData.customMessage}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Schedule</p>
                <p className="font-medium text-gray-900">
                  {campaignData.sendNow
                    ? 'Send immediately'
                    : `Scheduled for ${new Date(campaignData.scheduleAt).toLocaleString()}`}
                </p>
              </div>

              <div className="p-4 bg-primary-50 rounded-lg border border-primary-200">
                <p className="text-sm text-primary-700">Credits Required</p>
                <p className="text-2xl font-bold text-primary-900">{recipientCount}</p>
                <p className="text-xs text-primary-600 mt-1">
                  Available: {getAvailableCredits()} {campaignData.channel} credits
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="mt-6 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 2 && recipientCount === 0) ||
                (step === 3 && campaignData.channel === 'sms' && !campaignData.templateId) ||
                (step === 3 && campaignData.channel !== 'sms' && !campaignData.templateId && !campaignData.customMessage)
              }
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading || !hasEnoughCredits()}
              className="flex items-center px-6 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <PaperAirplaneIcon className="h-5 w-5 mr-2" />
                  {campaignData.sendNow ? 'Send Campaign' : 'Schedule Campaign'}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreateCampaignPage;
