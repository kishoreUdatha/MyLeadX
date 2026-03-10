import { useState, useEffect } from 'react';
import {
  DocumentDuplicateIcon,
  CheckIcon,
  CodeBracketIcon,
  GlobeAltIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface SourceAnalytics {
  source: string;
  count: number;
  conversions: number;
  conversionRate: number;
}

interface CampaignAnalytics {
  campaign: string;
  source: string;
  medium: string;
  leads: number;
  conversions: number;
  revenue: number;
}

type ActiveTab = 'pixel' | 'form' | 'sources' | 'campaigns';

export default function LeadTrackingPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pixel');
  const [pixelCode, setPixelCode] = useState('');
  const [formCode, setFormCode] = useState('');
  const [sourceAnalytics, setSourceAnalytics] = useState<SourceAnalytics[]>([]);
  const [campaignAnalytics, setCampaignAnalytics] = useState<CampaignAnalytics[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'pixel' | 'form' | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });

  // Form customization options
  const [formOptions, setFormOptions] = useState({
    title: 'Get in Touch',
    fields: 'firstName,lastName,email,phone',
    buttonText: 'Submit',
    successMessage: 'Thank you! We will contact you soon.',
    theme: 'light' as 'light' | 'dark',
  });

  useEffect(() => {
    fetchPixelCode();
    fetchFormCode();
    fetchSourceAnalytics();
    fetchCampaignAnalytics();
  }, []);

  useEffect(() => {
    fetchFormCode();
  }, [formOptions]);

  useEffect(() => {
    if (activeTab === 'sources') {
      fetchSourceAnalytics();
    } else if (activeTab === 'campaigns') {
      fetchCampaignAnalytics();
    }
  }, [dateRange]);

  const fetchPixelCode = async () => {
    try {
      const response = await api.get('/tracking/pixel-code');
      setPixelCode(response.data.data.pixelCode);
    } catch (error) {
      console.error('Error fetching pixel code:', error);
    }
  };

  const fetchFormCode = async () => {
    try {
      const params = new URLSearchParams({
        title: formOptions.title,
        fields: formOptions.fields,
        buttonText: formOptions.buttonText,
        successMessage: formOptions.successMessage,
        theme: formOptions.theme,
      });
      const response = await api.get(`/tracking/form-code?${params}`);
      setFormCode(response.data.data.formCode);
    } catch (error) {
      console.error('Error fetching form code:', error);
    }
  };

  const fetchSourceAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tracking/sources', {
        params: dateRange,
      });
      setSourceAnalytics(response.data.data.sources || []);
    } catch (error) {
      console.error('Error fetching source analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCampaignAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.get('/tracking/campaigns', {
        params: dateRange,
      });
      setCampaignAnalytics(response.data.data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaign analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'pixel' | 'form') => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const tabs = [
    { id: 'pixel' as const, name: 'Tracking Pixel', icon: CodeBracketIcon },
    { id: 'form' as const, name: 'Lead Form', icon: ClipboardDocumentIcon },
    { id: 'sources' as const, name: 'Source Analytics', icon: GlobeAltIcon },
    { id: 'campaigns' as const, name: 'Campaign Performance', icon: ChartBarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Lead Tracking</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track leads from ads, landing pages, and websites. Get pixel code and embed forms.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {/* Tracking Pixel Tab */}
        {activeTab === 'pixel' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Tracking Pixel</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add this code to your website to track visitors and capture leads from all traffic sources.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-gray-700">Installation Code</h4>
                <button
                  onClick={() => copyToClipboard(pixelCode, 'pixel')}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  {copied === 'pixel' ? (
                    <>
                      <CheckIcon className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <DocumentDuplicateIcon className="h-4 w-4" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                {pixelCode || 'Loading...'}
              </pre>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Instructions</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                <li>Copy the tracking code above</li>
                <li>Paste it in the &lt;head&gt; section of your website</li>
                <li>The pixel automatically tracks page views and UTM parameters</li>
                <li>Use <code className="bg-gray-100 px-1 rounded">window.CRMCaptureLead(&#123;email, phone, firstName, lastName&#125;)</code> to capture leads</li>
              </ol>
            </div>

            <div className="border-t pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-4">Supported Ad Platforms</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {['Facebook Ads', 'Instagram Ads', 'Google Ads', 'YouTube Ads'].map((platform) => (
                  <div key={platform} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <GlobeAltIcon className="h-5 w-5 text-indigo-500" />
                    <span className="text-sm text-gray-700">{platform}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                UTM parameters from all platforms are automatically tracked when visitors arrive at your site.
              </p>
            </div>
          </div>
        )}

        {/* Lead Form Tab */}
        {activeTab === 'form' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Embeddable Lead Form</h3>
              <p className="mt-1 text-sm text-gray-500">
                Customize and embed this form on your website or landing pages to capture leads.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Customization Options */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-900">Customize Form</h4>

                <div>
                  <label className="block text-sm text-gray-700">Form Title</label>
                  <input
                    type="text"
                    value={formOptions.title}
                    onChange={(e) => setFormOptions({ ...formOptions, title: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Fields (comma-separated)</label>
                  <input
                    type="text"
                    value={formOptions.fields}
                    onChange={(e) => setFormOptions({ ...formOptions, fields: e.target.value })}
                    placeholder="firstName,lastName,email,phone,company,message"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Available: firstName, lastName, email, phone, company, message
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Button Text</label>
                  <input
                    type="text"
                    value={formOptions.buttonText}
                    onChange={(e) => setFormOptions({ ...formOptions, buttonText: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Success Message</label>
                  <input
                    type="text"
                    value={formOptions.successMessage}
                    onChange={(e) => setFormOptions({ ...formOptions, successMessage: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700">Theme</label>
                  <select
                    value={formOptions.theme}
                    onChange={(e) => setFormOptions({ ...formOptions, theme: e.target.value as 'light' | 'dark' })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              {/* Code Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">Embed Code</h4>
                  <button
                    onClick={() => copyToClipboard(formCode, 'form')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    {copied === 'form' ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <DocumentDuplicateIcon className="h-4 w-4" />
                        Copy Code
                      </>
                    )}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs max-h-80 overflow-y-auto">
                  {formCode || 'Loading...'}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Source Analytics Tab */}
        {activeTab === 'sources' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Lead Source Analytics</h3>
                <p className="mt-1 text-sm text-gray-500">
                  See where your leads are coming from across all channels.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={fetchSourceAnalytics}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Source</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Leads</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Conversions</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Conversion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sourceAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                        No data available for the selected date range
                      </td>
                    </tr>
                  ) : (
                    sourceAnalytics.map((source, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 capitalize">
                          {source.source?.replace(/_/g, ' ') || 'Direct'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{source.count}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{source.conversions}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {source.conversionRate?.toFixed(1)}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Campaign Performance Tab */}
        {activeTab === 'campaigns' && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Campaign Performance</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Track performance of your ad campaigns across all platforms.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
                <button
                  onClick={fetchCampaignAnalytics}
                  className="inline-flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Campaign</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Source</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Medium</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Leads</th>
                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Conversions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {campaignAnalytics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                        No campaign data available for the selected date range
                      </td>
                    </tr>
                  ) : (
                    campaignAnalytics.map((campaign, index) => (
                      <tr key={index}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">
                          {campaign.campaign || '(not set)'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 capitalize">
                          {campaign.source || 'direct'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {campaign.medium || '(not set)'}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{campaign.leads}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{campaign.conversions}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-sm font-medium text-blue-800 mb-2">How Lead Tracking Works</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
          <li>Install the tracking pixel on your website to track all visitors</li>
          <li>UTM parameters from Facebook, Instagram, Google, and YouTube ads are automatically captured</li>
          <li>When a visitor fills out a form or becomes a lead, they are linked to their ad source</li>
          <li>Use the analytics tabs to see which sources and campaigns are generating the most leads</li>
          <li>For Facebook/Instagram Lead Ads, configure the webhook URL in your Meta Business Manager</li>
        </ul>
      </div>
    </div>
  );
}
