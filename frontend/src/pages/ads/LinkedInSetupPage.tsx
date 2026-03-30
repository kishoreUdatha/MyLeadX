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

interface LeadForm {
  id: string;
  name: string;
  status?: string;
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
  firstName: 'firstName',
  lastName: 'lastName',
  emailAddress: 'email',
  phoneNumber: 'phone',
  companyName: 'company',
  jobTitle: 'title',
};

const steps = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Ad Account & Forms', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export default function LinkedInSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const [accessToken, setAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [adAccounts, setAdAccounts] = useState<AdAccount[]>([]);

  const [selectedAccount, setSelectedAccount] = useState<AdAccount | null>(null);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({});

  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const testConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter an access token');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/linkedin/test-connection', { accessToken });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        setAdAccounts(data.accounts || []);
        toast.success(`Connected! Found ${data.accountsCount} ad account(s)`);
      } else {
        setConnectionValid(false);
        toast.error(data.error || 'Invalid access token');
      }
    } catch (error: any) {
      setConnectionValid(false);
      toast.error(error.response?.data?.message || 'Connection failed');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const loadForms = async (accountId: string) => {
    setIsLoadingForms(true);
    try {
      const response = await api.get(`/linkedin/accounts/${accountId}/forms`, {
        params: { accessToken },
      });
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
      const response = await api.get(`/linkedin/forms/${selectedForms[0]}/fields`, {
        params: { accessToken },
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
      // Use default LinkedIn fields if API fails
      setFormFields([
        { key: 'firstName', label: 'First Name', type: 'TEXT' },
        { key: 'lastName', label: 'Last Name', type: 'TEXT' },
        { key: 'emailAddress', label: 'Email', type: 'EMAIL' },
        { key: 'phoneNumber', label: 'Phone', type: 'PHONE' },
        { key: 'companyName', label: 'Company', type: 'TEXT' },
        { key: 'jobTitle', label: 'Job Title', type: 'TEXT' },
      ]);
      setFieldMapping(AUTO_MAP);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const response = await api.get('/linkedin/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info');
    }
  };

  const saveIntegration = async () => {
    if (!selectedAccount) return;

    setIsSaving(true);
    try {
      await api.post('/linkedin/integrations', {
        adAccountId: selectedAccount.id,
        adAccountName: selectedAccount.name,
        accessToken,
        selectedLeadForms: selectedForms.map((id) => {
          const form = forms.find((f) => f.id === id);
          return { id, name: form?.name };
        }),
        fieldMapping,
      });

      toast.success('LinkedIn integration saved!');
      navigate('/ad-integrations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (selectedAccount) loadForms(selectedAccount.id);
  }, [selectedAccount]);

  useEffect(() => {
    if (currentStep === 3) loadFormFields();
  }, [currentStep, selectedForms]);

  useEffect(() => {
    if (currentStep === 4) loadWebhookInfo();
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return connectionValid;
      case 2: return selectedAccount && selectedForms.length > 0;
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
        <h1 className="text-2xl font-bold text-slate-900">LinkedIn Lead Gen Setup</h1>
        <p className="text-slate-500 mt-1">Connect LinkedIn Lead Gen Forms to capture B2B leads</p>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <ol className="flex items-center">
          {steps.map((step, index) => (
            <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
              <div className="flex items-center">
                <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                  currentStep > step.id ? 'bg-sky-600' : currentStep === step.id ? 'border-2 border-sky-600 bg-white' : 'border-2 border-slate-300 bg-white'
                }`}>
                  {currentStep > step.id ? <CheckIcon className="h-5 w-5 text-white" /> : <step.icon className={`h-5 w-5 ${currentStep === step.id ? 'text-sky-600' : 'text-slate-400'}`} />}
                </div>
                <span className={`ml-3 text-sm font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>{step.name}</span>
              </div>
              {index !== steps.length - 1 && <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > step.id ? 'bg-sky-600' : 'bg-slate-300'}`} />}
            </li>
          ))}
        </ol>
      </div>

      <div className="card">
        <div className="card-body">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Connect Your LinkedIn Account</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">OAuth Access Token Required</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Get your access token from LinkedIn Marketing API with <code className="bg-amber-100 px-1 rounded">r_ads_leadgen_automation</code> scope.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access Token</label>
                <div className="flex gap-3">
                  <input type="password" value={accessToken} onChange={(e) => { setAccessToken(e.target.value); setConnectionValid(false); }} className="input flex-1" placeholder="Enter your LinkedIn access token" />
                  <button onClick={testConnection} disabled={isTestingConnection} className="btn btn-primary">
                    {isTestingConnection ? <span className="spinner"></span> : connectionValid ? <><CheckCircleIcon className="w-4 h-4" /> Connected</> : 'Test Connection'}
                  </button>
                </div>
              </div>
              {connectionValid && adAccounts.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Connected! Found {adAccounts.length} ad account(s).</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Select Ad Account & Lead Gen Forms</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">LinkedIn Ad Account</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {adAccounts.map((account) => (
                    <button key={account.id} onClick={() => setSelectedAccount(account)} className={`p-4 rounded-lg border-2 text-left ${selectedAccount?.id === account.id ? 'border-sky-600 bg-sky-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <p className="font-medium text-slate-900">{account.name}</p>
                      <p className="text-sm text-slate-500">ID: {account.id}</p>
                    </button>
                  ))}
                </div>
              </div>
              {selectedAccount && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Lead Gen Forms {isLoadingForms && <span className="spinner spinner-sm ml-2"></span>}</label>
                  {forms.length === 0 && !isLoadingForms ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-slate-600 mt-2">No lead gen forms found</p>
                      <p className="text-sm text-slate-500">Create forms in LinkedIn Campaign Manager</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {forms.map((form) => (
                        <label key={form.id} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${selectedForms.includes(form.id) ? 'border-sky-600 bg-sky-50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={(e) => setSelectedForms(e.target.checked ? [...selectedForms, form.id] : selectedForms.filter((id) => id !== form.id))} className="h-4 w-4 text-sky-600 rounded" />
                            <p className="font-medium text-slate-900">{form.name || form.id}</p>
                          </div>
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
                  <div className="text-sm font-medium text-slate-700">LinkedIn Field</div>
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
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center text-xs font-medium">{index + 1}</span>
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
