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
  ArrowTopRightOnSquareIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LightBulbIcon,
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

  // App Credentials (per-organization)
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');

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
  const [credentialsSaved, setCredentialsSaved] = useState(false);
  const [isSavingCredentials, setIsSavingCredentials] = useState(false);
  const [existingIntegrationId, setExistingIntegrationId] = useState<string | null>(null);

  // First-time setup guide (open by default until the tenant has saved an integration).
  const [showSetupGuide, setShowSetupGuide] = useState(true);

  // Load existing integration on mount
  useEffect(() => {
    const loadExistingIntegration = async () => {
      try {
        const response = await api.get('/facebook/integrations');
        const integrations = response.data.data;
        if (integrations && integrations.length > 0) {
          const existing = integrations[0]; // Get the most recent one
          setExistingIntegrationId(existing.id);
          if (existing.appId) setAppId(existing.appId);
          if (existing.appSecret) setAppSecret(existing.appSecret);
          if (existing.verifyToken) setVerifyToken(existing.verifyToken);
          if (existing.accessToken) setAccessToken(existing.accessToken);
          if (existing.pageId && existing.pageId !== 'pending-webhook-setup') {
            const page = { id: existing.pageId, name: existing.pageName || 'Unknown Page' };
            setSelectedPage(page);
            setConnectionValid(true); // Mark as valid since we have a saved page
            setPages([page]);

            // Load forms directly with the token (don't rely on state)
            if (existing.accessToken) {
              try {
                const formsResponse = await api.get(`/facebook/pages/${existing.pageId}/forms`, {
                  params: { accessToken: existing.accessToken },
                });
                const loadedForms = formsResponse.data.data || [];
                setForms(loadedForms);

                // Also restore saved selectedLeadForms as form objects for display
                if (existing.selectedLeadForms && Array.isArray(existing.selectedLeadForms)) {
                  // Merge saved form info with loaded forms for proper display
                  const savedForms = existing.selectedLeadForms.map((f: any) =>
                    typeof f === 'string' ? { id: f, name: f } : f
                  );
                  // If API didn't return forms, use saved ones for display
                  if (loadedForms.length === 0 && savedForms.length > 0) {
                    setForms(savedForms);
                  }
                }
              } catch (err) {
                console.log('Could not load forms from API:', err);
                // Use saved forms as fallback
                if (existing.selectedLeadForms && Array.isArray(existing.selectedLeadForms)) {
                  const savedForms = existing.selectedLeadForms.map((f: any) =>
                    typeof f === 'string' ? { id: f, name: f } : f
                  );
                  setForms(savedForms);
                }
              }
            }
          }
          if (existing.selectedLeadForms && Array.isArray(existing.selectedLeadForms)) {
            // Extract IDs from objects if stored as [{id, name}] format
            const formIds = existing.selectedLeadForms.map((f: any) => typeof f === 'string' ? f : f.id);
            setSelectedForms(formIds.filter(Boolean));
          }
          if (existing.fieldMapping) setFieldMapping(existing.fieldMapping);
          setCredentialsSaved(true);
          // Already configured before — start with the setup guide collapsed.
          setShowSetupGuide(false);
        }
      } catch (error) {
        console.error('Error loading existing integration:', error);
      }
    };

    // Auto-fill the Verify Token from the backend (per-tenant, auto-generated).
    // Without this, the Save button stays disabled on a fresh wizard load
    // because the field is required — and tenants don't know they're supposed
    // to invent one. The backend generates and persists a unique token per
    // tenant on first call; later calls return the same value.
    const autoFillVerifyToken = async () => {
      try {
        const res = await api.get('/facebook/webhook-url');
        const generated = res.data?.data?.verifyToken;
        if (generated) {
          // Only set if the user hasn't already typed something OR if no
          // existing integration loaded a verify token. setState callback form
          // checks current value to avoid clobbering a typed override.
          setVerifyToken((current) => current || generated);
        }
      } catch (err) {
        console.warn('Could not auto-fill verify token:', err);
      }
    };

    loadExistingIntegration().then(autoFillVerifyToken);
  }, []);

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

  // Save credentials for webhook setup (before testing connection)
  const saveCredentialsForWebhook = async () => {
    if (!verifyToken.trim()) {
      toast.error('Please enter a Verify Token first');
      return;
    }

    setIsSavingCredentials(true);
    try {
      // Use dedicated endpoint for webhook credentials
      await api.post('/facebook/webhook-credentials', {
        appId: appId || undefined,
        appSecret: appSecret || undefined,
        verifyToken: verifyToken,
      });

      setCredentialsSaved(true);
      toast.success('Credentials saved! Now configure webhook in Facebook Developer Console');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save credentials');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  const loadForms = async (pageId: string, token?: string) => {
    const tokenToUse = token || accessToken;
    if (!tokenToUse) {
      console.log('No access token available, skipping forms load');
      return;
    }
    setIsLoadingForms(true);
    try {
      const response = await api.get(`/facebook/pages/${pageId}/forms`, {
        params: { accessToken: tokenToUse },
      });
      const loadedForms = response.data.data || [];
      setForms(loadedForms);
      console.log(`Loaded ${loadedForms.length} forms for page ${pageId}`);
    } catch (error: any) {
      console.error('Error loading forms:', error.response?.data || error.message);
      // 403 means no forms exist yet or page needs to be linked - this is okay
      if (error.response?.status === 500 || error.response?.status === 403) {
        setForms([]);
        console.log('No lead forms found - this is normal for new pages');
      } else {
        toast.error('Failed to load lead forms');
      }
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
      const payload = {
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        // App credentials (per-organization)
        appId: appId || undefined,
        appSecret: appSecret || undefined,
        verifyToken: verifyToken || undefined,
        accessToken,
        selectedLeadForms: selectedForms.map((id) => {
          const form = forms.find((f) => f.id === id);
          return { id, name: form?.name };
        }),
        fieldMapping,
      };

      // Update existing or create new
      if (existingIntegrationId) {
        await api.put(`/facebook/integrations/${existingIntegrationId}`, payload);
      } else {
        await api.post('/facebook/integrations', payload);
      }

      toast.success('Facebook integration saved!');
      navigate('/ad-integrations');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    // Load forms when page is selected and we have an access token
    if (selectedPage && accessToken) {
      loadForms(selectedPage.id, accessToken);
    }
  }, [selectedPage, accessToken]);

  useEffect(() => {
    if (currentStep === 3) loadFormFields();
  }, [currentStep, selectedForms]);

  useEffect(() => {
    if (currentStep === 4) loadWebhookInfo();
  }, [currentStep]);

  const canProceed = () => {
    switch (currentStep) {
      case 1: return connectionValid;
      case 2: return selectedPage !== null; // Allow proceeding without forms (forms are optional)
      case 3: return true; // Field mapping is optional if no forms
      case 4: return true;
      default: return false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="max-w-3xl mx-auto">
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
            <div className="space-y-5">
              <h3 className="text-lg font-semibold text-slate-900">Connect Your Facebook Account</h3>

              {/* First-time Setup Guide — collapsible prerequisites */}
              <div className="border border-indigo-200 bg-indigo-50 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowSetupGuide((v) => !v)}
                  className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-indigo-100 transition"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                    <LightBulbIcon className="w-5 h-5" />
                    First time here? Read this before you fill the form
                  </span>
                  {showSetupGuide
                    ? <ChevronDownIcon className="w-4 h-4 text-indigo-700" />
                    : <ChevronRightIcon className="w-4 h-4 text-indigo-700" />}
                </button>
                {showSetupGuide && (
                  <div className="px-4 pb-4 pt-1 border-t border-indigo-200 text-sm text-slate-700 space-y-4">
                    <p className="text-indigo-900">
                      Connecting Facebook Lead Ads needs a one-time, ~30-minute setup on Meta's side.
                      You'll create a free "Meta Developer App" tied to your Facebook Page, copy a
                      few credentials, and paste them below. Follow these 5 steps in order:
                    </p>

                    <ol className="space-y-3 list-decimal pl-5">
                      <li>
                        <span className="font-medium">Create a Meta Developer Account</span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Use the same Facebook account that admins your business Page.
                        </p>
                        <a
                          href="https://developers.facebook.com/async/registration"
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-700 hover:underline text-xs mt-1"
                        >
                          Open Meta Developer signup
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      </li>

                      <li>
                        <span className="font-medium">Create a new App</span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Click <span className="font-medium">"Create App"</span> → choose
                          <span className="font-medium"> "Business"</span> as the type → name it
                          something like <span className="font-mono bg-white px-1 rounded border">"YourBrand CRM"</span>.
                        </p>
                        <a
                          href="https://developers.facebook.com/apps/creation/"
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-700 hover:underline text-xs mt-1"
                        >
                          Open Create App page
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      </li>

                      <li>
                        <span className="font-medium">Add the Lead Ads use case to your App</span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          On the App Dashboard, click <span className="font-medium">"Add use cases"</span> (top-right). The <span className="font-medium">"Add more use cases"</span> dialog opens with a <span className="font-medium">"Filter by"</span> panel on the left:
                        </p>
                        <ol className="text-xs text-slate-600 mt-1 ml-2 list-decimal list-inside space-y-0.5">
                          <li>Click <span className="font-medium">"Ads and monetization (6)"</span> in the Filter panel (the default "Featured (3)" doesn't show it).</li>
                          <li>Tick the checkbox next to <span className="font-medium">"Capture &amp; manage ad leads with Marketing API"</span> — described as <span className="italic">"Give potential customers a quick and safe way to sign up to get info about your business or products."</span></li>
                          <li>Click <span className="font-medium">"Add use case"</span> at the bottom of the dialog.</li>
                          <li>You'll land on the use case page. Click <span className="font-medium">"Customize"</span> and make sure these permissions are enabled: <span className="font-mono bg-white px-1 rounded border text-[10px]">pages_show_list</span>, <span className="font-mono bg-white px-1 rounded border text-[10px]">leads_retrieval</span>, <span className="font-mono bg-white px-1 rounded border text-[10px]">pages_manage_metadata</span>, <span className="font-mono bg-white px-1 rounded border text-[10px]">pages_read_engagement</span>.</li>
                        </ol>
                        <p className="text-xs text-slate-600 mt-2">
                          <span className="font-medium">Webhooks setup</span> (for real-time lead delivery): this no longer appears as a separate "Add Products" item. Inside the use case page, scroll to <span className="font-medium">"Webhooks"</span> or open <span className="font-medium">App Settings → Webhooks</span> in the sidebar — that's where you'll paste the Callback URL and Verify Token from Step 4 of this wizard.
                        </p>
                        <p className="text-xs text-slate-500 mt-1 italic">
                          Older apps may still show an "Add Products" sidebar. In that case add <span className="font-medium">Webhooks</span>, <span className="font-medium">Facebook Login for Business</span>, and <span className="font-medium">Lead Ads</span> as separate products instead.
                        </p>
                      </li>

                      <li>
                        <span className="font-medium">Get your App ID, App Secret, and Page Access Token</span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          App ID + Secret are in <span className="font-medium">App Settings → Basic</span>.
                          Page Access Token comes from <span className="font-medium">Business Settings → System Users</span>{' '}
                          (best for permanent tokens) or temporarily from{' '}
                          <a
                            href="https://developers.facebook.com/tools/explorer/"
                            target="_blank" rel="noopener noreferrer"
                            className="text-indigo-700 hover:underline inline-flex items-center gap-1"
                          >
                            Graph API Explorer <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                          </a>.
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          Required permissions when generating the token:{' '}
                          <code className="bg-white px-1 rounded border">pages_show_list</code>,{' '}
                          <code className="bg-white px-1 rounded border">leads_retrieval</code>,{' '}
                          <code className="bg-white px-1 rounded border">pages_manage_metadata</code>,{' '}
                          <code className="bg-white px-1 rounded border">pages_read_engagement</code>.
                        </p>
                      </li>

                      <li>
                        <span className="font-medium">Fill in the form below and continue</span>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Paste your App ID, App Secret, and Page Access Token, then click
                          <span className="font-medium"> "Test Connection"</span>. We'll list your Pages
                          and you can pick the one running ads. Webhook setup happens in Step 4.
                        </p>
                      </li>
                    </ol>

                    <div className="bg-white border border-indigo-200 rounded p-3 text-xs text-slate-700">
                      <span className="font-medium text-indigo-900">Stuck?</span>{' '}
                      Most customers complete this in one screenshare with our team. Reach out to
                      <span className="font-medium"> support@myleadx.ai</span> and we'll walk you through it.
                    </div>
                  </div>
                )}
              </div>

              {/* App Credentials Section */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-medium text-blue-800 mb-3">Facebook App Credentials (from developers.facebook.com)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">App ID</label>
                    <input
                      type="text"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Your Facebook App ID"
                    />
                    <details className="mt-1">
                      <summary className="text-xs text-indigo-700 cursor-pointer hover:underline">
                        Where do I find this?
                      </summary>
                      <div className="text-xs text-slate-600 mt-1 pl-2 leading-5">
                        Go to your{' '}
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                          Meta Apps Dashboard
                        </a>{' '}
                        → click your App → look at the top of the page. It's a 16-digit number.
                      </div>
                    </details>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">App Secret</label>
                    <input
                      type="password"
                      value={appSecret}
                      onChange={(e) => setAppSecret(e.target.value)}
                      className="input w-full text-sm"
                      placeholder="Your Facebook App Secret"
                    />
                    <details className="mt-1">
                      <summary className="text-xs text-indigo-700 cursor-pointer hover:underline">
                        Where do I find this?
                      </summary>
                      <div className="text-xs text-slate-600 mt-1 pl-2 leading-5">
                        In your{' '}
                        <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline">
                          Meta App
                        </a>{' '}
                        → Settings → Basic → "App Secret" field → click "Show" → confirm with your password.
                        It's a 32-character string. Keep it secret.
                      </div>
                    </details>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Webhook Verify Token (auto-generated for you)</label>
                  <input
                    type="text"
                    value={verifyToken}
                    onChange={(e) => setVerifyToken(e.target.value)}
                    className="input w-full text-sm"
                    placeholder="e.g., my-secret-verify-token-123"
                  />
                  <p className="text-xs text-blue-600 mt-1">This token is used when setting up webhooks in Facebook Developer Console</p>
                  <details className="mt-1">
                    <summary className="text-xs text-indigo-700 cursor-pointer hover:underline">
                      What is this for?
                    </summary>
                    <div className="text-xs text-slate-600 mt-1 pl-2 leading-5">
                      MyLeadX auto-generated this for you — a unique, per-tenant secret that proves Meta's webhook calls
                      actually came from your App. You'll paste this exact value into Facebook's Webhook config in Step 4. You can override it with your own random string if you prefer.
                    </div>
                  </details>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={saveCredentialsForWebhook}
                    disabled={isSavingCredentials || !verifyToken.trim()}
                    className="btn btn-secondary text-sm"
                  >
                    {isSavingCredentials ? (
                      <span className="spinner"></span>
                    ) : credentialsSaved ? (
                      <>
                        <CheckIcon className="w-4 h-4 text-green-600" />
                        <span className="text-green-700">Saved for Webhook</span>
                      </>
                    ) : (
                      'Save for Webhook Setup'
                    )}
                  </button>
                  {credentialsSaved && (
                    <span className="text-xs text-green-600">Now verify webhook in Facebook Developer Console</span>
                  )}
                </div>
              </div>

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
                <label className="block text-sm font-medium text-slate-700 mb-2">Page Access Token</label>
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
                <details className="mt-2">
                  <summary className="text-xs text-indigo-700 cursor-pointer hover:underline">
                    How do I generate this token?
                  </summary>
                  <div className="text-xs text-slate-600 mt-2 pl-2 leading-5 space-y-2">
                    <p>
                      <span className="font-medium text-slate-800">Recommended (permanent token via System User):</span>
                    </p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>
                        Open{' '}
                        <a href="https://business.facebook.com/settings/system-users" target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline inline-flex items-center gap-1">
                          Business Settings → System Users
                          <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                        </a>
                      </li>
                      <li>Click <span className="font-medium">"Add"</span> → name it (e.g., "MyLeadX Integration") → role <span className="font-medium">"Admin"</span></li>
                      <li>
                        Assign your Facebook Page to this System User with{' '}
                        <span className="font-medium">"Manage Page"</span> + <span className="font-medium">"Lead Access"</span> permissions
                      </li>
                      <li>Click <span className="font-medium">"Generate New Token"</span> → pick your App → set expiry to <span className="font-medium">"Never"</span></li>
                      <li>
                        Check these permission boxes:{' '}
                        <code className="bg-white px-1 rounded border">pages_show_list</code>,{' '}
                        <code className="bg-white px-1 rounded border">leads_retrieval</code>,{' '}
                        <code className="bg-white px-1 rounded border">pages_manage_metadata</code>,{' '}
                        <code className="bg-white px-1 rounded border">pages_read_engagement</code>
                      </li>
                      <li>Copy the long token string (starts with <code className="bg-white px-1 rounded border">EAAB...</code>) and paste it above</li>
                    </ol>
                    <p className="mt-3 pt-2 border-t border-slate-200">
                      <span className="font-medium text-slate-800">Quick alternative (60-day token via Graph Explorer):</span>{' '}
                      Use the{' '}
                      <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer" className="text-indigo-700 hover:underline inline-flex items-center gap-1">
                        Graph API Explorer
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                      </a>{' '}
                      → select your App → "Get Token" → "Get Page Access Token" → check the same permissions above.
                      Faster but the token expires in 60 days. Only use this for testing.
                    </p>
                  </div>
                </details>
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
              {selectedForms.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <Cog6ToothIcon className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="text-slate-600 mt-2">No lead forms selected</p>
                  <p className="text-sm text-slate-500 mt-1">You can skip this step and configure field mapping later when you create Lead Forms on Facebook.</p>
                </div>
              ) : formFields.length === 0 ? (
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
