import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  telecallerQueueService,
  TelecallerQueueItem,
  QueueStats,
} from '../../services/telecallerQueue.service';
import {
  PhoneIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  PlayIcon,
  ForwardIcon,
  ChatBubbleLeftRightIcon,
  FireIcon,
  ExclamationTriangleIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const sentimentColors: Record<string, { bg: string; text: string }> = {
  positive: { bg: 'bg-success-50', text: 'text-success-700' },
  neutral: { bg: 'bg-slate-100', text: 'text-slate-700' },
  negative: { bg: 'bg-danger-50', text: 'text-danger-700' },
};

const outcomeLabels: Record<string, string> = {
  CONVERTED: 'Converted',
  APPOINTMENT_SET: 'Appointment Set',
  CALLBACK_SET: 'Callback Scheduled',
  NOT_INTERESTED: 'Not Interested',
  WRONG_NUMBER: 'Wrong Number',
  NO_ANSWER: 'No Answer',
  VOICEMAIL: 'Voicemail',
  DO_NOT_CALL: 'Do Not Call',
};

export default function TelecallerQueuePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [items, setItems] = useState<TelecallerQueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TelecallerQueueItem | null>(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({
    outcome: '',
    notes: '',
    callbackDate: '',
    callbackTime: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [queueData, statsData] = await Promise.all([
        telecallerQueueService.getQueue({ limit: 50 }),
        telecallerQueueService.getStats(),
      ]);
      setItems(queueData.items);
      setStats(statsData);
    } catch (error) {
      toast.error('Failed to load queue');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleClaim = async (item: TelecallerQueueItem) => {
    try {
      const updated = await telecallerQueueService.claimItem(item.id);
      setItems(items.map((i) => (i.id === item.id ? updated : i)));
      setSelectedItem(updated);
      toast.success('Item claimed! Ready to call.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to claim item');
    }
  };

  const handleRelease = async (item: TelecallerQueueItem) => {
    try {
      await telecallerQueueService.releaseItem(item.id);
      setSelectedItem(null);
      loadData();
      toast.success('Item released back to queue');
    } catch (error: any) {
      toast.error(error.message || 'Failed to release item');
    }
  };

  const handleSkip = async (item: TelecallerQueueItem) => {
    const reason = prompt('Reason for skipping (optional):');
    try {
      await telecallerQueueService.skipItem(item.id, reason || undefined);
      setSelectedItem(null);
      loadData();
      toast.success('Item skipped');
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip item');
    }
  };

  const handleComplete = async () => {
    if (!selectedItem || !completeForm.outcome) {
      toast.error('Please select an outcome');
      return;
    }

    try {
      let callbackScheduled: string | undefined;
      if (completeForm.outcome === 'CALLBACK_SET' && completeForm.callbackDate) {
        callbackScheduled = `${completeForm.callbackDate}T${completeForm.callbackTime || '10:00'}:00`;
      }

      await telecallerQueueService.completeItem(selectedItem.id, {
        telecallerOutcome: completeForm.outcome,
        telecallerNotes: completeForm.notes || undefined,
        callbackScheduled,
      });

      setShowCompleteModal(false);
      setSelectedItem(null);
      setCompleteForm({ outcome: '', notes: '', callbackDate: '', callbackTime: '' });
      loadData();
      toast.success('Item completed!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete item');
    }
  };

  const makeCall = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  const getPriorityBadge = (priority: number) => {
    if (priority <= 2) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-700">
          <FireIcon className="w-3 h-3" />
          Hot
        </span>
      );
    }
    if (priority <= 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
          High
        </span>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Telecaller Queue</h1>
          <p className="text-slate-500 mt-1">
            AI-qualified leads ready for your call
          </p>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          <ArrowPathIcon className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <ClockIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalPending}</p>
                <p className="text-xs text-slate-500">Pending</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-danger-100">
                <FireIcon className="w-5 h-5 text-danger-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.highPriority}</p>
                <p className="text-xs text-slate-500">Hot Leads</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-100">
                <PhoneIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.myItems}</p>
                <p className="text-xs text-slate-500">My Items</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100">
                <CheckCircleIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalCompleted}</p>
                <p className="text-xs text-slate-500">Completed Today</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <CalendarIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalCallback}</p>
                <p className="text-xs text-slate-500">Callbacks</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <UserIcon className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalClaimed}</p>
                <p className="text-xs text-slate-500">In Progress</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Queue List */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Queue Items</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {isLoading ? (
                <div className="p-8 text-center">
                  <span className="spinner spinner-lg"></span>
                  <p className="mt-2 text-slate-500">Loading queue...</p>
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircleIcon className="w-12 h-12 mx-auto text-success-500" />
                  <p className="mt-2 text-slate-600 font-medium">Queue is empty!</p>
                  <p className="text-sm text-slate-500">No leads waiting for calls.</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${
                      selectedItem?.id === item.id ? 'bg-primary-50 border-l-4 border-primary-500' : ''
                    } ${item.assignedToId === user?.id ? 'bg-warning-50/50' : ''}`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900 truncate">
                            {item.contactName || 'Unknown Contact'}
                          </p>
                          {getPriorityBadge(item.priority)}
                          {item.assignedToId === user?.id && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-warning-100 text-warning-700">
                              Claimed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600">{item.phoneNumber}</p>
                        {item.reason && (
                          <p className="text-xs text-slate-500 mt-1">{item.reason}</p>
                        )}
                        {item.aiCallSentiment && (
                          <span
                            className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                              sentimentColors[item.aiCallSentiment]?.bg || 'bg-slate-100'
                            } ${sentimentColors[item.aiCallSentiment]?.text || 'text-slate-700'}`}
                          >
                            {item.aiCallSentiment} sentiment
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.status === 'PENDING' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleClaim(item);
                            }}
                            className="btn btn-primary btn-sm"
                          >
                            <PlayIcon className="w-4 h-4" />
                            Claim
                          </button>
                        )}
                        {item.assignedToId === user?.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              makeCall(item.phoneNumber);
                            }}
                            className="btn btn-success btn-sm"
                          >
                            <PhoneIcon className="w-4 h-4" />
                            Call
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Selected Item Details */}
        <div className="lg:col-span-1">
          <div className="card sticky top-4">
            <div className="card-header">
              <h3 className="card-title">Lead Details</h3>
            </div>
            {selectedItem ? (
              <div className="card-body space-y-4">
                {/* Contact Info */}
                <div>
                  <h4 className="text-sm font-medium text-slate-500 mb-2">Contact</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      <span className="text-slate-900">
                        {selectedItem.contactName || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneIcon className="w-4 h-4 text-slate-400" />
                      <a
                        href={`tel:${selectedItem.phoneNumber}`}
                        className="text-primary-600 hover:underline"
                      >
                        {selectedItem.phoneNumber}
                      </a>
                    </div>
                    {selectedItem.email && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">@</span>
                        <span className="text-slate-600">{selectedItem.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* AI Call Summary */}
                {selectedItem.aiCallSummary && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-2">
                      <ChatBubbleLeftRightIcon className="w-4 h-4 inline mr-1" />
                      AI Call Summary
                    </h4>
                    <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                      {selectedItem.aiCallSummary}
                    </p>
                  </div>
                )}

                {/* AI Call Stats */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedItem.aiCallDuration && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">Call Duration</p>
                      <p className="text-lg font-semibold text-slate-900">
                        {Math.floor(selectedItem.aiCallDuration / 60)}:
                        {String(selectedItem.aiCallDuration % 60).padStart(2, '0')}
                      </p>
                    </div>
                  )}
                  {selectedItem.aiCallOutcome && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500">AI Outcome</p>
                      <p className="text-sm font-semibold text-slate-900">
                        {selectedItem.aiCallOutcome.replace('_', ' ')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Qualification Data */}
                {selectedItem.qualification &&
                  Object.keys(selectedItem.qualification).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">
                        Qualification Data
                      </h4>
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                        {Object.entries(selectedItem.qualification).map(([key, value]) => (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="text-slate-500 capitalize">
                              {key.replace(/_/g, ' ')}:
                            </span>
                            <span className="text-slate-900 font-medium">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Actions */}
                <div className="pt-4 border-t border-slate-200 space-y-2">
                  {selectedItem.assignedToId === user?.id ? (
                    <>
                      <button
                        onClick={() => makeCall(selectedItem.phoneNumber)}
                        className="btn btn-success w-full"
                      >
                        <PhoneIcon className="w-4 h-4" />
                        Call Now
                      </button>
                      <button
                        onClick={() => setShowCompleteModal(true)}
                        className="btn btn-primary w-full"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Mark Complete
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleSkip(selectedItem)}
                          className="btn btn-secondary"
                        >
                          <ForwardIcon className="w-4 h-4" />
                          Skip
                        </button>
                        <button
                          onClick={() => handleRelease(selectedItem)}
                          className="btn btn-secondary"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          Release
                        </button>
                      </div>
                    </>
                  ) : selectedItem.status === 'PENDING' ? (
                    <button
                      onClick={() => handleClaim(selectedItem)}
                      className="btn btn-primary w-full"
                    >
                      <PlayIcon className="w-4 h-4" />
                      Claim This Lead
                    </button>
                  ) : (
                    <div className="text-center py-4">
                      <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-warning-500" />
                      <p className="text-sm text-slate-600 mt-2">
                        This item is claimed by another telecaller
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="card-body text-center py-12">
                <UserIcon className="w-12 h-12 mx-auto text-slate-300" />
                <p className="mt-2 text-slate-500">Select a lead to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowCompleteModal(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              Complete Call with {selectedItem.contactName || selectedItem.phoneNumber}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Outcome *
                </label>
                <select
                  value={completeForm.outcome}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, outcome: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="">Select outcome...</option>
                  {Object.entries(outcomeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {completeForm.outcome === 'CALLBACK_SET' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Callback Date
                    </label>
                    <input
                      type="date"
                      value={completeForm.callbackDate}
                      onChange={(e) =>
                        setCompleteForm({ ...completeForm, callbackDate: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Time
                    </label>
                    <input
                      type="time"
                      value={completeForm.callbackTime}
                      onChange={(e) =>
                        setCompleteForm({ ...completeForm, callbackTime: e.target.value })
                      }
                      className="input w-full"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={completeForm.notes}
                  onChange={(e) =>
                    setCompleteForm({ ...completeForm, notes: e.target.value })
                  }
                  className="input w-full"
                  rows={3}
                  placeholder="Add any notes about the call..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button onClick={handleComplete} className="btn btn-primary flex-1">
                Complete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
