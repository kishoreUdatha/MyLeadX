/**
 * Templates Hook
 * Manages voice templates state and operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../../services/api';
import { VoiceTemplate, ChatMessage } from '../voice-agents.types';

interface UseTemplatesReturn {
  // State
  templates: VoiceTemplate[];
  showTemplatesModal: boolean;
  templateSearch: string;
  selectedCategory: string;
  selectedTemplate: VoiceTemplate | null;
  previewTemplate: VoiceTemplate | null;
  previewTab: 'workflow' | 'preview';
  previewLoading: boolean;
  filteredTemplates: VoiceTemplate[];

  // Preview state
  isPlayingGreeting: boolean;
  chatMessages: ChatMessage[];
  chatInput: string;
  isSendingMessage: boolean;
  audioRef: React.RefObject<HTMLAudioElement>;
  chatEndRef: React.RefObject<HTMLDivElement>;

  // Actions
  setShowTemplatesModal: (show: boolean) => void;
  setTemplateSearch: (search: string) => void;
  setSelectedCategory: (category: string) => void;
  setSelectedTemplate: (template: VoiceTemplate | null) => void;
  setPreviewTemplate: (template: VoiceTemplate | null) => void;
  setPreviewTab: (tab: 'workflow' | 'preview') => void;
  setPreviewLoading: (loading: boolean) => void;
  setChatInput: (input: string) => void;
  fetchTemplates: () => Promise<void>;
  initializeTemplates: () => Promise<void>;
  useTemplate: (template: VoiceTemplate) => void;
  playGreeting: () => Promise<void>;
  sendMessage: () => Promise<void>;
  closeTemplatesModal: () => void;
}

export function useTemplates(): UseTemplatesReturn {
  const navigate = useNavigate();

  // Templates state
  const [templates, setTemplates] = useState<VoiceTemplate[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState<VoiceTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<VoiceTemplate | null>(null);
  const [previewTab, setPreviewTab] = useState<'workflow' | 'preview'>('workflow');
  const [previewLoading, setPreviewLoading] = useState(false);

  // Preview tab state
  const [isPlayingGreeting, setIsPlayingGreeting] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchTemplates = useCallback(async () => {
    try {
      const response = await api.get('/voice-templates');
      if (response.data.data) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Select first template when modal opens
  useEffect(() => {
    if (showTemplatesModal && templates.length > 0 && !selectedTemplate) {
      setSelectedTemplate(templates[0]);
    }
  }, [showTemplatesModal, templates, selectedTemplate]);

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

  const initializeTemplates = useCallback(async () => {
    try {
      await api.post('/voice-templates/initialize');
      toast.success('Templates loaded');
      fetchTemplates();
    } catch (err) {
      console.error('Failed to initialize templates:', err);
    }
  }, [fetchTemplates]);

  const useTemplate = useCallback((template: VoiceTemplate) => {
    navigate(`/voice-ai/create-from-template/${template.id}`, {
      state: { template },
    });
    setShowTemplatesModal(false);
  }, [navigate]);

  const playGreeting = useCallback(async () => {
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
  }, [selectedTemplate, isPlayingGreeting]);

  const sendMessage = useCallback(async () => {
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
  }, [selectedTemplate, chatInput, chatMessages, isSendingMessage]);

  const closeTemplatesModal = useCallback(() => {
    setShowTemplatesModal(false);
    setSelectedTemplate(null);
    setTemplateSearch('');
    setSelectedCategory('ALL');
    setPreviewTab('workflow');
    setChatMessages([]);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  }, []);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      template.description?.toLowerCase().includes(templateSearch.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || template.industry === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return {
    templates,
    showTemplatesModal,
    templateSearch,
    selectedCategory,
    selectedTemplate,
    previewTemplate,
    previewTab,
    previewLoading,
    filteredTemplates,
    isPlayingGreeting,
    chatMessages,
    chatInput,
    isSendingMessage,
    audioRef,
    chatEndRef,
    setShowTemplatesModal,
    setTemplateSearch,
    setSelectedCategory,
    setSelectedTemplate,
    setPreviewTemplate,
    setPreviewTab,
    setPreviewLoading,
    setChatInput,
    fetchTemplates,
    initializeTemplates,
    useTemplate,
    playGreeting,
    sendMessage,
    closeTemplatesModal,
  };
}

export default useTemplates;
