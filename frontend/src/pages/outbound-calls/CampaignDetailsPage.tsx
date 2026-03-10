import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Play,
  Pause,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  ListTodo,
  Bot,
  Calendar,
  Settings,
  RefreshCw,
  ChevronRight,
  MousePointer,
  Cpu,
  Edit3,
  Trash2,
  X,
  Save,
  BarChart3,
} from 'lucide-react';
import api from '../../services/api';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  callingMode: string;
  totalContacts: number;
  completedCalls: number;
  successfulCalls: number;
  failedCalls: number;
  leadsGenerated: number;
  maxConcurrentCalls: number;
  callsBetweenHours: { start: number; end: number };
  retryAttempts: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
  _count?: {
    contacts: number;
    calls: number;
  };
}

interface CampaignCall {
  id: string;
  phoneNumber: string;
  status: string;
  outcome?: string;
  duration?: number;
  sentiment?: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-700',
  RUNNING: 'bg-green-100 text-green-700',
  PAUSED: 'bg-yellow-100 text-yellow-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const outcomeLabels: Record<string, string> = {
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CALLBACK_REQUESTED: 'Callback',
  NEEDS_FOLLOWUP: 'Follow-up',
  CONVERTED: 'Converted',
  NO_ANSWER: 'No Answer',
  BUSY: 'Busy',
  VOICEMAIL: 'Voicemail',
};

