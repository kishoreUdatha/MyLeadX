import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneIncoming,
  PhoneOutgoing,
  Clock,
  Calendar,
  Filter,
  Search,
  Play,
  ChevronRight,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

interface Call {
  id: string;
  twilioCallSid: string;
  phone: string;
  contactName?: string;
  status: string;
  outcome?: string;
  direction: 'INBOUND' | 'OUTBOUND';
  duration?: number;
  startedAt: string;
  endedAt?: string;
  recordingUrl?: string;
  transcript?: string;
  consentGiven?: boolean;
  language?: string;
}

const statusColors: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  BUSY: 'bg-yellow-100 text-yellow-700',
  NO_ANSWER: 'bg-gray-100 text-gray-700',
  QUEUED: 'bg-purple-100 text-purple-700',
  RINGING: 'bg-orange-100 text-orange-700',
};

const outcomeLabels: Record<string, { label: string; color: string }> = {
  INTERESTED: { label: 'Interested', color: 'text-green-600' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'text-red-600' },
  CALLBACK: { label: 'Callback', color: 'text-blue-600' },
  VOICEMAIL: { label: 'Voicemail', color: 'text-yellow-600' },
  TRANSFERRED: { label: 'Transferred', color: 'text-purple-600' },
  COMPLETED: { label: 'Completed', color: 'text-gray-600' },
};

export const InboundCallsPage: React.FC = () => {
  const navigate = useNavigate();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  });

  useEffect(() => {
    fetchCalls();
  }, [filter, dateRange]);

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateRange.from) params.append('dateFrom', dateRange.from);
      if (dateRange.to) params.append('dateTo', dateRange.to);
      params.append('limit', '100');

      const response = await api.get(`/outbound-calls/calls?${params}`);
      let callsData = response.data.data?.calls || [];

      // Filter by direction if needed
      if (filter === 'inbound') {
        callsData = callsData.filter((c: Call) => c.direction === 'INBOUND');
      } else if (filter === 'outbound') {
        callsData = callsData.filter((c: Call) => c.direction === 'OUTBOUND');
      }

      setCalls(callsData);
    } catch (err) {
      console.error('Failed to fetch calls:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const filteredCalls = calls.filter(call =>
    (call.phone?.includes(searchTerm) || false) ||
    (call.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const inboundCount = calls.filter(c => c.direction === 'INBOUND').length;
  const outboundCount = calls.filter(c => c.direction === 'OUTBOUND').length;
  const avgDuration = calls.length > 0
    ? Math.round(calls.reduce((sum, c) => sum + (c.duration || 0), 0) / calls.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Call History</h1>
        <p className="text-gray-600 mt-1">
          View all inbound and outbound calls with transcripts and recordings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Phone className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{calls.length}</p>
              <p className="text-gray-600 text-sm">Total Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PhoneIncoming className="text-green-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{inboundCount}</p>
              <p className="text-gray-600 text-sm">Inbound Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <PhoneOutgoing className="text-purple-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{outboundCount}</p>
              <p className="text-gray-600 text-sm">Outbound Calls</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="text-orange-600" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
              <p className="text-gray-600 text-sm">Avg Duration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow border p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Direction Filter */}
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-gray-500" />
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 text-sm ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('inbound')}
                className={`px-4 py-2 text-sm border-l ${
                  filter === 'inbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Inbound
              </button>
              <button
                onClick={() => setFilter('outbound')}
                className={`px-4 py-2 text-sm border-l ${
                  filter === 'outbound' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Outbound
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={dateRange.from}
              onChange={e => setDateRange({ ...dateRange, from: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.to}
              onChange={e => setDateRange({ ...dateRange, to: e.target.value })}
              className="px-3 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Direction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Consent</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <Phone size={48} className="mx-auto mb-3 opacity-30" />
                    <p>No calls found</p>
                  </td>
                </tr>
              ) : (
                filteredCalls.map(call => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {call.direction === 'INBOUND' ? (
                          <PhoneIncoming size={18} className="text-green-600" />
                        ) : (
                          <PhoneOutgoing size={18} className="text-purple-600" />
                        )}
                        <span className="text-sm">{call.direction}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{call.contactName || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">{call.phone || 'No number'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[call.status] || 'bg-gray-100'}`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {call.outcome ? (
                        <span className={`text-sm font-medium ${outcomeLabels[call.outcome]?.color || 'text-gray-600'}`}>
                          {outcomeLabels[call.outcome]?.label || call.outcome}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm">
                        <Clock size={14} className="text-gray-400" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {call.consentGiven === true && (
                        <CheckCircle size={18} className="text-green-600" />
                      )}
                      {call.consentGiven === false && (
                        <XCircle size={18} className="text-red-600" />
                      )}
                      {(call.consentGiven === null || call.consentGiven === undefined) && (
                        <AlertCircle size={18} className="text-gray-400" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600">{formatDate(call.startedAt)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {call.recordingUrl && (
                          <a
                            href={call.recordingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Play Recording"
                          >
                            <Play size={16} />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/outbound-calls/calls/${call.id}`)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="View Details"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InboundCallsPage;
