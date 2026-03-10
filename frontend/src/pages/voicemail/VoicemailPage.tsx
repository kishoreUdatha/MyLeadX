import React, { useState, useEffect, useRef } from 'react';
import {
  Voicemail,
  Play,
  Pause,
  Check,
  Archive,
  Trash2,
  Search,
  Clock,
  FileText,
  PhoneCall,
  RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface VoicemailItem {
  id: string;
  callerNumber: string;
  callerName: string | null;
  duration: number;
  recordingUrl: string;
  transcript: string | null;
  transcriptionStatus: string;
  status: string;
  notes: string | null;
  createdAt: string;
  listenedAt: string | null;
  respondedAt: string | null;
}

export const VoicemailPage: React.FC = () => {
  const [voicemails, setVoicemails] = useState<VoicemailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedVoicemail, setSelectedVoicemail] = useState<VoicemailItem | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    new: 0,
    listened: 0,
    responded: 0,
    avgDuration: 0,
  });
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchVoicemails();
    fetchStats();
  }, [search, statusFilter]);

  const fetchVoicemails = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/voicemail', { params });
      const data = response.data?.data || response.data || [];
      setVoicemails(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Failed to fetch voicemails');
      setVoicemails([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/voicemail/stats/overview');
      const data = response.data?.data || response.data || {};
      setStats({
        total: data.total || 0,
        new: data.new || 0,
        listened: data.listened || 0,
        responded: data.responded || 0,
        avgDuration: data.avgDuration || 0,
      });
    } catch (error) {
      console.error('Failed to fetch stats');
    }
  };

  const handlePlay = async (voicemail: VoicemailItem) => {
    if (playingId === voicemail.id) {
      // Pause
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      // Play
      if (audioRef.current) {
        audioRef.current.src = voicemail.recordingUrl;
        audioRef.current.play();
        setPlayingId(voicemail.id);

        // Mark as listened if new
        if (voicemail.status === 'NEW') {
          await api.post(`/voicemail/${voicemail.id}/listened`);
          fetchVoicemails();
          fetchStats();
        }
      }
    }
  };

  const handleMarkResponded = async (id: string) => {
    try {
      await api.post(`/voicemail/${id}/responded`);
      toast.success('Marked as responded');
      fetchVoicemails();
      fetchStats();
    } catch (error) {
      toast.error('Failed to update voicemail');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await api.post(`/voicemail/${id}/archive`);
      toast.success('Voicemail archived');
      fetchVoicemails();
      fetchStats();
      if (selectedVoicemail?.id === id) {
        setSelectedVoicemail(null);
      }
    } catch (error) {
      toast.error('Failed to archive voicemail');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voicemail?')) return;

    try {
      await api.delete(`/voicemail/${id}`);
      toast.success('Voicemail deleted');
      fetchVoicemails();
      fetchStats();
      if (selectedVoicemail?.id === id) {
        setSelectedVoicemail(null);
      }
    } catch (error) {
      toast.error('Failed to delete voicemail');
    }
  };

  const handleCreateCallback = async (id: string) => {
    try {
      await api.post(`/voicemail/${id}/callback`);
      toast.success('Callback created');
    } catch (error) {
      toast.error('Failed to create callback');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-blue-100 text-blue-700';
      case 'LISTENED': return 'bg-yellow-100 text-yellow-700';
      case 'RESPONDED': return 'bg-green-100 text-green-700';
      case 'ARCHIVED': return 'bg-gray-100 text-gray-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="p-6">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voicemail Inbox</h1>
          <p className="text-gray-600">Listen and respond to voicemails</p>
        </div>
        <button
          onClick={() => { fetchVoicemails(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Voicemail className="text-gray-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Voicemail className="text-blue-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">New</p>
              <p className="text-xl font-semibold text-blue-600">{stats.new}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Play className="text-yellow-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Listened</p>
              <p className="text-xl font-semibold">{stats.listened}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Check className="text-green-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Responded</p>
              <p className="text-xl font-semibold">{stats.responded}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="text-purple-600" size={20} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Duration</p>
              <p className="text-xl font-semibold">{formatDuration(stats.avgDuration)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="NEW">New</option>
            <option value="LISTENED">Listened</option>
            <option value="RESPONDED">Responded</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex gap-6">
        {/* Voicemail List */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : voicemails.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <Voicemail className="mx-auto text-gray-400 mb-4" size={48} />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Voicemails</h3>
              <p className="text-gray-600">
                Voicemails from callers will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {voicemails.map((vm) => (
                <div
                  key={vm.id}
                  onClick={() => setSelectedVoicemail(vm)}
                  className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                    selectedVoicemail?.id === vm.id ? 'ring-2 ring-blue-500' : ''
                  } ${vm.status === 'NEW' ? 'border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlay(vm); }}
                        className="p-2 bg-blue-100 hover:bg-blue-200 rounded-full"
                      >
                        {playingId === vm.id ? (
                          <Pause className="text-blue-600" size={20} />
                        ) : (
                          <Play className="text-blue-600" size={20} />
                        )}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{vm.callerNumber}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(vm.status)}`}>
                            {vm.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDuration(vm.duration)}
                          </span>
                          <span>{new Date(vm.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCreateCallback(vm.id); }}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Create Callback"
                      >
                        <PhoneCall size={18} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleArchive(vm.id); }}
                        className="p-2 hover:bg-gray-100 rounded"
                        title="Archive"
                      >
                        <Archive size={18} />
                      </button>
                    </div>
                  </div>

                  {vm.transcript && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {vm.transcript}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Voicemail Detail Panel */}
        {selectedVoicemail && (
          <div className="w-96 bg-white rounded-lg border p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Voicemail Details</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500">Caller</label>
                <p className="font-medium">{selectedVoicemail.callerNumber}</p>
                {selectedVoicemail.callerName && (
                  <p className="text-sm text-gray-600">{selectedVoicemail.callerName}</p>
                )}
              </div>

              <div>
                <label className="text-sm text-gray-500">Duration</label>
                <p className="font-medium">{formatDuration(selectedVoicemail.duration)}</p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Received</label>
                <p className="font-medium">
                  {new Date(selectedVoicemail.createdAt).toLocaleString()}
                </p>
              </div>

              <div>
                <label className="text-sm text-gray-500">Status</label>
                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedVoicemail.status)}`}>
                  {selectedVoicemail.status}
                </span>
              </div>

              {/* Audio Player */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handlePlay(selectedVoicemail)}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                  >
                    {playingId === selectedVoicemail.id ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full w-0"></div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDuration(selectedVoicemail.duration)}
                  </span>
                </div>
              </div>

              {/* Transcript */}
              {selectedVoicemail.transcript ? (
                <div>
                  <label className="text-sm text-gray-500 flex items-center gap-2">
                    <FileText size={14} />
                    Transcript
                  </label>
                  <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedVoicemail.transcript}
                  </p>
                </div>
              ) : selectedVoicemail.transcriptionStatus === 'PROCESSING' ? (
                <p className="text-sm text-gray-500">Transcription in progress...</p>
              ) : null}

              {/* Actions */}
              <div className="pt-4 border-t space-y-2">
                <button
                  onClick={() => handleMarkResponded(selectedVoicemail.id)}
                  disabled={selectedVoicemail.status === 'RESPONDED'}
                  className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Mark as Responded
                </button>
                <button
                  onClick={() => handleCreateCallback(selectedVoicemail.id)}
                  className="w-full py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2"
                >
                  <PhoneCall size={18} />
                  Create Callback
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleArchive(selectedVoicemail.id)}
                    className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Archive size={18} />
                    Archive
                  </button>
                  <button
                    onClick={() => handleDelete(selectedVoicemail.id)}
                    className="flex-1 py-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
