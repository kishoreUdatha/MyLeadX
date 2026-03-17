import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Phone,
  Bot,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Search,
  Clock,
  FileText,
  Headphones,
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

export const MakeSingleCallPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    agentId: '',
    phone: '',
    contactName: '',
  });

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.agent-dropdown')) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        const activeAgents = response.data.data.filter((a: VoiceAgent) => a.isActive);
        setAgents(activeAgents);
        if (activeAgents.length > 0) {
          setFormData(prev => ({ ...prev, agentId: activeAgents[0].id }));
        }
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

    if (!formData.agentId) {
      setError('Please select an AI agent');
      return;
    }

    if (!formData.phone) {
      setError('Please enter a phone number');
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
      });

      if (response.data.success) {
        setSuccess('Call initiated successfully');
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
  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    industryLabels[a.industry]?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/outbound-calls')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-base font-semibold text-gray-900">New Outbound Call</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Call Configuration</h2>
                <p className="text-sm text-gray-500 mt-0.5">Configure the AI agent and recipient details</p>
              </div>

              {/* Alerts */}
              {error && (
                <div className="mx-6 mt-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle size={18} className="text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-700 mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {success && (
                <div className="mx-6 mt-6 flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Success</p>
                    <p className="text-sm text-green-700 mt-0.5">{success}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Agent Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    AI Agent <span className="text-red-500">*</span>
                  </label>
                  {agents.length === 0 ? (
                    <div className="border border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <Bot size={32} className="text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 mb-3">No active agents available</p>
                      <button
                        type="button"
                        onClick={() => navigate('/voice-ai/create')}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Create an agent
                      </button>
                    </div>
                  ) : (
                    <div className="relative agent-dropdown">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-left hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        {selectedAgent ? (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Bot size={16} className="text-blue-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{selectedAgent.name}</p>
                              <p className="text-xs text-gray-500">{industryLabels[selectedAgent.industry]}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">Select an agent</span>
                        )}
                        <ChevronDown size={18} className={`text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                          <div className="p-2 border-b border-gray-100">
                            <div className="relative">
                              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search agents..."
                                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          </div>
                          <div className="max-h-64 overflow-y-auto py-1">
                            {filteredAgents.length === 0 ? (
                              <p className="px-4 py-3 text-sm text-gray-500 text-center">No agents found</p>
                            ) : (
                              filteredAgents.map((agent) => (
                                <button
                                  key={agent.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData({ ...formData, agentId: agent.id });
                                    setIsDropdownOpen(false);
                                    setSearchQuery('');
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                    formData.agentId === agent.id ? 'bg-blue-50' : ''
                                  }`}
                                >
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    formData.agentId === agent.id ? 'bg-blue-100' : 'bg-gray-100'
                                  }`}>
                                    <Bot size={16} className={formData.agentId === agent.id ? 'text-blue-600' : 'text-gray-500'} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{agent.name}</p>
                                    <p className="text-xs text-gray-500">{industryLabels[agent.industry]}</p>
                                  </div>
                                  {formData.agentId === agent.id && (
                                    <CheckCircle size={16} className="text-blue-600 flex-shrink-0" />
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                {/* Phone Number */}
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500">Enter phone number with country code</p>
                </div>

                {/* Contact Name */}
                <div>
                  <label htmlFor="contactName" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Contact Name <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="Enter contact name"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => navigate('/outbound-calls')}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || agents.length === 0}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>Initiating...</span>
                      </>
                    ) : (
                      <>
                        <Phone size={16} />
                        <span>Start Call</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Selected Agent Info */}
            {selectedAgent && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="px-4 py-3 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Selected Agent</h3>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Bot size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedAgent.name}</p>
                      <p className="text-xs text-gray-500">{industryLabels[selectedAgent.industry]}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-medium">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                      Active
                    </span>
                    {selectedAgent.language && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs">
                        {selectedAgent.language}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Call Features */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Call Features</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Headphones size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Natural Conversation</p>
                    <p className="text-xs text-gray-500">AI understands and responds naturally</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Auto Transcription</p>
                    <p className="text-xs text-gray-500">Complete call transcript saved</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Clock size={16} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Real-time Response</p>
                    <p className="text-xs text-gray-500">Less than 1 second latency</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help */}
            <div className="bg-blue-50 rounded-lg border border-blue-100 p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Need help?</h4>
              <p className="text-xs text-blue-700 mb-3">
                Make sure the phone number includes the country code and the contact is available to receive calls.
              </p>
              <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-700">
                View documentation &rarr;
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MakeSingleCallPage;
