import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Clock,
  User,
  MessageSquare,
  Play,
  Pause,
  Volume2,
  CheckCircle,
  XCircle,
  Download,
  ExternalLink,
} from 'lucide-react';
import api from '../../services/api';

interface CallDetails {
  id: string;
  phoneNumber: string;
  twilioCallSid: string | null;
  status: string;
  duration: number | null;
  ringDuration: number | null;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  recordingDuration: number | null;
  transcript: Array<{ role: string; content: string; timestamp: string }> | null;
  summary: string | null;
  sentiment: string | null;
  qualification: Record<string, any> | null;
  outcome: string | null;
  outcomeNotes: string | null;
  leadGenerated: boolean;
  generatedLeadId: string | null;
  createdAt: string;
  agent: {
    id: string;
    name: string;
    industry: string;
  };
  campaign: {
    id: string;
    name: string;
  } | null;
  contact: {
    id: string;
    name: string | null;
    email: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  RINGING: { label: 'Ringing', color: 'bg-yellow-100 text-yellow-700' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-700' },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700' },
  INITIATED: { label: 'Initiated', color: 'bg-purple-100 text-purple-700' },
  QUEUED: { label: 'Queued', color: 'bg-gray-100 text-gray-700' },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-700' },
};

const outcomeConfig: Record<string, { label: string; color: string }> = {
  INTERESTED: { label: 'Interested', color: 'bg-green-100 text-green-700' },
  NOT_INTERESTED: { label: 'Not Interested', color: 'bg-red-100 text-red-700' },
  CALLBACK_REQUESTED: { label: 'Callback', color: 'bg-blue-100 text-blue-700' },
  WRONG_NUMBER: { label: 'Wrong Number', color: 'bg-gray-100 text-gray-700' },
  VOICEMAIL: { label: 'Voicemail', color: 'bg-yellow-100 text-yellow-700' },
  NO_ANSWER: { label: 'No Answer', color: 'bg-gray-100 text-gray-700' },
  BUSY: { label: 'Busy', color: 'bg-orange-100 text-orange-700' },
  DO_NOT_CALL: { label: 'DNC', color: 'bg-red-100 text-red-700' },
  CONVERTED: { label: 'Converted', color: 'bg-green-100 text-green-700' },
  NEEDS_FOLLOWUP: { label: 'Follow-up', color: 'bg-blue-100 text-blue-700' },
};

export const CallDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [call, setCall] = useState<CallDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState<'transcript' | 'info'>('transcript');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchCallDetails();
  }, [id]);

  const fetchCallDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/outbound-calls/calls/${id}`);
      if (response.data.success) {
        const callData = response.data.data;

        if (typeof callData.transcript === 'string') {
          try {
            callData.transcript = JSON.parse(callData.transcript);
          } catch {
            callData.transcript = null;
          }
        }

        if (typeof callData.qualification === 'string') {
          try {
            callData.qualification = JSON.parse(callData.qualification);
          } catch {
            callData.qualification = null;
          }
        }

        setCall(callData);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch call details');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return '--';
    return new Date(dateStr).toLocaleDateString();
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div>
        <button
          onClick={() => navigate('/outbound-calls')}
          className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 mb-4 text-sm"
        >
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
          {error || 'Call not found'}
        </div>
      </div>
    );
  }

  const status = statusConfig[call.status] || { label: call.status, color: 'bg-gray-100 text-gray-700' };
  const outcome = call.outcome ? outcomeConfig[call.outcome] || { label: call.outcome, color: 'bg-gray-100 text-gray-700' } : null;

  return (
    <div>
      {/* Compact Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/outbound-calls')}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{call.phoneNumber}</h1>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                {status.label}
              </span>
              {outcome && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcome.color}`}>
                  {outcome.label}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">
              {call.agent.name} &bull; {formatDate(call.createdAt)} at {formatTime(call.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {call.leadGenerated && call.generatedLeadId && (
            <button
              onClick={() => navigate(`/leads/${call.generatedLeadId}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700"
            >
              <ExternalLink size={14} />
              View Lead
            </button>
          )}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="flex flex-wrap items-center gap-4 mb-4 p-3 bg-white rounded-lg border text-sm">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-gray-400" />
          <span className="text-gray-600">Duration:</span>
          <span className="font-medium">{formatDuration(call.duration)}</span>
        </div>
        {call.sentiment && (
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Sentiment:</span>
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              call.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
              call.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {call.sentiment}
            </span>
          </div>
        )}
        {call.leadGenerated && (
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle size={14} />
            <span className="text-xs font-medium">Lead Generated</span>
          </div>
        )}
        {call.recordingUrl && (
          <div className="flex items-center gap-2 ml-auto">
            <audio
              ref={audioRef}
              src={call.recordingUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
            <button
              onClick={togglePlayback}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
            >
              {isPlaying ? <Pause size={12} /> : <Play size={12} />}
              {isPlaying ? 'Pause' : 'Play Recording'}
            </button>
            <a
              href={call.recordingUrl}
              download
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded"
              title="Download"
            >
              <Download size={14} />
            </a>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left - Transcript/Summary */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'transcript' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <MessageSquare size={12} className="inline mr-1" />
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                activeTab === 'info' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <User size={12} className="inline mr-1" />
              Details
            </button>
          </div>

          {activeTab === 'transcript' && (
            <div className="bg-white rounded-lg border">
              {/* Summary */}
              {call.summary && (
                <div className="p-3 border-b bg-blue-50/50">
                  <p className="text-xs font-medium text-blue-700 mb-1">AI Summary</p>
                  <p className="text-sm text-gray-700">{call.summary}</p>
                </div>
              )}

              {/* Transcript */}
              <div className="p-3 max-h-[500px] overflow-y-auto">
                {call.transcript && Array.isArray(call.transcript) && call.transcript.length > 0 ? (
                  <div className="space-y-2">
                    {call.transcript.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 ${
                            message.role === 'assistant'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          <p className="text-[10px] opacity-60 mb-0.5">
                            {message.role === 'assistant' ? 'AI' : 'Customer'}
                          </p>
                          <p className="text-sm leading-relaxed">{message.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No transcript available</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="bg-white rounded-lg border p-4 space-y-4">
              {/* Call Info */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Call Information</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Phone</span>
                    <p className="font-medium">{call.phoneNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Agent</span>
                    <p className="font-medium">{call.agent.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration</span>
                    <p className="font-medium">{formatDuration(call.duration)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Ring Time</span>
                    <p className="font-medium">{formatDuration(call.ringDuration)}</p>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Timeline</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-gray-500">Initiated:</span>
                    <span>{formatTime(call.createdAt)}</span>
                  </div>
                  {call.startedAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                      <span className="text-gray-500">Ringing:</span>
                      <span>{formatTime(call.startedAt)}</span>
                    </div>
                  )}
                  {call.answeredAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      <span className="text-gray-500">Answered:</span>
                      <span>{formatTime(call.answeredAt)}</span>
                    </div>
                  )}
                  {call.endedAt && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span className="text-gray-500">Ended:</span>
                      <span>{formatTime(call.endedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              {call.outcomeNotes && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Notes</h4>
                  <p className="text-sm text-gray-700">{call.outcomeNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right - Captured Data */}
        <div className="lg:col-span-1 space-y-3">
          {/* Contact Info Card */}
          <div className="bg-white rounded-lg border">
            <div className="px-3 py-2 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <User size={12} />
                Contact Details
              </h3>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Name</span>
                <span className="font-medium text-gray-900 text-sm">
                  {call.contact?.name || call.qualification?.name || call.qualification?.customerName || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Phone</span>
                <span className="font-medium text-gray-900 text-sm">{call.phoneNumber}</span>
              </div>
              {(call.contact?.email || call.qualification?.email) && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Email</span>
                  <span className="font-medium text-gray-900 text-sm">
                    {call.contact?.email || call.qualification?.email}
                  </span>
                </div>
              )}
              {call.qualification?.location && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Location</span>
                  <span className="font-medium text-gray-900 text-sm">{call.qualification.location}</span>
                </div>
              )}
              {call.qualification?.company && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Company</span>
                  <span className="font-medium text-gray-900 text-sm">{call.qualification.company}</span>
                </div>
              )}
            </div>
          </div>

          {/* Call Outcome Card */}
          <div className="bg-white rounded-lg border">
            <div className="px-3 py-2 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-xs font-semibold text-green-700 flex items-center gap-1.5">
                <CheckCircle size={12} />
                Call Outcome
              </h3>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${status.color}`}>
                  {status.label}
                </span>
              </div>
              {outcome && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Result</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${outcome.color}`}>
                    {outcome.label}
                  </span>
                </div>
              )}
              {call.sentiment && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Sentiment</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    call.sentiment === 'positive' ? 'bg-green-100 text-green-700' :
                    call.sentiment === 'negative' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {call.sentiment}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">Duration</span>
                <span className="font-medium text-gray-900 text-sm">{formatDuration(call.duration)}</span>
              </div>
              {call.leadGenerated && (
                <div className="flex justify-between items-center pt-2 border-t">
                  <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                    <CheckCircle size={12} />
                    Lead Generated
                  </span>
                  {call.generatedLeadId && (
                    <button
                      onClick={() => navigate(`/leads/${call.generatedLeadId}`)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      View Lead →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Captured Information Card */}
          <div className="bg-white rounded-lg border">
            <div className="px-3 py-2 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <h3 className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                <MessageSquare size={12} />
                Captured Information
              </h3>
            </div>
            <div className="p-3">
              {call.qualification && Object.keys(call.qualification).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(call.qualification)
                    .filter(([key]) => !['name', 'customerName', 'email', 'phone', 'location', 'company'].includes(key))
                    .map(([key, value]) => {
                      // Format the value based on its type
                      let displayValue: string;
                      if (value === null || value === undefined) {
                        displayValue = '-';
                      } else if (typeof value === 'object') {
                        // Handle objects like moodAnalysis
                        if (value.finalMood || value.mood) {
                          const mood = value.finalMood || value.mood;
                          const intensity = value.intensity || '';
                          const changes = value.moodChanges || value.changes || 0;
                          displayValue = intensity ? `${mood} (${intensity})` : mood;
                          if (changes > 0) displayValue += ` - ${changes} changes`;
                        } else if (Array.isArray(value)) {
                          displayValue = value.join(', ');
                        } else {
                          // For other objects, format nicely
                          displayValue = Object.entries(value)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ');
                        }
                      } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Yes' : 'No';
                      } else {
                        displayValue = String(value);
                      }

                      const isLongText = displayValue.length > 40 || key === 'keyPoints' || key === 'nextAction' || key === 'summary' || key === 'requirements' || key === 'notes';
                      const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();

                      return (
                        <div key={key} className={isLongText ? 'flex flex-col gap-0.5' : 'flex justify-between items-start'}>
                          <span className="text-gray-500 capitalize text-sm">
                            {formattedKey}
                          </span>
                          <span className={`font-medium text-gray-900 text-sm ${isLongText ? 'text-left bg-gray-50 p-2 rounded' : 'text-right max-w-[55%]'}`}>
                            {displayValue}
                          </span>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-xs">No additional data captured</p>
                </div>
              )}
            </div>
          </div>

          {/* Outcome Notes */}
          {call.outcomeNotes && (
            <div className="bg-white rounded-lg border">
              <div className="px-3 py-2 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
                <h3 className="text-xs font-semibold text-yellow-700">Notes</h3>
              </div>
              <div className="p-3">
                <p className="text-sm text-gray-700">{call.outcomeNotes}</p>
              </div>
            </div>
          )}

          {/* Campaign Info */}
          {call.campaign && (
            <div className="bg-white rounded-lg border">
              <div className="px-3 py-2 border-b bg-gray-50">
                <h3 className="text-xs font-semibold text-gray-700">Campaign</h3>
              </div>
              <div className="p-3 text-sm">
                <p className="font-medium">{call.campaign.name}</p>
                <button
                  onClick={() => navigate(`/outbound-calls/campaigns/${call.campaign?.id}`)}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  View Campaign →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallDetailsPage;
