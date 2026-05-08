import { useState, useEffect } from 'react';
import {
  CpuChipIcon,
  PhoneIcon,
  ClockIcon,
  CurrencyDollarIcon,
  SpeakerWaveIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  PauseCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface AIOverview {
  totalAICalls: number;
  totalAIMinutes: number;
  agentsByStatus: Record<string, number>;
  callsThisMonth: number;
  totalCallDuration: number;
  totalCallCost: number;
  avgCallDuration: number;
}

interface VoiceAgent {
  id: string;
  name: string;
  status: string;
  voiceId: string;
  modelId: string;
  createdAt: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  _count: {
    calls: number;
  };
}

interface AIModel {
  id: string;
  name: string;
  provider: string;
  costPer1kTokens: number;
}

interface Voice {
  id: string;
  name: string;
  provider: string;
  gender: string;
  language: string;
}

interface CostData {
  month: number;
  year: number;
  label: string;
  totalCost: number;
  callCount: number;
}

export default function AIControlPage() {
  const [overview, setOverview] = useState<AIOverview | null>(null);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [models, setModels] = useState<AIModel[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [costs, setCosts] = useState<CostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState<'agents' | 'models' | 'costs'>('agents');

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [search, statusFilter, page]);

  const fetchData = async () => {
    try {
      const [overviewRes, modelsRes, costsRes] = await Promise.all([
        api.get('/super-admin/ai/overview'),
        api.get('/super-admin/ai/models'),
        api.get('/super-admin/ai/costs?months=6'),
      ]);
      setOverview(overviewRes.data.data);
      setModels(modelsRes.data.data?.models || []);
      setVoices(modelsRes.data.data?.voices || []);
      setCosts(costsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch AI data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const res = await api.get('/super-admin/ai/agents', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setAgents(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'paused':
        return <PauseCircleIcon className="w-5 h-5 text-amber-500" />;
      default:
        return <XCircleIcon className="w-5 h-5 text-slate-400" />;
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
        <h1 className="text-2xl font-bold text-slate-900">AI Control</h1>
        <p className="text-slate-500">Manage AI and voice agent settings platform-wide</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <PhoneIcon className="w-10 h-10 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">Total AI Calls</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.totalAICalls.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-10 h-10 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">Total AI Minutes</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.totalAIMinutes.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <CpuChipIcon className="w-10 h-10 text-emerald-500" />
            <div>
              <p className="text-sm text-slate-500">Active Agents</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.agentsByStatus?.active || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <CurrencyDollarIcon className="w-10 h-10 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">Total Cost (This Month)</p>
              <p className="text-2xl font-bold text-slate-900">${overview?.totalCallCost.toFixed(2) || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['agents', 'models', 'costs'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'agents' ? 'Voice Agents' : tab === 'models' ? 'Models & Voices' : 'Cost Analytics'}
              </button>
            ))}
          </div>
        </div>

        {/* Agents Tab */}
        {activeTab === 'agents' && (
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Agent</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Total Calls</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CpuChipIcon className="w-5 h-5 text-purple-500" />
                          <span className="font-medium text-slate-900">{agent.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-slate-700">{agent.organization.name}</p>
                          <p className="text-xs text-slate-500">{agent.organization.slug}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(agent.status)}
                          <span className="capitalize text-slate-700">{agent.status}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-slate-700">{agent._count.calls}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(agent.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {agents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">
                        No agents found
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

        {/* Models Tab */}
        {activeTab === 'models' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">AI Models</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {models.map((model) => (
                  <div key={model.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-900">{model.name}</span>
                      <span className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded">{model.provider}</span>
                    </div>
                    <p className="text-sm text-slate-500">${model.costPer1kTokens} / 1k tokens</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Voice Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {voices.map((voice) => (
                  <div key={voice.id} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <SpeakerWaveIcon className="w-5 h-5 text-purple-500" />
                      <span className="font-medium text-slate-900">{voice.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="capitalize">{voice.gender}</span>
                      <span>-</span>
                      <span>{voice.provider}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Costs Tab */}
        {activeTab === 'costs' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Cost Breakdown (Last 6 Months)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Month</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Calls</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Total Cost</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Avg Cost/Call</th>
                  </tr>
                </thead>
                <tbody>
                  {costs.map((cost) => (
                    <tr key={`${cost.year}-${cost.month}`} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium text-slate-900">{cost.label}</td>
                      <td className="text-right py-3 px-4 text-slate-700">{cost.callCount.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 text-slate-700">${cost.totalCost.toFixed(2)}</td>
                      <td className="text-right py-3 px-4 text-slate-700">
                        ${cost.callCount > 0 ? (cost.totalCost / cost.callCount).toFixed(3) : '0.00'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
