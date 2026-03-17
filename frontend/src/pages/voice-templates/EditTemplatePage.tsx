import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  ClockIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Question {
  id: string;
  question: string;
  field: string;
  required: boolean;
  type?: string;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

interface Document {
  id: string;
  name: string;
  type: string;
  url: string;
  description: string;
  keywords: string[];
}

const FIELD_OPTIONS = [
  { value: 'firstName', label: 'First Name' },
  { value: 'lastName', label: 'Last Name' },
  { value: 'phone', label: 'Phone' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Company' },
  { value: 'courseInterest', label: 'Course Interest' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'experience', label: 'Experience' },
  { value: 'budget', label: 'Budget' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'location', label: 'Location' },
  { value: 'custom1', label: 'Custom Field 1' },
  { value: 'custom2', label: 'Custom Field 2' },
  { value: 'custom3', label: 'Custom Field 3' },
];

const LANGUAGE_OPTIONS = [
  { value: 'en-IN', label: 'English (India)', flag: '🇮🇳' },
  { value: 'hi-IN', label: 'Hindi', flag: '🇮🇳' },
  { value: 'te-IN', label: 'Telugu', flag: '🇮🇳' },
  { value: 'ta-IN', label: 'Tamil', flag: '🇮🇳' },
  { value: 'kn-IN', label: 'Kannada', flag: '🇮🇳' },
  { value: 'ml-IN', label: 'Malayalam', flag: '🇮🇳' },
  { value: 'mr-IN', label: 'Marathi', flag: '🇮🇳' },
  { value: 'bn-IN', label: 'Bengali', flag: '🇮🇳' },
  { value: 'gu-IN', label: 'Gujarati', flag: '🇮🇳' },
  { value: 'pa-IN', label: 'Punjabi', flag: '🇮🇳' },
  { value: 'en-US', label: 'English (US)', flag: '🇺🇸' },
];

const VOICE_OPTIONS = [
  { value: 'sarvam-priya', label: 'Priya (Hindi Female)', provider: 'Sarvam' },
  { value: 'sarvam-dev', label: 'Dev (Hindi Male)', provider: 'Sarvam' },
  { value: 'sarvam-kavya', label: 'Kavya (Telugu Female)', provider: 'Sarvam' },
  { value: 'sarvam-ravi', label: 'Ravi (Telugu Male)', provider: 'Sarvam' },
  { value: 'nova', label: 'Nova (Female)', provider: 'OpenAI' },
  { value: 'alloy', label: 'Alloy (Neutral)', provider: 'OpenAI' },
  { value: 'echo', label: 'Echo (Male)', provider: 'OpenAI' },
  { value: 'shimmer', label: 'Shimmer (Female)', provider: 'OpenAI' },
  { value: 'onyx', label: 'Onyx (Male)', provider: 'OpenAI' },
  { value: 'fable', label: 'Fable (Neutral)', provider: 'OpenAI' },
];

const INDUSTRY_OPTIONS = [
  { value: 'EDUCATION', label: 'Education', icon: '🎓' },
  { value: 'IT_RECRUITMENT', label: 'IT Recruitment', icon: '💼' },
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: '🏠' },
  { value: 'CUSTOMER_CARE', label: 'Customer Care', icon: '📞' },
  { value: 'HEALTHCARE', label: 'Healthcare', icon: '🏥' },
  { value: 'FINANCE', label: 'Finance', icon: '💰' },
  { value: 'ECOMMERCE', label: 'E-commerce', icon: '🛒' },
  { value: 'CUSTOM', label: 'Custom', icon: '⚙️' },
];

const EditTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: 'EDUCATION',
    category: '',
    systemPrompt: '',
    knowledgeBase: '',
    questions: [] as Question[],
    faqs: [] as FAQ[],
    documents: [] as Document[],
    greeting: '',
    greetings: {} as Record<string, string>,
    fallbackMessage: '',
    transferMessage: '',
    endMessage: '',
    afterHoursMessage: '',
    language: 'en-IN',
    voiceId: 'alloy',
    temperature: 0.7,
    personality: 'professional',
    responseSpeed: 'normal',
    maxDuration: 300,
    workingHoursEnabled: false,
    workingHoursStart: '09:00',
    workingHoursEnd: '18:00',
    workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    autoCreateLeads: true,
    deduplicateByPhone: true,
    appointmentEnabled: false,
    appointmentType: '',
    appointmentDuration: 30,
  });

  useEffect(() => {
    if (isEditing) {
      fetchTemplate();
    }
  }, [id]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voice-templates/${id}`);
      const template = response.data.data;
      setFormData({
        name: template.name || '',
        description: template.description || '',
        industry: template.industry || 'EDUCATION',
        category: template.category || '',
        systemPrompt: template.systemPrompt || '',
        knowledgeBase: template.knowledgeBase || '',
        questions: template.questions || [],
        faqs: template.faqs || [],
        documents: template.documents || [],
        greeting: template.greeting || '',
        greetings: template.greetings || {},
        fallbackMessage: template.fallbackMessage || '',
        transferMessage: template.transferMessage || '',
        endMessage: template.endMessage || '',
        afterHoursMessage: template.afterHoursMessage || '',
        language: template.language || 'en-IN',
        voiceId: template.voiceId || 'alloy',
        temperature: template.temperature || 0.7,
        personality: template.personality || 'professional',
        responseSpeed: template.responseSpeed || 'normal',
        maxDuration: template.maxDuration || 300,
        workingHoursEnabled: template.workingHoursEnabled || false,
        workingHoursStart: template.workingHoursStart || '09:00',
        workingHoursEnd: template.workingHoursEnd || '18:00',
        workingDays: template.workingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        autoCreateLeads: template.autoCreateLeads ?? true,
        deduplicateByPhone: template.deduplicateByPhone ?? true,
        appointmentEnabled: template.appointmentEnabled || false,
        appointmentType: template.appointmentType || '',
        appointmentDuration: template.appointmentDuration || 30,
      });
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Failed to load template');
      navigate('/voice-templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      setSaving(true);
      if (isEditing) {
        await api.put(`/voice-templates/${id}`, formData);
        toast.success('Template updated successfully');
      } else {
        await api.post('/voice-templates', formData);
        toast.success('Template created successfully');
      }
      navigate('/voice-templates');
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // Question management
  const addQuestion = () => {
    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        { id: Date.now().toString(), question: '', field: 'custom1', required: false },
      ],
    });
  };

  const updateQuestion = (index: number, updates: Partial<Question>) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], ...updates };
    setFormData({ ...formData, questions: newQuestions });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  // FAQ management
  const addFAQ = () => {
    setFormData({
      ...formData,
      faqs: [
        ...formData.faqs,
        { id: Date.now().toString(), question: '', answer: '' },
      ],
    });
  };

  const updateFAQ = (index: number, updates: Partial<FAQ>) => {
    const newFaqs = [...formData.faqs];
    newFaqs[index] = { ...newFaqs[index], ...updates };
    setFormData({ ...formData, faqs: newFaqs });
  };

  const removeFAQ = (index: number) => {
    setFormData({
      ...formData,
      faqs: formData.faqs.filter((_, i) => i !== index),
    });
  };

  // Document management
  const addDocument = () => {
    setFormData({
      ...formData,
      documents: [
        ...formData.documents,
        { id: Date.now().toString(), name: '', type: 'pdf', url: '', description: '', keywords: [] },
      ],
    });
  };

  const updateDocument = (index: number, updates: Partial<Document>) => {
    const newDocs = [...formData.documents];
    newDocs[index] = { ...newDocs[index], ...updates };
    setFormData({ ...formData, documents: newDocs });
  };

  const removeDocument = (index: number) => {
    setFormData({
      ...formData,
      documents: formData.documents.filter((_, i) => i !== index),
    });
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: DocumentTextIcon },
    { id: 'prompt', label: 'System Prompt', icon: ChatBubbleLeftRightIcon },
    { id: 'knowledge', label: 'Knowledge Base', icon: DocumentTextIcon },
    { id: 'questions', label: 'Questions', icon: QuestionMarkCircleIcon },
    { id: 'faqs', label: 'FAQs', icon: QuestionMarkCircleIcon },
    { id: 'messages', label: 'Messages', icon: ChatBubbleLeftRightIcon },
    { id: 'voice', label: 'Voice Settings', icon: SpeakerWaveIcon },
    { id: 'settings', label: 'Settings', icon: Cog6ToothIcon },
    { id: 'documents', label: 'Documents', icon: DocumentIcon },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/voice-templates')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {isEditing ? 'Edit Template' : 'Create Template'}
                </h1>
                <p className="text-sm text-gray-500">
                  {isEditing ? formData.name : 'Configure your voice agent template'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/voice-templates')}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar Tabs */}
          <div className="w-64 shrink-0">
            <nav className="bg-white rounded-lg border shadow-sm p-2 sticky top-24">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white rounded-lg border shadow-sm p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Basic Information</h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Template Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., SRM Admissions Template"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry *
                    </label>
                    <select
                      value={formData.industry}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.icon} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="e.g., Admissions, Support, Sales"
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.flag} {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    placeholder="Describe what this template is used for..."
                    className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}

            {/* System Prompt Tab */}
            {activeTab === 'prompt' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">System Prompt</h2>
                  <span className="text-sm text-gray-500">
                    {formData.systemPrompt.length} characters
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Define how the AI agent should behave, its role, and conversation guidelines.
                </p>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  rows={20}
                  placeholder={`You are an experienced admissions counselor for SRM University.

YOUR ROLE:
- Help prospective students learn about programs
- Answer questions about fees, placements, eligibility
- Collect student information for follow-up
- Schedule campus tours

CONVERSATION GUIDELINES:
1. Be warm, professional, and encouraging
2. Keep responses concise (2-3 sentences)
3. Always try to collect: Name, Phone, Course Interest

TRANSFER TO HUMAN WHEN:
- Student requests to speak to a person
- Complex queries you cannot handle`}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}

            {/* Knowledge Base Tab */}
            {activeTab === 'knowledge' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Knowledge Base</h2>
                  <span className="text-sm text-gray-500">
                    {formData.knowledgeBase.length} characters
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Add detailed information about your organization, products, services, pricing, etc.
                  The AI will use this to answer questions accurately.
                </p>
                <textarea
                  value={formData.knowledgeBase}
                  onChange={(e) => setFormData({ ...formData, knowledgeBase: e.target.value })}
                  rows={25}
                  placeholder={`## ORGANIZATION NAME

### ABOUT
- Founded: 1985
- Type: University
- Rankings: Top 20

### PROGRAMS

#### Engineering (B.Tech - 4 Years)
| Branch | Fees/Year | Requirements |
|--------|-----------|--------------|
| CSE | ₹3.5 Lakhs | JEE 95+ percentile |
| ECE | ₹3.0 Lakhs | JEE 90+ percentile |

### PLACEMENTS
- Average Package: ₹8.5 LPA
- Highest Package: ₹54 LPA
- Top Recruiters: Google, Microsoft, Amazon

### CONTACT
- Phone: 1800-XXX-XXXX
- Email: admissions@example.com`}
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Qualification Questions</h2>
                    <p className="text-sm text-gray-600">
                      Questions the AI will ask to collect lead information
                    </p>
                  </div>
                  <button
                    onClick={addQuestion}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Question
                  </button>
                </div>

                {formData.questions.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <QuestionMarkCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No questions added yet</p>
                    <button
                      onClick={addQuestion}
                      className="mt-3 text-blue-600 hover:underline"
                    >
                      Add your first question
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.questions.map((q, index) => (
                      <div key={q.id} className="border rounded-lg p-4">
                        <div className="flex gap-4">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Question
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) => updateQuestion(index, { question: e.target.value })}
                              placeholder="e.g., May I know your name?"
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div className="w-48">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Map to Field
                            </label>
                            <select
                              value={q.field}
                              onChange={(e) => updateQuestion(index, { field: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              {FIELD_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer">
                              <input
                                type="checkbox"
                                checked={q.required}
                                onChange={(e) => updateQuestion(index, { required: e.target.checked })}
                              />
                              <span className="text-sm">Required</span>
                            </label>
                            <button
                              onClick={() => removeQuestion(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* FAQs Tab */}
            {activeTab === 'faqs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">FAQs</h2>
                    <p className="text-sm text-gray-600">
                      Common questions and answers the AI can use
                    </p>
                  </div>
                  <button
                    onClick={addFAQ}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add FAQ
                  </button>
                </div>

                {formData.faqs.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <QuestionMarkCircleIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No FAQs added yet</p>
                    <button
                      onClick={addFAQ}
                      className="mt-3 text-blue-600 hover:underline"
                    >
                      Add your first FAQ
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.faqs.map((faq, index) => (
                      <div key={faq.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-500">FAQ #{index + 1}</span>
                          <button
                            onClick={() => removeFAQ(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Question
                            </label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={(e) => updateFAQ(index, { question: e.target.value })}
                              placeholder="e.g., What are the fees?"
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Answer
                            </label>
                            <textarea
                              value={faq.answer}
                              onChange={(e) => updateFAQ(index, { answer: e.target.value })}
                              rows={3}
                              placeholder="Provide a detailed answer..."
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages Tab */}
            {activeTab === 'messages' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Conversation Messages</h2>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Greeting Message
                  </label>
                  <textarea
                    value={formData.greeting}
                    onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                    rows={3}
                    placeholder="Hello! Welcome to our organization. How can I help you today?"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fallback Message (When AI doesn't understand)
                  </label>
                  <textarea
                    value={formData.fallbackMessage}
                    onChange={(e) => setFormData({ ...formData, fallbackMessage: e.target.value })}
                    rows={2}
                    placeholder="I'm sorry, I didn't understand that. Could you please repeat?"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Message (Before connecting to human)
                  </label>
                  <textarea
                    value={formData.transferMessage}
                    onChange={(e) => setFormData({ ...formData, transferMessage: e.target.value })}
                    rows={2}
                    placeholder="Let me connect you with a human agent. Please hold."
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Message (Closing the conversation)
                  </label>
                  <textarea
                    value={formData.endMessage}
                    onChange={(e) => setFormData({ ...formData, endMessage: e.target.value })}
                    rows={2}
                    placeholder="Thank you for your time. Have a great day!"
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    After Hours Message
                  </label>
                  <textarea
                    value={formData.afterHoursMessage}
                    onChange={(e) => setFormData({ ...formData, afterHoursMessage: e.target.value })}
                    rows={2}
                    placeholder="We're currently closed. Our working hours are 9 AM to 6 PM. Please call back during business hours."
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>
            )}

            {/* Voice Settings Tab */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Voice Settings</h2>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Voice
                    </label>
                    <select
                      value={formData.voiceId}
                      onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      {VOICE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} ({opt.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Personality
                    </label>
                    <select
                      value={formData.personality}
                      onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Response Speed
                    </label>
                    <select
                      value={formData.responseSpeed}
                      onChange={(e) => setFormData({ ...formData, responseSpeed: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      <option value="fast">Fast</option>
                      <option value="normal">Normal</option>
                      <option value="thoughtful">Thoughtful</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature (Creativity): {formData.temperature}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      step="0.1"
                      value={formData.temperature}
                      onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Focused</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Duration (seconds)
                    </label>
                    <input
                      type="number"
                      value={formData.maxDuration}
                      onChange={(e) => setFormData({ ...formData, maxDuration: parseInt(e.target.value) })}
                      min={60}
                      max={1800}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.floor(formData.maxDuration / 60)} minutes
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold">Additional Settings</h2>

                {/* Working Hours */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Working Hours</h3>
                      <p className="text-sm text-gray-500">Restrict calls to specific hours</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.workingHoursEnabled}
                        onChange={(e) => setFormData({ ...formData, workingHoursEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.workingHoursEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                        <input
                          type="time"
                          value={formData.workingHoursStart}
                          onChange={(e) => setFormData({ ...formData, workingHoursStart: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                        <input
                          type="time"
                          value={formData.workingHoursEnd}
                          onChange={(e) => setFormData({ ...formData, workingHoursEnd: e.target.value })}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Lead Settings */}
                <div className="border rounded-lg p-4">
                  <h3 className="font-medium mb-4">Lead Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.autoCreateLeads}
                        onChange={(e) => setFormData({ ...formData, autoCreateLeads: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span>Auto-create leads from calls</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={formData.deduplicateByPhone}
                        onChange={(e) => setFormData({ ...formData, deduplicateByPhone: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span>Deduplicate leads by phone number</span>
                    </label>
                  </div>
                </div>

                {/* Appointment Settings */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">Appointment Booking</h3>
                      <p className="text-sm text-gray-500">Allow AI to book appointments</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.appointmentEnabled}
                        onChange={(e) => setFormData({ ...formData, appointmentEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formData.appointmentEnabled && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Appointment Type</label>
                        <input
                          type="text"
                          value={formData.appointmentType}
                          onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                          placeholder="e.g., Campus Tour"
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                        <input
                          type="number"
                          value={formData.appointmentDuration}
                          onChange={(e) => setFormData({ ...formData, appointmentDuration: parseInt(e.target.value) })}
                          min={15}
                          max={180}
                          className="w-full px-3 py-2 border rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === 'documents' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold">Documents</h2>
                    <p className="text-sm text-gray-600">
                      Documents that can be shared via WhatsApp during calls
                    </p>
                  </div>
                  <button
                    onClick={addDocument}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Add Document
                  </button>
                </div>

                {formData.documents.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <DocumentIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No documents added yet</p>
                    <button
                      onClick={addDocument}
                      className="mt-3 text-blue-600 hover:underline"
                    >
                      Add your first document
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.documents.map((doc, index) => (
                      <div key={doc.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-sm font-medium text-gray-500">Document #{index + 1}</span>
                          <button
                            onClick={() => removeDocument(index)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                              type="text"
                              value={doc.name}
                              onChange={(e) => updateDocument(index, { name: e.target.value })}
                              placeholder="e.g., Fee Structure 2024"
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select
                              value={doc.type}
                              onChange={(e) => updateDocument(index, { type: e.target.value })}
                              className="w-full px-3 py-2 border rounded-lg"
                            >
                              <option value="pdf">PDF</option>
                              <option value="image">Image</option>
                              <option value="video">Video</option>
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                            <input
                              type="url"
                              value={doc.url}
                              onChange={(e) => updateDocument(index, { url: e.target.value })}
                              placeholder="https://example.com/document.pdf"
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Keywords (comma separated)
                            </label>
                            <input
                              type="text"
                              value={doc.keywords.join(', ')}
                              onChange={(e) => updateDocument(index, {
                                keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                              })}
                              placeholder="fees, cost, price, charges"
                              className="w-full px-3 py-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              AI will send this document when user mentions these keywords
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditTemplatePage;
