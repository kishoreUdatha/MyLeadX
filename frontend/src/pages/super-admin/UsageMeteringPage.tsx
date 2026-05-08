import { useState, useEffect } from 'react';
import {
  CircleStackIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface UsageOverview {
  totals: {
    aiCalls: number;
    aiMinutes: number;
    sms: number;
    emails: number;
    whatsapp: number;
    leads: number;
  };
  tenantsWithUsage: number;
  tenantsNearLimits: number;
  month: number;
  year: number;
}

interface TenantUsage {
  id: string;
  organizationId: string;
  aiCalls: number;
  aiMinutes: number;
  smsCount: number;
  emailCount: number;
  whatsappCount: number;
  leadsCreated: number;
  organization: {
    id: string;
    name: string;
    slug: string;
    activePlan?: { name: string; slug: string };
  };
}

interface UsageTrend {
  month: number;
  year: number;
  label: string;
  aiCalls: number;
  aiMinutes: number;
  sms: number;
  emails: number;
  whatsapp: number;
  leads: number;
}

export default function UsageMeteringPage() {
  const [overview, setOverview] = useState<UsageOverview | null>(null);
  const [tenants, setTenants] = useState<TenantUsage[]>([]);
  const [trends, setTrends] = useState<UsageTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchTenants();
  }, [search, page]);

  const fetchData = async () => {
    try {
      const [overviewRes, trendsRes] = await Promise.all([
        api.get('/super-admin/usage/overview'),
        api.get('/super-admin/usage/trends?months=6'),
      ]);
      setOverview(overviewRes.data.data);
      setTrends(trendsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const res = await api.get('/super-admin/usage/tenants', {
        params: { page, limit: 10, search: search || undefined },
      });
      setTenants(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch tenant usage:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const statCards = [
    { label: 'AI Calls', value: overview?.totals.aiCalls || 0, icon: PhoneIcon, color: 'purple' },
    { label: 'AI Minutes', value: overview?.totals.aiMinutes || 0, icon: CircleStackIcon, color: 'blue' },
    { label: 'SMS Sent', value: overview?.totals.sms || 0, icon: ChatBubbleLeftRightIcon, color: 'green' },
    { label: 'Emails Sent', value: overview?.totals.emails || 0, icon: EnvelopeIcon, color: 'amber' },
    { label: 'WhatsApp', value: overview?.totals.whatsapp || 0, icon: ChatBubbleLeftRightIcon, color: 'emerald' },
    { label: 'Leads Created', value: overview?.totals.leads || 0, icon: UserGroupIcon, color: 'indigo' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Usage & Metering</h1>
        <p className="text-slate-500">Monitor platform usage across all tenants</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 text-${stat.color}-500`} />
              <div>
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className="text-xl font-bold text-slate-900">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert for tenants near limits */}
      {overview && overview.tenantsNearLimits > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
          <div>
            <p className="font-medium text-amber-800">
              {overview.tenantsNearLimits} tenant(s) approaching usage limits
            </p>
            <p className="text-sm text-amber-600">Consider reaching out about plan upgrades</p>
          </div>
        </div>
      )}

      {/* Usage Trends */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-slate-900">Usage Trends (Last 6 Months)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-500 font-medium">Month</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">AI Calls</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">AI Minutes</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">SMS</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Emails</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">WhatsApp</th>
                <th className="text-right py-2 px-3 text-slate-500 font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {trends.map((trend) => (
                <tr key={`${trend.year}-${trend.month}`} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-2 px-3 font-medium text-slate-900">{trend.label}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.aiCalls.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.aiMinutes.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.sms.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.emails.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.whatsapp.toLocaleString()}</td>
                  <td className="text-right py-2 px-3 text-slate-700">{trend.leads.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant Usage Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Tenant Usage</h2>
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                <th className="text-left py-3 px-4 text-slate-500 font-medium">Plan</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">AI Calls</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">AI Minutes</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">SMS</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Emails</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">WhatsApp</th>
                <th className="text-right py-3 px-4 text-slate-500 font-medium">Leads</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-slate-900">{tenant.organization.name}</p>
                      <p className="text-xs text-slate-500">{tenant.organization.slug}</p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                      {tenant.organization.activePlan?.name || 'Free'}
                    </span>
                  </td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.aiCalls.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.aiMinutes.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.smsCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.emailCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.whatsappCount.toLocaleString()}</td>
                  <td className="text-right py-3 px-4 text-slate-700">{tenant.leadsCreated.toLocaleString()}</td>
                </tr>
              ))}
              {tenants.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No usage data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {page} of {totalPages}
            </span>
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
    </div>
  );
}
