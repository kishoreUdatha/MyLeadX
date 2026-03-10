import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  Mail,
  Calendar,
  Clock,
  SkipForward,
  Ban,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronRight,
  MessageSquare,
  FileText,
  Play,
  Pause,
} from 'lucide-react';
import api from '../../services/api';

interface Contact {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  status: string;
  attempts: number;
  lastAttemptAt: string | null;
  nextAttemptAt: string | null;
  customData: any;
  leadId: string | null;
  lead: {
    id: string;
    firstName: string;
    lastName: string | null;
    email: string | null;
    phone: string;
    source: string | null;
    customFields: any;
    createdAt: string;
  } | null;
  lastCall: {
    id: string;
    status: string;
    outcome: string | null;
    duration: number | null;
    sentiment: string | null;
    summary: string | null;
    createdAt: string;
  } | null;
}

interface Campaign {
  id: string;
  name: string;
  status: string;
  callingMode: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
}

interface QueueStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  FAILED: 'bg-red-100 text-red-700',
  DO_NOT_CALL: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-purple-100 text-purple-700',
};

const outcomeColors: Record<string, string> = {
  INTERESTED: 'bg-green-100 text-green-700',
  CONVERTED: 'bg-green-100 text-green-700',
  NOT_INTERESTED: 'bg-red-100 text-red-700',
  CALLBACK_REQUESTED: 'bg-blue-100 text-blue-700',
  NEEDS_FOLLOWUP: 'bg-yellow-100 text-yellow-700',
  NO_ANSWER: 'bg-gray-100 text-gray-700',
  BUSY: 'bg-orange-100 text-orange-700',
  VOICEMAIL: 'bg-purple-100 text-purple-700',
};

