import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  TrashIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

interface Integration {
  id: string;
  isActive: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  // Platform-specific fields
  pageId?: string;
  pageName?: string;
  instagramUsername?: string;
  adAccountId?: string;
  adAccountName?: string;
  customerId?: string;
  customerName?: string;
}

interface PlatformConfig {
  key: string;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  icon: string;
  setupPath: string;
  apiEndpoint: string;
}

const platforms: PlatformConfig[] = [
  {
    key: 'facebook',
    name: 'Facebook',
    description: 'Connect Facebook Lead Ads to capture leads from Facebook campaigns',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: 'FB',
    setupPath: '/facebook-setup',
    apiEndpoint: '/facebook/integrations',
  },
  {
    key: 'instagram',
    name: 'Instagram',
    description: 'Connect Instagram Lead Ads to capture leads from Instagram campaigns',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
    icon: 'IG',
    setupPath: '/instagram-setup',
    apiEndpoint: '/instagram/integrations',
  },
  {
    key: 'linkedin',
    name: 'LinkedIn',
    description: 'Connect LinkedIn Lead Gen Forms to capture B2B leads',
    color: 'text-sky-600',
    bgColor: 'bg-sky-100',
    icon: 'LI',
    setupPath: '/linkedin-setup',
    apiEndpoint: '/linkedin/integrations',
  },
  {
    key: 'google',
    name: 'Google Ads',
    description: 'Connect Google Ads Lead Form Extensions to capture search leads',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: 'G',
    setupPath: '/google-ads-setup',
    apiEndpoint: '/google-ads/integrations',
  },
];

export default function AdIntegrationsPage() {
  const navigate = useNavigate();
  const [integrations, setIntegrations] = useState<Record<string, Integration[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const results: Record<string, Integration[]> = {};

      await Promise.all(
        platforms.map(async (platform) => {
          try {
            const response = await api.get(platform.apiEndpoint);
            results[platform.key] = response.data.data || [];
          } catch (error) {
            results[platform.key] = [];
          }
        })
      );

      setIntegrations(results);
    } catch (error) {
      toast.error('Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (platform: PlatformConfig, integrationId: string) => {
    if (!confirm('Are you sure you want to delete this integration?')) return;

    setDeletingId(integrationId);
    try {
      await api.delete(`${platform.apiEndpoint}/${integrationId}`);
      toast.success('Integration deleted');
      loadIntegrations();
    } catch (error) {
      toast.error('Failed to delete integration');
    } finally {
      setDeletingId(null);
    }
  };

  const getIntegrationLabel = (platform: PlatformConfig, integration: Integration): string => {
    if (platform.key === 'facebook' || platform.key === 'instagram') {
      return integration.pageName || integration.instagramUsername || integration.pageId || 'Connected';
    }
    if (platform.key === 'linkedin') {
      return integration.adAccountName || integration.adAccountId || 'Connected';
    }
    if (platform.key === 'google') {
      return integration.customerName || integration.customerId || 'Connected';
    }
    return 'Connected';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ad Platform Integrations</h1>
          <p className="text-slate-500 mt-1">
            Connect your ad platforms to automatically capture leads into your CRM
          </p>
        </div>
        <button onClick={loadIntegrations} className="btn btn-secondary">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Platform Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {platforms.map((platform) => {
          const platformIntegrations = integrations[platform.key] || [];
          const hasIntegration = platformIntegrations.length > 0;

          return (
            <div key={platform.key} className="card">
              <div className="card-body">
                {/* Platform Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${platform.bgColor}`}>
                      <span className={`text-lg font-bold ${platform.color}`}>
                        {platform.icon}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{platform.name}</h3>
                      <p className="text-sm text-slate-500">{platform.description}</p>
                    </div>
                  </div>
                  {hasIntegration ? (
                    <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircleIcon className="h-4 w-4" />
                      Connected
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      <XCircleIcon className="h-4 w-4" />
                      Not Connected
                    </span>
                  )}
                </div>

                {/* Integrations List */}
                {hasIntegration && (
                  <div className="space-y-2 mb-4">
                    {platformIntegrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {getIntegrationLabel(platform, integration)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {integration.lastSyncedAt
                              ? `Last synced: ${new Date(integration.lastSyncedAt).toLocaleString()}`
                              : `Added: ${new Date(integration.createdAt).toLocaleDateString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(platform.setupPath)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
                            title="Configure"
                          >
                            <Cog6ToothIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(platform, integration.id)}
                            disabled={deletingId === integration.id}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-100 rounded"
                            title="Delete"
                          >
                            {deletingId === integration.id ? (
                              <span className="spinner spinner-sm"></span>
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Integration Button */}
                <button
                  onClick={() => navigate(platform.setupPath)}
                  className={`w-full btn ${hasIntegration ? 'btn-secondary' : 'btn-primary'}`}
                >
                  <PlusIcon className="h-4 w-4" />
                  {hasIntegration ? 'Add Another Account' : `Connect ${platform.name}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help Section */}
      <div className="card bg-slate-50">
        <div className="card-body">
          <h3 className="font-semibold text-slate-900 mb-3">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                1
              </span>
              <div>
                <p className="font-medium text-slate-900">Connect Your Ad Account</p>
                <p className="text-slate-500">Enter your access token or OAuth credentials</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                2
              </span>
              <div>
                <p className="font-medium text-slate-900">Select Lead Forms</p>
                <p className="text-slate-500">Choose which lead forms to track</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-medium">
                3
              </span>
              <div>
                <p className="font-medium text-slate-900">Map Fields & Go Live</p>
                <p className="text-slate-500">Map form fields to CRM and start capturing leads</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
