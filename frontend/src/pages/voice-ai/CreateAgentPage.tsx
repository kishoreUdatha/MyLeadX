import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Loader2,
  Play,
  User,
  Sparkles,
  Building2,
  Phone,
  Brain,
  Clock,
  Camera,
  Plus,
  GripVertical,
  FileText,
  Image,
  Upload,
  Trash2,
  MessageCircle,
} from 'lucide-react';
import api from '../../services/api';

interface Template {
  industry: string;
  name: string;
  description: string;
}

const industryDetails: Record<string, { icon: string; color: string; description: string; gradient: string }> = {
  EDUCATION: {
    icon: '🎓',
    color: '#3B82F6',
    gradient: 'from-blue-500 to-blue-600',
    description: 'Universities, colleges, coaching centers',
  },
  IT_RECRUITMENT: {
    icon: '💼',
    color: '#8B5CF6',
    gradient: 'from-purple-500 to-purple-600',
    description: 'Tech hiring, candidate screening',
  },
  REAL_ESTATE: {
    icon: '🏠',
    color: '#10B981',
    gradient: 'from-emerald-500 to-emerald-600',
    description: 'Property listings, site visits',
  },
  CUSTOMER_CARE: {
    icon: '📞',
    color: '#F59E0B',
    gradient: 'from-amber-500 to-amber-600',
    description: 'Support tickets, complaint handling',
  },
  TECHNICAL_INTERVIEW: {
    icon: '💻',
    color: '#EF4444',
    gradient: 'from-red-500 to-red-600',
    description: 'Coding interviews, skill evaluation',
  },
  HEALTHCARE: {
    icon: '🏥',
    color: '#06B6D4',
    gradient: 'from-cyan-500 to-cyan-600',
    description: 'Appointment booking, health queries',
  },
  FINANCE: {
    icon: '💰',
    color: '#84CC16',
    gradient: 'from-lime-500 to-lime-600',
    description: 'Loans, insurance, investments',
  },
  ECOMMERCE: {
    icon: '🛒',
    color: '#EC4899',
    gradient: 'from-pink-500 to-pink-600',
    description: 'Product queries, order tracking',
  },
  CUSTOM: {
    icon: '⚙️',
    color: '#6B7280',
    gradient: 'from-gray-500 to-gray-600',
    description: 'Build from scratch',
  },
};

