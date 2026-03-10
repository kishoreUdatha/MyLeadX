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
  hasInstagram: boolean;
  instagramAccount?: {
    id: string;
    username: string;
    profile_picture_url?: string;
    followers_count?: number;
  };
}

interface LeadForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
  locale: string;
  created_time: string;
}

interface FormField {
  key: string;
  label: string;
  type: string;
}

interface FieldMapping {
  [key: string]: string;
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
  { key: 'courseId', label: 'Course Interest' },
  { key: 'sourceDetails', label: 'Source Details' },
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
  street_address: 'address',
};

const steps = [
  { id: 1, name: 'Connect Account', icon: LinkIcon },
  { id: 2, name: 'Select Page & Forms', icon: DocumentTextIcon },
  { id: 3, name: 'Field Mapping', icon: Cog6ToothIcon },
  { id: 4, name: 'Webhook Setup', icon: BellAlertIcon },
];

export default function InstagramLeadSetupPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Connect Account
  const [accessToken, setAccessToken] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionValid, setConnectionValid] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);

  // Step 2: Select Page & Forms
  const [selectedPage, setSelectedPage] = useState<FacebookPage | null>(null);
  const [forms, setForms] = useState<LeadForm[]>([]);
  const [selectedForms, setSelectedForms] = useState<string[]>([]);
  const [isLoadingForms, setIsLoadingForms] = useState(false);

  // Step 3: Field Mapping
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});

  // Step 4: Webhook Setup
  const [webhookInfo, setWebhookInfo] = useState<{
    webhookUrl: string;
    verifyToken: string;
    instructions: string[];
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Test connection
  const testConnection = async () => {
    if (!accessToken.trim()) {
      toast.error('Please enter an access token');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await api.post('/instagram/test-connection', { accessToken });
      const data = response.data.data;

      if (data.valid) {
        setConnectionValid(true);
        setPages(data.pages.map((p: any) => ({
          id: p.id,
          name: p.name,
          hasInstagram: p.hasInstagram,
        })));
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

  // Load pages with Instagram account details
  const loadPagesWithDetails = async () => {
    if (!accessToken) return;

    try {
      const response = await api.get('/instagram/pages', {
        params: { accessToken },
      });

      const pagesData = response.data.data || [];
      setPages(pagesData.map((p: any) => ({
        id: p.id,
        name: p.name,
        hasInstagram: !!p.instagram_business_account,
        instagramAccount: p.instagram_business_account,
      })));
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  // Load forms for selected page
  const loadForms = async (pageId: string) => {
    setIsLoadingForms(true);
    try {
      const response = await api.get(`/instagram/pages/${pageId}/forms`, {
        params: { accessToken },
      });
      setForms(response.data.data || []);
    } catch (error: any) {
      toast.error('Failed to load lead forms');
    } finally {
      setIsLoadingForms(false);
    }
  };

  // Load form fields for mapping
  const loadFormFields = async () => {
    if (selectedForms.length === 0) return;

    try {
      // Get fields from the first selected form
      const response = await api.get(`/instagram/forms/${selectedForms[0]}/fields`, {
        params: { accessToken },
      });
      const fields = response.data.data || [];
      setFormFields(fields);

      // Auto-map common fields
      const autoMapping: FieldMapping = {};
      fields.forEach((field: FormField) => {
        const mappedKey = AUTO_MAP[field.key.toLowerCase()];
        if (mappedKey) {
          autoMapping[field.key] = mappedKey;
        }
      });
      setFieldMapping(autoMapping);
    } catch (error) {
      console.error('Failed to load form fields:', error);
    }
  };

  // Load webhook info
  const loadWebhookInfo = async () => {
    try {
      const response = await api.get('/instagram/webhook-url');
      setWebhookInfo(response.data.data);
    } catch (error) {
      console.error('Failed to load webhook info:', error);
    }
  };

  // Save integration
  const saveIntegration = async () => {
    if (!selectedPage) {
      toast.error('Please select a page');
      return;
    }

    setIsSaving(true);
    try {
      await api.post('/instagram/integrations', {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        instagramAccountId: selectedPage.instagramAccount?.id,
        instagramUsername: selectedPage.instagramAccount?.username,
        accessToken,
        selectedLeadForms: selectedForms.map(formId => {
          const form = forms.find(f => f.id === formId);
          return { id: formId, name: form?.name };
        }),
        fieldMapping,
      });

      toast.success('Instagram integration saved successfully!');
      navigate('/social-media-ads');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save integration');
    } finally {
      setIsSaving(false);
    }
  };

  // Effects
  useEffect(() => {
    if (currentStep === 2 && connectionValid) {
      loadPagesWithDetails();
    }
  }, [currentStep, connectionValid]);

  useEffect(() => {
    if (selectedPage) {
      loadForms(selectedPage.id);
    }
  }, [selectedPage]);

  useEffect(() => {
    if (currentStep === 3) {
      loadFormFields();
    }
  }, [currentStep, selectedForms]);

  useEffect(() => {
    if (currentStep === 4) {
      loadWebhookInfo();
    }
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return connectionValid;
      case 2:
        return selectedPage && selectedForms.length > 0;
      case 3:
        return Object.keys(fieldMapping).length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      saveIntegration();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/social-media-ads')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Social Media Ads
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Instagram Lead Ads Setup</h1>
        <p className="text-slate-500 mt-1">
          Connect your Instagram Business Account to automatically capture leads
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <nav aria-label="Progress">
          <ol className="flex items-center">
            {steps.map((step, index) => (
              <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20 flex-1' : ''}`}>
                <div className="flex items-center">
                  <div
                    className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                      currentStep > step.id
                        ? 'bg-primary-600'
                        : currentStep === step.id
                        ? 'border-2 border-primary-600 bg-white'
                        : 'border-2 border-slate-300 bg-white'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckIcon className="h-5 w-5 text-white" />
                    ) : (
                      <step.icon
                        className={`h-5 w-5 ${
                          currentStep === step.id ? 'text-primary-600' : 'text-slate-400'
                        }`}
                      />
                    )}
                  </div>
                  <span
                    className={`ml-3 text-sm font-medium ${
                      currentStep >= step.id ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {step.name}
                  </span>
                </div>
                {index !== steps.length - 1 && (
                  <div
                    className={`absolute top-5 left-10 w-full h-0.5 ${
                      currentStep > step.id ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Step Content */}
      <div className="card">
        <div className="card-body">
          {/* Step 1: Connect Account */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Connect Your Facebook/Instagram Account
                </h3>
                <p className="text-slate-600 mb-4">
                  Enter your Facebook Page Access Token to connect your Instagram Business Account.
                  You can get this from the{' '}
                  <a
                    href="https://developers.facebook.com/tools/explorer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    Facebook Graph API Explorer
                  </a>
                  .
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Required Permissions</p>
                    <p className="text-sm text-amber-700 mt-1">
                      Your access token needs: <code className="bg-amber-100 px-1 rounded">pages_show_list</code>,{' '}
                      <code className="bg-amber-100 px-1 rounded">leads_retrieval</code>,{' '}
                      <code className="bg-amber-100 px-1 rounded">pages_manage_metadata</code>
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Access Token
                </label>
                <div className="flex gap-3">
                  <input
                    type="password"
                    value={accessToken}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setConnectionValid(false);
                    }}
                    className="input flex-1"
                    placeholder="Enter your Facebook Page access token"
                  />
                  <button
                    onClick={testConnection}
                    disabled={isTestingConnection || !accessToken.trim()}
                    className="btn btn-primary whitespace-nowrap"
                  >
                    {isTestingConnection ? (
                      <span className="spinner"></span>
                    ) : connectionValid ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4" />
                        Connected
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </button>
                </div>
              </div>

              {connectionValid && pages.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                    <CheckCircleIcon className="w-5 h-5" />
                    Connection Successful
                  </div>
                  <p className="text-sm text-green-700">
                    Found {pages.length} Facebook page(s). Click "Next" to select a page and lead forms.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Page & Forms */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Select Page & Lead Forms
                </h3>
                <p className="text-slate-600 mb-4">
                  Choose the Facebook Page with your Instagram Business Account and select the lead forms to track.
                </p>
              </div>

              {/* Page Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Facebook Page
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {pages.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => setSelectedPage(page)}
                      className={`p-4 rounded-lg border-2 text-left transition-colors ${
                        selectedPage?.id === page.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{page.name}</p>
                      <p className="text-sm text-slate-500">ID: {page.id}</p>
                      {page.hasInstagram && page.instagramAccount && (
                        <div className="flex items-center gap-2 mt-2 text-pink-600">
                          <span className="text-xs font-medium bg-pink-100 px-2 py-0.5 rounded">
                            @{page.instagramAccount.username}
                          </span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead Forms */}
              {selectedPage && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Lead Forms
                    </label>
                    {isLoadingForms && <span className="spinner spinner-sm"></span>}
                  </div>

                  {forms.length === 0 && !isLoadingForms ? (
                    <div className="text-center py-8 bg-slate-50 rounded-lg">
                      <DocumentTextIcon className="w-12 h-12 mx-auto text-slate-300" />
                      <p className="text-slate-600 mt-2">No lead forms found for this page</p>
                      <p className="text-sm text-slate-500">Create lead forms in Facebook Ads Manager</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {forms.map((form) => (
                        <label
                          key={form.id}
                          className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedForms.includes(form.id)
                              ? 'border-primary-600 bg-primary-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedForms.includes(form.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedForms([...selectedForms, form.id]);
                                } else {
                                  setSelectedForms(selectedForms.filter((id) => id !== form.id));
                                }
                              }}
                              className="h-4 w-4 text-primary-600 rounded"
                            />
                            <div>
                              <p className="font-medium text-slate-900">{form.name}</p>
                              <p className="text-sm text-slate-500">
                                {form.leads_count || 0} leads | {form.status}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">{form.id}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Field Mapping */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Map Form Fields to CRM
                </h3>
                <p className="text-slate-600 mb-4">
                  Match your lead form fields to the corresponding CRM fields. Common fields are auto-mapped.
                </p>
              </div>

              {formFields.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Cog6ToothIcon className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-slate-600 mt-2">Loading form fields...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 pb-2 border-b border-slate-200">
                    <div className="text-sm font-medium text-slate-700">Form Field</div>
                    <div className="text-sm font-medium text-slate-700">CRM Field</div>
                  </div>
                  {formFields.map((field) => (
                    <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <p className="font-medium text-slate-900">{field.label}</p>
                        <p className="text-sm text-slate-500">{field.key}</p>
                      </div>
                      <select
                        value={fieldMapping[field.key] || ''}
                        onChange={(e) => {
                          setFieldMapping({
                            ...fieldMapping,
                            [field.key]: e.target.value,
                          });
                        }}
                        className="input"
                      >
                        <option value="">-- Do not map --</option>
                        {CRM_FIELDS.map((crmField) => (
                          <option key={crmField.key} value={crmField.key}>
                            {crmField.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tip:</strong> Unmapped fields will be stored in the lead's custom fields and can be viewed in the lead details.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Webhook Setup */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                  Configure Webhook in Facebook
                </h3>
                <p className="text-slate-600 mb-4">
                  Set up a webhook in Facebook Business Manager to receive leads in real-time.
                </p>
              </div>

              {webhookInfo && (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookInfo.webhookUrl}
                          className="input flex-1 bg-slate-50"
                        />
                        <button
                          onClick={() => copyToClipboard(webhookInfo.webhookUrl)}
                          className="btn btn-secondary"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Verify Token
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          readOnly
                          value={webhookInfo.verifyToken}
                          className="input flex-1 bg-slate-50"
                        />
                        <button
                          onClick={() => copyToClipboard(webhookInfo.verifyToken)}
                          className="btn btn-secondary"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-lg p-4">
                    <h4 className="font-medium text-slate-900 mb-3">Setup Instructions</h4>
                    <ol className="space-y-2">
                      {webhookInfo.instructions.map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          {instruction}
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                      <CheckCircleIcon className="w-5 h-5" />
                      Ready to Save
                    </div>
                    <p className="text-sm text-green-700">
                      Your integration is configured. Click "Complete Setup" to save and start receiving leads.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="card-footer flex justify-between">
          <button
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={currentStep === 1}
            className="btn btn-secondary"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={handleNext}
            disabled={!canProceed() || isSaving}
            className="btn btn-primary"
          >
            {isSaving ? (
              <span className="spinner"></span>
            ) : currentStep === 4 ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                Complete Setup
              </>
            ) : (
              <>
                Next
                <ArrowRightIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
