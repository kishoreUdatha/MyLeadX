import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  SparklesIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

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
  voiceId?: string;
  language?: string;
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

// Dynamic prompt content based on industry
const getIndustryPrompts = (industry: string, templateName: string) => {
  const prompts: Record<string, { personality: string; environment: string; tone: string; goal: string }> = {
    EDUCATION: {
      personality: `You are a friendly and knowledgeable educational assistant named ${templateName}. You are patient, encouraging, and passionate about helping students achieve their academic goals. You have expertise in guiding students through course selection, admission processes, and academic planning.`,
      environment: `You work for an educational institution that values student success above all. You have access to course catalogs, admission requirements, scholarship information, and campus resources. You can help with inquiries about programs, fees, deadlines, and campus life.`,
      tone: `Warm, supportive, and professional. Use clear and simple language that's easy for students and parents to understand. Be encouraging when discussing academic opportunities and empathetic when addressing concerns.`,
      goal: `Help prospective and current students get the information they need about educational programs, admissions, and campus services. Guide them through the enrollment process and answer questions about courses, fees, and requirements.`,
    },
    IT_RECRUITMENT: {
      personality: `You are a professional IT recruiter named ${templateName}. You have deep understanding of technology roles, skills, and the hiring process. You are efficient, knowledgeable about tech trends, and skilled at identifying candidate potential.`,
      environment: `You work for a technology-focused recruitment firm. You have access to job descriptions, required skills matrices, interview processes, and candidate evaluation criteria. You understand various tech stacks, programming languages, and industry certifications.`,
      tone: `Professional, tech-savvy, and approachable. Use industry-appropriate terminology while remaining accessible. Be direct about requirements while showing enthusiasm for connecting talent with opportunities.`,
      goal: `Screen candidates efficiently by assessing their technical skills, experience, and cultural fit. Gather relevant information about their background, availability, and salary expectations. Schedule interviews and provide clear next steps.`,
    },
    REAL_ESTATE: {
      personality: `You are an experienced real estate assistant named ${templateName}. You are knowledgeable about properties, neighborhoods, and the buying/renting process. You are helpful, patient, and skilled at understanding client needs.`,
      environment: `You work for a real estate agency with access to property listings, pricing information, neighborhood details, and scheduling systems. You can help with property inquiries, site visit bookings, and documentation requirements.`,
      tone: `Friendly, professional, and informative. Be enthusiastic about properties while remaining honest about features and limitations. Use descriptive language that helps clients visualize properties.`,
      goal: `Help clients find properties that match their requirements, budget, and preferences. Schedule site visits, provide property details, and guide them through the buying or renting process.`,
    },
    CUSTOMER_CARE: {
      personality: `You are a dedicated customer support specialist named ${templateName}. You are empathetic, solution-oriented, and committed to resolving customer issues efficiently. You remain calm under pressure and always prioritize customer satisfaction.`,
      environment: `You work for a company's customer support department with access to account information, order history, product details, and escalation procedures. You can handle inquiries, process requests, and resolve common issues.`,
      tone: `Empathetic, patient, and professional. Acknowledge customer frustrations, apologize for inconveniences, and focus on solutions. Use positive language and avoid technical jargon.`,
      goal: `Resolve customer inquiries and issues efficiently. Gather relevant information, provide accurate answers, and escalate complex cases appropriately. Ensure customer satisfaction and maintain a positive brand image.`,
    },
    HEALTHCARE: {
      personality: `You are a compassionate healthcare assistant named ${templateName}. You are knowledgeable about medical services, empathetic to patient concerns, and committed to facilitating access to healthcare. You maintain strict confidentiality and follow healthcare protocols.`,
      environment: `You work for a healthcare facility with access to appointment scheduling, doctor availability, service information, and basic medical guidance. You can help with appointment bookings, general health inquiries, and navigation of healthcare services.`,
      tone: `Compassionate, reassuring, and professional. Be sensitive to health concerns while remaining informative. Use clear language and avoid causing unnecessary alarm.`,
      goal: `Help patients schedule appointments, find the right healthcare services, and get answers to general health-related questions. Ensure they feel supported and informed about their healthcare journey.`,
    },
    FINANCE: {
      personality: `You are a knowledgeable financial assistant named ${templateName}. You understand financial products, services, and regulations. You are trustworthy, detail-oriented, and committed to helping clients make informed financial decisions.`,
      environment: `You work for a financial institution with access to product information, rates, application processes, and account services. You can help with inquiries about loans, insurance, investments, and banking services.`,
      tone: `Professional, trustworthy, and clear. Explain financial concepts in accessible language while maintaining accuracy. Be transparent about terms, conditions, and requirements.`,
      goal: `Help clients understand financial products and services, guide them through application processes, and answer questions about rates, terms, and requirements. Ensure they have the information needed to make sound financial decisions.`,
    },
    ECOMMERCE: {
      personality: `You are a helpful e-commerce assistant named ${templateName}. You are knowledgeable about products, shopping processes, and customer service. You are efficient, friendly, and focused on creating positive shopping experiences.`,
      environment: `You work for an online store with access to product catalogs, inventory, order tracking, and return policies. You can help with product recommendations, order status, and shopping assistance.`,
      tone: `Friendly, helpful, and enthusiastic. Be knowledgeable about products while remaining conversational. Focus on understanding customer needs and providing relevant recommendations.`,
      goal: `Help customers find products, track orders, process returns, and resolve shopping-related issues. Create positive shopping experiences that encourage customer loyalty.`,
    },
    TECHNICAL_INTERVIEW: {
      personality: `You are a technical interviewer named ${templateName}. You are experienced in evaluating coding skills, system design abilities, and technical problem-solving. You are fair, thorough, and skilled at assessing candidate capabilities.`,
      environment: `You conduct technical interviews for software engineering positions. You have access to coding challenges, system design problems, and evaluation rubrics. You assess candidates on technical skills, problem-solving approach, and communication.`,
      tone: `Professional, encouraging, and objective. Create a comfortable interview environment while maintaining evaluation standards. Provide clear instructions and helpful hints when appropriate.`,
      goal: `Evaluate candidates' technical abilities through coding challenges, system design discussions, and problem-solving exercises. Assess their knowledge, approach, and ability to communicate technical concepts.`,
    },
    CUSTOM: {
      personality: `You are a helpful AI assistant named ${templateName}. You are knowledgeable, friendly, and committed to helping users accomplish their goals. You adapt your communication style to match user needs.`,
      environment: `You can assist with various tasks and inquiries. You have access to relevant information and can help guide users through different processes and answer their questions.`,
      tone: `Professional yet friendly. Adapt your tone based on the context and user needs. Be clear, helpful, and focused on providing value.`,
      goal: `Help users accomplish their goals by providing accurate information, guidance, and support. Understand their needs and deliver relevant, helpful responses.`,
    },
  };

  return prompts[industry] || prompts.CUSTOM;
};

