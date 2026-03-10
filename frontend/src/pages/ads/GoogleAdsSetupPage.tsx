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

interface LeadForm {
  id: string;
  name: string;
  asset?: {
    lead_form_asset?: {
      business_name?: string;
      headline?: string;
    };
  };
}

interface FormField {
  key: string;
  label: string;
  type: string;
}

const CRM_FIELDS = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'fullName', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'postalCode', label: 'Postal Code' },
];

const AUTO_MAP: Record<string, string> = {
  FULL_NAME: 'fullName',
  FIRST_NAME: 'firstName',
  LAST_NAME: 'lastName',
  EMAIL: 'email',
  PHONE_NUMBER: 'phone',
  CITY: 'city',
  REGION: 'state',
  COUNTRY: 'country',
  POSTAL_CODE: 'postalCode',
  COMPANY_NAME: 'company',
};

const steps = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Lead Forms', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export default function GoogleAdsSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Credentials
  const [customerId, setCustomerId] = useState('');
  const [developerToken, setDeveloperToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);

  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const testConnection = async () => {
    if (!customerId.trim() || !developerToken.trim() || !refreshToken.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/google-ads/test-connection', {
        customerId,
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
      });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        toast.success(`Connected! Found ${data.campaignsCount} campaign(s)`);
      } else {
        setConnectionValid(false);
        toast.error(data.error || 'Connection failed');
      }
    } catch (error: any) {
      setConnectionValid(false);
      toast.error(error.response?.data?.message || 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadForms = async () => {
    setIsLoadingForms(true);
    try {
      const response = await api.get('/google-ads/lead-forms');
      setForms(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load lead forms');
      setForms([]);
    } finally {
      setIsLoadingForms(false);
    }
  };

  const loadFormFields = async () => {
    if (selectedForms.length === 0) return;

    try {
      const response = await api.get(`/google-ads/forms/${selectedForms[0]}/fields`);
      const fields = response.data.data || [];
      setFormFields(fields);

      const autoMapping: Record<string, string> = {};
      fields.forEach((field: FormField) => {
        const mappedKey = AUTO_MAP[field.key];
        if (mappedKey) autoMapping[field.key] = mappedKey;
      });
      setFieldMapping(autoMapping);
    } catch (error) {
      // Use default Google Ads fields
      const defaultFields = [
        { key: 'FULL_NAME', label: 'Full Name', type: 'TEXT' },
        { key: 'EMAIL', label: 'Email', type: 'EMAIL' },
        { key: 'PHONE_NUMBER', label: 'Phone Number', type: 'PHONE' },
        { key: 'CITY', label: 'City', type: 'TEXT' },
        { key: 'REGION', label: 'State/Region', type: 'TEXT' },
        { key: 'COUNTRY', label: 'Country', type: 'TEXT' },
        { key: 'COMPANY_NAME', label: 'Company', type: 'TEXT' },
      ];
      setFormFields(defaultFields);
      setFieldMapping(AUTO_MAP);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const response = await api.get('/google-ads/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info');
    }
  };

  const saveIntegration = async () => {
    setIsSaving(true);
    try {
      await api.post('/google-ads/integrations', {
        customerId,
        developerToken,
        clientId,
        clientSecret,
        refreshToken,
        selectedLeadForms: selectedForms.map((id) => {
          const form = forms.find((f) => f.id === id);
          return { id, name: form?.name || form?.asset?.lead_form_asset?.business_name };
        }),
        fieldMapping,
      });

      toast.success('Google Ads integration saved!');
      navigate('/ad-integrations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (currentStep === 2 && connectionValid) loadForms();
  }, [currentStep, connectionValid]);

  useEffect(() => {
    if (currentStep === 3) loadFormFields();
  }, [currentStep, selectedForms]);

  useEffect(() => {
    if (currentStep === 4) loadWebhookInfo();
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return connectionValid;
      case 2: return selectedForms.length > 0;
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
        <h1 className="text-2xl font-bold text-slate-900">Google Ads Lead Forms Setup</h1>
        <p className="text-slate-500 mt-1">Connect Google Ads Lead Form Extensions to capture search leads</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
              <div className="flex items-center">
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                  currentStep > step.id ? 'bg-red-600' : currentStep === step.id ? 'border-2 border-red-600 bg-white' : 'border-2 border-slate-300 bg-white'
                }`}>
                  {currentStep > step.id ? <CheckIcon className="h-5 w-5 text-white" /> : <step.icon className={`h-5 w-5 ${currentStep === step.id ? 'text-red-600' : 'text-slate-400'}`} />}
                </div>
                <span className={`ml-3 text-sm font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>{step.name}</span>
              </div>
              {index !== steps.length - 1 && <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > step.id ? 'bg-red-600' : 'bg-slate-300'}`} />}
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <div className="card-body">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Connect Google Ads Account</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Required Credentials</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Get these from Google Cloud Console and Google Ads API Center.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Customer ID *</label>
                  <input type="text" value={customerId} onChange={(e) => { setCustomerId(e.target.value); setConnectionValid(false); }} className="input w-full" placeholder="123-456-7890" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Developer Token *</label>
                  <input type="password" value={developerToken} onChange={(e) => { setDeveloperToken(e.target.value); setConnectionValid(false); }} className="input w-full" placeholder="Your developer token" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client ID</label>
                  <input type="text" value={clientId} onChange={(e) => setClientId(e.target.value)} className="input w-full" placeholder="OAuth client ID" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Client Secret</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} className="input w-full" placeholder="OAuth client secret" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Refresh Token *</label>
                  <input type="password" value={refreshToken} onChange={(e) => { setRefreshToken(e.target.value); setConnectionValid(false); }} className="input w-full" placeholder="OAuth refresh token" />
                </div>
              </div>

              <button onClick={testConnection} disabled={isTestingConnection} className="btn btn-primary">
                {isTestingConnection ? <span className="spinner"></span> : connectionValid ? <><CheckCircleIcon className="w-4 h-4" /> Connected</> : 'Test Connection'}
              </button>

              {connectionValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Connection Successful!</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Select Lead Forms</h3>
              {isLoadingForms ? (
                <div className="flex items-center justify-center py-8">
                  <span className="spinner spinner-lg"></span>
                </div>
              ) : forms.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-slate-600 mt-2">No lead form assets found</p>
                  <p className="text-sm text-slate-500">Create lead form extensions in Google Ads</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {forms.map((form) => (
                    <label key={form.id} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${selectedForms.includes(form.id) ? 'border-red-600 bg-red-50' : 'border-slate-200'}`}>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={(e) => setSelectedForms(e.target.checked ? [...selectedForms, form.id] : selectedForms.filter((id) => id !== form.id))} className="h-4 w-4 text-red-600 rounded" />
                        <div>
                          <p className="font-medium text-slate-900">{form.name || form.asset?.lead_form_asset?.business_name || `Form ${form.id}`}</p>
                          {form.asset?.lead_form_asset?.headline && (
                            <p className="text-sm text-slate-500">{form.asset.lead_form_asset.headline}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Map Form Fields to CRM</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 pb-2 border-b">
                  <div className="text-sm font-medium text-slate-700">Google Ads Field</div>
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
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Setup Instructions</h4>
                <ol className="space-y-2">
                  {webhookInfo.instructions?.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-medium">{index + 1}</span>
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
