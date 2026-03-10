import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Plus,
  Play,
  Pause,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronRight,
  Volume2,
  Calendar,
  ListTodo,
  MousePointer,
  Cpu,
  Filter,
  X,
} from 'lucide-react';
import api from '../../services/api';

interface OutboundCall {
  id: string;
  phoneNumber: string;
  status: string;
  duration: number | null;
  outcome: string | null;
  sentiment: string | null;
  summary: string | null;
  recordingUrl: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  answeredAt: string | null;
  agent: {
    id: string;
    name: string;
    industry: string;
  } | null;
  campaign: {
    id: string;
    name: string;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  callingMode: string;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  leadsGenerated: number;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
}

interface Analytics {
  totalCalls: number;
  completedCalls: number;
  answeredCalls: number;
  answerRate: string | number;
  leadsGenerated: number;
  conversionRate: string | number;
  avgDuration: number;
  outcomeBreakdown: Record<string, number>;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

const statusIcons: Record<string, React.ReactNode> = {
  COMPLETED: <CheckCircle className="text-green-500" size={18} />,
  IN_PROGRESS: <PhoneCall className="text-blue-500" size={18} />,
  RINGING: <Phone className="text-yellow-500" size={18} />,
  NO_ANSWER: <PhoneMissed className="text-orange-500" size={18} />,
  BUSY: <PhoneOff className="text-red-500" size={18} />,
  FAILED: <XCircle className="text-red-500" size={18} />,
  INITIATED: <Phone className="text-gray-500" size={18} />,
  QUEUED: <Clock className="text-gray-500" size={18} />,
};

const statusLabels: Record<string, string> = {
  COMPLETED: 'Completed',
  IN_PROGRESS: 'In Progress',
  RINGING: 'Ringing',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  FAILED: 'Failed',
  INITIATED: 'Initiated',
  QUEUED: 'Queued',
  CANCELLED: 'Cancelled',
};

const outcomeLabels: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback Requested',
  WRONG_NUMBER: 'Wrong Number',
  VOICEMAIL: 'Voicemail',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  DO_NOT_CALL: 'Do Not Call',
  CONVERTED: 'Converted',
  NEEDS_FOLLOWUP: 'Needs Follow-up',
};

const campaignStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

export const OutboundCallsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'calls' | 'campaigns'>('calls');
  const [calls, setCalls] = useState<OutboundCall[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [outcomeFilter, setOutcomeFilter] = useState<string>('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCalls, setTotalCalls] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchData();
  }, [statusFilter, dateFilter, outcomeFilter, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, outcomeFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Build query params for calls
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('offset', ((currentPage - 1) * pageSize).toString());
      if (statusFilter) params.append('status', statusFilter);
      if (outcomeFilter) params.append('outcome', outcomeFilter);
      if (dateFilter) {
        const now = new Date();
        let dateFrom: Date | null = null;
        let dateTo: Date | null = null;

        switch (dateFilter) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'yesterday':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
            dateTo = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        }
        if (dateFrom) params.append('dateFrom', dateFrom.toISOString());
        if (dateTo) params.append('dateTo', dateTo.toISOString());
      }

      const [callsRes, campaignsRes, analyticsRes] = await Promise.all([
        api.get(`/outbound-calls/calls?${params.toString()}`),
        api.get('/outbound-calls/campaigns'),
        api.get('/outbound-calls/analytics'),
      ]);

      if (callsRes.data.success) {
        setCalls(callsRes.data.data.calls);
        setTotalCalls(callsRes.data.data.total || callsRes.data.data.calls.length);
      }
      if (campaignsRes.data.success) {
        setCampaigns(campaignsRes.data.data);
      }
      if (analyticsRes.data.success) {
        setAnalytics(analyticsRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async (campaignId: string) => {
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/start`);
      fetchData();
    } catch (err) {
      console.error('Failed to start campaign:', err);
    }
  };

  const pauseCampaign = async (campaignId: string) => {
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/pause`);
      fetchData();
    } catch (err) {
      console.error('Failed to pause campaign:', err);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds || seconds <= 0) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallDuration = (call: OutboundCall): number | null => {
    // If duration is set, use it
    if (call.duration && call.duration > 0) return call.duration;

    // Otherwise calculate from timestamps
    if (call.answeredAt && call.endedAt) {
      const start = new Date(call.answeredAt).getTime();
      const end = new Date(call.endedAt).getTime();
      return Math.floor((end - start) / 1000);
    }
    if (call.startedAt && call.endedAt) {
      const start = new Date(call.startedAt).getTime();
      const end = new Date(call.endedAt).getTime();
      return Math.floor((end - start) / 1000);
    }

    // For ongoing calls, show elapsed time
    if (call.status === 'IN_PROGRESS' && call.answeredAt) {
      const start = new Date(call.answeredAt).getTime();
      return Math.floor((Date.now() - start) / 1000);
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Outbound AI Calls</h1>
          <p className="text-gray-600 text-sm">
            Manage AI-powered outbound calling campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/outbound-calls/single')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
          >
            <Phone size={16} />
            Single Call
          </button>
          <button
            onClick={() => navigate('/outbound-calls/campaigns/create')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={16} />
            Campaign
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 rounded">
                <Phone className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="text-lg font-bold">{analytics.totalCalls}</p>
                <p className="text-gray-600 text-xs">Total Calls</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-green-100 rounded">
                <CheckCircle className="text-green-600" size={16} />
              </div>
              <div>
                <p className="text-lg font-bold">{analytics.answeredCalls}</p>
                <p className="text-gray-600 text-xs">Answered ({analytics.answerRate}%)</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 rounded">
                <Users className="text-purple-600" size={16} />
              </div>
              <div>
                <p className="text-lg font-bold">{analytics.leadsGenerated}</p>
                <p className="text-gray-600 text-xs">Leads</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-orange-100 rounded">
                <TrendingUp className="text-orange-600" size={16} />
              </div>
              <div>
                <p className="text-lg font-bold">{analytics.conversionRate}%</p>
                <p className="text-gray-600 text-xs">Conversion</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg shadow-sm border">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-100 rounded">
                <Clock className="text-indigo-600" size={16} />
              </div>
              <div>
                <p className="text-lg font-bold">{formatDuration(analytics.avgDuration)}</p>
                <p className="text-gray-600 text-xs">Avg Duration</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border mb-4">
        <div className="p-4 flex items-center gap-4 flex-wrap">
          {/* Status Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition min-w-[140px]"
            >
              <option value="">All</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Date Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Date:</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition min-w-[140px]"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Outcome Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-600">Outcome:</label>
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition min-w-[160px]"
            >
              <option value="">All</option>
              {Object.entries(outcomeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Clear Button */}
          {(statusFilter || dateFilter || outcomeFilter) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
                setOutcomeFilter('');
              }}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
            >
              <X size={16} />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('calls')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'calls'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Recent Calls ({calls.length})
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'campaigns'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Campaigns ({campaigns.length})
            </button>
          </nav>
        </div>

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <div className="overflow-x-auto">
            {calls.length === 0 ? (
              <div className="p-12 text-center">
                <Phone size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Calls Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Start making AI-powered outbound calls to your contacts
                </p>
                <button
                  onClick={() => navigate('/outbound-calls/single')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Phone size={20} />
                  Make Your First Call
                </button>
              </div>
            ) : (
              <>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Agent
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Duration
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Outcome
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Sentiment
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Date
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {calls.map((call) => (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => navigate(`/outbound-calls/calls/${call.id}`)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="font-medium text-gray-900 text-sm">
                          {call.phoneNumber}
                        </div>
                        {call.campaign && (
                          <div className="text-xs text-gray-500">
                            {call.campaign.name}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600">
                        {call.agent?.name || '-'}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {statusIcons[call.status]}
                          <span className="text-xs">
                            {statusLabels[call.status] || call.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {formatDuration(getCallDuration(call))}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {call.outcome ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED'
                              ? 'bg-green-100 text-green-700'
                              : call.outcome === 'NOT_INTERESTED' || call.outcome === 'DO_NOT_CALL'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {outcomeLabels[call.outcome] || call.outcome}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {call.sentiment ? (
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            call.sentiment === 'positive'
                              ? 'bg-green-100 text-green-700'
                              : call.sentiment === 'negative'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {call.sentiment}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                        {new Date(call.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {call.recordingUrl && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(call.recordingUrl!, '_blank');
                              }}
                              className="p-1 text-gray-600 hover:text-blue-600"
                              title="Play Recording"
                            >
                              <Volume2 size={14} />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/outbound-calls/calls/${call.id}`);
                            }}
                            className="p-1 text-gray-600 hover:text-blue-600"
                            title="View Details"
                          >
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalCalls > pageSize && (
                <div className="px-4 py-3 border-t flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCalls)} of {totalCalls} calls
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, Math.ceil(totalCalls / pageSize)) }, (_, i) => {
                        const totalPages = Math.ceil(totalCalls / pageSize);
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`px-3 py-1 text-sm rounded ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'border hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= Math.ceil(totalCalls / pageSize)}
                      className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setCurrentPage(Math.ceil(totalCalls / pageSize))}
                      disabled={currentPage >= Math.ceil(totalCalls / pageSize)}
                      className="px-2 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
              </>
            )}
          </div>
        )}

        {/* Campaigns Tab */}
        {activeTab === 'campaigns' && (
          <div className="p-4">
            {campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Campaigns Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Create a campaign to call multiple contacts automatically
                </p>
                <button
                  onClick={() => navigate('/outbound-calls/campaigns/create')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus size={20} />
                  Create Your First Campaign
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="border rounded-lg p-3 hover:shadow-md transition cursor-pointer"
                    onClick={() => navigate(`/outbound-calls/campaigns/${campaign.id}`)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-sm">{campaign.name}</h3>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                            campaignStatusColors[campaign.status]
                          }`}>
                            {campaign.status}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-0.5 ${
                            campaign.callingMode === 'MANUAL'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {campaign.callingMode === 'MANUAL' ? (
                              <>
                                <MousePointer size={10} />
                                Manual
                              </>
                            ) : (
                              <>
                                <Cpu size={10} />
                                Auto
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          Agent: {campaign.agent?.name || '-'}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {campaign.callingMode === 'MANUAL' && campaign.status === 'RUNNING' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/outbound-calls/campaigns/${campaign.id}/queue`);
                            }}
                            className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 flex items-center gap-1"
                            title="Open Call Queue"
                          >
                            <ListTodo size={12} />
                            Queue
                          </button>
                        )}
                        {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startCampaign(campaign.id);
                            }}
                            className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            title="Start Campaign"
                          >
                            <Play size={14} />
                          </button>
                        ) : campaign.status === 'RUNNING' && campaign.callingMode === 'AUTOMATIC' ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseCampaign(campaign.id);
                            }}
                            className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                            title="Pause Campaign"
                          >
                            <Pause size={14} />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-2 grid grid-cols-5 gap-2">
                      <div className="text-center">
                        <p className="text-lg font-bold text-gray-900">
                          {campaign.totalContacts}
                        </p>
                        <p className="text-xs text-gray-500">Contacts</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-600">
                          {campaign.completedCalls}
                        </p>
                        <p className="text-xs text-gray-500">Calls</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-green-600">
                          {campaign.successfulCalls}
                        </p>
                        <p className="text-xs text-gray-500">Success</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-red-600">
                          {campaign.failedCalls}
                        </p>
                        <p className="text-xs text-gray-500">Failed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-600">
                          {campaign.leadsGenerated}
                        </p>
                        <p className="text-xs text-gray-500">Leads</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
                        <span>Progress</span>
                        <span>
                          {campaign.totalContacts > 0
                            ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
                            : 0}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{
                            width: `${
                              campaign.totalContacts > 0
                                ? (campaign.completedCalls / campaign.totalContacts) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OutboundCallsPage;
