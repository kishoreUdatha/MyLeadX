import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Bot,
  User,
  Loader2,
  Sparkles,
  Headphones,
  MessageSquare,
  FileText,
  CheckCircle2,
  PhoneCall,
  Zap,
} from 'lucide-react';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  language?: string;
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
  IT_RECRUITMENT: '💻',
  REAL_ESTATE: '🏠',
  CUSTOMER_CARE: '🎧',
  TECHNICAL_INTERVIEW: '⚙️',
  HEALTHCARE: '🏥',
  FINANCE: '💰',
  ECOMMERCE: '🛒',
  CUSTOM: '⚡',
};

export const MakeSingleCallPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    agentId: '',
    phone: '',
    contactName: '',
    leadId: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        setAgents(response.data.data.filter((a: VoiceAgent) => a.isActive));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.agentId || !formData.phone) {
      setError('Please select an agent and enter a phone number');
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    const cleanPhone = formData.phone.replace(/[\s-()]/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      setError('Please enter a valid phone number with country code (e.g., +919876543210)');
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post('/outbound-calls/call', {
        agentId: formData.agentId,
        phone: cleanPhone,
        contactName: formData.contactName || undefined,
        leadId: formData.leadId || undefined,
      });

      if (response.data.success) {
        setSuccess(`Call initiated successfully!`);
        setTimeout(() => {
          navigate(`/outbound-calls/calls/${response.data.data.callId}`);
        }, 1500);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate call');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedAgent = agents.find(a => a.id === formData.agentId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/outbound-calls')}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft size={20} className="text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                  <PhoneCall size={20} className="text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Make AI Call</h1>
                  <p className="text-sm text-gray-500">Start an intelligent conversation</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap size={16} className="text-yellow-500" />
              <span>Powered by AI</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error & Success Messages */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-red-600 text-lg">!</span>
                </div>
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="text-green-600" size={20} />
                </div>
                <p className="text-green-700 font-medium">{success}</p>
              </div>
            )}

            {/* Select Agent Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Bot size={18} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Select AI Agent</h2>
                    <p className="text-sm text-gray-500">Choose the agent for this call</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {agents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bot size={32} className="text-gray-400" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-2">No Active Agents</h3>
                    <p className="text-gray-500 mb-4">Create a voice agent to start making calls</p>
                    <button
                      type="button"
                      onClick={() => navigate('/voice-ai/create')}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Sparkles size={16} />
                      Create Agent
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {agents.map((agent) => (
                      <label
                        key={agent.id}
                        className={`relative flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                          formData.agentId === agent.id
                            ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-500/10'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="agentId"
                          value={agent.id}
                          checked={formData.agentId === agent.id}
                          onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                          className="hidden"
                        />
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                          formData.agentId === agent.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {industryIcons[agent.industry] || '🤖'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{agent.name}</p>
                          <p className="text-sm text-gray-500">
                            {industryLabels[agent.industry] || agent.industry}
                          </p>
                          {agent.language && (
                            <span className="inline-flex items-center mt-2 px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-600">
                              {agent.language}
                            </span>
                          )}
                        </div>
                        {formData.agentId === agent.id && (
                          <div className="absolute top-3 right-3">
                            <CheckCircle2 size={20} className="text-blue-600" />
                          </div>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Contact Details Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <User size={18} className="text-green-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Contact Details</h2>
                    <p className="text-sm text-gray-500">Enter the recipient's information</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Phone size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Include country code (e.g., +91 for India)
                  </p>
                </div>

                {/* Contact Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Name <span className="text-gray-400">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Enter contact name"
                      className="w-full pl-12 pr-4 py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || agents.length === 0 || !formData.agentId}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 font-semibold text-lg"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="animate-spin" size={22} />
                      Initiating Call...
                    </>
                  ) : (
                    <>
                      <Phone size={22} />
                      Start AI Call
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Selected Agent Preview */}
            {selectedAgent && (
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur">
                    {industryIcons[selectedAgent.industry] || '🤖'}
                  </div>
                  <div>
                    <p className="text-blue-100 text-sm">Selected Agent</p>
                    <h3 className="font-bold text-lg">{selectedAgent.name}</h3>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <CheckCircle2 size={16} />
                  <span>Ready to make calls</span>
                </div>
              </div>
            )}

            {/* How it Works */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">How It Works</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <PhoneCall size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">AI Initiates Call</p>
                    <p className="text-sm text-gray-500">Agent calls the number via Exotel</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Headphones size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Natural Conversation</p>
                    <p className="text-sm text-gray-500">AI speaks and understands responses</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Smart Data Collection</p>
                    <p className="text-sm text-gray-500">Collects info based on agent config</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Auto Documentation</p>
                    <p className="text-sm text-gray-500">Recording & transcript saved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Card */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-yellow-400" />
                <span className="text-sm font-medium text-gray-300">AI Capabilities</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Languages</span>
                  <span className="font-semibold">12+ Indian</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Voice Quality</span>
                  <span className="font-semibold">HD Audio</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400 text-sm">Response Time</span>
                  <span className="font-semibold">&lt; 1 sec</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MakeSingleCallPage;