// Voice options organized by region
const voiceOptions = [
  // Custom Cloned Voices (ElevenLabs)
  { id: 'elevenlabs_qf2cb4kpdw9Zfp2UNLcR', name: 'My Custom Voice', description: 'Custom Cloned Voice', region: 'custom', gender: 'male', recommended: true, provider: 'elevenlabs', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini.' },
  // Sarvam AI Voices (Best for Indian Languages) - Native speakers
  { id: 'sarvam-priya', name: 'Priya', description: 'Hindi - Female', region: 'sarvam', gender: 'female', recommended: true, provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main aapki AI sahaayak hoon. Aaj main aapki kaise madad kar sakti hoon?' },
  { id: 'sarvam-dev', name: 'Dev', description: 'Hindi - Male', region: 'sarvam', gender: 'male', recommended: true, provider: 'sarvam', language: 'hi-IN', testText: 'Namaste! Main aapka AI sahaayak hoon. Aaj main aapki kaise madad kar sakta hoon?' },
  { id: 'sarvam-kavya', name: 'Kavya', description: 'Telugu - Female', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakuraalini. Ee roju mee ki ela sahaayam cheyagalanu?' },
  { id: 'sarvam-ravi', name: 'Ravi', description: 'Telugu - Male', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini. Ee roju mee ki ela sahaayam cheyagalanu?' },
  { id: 'sarvam-neha', name: 'Neha', description: 'Tamil - Female', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'ta-IN', testText: 'Vanakkam! Naan ungal AI udhaviyaalar. Inru ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'sarvam-aditya', name: 'Aditya', description: 'Kannada - Male', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaka. Ivattu nimge hege sahaaya maadaballe?' },
  { id: 'sarvam-anjali', name: 'Anjali', description: 'Kannada - Female', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'kn-IN', testText: 'Namaskara! Naanu nimma AI sahaayaki. Ivattu nimge hege sahaaya maadaballe?' },
  { id: 'sarvam-rahul', name: 'Rahul', description: 'Malayalam - Male', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'ml-IN', testText: 'Namaskkaram! Njan ningalude AI sahayi aanu. Innu ninakku njan engane sahaayikkum?' },
  { id: 'sarvam-meera', name: 'Meera', description: 'Marathi - Female', region: 'sarvam', gender: 'female', provider: 'sarvam', language: 'mr-IN', testText: 'Namaskar! Mi tumchi AI sahaayak aahe. Aaj mi tumhala kashi madad karu?' },
  { id: 'sarvam-arjun', name: 'Arjun', description: 'Bengali - Male', region: 'sarvam', gender: 'male', provider: 'sarvam', language: 'bn-IN', testText: 'Namaskar! Ami apnar AI sahayak. Aaj ami apnake kibhabe sahajya korte pari?' },
  // OpenAI Voices (Indian-styled) - English with Indian style
  { id: 'nova', name: 'Ananya', description: 'English - Friendly', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'shimmer', name: 'Lakshmi', description: 'English - Warm', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'alloy', name: 'Shreya', description: 'English - Clear', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'echo', name: 'Raj', description: 'English - Conversational', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'onyx', name: 'Vikram', description: 'English - Professional', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'fable', name: 'Kiran', description: 'English - Engaging', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  // OpenAI Voices (International)
  { id: 'nova', name: 'Nova', description: 'Friendly, upbeat', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'shimmer', name: 'Shimmer', description: 'Soft, gentle', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'alloy', name: 'Alloy', description: 'Neutral, balanced', region: 'international', gender: 'neutral', provider: 'openai', language: 'en-US' },
  { id: 'echo', name: 'Echo', description: 'Warm, conversational', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'onyx', name: 'Onyx', description: 'Deep, authoritative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'fable', name: 'Fable', description: 'Expressive, narrative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
];

const languageOptions = [
  { id: 'en-IN', name: 'English (India)', flag: '🇮🇳', popular: true, greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳', popular: true, greetingTemplate: 'Namaste! Main aapki kya madad kar sakta hoon?' },
  { id: 'te-IN', name: 'Telugu', flag: '🇮🇳', greetingTemplate: 'Namaskaram! Nenu mee ki ela sahaayam cheyagalanu?' },
  { id: 'ta-IN', name: 'Tamil', flag: '🇮🇳', greetingTemplate: 'Vanakkam! Ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'kn-IN', name: 'Kannada', flag: '🇮🇳', greetingTemplate: 'Namaskara! Naanu nimge hege sahaaya maadaballe?' },
  { id: 'ml-IN', name: 'Malayalam', flag: '🇮🇳', greetingTemplate: 'Namaskkaram! Ninakku njan engane sahaayikkum?' },
  { id: 'mr-IN', name: 'Marathi', flag: '🇮🇳', greetingTemplate: 'Namaskar! Mi tumhala kashi madad karu shakto?' },
  { id: 'bn-IN', name: 'Bengali', flag: '🇮🇳', greetingTemplate: 'Namaskar! Ami apnake ki bhabe sahajya korte pari?' },
  { id: 'gu-IN', name: 'Gujarati', flag: '🇮🇳', greetingTemplate: 'Namaskar! Hu tamne kem madad kari saku?' },
  { id: 'pa-IN', name: 'Punjabi', flag: '🇮🇳', greetingTemplate: 'Sat sri akaal! Main tuhadi ki madad kar sakda haan?' },
  { id: 'en-US', name: 'English (US)', flag: '🇺🇸', greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'auto', name: 'Auto-detect', flag: '🌐', greetingTemplate: 'Hello! How can I help you today?' },
];

export const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'configure' | 'voice' | 'prompt' | 'documents' | 'settings'>('configure');

  // Document interface for WhatsApp sharing
  interface AgentDocument {
    id: string;
    name: string;
    type: 'pdf' | 'image' | 'video' | 'document';
    url: string;
    description: string;
    keywords: string[];
  }

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    voiceId: 'sarvam-priya',
    voiceName: 'Priya',
    language: 'hi-IN',
    widgetColor: '#3B82F6',
    widgetTitle: '',
    widgetSubtitle: '',
    greeting: '',
    systemPrompt: '',
    questions: [] as any[],
    documents: [] as AgentDocument[],
    useCustomVoice: false,
    customVoiceName: '',
    // AI Behavior Settings
    personality: 'professional' as 'professional' | 'friendly' | 'casual',
    responseSpeed: 'normal' as 'fast' | 'normal' | 'thoughtful',
    creativity: 0.7,
    interruptHandling: 'polite' as 'wait' | 'polite',
    // Call Handling Settings
    workingHoursEnabled: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as string[],
    afterHoursMessage: "Thank you for calling. Our office is currently closed. Please call back during business hours or leave a message.",
    maxCallDuration: 10, // minutes
    silenceTimeout: 30, // seconds
    recordCalls: true, // Record calls for quality assurance
    // Lead Generation Settings
    autoCreateLeads: true,
    deduplicateByPhone: true,
    defaultStageId: '',
    defaultAssigneeId: '',
    // Appointment Booking Settings
    appointmentEnabled: false,
    appointmentType: 'consultation',
    appointmentDuration: 30,
    // CRM Integration Settings
    crmIntegration: 'internal' as 'internal' | 'salesforce' | 'hubspot' | 'zoho' | 'custom',
    triggerWebhookOnLead: true,
  });

  // Test call state
  const [testPhoneNumber, setTestPhoneNumber] = useState('');
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [_testCallStatus, setTestCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');

  // New question input state
  const [newQuestion, setNewQuestion] = useState('');
  const [newQuestionField, setNewQuestionField] = useState('info');

  // New document input state
  const [newDocument, setNewDocument] = useState({
    name: '',
    type: 'pdf' as 'pdf' | 'image' | 'video' | 'document',
    url: '',
    description: '',
    keywords: '',
  });

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'agent-documents');
      formData.append('isPublic', 'true');

      const response = await api.post('/upload/single', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        const uploadedFile = response.data.file;
        // Auto-detect document type from mime type
        let docType: 'pdf' | 'image' | 'video' | 'document' = 'document';
        if (uploadedFile.mimeType.startsWith('image/')) docType = 'image';
        else if (uploadedFile.mimeType.startsWith('video/')) docType = 'video';
        else if (uploadedFile.mimeType === 'application/pdf') docType = 'pdf';

        setNewDocument(prev => ({
          ...prev,
          url: uploadedFile.url,
          type: docType,
          name: prev.name || uploadedFile.originalName.replace(/\.[^/.]+$/, ''),
        }));
        setSelectedFile(file);
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle file drop
  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Handle file select
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const steps = [
    { number: 1, title: 'Industry', icon: Building2 },
    { number: 2, title: 'Configure', icon: Sparkles },
    { number: 3, title: 'Review', icon: Check },
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedIndustry) {
      fetchTemplateDetails(selectedIndustry);
    }
  }, [selectedIndustry]);

  const fetchTemplates = async () => {
    try {
      const response = await api.get('/voice-ai/templates');
      if (response.data.success) {
        setTemplates(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    }
  };

  const fetchTemplateDetails = async (industry: string) => {
    try {
      const response = await api.get(`/voice-ai/templates/${industry}`);
      if (response.data.success) {
        const template = response.data.data;
        // Use language-specific greeting based on currently selected language
        const langOption = languageOptions.find(l => l.id === formData.language);
        const languageGreeting = langOption?.greetingTemplate || template.greeting;

        setFormData(prev => ({
          ...prev,
          name: template.name,
          greeting: languageGreeting,
          systemPrompt: template.systemPrompt,
          questions: template.questions,
          widgetColor: industryDetails[industry]?.color || '#3B82F6',
        }));
      }
    } catch (err) {
      console.error('Failed to fetch template details:', err);
    }
  };

  const handleCreate = async () => {
    if (!selectedIndustry || !formData.name) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/voice-ai/agents', {
        name: formData.name,
        industry: selectedIndustry,
        customPrompt: formData.systemPrompt,
        customQuestions: formData.questions,
      });

      if (response.data.success) {
        const agentId = response.data.data.id;
        // Determine voice provider based on voice selection
        const isSarvamVoice = formData.voiceId.startsWith('sarvam-');
        const voiceProvider = isSarvamVoice ? 'sarvam' : 'openai';

        await api.put(`/voice-ai/agents/${agentId}`, {
          voiceId: formData.voiceId,
          voiceProvider: voiceProvider,
          language: formData.language === 'auto' ? '' : formData.language,
          widgetColor: formData.widgetColor,
          widgetTitle: formData.widgetTitle || formData.name,
          widgetSubtitle: formData.widgetSubtitle || 'AI Voice Assistant',
          greeting: formData.greeting,
          // AI Behavior Settings
          personality: formData.personality,
          responseSpeed: formData.responseSpeed,
          creativity: formData.creativity,
          interruptHandling: formData.interruptHandling,
          // Call Handling Settings
          workingHoursEnabled: formData.workingHoursEnabled,
          workingHoursStart: formData.workingHoursStart,
          workingHoursEnd: formData.workingHoursEnd,
          workingDays: formData.workingDays,
          afterHoursMessage: formData.afterHoursMessage,
          maxCallDuration: formData.maxCallDuration,
          silenceTimeout: formData.silenceTimeout,
          // Documents for WhatsApp sharing
          documents: formData.documents,
          // Lead Generation Settings
          autoCreateLeads: formData.autoCreateLeads,
          deduplicateByPhone: formData.deduplicateByPhone,
          defaultStageId: formData.defaultStageId || null,
          defaultAssigneeId: formData.defaultAssigneeId || null,
          // Appointment Booking Settings
          appointmentEnabled: formData.appointmentEnabled,
          appointmentType: formData.appointmentType,
          appointmentDuration: formData.appointmentDuration,
          // CRM Integration Settings
          crmIntegration: formData.crmIntegration,
          triggerWebhookOnLead: formData.triggerWebhookOnLead,
        });
        navigate('/voice-ai');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  const testVoice = async (voiceId: string) => {
    try {
      // Find the voice to determine provider - use startsWith for Sarvam voices
      const isSarvam = voiceId.startsWith('sarvam-');
      const voice = voiceOptions.find(v => v.id === voiceId);

      console.log('[TestVoice] Testing voice:', voiceId, 'Found:', voice?.name, 'Sarvam:', isSarvam);

      // Use voice-specific test text and language for Sarvam
      let testText = 'Hello! I am your AI voice assistant. How can I help you today?';
      if (isSarvam && voice?.testText) {
        testText = voice.testText;
      }

      // Extract actual voice name for Sarvam (e.g., 'sarvam-priya' -> 'priya')
      const actualVoice = isSarvam ? voiceId.replace('sarvam-', '') : voiceId;

      // Use voice-specific language for Sarvam
      const language = isSarvam && voice?.language ? voice.language : 'en-US';

      console.log('[TestVoice] Calling TTS API with:', { text: testText.substring(0, 50), voice: actualVoice, provider: isSarvam ? 'sarvam' : 'openai', language });

      const response = await api.post('/voice-ai/tts', {
        text: testText,
        voice: actualVoice,
        provider: isSarvam ? 'sarvam' : 'openai',
        language: language,
      }, { responseType: 'arraybuffer' });

      console.log('[TestVoice] Got response, size:', response.data.byteLength);

      // Sarvam returns WAV, OpenAI returns MPEG
      const mimeType = isSarvam ? 'audio/wav' : 'audio/mpeg';
      const audioBlob = new Blob([response.data], { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onerror = (e) => console.error('[TestVoice] Audio playback error:', e);
      audio.onplay = () => console.log('[TestVoice] Audio playing...');
      audio.onended = () => console.log('[TestVoice] Audio finished');

      await audio.play();
    } catch (err) {
      console.error('[TestVoice] Failed to test voice:', err);
    }
  };

  // Initiate test call
  const initiateTestCall = async () => {
    if (!testPhoneNumber.trim()) {
      setError('Please enter a phone number for test call');
      return;
    }
    try {
      setIsTestingCall(true);
      setTestCallStatus('calling');
      // Get default greeting for language if no custom greeting
      const langOption = languageOptions.find(l => l.id === formData.language);
      const defaultGreeting = langOption?.greetingTemplate || 'Hello! How can I help you today?';

      // This would integrate with your calling service
      const response = await api.post('/voice-ai/test-call', {
        phoneNumber: testPhoneNumber,
        voiceId: formData.voiceId,
        greeting: formData.greeting || defaultGreeting,
        language: formData.language,
      });
      if (response.data.success) {
        setTestCallStatus('connected');
        setTimeout(() => {
          setTestCallStatus('ended');
          setIsTestingCall(false);
        }, 5000);
      }
    } catch (err: any) {
      console.error('Failed to initiate test call:', err);
      setError(err.response?.data?.message || 'Failed to initiate test call');
      setTestCallStatus('idle');
      setIsTestingCall(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/voice-ai')}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create Voice Agent</h1>
                <p className="text-sm text-gray-500">Build your AI-powered voice assistant</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="hidden md:flex items-center gap-1">
              {steps.map((s, index) => (
                <React.Fragment key={s.number}>
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                        s.number < step
                          ? 'bg-green-500 text-white'
                          : s.number === step
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {s.number < step ? <Check size={14} /> : <s.icon size={14} />}
                    </div>
                    <span className={`text-sm font-medium ${s.number === step ? 'text-blue-600' : 'text-gray-500'}`}>
                      {s.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 ${s.number < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-3">
            <X className="flex-shrink-0" size={20} />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-1 hover:bg-red-100 rounded">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Step 1: Select Industry */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Your Industry</h2>
              <p className="text-gray-600">Select the industry that best matches your use case for a pre-configured template</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(industryDetails).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setSelectedIndustry(key)}
                  className={`group relative p-5 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-lg ${
                    selectedIndustry === key
                      ? 'border-blue-500 bg-blue-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {selectedIndustry === key && (
                    <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${value.gradient} flex items-center justify-center text-2xl mb-3 shadow-sm`}>
                    {value.icon}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {templates.find(t => t.industry === key)?.name || key.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-500">{value.description}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-6">
              <button
                onClick={() => setStep(2)}
                disabled={!selectedIndustry}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium shadow-sm"
              >
                Continue
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Configure Agent */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex">
                {[
                  { id: 'configure', label: 'Configure' },
                  { id: 'voice', label: 'Voice' },
                  { id: 'prompt', label: 'Prompt' },
                  { id: 'documents', label: 'Documents' },
                  { id: 'settings', label: 'Settings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-teal-500 text-teal-600 bg-teal-50/50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {/* Configure Tab */}
              {activeTab === 'configure' && (
                <div className="space-y-6">
                  {/* Agent Name */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Agent Name</label>
                      <p className="text-xs text-gray-500 mt-0.5">Choose a name for your agent.</p>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="My Voice Agent"
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                      />
                      <div className="text-right text-xs text-gray-400 mt-1">{formData.name.length}/50</div>
                    </div>
                  </div>

                  {/* Image/Avatar */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Image</label>
                      <p className="text-xs text-gray-500 mt-0.5">Select an image for your agent.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-100 to-blue-100 flex items-center justify-center relative">
                          <User size={32} className="text-teal-600" />
                          <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-teal-600 transition">
                            <Camera size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Language */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Language</label>
                      <p className="text-xs text-gray-500 mt-0.5">Select the language for your agent.</p>
                    </div>
                    <div className="flex-1">
                      <select
                        value={formData.language}
                        onChange={e => {
                          const lang = languageOptions.find(l => l.id === e.target.value);
                          setFormData({
                            ...formData,
                            language: e.target.value,
                            greeting: lang?.greetingTemplate || formData.greeting,
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                      >
                        {languageOptions.filter(l => l.id !== 'auto').map(lang => (
                          <option key={lang.id} value={lang.id}>{lang.flag} {lang.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Greeting Message */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Greeting</label>
                      <p className="text-xs text-gray-500 mt-0.5">First message when agent answers.</p>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={formData.greeting}
                        onChange={e => setFormData({ ...formData, greeting: e.target.value })}
                        rows={3}
                        placeholder="Enter greeting message..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none"
                      />
                    </div>
                  </div>

                  {/* Personality */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Personality</label>
                      <p className="text-xs text-gray-500 mt-0.5">Select the tone of your agent.</p>
                    </div>
                    <div className="flex-1">
                      <select
                        value={formData.personality}
                        onChange={e => setFormData({ ...formData, personality: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                      >
                        <option value="professional">Professional</option>
                        <option value="friendly">Friendly</option>
                        <option value="casual">Casual</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Voice Tab */}
              {activeTab === 'voice' && (
                <div className="space-y-6">
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Select Voice</label>
                      <p className="text-xs text-gray-500 mt-0.5">Choose a voice for your agent. Click play to preview.</p>
                    </div>
                    <div className="flex-1">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {voiceOptions
                          .filter(v => {
                            return v.language === formData.language ||
                                   v.language === 'en-IN' ||
                                   v.language === 'en-US' ||
                                   v.region === 'sarvam';
                          })
                          .slice(0, 12)
                          .map(voice => {
                            const isSelected = formData.voiceId === voice.id && formData.voiceName === voice.name;
                            return (
                              <button
                                key={`${voice.id}-${voice.name}`}
                                onClick={() => {
                                  const newLanguage = voice.language || formData.language;
                                  const langOption = languageOptions.find(l => l.id === newLanguage);
                                  setFormData({
                                    ...formData,
                                    voiceId: voice.id,
                                    voiceName: voice.name,
                                    language: newLanguage,
                                    greeting: langOption?.greetingTemplate || formData.greeting,
                                  });
                                }}
                                className={`relative p-4 rounded-lg border text-left transition-all ${
                                  isSelected
                                    ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-500'
                                    : 'border-gray-200 hover:border-teal-300 bg-white'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-2xl">{voice.gender === 'female' ? '👩' : '👨'}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900">{voice.name}</p>
                                    <p className="text-xs text-gray-500">{voice.description}</p>
                                  </div>
                                  <span
                                    role="button"
                                    onClick={e => { e.stopPropagation(); testVoice(voice.id); }}
                                    className="p-2 hover:bg-gray-100 rounded-full cursor-pointer"
                                  >
                                    <Play size={16} className="text-teal-600" />
                                  </span>
                                </div>
                                {voice.provider === 'sarvam' && (
                                  <span className="absolute -top-2 -right-2 bg-purple-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">Native</span>
                                )}
                                {isSelected && (
                                  <div className="absolute top-2 left-2">
                                    <Check size={16} className="text-teal-600" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Prompt Tab */}
              {activeTab === 'prompt' && (
                <div className="space-y-6">
                  {/* System Prompt */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">System Prompt</label>
                      <p className="text-xs text-gray-500 mt-0.5">Define your agent's behavior and knowledge.</p>
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={formData.systemPrompt}
                        onChange={e => setFormData({ ...formData, systemPrompt: e.target.value })}
                        rows={8}
                        placeholder="You are a helpful voice assistant for our company. Your role is to..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition resize-none font-mono text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-2">
                        Tip: Be specific about your agent's role, knowledge, and how it should handle different scenarios.
                      </p>
                    </div>
                  </div>

                  {/* Questions to Ask */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Questions</label>
                      <p className="text-xs text-gray-500 mt-0.5">Questions your agent will ask callers to collect information.</p>
                    </div>
                    <div className="flex-1">
                      {/* Existing Questions */}
                      <div className="space-y-2 mb-4">
                        {formData.questions.map((q, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition">
                            <GripVertical size={14} className="text-gray-300 cursor-grab" />
                            <span className="text-gray-500 text-sm font-medium w-6">{idx + 1}.</span>
                            <div className="flex-1">
                              <p className="text-sm text-gray-700">{q.question || q}</p>
                              {q.field && (
                                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded mt-1 inline-block">
                                  Collects: {q.field}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                const newQuestions = formData.questions.filter((_, i) => i !== idx);
                                setFormData({ ...formData, questions: newQuestions });
                              }}
                              className="p-1.5 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                            >
                              <X size={14} className="text-red-500" />
                            </button>
                          </div>
                        ))}
                        {formData.questions.length === 0 && (
                          <div className="p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                            <p className="text-sm text-gray-400">No questions added yet. Add questions below to collect information from callers.</p>
                          </div>
                        )}
                      </div>

                      {/* Add New Question Form */}
                      <div className="border border-gray-200 rounded-lg p-4 bg-white">
                        <p className="text-sm font-medium text-gray-700 mb-3">Add New Question</p>
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Question</label>
                            <input
                              type="text"
                              value={newQuestion}
                              onChange={e => setNewQuestion(e.target.value)}
                              placeholder="e.g., May I know your name please?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                              onKeyDown={e => {
                                if (e.key === 'Enter' && newQuestion.trim()) {
                                  e.preventDefault();
                                  setFormData({
                                    ...formData,
                                    questions: [...formData.questions, { question: newQuestion.trim(), field: newQuestionField }]
                                  });
                                  setNewQuestion('');
                                  setNewQuestionField('info');
                                }
                              }}
                            />
                          </div>
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="text-xs text-gray-500 mb-1 block">Collect as field</label>
                              <select
                                value={newQuestionField}
                                onChange={e => setNewQuestionField(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                              >
                                <option value="info">General Info</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="phone">Phone Number</option>
                                <option value="company">Company</option>
                                <option value="designation">Designation</option>
                                <option value="location">Location/City</option>
                                <option value="budget">Budget</option>
                                <option value="timeline">Timeline</option>
                                <option value="requirements">Requirements</option>
                                <option value="interest">Interest Level</option>
                                <option value="experience">Experience</option>
                                <option value="currentRole">Current Role</option>
                                <option value="availability">Availability</option>
                                <option value="custom">Custom Field</option>
                              </select>
                            </div>
                            <div className="flex items-end">
                              <button
                                onClick={() => {
                                  if (newQuestion.trim()) {
                                    setFormData({
                                      ...formData,
                                      questions: [...formData.questions, { question: newQuestion.trim(), field: newQuestionField }]
                                    });
                                    setNewQuestion('');
                                    setNewQuestionField('info');
                                  }
                                }}
                                disabled={!newQuestion.trim()}
                                className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center gap-2"
                              >
                                <Plus size={16} />
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-3">
                        Tip: Questions are asked in order. The AI will naturally weave these into the conversation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents Tab - WhatsApp Sharing */}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  {/* Info Banner */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                    <MessageCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-medium text-green-800">WhatsApp Document Sharing</p>
                      <p className="text-xs text-green-700 mt-1">
                        When callers ask for brochures, fee structures, or any documents during the call,
                        the AI will automatically send them via WhatsApp.
                      </p>
                    </div>
                  </div>

                  {/* Existing Documents */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Documents</label>
                      <p className="text-xs text-gray-500 mt-0.5">Files that can be shared via WhatsApp during calls.</p>
                    </div>
                    <div className="flex-1">
                      {formData.documents.length > 0 ? (
                        <div className="space-y-3">
                          {formData.documents.map((doc, idx) => (
                            <div key={doc.id || idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg group hover:bg-gray-100 transition">
                              <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                {doc.type === 'pdf' && <FileText size={20} className="text-red-500" />}
                                {doc.type === 'image' && <Image size={20} className="text-blue-500" />}
                                {doc.type === 'video' && <Play size={20} className="text-purple-500" />}
                                {doc.type === 'document' && <FileText size={20} className="text-gray-500" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{doc.name}</p>
                                <p className="text-sm text-gray-500 truncate">{doc.description}</p>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {doc.keywords.map((kw, i) => (
                                    <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const newDocs = formData.documents.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, documents: newDocs });
                                }}
                                className="p-2 hover:bg-red-100 rounded opacity-0 group-hover:opacity-100 transition"
                              >
                                <Trash2 size={16} className="text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200 text-center">
                          <Upload size={32} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-400">No documents added yet</p>
                          <p className="text-xs text-gray-400 mt-1">Add documents below to enable WhatsApp sharing</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Add New Document Form */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Add Document</label>
                      <p className="text-xs text-gray-500 mt-0.5">Upload or link a document.</p>
                    </div>
                    <div className="flex-1">
                      <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Document Name *</label>
                            <input
                              type="text"
                              value={newDocument.name}
                              onChange={e => setNewDocument({ ...newDocument, name: e.target.value })}
                              placeholder="e.g., Fee Structure 2024"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 mb-1 block">Type</label>
                            <select
                              value={newDocument.type}
                              onChange={e => setNewDocument({ ...newDocument, type: e.target.value as any })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm bg-white"
                            >
                              <option value="pdf">PDF Document</option>
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                              <option value="document">Other Document</option>
                            </select>
                          </div>
                        </div>
                        {/* File Upload Section */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Upload File</label>
                          <div
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleFileDrop}
                            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
                              isUploading
                                ? 'border-teal-400 bg-teal-50'
                                : selectedFile || newDocument.url
                                ? 'border-green-400 bg-green-50'
                                : 'border-gray-300 hover:border-teal-400 hover:bg-gray-50'
                            }`}
                          >
                            {isUploading ? (
                              <div className="py-2">
                                <Loader2 className="animate-spin mx-auto text-teal-500 mb-2" size={24} />
                                <p className="text-sm text-teal-600">Uploading... {uploadProgress}%</p>
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                                  <div
                                    className="bg-teal-500 h-1.5 rounded-full transition-all"
                                    style={{ width: `${uploadProgress}%` }}
                                  />
                                </div>
                              </div>
                            ) : selectedFile || newDocument.url ? (
                              <div className="py-2">
                                <div className="flex items-center justify-center gap-2 text-green-600">
                                  <Check size={20} />
                                  <span className="text-sm font-medium">
                                    {selectedFile ? selectedFile.name : 'File linked'}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedFile(null);
                                    setNewDocument(prev => ({ ...prev, url: '' }));
                                  }}
                                  className="mt-2 text-xs text-red-500 hover:text-red-700"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <div className="py-2">
                                <Upload className="mx-auto text-gray-400 mb-2" size={24} />
                                <p className="text-sm text-gray-600">
                                  Drag & drop a file here, or{' '}
                                  <label className="text-teal-600 hover:text-teal-700 cursor-pointer font-medium">
                                    browse
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.mp4,.webm"
                                      onChange={handleFileSelect}
                                    />
                                  </label>
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  PDF, DOC, XLS, Images, Videos (max 10MB)
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* OR Divider */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 border-t border-gray-200" />
                          <span className="text-xs text-gray-400 font-medium">OR</span>
                          <div className="flex-1 border-t border-gray-200" />
                        </div>

                        {/* URL Input */}
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Document URL</label>
                          <input
                            type="url"
                            value={newDocument.url}
                            onChange={e => {
                              setNewDocument({ ...newDocument, url: e.target.value });
                              if (e.target.value) setSelectedFile(null);
                            }}
                            placeholder="https://example.com/document.pdf"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                            disabled={!!selectedFile}
                          />
                          <p className="text-xs text-gray-400 mt-1">Or paste a publicly accessible URL</p>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Description</label>
                          <input
                            type="text"
                            value={newDocument.description}
                            onChange={e => setNewDocument({ ...newDocument, description: e.target.value })}
                            placeholder="e.g., Complete fee breakdown for all courses"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Keywords (comma separated)</label>
                          <input
                            type="text"
                            value={newDocument.keywords}
                            onChange={e => setNewDocument({ ...newDocument, keywords: e.target.value })}
                            placeholder="e.g., fees, cost, price, tuition, charges"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm"
                          />
                          <p className="text-xs text-gray-400 mt-1">AI uses these to match user requests</p>
                        </div>
                        <button
                          onClick={() => {
                            if (newDocument.name.trim()) {
                              const doc = {
                                id: Date.now().toString(),
                                name: newDocument.name.trim(),
                                type: newDocument.type,
                                url: newDocument.url.trim(),
                                description: newDocument.description.trim(),
                                keywords: newDocument.keywords.split(',').map(k => k.trim()).filter(k => k),
                              };
                              setFormData({ ...formData, documents: [...formData.documents, doc] });
                              setNewDocument({ name: '', type: 'pdf', url: '', description: '', keywords: '' });
                              setSelectedFile(null);
                            }
                          }}
                          disabled={!newDocument.name.trim() || isUploading}
                          className="w-full px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <Plus size={16} />
                          Add Document
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Example Keywords */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Example Triggers</label>
                      <p className="text-xs text-gray-500 mt-0.5">Phrases that trigger document sharing.</p>
                    </div>
                    <div className="flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-xs text-gray-600 mb-2">The AI will send documents when callers say things like:</p>
                        <div className="flex flex-wrap gap-2">
                          {['Send me the brochure', 'Fee structure bhej do', 'Can I see campus photos?', 'Share syllabus on WhatsApp', 'Fees details pampandi'].map((phrase, i) => (
                            <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full">
                              "{phrase}"
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6">
                  {/* Max Call Duration */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Max Duration</label>
                      <p className="text-xs text-gray-500 mt-0.5">Maximum call duration allowed.</p>
                    </div>
                    <div className="flex-1">
                      <select
                        value={formData.maxCallDuration}
                        onChange={e => setFormData({ ...formData, maxCallDuration: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                      >
                        <option value={5}>5 minutes</option>
                        <option value={10}>10 minutes</option>
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={0}>Unlimited</option>
                      </select>
                    </div>
                  </div>

                  {/* Working Hours Toggle */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Working Hours</label>
                      <p className="text-xs text-gray-500 mt-0.5">Only accept calls during work hours.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, workingHoursEnabled: !formData.workingHoursEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.workingHoursEnabled ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.workingHoursEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.workingHoursEnabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      {formData.workingHoursEnabled && (
                        <div className="mt-4 flex items-center gap-4 pl-4 border-l-2 border-teal-200">
                          <input
                            type="time"
                            value={formData.workingHoursStart}
                            onChange={e => setFormData({ ...formData, workingHoursStart: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <span className="text-gray-500">to</span>
                          <input
                            type="time"
                            value={formData.workingHoursEnd}
                            onChange={e => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Call Recording Toggle */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Call Recording</label>
                      <p className="text-xs text-gray-500 mt-0.5">Record all calls for quality assurance.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, recordCalls: !formData.recordCalls })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.recordCalls ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.recordCalls ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.recordCalls ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Lead Generation & CRM Settings */}
                  <h3 className="text-sm font-semibold text-gray-900 pt-2">Lead Generation & CRM</h3>

                  {/* Auto Create Leads */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Auto Create Leads</label>
                      <p className="text-xs text-gray-500 mt-0.5">Automatically create leads from calls.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, autoCreateLeads: !formData.autoCreateLeads })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.autoCreateLeads ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.autoCreateLeads ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.autoCreateLeads ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Deduplicate by Phone */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Deduplicate Leads</label>
                      <p className="text-xs text-gray-500 mt-0.5">Prevent duplicate leads by phone number.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, deduplicateByPhone: !formData.deduplicateByPhone })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.deduplicateByPhone ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.deduplicateByPhone ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.deduplicateByPhone ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Appointment Booking */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Appointment Booking</label>
                      <p className="text-xs text-gray-500 mt-0.5">Auto-create appointments from calls.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, appointmentEnabled: !formData.appointmentEnabled })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.appointmentEnabled ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.appointmentEnabled ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.appointmentEnabled ? 'Enabled' : 'Disabled'}</span>
                      </div>
                      {formData.appointmentEnabled && (
                        <div className="mt-4 flex items-center gap-4 pl-4 border-l-2 border-teal-200">
                          <select
                            value={formData.appointmentDuration}
                            onChange={e => setFormData({ ...formData, appointmentDuration: parseInt(e.target.value) })}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={45}>45 minutes</option>
                            <option value={60}>1 hour</option>
                          </select>
                          <span className="text-gray-500 text-sm">default duration</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CRM Integration */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">CRM Integration</label>
                      <p className="text-xs text-gray-500 mt-0.5">Where to send lead data.</p>
                    </div>
                    <div className="flex-1">
                      <select
                        value={formData.crmIntegration}
                        onChange={e => setFormData({ ...formData, crmIntegration: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white transition"
                      >
                        <option value="internal">Internal CRM (Default)</option>
                        <option value="salesforce">Salesforce (via Webhook)</option>
                        <option value="hubspot">HubSpot (via Webhook)</option>
                        <option value="zoho">Zoho CRM (via Webhook)</option>
                        <option value="custom">Custom Webhook</option>
                      </select>
                    </div>
                  </div>

                  {/* Trigger Webhooks */}
                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Trigger Webhooks</label>
                      <p className="text-xs text-gray-500 mt-0.5">Send events to external systems.</p>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <button
                          onClick={() => setFormData({ ...formData, triggerWebhookOnLead: !formData.triggerWebhookOnLead })}
                          className={`relative w-12 h-6 rounded-full transition-colors ${
                            formData.triggerWebhookOnLead ? 'bg-teal-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                              formData.triggerWebhookOnLead ? 'translate-x-6' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                        <span className="ml-3 text-sm text-gray-600">{formData.triggerWebhookOnLead ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* Test Call Section */}
                  <h3 className="text-sm font-semibold text-gray-900 pt-2">Test Your Agent</h3>

                  <div className="flex items-start gap-8">
                    <div className="w-48 flex-shrink-0">
                      <label className="text-sm font-medium text-gray-900">Phone Number</label>
                      <p className="text-xs text-gray-500 mt-0.5">Enter number to receive test call.</p>
                    </div>
                    <div className="flex-1 flex gap-3">
                      <input
                        type="tel"
                        value={testPhoneNumber}
                        onChange={e => setTestPhoneNumber(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
                      />
                      <button
                        onClick={initiateTestCall}
                        disabled={isTestingCall || !testPhoneNumber.trim()}
                        className="px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition font-medium flex items-center gap-2"
                      >
                        {isTestingCall ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            Calling...
                          </>
                        ) : (
                          <>
                            <Phone size={16} />
                            Test Call
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="flex justify-between items-center px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-5 py-2.5 text-gray-600 hover:text-gray-900 transition font-medium"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!formData.name}
                className="flex items-center gap-2 px-6 py-2.5 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:opacity-50 transition font-medium"
              >
                Save & Next
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Create */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Your Agent</h2>
              <p className="text-gray-600">Make sure everything looks good before creating</p>
            </div>

            {/* Agent Preview Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div
                className="h-24 flex items-end px-6 pb-4"
                style={{ background: `linear-gradient(135deg, ${formData.widgetColor}, ${formData.widgetColor}dd)` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-3xl shadow-lg">
                    {industryDetails[selectedIndustry!]?.icon}
                  </div>
                  <div className="text-white">
                    <h3 className="text-xl font-bold">{formData.name}</h3>
                    <p className="text-white/80 text-sm">{industryDetails[selectedIndustry!]?.description}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Industry</p>
                    <p className="font-semibold text-gray-900">{selectedIndustry?.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Voice</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      {formData.useCustomVoice ? (
                        <>🎙️ {formData.customVoiceName || 'Custom'}</>
                      ) : (
                        <>{formData.voiceName}</>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Language</p>
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span>{languageOptions.find(l => l.id === formData.language)?.flag}</span>
                      {languageOptions.find(l => l.id === formData.language)?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Questions</p>
                    <p className="font-semibold text-gray-900">{formData.questions.length} configured</p>
                  </div>
                </div>

                <hr className="my-6" />

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Greeting Message</p>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-gray-700 italic">"{formData.greeting}"</p>
                  </div>
                </div>

                <hr className="my-6" />

                {/* AI Behavior Settings */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Brain size={14} />
                    AI Behavior Settings
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Personality</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.personality}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Response Speed</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.responseSpeed}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Creativity</p>
                      <p className="font-semibold text-gray-900">{Math.round(formData.creativity * 100)}%</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Interrupts</p>
                      <p className="font-semibold text-gray-900 capitalize">{formData.interruptHandling === 'wait' ? 'Wait & Listen' : 'Polite Ack'}</p>
                    </div>
                  </div>
                </div>

                <hr className="my-6" />

                {/* Call Handling Settings */}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                    <Clock size={14} />
                    Call Handling Settings
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Working Hours</p>
                      <p className="font-semibold text-gray-900">
                        {formData.workingHoursEnabled ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <Check size={14} /> Enabled
                          </span>
                        ) : (
                          <span className="text-gray-500">24/7 Available</span>
                        )}
                      </p>
                    </div>
                    {formData.workingHoursEnabled && (
                      <div className="p-3 bg-gray-50 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Hours</p>
                        <p className="font-semibold text-gray-900">{formData.workingHoursStart} - {formData.workingHoursEnd}</p>
                      </div>
                    )}
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Max Duration</p>
                      <p className="font-semibold text-gray-900">{formData.maxCallDuration === 0 ? 'Unlimited' : `${formData.maxCallDuration} min`}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Silence Timeout</p>
                      <p className="font-semibold text-gray-900">{formData.silenceTimeout} sec</p>
                    </div>
                  </div>
                  {formData.workingHoursEnabled && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                      <p className="text-xs text-gray-500 mb-1">Working Days</p>
                      <p className="font-semibold text-gray-900">{formData.workingDays.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-6">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-medium"
              >
                <ArrowLeft size={18} />
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition font-medium shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    Create Agent
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreateAgentPage;
