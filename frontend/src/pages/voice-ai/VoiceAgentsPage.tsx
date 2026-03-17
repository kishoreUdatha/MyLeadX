import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EllipsisHorizontalIcon,
  PlayIcon,
  PauseIcon,
  PencilIcon,
  TrashIcon,
  CodeBracketIcon,
  XMarkIcon,
  PhoneIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SpeakerWaveIcon,
  StopIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';
import TemplatePreviewModal from '../voice-templates/TemplatePreviewModal';

interface VoiceAgent {
  id: string;
  name: string;
  industry: string;
  isActive: boolean;
  voiceId: string;
  widgetColor: string;
  createdAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    sessions: number;
  };
}

interface VoiceTemplate {
  id: string;
  name: string;
  industry: string;
  icon: string;
  color: string;
  description: string;
  systemPrompt?: string;
  greeting?: string;
  greetings?: Record<string, string>;
  questions?: any[];
  faqs?: any[];
  knowledgeBase?: string;
  voiceId?: string;
  language?: string;
  fallbackMessage?: string;
  endMessage?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const industryLabels: Record<string, string> = {
  EDUCATION: 'Education',
  IT_RECRUITMENT: 'IT Recruitment',
  REAL_ESTATE: 'Real Estate',
  CUSTOMER_CARE: 'Customer Support',
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

const industryColors: Record<string, { bg: string; accent: string; wave: string; text: string; light: string }> = {
  EDUCATION: { bg: 'from-violet-500 to-purple-600', accent: '#8B5CF6', wave: '#A78BFA', text: 'text-violet-600', light: 'bg-violet-50' },
  IT_RECRUITMENT: { bg: 'from-blue-500 to-indigo-600', accent: '#3B82F6', wave: '#60A5FA', text: 'text-blue-600', light: 'bg-blue-50' },
  REAL_ESTATE: { bg: 'from-emerald-500 to-teal-600', accent: '#10B981', wave: '#34D399', text: 'text-emerald-600', light: 'bg-emerald-50' },
  CUSTOMER_CARE: { bg: 'from-orange-500 to-amber-600', accent: '#F97316', wave: '#FB923C', text: 'text-orange-600', light: 'bg-orange-50' },
  TECHNICAL_INTERVIEW: { bg: 'from-cyan-500 to-blue-600', accent: '#06B6D4', wave: '#22D3EE', text: 'text-cyan-600', light: 'bg-cyan-50' },
  HEALTHCARE: { bg: 'from-rose-500 to-pink-600', accent: '#F43F5E', wave: '#FB7185', text: 'text-rose-600', light: 'bg-rose-50' },
  FINANCE: { bg: 'from-green-500 to-emerald-600', accent: '#22C55E', wave: '#4ADE80', text: 'text-green-600', light: 'bg-green-50' },
  ECOMMERCE: { bg: 'from-purple-500 to-fuchsia-600', accent: '#A855F7', wave: '#C084FC', text: 'text-purple-600', light: 'bg-purple-50' },
  CUSTOM: { bg: 'from-gray-500 to-slate-600', accent: '#6B7280', wave: '#9CA3AF', text: 'text-gray-600', light: 'bg-gray-50' },
};

const categoryFilters = [
  { key: 'ALL', label: 'All' },
  { key: 'CUSTOMER_CARE', label: 'Customer Support' },
  { key: 'EDUCATION', label: 'Education' },
  { key: 'IT_RECRUITMENT', label: 'Outreach' },
  { key: 'HEALTHCARE', label: 'Receptionist' },
  { key: 'REAL_ESTATE', label: 'Real Estate' },
  { key: 'ECOMMERCE', label: 'E-Commerce' },
];

export const VoiceAgentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<VoiceAgent[]>([]);
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filterCreator, setFilterCreator] = useState(false);
  const [filterArchived, setFilterArchived] = useState(false);

