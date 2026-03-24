import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  LinkIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface AdAccount {
  id: string;
  name: string;
}

interface LeadCard {
  id: string;
  name: string;
  status?: string;
  cardType?: string;
}

interface FormField {
  key: string;
  label: string;
  type: string;
}

const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Job Title' },
  { key: 'city', label: 'City' },
  { key: 'country', label: 'Country' },
];

const AUTO_MAP: Record<string, string> = {
  name: 'firstName',
  full_name: 'firstName',
  email: 'email',
  phone: 'phone',
  company: 'company',
  title: 'title',
  screen_name: 'company',
};

const steps = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Ad Account & Lead Cards', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export default function TwitterSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const [accessToken, setAccessToken] = useState('');
  const [accessTokenSecret, setAccessTokenSecret] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);

  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [leadCards, setLeadCards] = useState<LeadCard[]>([]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isLoadingCards, setIsLoadingCards] = useState(false);

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const testConnection = async () => {
    if (!accessToken.trim() || !accessTokenSecret.trim()) {
      toast.error('Please enter both access token and access token secret');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/twitter/test-connection', {
        accessToken,
        accessTokenSecret,
      });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        setAdAccounts(data.accounts || []);
        toast.success(`Connected! Found ${data.accountsCount || data.accounts?.length || 0} ad account(s)`);
      } else {
        setConnectionValid(false);
        toast.error(data.error || 'Invalid credentials');
      }
    } catch (error: any) {
      setConnectionValid(false);
      toast.error(error.response?.data?.message || 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadLeadCards = async (accountId: string) => {
    setIsLoadingCards(true);
    try {
      const response = await api.get(`/twitter/accounts/${accountId}/lead-cards`, {
        params: { accessToken, accessTokenSecret },
      });
      setLeadCards(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load lead gen cards');
      setLeadCards([]);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const loadFormFields = async () => {
    if (selectedCards.length === 0) return;

    try {
      const response = await api.get(`/twitter/cards/${selectedCards[0]}/fields`, {
        params: { accessToken, accessTokenSecret },
      });
      const fields = response.data.data || [];
      setFormFields(fields);

      const autoMapping: Record<string, string> = {};
      fields.forEach((field: FormField) => {
        const mappedKey = AUTO_MAP[field.key];
        if (mappedKey) autoMapping[field.key] = mappedKey;
      });
      setFieldMapping(autoMapping);
    } catch (error) {
      // Use default Twitter Lead Card fields if API fails
      setFormFields([
        { key: 'name', label: 'Name', type: 'TEXT' },
        { key: 'email', label: 'Email', type: 'EMAIL' },
        { key: 'phone', label: 'Phone', type: 'PHONE' },
        { key: 'screen_name', label: 'Twitter Handle', type: 'TEXT' },
        { key: 'company', label: 'Company', type: 'TEXT' },
        { key: 'title', label: 'Job Title', type: 'TEXT' },
      ]);
      setFieldMapping(AUTO_MAP);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const response = await api.get('/twitter/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info');
    }
  };

  const saveIntegration = async () => {
    if (!selectedAccount) return;

    setIsSaving(true);
    try {
      await api.post('/twitter/integrations', {
        adAccountId: selectedAccount.id,
        adAccountName: selectedAccount.name,
        accessToken,
        accessTokenSecret,
        selectedLeadCards: selectedCards.map((id) => {
          const card = leadCards.find((c) => c.id === id);
          return { id, name: card?.name };
        }),
        fieldMapping,
      });

      toast.success('Twitter/X integration saved!');
      navigate('/ad-integrations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) loadLeadCards(selectedAccount.id);
  }, [selectedAccount]);

  useEffect(() => {
    if (currentStep === 3) loadFormFields();
  }, [currentStep, selectedCards]);

  useEffect(() => {
    if (currentStep === 4) loadWebhookInfo();
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return connectionValid;
      case 2: return selectedAccount && selectedCards.length > 0;
      case 3: return Object.keys(fieldMapping).length > 0;
      case 4: return true;
      default: return false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button onClick={() => navigate('/ad-integrations')} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Integrations
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Twitter/X Ads Setup</h1>
        <p className="text-slate-500 mt-1">Connect Twitter Lead Gen Cards to capture social media leads</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
              <div className="flex items-center">
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                  currentStep > step.id ? 'bg-slate-900' : currentStep === step.id ? 'border-2 border-slate-900 bg-white' : 'border-2 border-slate-300 bg-white'
                }`}>
                  {currentStep > step.id ? <CheckIcon className="h-5 w-5 text-white" /> : <step.icon className={`h-5 w-5 ${currentStep === step.id ? 'text-slate-900' : 'text-slate-400'}`} />}
                </div>
                <span className={`ml-3 text-sm font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>{step.name}</span>
              </div>
              {index !== steps.length - 1 && <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > step.id ? 'bg-slate-900' : 'bg-slate-300'}`} />}
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <div className="card-body">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Connect Your Twitter/X Ads Account</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">OAuth 1.0a Credentials Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Get your OAuth credentials from the Twitter Developer Portal with <code className="bg-amber-100 px-1 rounded">Ads API</code> access enabled.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access Token</label>
                <input type="password" value={accessToken} onChange={(e) => { setAccessToken(e.target.value); setConnectionValid(false); }} className="input w-full" placeholder="Enter your Twitter OAuth access token" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access Token Secret</label>
                <input type="password" value={accessTokenSecret} onChange={(e) => { setAccessTokenSecret(e.target.value); setConnectionValid(false); }} className="input w-full" placeholder="Enter your access token secret" />
              </div>
              <button onClick={testConnection} disabled={isTestingConnection} className="btn btn-primary">
                {isTestingConnection ? <span className="spinner"></span> : connectionValid ? <><CheckCircleIcon className="w-4 h-4" /> Connected</> : 'Test Connection'}
              </button>
              {connectionValid && adAccounts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Connected! Found {adAccounts.length} ad account(s).</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Select Ad Account & Lead Gen Cards</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Twitter Ad Account</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {adAccounts.map((account) => (
                    <button key={account.id} onClick={() => setSelectedAccount(account)} className={`p-4 rounded-lg border-2 text-left ${selectedAccount?.id === account.id ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="font-medium text-slate-900">{account.name}</p>
                      <p className="text-sm text-slate-500">ID: {account.id}</p>
                    </button>
                  ))}
                </div>
              </div>
              {selectedAccount && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Lead Gen Cards {isLoadingCards && <span className="spinner spinner-sm ml-2"></span>}</label>
                  {leadCards.length === 0 && !isLoadingCards ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-slate-600 mt-2">No lead gen cards found</p>
                      <p className="text-sm text-slate-500">Create Lead Gen Cards in Twitter Ads Manager</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {leadCards.map((card) => (
                        <label key={card.id} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${selectedCards.includes(card.id) ? 'border-slate-900 bg-slate-50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedCards.includes(card.id)} onChange={(e) => setSelectedCards(e.target.checked ? [...selectedCards, card.id] : selectedCards.filter((id) => id !== card.id))} className="h-4 w-4 text-slate-900 rounded" />
                            <div>
                              <p className="font-medium text-slate-900">{card.name || card.id}</p>
                              {card.cardType && <p className="text-sm text-slate-500">{card.cardType}</p>}
                            </div>
                          </div>
                          {card.status && (
                            <span className={`text-xs px-2 py-1 rounded-full ${card.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                              {card.status}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Map Form Fields to CRM</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-2 border-b">
                  <div className="text-sm font-medium text-slate-700">Twitter Lead Card Field</div>
                  <div className="text-sm font-medium text-slate-700">CRM Field</div>
                </div>
                {formFields.map((field) => (
                  <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                    <div>
                      <p className="font-medium text-slate-900">{field.label}</p>
                      <p className="text-sm text-slate-500">{field.key}</p>
                    </div>
                    <select value={fieldMapping[field.key] || ''} onChange={(e) => setFieldMapping({ ...fieldMapping, [field.key]: e.target.value })} className="input">
                      <option value="">-- Do not map --</option>
                      {CRM_FIELDS.map((crmField) => (
                        <option key={crmField.key} value={crmField.key}>{crmField.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 4 && webhookInfo && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Configure Webhook</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Webhook URL</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={webhookInfo.webhookUrl} className="input flex-1 bg-slate-50" />
                  <button onClick={() => copyToClipboard(webhookInfo.webhookUrl)} className="btn btn-secondary"><ClipboardDocumentIcon className="w-4 h-4" /></button>
                </div>
              </div>
              {webhookInfo.crcToken && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">CRC Token (for verification)</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={webhookInfo.crcToken} className="input flex-1 bg-slate-50 font-mono text-sm" />
                    <button onClick={() => copyToClipboard(webhookInfo.crcToken)} className="btn btn-secondary"><ClipboardDocumentIcon className="w-4 h-4" /></button>
                  </div>
                </div>
              )}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Setup Instructions</h4>
                <ol className="space-y-2">
                  {webhookInfo.instructions?.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-medium">{index + 1}</span>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Ready to save!</p>
              </div>
            </div>
          )}
        </div>

        <div className="card-footer flex justify-between">
          <button onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1} className="btn btn-secondary"><ArrowLeftIcon className="w-4 h-4" /> Back</button>
          <button onClick={currentStep === 4 ? saveIntegration : () => setCurrentStep(currentStep + 1)} disabled={!canProceed() || isSaving} className="btn btn-primary">
            {isSaving ? <span className="spinner"></span> : currentStep === 4 ? <><CheckCircleIcon className="w-4 h-4" /> Complete Setup</> : <>Next <ArrowRightIcon className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
