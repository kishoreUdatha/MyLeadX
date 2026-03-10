import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone,
  Plus,
  Settings,
  BarChart3,
  Trash2,
  Copy,
  Play,
  Pause,
  Users,
  Clock,
  TrendingUp,
} from 'lucide-react';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  voiceId: string;
  widgetColor: string;
  createdAt: string;
  _count: {
    sessions: number;
  };
}

const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Care',
  TECHNICAL_INTERVIEW: 'Technical Interview',
  HEALTHCARE: 'Healthcare',
  FINANCE: 'Finance',
  ECOMMERCE: 'E-Commerce',
  CUSTOM: 'Custom',
};

const industryIcons: Record<string, string> = {
  EDUCATION: '🎓',
  IT_RECRUITMENT: '💼',
  REAL_ESTATE: '🏠',
  CUSTOMER_CARE: '📞',
  TECHNICAL_INTERVIEW: '💻',
  HEALTHCARE: '🏥',
  FINANCE: '💰',
  ECOMMERCE: '🛒',
  CUSTOM: '⚙️',
};

export const VoiceAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        setAgents(response.data.data);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await api.put(`/voice-ai/agents/${agentId}`, { isActive: !isActive });
      setAgents(agents.map(a =>
        a.id === agentId ? { ...a, isActive: !isActive } : a
      ));
    } catch (err) {
      console.error('Failed to toggle agent:', err);
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return;

    try {
      await api.delete(`/voice-ai/agents/${agentId}`);
      setAgents(agents.filter(a => a.id !== agentId));
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  const copyEmbedCode = async (agentId: string) => {
    try {
      const response = await api.get(`/voice-ai/agents/${agentId}/embed`);
      if (response.data.success) {
        await navigator.clipboard.writeText(response.data.data.embedCode);
        setCopiedId(agentId);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy embed code:', err);
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
    <div>
      {/* Compact Header */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Voice AI Agents</h1>
          <p className="text-gray-500 text-sm">Manage your AI voice agents</p>
        </div>
        <button
          onClick={() => navigate('/voice-ai/create')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
        >
          <Plus size={16} />
          Create Agent
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Compact Stats - Inline */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
          <Phone className="text-blue-600" size={16} />
          <span className="font-semibold">{agents.length}</span>
          <span className="text-gray-500">Agents</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
          <Play className="text-green-600" size={16} />
          <span className="font-semibold">{agents.filter(a => a.isActive).length}</span>
          <span className="text-gray-500">Active</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border">
          <Users className="text-purple-600" size={16} />
          <span className="font-semibold">{agents.reduce((acc, a) => acc + a._count.sessions, 0)}</span>
          <span className="text-gray-500">Sessions</span>
        </div>
      </div>

      {/* Agents Grid - Compact */}
      {agents.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center">
          <Phone size={36} className="mx-auto text-gray-400 mb-3" />
          <h3 className="font-medium text-gray-900 mb-1">No Voice Agents Yet</h3>
          <p className="text-gray-500 text-sm mb-3">Create your first AI voice agent</p>
          <button
            onClick={() => navigate('/voice-ai/create')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus size={16} />
            Create Agent
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {agents.map(agent => (
            <div
              key={agent.id}
              className="bg-white rounded-lg border overflow-hidden hover:shadow-md transition"
            >
              {/* Compact Card Header */}
              <div
                className="px-3 py-2 text-white"
                style={{ backgroundColor: agent.widgetColor }}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{industryIcons[agent.industry] || '🤖'}</span>
                    <div>
                      <h3 className="font-medium text-sm">{agent.name}</h3>
                      <p className="text-xs opacity-80">{industryLabels[agent.industry] || agent.industry}</p>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      agent.isActive ? 'bg-green-500/20 text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    {agent.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
              </div>

              {/* Compact Card Body */}
              <div className="p-2">
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {agent._count.sessions}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Compact Actions */}
                <div className="flex gap-1">
                  <button
                    onClick={() => navigate(`/voice-ai/agents/${agent.id}`)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition"
                  >
                    <Settings size={12} />
                    Config
                  </button>
                  <button
                    onClick={() => copyEmbedCode(agent.id)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs hover:bg-gray-200 transition"
                  >
                    <Copy size={12} />
                    {copiedId === agent.id ? 'Copied!' : 'Embed'}
                  </button>
                  <button
                    onClick={() => toggleAgent(agent.id, agent.isActive)}
                    className={`px-2 py-1.5 rounded text-xs ${
                      agent.isActive
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {agent.isActive ? <Pause size={12} /> : <Play size={12} />}
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="px-2 py-1.5 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200 transition"
                  >
                    <Trash2 size={12} />
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

export default VoiceAgentsPage;