export const CampaignDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [calls, setCalls] = useState<CampaignCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    callingMode: 'MANUAL' as 'AUTOMATIC' | 'MANUAL',
    maxConcurrentCalls: 1,
    callsBetweenHours: { start: 9, end: 18 },
    retryAttempts: 2,
  });

  useEffect(() => {
    fetchCampaignDetails();
  }, [id]);

  useEffect(() => {
    if (campaign) {
      setEditForm({
        name: campaign.name,
        description: campaign.description || '',
        callingMode: campaign.callingMode as 'AUTOMATIC' | 'MANUAL',
        maxConcurrentCalls: campaign.maxConcurrentCalls,
        callsBetweenHours: campaign.callsBetweenHours || { start: 9, end: 18 },
        retryAttempts: campaign.retryAttempts,
      });
    }
  }, [campaign]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);
      const [campaignRes, callsRes] = await Promise.all([
        api.get(`/outbound-calls/campaigns/${id}`),
        api.get(`/outbound-calls/calls?campaignId=${id}&limit=50`),
      ]);

      if (campaignRes.data.success) {
        setCampaign(campaignRes.data.data);
      }
      if (callsRes.data.success) {
        setCalls(callsRes.data.data.calls || []);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load campaign');
    } finally {
      setLoading(false);
    }
  };

  const startCampaign = async () => {
    try {
      setActionLoading(true);
      await api.post(`/outbound-calls/campaigns/${id}/start`);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const pauseCampaign = async () => {
    try {
      setActionLoading(true);
      await api.post(`/outbound-calls/campaigns/${id}/pause`);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to pause campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const updateCampaign = async () => {
    try {
      setActionLoading(true);
      await api.put(`/outbound-calls/campaigns/${id}`, {
        name: editForm.name,
        description: editForm.description,
        callingMode: editForm.callingMode,
        settings: {
          maxConcurrentCalls: editForm.maxConcurrentCalls,
          callsBetweenHours: editForm.callsBetweenHours,
          retryAttempts: editForm.retryAttempts,
        },
      });
      setShowEditModal(false);
      fetchCampaignDetails();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update campaign');
    } finally {
      setActionLoading(false);
    }
  };

  const deleteCampaign = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/outbound-calls/campaigns/${id}`);
      navigate('/outbound-calls');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete campaign');
      setShowDeleteConfirm(false);
    } finally {
      setActionLoading(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-600">Campaign not found</p>
        <button
          onClick={() => navigate('/outbound-calls')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Back to Outbound Calls
        </button>
      </div>
    );
  }

  const progressPercent = campaign.totalContacts > 0
    ? Math.round((campaign.completedCalls / campaign.totalContacts) * 100)
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/outbound-calls')}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[campaign.status]}`}>
                {campaign.status}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                campaign.callingMode === 'MANUAL'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {campaign.callingMode === 'MANUAL' ? (
                  <><MousePointer size={12} /> Manual</>
                ) : (
                  <><Cpu size={12} /> Auto</>
                )}
              </span>
            </div>
            {campaign.description && (
              <p className="text-gray-600 mt-1">{campaign.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchCampaignDetails}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>

          {/* Analytics button */}
          <button
            onClick={() => navigate(`/outbound-calls/campaigns/${id}/analytics`)}
            className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            title="View Analytics"
          >
            <BarChart3 size={18} />
            Analytics
          </button>

          {/* Edit button - only for DRAFT, PAUSED, or SCHEDULED */}
          {['DRAFT', 'PAUSED', 'SCHEDULED'].includes(campaign.status) && (
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              title="Edit Campaign"
            >
              <Edit3 size={18} />
              Edit
            </button>
          )}

          {/* Delete button - not for RUNNING campaigns */}
          {campaign.status !== 'RUNNING' && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
              title="Delete Campaign"
            >
              <Trash2 size={18} />
              Delete
            </button>
          )}

          {campaign.callingMode === 'MANUAL' && campaign.status === 'RUNNING' && (
            <button
              onClick={() => navigate(`/outbound-calls/campaigns/${id}/queue`)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <ListTodo size={18} />
              Open Call Queue
            </button>
          )}

          {(campaign.status === 'DRAFT' || campaign.status === 'PAUSED') && (
            <button
              onClick={startCampaign}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Play size={18} />
              {campaign.status === 'PAUSED' ? 'Resume' : 'Start'} Campaign
            </button>
          )}

          {campaign.status === 'RUNNING' && campaign.callingMode === 'AUTOMATIC' && (
            <button
              onClick={pauseCampaign}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50"
            >
              <Pause size={18} />
              Pause Campaign
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{campaign.totalContacts}</p>
              <p className="text-sm text-gray-500">Total Contacts</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Phone className="text-indigo-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{campaign.completedCalls}</p>
              <p className="text-sm text-gray-500">Calls Made</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{campaign.successfulCalls}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="text-red-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{campaign.failedCalls}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{campaign.leadsGenerated}</p>
              <p className="text-sm text-gray-500">Leads Generated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">Campaign Progress</span>
          <span className="text-sm text-gray-500">{progressPercent}% complete</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{campaign.completedCalls} calls completed</span>
          <span>{campaign.totalContacts - campaign.completedCalls} remaining</span>
        </div>
      </div>

      {/* Campaign Details & Recent Calls */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Campaign Info */}
        <div className="bg-white rounded-lg shadow border p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={18} />
            Campaign Settings
          </h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">AI Agent</span>
              <span className="font-medium flex items-center gap-1">
                <Bot size={14} />
                {campaign.agent?.name || '-'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Calling Mode</span>
              <span className="font-medium">
                {campaign.callingMode === 'MANUAL' ? 'Manual Queue' : 'Automatic'}
              </span>
            </div>

            {campaign.callingMode === 'AUTOMATIC' && (
              <div className="flex justify-between">
                <span className="text-gray-500">Concurrent Calls</span>
                <span className="font-medium">{campaign.maxConcurrentCalls}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-gray-500">Calling Hours</span>
              <span className="font-medium">
                {campaign.callsBetweenHours?.start || 9}:00 - {campaign.callsBetweenHours?.end || 18}:00
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-500">Retry Attempts</span>
              <span className="font-medium">{campaign.retryAttempts}</span>
            </div>

            <hr className="my-3" />

            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="font-medium">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </span>
            </div>

            {campaign.startedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Started</span>
                <span className="font-medium">
                  {new Date(campaign.startedAt).toLocaleString()}
                </span>
              </div>
            )}

            {campaign.completedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Completed</span>
                <span className="font-medium">
                  {new Date(campaign.completedAt).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Recent Calls */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow border">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Calls</h2>
            <span className="text-sm text-gray-500">{calls.length} calls</span>
          </div>

          {calls.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Phone className="mx-auto mb-2 text-gray-300" size={40} />
              <p>No calls made yet</p>
              {campaign.status === 'DRAFT' && (
                <p className="text-sm mt-2">Start the campaign to begin making calls</p>
              )}
            </div>
          ) : (
            <div className="divide-y max-h-96 overflow-y-auto">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                  onClick={() => navigate(`/outbound-calls/calls/${call.id}`)}
                >
                  <div>
                    <p className="font-medium text-gray-900">{call.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        call.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        call.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {call.status}
                      </span>
                      {call.outcome && (
                        <span className="text-xs text-gray-500">
                          {outcomeLabels[call.outcome] || call.outcome}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">{formatDuration(call.duration)}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(call.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Campaign Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowEditModal(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Edit Campaign</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calling Mode
                  </label>
                  <select
                    value={editForm.callingMode}
                    onChange={(e) => setEditForm({ ...editForm, callingMode: e.target.value as 'AUTOMATIC' | 'MANUAL' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="MANUAL">Manual Queue</option>
                    <option value="AUTOMATIC">Automatic</option>
                  </select>
                </div>

                {editForm.callingMode === 'AUTOMATIC' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Concurrent Calls
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editForm.maxConcurrentCalls}
                      onChange={(e) => setEditForm({ ...editForm, maxConcurrentCalls: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calling Hours Start
                    </label>
                    <select
                      value={editForm.callsBetweenHours.start}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        callsBetweenHours: { ...editForm.callsBetweenHours, start: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Calling Hours End
                    </label>
                    <select
                      value={editForm.callsBetweenHours.end}
                      onChange={(e) => setEditForm({
                        ...editForm,
                        callsBetweenHours: { ...editForm.callsBetweenHours, end: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retry Attempts
                  </label>
                  <select
                    value={editForm.retryAttempts}
                    onChange={(e) => setEditForm({ ...editForm, retryAttempts: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {[0, 1, 2, 3, 5].map((n) => (
                      <option key={n} value={n}>{n} retries</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={updateCampaign}
                  disabled={actionLoading || !editForm.name}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save size={16} />
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Campaign</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete "<strong>{campaign.name}</strong>"?
                  This will also delete all {campaign.totalContacts} contacts and {campaign.completedCalls} call records.
                  This action cannot be undone.
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteCampaign}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  {actionLoading ? 'Deleting...' : 'Delete Campaign'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailsPage;
