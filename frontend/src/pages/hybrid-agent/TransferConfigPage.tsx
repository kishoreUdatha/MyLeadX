import React, { useState, useEffect } from 'react';
import {
  Phone,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Users,
  Voicemail,
  ArrowRightLeft,
  AlertCircle,
} from 'lucide-react';
import api from '../../services/api';

interface TransferConfig {
  id: string;
  name: string;
  agentId?: string;
  triggerKeywords: string[];
  triggerSentiment?: string;
  maxAITurns?: number;
  transferType: 'PHONE' | 'SIP' | 'QUEUE' | 'VOICEMAIL';
  transferTo: string;
  transferMessage?: string;
  fallbackMessage?: string;
  voicemailEnabled: boolean;
  createdAt: string;
}

interface VoiceAgent {
  id: string;
  name: string;
}

const transferTypeLabels: Record<string, { label: string; icon: React.ReactNode }> = {
  PHONE: { label: 'Phone Number', icon: <Phone size={16} /> },
  SIP: { label: 'SIP Endpoint', icon: <Phone size={16} /> },
  QUEUE: { label: 'Telecaller Queue', icon: <Users size={16} /> },
  VOICEMAIL: { label: 'Voicemail', icon: <Voicemail size={16} /> },
};

export const TransferConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<TransferConfig[]>([]);
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    triggerKeywords: '',
    triggerSentiment: '',
    maxAITurns: 5,
    transferType: 'PHONE' as 'PHONE' | 'SIP' | 'QUEUE' | 'VOICEMAIL',
    transferTo: '',
    transferMessage: '',
    fallbackMessage: '',
    voicemailEnabled: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [configsRes, agentsRes] = await Promise.all([
        api.get('/outbound-calls/transfer-configs'),
        api.get('/voice-ai/agents'),
      ]);
      setConfigs(configsRes.data.data || []);
      setAgents(agentsRes.data.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      agentId: '',
      triggerKeywords: '',
      triggerSentiment: '',
      maxAITurns: 5,
      transferType: 'PHONE',
      transferTo: '',
      transferMessage: '',
      fallbackMessage: '',
      voicemailEnabled: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (config: TransferConfig) => {
    setFormData({
      name: config.name,
      agentId: config.agentId || '',
      triggerKeywords: config.triggerKeywords.join(', '),
      triggerSentiment: config.triggerSentiment || '',
      maxAITurns: config.maxAITurns || 5,
      transferType: config.transferType,
      transferTo: config.transferTo,
      transferMessage: config.transferMessage || '',
      fallbackMessage: config.fallbackMessage || '',
      voicemailEnabled: config.voicemailEnabled,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        triggerKeywords: formData.triggerKeywords
          .split(',')
          .map(k => k.trim())
          .filter(Boolean),
        agentId: formData.agentId || undefined,
        triggerSentiment: formData.triggerSentiment || undefined,
        transferMessage: formData.transferMessage || undefined,
        fallbackMessage: formData.fallbackMessage || undefined,
      };

      if (editingId) {
        await api.put(`/outbound-calls/transfer-configs/${editingId}`, payload);
      } else {
        await api.post('/outbound-calls/transfer-configs', payload);
      }

      await fetchData();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transfer config?')) return;
    try {
      await api.delete(`/outbound-calls/transfer-configs/${id}`);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete config');
    }
  };

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Human Handoff Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure when and how calls transfer to human agents
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={20} />
          New Transfer Rule
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">
                  {editingId ? 'Edit Transfer Rule' : 'New Transfer Rule'}
                </h2>
                <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                  <X size={24} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Escalation to Sales"
                />
              </div>

              {/* Agent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Apply to Agent (Optional)
                </label>
                <select
                  value={formData.agentId}
                  onChange={e => setFormData({ ...formData, agentId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Agents</option>
                  {agents.map(agent => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </div>

              {/* Trigger Keywords */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trigger Keywords (comma-separated)
                </label>
                <input
                  type="text"
                  value={formData.triggerKeywords}
                  onChange={e => setFormData({ ...formData, triggerKeywords: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="speak to human, real person, transfer me"
                />
                <p className="text-xs text-gray-500 mt-1">
                  When caller says these words, transfer will be initiated
                </p>
              </div>

              {/* Max AI Turns */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max AI Conversation Turns
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={formData.maxAITurns}
                  onChange={e => setFormData({ ...formData, maxAITurns: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-transfer after this many back-and-forth exchanges
                </p>
              </div>

              {/* Transfer Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(transferTypeLabels).map(([type, { label, icon }]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, transferType: type as any })}
                      className={`flex items-center gap-2 p-3 border rounded-lg transition ${
                        formData.transferType === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {icon}
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transfer To */}
              {formData.transferType !== 'QUEUE' && formData.transferType !== 'VOICEMAIL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transfer To *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.transferTo}
                    onChange={e => setFormData({ ...formData, transferTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.transferType === 'PHONE' ? '+1234567890' : 'sip:user@domain.com'}
                  />
                </div>
              )}

              {/* Transfer Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transfer Message (to caller)
                </label>
                <textarea
                  value={formData.transferMessage}
                  onChange={e => setFormData({ ...formData, transferMessage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Please hold while I connect you with a human agent..."
                />
              </div>

              {/* Fallback Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fallback Message (if unavailable)
                </label>
                <textarea
                  value={formData.fallbackMessage}
                  onChange={e => setFormData({ ...formData, fallbackMessage: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="All agents are busy. Would you like to leave a voicemail?"
                />
              </div>

              {/* Voicemail Enabled */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="voicemailEnabled"
                  checked={formData.voicemailEnabled}
                  onChange={e => setFormData({ ...formData, voicemailEnabled: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="voicemailEnabled" className="text-sm text-gray-700">
                  Enable voicemail fallback if no agents available
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save size={18} />
                  {editingId ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configs List */}
      {configs.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <ArrowRightLeft size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Transfer Rules Yet</h3>
          <p className="text-gray-600 mb-4">
            Create transfer rules to enable human handoff during AI calls
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus size={20} />
            Create First Rule
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {configs.map(config => (
            <div key={config.id} className="bg-white rounded-lg shadow border p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{config.name}</h3>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {transferTypeLabels[config.transferType]?.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Transfer To</p>
                      <p className="font-medium">{config.transferTo || 'Queue'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Max AI Turns</p>
                      <p className="font-medium">{config.maxAITurns || 'Unlimited'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Voicemail</p>
                      <p className="font-medium">{config.voicemailEnabled ? 'Enabled' : 'Disabled'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Keywords</p>
                      <p className="font-medium text-xs">
                        {config.triggerKeywords.length > 0
                          ? config.triggerKeywords.slice(0, 3).join(', ') +
                            (config.triggerKeywords.length > 3 ? '...' : '')
                          : 'None'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(config)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(config.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransferConfigPage;
