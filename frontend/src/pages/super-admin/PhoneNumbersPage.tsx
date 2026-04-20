/**
 * Super Admin Phone Numbers Page
 * Track phone number usage across all tenants by provider
 */
import { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import {
  PhoneIcon,
  ArrowPathIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface PhoneNumberAnalytics {
  totalNumbers: number;
  byProvider: Array<{ provider: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  bySource: Array<{ source: string; count: number }>;
  topTenants: Array<{ organizationId: string; organizationName: string; numberCount: number }>;
}

interface PhoneNumber {
  id: string;
  number: string;
  displayNumber: string;
  friendlyName: string;
  provider: string;
  status: string;
  source: string;
  organization?: { name: string };
  assignedAgent?: { name: string };
  createdAt: string;
}

interface ProviderUsage {
  organizationId: string;
  organizationName: string;
  EXOTEL?: number;
  PLIVO?: number;
  MANUAL?: number;
  total: number;
}

const getProviderColor = (provider: string) => {
  const colors: Record<string, string> = {
    EXOTEL: 'bg-blue-100 text-blue-800',
    PLIVO: 'bg-purple-100 text-purple-800',
    MANUAL: 'bg-slate-100 text-slate-800',
    TWILIO: 'bg-red-100 text-red-800',
  };
  return colors[provider] || 'bg-slate-100 text-slate-800';
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    ASSIGNED: 'bg-green-100 text-green-800',
    AVAILABLE: 'bg-blue-100 text-blue-800',
    RELEASED: 'bg-red-100 text-red-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
  };
  return colors[status] || 'bg-slate-100 text-slate-800';
};

export default function PhoneNumbersPage() {
  const [analytics, setAnalytics] = useState<PhoneNumberAnalytics | null>(null);
  const [numbers, setNumbers] = useState<PhoneNumber[]>([]);
  const [providerUsage, setProviderUsage] = useState<ProviderUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [providerFilter, setProviderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchAnalytics();
    fetchProviderUsage();
  }, []);

  useEffect(() => {
    fetchNumbers();
  }, [providerFilter, statusFilter, page]);

  const fetchAnalytics = async () => {
    try {
      const res = await api.get('/super-admin/phone-numbers/analytics');
      setAnalytics(res.data.data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNumbers = async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (providerFilter) params.append('provider', providerFilter);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/super-admin/phone-numbers?${params}`);
      setNumbers(res.data.data.numbers || []);
    } catch (error) {
      console.error('Failed to fetch numbers:', error);
    }
  };

  const fetchProviderUsage = async () => {
    try {
      const res = await api.get('/super-admin/phone-numbers/provider-usage');
      setProviderUsage(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch provider usage:', error);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phone Numbers</h1>
          <p className="text-slate-500">Track phone number usage across all tenants</p>
        </div>
        <button
          onClick={() => {
            fetchAnalytics();
            fetchNumbers();
            fetchProviderUsage();
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Numbers */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Numbers</p>
              <p className="text-3xl font-bold text-slate-900">{analytics?.totalNumbers || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <PhoneIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* By Provider */}
        {analytics?.byProvider?.map((p) => (
          <div key={p.provider} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm">{p.provider}</p>
                <p className="text-3xl font-bold text-slate-900">{p.count}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                p.provider === 'EXOTEL' ? 'bg-blue-100' :
                p.provider === 'PLIVO' ? 'bg-purple-100' : 'bg-slate-100'
              }`}>
                <GlobeAltIcon className={`w-6 h-6 ${
                  p.provider === 'EXOTEL' ? 'text-blue-600' :
                  p.provider === 'PLIVO' ? 'text-purple-600' : 'text-slate-600'
                }`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-slate-100 p-1">
          {['Provider Usage by Tenant', 'All Phone Numbers', 'Top Tenants'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors
                ${selected
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-4">
          {/* Provider Usage by Tenant */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Provider Usage by Tenant</h3>
                <p className="text-sm text-slate-500">See which providers each tenant is using</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Exotel</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Plivo</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Manual</th>
                      <th className="text-center py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {providerUsage.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          No phone numbers found
                        </td>
                      </tr>
                    ) : (
                      providerUsage.map((usage) => (
                        <tr key={usage.organizationId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                <BuildingOffice2Icon className="w-4 h-4 text-slate-500" />
                              </div>
                              <span className="font-medium text-slate-900">{usage.organizationName}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {usage.EXOTEL ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {usage.EXOTEL}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {usage.PLIVO ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {usage.PLIVO}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {usage.MANUAL ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                                {usage.MANUAL}
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold text-slate-900">{usage.total}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tab.Panel>

          {/* All Phone Numbers */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">All Phone Numbers</h3>
                <div className="flex items-center gap-2">
                  <select
                    value={providerFilter}
                    onChange={(e) => {
                      setProviderFilter(e.target.value);
                      setPage(1);
                    }}
                    className="text-sm border-slate-300 rounded-md"
                  >
                    <option value="">All Providers</option>
                    <option value="EXOTEL">Exotel</option>
                    <option value="PLIVO">Plivo</option>
                    <option value="MANUAL">Manual</option>
                  </select>
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                    className="text-sm border-slate-300 rounded-md"
                  >
                    <option value="">All Status</option>
                    <option value="ASSIGNED">Assigned</option>
                    <option value="AVAILABLE">Available</option>
                    <option value="RELEASED">Released</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Number</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Provider</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Assigned To</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {numbers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No phone numbers found
                        </td>
                      </tr>
                    ) : (
                      numbers.map((num) => (
                        <tr key={num.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center">
                                <PhoneIcon className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <p className="font-mono text-sm font-medium text-slate-900">
                                  {num.displayNumber || num.number}
                                </p>
                                {num.friendlyName && (
                                  <p className="text-xs text-slate-500">{num.friendlyName}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-900">
                            {num.organization?.name || 'N/A'}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getProviderColor(num.provider)}`}>
                              {num.provider}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(num.status)}`}>
                              {num.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">
                            {num.assignedAgent?.name || '-'}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {formatDate(num.createdAt)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={numbers.length < 20}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* Top Tenants */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Top Tenants by Number Count</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {analytics?.topTenants?.map((tenant, idx) => (
                  <div key={tenant.organizationId} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-sm font-bold text-purple-600">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{tenant.organizationName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{tenant.numberCount}</p>
                      <p className="text-xs text-slate-500">numbers</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Status & Source Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Numbers by Status</h3>
          <div className="space-y-3">
            {analytics?.byStatus?.map((s) => (
              <div key={s.status} className="flex items-center justify-between">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                  {s.status}
                </span>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By Source */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-semibold text-slate-900 mb-4">Numbers by Source</h3>
          <div className="space-y-3">
            {analytics?.bySource?.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    s.source === 'PLATFORM' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {s.source}
                  </span>
                  <span className="text-xs text-slate-500">
                    {s.source === 'PLATFORM' ? '(MyLeadX provided)' : '(Bring Your Own)'}
                  </span>
                </div>
                <span className="font-semibold text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