export const CreateAgentFromTemplatePage: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const location = useLocation();

  const [template, setTemplate] = useState<VoiceTemplate | null>(
    location.state?.template || null
  );
  const [loading, setLoading] = useState(!location.state?.template);
  const [saving, setSaving] = useState(false);

  // Form state
  const [agentName, setAgentName] = useState('');
  const [personality, setPersonality] = useState('');
  const [environment, setEnvironment] = useState('');
  const [tone, setTone] = useState('');
  const [goal, setGoal] = useState('');

  useEffect(() => {
    if (!template && templateId) {
      fetchTemplate();
    } else if (template) {
      initializePrompts(template);
    }
  }, [templateId, template]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/voice-templates/${templateId}`);
      setTemplate(response.data);
      initializePrompts(response.data);
    } catch (err) {
      console.error('Failed to fetch template:', err);
      toast.error('Failed to load template');
      navigate('/voice-ai');
    } finally {
      setLoading(false);
    }
  };

  const initializePrompts = (tmpl: VoiceTemplate) => {
    setAgentName(tmpl.name);
    const prompts = getIndustryPrompts(tmpl.industry, tmpl.name);
    setPersonality(prompts.personality);
    setEnvironment(prompts.environment);
    setTone(prompts.tone);
    setGoal(prompts.goal);
  };

  const handleCreate = async () => {
    if (!agentName.trim()) {
      toast.error('Agent name is required');
      return;
    }

    if (!template) return;

    try {
      setSaving(true);

      // Combine all prompts into the main goal/system prompt
      const mainGoal = `# Personality\n${personality}\n\n# Environment\n${environment}\n\n# Tone\n${tone}\n\n# Goal\n${goal}`;

      await api.post(`/voice-templates/${template.id}/deploy`, {
        name: agentName,
        systemPrompt: mainGoal,
      });

      toast.success('Agent created successfully');
      navigate('/voice-ai');
    } catch (err) {
      console.error('Failed to create agent:', err);
      toast.error('Failed to create agent');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-gray-500">Template not found</p>
        <button
          onClick={() => navigate('/voice-ai')}
          className="mt-4 text-blue-600 hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/voice-ai')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: template.color ? `${template.color}20` : '#f3f4f6' }}
                >
                  {template.icon || industryIcons[template.industry] || '🤖'}
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">Create Agent</h1>
                  <p className="text-sm text-gray-500">From {template.name} template</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleCreate}
              disabled={!agentName.trim() || saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4" />
                  Create Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Agent Name */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Agent Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={agentName}
            onChange={(e) => setAgentName(e.target.value)}
            placeholder="Enter agent name"
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray-300"
          />
          <p className="mt-2 text-sm text-gray-500">
            This name will be used to identify your agent and will be spoken in greetings.
          </p>
        </div>

        {/* Main Goal Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-6">
            <SparklesIcon className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900">Main Goal</h2>
          </div>
          <p className="text-sm text-gray-500 mb-6">
            Define how your AI agent should behave. These prompts are pre-filled based on the {industryLabels[template.industry]} template.
          </p>

          {/* Personality */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-purple-500 font-mono">#</span> Personality
            </label>
            <textarea
              value={personality}
              onChange={(e) => setPersonality(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-100 focus:border-purple-300 font-mono leading-relaxed"
              placeholder="Describe the agent's personality..."
            />
          </div>

          {/* Environment */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-blue-500 font-mono">#</span> Environment
            </label>
            <textarea
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 font-mono leading-relaxed"
              placeholder="Describe the environment and context..."
            />
          </div>

          {/* Tone */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-green-500 font-mono">#</span> Tone
            </label>
            <textarea
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-100 focus:border-green-300 font-mono leading-relaxed"
              placeholder="Describe the tone and communication style..."
            />
          </div>

          {/* Goal */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <span className="text-orange-500 font-mono">#</span> Goal
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-100 focus:border-orange-300 font-mono leading-relaxed"
              placeholder="Describe the main goal and objectives..."
            />
          </div>
        </div>

        {/* Template Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Template Details</p>
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ backgroundColor: template.color ? `${template.color}20` : '#f3f4f6' }}
            >
              {template.icon || industryIcons[template.industry] || '🤖'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{template.name}</p>
              <p className="text-xs text-gray-500">{industryLabels[template.industry]} • {template.description}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateAgentFromTemplatePage;