export const ManualCallQueuePage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [callingContact, setCallingContact] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<any>(null);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleData, setScheduleData] = useState({ contactId: '', date: '', time: '', notes: '' });

  const [filter, setFilter] = useState<string>('PENDING');

  const fetchQueue = useCallback(async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const response = await api.get(`/outbound-calls/campaigns/${campaignId}/queue`, {
        params: { status: filter !== 'ALL' ? filter : undefined },
      });

      if (response.data.success) {
        setCampaign(response.data.data.campaign);
        setContacts(response.data.data.contacts);
        setStats(response.data.data.stats);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch queue');
    } finally {
      setLoading(false);
    }
  }, [campaignId, filter]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  // Poll for call status updates
  useEffect(() => {
    if (!activeCall) return;

    const interval = setInterval(async () => {
      try {
        const response = await api.get(`/outbound-calls/calls/${activeCall.callId}`);
        if (response.data.success) {
          const call = response.data.data;
          if (['COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY'].includes(call.status)) {
            setActiveCall(null);
            setCallingContact(null);
            fetchQueue();
          }
        }
      } catch (err) {
        console.error('Error polling call status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeCall, fetchQueue]);

  const handleCall = async (contact: Contact) => {
    try {
      setCallingContact(contact.id);
      setError(null);

      const response = await api.post(
        `/outbound-calls/campaigns/${campaignId}/queue/${contact.id}/call`
      );

      if (response.data.success) {
        setActiveCall(response.data.data);
        fetchQueue();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate call');
      setCallingContact(null);
    }
  };

  const handleSkip = async (contactId: string, reason?: string) => {
    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/queue/${contactId}/skip`, {
        reason,
      });
      fetchQueue();
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to skip contact');
    }
  };

  const handleSchedule = async () => {
    try {
      const scheduledAt = new Date(`${scheduleData.date}T${scheduleData.time}`);

      await api.post(
        `/outbound-calls/campaigns/${campaignId}/queue/${scheduleData.contactId}/schedule`,
        {
          scheduledAt: scheduledAt.toISOString(),
          notes: scheduleData.notes,
        }
      );

      setShowScheduleModal(false);
      setScheduleData({ contactId: '', date: '', time: '', notes: '' });
      fetchQueue();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to schedule contact');
    }
  };

  const handleDNC = async (contactId: string, reason?: string) => {
    if (!confirm('Are you sure you want to mark this contact as Do Not Call?')) return;

    try {
      await api.post(`/outbound-calls/campaigns/${campaignId}/queue/${contactId}/dnc`, {
        reason,
      });
      fetchQueue();
      if (selectedContact?.id === contactId) {
        setSelectedContact(null);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to mark as DNC');
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/outbound-calls')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {campaign?.name} - Manual Call Queue
              </h1>
              <p className="text-sm text-gray-600">
                Agent: {campaign?.agent.name} | Mode: Manual Calling
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchQueue}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <RefreshCw size={18} />
              Refresh
            </button>
            {campaign?.status === 'DRAFT' && (
              <button
                onClick={async () => {
                  await api.post(`/outbound-calls/campaigns/${campaignId}/start`);
                  fetchQueue();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Play size={18} />
                Start Campaign
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="flex gap-6 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-xs text-gray-500">Total</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-xs text-gray-500">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
              <p className="text-xs text-gray-500">In Progress</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.failed}</p>
              <p className="text-xs text-gray-500">Failed</p>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {['ALL', 'PENDING', 'SCHEDULED', 'COMPLETED', 'FAILED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XCircle size={18} />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <Phone size={48} className="mb-4 text-gray-300" />
              <p>No contacts in queue</p>
            </div>
          ) : (
            <div className="divide-y">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
                    selectedContact?.id === contact.id ? 'bg-blue-50' : ''
                  } ${callingContact === contact.id ? 'bg-green-50' : ''}`}
                  onClick={() => setSelectedContact(contact)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {contact.name || contact.lead?.firstName || 'Unknown'}
                          {contact.lead?.lastName ? ` ${contact.lead.lastName}` : ''}
                        </span>
                        <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors[contact.status]}`}>
                          {contact.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Phone size={14} />
                          {contact.phone}
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {contact.email}
                          </span>
                        )}
                      </div>
                      {contact.lastCall && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last call: {contact.lastCall.outcome || contact.lastCall.status}
                          {contact.lastCall.duration && ` (${formatDuration(contact.lastCall.duration)})`}
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      {contact.status === 'PENDING' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCall(contact);
                          }}
                          disabled={callingContact !== null}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                            callingContact === contact.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-green-600 text-white hover:bg-green-700'
                          } disabled:opacity-50`}
                        >
                          {callingContact === contact.id ? (
                            <>
                              <PhoneCall size={16} className="animate-pulse" />
                              Calling...
                            </>
                          ) : (
                            <>
                              <Phone size={16} />
                              Call
                            </>
                          )}
                        </button>
                      )}
                      {contact.status === 'IN_PROGRESS' && (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm">
                          <PhoneCall size={16} className="animate-pulse" />
                          On Call
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contact Details Panel */}
        <div className="w-1/2 overflow-y-auto bg-gray-50">
          {selectedContact ? (
            <div className="p-6">
              {/* Contact Header */}
              <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {selectedContact.name || selectedContact.lead?.firstName || 'Unknown Contact'}
                      {selectedContact.lead?.lastName ? ` ${selectedContact.lead.lastName}` : ''}
                    </h2>
                    <p className="text-gray-600">{selectedContact.phone}</p>
                    {selectedContact.email && (
                      <p className="text-gray-500 text-sm">{selectedContact.email}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[selectedContact.status]}`}>
                    {selectedContact.status}
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-4">
                  {selectedContact.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleCall(selectedContact)}
                        disabled={callingContact !== null}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Phone size={20} />
                        Call Now
                      </button>
                      <button
                        onClick={() => {
                          setScheduleData({ ...scheduleData, contactId: selectedContact.id });
                          setShowScheduleModal(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                      >
                        <Calendar size={20} />
                        Schedule
                      </button>
                      <button
                        onClick={() => handleSkip(selectedContact.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                      >
                        <SkipForward size={20} />
                        Skip
                      </button>
                      <button
                        onClick={() => handleDNC(selectedContact.id)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                      >
                        <Ban size={20} />
                        DNC
                      </button>
                    </>
                  )}
                  {selectedContact.status === 'IN_PROGRESS' && (
                    <div className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-lg">
                      <PhoneCall size={20} className="animate-pulse" />
                      Call in Progress...
                    </div>
                  )}
                </div>
              </div>

              {/* Lead Information */}
              {selectedContact.lead && (
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <User size={18} />
                    Lead Information
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-gray-500">Source</p>
                      <p className="font-medium">{selectedContact.lead.source || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Created</p>
                      <p className="font-medium">
                        {new Date(selectedContact.lead.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedContact.lead.customFields &&
                      Object.entries(selectedContact.lead.customFields as object).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className="font-medium">{String(value)}</p>
                        </div>
                      ))
                    }
                  </div>
                  <button
                    onClick={() => navigate(`/leads/${selectedContact.lead!.id}`)}
                    className="mt-3 text-blue-600 text-sm hover:underline flex items-center gap-1"
                  >
                    View Full Lead Profile
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}

              {/* Call History */}
              {selectedContact.lastCall && (
                <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Phone size={18} />
                    Last Call
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium">{selectedContact.lastCall.status}</span>
                    </div>
                    {selectedContact.lastCall.outcome && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Outcome</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${outcomeColors[selectedContact.lastCall.outcome] || 'bg-gray-100'}`}>
                          {selectedContact.lastCall.outcome}
                        </span>
                      </div>
                    )}
                    {selectedContact.lastCall.duration && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Duration</span>
                        <span className="font-medium">{formatDuration(selectedContact.lastCall.duration)}</span>
                      </div>
                    )}
                    {selectedContact.lastCall.sentiment && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sentiment</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          selectedContact.lastCall.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                          selectedContact.lastCall.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {selectedContact.lastCall.sentiment}
                        </span>
                      </div>
                    )}
                    {selectedContact.lastCall.summary && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-gray-500 text-xs mb-1">AI Summary</p>
                        <p className="text-gray-700">{selectedContact.lastCall.summary}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Attempts Info */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Clock size={18} />
                  Call Attempts
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Attempts</span>
                    <span className="font-medium">{selectedContact.attempts}</span>
                  </div>
                  {selectedContact.lastAttemptAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Attempt</span>
                      <span className="font-medium">
                        {new Date(selectedContact.lastAttemptAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {selectedContact.nextAttemptAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Scheduled For</span>
                      <span className="font-medium text-purple-600">
                        {new Date(selectedContact.nextAttemptAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <FileText size={48} className="mb-4 text-gray-300" />
              <p>Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Schedule Call</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={scheduleData.notes}
                  onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })}
                  placeholder="Reason for scheduling..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSchedule}
                disabled={!scheduleData.date || !scheduleData.time}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManualCallQueuePage;
