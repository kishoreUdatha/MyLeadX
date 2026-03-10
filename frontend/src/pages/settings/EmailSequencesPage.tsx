import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Trash2,
  Check,
  X,
  Loader2,
  Play,
  Pause,
  ChevronRight,
  Clock,
  Users,
  BarChart3,
  Edit,
  Copy,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import api from '../../services/api';

interface EmailSequenceStep {
  id: string;
  stepNumber: number;
  delayDays: number;
  delayHours: number;
  subject: string;
  body: string;
  sentCount: number;
  openedCount: number;
  clickedCount: number;
}

interface EmailSequence {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  triggerType: string;
  triggerStageId: string | null;
  sendOnWeekends: boolean;
  sendTimeStart: string;
  sendTimeEnd: string;
  totalEnrolled: number;
  totalCompleted: number;
  totalUnsubscribed: number;
  steps: EmailSequenceStep[];
}

const TRIGGER_TYPES = [
  { id: 'MANUAL', label: 'Manual Enrollment', description: 'Manually add leads to this sequence' },
  { id: 'LEAD_CREATED', label: 'Lead Created', description: 'When a new lead is created' },
  { id: 'STAGE_CHANGE', label: 'Stage Change', description: 'When lead enters a specific stage' },
  { id: 'VOICE_SESSION', label: 'Voice Session', description: 'After AI voice conversation' },
];

