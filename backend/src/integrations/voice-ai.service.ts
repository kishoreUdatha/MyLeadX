import OpenAI from 'openai';
import { PrismaClient, VoiceAgentIndustry, VoiceSessionStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { webhookService, WEBHOOK_EVENTS } from '../services/webhook.service';
import { notificationChannelService, NOTIFICATION_EVENTS } from '../services/notification-channel.service';
import { calendarService } from '../services/calendar.service';
import { dripCampaignService } from '../services/drip-campaign.service';
import { parseVariables, extractInstitutionContext, extractLeadContext, VariableContext } from '../utils/variableParser';

const prisma = new PrismaClient();

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Industry Templates
export const industryTemplates: Record<VoiceAgentIndustry, {
  name: string;
  systemPrompt: string;
  questions: { id: string; question: string; field: string; required: boolean }[];
  greeting: string;
  faqs: { question: string; answer: string }[];
}> = {
  EDUCATION: {
    name: 'Education Counselor',
    systemPrompt: `You are a friendly and professional education counselor for a university/college. Your role is to:
- Answer questions about courses, fees, eligibility, and admissions
- Qualify leads by collecting their information
- Schedule campus visits or counselor callbacks
- Be helpful, patient, and encouraging about education opportunities

Always be polite and professional. If you don't know something specific, offer to connect them with a human counselor.`,
    questions: [
      { id: 'name', question: 'May I know your name?', field: 'firstName', required: true },
      { id: 'course', question: 'Which course or program are you interested in?', field: 'courseInterest', required: true },
      { id: 'qualification', question: 'What is your highest qualification?', field: 'qualification', required: true },
      { id: 'phone', question: 'Can I have your phone number for follow-up?', field: 'phone', required: true },
      { id: 'email', question: 'And your email address?', field: 'email', required: false },
      { id: 'timeline', question: 'When are you planning to start your course?', field: 'timeline', required: false },
    ],
    greeting: 'Hello! Welcome to our institution. I\'m your AI counselor. How can I help you today with your education journey?',
    faqs: [
      { question: 'What courses do you offer?', answer: 'We offer undergraduate, postgraduate, and diploma programs across various disciplines.' },
      { question: 'What are the fees?', answer: 'Fees vary by program. I can provide specific details once you tell me which course interests you.' },
      { question: 'Do you have placements?', answer: 'Yes, we have excellent placement records with top companies recruiting from our campus.' },
    ],
  },
  IT_RECRUITMENT: {
    name: 'IT Recruiter',
    systemPrompt: `You are a professional IT recruiter. Your role is to:
- Screen candidates for technical positions
- Collect relevant experience and skill information
- Assess basic qualifications and salary expectations
- Schedule interviews with the hiring team

Be professional, efficient, and respectful of the candidate's time. Ask relevant technical questions based on the role.`,
    questions: [
      { id: 'name', question: 'May I have your full name?', field: 'firstName', required: true },
      { id: 'experience', question: 'How many years of experience do you have in IT?', field: 'experience', required: true },
      { id: 'skills', question: 'What are your primary technical skills?', field: 'skills', required: true },
      { id: 'current_ctc', question: 'What is your current CTC?', field: 'currentCtc', required: true },
      { id: 'expected_ctc', question: 'What is your expected CTC?', field: 'expectedCtc', required: true },
      { id: 'notice_period', question: 'What is your notice period?', field: 'noticePeriod', required: true },
      { id: 'location', question: 'Are you open to relocation?', field: 'relocation', required: false },
    ],
    greeting: 'Hello! I\'m an AI recruiter. Thank you for your interest in our open position. I\'d like to ask you a few questions to understand your profile better.',
    faqs: [
      { question: 'What is the job role?', answer: 'I can share specific details about the role. Which position are you interested in?' },
      { question: 'Is remote work available?', answer: 'Work arrangement depends on the specific role. I\'ll note your preference.' },
    ],
  },
  REAL_ESTATE: {
    name: 'Property Advisor',
    systemPrompt: `You are a professional real estate advisor. Your role is to:
- Understand buyer's property requirements
- Collect budget and location preferences
- Qualify leads for property viewings
- Schedule site visits

Be helpful and knowledgeable about properties. Build trust and understand the buyer's needs.`,
    questions: [
      { id: 'name', question: 'May I know your name?', field: 'firstName', required: true },
      { id: 'property_type', question: 'Are you looking for an apartment, villa, or plot?', field: 'propertyType', required: true },
      { id: 'bedrooms', question: 'How many bedrooms do you need?', field: 'bedrooms', required: true },
      { id: 'budget', question: 'What is your budget range?', field: 'budget', required: true },
      { id: 'location', question: 'Which location or area do you prefer?', field: 'location', required: true },
      { id: 'timeline', question: 'When are you planning to purchase?', field: 'timeline', required: false },
      { id: 'phone', question: 'Can I have your contact number for property updates?', field: 'phone', required: true },
    ],
    greeting: 'Hello! Welcome to our property advisory service. I\'m here to help you find your dream home. What type of property are you looking for?',
    faqs: [
      { question: 'Do you have ready-to-move properties?', answer: 'Yes, we have both ready-to-move and under-construction properties.' },
      { question: 'What about home loans?', answer: 'We have tie-ups with major banks for easy home loan processing.' },
    ],
  },
  CUSTOMER_CARE: {
    name: 'Customer Support',
    systemPrompt: `You are a helpful customer support agent. Your role is to:
- Listen to customer queries and complaints
- Provide solutions or escalate when needed
- Track order/service status
- Ensure customer satisfaction

Be empathetic, patient, and solution-oriented. Apologize for any inconvenience and focus on resolution.`,
    questions: [
      { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
      { id: 'order_id', question: 'Can you provide your order or ticket number?', field: 'orderId', required: false },
      { id: 'issue', question: 'How can I help you today? Please describe your issue.', field: 'issue', required: true },
      { id: 'phone', question: 'What\'s the best number to reach you?', field: 'phone', required: true },
    ],
    greeting: 'Thank you for contacting our support team. I\'m your AI assistant. How may I help you today?',
    faqs: [
      { question: 'Where is my order?', answer: 'I can help track your order. Please provide your order number.' },
      { question: 'How do I return a product?', answer: 'You can initiate a return from your account or I can help you with the process.' },
    ],
  },
  TECHNICAL_INTERVIEW: {
    name: 'Technical Interviewer',
    systemPrompt: `You are a technical interviewer conducting a coding/technical interview. Your role is to:
- Ask relevant technical questions
- Evaluate problem-solving approach
- Test theoretical knowledge
- Provide hints when candidate is stuck
- Score responses objectively

Be professional and encouraging. Give candidates time to think. Ask follow-up questions to understand their depth of knowledge.`,
    questions: [
      { id: 'name', question: 'Before we begin, may I have your name?', field: 'firstName', required: true },
      { id: 'role', question: 'Which role are you interviewing for?', field: 'role', required: true },
      { id: 'experience', question: 'How many years of experience do you have?', field: 'experience', required: true },
    ],
    greeting: 'Hello! Welcome to the technical interview. I\'m an AI interviewer and I\'ll be assessing your technical skills today. Let\'s begin with a brief introduction.',
    faqs: [],
  },
  HEALTHCARE: {
    name: 'Healthcare Assistant',
    systemPrompt: `You are a healthcare appointment assistant. Your role is to:
- Help patients book appointments
- Collect basic health information
- Answer general queries about services
- Provide clinic/hospital information

Be compassionate and professional. Remind patients about emergency services for urgent cases.`,
    questions: [
      { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
      { id: 'concern', question: 'What health concern brings you here today?', field: 'concern', required: true },
      { id: 'doctor_preference', question: 'Do you have a preferred doctor or specialist?', field: 'doctorPreference', required: false },
      { id: 'phone', question: 'What\'s your contact number?', field: 'phone', required: true },
      { id: 'preferred_time', question: 'When would you like to schedule your appointment?', field: 'preferredTime', required: true },
    ],
    greeting: 'Hello! Welcome to our healthcare center. I\'m here to help you with appointments and general inquiries. How can I assist you today?',
    faqs: [
      { question: 'What are your working hours?', answer: 'We\'re open Monday to Saturday, 9 AM to 6 PM.' },
      { question: 'Do you accept insurance?', answer: 'Yes, we accept most major insurance providers.' },
    ],
  },
  FINANCE: {
    name: 'Financial Advisor',
    systemPrompt: `You are a financial services advisor. Your role is to:
- Understand customer's financial needs
- Explain products (loans, insurance, investments)
- Collect eligibility information
- Schedule meetings with financial advisors

Be professional, trustworthy, and clear about terms. Never give specific financial advice - always recommend speaking with a certified advisor.`,
    questions: [
      { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
      { id: 'service', question: 'Are you interested in loans, insurance, or investments?', field: 'service', required: true },
      { id: 'amount', question: 'What amount are you considering?', field: 'amount', required: false },
      { id: 'phone', question: 'What\'s your contact number?', field: 'phone', required: true },
      { id: 'email', question: 'And your email for documentation?', field: 'email', required: false },
    ],
    greeting: 'Hello! Welcome to our financial services. I\'m here to help you explore our loan, insurance, and investment options. What brings you here today?',
    faqs: [
      { question: 'What are your interest rates?', answer: 'Rates vary based on product and profile. Our advisor can provide exact rates.' },
    ],
  },
  ECOMMERCE: {
    name: 'Shopping Assistant',
    systemPrompt: `You are an e-commerce shopping assistant. Your role is to:
- Help customers find products
- Answer product queries
- Handle order and delivery questions
- Process returns and complaints

Be friendly and helpful. Focus on customer satisfaction and quick resolution.`,
    questions: [
      { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
      { id: 'query_type', question: 'Are you looking for a product, or do you have a question about an existing order?', field: 'queryType', required: true },
      { id: 'phone', question: 'What\'s your contact number?', field: 'phone', required: false },
    ],
    greeting: 'Hello! Welcome to our store. I\'m your AI shopping assistant. How can I help you today?',
    faqs: [
      { question: 'How long is delivery?', answer: 'Standard delivery takes 3-5 business days. Express delivery is available for select locations.' },
      { question: 'What is your return policy?', answer: 'We offer 30-day returns for most products. Certain items may have different policies.' },
    ],
  },
  CUSTOM: {
    name: 'Custom Agent',
    systemPrompt: 'You are a helpful AI assistant. Answer questions and help users with their queries.',
    questions: [
      { id: 'name', question: 'May I have your name?', field: 'firstName', required: true },
      { id: 'query', question: 'How can I help you today?', field: 'query', required: true },
    ],
    greeting: 'Hello! How can I help you today?',
    faqs: [],
  },
};

class VoiceAIService {
  private isConfigured(): boolean {
    return !!process.env.OPENAI_API_KEY;
  }

  // Get industry template
  getTemplate(industry: VoiceAgentIndustry) {
    return industryTemplates[industry];
  }

  // Get all templates
  getAllTemplates() {
    return Object.entries(industryTemplates).map(([key, value]) => ({
      industry: key,
      name: value.name,
      description: value.systemPrompt.substring(0, 100) + '...',
    }));
  }

  // Create a new voice agent
  async createAgent(data: {
    organizationId: string;
    name: string;
    industry: VoiceAgentIndustry;
    customPrompt?: string;
    customQuestions?: any[];
    createdById?: string;
  }) {
    const template = industryTemplates[data.industry];

    return await prisma.voiceAgent.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        industry: data.industry,
        systemPrompt: data.customPrompt || template.systemPrompt,
        questions: data.customQuestions || template.questions,
        greeting: template.greeting,
        faqs: template.faqs,
        fallbackMessage: "I'm sorry, I didn't quite understand that. Could you please rephrase?",
        transferMessage: "Let me connect you with a human agent who can better assist you.",
        endMessage: "Thank you for your time. Have a great day!",
        createdById: data.createdById,
      },
    });
  }

  // Get agent by ID
  async getAgent(agentId: string) {
    return await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      include: {
        _count: {
          select: { sessions: true },
        },
      },
    });
  }

  // Get agents for organization
  async getAgents(organizationId: string) {
    return await prisma.voiceAgent.findMany({
      where: { organizationId },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Update agent
  async updateAgent(agentId: string, data: any) {
    return await prisma.voiceAgent.update({
      where: { id: agentId },
      data,
    });
  }

  // Delete agent
  async deleteAgent(agentId: string) {
    return await prisma.voiceAgent.delete({
      where: { id: agentId },
    });
  }

  // Start a new voice session
  async startSession(agentId: string, visitorInfo?: {
    name?: string;
    email?: string;
    phone?: string;
    ip?: string;
    device?: string;
  }) {
    const sessionToken = uuidv4();

    const session = await prisma.voiceSession.create({
      data: {
        agentId,
        sessionToken,
        visitorName: visitorInfo?.name,
        visitorEmail: visitorInfo?.email,
        visitorPhone: visitorInfo?.phone,
        visitorIp: visitorInfo?.ip,
        visitorDevice: visitorInfo?.device,
        status: 'ACTIVE',
      },
      include: {
        agent: {
          include: {
            organization: {
              select: { settings: true },
            },
          },
        },
      },
    });

    // Build variable context for greeting
    const variableContext: VariableContext = {
      lead: {
        firstName: visitorInfo?.name?.split(' ')[0],
        phone: visitorInfo?.phone,
        email: visitorInfo?.email,
      },
      institution: extractInstitutionContext((session.agent as any).organization?.settings),
    };

    // Parse variables in greeting
    const parsedGreeting = session.agent.greeting
      ? parseVariables(session.agent.greeting, variableContext)
      : session.agent.greeting;

    // Add greeting as first transcript
    if (parsedGreeting) {
      await this.addTranscript(session.id, 'assistant', parsedGreeting);
    }

    return {
      sessionId: session.id,
      sessionToken: session.sessionToken,
      greeting: parsedGreeting,
      agentName: session.agent.name,
    };
  }

  // Speech to Text using OpenAI Whisper
  async speechToText(audioBuffer: Buffer, format: string = 'webm'): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI is not configured');
    }

    // Write buffer to temp file (OpenAI requires a file)
    const tempPath = path.join(os.tmpdir(), `voice_${Date.now()}.${format}`);
    fs.writeFileSync(tempPath, audioBuffer);

    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath),
        model: process.env.OPENAI_STT_MODEL || 'whisper-1',
        language: 'en',
      });

      return transcription.text;
    } finally {
      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
    }
  }

  // Text to Speech using OpenAI TTS
  async textToSpeech(text: string, voice: string = 'alloy'): Promise<Buffer> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI is not configured');
    }

    // Get TTS settings from environment variables
    const ttsModel = process.env.TTS_MODEL || 'tts-1-hd';
    const ttsSpeed = parseFloat(process.env.TTS_SPEED || '1.0');

    // Validate model - only allow tts-1 or tts-1-hd
    const validModel = ttsModel === 'tts-1' ? 'tts-1' : 'tts-1-hd';

    // Clamp speed to valid range (0.25 to 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, ttsSpeed));

    const response = await openai.audio.speech.create({
      model: validModel,
      voice: voice as any,
      input: text,
      response_format: 'mp3',
      speed: validSpeed,
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Process user message and get AI response
  async processMessage(sessionId: string, userMessage: string): Promise<{
    response: string;
    audioBuffer?: Buffer;
    qualification?: any;
    shouldEnd?: boolean;
  }> {
    // Get session with agent, organization settings, and previous transcripts
    const session = await prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: {
          include: {
            organization: {
              select: { settings: true },
            },
          },
        },
        transcripts: {
          orderBy: { timestamp: 'asc' },
          take: 20, // Last 20 messages for context
        },
        lead: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Save user message to transcript
    await this.addTranscript(sessionId, 'user', userMessage);

    // Build variable context from session data
    const variableContext: VariableContext = {
      lead: session.lead ? extractLeadContext(session.lead) : {
        firstName: session.visitorName?.split(' ')[0],
        phone: session.visitorPhone,
        email: session.visitorEmail,
      },
      institution: extractInstitutionContext((session.agent as any).organization?.settings),
    };

    // Build conversation history
    const messages: any[] = [
      {
        role: 'system',
        content: this.buildSystemPrompt(session.agent, variableContext),
      },
    ];

    // Add previous messages
    for (const transcript of session.transcripts) {
      messages.push({
        role: transcript.role as 'user' | 'assistant',
        content: transcript.content,
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: userMessage,
    });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: session.agent.temperature,
      max_tokens: 300,
    });

    const response = completion.choices[0]?.message?.content || session.agent.fallbackMessage || "I'm sorry, I couldn't process that.";

    // Save assistant response to transcript
    await this.addTranscript(sessionId, 'assistant', response);

    // Extract qualification data from conversation
    const qualification = await this.extractQualification(session, userMessage);
    if (Object.keys(qualification).length > 0) {
      await prisma.voiceSession.update({
        where: { id: sessionId },
        data: {
          qualification: {
            ...(session.qualification as object || {}),
            ...qualification,
          },
        },
      });
    }

    // Generate audio response
    let audioBuffer: Buffer | undefined;
    try {
      audioBuffer = await this.textToSpeech(response, session.agent.voiceId);
    } catch (error) {
      console.error('TTS error:', error);
    }

    // Check if conversation should end
    const shouldEnd = this.checkShouldEnd(response, session);

    return {
      response,
      audioBuffer,
      qualification,
      shouldEnd,
    };
  }

  // Build system prompt with context and variable parsing
  private buildSystemPrompt(agent: any, variableContext?: VariableContext): string {
    let prompt = agent.systemPrompt;

    // Parse variables in the system prompt
    if (variableContext) {
      prompt = parseVariables(prompt, variableContext);
    }

    // Add questions to collect
    if (agent.questions && (agent.questions as any[]).length > 0) {
      prompt += '\n\nYou should collect the following information during the conversation:\n';
      for (const q of agent.questions as any[]) {
        let questionText = q.question;
        if (variableContext) {
          questionText = parseVariables(questionText, variableContext);
        }
        prompt += `- ${questionText} (${q.required ? 'required' : 'optional'})\n`;
      }
    }

    // Add FAQs
    if (agent.faqs && (agent.faqs as any[]).length > 0) {
      prompt += '\n\nCommon FAQs:\n';
      for (const faq of agent.faqs as any[]) {
        let question = faq.question;
        let answer = faq.answer;
        if (variableContext) {
          question = parseVariables(question, variableContext);
          answer = parseVariables(answer, variableContext);
        }
        prompt += `Q: ${question}\nA: ${answer}\n\n`;
      }
    }

    // Add knowledge base
    if (agent.knowledgeBase) {
      let knowledge = agent.knowledgeBase;
      if (variableContext) {
        knowledge = parseVariables(knowledge, variableContext);
      }
      prompt += `\n\nAdditional Knowledge:\n${knowledge}`;
    }

    return prompt;
  }

  // Extract qualification data from message
  private async extractQualification(session: any, userMessage: string): Promise<any> {
    const questions = session.agent.questions as any[];
    if (!questions || questions.length === 0) {
      console.info(`[VoiceAI] extractQualification: No questions configured for session: ${session.id}`);
      return {};
    }

    // Use GPT to extract structured data
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract qualification data from the user's message. Return JSON only.
Fields to extract: ${questions.map((q: any) => q.field).join(', ')}
If a field is not mentioned, don't include it.`,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        return JSON.parse(content);
      }
    } catch (error) {
      console.error('Extraction error:', error);
    }

    return {};
  }

  // Check if conversation should end
  private checkShouldEnd(response: string, session: any): boolean {
    const endIndicators = [
      'goodbye',
      'thank you for your time',
      'have a great day',
      'talk to you soon',
      'end of conversation',
    ];

    const lowerResponse = response.toLowerCase();
    return endIndicators.some(indicator => lowerResponse.includes(indicator));
  }

  // Add transcript entry
  async addTranscript(sessionId: string, role: string, content: string, audioUrl?: string, duration?: number) {
    return await prisma.voiceTranscript.create({
      data: {
        sessionId,
        role,
        content,
        audioUrl,
        duration,
      },
    });
  }

  // End session
  async endSession(sessionId: string, status: VoiceSessionStatus = 'COMPLETED') {
    const session = await prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        transcripts: true,
        agent: true,
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Calculate duration
    const duration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

    // Generate summary
    const summary = await this.generateSummary(session);

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(session);

    // Update session
    const updatedSession = await prisma.voiceSession.update({
      where: { id: sessionId },
      data: {
        status,
        duration,
        summary,
        sentiment,
        endedAt: new Date(),
      },
    });

    // Create lead if qualification data exists
    if (session.qualification && Object.keys(session.qualification as object).length > 0) {
      await this.createLeadFromSession(session);
    }

    return updatedSession;
  }

  // Generate conversation summary
  private async generateSummary(session: any): Promise<string> {
    try {
      const transcripts = session.transcripts
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this conversation in 2-3 sentences. Focus on key points and outcomes.',
          },
          {
            role: 'user',
            content: transcripts,
          },
        ],
        temperature: 0.3,
        max_tokens: 150,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      return '';
    }
  }

  // Analyze conversation sentiment
  private async analyzeSentiment(session: any): Promise<string> {
    try {
      const userMessages = session.transcripts
        .filter((t: any) => t.role === 'user')
        .map((t: any) => t.content)
        .join(' ');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment of these user messages. Reply with only one word: positive, neutral, or negative.',
          },
          {
            role: 'user',
            content: userMessages,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      return completion.choices[0]?.message?.content?.toLowerCase() || 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  // Create or update lead from session qualification data with full CRM integration
  private async createLeadFromSession(session: any) {
    const qualification = session.qualification as any;
    const agent = session.agent;

    try {
      // Check if auto-create is disabled
      if (agent.autoCreateLeads === false) {
        console.log('[VoiceAI] autoCreateLeads disabled for agent:', agent.id);
        return;
      }

      // Check if lead already linked to session
      if (session.leadId) {
        // Update existing linked lead with new session data
        await this.updateExistingLeadWithSessionData(session.leadId, session);
        return;
      }

      const phone = qualification.phone || session.visitorPhone;
      if (!phone || phone === 'unknown') {
        console.log('[VoiceAI] No phone number available for lead creation');
        return;
      }

      // Deduplication: Check for existing lead by phone
      let lead = null;
      if (agent.deduplicateByPhone !== false) {
        lead = await prisma.lead.findFirst({
          where: {
            organizationId: agent.organizationId,
            phone: phone,
          },
        });
      }

      if (lead) {
        // Update existing lead with new call data
        console.log(`[VoiceAI] Found existing lead ${lead.id} for phone ${phone}, updating...`);
        await this.updateExistingLeadWithSessionData(lead.id, session);
      } else {
        // Create new lead with full CRM integration
        lead = await this.createNewLeadWithCRMData(session, qualification, agent);
      }

      // Link session to lead
      if (lead) {
        await prisma.voiceSession.update({
          where: { id: session.id },
          data: { leadId: lead.id },
        });
      }

      return lead;
    } catch (error) {
      console.error('[VoiceAI] Error creating/updating lead from session:', error);
    }
  }

  // Create a new lead with all CRM data
  private async createNewLeadWithCRMData(session: any, qualification: any, agent: any) {
    const leadData: any = {
      organizationId: agent.organizationId,
      firstName: qualification.firstName || qualification.name || session.visitorName || 'Voice Lead',
      lastName: qualification.lastName,
      phone: qualification.phone || session.visitorPhone || 'unknown',
      email: qualification.email || session.visitorEmail,
      source: 'CHATBOT',
      sourceDetails: `Voice AI - ${agent.name}`,
      customFields: qualification,
    };

    // Apply default stage if configured
    if (agent.defaultStageId) {
      leadData.stageId = agent.defaultStageId;
    }

    const lead = await prisma.lead.create({
      data: leadData,
    });

    console.log(`[VoiceAI] Created new lead ${lead.id} from voice session ${session.id}`);

    // Assign to default counselor if configured
    if (agent.defaultAssigneeId) {
      try {
        await prisma.leadAssignment.create({
          data: {
            leadId: lead.id,
            assignedToId: agent.defaultAssigneeId,
            assignedById: agent.defaultAssigneeId, // Self-assigned by system
          },
        });
        console.log(`[VoiceAI] Assigned lead ${lead.id} to ${agent.defaultAssigneeId}`);
      } catch (error) {
        console.error('[VoiceAI] Error assigning lead:', error);
      }
    }

    // Create call log for the voice session
    await this.createCallLogForSession(lead.id, session, agent);

    // Create lead note with AI summary
    await this.createLeadNoteForSession(lead.id, session);

    // Create activity for the voice interaction
    await this.createActivityForSession(lead.id, session, agent);

    // Schedule follow-up based on sentiment
    await this.scheduleFollowUpForSession(lead.id, session, agent);

    // Create appointment if enabled and scheduling data collected
    const appointment = await this.createAppointmentFromSession(lead.id, session, agent);

    // Trigger webhooks for lead creation
    await this.triggerLeadCreatedWebhook(lead, session, agent);

    // Send Slack/Teams notifications
    await this.sendLeadNotifications(lead, session, agent, appointment);

    // Sync appointment to Google Calendar
    await this.syncToCalendar(appointment, lead, agent);

    // Auto-enroll in email drip campaigns
    await this.enrollInDripCampaigns(lead.id, 'voice_session');

    return lead;
  }

  // Send notifications to Slack/Teams channels
  private async sendLeadNotifications(lead: any, session: any, agent: any, appointment?: any) {
    try {
      // Notify about new lead
      await notificationChannelService.notifyLeadCreated(agent.organizationId, lead, session);

      // Notify about call completion
      await notificationChannelService.notifyCallCompleted(agent.organizationId, {
        id: session.id,
        phoneNumber: session.visitorPhone,
        duration: session.duration,
        sentiment: session.sentiment,
        outcome: session.status,
        summary: session.summary,
      }, lead);

      // Notify about appointment if created
      if (appointment) {
        await notificationChannelService.notifyAppointmentBooked(agent.organizationId, appointment, lead);
      }

      console.log(`[VoiceAI] Sent notifications for lead ${lead.id}`);
    } catch (error) {
      console.error('[VoiceAI] Error sending notifications:', error);
    }
  }

  // Sync appointment to Google Calendar
  private async syncToCalendar(appointment: any, lead: any, agent: any) {
    if (!appointment) return;

    try {
      const eventId = await calendarService.syncAppointmentToCalendar(appointment, lead);
      if (eventId) {
        // Store calendar event ID on appointment for later updates
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { notes: `${appointment.notes || ''}\n\nCalendar Event ID: ${eventId}`.trim() },
        });
        console.log(`[VoiceAI] Synced appointment ${appointment.id} to calendar: ${eventId}`);
      }
    } catch (error) {
      console.error('[VoiceAI] Error syncing to calendar:', error);
    }
  }

  // Auto-enroll lead in matching drip campaigns
  private async enrollInDripCampaigns(leadId: string, eventType: 'created' | 'voice_session') {
    try {
      const enrolledIn = await dripCampaignService.checkAndEnrollLead(leadId, {
        type: eventType,
      });

      if (enrolledIn.length > 0) {
        console.log(`[VoiceAI] Auto-enrolled lead ${leadId} in drip campaigns: ${enrolledIn.join(', ')}`);
      }
    } catch (error) {
      console.error('[VoiceAI] Error enrolling in drip campaigns:', error);
    }
  }

  // Create appointment from voice session if scheduling data is available
  private async createAppointmentFromSession(leadId: string, session: any, agent: any) {
    try {
      // Check if appointment booking is enabled
      if (!agent.appointmentEnabled) {
        return;
      }

      const qualification = session.qualification as any;

      // Check if we have scheduling data (appointmentTime, preferredDate, preferredTime, etc.)
      const schedulingData = qualification.appointmentTime ||
                            qualification.preferredDate ||
                            qualification.preferredTime ||
                            qualification.appointmentDate ||
                            qualification.meetingTime;

      if (!schedulingData) {
        console.log('[VoiceAI] No scheduling data found in qualification, skipping appointment');
        return;
      }

      // Parse the scheduling data to get a date
      let scheduledAt: Date;
      try {
        // Try to parse various date formats
        if (typeof schedulingData === 'string') {
          // Handle relative dates
          const lowerSchedule = schedulingData.toLowerCase();
          if (lowerSchedule.includes('tomorrow')) {
            scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 1);
            scheduledAt.setHours(10, 0, 0, 0); // Default 10 AM
          } else if (lowerSchedule.includes('today')) {
            scheduledAt = new Date();
            scheduledAt.setHours(scheduledAt.getHours() + 2); // 2 hours from now
          } else if (lowerSchedule.includes('next week')) {
            scheduledAt = new Date();
            scheduledAt.setDate(scheduledAt.getDate() + 7);
            scheduledAt.setHours(10, 0, 0, 0);
          } else {
            // Try to parse as date string
            scheduledAt = new Date(schedulingData);
            if (isNaN(scheduledAt.getTime())) {
              // Default to tomorrow 10 AM if parsing fails
              scheduledAt = new Date();
              scheduledAt.setDate(scheduledAt.getDate() + 1);
              scheduledAt.setHours(10, 0, 0, 0);
            }
          }
        } else {
          scheduledAt = new Date();
          scheduledAt.setDate(scheduledAt.getDate() + 1);
          scheduledAt.setHours(10, 0, 0, 0);
        }
      } catch {
        scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + 1);
        scheduledAt.setHours(10, 0, 0, 0);
      }

      // Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          organizationId: agent.organizationId,
          leadId,
          voiceSessionId: session.id,
          title: qualification.appointmentType || agent.appointmentType || 'Voice AI Scheduled Appointment',
          description: `Appointment scheduled during AI voice conversation with ${agent.name}`,
          appointmentType: agent.appointmentType || 'consultation',
          scheduledAt,
          duration: agent.appointmentDuration || 30,
          timezone: agent.appointmentTimezone || 'Asia/Kolkata',
          locationType: 'PHONE',
          locationDetails: qualification.phone || session.visitorPhone,
          contactName: qualification.firstName || qualification.name || session.visitorName || 'Unknown',
          contactPhone: qualification.phone || session.visitorPhone || 'unknown',
          contactEmail: qualification.email || session.visitorEmail,
          status: 'SCHEDULED',
          notes: session.summary,
        },
      });

      console.log(`[VoiceAI] Created appointment ${appointment.id} for lead ${leadId} scheduled at ${scheduledAt.toISOString()}`);

      // Create activity for appointment
      const systemUser = await prisma.user.findFirst({
        where: { organizationId: agent.organizationId, role: { in: ['ADMIN', 'MANAGER'] } },
        select: { id: true },
      });

      if (systemUser) {
        await prisma.leadActivity.create({
          data: {
            leadId,
            userId: systemUser.id,
            type: 'FOLLOWUP_SCHEDULED',
            title: 'Appointment Scheduled via AI Voice',
            description: `Appointment scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}`,
            metadata: {
              appointmentId: appointment.id,
              scheduledAt: scheduledAt.toISOString(),
              duration: agent.appointmentDuration || 30,
            },
          },
        });
      }

      return appointment;
    } catch (error) {
      console.error('[VoiceAI] Error creating appointment:', error);
    }
  }

  // Trigger webhook when lead is created
  private async triggerLeadCreatedWebhook(lead: any, session: any, agent: any) {
    try {
      // Check if webhook triggering is enabled
      if (agent.triggerWebhookOnLead === false) {
        return;
      }

      // Trigger the standard lead.created webhook
      await webhookService.trigger({
        organizationId: agent.organizationId,
        event: WEBHOOK_EVENTS.LEAD_CREATED,
        data: {
          lead: {
            id: lead.id,
            firstName: lead.firstName,
            lastName: lead.lastName,
            phone: lead.phone,
            email: lead.email,
            source: lead.source,
            sourceDetails: lead.sourceDetails,
            customFields: lead.customFields,
            createdAt: lead.createdAt,
          },
          session: {
            id: session.id,
            agentId: agent.id,
            agentName: agent.name,
            duration: session.duration,
            sentiment: session.sentiment,
            summary: session.summary,
          },
          source: 'voice_ai',
        },
      });

      console.log(`[VoiceAI] Triggered lead.created webhook for lead ${lead.id}`);

      // Also trigger session.ended webhook
      await webhookService.trigger({
        organizationId: agent.organizationId,
        event: WEBHOOK_EVENTS.SESSION_ENDED,
        data: {
          sessionId: session.id,
          agentId: agent.id,
          agentName: agent.name,
          leadId: lead.id,
          duration: session.duration,
          sentiment: session.sentiment,
          summary: session.summary,
          qualification: session.qualification,
        },
      });

    } catch (error) {
      console.error('[VoiceAI] Error triggering webhook:', error);
    }
  }

  // Update existing lead with voice session data
  private async updateExistingLeadWithSessionData(leadId: string, session: any) {
    const agent = session.agent;
    const qualification = session.qualification as any;

    try {
      // Update lead's custom fields with any new qualification data
      if (qualification && Object.keys(qualification).length > 0) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        const existingFields = (lead?.customFields as object) || {};

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            customFields: { ...existingFields, ...qualification },
          },
        });
      }

      // Create call log for the voice session
      await this.createCallLogForSession(leadId, session, agent);

      // Create lead note with AI summary
      await this.createLeadNoteForSession(leadId, session);

      // Create activity for the voice interaction
      await this.createActivityForSession(leadId, session, agent);

      // Schedule follow-up based on sentiment
      await this.scheduleFollowUpForSession(leadId, session, agent);

      // Create appointment if enabled and scheduling data collected
      await this.createAppointmentFromSession(leadId, session, agent);

      // Trigger lead.updated webhook
      if (agent.triggerWebhookOnLead !== false) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (lead) {
          await webhookService.trigger({
            organizationId: agent.organizationId,
            event: WEBHOOK_EVENTS.LEAD_UPDATED,
            data: {
              lead: {
                id: lead.id,
                firstName: lead.firstName,
                lastName: lead.lastName,
                phone: lead.phone,
                email: lead.email,
                customFields: lead.customFields,
              },
              session: {
                id: session.id,
                agentId: agent.id,
                agentName: agent.name,
                duration: session.duration,
                sentiment: session.sentiment,
                summary: session.summary,
              },
              source: 'voice_ai',
            },
          });
        }
      }

      console.log(`[VoiceAI] Updated existing lead ${leadId} with voice session data`);
    } catch (error) {
      console.error('[VoiceAI] Error updating existing lead:', error);
    }
  }

  // Create call log entry for voice session
  private async createCallLogForSession(leadId: string, session: any, agent: any) {
    try {
      // Get a system user ID for the caller field - use the first admin user in org
      const systemUser = await prisma.user.findFirst({
        where: {
          organizationId: agent.organizationId,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
        select: { id: true },
      });

      if (!systemUser) {
        console.log('[VoiceAI] No system user found for call log, skipping');
        return;
      }

      const transcriptText = session.transcripts
        ?.map((t: any) => `${t.role}: ${t.content}`)
        .join('\n') || '';

      await prisma.callLog.create({
        data: {
          leadId,
          callerId: systemUser.id,
          phoneNumber: session.visitorPhone || 'unknown',
          direction: 'INBOUND',
          callType: 'AI',
          status: 'COMPLETED',
          duration: session.duration || 0,
          transcript: transcriptText,
          notes: session.summary,
          startedAt: session.createdAt,
          endedAt: session.endedAt || new Date(),
        },
      });

      console.log(`[VoiceAI] Created call log for lead ${leadId}`);
    } catch (error) {
      console.error('[VoiceAI] Error creating call log:', error);
    }
  }

  // Create lead note with AI conversation summary
  private async createLeadNoteForSession(leadId: string, session: any) {
    try {
      if (!session.summary) return;

      // Get a system user ID for the note
      const systemUser = await prisma.user.findFirst({
        where: {
          organizationId: session.agent.organizationId,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
        select: { id: true },
      });

      if (!systemUser) {
        console.log('[VoiceAI] No system user found for note, skipping');
        return;
      }

      await prisma.leadNote.create({
        data: {
          leadId,
          userId: systemUser.id,
          content: `**AI Voice Conversation Summary**\n\n${session.summary}\n\n**Sentiment:** ${session.sentiment || 'neutral'}\n**Duration:** ${session.duration || 0} seconds`,
          isPinned: true,
        },
      });

      console.log(`[VoiceAI] Created lead note for lead ${leadId}`);
    } catch (error) {
      console.error('[VoiceAI] Error creating lead note:', error);
    }
  }

  // Create activity for voice interaction
  private async createActivityForSession(leadId: string, session: any, agent: any) {
    try {
      // Get a system user ID for the activity
      const systemUser = await prisma.user.findFirst({
        where: {
          organizationId: agent.organizationId,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
        select: { id: true },
      });

      await prisma.leadActivity.create({
        data: {
          leadId,
          userId: systemUser?.id,
          type: 'CALL_MADE',
          title: 'AI Voice Conversation Completed',
          description: session.summary || `Voice session duration: ${session.duration || 0} seconds`,
          metadata: {
            sessionId: session.id,
            agentName: agent.name,
            sentiment: session.sentiment,
            duration: session.duration,
            visitorName: session.visitorName,
            visitorPhone: session.visitorPhone,
          },
        },
      });

      console.log(`[VoiceAI] Created activity for lead ${leadId}`);
    } catch (error) {
      console.error('[VoiceAI] Error creating activity:', error);
    }
  }

  // Schedule follow-up based on sentiment and outcome
  private async scheduleFollowUpForSession(leadId: string, session: any, agent: any) {
    try {
      const sentiment = session.sentiment || 'neutral';

      // Only create follow-ups for positive or neutral sentiment
      if (sentiment === 'negative') {
        console.log('[VoiceAI] Negative sentiment - skipping follow-up');
        return;
      }

      // Get the default assignee or first admin user
      const assigneeId = agent.defaultAssigneeId;
      if (!assigneeId) {
        const adminUser = await prisma.user.findFirst({
          where: {
            organizationId: agent.organizationId,
            role: { in: ['ADMIN', 'MANAGER'] },
          },
          select: { id: true },
        });
        if (!adminUser) {
          console.log('[VoiceAI] No assignee found for follow-up, skipping');
          return;
        }
      }

      const systemUser = await prisma.user.findFirst({
        where: {
          organizationId: agent.organizationId,
          role: { in: ['ADMIN', 'MANAGER'] },
        },
        select: { id: true },
      });

      if (!systemUser) return;

      // Schedule follow-up: positive = 1 day, neutral = 3 days
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + (sentiment === 'positive' ? 1 : 3));

      await prisma.followUp.create({
        data: {
          leadId,
          assigneeId: assigneeId || systemUser.id,
          createdById: systemUser.id,
          scheduledAt,
          message: sentiment === 'positive'
            ? 'Follow up on positive AI voice conversation'
            : 'Follow up on AI voice conversation',
          notes: session.summary,
          status: 'UPCOMING',
        },
      });

      console.log(`[VoiceAI] Scheduled follow-up for lead ${leadId} on ${scheduledAt.toISOString()}`);
    } catch (error) {
      console.error('[VoiceAI] Error scheduling follow-up:', error);
    }
  }

  // Get session details
  async getSession(sessionId: string) {
    return await prisma.voiceSession.findUnique({
      where: { id: sessionId },
      include: {
        agent: true,
        transcripts: {
          orderBy: { timestamp: 'asc' },
        },
        lead: true,
      },
    });
  }

  // Get sessions for agent
  async getAgentSessions(agentId: string, limit: number = 50) {
    return await prisma.voiceSession.findMany({
      where: { agentId },
      include: {
        lead: true,
        _count: {
          select: { transcripts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  // Get analytics for agent
  async getAgentAnalytics(agentId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const sessions = await prisma.voiceSession.findMany({
      where: {
        agentId,
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        duration: true,
        sentiment: true,
        leadId: true,
      },
    });

    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;
    const convertedSessions = sessions.filter(s => s.leadId).length;
    const avgDuration = sessions.reduce((acc, s) => acc + (s.duration || 0), 0) / totalSessions || 0;

    const sentimentCounts = {
      positive: sessions.filter(s => s.sentiment === 'positive').length,
      neutral: sessions.filter(s => s.sentiment === 'neutral').length,
      negative: sessions.filter(s => s.sentiment === 'negative').length,
    };

    return {
      totalSessions,
      completedSessions,
      convertedSessions,
      conversionRate: totalSessions ? (convertedSessions / totalSessions * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration),
      sentimentCounts,
    };
  }

  // ==================== VOICE CLONING ====================

  // Clone voice using ElevenLabs API
  private async cloneWithElevenLabs(audioBuffer: Buffer, name: string, mimeType: string): Promise<string> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const FormData = require('form-data');
    const form = new FormData();

    // Determine file extension
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/m4a': 'm4a',
    };
    const ext = extMap[mimeType] || 'mp3';

    form.append('name', name);
    form.append('files', audioBuffer, { filename: `voice.${ext}`, contentType: mimeType });
    form.append('description', `Custom voice cloned for CRM - ${name}`);

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        ...form.getHeaders(),
      },
      body: form,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] Voice clone error:', error);
      throw new Error(`ElevenLabs voice cloning failed: ${response.status}`);
    }

    const result = await response.json() as { voice_id: string };
    console.log(`[ElevenLabs] Voice cloned successfully: ${result.voice_id}`);
    return result.voice_id;
  }

  // Generate TTS using ElevenLabs
  async generateElevenLabsTTS(text: string, voiceId: string): Promise<Buffer> {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error('ElevenLabs API key not configured');
    }

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[ElevenLabs] TTS error:', error);
      throw new Error(`ElevenLabs TTS failed: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  // Clone voice from audio sample
  async cloneVoice(params: {
    organizationId: string;
    name: string;
    audioBuffer: Buffer;
    mimeType: string;
  }): Promise<{ voiceId: string; name: string; status: string; provider: string }> {
    const { organizationId, name, audioBuffer, mimeType } = params;

    // Create directory for voice samples if it doesn't exist
    const voicesDir = path.join(__dirname, '../../uploads/voices', organizationId);
    if (!fs.existsSync(voicesDir)) {
      fs.mkdirSync(voicesDir, { recursive: true });
    }

    // Determine file extension from mime type
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/wav': 'wav',
      'audio/mp3': 'mp3',
      'audio/mpeg': 'mp3',
      'audio/ogg': 'ogg',
      'audio/aac': 'aac',
      'audio/x-m4a': 'm4a',
    };
    const ext = extMap[mimeType] || 'webm';

    let voiceId: string;
    let provider: string;
    let elevenLabsVoiceId: string | null = null;

    // Try ElevenLabs first if API key is configured
    if (process.env.ELEVENLABS_API_KEY) {
      try {
        elevenLabsVoiceId = await this.cloneWithElevenLabs(audioBuffer, name, mimeType);
        voiceId = `elevenlabs_${elevenLabsVoiceId}`;
        provider = 'elevenlabs';
        console.log(`[VoiceAI] Voice cloned with ElevenLabs: ${voiceId}`);
      } catch (error) {
        console.error('[VoiceAI] ElevenLabs cloning failed, falling back to local:', error);
        voiceId = `custom_${uuidv4()}`;
        provider = 'local';
      }
    } else {
      voiceId = `custom_${uuidv4()}`;
      provider = 'local';
      console.log('[VoiceAI] ElevenLabs not configured, using local storage');
    }

    // Save the audio file locally as backup
    const filePath = path.join(voicesDir, `${voiceId}.${ext}`);
    fs.writeFileSync(filePath, audioBuffer);

    // Store voice metadata
    const metadataPath = path.join(voicesDir, `${voiceId}.json`);
    const metadata = {
      voiceId,
      name,
      organizationId,
      filePath,
      mimeType,
      createdAt: new Date().toISOString(),
      status: 'ready',
      provider,
      elevenLabsVoiceId, // Store ElevenLabs voice ID for TTS
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`[VoiceAI] Voice cloned: ${voiceId} for org ${organizationId} (provider: ${provider})`);

    return {
      voiceId,
      name,
      status: 'ready',
      provider,
    };
  }

  // Get custom voices for organization
  async getCustomVoices(organizationId: string): Promise<Array<{
    voiceId: string;
    name: string;
    status: string;
    createdAt: string;
  }>> {
    const voicesDir = path.join(__dirname, '../../uploads/voices', organizationId);

    if (!fs.existsSync(voicesDir)) {
      return [];
    }

    const files = fs.readdirSync(voicesDir).filter(f => f.endsWith('.json'));
    const voices = files.map(file => {
      const content = fs.readFileSync(path.join(voicesDir, file), 'utf-8');
      const metadata = JSON.parse(content);
      return {
        voiceId: metadata.voiceId,
        name: metadata.name,
        status: metadata.status,
        createdAt: metadata.createdAt,
      };
    });

    return voices.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Delete custom voice
  async deleteCustomVoice(voiceId: string, organizationId: string): Promise<void> {
    const voicesDir = path.join(__dirname, '../../uploads/voices', organizationId);
    const metadataPath = path.join(voicesDir, `${voiceId}.json`);

    if (!fs.existsSync(metadataPath)) {
      throw new Error('Voice not found');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Delete audio file
    if (fs.existsSync(metadata.filePath)) {
      fs.unlinkSync(metadata.filePath);
    }

    // Delete metadata file
    fs.unlinkSync(metadataPath);

    console.log(`[VoiceAI] Voice deleted: ${voiceId}`);
  }

  // Get custom voice audio for TTS (returns the stored audio sample)
  async getCustomVoiceAudio(voiceId: string, organizationId: string): Promise<Buffer | null> {
    const voicesDir = path.join(__dirname, '../../uploads/voices', organizationId);
    const metadataPath = path.join(voicesDir, `${voiceId}.json`);

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    if (fs.existsSync(metadata.filePath)) {
      return fs.readFileSync(metadata.filePath);
    }

    return null;
  }
}

export const voiceAIService = new VoiceAIService();