  // Template browser state
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<VoiceTemplate | null>(null);
  const [previewTab, setPreviewTab] = useState<'workflow' | 'preview'>('workflow');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview tab state
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAgents();
    fetchTemplates();
  }, []);

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (showTemplatesModal && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [showTemplatesModal, templates]);

  // Reset chat when template changes
  useEffect(() => {
    setChatMessages([]);
    setChatInput('');
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlayingGreeting(false);
    }
  }, [selectedTemplate]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const response = await api.get('/voice-ai/agents');
      if (response.data.success) {
        setAgents(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/voice-templates');
      if (response.data.data) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const initializeTemplates = async () => {
    try {
      await api.post('/voice-templates/initialize');
      toast.success('Templates loaded');
      fetchTemplates();
    } catch (err) {
      console.error('Failed to initialize templates:', err);
    }
  };

  const toggleAgent = async (agentId: string, isActive: boolean) => {
    try {
      await api.put(`/voice-ai/agents/${agentId}`, { isActive: !isActive });
      setAgents(agents.map(a =>
        a.id === agentId ? { ...a, isActive: !isActive } : a
      ));
      toast.success(isActive ? 'Agent paused' : 'Agent activated');
    } catch (err) {
      console.error('Failed to toggle agent:', err);
      toast.error('Failed to update agent');
    }
  };

  const deleteAgent = async (agentId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await api.delete(`/voice-ai/agents/${agentId}`);
      setAgents(agents.filter(a => a.id !== agentId));
      toast.success('Agent deleted');
    } catch (err) {
      console.error('Failed to delete agent:', err);
      toast.error('Failed to delete agent');
    }
  };

  const copyEmbedCode = async (agentId: string) => {
    try {
      const response = await api.get(`/voice-ai/agents/${agentId}/embed`);
      if (response.data.success) {
        await navigator.clipboard.writeText(response.data.data.embedCode);
        setCopiedId(agentId);
        toast.success('Embed code copied');
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.error('Failed to copy embed code:', err);
      toast.error('Failed to copy embed code');
    }
  };

  const useTemplate = (template: VoiceTemplate) => {
    // Navigate to create agent from template page
    navigate(`/voice-ai/create-from-template/${template.id}`, {
      state: { template },
    });
    setShowTemplatesModal(false);
  };

  // Play greeting audio
  const playGreeting = async () => {
    if (!selectedTemplate) return;

    if (isPlayingGreeting && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingGreeting(false);
      return;
    }

    try {
      setIsPlayingGreeting(true);
      const greetingText = selectedTemplate.greeting ||
        (selectedTemplate.greetings?.['en-IN']) ||
        'Hello, how can I help you today?';

      const response = await api.post(`/voice-templates/${selectedTemplate.id}/preview-voice`, {
        text: greetingText,
        voiceId: selectedTemplate.voiceId,
        language: selectedTemplate.language || 'en-IN',
      });

      if (response.data.success && response.data.data.audio) {
        const audioData = response.data.data.audio;
        const audioBlob = new Blob(
          [Uint8Array.from(atob(audioData), c => c.charCodeAt(0))],
          { type: 'audio/mp3' }
        );
        const audioUrl = URL.createObjectURL(audioBlob);

        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.play();
          audioRef.current.onended = () => setIsPlayingGreeting(false);
        }
      }
    } catch (err) {
      console.error('Failed to play greeting:', err);
      toast.error('Failed to play greeting');
      setIsPlayingGreeting(false);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!selectedTemplate || !chatInput.trim() || isSendingMessage) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSendingMessage(true);

    try {
      const response = await api.post(`/voice-templates/${selectedTemplate.id}/test-conversation`, {
        message: userMessage,
        conversationHistory: chatMessages,
        includeAudio: false,
      });

      if (response.data.success) {
        setChatMessages(prev => [...prev, {
          role: 'assistant',
          content: response.data.data.reply
        }]);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to get response');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const filteredAgents = agents.filter(agent =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      template.description?.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || template.industry === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const closeTemplatesModal = () => {
    setShowTemplatesModal(false);
    setSelectedTemplate(null);
    setTemplateSearch('');
    setSelectedCategory('ALL');
    setPreviewTab('workflow');
    setChatMessages([]);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const getQuestions = (template: VoiceTemplate) => {
    if (!template.questions) return [];
    if (Array.isArray(template.questions)) return template.questions;
    return [];
  };

  const getFaqs = (template: VoiceTemplate) => {
    if (!template.faqs) return [];
    if (Array.isArray(template.faqs)) return template.faqs;
    return [];
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      {/* Header */}
      <div className="px-8 py-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Agents</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplatesModal(true)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700"
            >
              Browse templates
            </button>
            <button
              onClick={() => navigate('/voice-ai/new')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 flex items-center gap-2 text-sm font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              New agent
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-8 pb-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent bg-white"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-8 pb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterCreator(!filterCreator)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filterCreator
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Creator
          </button>
          <button
            onClick={() => setFilterArchived(!filterArchived)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filterArchived
                ? 'bg-gray-100 border-gray-300 text-gray-900'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            + Archived
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="px-8">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-900 border-t-transparent"></div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PhoneIcon className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents yet</h3>
            <p className="text-gray-500 mb-6">Create your first AI voice agent to get started</p>
            <button
              onClick={() => navigate('/voice-ai/new')}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
            >
              Create your first agent
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">Created by</th>
                <th className="text-left py-3 text-sm font-medium text-gray-500">
                  <span className="inline-flex items-center gap-1 cursor-pointer hover:text-gray-700">
                    Created at
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAgents.map((agent) => (
                <tr
                  key={agent.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/voice-ai/agents/${agent.id}`)}
                >
                  <td className="py-4">
                    <span className="text-sm text-gray-900">{agent.name}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-gray-600">
                      {agent.createdBy ? `${agent.createdBy.firstName} ${agent.createdBy.lastName}` : 'Unknown'}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className="text-sm text-gray-600">{formatDate(agent.createdAt)}</span>
                  </td>
                  <td className="py-4">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === agent.id ? null : agent.id);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                      </button>

                      {openMenuId === agent.id && (
                        <div
                          className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              navigate(`/voice-ai/agents/${agent.id}`);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Configure
                          </button>
                          <button
                            onClick={() => {
                              copyEmbedCode(agent.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <CodeBracketIcon className="w-4 h-4" />
                            {copiedId === agent.id ? 'Copied!' : 'Copy embed code'}
                          </button>
                          <button
                            onClick={() => {
                              toggleAgent(agent.id, agent.isActive);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            {agent.isActive ? (
                              <>
                                <PauseIcon className="w-4 h-4" />
                                Pause agent
                              </>
                            ) : (
                              <>
                                <PlayIcon className="w-4 h-4" />
                                Activate agent
                              </>
                            )}
                          </button>
                          <div className="border-t border-gray-100 my-1"></div>
                          <button
                            onClick={() => {
                              deleteAgent(agent.id, agent.name);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Browse Templates Modal */}
      {showTemplatesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex" style={{ height: '85vh' }}>
            {/* Left Panel - Template List */}
            <div className="w-1/2 border-r border-gray-200 flex flex-col" style={{ height: '100%' }}>
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Browse templates</h2>
                </div>

                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search templates"
                    value={templateSearch}
                    onChange={(e) => setTemplateSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Category Filters */}
              <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
                <div
                  className="flex items-center gap-2 pb-1"
                  style={{ overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  {categoryFilters.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap flex-shrink-0 transition-colors ${
                        selectedCategory === cat.key
                          ? 'bg-gray-900 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Scroll indicator */}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <ChevronLeftIcon className="w-4 h-4 text-gray-400" />
                  <div className="flex-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="w-3/5 h-full bg-gray-400 rounded-full"></div>
                  </div>
                  <ChevronRightIcon className="w-4 h-4 text-gray-400" />
                </div>
              </div>

              {/* Template List */}
              <div
                className="flex-1 p-4"
                style={{ overflowY: 'auto', minHeight: 0 }}
              >
                {templates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500 mb-4">No templates available.</p>
                    <button
                      onClick={initializeTemplates}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium"
                    >
                      Load default templates
                    </button>
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-gray-500">No templates match your search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {filteredTemplates.map((template) => (
                      <div
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          setPreviewLoading(true);
                          setTimeout(() => setPreviewLoading(false), 300);
                        }}
                        className={`p-4 border rounded-xl cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-gray-900 bg-gray-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xl">{template.icon || industryIcons[template.industry] || '🤖'}</span>
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {template.name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {template.description || 'No description'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Preview */}
            <div className="w-1/2 flex flex-col bg-gray-50" style={{ height: '100%' }}>
              {/* Preview Header */}
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewTab('workflow')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      previewTab === 'workflow'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Workflow
                  </button>
                  <button
                    onClick={() => setPreviewTab('preview')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      previewTab === 'preview'
                        ? 'bg-gray-100 text-gray-900'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Preview
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => selectedTemplate && useTemplate(selectedTemplate)}
                    disabled={!selectedTemplate}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Use template
                  </button>
                  <button
                    onClick={() => selectedTemplate && setPreviewTemplate(selectedTemplate)}
                    disabled={!selectedTemplate}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    View details
                  </button>
                  <button
                    onClick={closeTemplatesModal}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Preview Content */}
              <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: 0 }}>
                {!selectedTemplate ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-sm">Select a template to preview</p>
                  </div>
                ) : previewLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
                  </div>
                ) : previewTab === 'workflow' ? (
                  /* Workflow Tab - Dynamic Visual Flowchart based on Industry */
                  <div className="relative min-h-full flex flex-col items-center py-4">
                    {/* Start Node */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">Start</span>
                    </div>
                    <div className="w-0.5 h-6 bg-gray-300"></div>

                    {/* Welcome Node - Industry Specific */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 text-xs">{selectedTemplate.icon || industryIcons[selectedTemplate.industry] || '👋'}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedTemplate.industry === 'EDUCATION' && 'Welcome & Identify Student'}
                        {selectedTemplate.industry === 'REAL_ESTATE' && 'Welcome & Identify Caller'}
                        {selectedTemplate.industry === 'HEALTHCARE' && 'Welcome & Identify Patient'}
                        {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Welcome & Identify Customer'}
                        {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Welcome & Identify Candidate'}
                        {selectedTemplate.industry === 'ECOMMERCE' && 'Welcome & Identify Shopper'}
                        {selectedTemplate.industry === 'FINANCE' && 'Welcome & Verify Identity'}
                        {!['EDUCATION', 'REAL_ESTATE', 'HEALTHCARE', 'CUSTOMER_CARE', 'IT_RECRUITMENT', 'ECOMMERCE', 'FINANCE'].includes(selectedTemplate.industry) && 'Welcome & Identify Caller'}
                      </span>
                    </div>
                    <div className="w-0.5 h-6 bg-gray-300"></div>

                    {/* Industry-Specific Branching */}
                    <div className="flex flex-col items-center w-full">
                      {/* Branch Conditions based on Industry */}
                      <div className="flex gap-2 mb-2 flex-wrap justify-center">
                        {selectedTemplate.industry === 'EDUCATION' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ New admission inquiry</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Current student</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'REAL_ESTATE' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Current tenant</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Prospective tenant</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'HEALTHCARE' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Book appointment</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Medical query</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'CUSTOMER_CARE' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Technical issue</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ General inquiry</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'IT_RECRUITMENT' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ New candidate</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Follow-up</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'ECOMMERCE' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Order inquiry</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Return/Refund</span>
                            </div>
                          </>
                        )}
                        {selectedTemplate.industry === 'FINANCE' && (
                          <>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ Account inquiry</span>
                            </div>
                            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                              <span className="text-xs text-amber-700">↓ New application</span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Branch Lines */}
                      <div className="relative w-48 h-8">
                        <svg className="absolute inset-0" width="100%" height="100%">
                          <path d="M 96 0 L 96 10 L 48 10 L 48 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                          <path d="M 96 0 L 96 10 L 144 10 L 144 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                        </svg>
                      </div>

                      {/* Branch Nodes - Industry Specific */}
                      <div className="flex gap-6 mt-1">
                        {/* Left Branch */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center text-xs">
                              {selectedTemplate.industry === 'EDUCATION' && '📚'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && '🔧'}
                              {selectedTemplate.industry === 'HEALTHCARE' && '📅'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && '🛠️'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && '📝'}
                              {selectedTemplate.industry === 'ECOMMERCE' && '📦'}
                              {selectedTemplate.industry === 'FINANCE' && '💳'}
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {selectedTemplate.industry === 'EDUCATION' && 'Course Info'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && 'Maintenance'}
                              {selectedTemplate.industry === 'HEALTHCARE' && 'Appointment'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Troubleshoot'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Screen Skills'}
                              {selectedTemplate.industry === 'ECOMMERCE' && 'Track Order'}
                              {selectedTemplate.industry === 'FINANCE' && 'Account Help'}
                            </span>
                          </div>
                          <div className="w-0.5 h-5 bg-gray-300"></div>
                          <div className="px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                            <span className="text-xs text-green-700 flex items-center gap-1">
                              <CheckCircleIcon className="w-3 h-3" />
                              {selectedTemplate.industry === 'EDUCATION' && 'Interested'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && 'Submitted'}
                              {selectedTemplate.industry === 'HEALTHCARE' && 'Booked'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Resolved'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Qualified'}
                              {selectedTemplate.industry === 'ECOMMERCE' && 'Found'}
                              {selectedTemplate.industry === 'FINANCE' && 'Verified'}
                            </span>
                          </div>
                        </div>

                        {/* Right Branch */}
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs">
                              {selectedTemplate.industry === 'EDUCATION' && '❓'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && '🏠'}
                              {selectedTemplate.industry === 'HEALTHCARE' && '💊'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && '📋'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && '📞'}
                              {selectedTemplate.industry === 'ECOMMERCE' && '↩️'}
                              {selectedTemplate.industry === 'FINANCE' && '📄'}
                            </div>
                            <span className="text-xs font-medium text-gray-700">
                              {selectedTemplate.industry === 'EDUCATION' && 'Answer FAQs'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && 'Schedule Show'}
                              {selectedTemplate.industry === 'HEALTHCARE' && 'Medical Info'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Escalate'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Schedule Call'}
                              {selectedTemplate.industry === 'ECOMMERCE' && 'Process Return'}
                              {selectedTemplate.industry === 'FINANCE' && 'New Account'}
                            </span>
                          </div>
                          <div className="w-0.5 h-5 bg-gray-300"></div>
                          <div className="px-2 py-1 bg-green-50 border border-green-200 rounded-full">
                            <span className="text-xs text-green-700 flex items-center gap-1">
                              <CheckCircleIcon className="w-3 h-3" />
                              {selectedTemplate.industry === 'EDUCATION' && 'Answered'}
                              {selectedTemplate.industry === 'REAL_ESTATE' && 'Scheduled'}
                              {selectedTemplate.industry === 'HEALTHCARE' && 'Provided'}
                              {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Transferred'}
                              {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Scheduled'}
                              {selectedTemplate.industry === 'ECOMMERCE' && 'Initiated'}
                              {selectedTemplate.industry === 'FINANCE' && 'Submitted'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Merge Lines */}
                      <div className="relative w-48 h-8">
                        <svg className="absolute inset-0" width="100%" height="100%">
                          <path d="M 48 0 L 48 22 L 96 22 L 96 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                          <path d="M 144 0 L 144 22 L 96 22 L 96 32" stroke="#D1D5DB" strokeWidth="2" fill="none" />
                        </svg>
                      </div>
                    </div>

                    {/* Collect Information Node - Industry Specific */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 text-xs">📝</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">
                        {selectedTemplate.industry === 'EDUCATION' && 'Collect Student Details'}
                        {selectedTemplate.industry === 'REAL_ESTATE' && 'Collect Contact Info'}
                        {selectedTemplate.industry === 'HEALTHCARE' && 'Collect Patient Info'}
                        {selectedTemplate.industry === 'CUSTOMER_CARE' && 'Log Issue Details'}
                        {selectedTemplate.industry === 'IT_RECRUITMENT' && 'Collect Candidate Info'}
                        {selectedTemplate.industry === 'ECOMMERCE' && 'Verify Order Details'}
                        {selectedTemplate.industry === 'FINANCE' && 'Verify Account Info'}
                        {!['EDUCATION', 'REAL_ESTATE', 'HEALTHCARE', 'CUSTOMER_CARE', 'IT_RECRUITMENT', 'ECOMMERCE', 'FINANCE'].includes(selectedTemplate.industry) && 'Collect Information'}
                      </span>
                    </div>
                    <div className="w-0.5 h-6 bg-gray-300"></div>

                    {/* Action Options - Industry Specific */}
                    <div className="flex gap-3 flex-wrap justify-center">
                      {selectedTemplate.industry === 'EDUCATION' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Schedule campus tour</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Send brochure</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'REAL_ESTATE' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Schedule viewing</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Send to maintenance</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'HEALTHCARE' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Confirm appointment</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Transfer to nurse</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'CUSTOMER_CARE' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Create ticket</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Transfer to agent</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'IT_RECRUITMENT' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Schedule interview</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Send job details</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'ECOMMERCE' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Generate return label</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Process refund</span>
                          </div>
                        </>
                      )}
                      {selectedTemplate.industry === 'FINANCE' && (
                        <>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Verify documents</span>
                          </div>
                          <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                            <span className="text-xs text-amber-700">Transfer to advisor</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="w-0.5 h-6 bg-gray-300"></div>

                    {/* Confirm & Close Node */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 text-xs">✓</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">Confirm & Close</span>
                    </div>
                    <div className="w-0.5 h-6 bg-gray-300"></div>

                    {/* Success Condition */}
                    <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-full mb-2">
                      <span className="text-xs text-green-700 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3" />
                        Caller satisfied
                      </span>
                    </div>
                    <div className="w-0.5 h-5 bg-gray-300"></div>

                    {/* End Node */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">End</span>
                    </div>

                    {/* Questions Summary */}
                    {getQuestions(selectedTemplate).length > 0 && (
                      <div className="mt-6 w-full max-w-sm bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">QUALIFICATION QUESTIONS</p>
                        <ul className="space-y-1">
                          {getQuestions(selectedTemplate).slice(0, 4).map((q: any, i: number) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start gap-2">
                              <span className="text-gray-400">{i + 1}.</span>
                              <span className="line-clamp-1">{q.question || q.text || q}</span>
                            </li>
                          ))}
                          {getQuestions(selectedTemplate).length > 4 && (
                            <li className="text-xs text-gray-400">+{getQuestions(selectedTemplate).length - 4} more</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {/* FAQs Summary */}
                    {getFaqs(selectedTemplate).length > 0 && (
                      <div className="mt-3 w-full max-w-sm bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-2">KNOWLEDGE BASE</p>
                        <ul className="space-y-1">
                          {getFaqs(selectedTemplate).slice(0, 3).map((faq: any, i: number) => (
                            <li key={i} className="text-xs text-gray-600 line-clamp-1">
                              Q: {faq.question || faq.q}
                            </li>
                          ))}
                          {getFaqs(selectedTemplate).length > 3 && (
                            <li className="text-xs text-gray-400">+{getFaqs(selectedTemplate).length - 3} more FAQs</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Preview Tab - ElevenLabs Style Voice Preview */
                  <div className="flex flex-col h-full">
                    {/* Voice Preview Card */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                      {/* Header with icon and name */}
                      <div className="flex items-center gap-4 mb-6">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                          style={{ backgroundColor: `${industryColors[selectedTemplate.industry]?.accent}15` }}
                        >
                          {selectedTemplate.icon || industryIcons[selectedTemplate.industry] || '🤖'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{selectedTemplate.name}</h3>
                          <p className="text-sm text-gray-500">{industryLabels[selectedTemplate.industry] || selectedTemplate.industry}</p>
                        </div>
                      </div>

                      {/* Waveform Player */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <div className="flex items-center gap-4">
                          {/* Play Button */}
                          <button
                            onClick={playGreeting}
                            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
                            style={{
                              backgroundColor: industryColors[selectedTemplate.industry]?.accent || '#3B82F6',
                            }}
                          >
                            {isPlayingGreeting ? (
                              <PauseIcon className="w-5 h-5 text-white" />
                            ) : (
                              <PlayIcon className="w-5 h-5 text-white ml-0.5" />
                            )}
                          </button>

                          {/* Waveform Visualization */}
                          <div className="flex-1 flex items-center gap-[2px] h-10">
                            {[...Array(40)].map((_, i) => {
                              const baseHeight = Math.sin(i * 0.3) * 0.5 + 0.5;
                              const height = isPlayingGreeting
                                ? Math.random() * 100
                                : baseHeight * 60 + 20;
                              return (
                                <div
                                  key={i}
                                  className="flex-1 rounded-full transition-all duration-75"
                                  style={{
                                    height: `${height}%`,
                                    backgroundColor: industryColors[selectedTemplate.industry]?.accent || '#3B82F6',
                                    opacity: isPlayingGreeting ? 0.8 : 0.4,
                                  }}
                                />
                              );
                            })}
                          </div>

                          {/* Duration */}
                          <span className="text-sm text-gray-500 font-mono w-12 text-right">
                            {isPlayingGreeting ? '0:02' : '0:05'}
                          </span>
                        </div>
                      </div>

                      {/* Voice Info */}
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <SpeakerWaveIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">Voice: {selectedTemplate.voiceId || 'Rachel'}</span>
                        </div>
                        <span className="text-gray-400">English</span>
                      </div>
                    </div>

                    {/* Greeting Text */}
                    <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">Greeting Message</p>
                      <p className="text-sm text-gray-700 leading-relaxed">
                        {selectedTemplate.greeting ||
                         (selectedTemplate.greetings && Object.values(selectedTemplate.greetings)[0]) ||
                         'Hello! How can I help you today?'}
                      </p>
                    </div>

                    {/* Test Chat Section */}
                    <div className="mt-4 bg-white rounded-xl border border-gray-200 flex-1 flex flex-col overflow-hidden" style={{ minHeight: '200px' }}>
                      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-700">Test Chat</span>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ minHeight: 0 }}>
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-4">
                            <p className="text-sm text-gray-400">Send a message to test</p>
                          </div>
                        ) : (
                          chatMessages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                                  msg.role === 'user'
                                    ? 'text-white'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                                style={msg.role === 'user' ? { backgroundColor: industryColors[selectedTemplate.industry]?.accent || '#3B82F6' } : {}}
                              >
                                {msg.content}
                              </div>
                            </div>
                          ))
                        )}
                        {isSendingMessage && (
                          <div className="flex gap-1">
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                        )}
                        <div ref={chatEndRef} />
                      </div>

                      {/* Input */}
                      <div className="p-3 border-t border-gray-100">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                            placeholder="Type a message..."
                            className="flex-1 px-3 py-2 bg-gray-50 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                          />
                          <button
                            onClick={sendMessage}
                            disabled={!chatInput.trim() || isSendingMessage}
                            className="px-3 py-2 rounded-lg text-white disabled:opacity-50"
                            style={{ backgroundColor: industryColors[selectedTemplate.industry]?.accent || '#3B82F6' }}
                          >
                            <PaperAirplaneIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {previewTemplate && (
        <TemplatePreviewModal
          template={previewTemplate}
          onClose={() => setPreviewTemplate(null)}
        />
      )}
    </div>
  );
};

export default VoiceAgentsPage;