const EmailSequencesPage: React.FC = () => {
  const [sequences, setSequences] = useState<EmailSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [selectedSequence, setSelectedSequence] = useState<EmailSequence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'VOICE_SESSION',
    sendOnWeekends: false,
    sendTimeStart: '09:00',
    sendTimeEnd: '18:00',
  });

  const [stepFormData, setStepFormData] = useState({
    delayDays: 1,
    delayHours: 0,
    subject: '',
    body: '',
  });

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/email-sequences');
      setSequences(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to fetch sequences:', err);
      setError(err.response?.data?.message || 'Failed to load email sequences');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name) {
      setError('Please enter a sequence name');
      return;
    }

    try {
      setLoading(true);
      await api.post('/email-sequences', formData);
      setSuccess('Email sequence created successfully');
      setShowModal(false);
      setFormData({
        name: '',
        description: '',
        triggerType: 'VOICE_SESSION',
        sendOnWeekends: false,
        sendTimeStart: '09:00',
        sendTimeEnd: '18:00',
      });
      fetchSequences();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create sequence');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this email sequence?')) return;

    try {
      await api.delete(`/email-sequences/${id}`);
      setSuccess('Sequence deleted successfully');
      fetchSequences();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete sequence');
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/email-sequences/${id}`, { isActive: !isActive });
      setSuccess(isActive ? 'Sequence paused' : 'Sequence activated');
      fetchSequences();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update sequence');
    }
  };

  const handleAddStep = async () => {
    if (!selectedSequence || !stepFormData.subject || !stepFormData.body) {
      setError('Please fill in all step fields');
      return;
    }

    try {
      setLoading(true);
      await api.post(`/email-sequences/${selectedSequence.id}/steps`, {
        ...stepFormData,
        stepNumber: (selectedSequence.steps?.length || 0) + 1,
      });
      setSuccess('Step added successfully');
      setShowStepModal(false);
      setStepFormData({
        delayDays: 1,
        delayHours: 0,
        subject: '',
        body: '',
      });
      fetchSequences();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add step');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStep = async (sequenceId: string, stepId: string) => {
    if (!window.confirm('Are you sure you want to delete this step?')) return;

    try {
      await api.delete(`/email-sequences/${sequenceId}/steps/${stepId}`);
      setSuccess('Step deleted successfully');
      fetchSequences();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete step');
    }
  };

  const getTriggerLabel = (type: string) => {
    return TRIGGER_TYPES.find(t => t.id === type)?.label || type;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-teal-600" />
              Email Sequences
            </h1>
            <p className="text-gray-600 mt-1">
              Create automated email drip campaigns for lead nurturing
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <Plus size={18} />
            Create Sequence
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertCircle size={18} />
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}
        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle size={18} />
            {success}
            <button onClick={() => setSuccess(null)} className="ml-auto">
              <X size={18} />
            </button>
          </div>
        )}

        {loading && sequences.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-teal-600" size={32} />
          </div>
        ) : sequences.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Mail className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Email Sequences</h3>
            <p className="text-gray-600 mb-6">
              Create automated email sequences to nurture leads after voice conversations.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              <Plus size={18} />
              Create Your First Sequence
            </button>
          </div>
        ) : (
          /* Sequences List */
          <div className="space-y-4">
            {sequences.map(sequence => (
              <div
                key={sequence.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Sequence Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        {sequence.name}
                        {sequence.isActive ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center gap-1">
                            <Play size={10} />
                            Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full flex items-center gap-1">
                            <Pause size={10} />
                            Paused
                          </span>
                        )}
                      </h3>
                      {sequence.description && (
                        <p className="text-sm text-gray-500 mt-1">{sequence.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          Trigger: {getTriggerLabel(sequence.triggerType)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Mail size={14} />
                          {sequence.steps?.length || 0} emails
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(sequence.id, sequence.isActive)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          sequence.isActive ? 'bg-teal-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                            sequence.isActive ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(sequence.id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900">{sequence.totalEnrolled}</div>
                      <div className="text-xs text-gray-500">Enrolled</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-green-600">{sequence.totalCompleted}</div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-red-600">{sequence.totalUnsubscribed}</div>
                      <div className="text-xs text-gray-500">Unsubscribed</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600">
                        {sequence.totalEnrolled > 0
                          ? Math.round((sequence.totalCompleted / sequence.totalEnrolled) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-500">Completion Rate</div>
                    </div>
                  </div>
                </div>

                {/* Steps */}
                <div className="p-6 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Email Steps</h4>
                    <button
                      onClick={() => {
                        setSelectedSequence(sequence);
                        setShowStepModal(true);
                      }}
                      className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Add Step
                    </button>
                  </div>

                  {(!sequence.steps || sequence.steps.length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No email steps yet. Add your first email to this sequence.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sequence.steps.map((step, index) => (
                        <div
                          key={step.id}
                          className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4"
                        >
                          <div className="w-8 h-8 bg-teal-100 text-teal-600 rounded-full flex items-center justify-center font-semibold">
                            {step.stepNumber}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{step.subject}</div>
                            <div className="text-sm text-gray-500">
                              {step.delayDays > 0 && `${step.delayDays} day${step.delayDays > 1 ? 's' : ''}`}
                              {step.delayDays > 0 && step.delayHours > 0 && ', '}
                              {step.delayHours > 0 && `${step.delayHours} hour${step.delayHours > 1 ? 's' : ''}`}
                              {step.delayDays === 0 && step.delayHours === 0 && 'Immediately'}
                              {' '}after {index === 0 ? 'enrollment' : `email ${index}`}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span title="Sent">{step.sentCount} sent</span>
                            <span title="Opened" className="text-green-600">{step.openedCount} opened</span>
                            <span title="Clicked" className="text-blue-600">{step.clickedCount} clicked</span>
                          </div>
                          <button
                            onClick={() => handleDeleteStep(sequence.id, step.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Sequence Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-lg p-6 m-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Create Email Sequence</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sequence Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Welcome Series"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="What is this sequence for?"
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trigger</label>
                  <div className="space-y-2">
                    {TRIGGER_TYPES.map(trigger => (
                      <label
                        key={trigger.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                          formData.triggerType === trigger.id
                            ? 'border-teal-500 bg-teal-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="triggerType"
                          value={trigger.id}
                          checked={formData.triggerType === trigger.id}
                          onChange={e => setFormData({ ...formData, triggerType: e.target.value })}
                          className="sr-only"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{trigger.label}</div>
                          <div className="text-xs text-gray-500">{trigger.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send After</label>
                    <input
                      type="time"
                      value={formData.sendTimeStart}
                      onChange={e => setFormData({ ...formData, sendTimeStart: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Send Before</label>
                    <input
                      type="time"
                      value={formData.sendTimeEnd}
                      onChange={e => setFormData({ ...formData, sendTimeEnd: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="sendOnWeekends"
                    checked={formData.sendOnWeekends}
                    onChange={e => setFormData({ ...formData, sendOnWeekends: e.target.checked })}
                    className="w-4 h-4 text-teal-600 border-gray-300 rounded"
                  />
                  <label htmlFor="sendOnWeekends" className="text-sm text-gray-700">
                    Send emails on weekends
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading || !formData.name}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                  Create Sequence
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Step Modal */}
        {showStepModal && selectedSequence && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl w-full max-w-2xl p-6 m-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Add Email Step to "{selectedSequence.name}"
                </h2>
                <button onClick={() => setShowStepModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delay (Days)</label>
                    <input
                      type="number"
                      min="0"
                      value={stepFormData.delayDays}
                      onChange={e => setStepFormData({ ...stepFormData, delayDays: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Delay (Hours)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={stepFormData.delayHours}
                      onChange={e => setStepFormData({ ...stepFormData, delayHours: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Subject</label>
                  <input
                    type="text"
                    value={stepFormData.subject}
                    onChange={e => setStepFormData({ ...stepFormData, subject: e.target.value })}
                    placeholder="e.g., Thanks for your interest, {{firstName}}!"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Use {'{{firstName}}'}, {'{{lastName}}'}, {'{{email}}'} for personalization
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Body (HTML)</label>
                  <textarea
                    value={stepFormData.body}
                    onChange={e => setStepFormData({ ...stepFormData, body: e.target.value })}
                    placeholder="<p>Hi {{firstName}},</p><p>Thank you for speaking with us...</p>"
                    rows={10}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => setShowStepModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStep}
                  disabled={loading || !stepFormData.subject || !stepFormData.body}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Add Step
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSequencesPage;
