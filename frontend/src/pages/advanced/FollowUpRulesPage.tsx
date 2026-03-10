import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface FollowUpRule {
  id: string;
  name: string;
  description?: string;
  triggerEvent: string;
  triggerConditions: Record<string, any>;
  actionType: string;
  actionConfig: Record<string, any>;
  delayMinutes: number;
  maxAttempts: number;
  isActive: boolean;
  priority: number;
  createdAt: string;
}

export default function FollowUpRulesPage() {
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerEvent: 'CALL_MISSED',
    triggerConditions: '{}',
    actionType: 'SEND_SMS',
    actionConfig: '{"message": ""}',
    delayMinutes: 30,
    maxAttempts: 3,
    priority: 5,
    isActive: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/advanced/follow-up-rules');
      setRules(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch follow-up rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        triggerConditions: JSON.parse(formData.triggerConditions),
        actionConfig: JSON.parse(formData.actionConfig),
      };

      if (editingRule) {
        await api.put(`/advanced/follow-up-rules/${editingRule.id}`, payload);
      } else {
        await api.post('/advanced/follow-up-rules', payload);
      }
      setShowModal(false);
      setEditingRule(null);
      resetForm();
      fetchRules();
    } catch (error) {
      console.error('Failed to save rule:', error);
      alert('Failed to save rule. Please check JSON syntax.');
    }
  };

  const handleEdit = (rule: FollowUpRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      triggerEvent: rule.triggerEvent,
      triggerConditions: JSON.stringify(rule.triggerConditions, null, 2),
      actionType: rule.actionType,
      actionConfig: JSON.stringify(rule.actionConfig, null, 2),
      delayMinutes: rule.delayMinutes,
      maxAttempts: rule.maxAttempts,
      priority: rule.priority,
      isActive: rule.isActive,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await api.delete(`/advanced/follow-up-rules/${id}`);
      fetchRules();
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const handleToggle = async (rule: FollowUpRule) => {
    try {
      await api.put(`/advanced/follow-up-rules/${rule.id}`, {
        isActive: !rule.isActive,
      });
      fetchRules();
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      triggerEvent: 'CALL_MISSED',
      triggerConditions: '{}',
      actionType: 'SEND_SMS',
      actionConfig: '{"message": ""}',
      delayMinutes: 30,
      maxAttempts: 3,
      priority: 5,
      isActive: true,
    });
  };

  const getTriggerLabel = (trigger: string) => {
    const labels: Record<string, string> = {
      CALL_MISSED: 'Call Missed',
      CALL_NO_ANSWER: 'No Answer',
      CALL_COMPLETED: 'Call Completed',
      CALL_VOICEMAIL: 'Voicemail Left',
      LEAD_CREATED: 'Lead Created',
      APPOINTMENT_BOOKED: 'Appointment Booked',
      FORM_SUBMITTED: 'Form Submitted',
    };
    return labels[trigger] || trigger;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      SEND_SMS: 'Send SMS',
      SEND_EMAIL: 'Send Email',
      SEND_WHATSAPP: 'Send WhatsApp',
      SCHEDULE_CALLBACK: 'Schedule Callback',
      CREATE_TASK: 'Create Task',
      TRIGGER_WEBHOOK: 'Trigger Webhook',
    };
    return labels[action] || action;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to="/advanced" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Auto Follow-up Rules</h1>
        </div>
        <button
          onClick={() => {
            setEditingRule(null);
            resetForm();
            setShowModal(true);
          }}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          Create Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="grid gap-4">
        {rules.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            No follow-up rules configured yet
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white rounded-lg shadow p-6 ${
                !rule.isActive ? 'opacity-60' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">{rule.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {rule.description && (
                    <p className="text-gray-500 mt-1">{rule.description}</p>
                  )}
                  <div className="flex flex-wrap gap-4 mt-4 text-sm">
                    <div>
                      <span className="text-gray-500">Trigger:</span>{' '}
                      <span className="font-medium text-blue-600">
                        {getTriggerLabel(rule.triggerEvent)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Action:</span>{' '}
                      <span className="font-medium text-green-600">
                        {getActionLabel(rule.actionType)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Delay:</span>{' '}
                      <span className="font-medium">{rule.delayMinutes} min</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Max attempts:</span>{' '}
                      <span className="font-medium">{rule.maxAttempts}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Priority:</span>{' '}
                      <span className="font-medium">{rule.priority}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`px-3 py-1 rounded ${
                      rule.isActive
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {rule.isActive ? 'Disable' : 'Enable'}
                  </button>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(rule.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4">
            <h2 className="text-xl font-bold mb-4">
              {editingRule ? 'Edit Rule' : 'Create Follow-up Rule'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({ ...formData, priority: Number(e.target.value) })
                    }
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Trigger Event</label>
                  <select
                    value={formData.triggerEvent}
                    onChange={(e) => setFormData({ ...formData, triggerEvent: e.target.value })}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  >
                    <option value="CALL_MISSED">Call Missed</option>
                    <option value="CALL_NO_ANSWER">No Answer</option>
                    <option value="CALL_COMPLETED">Call Completed</option>
                    <option value="CALL_VOICEMAIL">Voicemail Left</option>
                    <option value="LEAD_CREATED">Lead Created</option>
                    <option value="APPOINTMENT_BOOKED">Appointment Booked</option>
                    <option value="FORM_SUBMITTED">Form Submitted</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Action Type</label>
                  <select
                    value={formData.actionType}
                    onChange={(e) => setFormData({ ...formData, actionType: e.target.value })}
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  >
                    <option value="SEND_SMS">Send SMS</option>
                    <option value="SEND_EMAIL">Send Email</option>
                    <option value="SEND_WHATSAPP">Send WhatsApp</option>
                    <option value="SCHEDULE_CALLBACK">Schedule Callback</option>
                    <option value="CREATE_TASK">Create Task</option>
                    <option value="TRIGGER_WEBHOOK">Trigger Webhook</option>
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.delayMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, delayMinutes: Number(e.target.value) })
                    }
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Attempts</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxAttempts}
                    onChange={(e) =>
                      setFormData({ ...formData, maxAttempts: Number(e.target.value) })
                    }
                    className="mt-1 block w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trigger Conditions (JSON)
                </label>
                <textarea
                  value={formData.triggerConditions}
                  onChange={(e) =>
                    setFormData({ ...formData, triggerConditions: e.target.value })
                  }
                  className="mt-1 block w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  rows={3}
                  placeholder='{"leadScore": {"min": 50}}'
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Action Config (JSON)
                </label>
                <textarea
                  value={formData.actionConfig}
                  onChange={(e) => setFormData({ ...formData, actionConfig: e.target.value })}
                  className="mt-1 block w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  rows={3}
                  placeholder='{"message": "Hi {{firstName}}, we missed your call..."}'
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4 text-green-600 border-gray-300 rounded"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Rule is active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRule(null);
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
