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

interface FacebookPage {
  id: string;
  name: string;
}

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
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
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'address', label: 'Address' },
];

const AUTO_MAP: Record<string, string> = {
  email: 'email',
  phone_number: 'phone',
  first_name: 'firstName',
  last_name: 'lastName',
  full_name: 'firstName',
  city: 'city',
  state: 'state',
  country: 'country',
};

const steps = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Page & Forms', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export default function FacebookSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  const [accessToken, setAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);

  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
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
      const response = await api.post('/facebook/test-connection', { accessToken });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        setPages(data.pages);
        toast.success(`Connected! Found ${data.pagesCount} page(s)`);
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

  const loadForms = async (pageId: string) => {
    setIsLoadingForms(true);
    try {
      const response = await api.get(`/facebook/pages/${pageId}/forms`, {
        params: { accessToken },
      });
      setForms(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load lead forms');
    } finally {
      setIsLoadingForms(false);
    }
  };

  const loadFormFields = async () => {
    if (selectedForms.length === 0) return;

    try {
      const response = await api.get(`/facebook/forms/${selectedForms[0]}/fields`, {
        params: { accessToken },
      });
      const fields = response.data.data || [];
      setFormFields(fields);

      const autoMapping: Record<string, string> = {};
      fields.forEach((field: FormField) => {
        const mappedKey = AUTO_MAP[field.key.toLowerCase()];
        if (mappedKey) autoMapping[field.key] = mappedKey;
      });
      setFieldMapping(autoMapping);
    } catch (error) {
      console.error('Failed to load form fields:', error);
    }
  };

  const loadWebhookInfo = async () => {
    try {
      const response = await api.get('/facebook/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info:', error);
    }
  };

  const saveIntegration = async () => {
    if (!selectedPage) return;

    setIsSaving(true);
    try {
      await api.post('/facebook/integrations', {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        accessToken,
        selectedLeadForms: selectedForms.map((id) => {
          const form = forms.find((f) => f.id === id);
          return { id, name: form?.name };
        }),
        fieldMapping,
      });

      toast.success('Facebook integration saved!');
      navigate('/ad-integrations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (selectedPage) loadForms(selectedPage.id);
  }, [selectedPage]);

  useEffect(() => {
    if (currentStep === 3) loadFormFields();
  }, [currentStep, selectedForms]);

  useEffect(() => {
    if (currentStep === 4) loadWebhookInfo();
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return connectionValid;
      case 2: return selectedPage && selectedForms.length > 0;
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
        <button
          onClick={() => navigate('/ad-integrations')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Integrations
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Facebook Lead Ads Setup</h1>
        <p className="text-slate-500 mt-1">Connect your Facebook Page to capture leads</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav>
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                <div className="flex items-center">
                  <div className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                    currentStep > step.id ? 'bg-blue-600' : currentStep === step.id ? 'border-2 border-blue-600 bg-white' : 'border-2 border-slate-300 bg-white'
                  }`}>
                    {currentStep > step.id ? (
                      <CheckIcon className="h-5 w-5 text-white" />
                    ) : (
                      <step.icon className={`h-5 w-5 ${currentStep === step.id ? 'text-blue-600' : 'text-slate-400'}`} />
                    )}
                  </div>
                  <span className={`ml-3 text-sm font-medium ${currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'}`}>
                    {step.name}
                  </span>
                </div>
                {index !== steps.length - 1 && (
                  <div className={`absolute top-5 left-10 w-full h-0.5 ${currentStep > step.id ? 'bg-blue-600' : 'bg-slate-300'}`} />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      <div className="card">
        <div className="card-body">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Connect Your Facebook Account</h3>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Required Permissions</p>
                    <p className="text-sm text-amber-700 mt-1">
                      <code className="bg-amber-100 px-1 rounded">pages_show_list</code>,{' '}
                      <code className="bg-amber-100 px-1 rounded">leads_retrieval</code>,{' '}
                      <code className="bg-amber-100 px-1 rounded">pages_manage_metadata</code>
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Access Token</label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => { setAccessToken(e.target.value); setConnectionValid(false); }}
                    className="input flex-1"
                    placeholder="Enter your Facebook Page access token"
                  />
                  <button onClick={testConnection} disabled={isTestingConnection} className="btn btn-primary">
                    {isTestingConnection ? <span className="spinner"></span> : connectionValid ? <><CheckCircleIcon className="w-4 h-4" /> Connected</> : 'Test Connection'}
                  </button>
                </div>
              </div>
              {connectionValid && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-800 font-medium">Connection Successful! Found {pages.length} page(s).</p>
                </div>
              )}
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Select Page & Lead Forms</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Facebook Page</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={`p-4 rounded-lg border-2 text-left ${selectedPage?.id === page.id ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
                    >
                      <p className="font-medium text-slate-900">{page.name}</p>
                      <p className="text-sm text-slate-500">ID: {page.id}</p>
                    </button>
                  ))}
                </div>
              </div>
              {selectedPage && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Lead Forms {isLoadingForms && <span className="spinner spinner-sm ml-2"></span>}</label>
                  {forms.length === 0 && !isLoadingForms ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-slate-600 mt-2">No lead forms found</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {forms.map((form) => (
                        <label key={form.id} className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer ${selectedForms.includes(form.id) ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={selectedForms.includes(form.id)} onChange={(e) => setSelectedForms(e.target.checked ? [...selectedForms, form.id] : selectedForms.filter((id) => id !== form.id))} className="h-4 w-4 text-blue-600 rounded" />
                            <div>
                              <p className="font-medium text-slate-900">{form.name}</p>
                              <p className="text-sm text-slate-500">{form.leads_count || 0} leads</p>
                            </div>
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
              {formFields.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Cog6ToothIcon className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-slate-600 mt-2">Loading form fields...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-2 border-b">
                    <div className="text-sm font-medium text-slate-700">Form Field</div>
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
              )}
            </div>
          )}

          {currentStep === 4 && webhookInfo && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-slate-900">Configure Webhook in Facebook</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Webhook URL</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={webhookInfo.webhookUrl} className="input flex-1 bg-slate-50" />
                    <button onClick={() => copyToClipboard(webhookInfo.webhookUrl)} className="btn btn-secondary">
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Verify Token</label>
                  <div className="flex gap-2">
                    <input type="text" readOnly value={webhookInfo.verifyToken} className="input flex-1 bg-slate-50" />
                    <button onClick={() => copyToClipboard(webhookInfo.verifyToken)} className="btn btn-secondary">
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-900 mb-3">Setup Instructions</h4>
                <ol className="space-y-2">
                  {webhookInfo.instructions.map((instruction: string, index: number) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">{index + 1}</span>
                      {instruction}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 font-medium">Ready to save! Click "Complete Setup" to finish.</p>
              </div>
            </div>
          )}
        </div>

        <div className="card-footer flex justify-between">
          <button onClick={() => setCurrentStep(currentStep - 1)} disabled={currentStep === 1} className="btn btn-secondary">
            <ArrowLeftIcon className="w-4 h-4" /> Back
          </button>
          <button onClick={currentStep === 4 ? saveIntegration : () => setCurrentStep(currentStep + 1)} disabled={!canProceed() || isSaving} className="btn btn-primary">
            {isSaving ? <span className="spinner"></span> : currentStep === 4 ? <><CheckCircleIcon className="w-4 h-4" /> Complete Setup</> : <>Next <ArrowRightIcon className="w-4 h-4" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}
