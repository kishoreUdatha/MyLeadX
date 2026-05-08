import { useState, useEffect } from 'react';
import {
  LinkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BuildingOffice2Icon,
  SignalIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface IntegrationOverview {
  byType: Record<string, number>;
  orgsWithIntegrations: number;
  totalOrgs: number;
  adoptionRate: string;
}

interface Provider {
  name: string;
  type: string;
  status: string;
  configurable: boolean;
  activeConnections: number;
}

interface TenantIntegrations {
  id: string;
  name: string;
  slug: string;
  integrations: Array<{
    type: string;
    provider: string;
  }>;
}

interface HealthStatus {
  provider: string;
  status: string;
  latency: number;
  lastChecked: string;
}

export default function IntegrationsPage() {
  const [overview, setOverview] = useState<IntegrationOverview | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [tenants, setTenants] = useState<TenantIntegrations[]>([]);
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'providers' | 'tenants' | 'health'>('providers');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'tenants') {
      fetchTenants();
    }
  }, [page, activeTab]);

  const fetchData = async () => {
    try {
      const [overviewRes, providersRes, healthRes] = await Promise.all([
        api.get('/super-admin/integrations/overview'),
        api.get('/super-admin/integrations/providers'),
        api.get('/super-admin/integrations/health'),
      ]);
      setOverview(overviewRes.data.data);
      setProviders(providersRes.data.data || []);
      setHealth(healthRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch integrations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/super-admin/integrations/tenants', {
        params: { page, limit: 10 },
      });
      setTenants(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tenant integrations:', error);
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'messaging':
      case 'social':
        return <LinkIcon className="w-6 h-6 text-green-500" />;
      case 'telephony':
        return <SignalIcon className="w-6 h-6 text-blue-500" />;
      case 'ai':
      case 'voice':
        return <SignalIcon className="w-6 h-6 text-purple-500" />;
      default:
        return <LinkIcon className="w-6 h-6 text-slate-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
        <p className="text-slate-500">Manage third-party integrations across the platform</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <LinkIcon className="w-10 h-10 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">Total Integrations</p>
              <p className="text-2xl font-bold text-slate-900">
                {Object.values(overview?.byType || {}).reduce((a, b) => a + b, 0)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="w-10 h-10 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">Orgs with Integrations</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.orgsWithIntegrations || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <BuildingOffice2Icon className="w-10 h-10 text-slate-400" />
            <div>
              <p className="text-sm text-slate-500">Total Organizations</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.totalOrgs || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">Adoption Rate</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.adoptionRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['providers', 'tenants', 'health'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'providers' ? 'Providers' : tab === 'tenants' ? 'Tenant Status' : 'Health Checks'}
              </button>
            ))}
          </div>
        </div>

        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <div key={provider.name} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getProviderIcon(provider.type)}
                      <div>
                        <h3 className="font-semibold text-slate-900">{provider.name}</h3>
                        <p className="text-sm text-slate-500 capitalize">{provider.type}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      provider.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {provider.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-sm text-slate-500">Active Connections</span>
                    <span className="font-semibold text-slate-900">{provider.activeConnections}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tenants Tab */}
        {activeTab === 'tenants' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Active Integrations</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-slate-900">{tenant.name}</p>
                          <p className="text-xs text-slate-500">{tenant.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {tenant.integrations.map((int, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded"
                            >
                              {int.provider || int.type}
                            </span>
                          ))}
                          {tenant.integrations.length === 0 && (
                            <span className="text-slate-400">None</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-slate-700">
                        {tenant.integrations.length}
                      </td>
                    </tr>
                  ))}
                  {tenants.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-500">
                        No tenants found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Health Tab */}
        {activeTab === 'health' && (
          <div className="p-6">
            <div className="space-y-4">
              {health.map((item) => (
                <div
                  key={item.provider}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {item.status === 'healthy' ? (
                      <CheckCircleIcon className="w-6 h-6 text-green-500" />
                    ) : (
                      <ExclamationCircleIcon className="w-6 h-6 text-red-500" />
                    )}
                    <div>
                      <h4 className="font-medium text-slate-900">{item.provider}</h4>
                      <p className="text-sm text-slate-500">
                        Last checked: {new Date(item.lastChecked).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.status === 'healthy'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {item.status}
                    </span>
                    <p className="text-sm text-slate-500 mt-1">{item.latency}ms</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
