import OpenAI from 'openai';
import { PrismaClient, OutboundCallStatus, OutboundContactStatus, OutboundCampaignStatus, CallOutcome, CallDirection, TransferType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { voiceAIService } from './voice-ai.service';
import { exotelService } from './exotel.service';
import { voiceMinutesService } from '../services/voice-minutes.service';

// Call provider selection (for telephony: exotel or plivo)
const CALL_PROVIDER = process.env.CALL_PROVIDER || process.env.VOICE_PROVIDER || 'exotel';
console.log(`[OutboundCall] Call provider: ${CALL_PROVIDER}, Exotel configured: ${exotelService.isConfigured()}`);

const prisma = new PrismaClient();

// Transfer trigger keywords
const DEFAULT_TRANSFER_KEYWORDS = [
  'speak to human',
  'talk to someone',
  'real person',
  'human agent',
  'live agent',
  'customer service',
  'representative',
  'transfer me',
  'speak to agent',
  'connect me to',
  'I want to talk to a person',
  // Hindi transfer keywords
  'insaan se baat',
  'kisi insaan se',
  'agent se',
  'customer care',
];

// Language configuration - Comprehensive Indian language support
const LANGUAGE_CONFIG: Record<string, {
  speechLanguage: string;
  ttsVoice: string;
  ttsVoiceFemale: string;
  ttsVoiceMale: string;
  displayName: string;
  region?: string;
}> = {
  // English variants
  'en': {
    speechLanguage: 'en-US',
    ttsVoice: 'Polly.Joanna',
    ttsVoiceFemale: 'Polly.Joanna',
    ttsVoiceMale: 'Polly.Matthew',
    displayName: 'English (US)',
  },
  'en-US': {
    speechLanguage: 'en-US',
    ttsVoice: 'Polly.Joanna',
    ttsVoiceFemale: 'Polly.Joanna',
    ttsVoiceMale: 'Polly.Matthew',
    displayName: 'English (US)',
  },
  'en-IN': {
    speechLanguage: 'en-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'English (India)',
    region: 'ALL',
  },
  // Hindi
  'hi': {
    speechLanguage: 'hi-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Hindi',
    region: 'NORTH',
  },
  'hi-IN': {
    speechLanguage: 'hi-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Hindi',
    region: 'NORTH',
  },
  // Telugu - Andhra Pradesh, Telangana
  'te': {
    speechLanguage: 'te-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Telugu',
    region: 'SOUTH',
  },
  'te-IN': {
    speechLanguage: 'te-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Telugu',
    region: 'SOUTH',
  },
  // Tamil - Tamil Nadu
  'ta': {
    speechLanguage: 'ta-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Tamil',
    region: 'SOUTH',
  },
  'ta-IN': {
    speechLanguage: 'ta-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Tamil',
    region: 'SOUTH',
  },
  // Kannada - Karnataka
  'kn': {
    speechLanguage: 'kn-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Kannada',
    region: 'SOUTH',
  },
  'kn-IN': {
    speechLanguage: 'kn-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Kannada',
    region: 'SOUTH',
  },
  // Malayalam - Kerala
  'ml': {
    speechLanguage: 'ml-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Malayalam',
    region: 'SOUTH',
  },
  'ml-IN': {
    speechLanguage: 'ml-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Malayalam',
    region: 'SOUTH',
  },
  // Marathi - Maharashtra
  'mr': {
    speechLanguage: 'mr-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Marathi',
    region: 'WEST',
  },
  'mr-IN': {
    speechLanguage: 'mr-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Marathi',
    region: 'WEST',
  },
  // Bengali - West Bengal
  'bn': {
    speechLanguage: 'bn-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Bengali',
    region: 'EAST',
  },
  'bn-IN': {
    speechLanguage: 'bn-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Bengali',
    region: 'EAST',
  },
  // Gujarati - Gujarat
  'gu': {
    speechLanguage: 'gu-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Gujarati',
    region: 'WEST',
  },
  'gu-IN': {
    speechLanguage: 'gu-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Gujarati',
    region: 'WEST',
  },
  // Punjabi - Punjab
  'pa': {
    speechLanguage: 'pa-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Punjabi',
    region: 'NORTH',
  },
  'pa-IN': {
    speechLanguage: 'pa-IN',
    ttsVoice: 'Polly.Aditi',
    ttsVoiceFemale: 'Polly.Aditi',
    ttsVoiceMale: 'Polly.Aditi',
    displayName: 'Punjabi',
    region: 'NORTH',
  },
};

// Indian state to language/region mapping for auto-detection
const INDIA_STATE_LANGUAGE_MAP: Record<string, { language: string; region: string }> = {
  // North India
  'delhi': { language: 'hi-IN', region: 'NORTH' },
  'uttar pradesh': { language: 'hi-IN', region: 'NORTH' },
  'haryana': { language: 'hi-IN', region: 'NORTH' },
  'rajasthan': { language: 'hi-IN', region: 'NORTH' },
  'madhya pradesh': { language: 'hi-IN', region: 'NORTH' },
  'chhattisgarh': { language: 'hi-IN', region: 'NORTH' },
  'uttarakhand': { language: 'hi-IN', region: 'NORTH' },
  'himachal pradesh': { language: 'hi-IN', region: 'NORTH' },
  'bihar': { language: 'hi-IN', region: 'NORTH' },
  'jharkhand': { language: 'hi-IN', region: 'NORTH' },
  'punjab': { language: 'pa-IN', region: 'NORTH' },
  // South India
  'andhra pradesh': { language: 'te-IN', region: 'SOUTH' },
  'telangana': { language: 'te-IN', region: 'SOUTH' },
  'tamil nadu': { language: 'ta-IN', region: 'SOUTH' },
  'karnataka': { language: 'kn-IN', region: 'SOUTH' },
  'kerala': { language: 'ml-IN', region: 'SOUTH' },
  // West India
  'maharashtra': { language: 'mr-IN', region: 'WEST' },
  'gujarat': { language: 'gu-IN', region: 'WEST' },
  'goa': { language: 'en-IN', region: 'WEST' },
  // East India
  'west bengal': { language: 'bn-IN', region: 'EAST' },
  'odisha': { language: 'en-IN', region: 'EAST' },
  'assam': { language: 'en-IN', region: 'EAST' },
  // Default
  'default': { language: 'en-IN', region: 'ALL' },
};

// India phone prefix to state mapping (based on mobile number series)
const INDIA_PHONE_PREFIX_MAP: Record<string, string> = {
  // Delhi NCR
  '911': 'delhi', '981': 'delhi', '982': 'delhi', '999': 'delhi',
  // Maharashtra
  '912': 'maharashtra', '982': 'maharashtra', '983': 'maharashtra', '902': 'maharashtra',
  // Karnataka
  '918': 'karnataka', '974': 'karnataka', '984': 'karnataka',
  // Tamil Nadu
  '914': 'tamil nadu', '944': 'tamil nadu', '984': 'tamil nadu',
  // Telangana/AP
  '914': 'telangana', '900': 'telangana', '994': 'telangana',
  // West Bengal
  '913': 'west bengal', '983': 'west bengal', '900': 'west bengal',
  // Gujarat
  '912': 'gujarat', '942': 'gujarat', '990': 'gujarat',
  // Punjab
  '917': 'punjab', '981': 'punjab', '988': 'punjab',
  // Kerala
  '914': 'kerala', '944': 'kerala', '994': 'kerala',
};

// Get language config with fallback
const getLanguageConfigByState = (state?: string): { language: string; config: typeof LANGUAGE_CONFIG['en'] } => {
  if (state) {
    const stateKey = state.toLowerCase().trim();
    const mapping = INDIA_STATE_LANGUAGE_MAP[stateKey] || INDIA_STATE_LANGUAGE_MAP['default'];
    const config = LANGUAGE_CONFIG[mapping.language] || LANGUAGE_CONFIG['en-IN'];
    return { language: mapping.language, config };
  }
  return { language: 'en-IN', config: LANGUAGE_CONFIG['en-IN'] };
};

// Get language from phone number (India)
const getLanguageFromPhone = (phone: string): { language: string; state?: string } => {
  // Remove +91 or 91 prefix
  const cleanPhone = phone.replace(/^\+?91/, '');

  // Check first 3 digits
  const prefix = cleanPhone.substring(0, 3);
  const state = INDIA_PHONE_PREFIX_MAP[prefix];

  if (state) {
    const mapping = INDIA_STATE_LANGUAGE_MAP[state];
    return { language: mapping.language, state };
  }

  return { language: 'en-IN' };
};

// Get language config with fallback
const getLanguageConfig = (language: string = 'en') => {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['en'];
};

// Voice provider selection based on config
const getVoiceProvider = (): 'exotel' | 'plivo' => {
  return (process.env.VOICE_PROVIDER as 'exotel' | 'plivo') || 'exotel';
};

// Initialize OpenAI (optional)
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Helper to generate ExoML (Exotel's TwiML equivalent)
const generateExoML = (content: string): string => {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`;
};

// Helper function to replace placeholders in agent prompts with organization settings
const replacePlaceholders = (text: string, orgSettings: any): string => {
  if (!text || !orgSettings?.institution) return text;

  const institution = orgSettings.institution;

  return text
    .replace(/\{\{INSTITUTION_NAME\}\}/g, institution.name || 'Our Institution')
    .replace(/\{\{INSTITUTION_LOCATION\}\}/g, institution.location || '')
    .replace(/\{\{INSTITUTION_WEBSITE\}\}/g, institution.website || '')
    .replace(/\{\{INSTITUTION_DESCRIPTION\}\}/g, institution.description || '')
    .replace(/\{\{INSTITUTION_COURSES\}\}/g, institution.courses || '')
    .replace(/\{\{INSTITUTION_PHONE\}\}/g, institution.phone || '')
    .replace(/\{\{INSTITUTION_EMAIL\}\}/g, institution.email || '');
};

class OutboundCallService {
  // ==================== CAMPAIGN MANAGEMENT ====================

  async createCampaign(data: {
    organizationId: string;
    agentId: string;
    name: string;
    description?: string;
    contacts: Array<{ phone: string; name?: string; email?: string; leadId?: string; customData?: any }>;
    settings?: {
      maxConcurrentCalls?: number;
      callsBetweenHours?: { start: number; end: number };
      retryAttempts?: number;
      retryDelayMinutes?: number;
    };
    scheduledAt?: Date;
    callingMode?: 'AUTOMATIC' | 'MANUAL';
  }) {
    // Verify agent exists
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: data.agentId },
    });

    if (!agent) {
      throw new Error('Voice agent not found');
    }

    // Create campaign
    const campaign = await prisma.outboundCallCampaign.create({
      data: {
        organizationId: data.organizationId,
        agentId: data.agentId,
        name: data.name,
        description: data.description,
        totalContacts: data.contacts.length,
        callingMode: data.callingMode || 'AUTOMATIC',
        maxConcurrentCalls: data.settings?.maxConcurrentCalls || 1,
        callsBetweenHours: data.settings?.callsBetweenHours || { start: 9, end: 18 },
        retryAttempts: data.settings?.retryAttempts || 2,
        retryDelayMinutes: data.settings?.retryDelayMinutes || 30,
        scheduledAt: data.scheduledAt,
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
    });

    // Add contacts
    await prisma.outboundCallContact.createMany({
      data: data.contacts.map(contact => ({
        campaignId: campaign.id,
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        leadId: contact.leadId,
        customData: contact.customData || {},
      })),
    });

    return campaign;
  }

  async getCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.findUnique({
      where: { id: campaignId },
      include: {
        agent: true,
        _count: {
          select: {
            contacts: true,
            calls: true,
          },
        },
      },
    });
  }

  async listCampaigns(organizationId: string) {
    // Get campaigns directly by organizationId
    return prisma.outboundCallCampaign.findMany({
      where: {
        organizationId,
      },
      include: {
        agent: {
          select: { id: true, name: true, industry: true },
        },
        _count: {
          select: { contacts: true, calls: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async startCampaign(campaignId: string) {
    const campaign = await prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'RUNNING',
        startedAt: new Date(),
      },
      include: {
        agent: true,
      },
    });

    // Only auto-process calls for AUTOMATIC mode
    // MANUAL mode requires user to trigger each call via the queue
    if (campaign.callingMode === 'AUTOMATIC') {
      this.processCampaignCalls(campaignId).catch(console.error);
    }

    return campaign;
  }

  async pauseCampaign(campaignId: string) {
    return prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' },
    });
  }

  async resumeCampaign(campaignId: string) {
    const campaign = await prisma.outboundCallCampaign.update({
      where: { id: campaignId },
      data: { status: 'RUNNING' },
    });

    this.processCampaignCalls(campaignId).catch(console.error);

    return campaign;
  }

  // Process campaign calls
  private async processCampaignCalls(campaignId: string) {
    const campaign = await prisma.outboundCallCampaign.findUnique({
      where: { id: campaignId },
      include: { agent: true },
    });

    if (!campaign || campaign.status !== 'RUNNING') {
      return;
    }

    // Get pending contacts
    const pendingContacts = await prisma.outboundCallContact.findMany({
      where: {
        campaignId,
        status: { in: ['PENDING', 'SCHEDULED'] },
        OR: [
          { nextAttemptAt: null },
          { nextAttemptAt: { lte: new Date() } },
        ],
      },
      take: campaign.maxConcurrentCalls,
    });

    if (pendingContacts.length === 0) {
      // Check if all contacts are processed
      const remainingContacts = await prisma.outboundCallContact.count({
        where: {
          campaignId,
          status: { in: ['PENDING', 'SCHEDULED', 'IN_PROGRESS'] },
        },
      });

      if (remainingContacts === 0) {
        await prisma.outboundCallCampaign.update({
          where: { id: campaignId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });
      }
      return;
    }

    // Check if within calling hours
    const hours = campaign.callsBetweenHours as { start: number; end: number };
    const currentHour = new Date().getHours();
    if (currentHour < hours.start || currentHour >= hours.end) {
      // Schedule next check at start of calling hours
      setTimeout(() => this.processCampaignCalls(campaignId), 60000);
      return;
    }

    // Make calls
    for (const contact of pendingContacts) {
      try {
        await this.makeCall({
          agentId: campaign.agentId,
          phone: contact.phone,
          contactId: contact.id,
          campaignId: campaign.id,
          leadId: contact.leadId || undefined,
          contactName: contact.name || undefined,
          customData: contact.customData as any,
        });
      } catch (error) {
        console.error(`Failed to call ${contact.phone}:`, error);
        await prisma.outboundCallContact.update({
          where: { id: contact.id },
          data: {
            status: 'FAILED',
            attempts: { increment: 1 },
            lastAttemptAt: new Date(),
          },
        });
      }
    }

    // Schedule next batch
    setTimeout(() => this.processCampaignCalls(campaignId), 5000);
  }

  // ==================== INBOUND CALL MANAGEMENT ====================

  async handleIncomingCall(data: {
    CallSid: string;
    From: string;
    To: string;
    CallerName?: string;
  }): Promise<{ callId: string; twiml: string }> {
    // Find the default agent for this organization (based on the To number)
    // For now, find the first active agent - can be enhanced with number-to-agent mapping
    const agent = await prisma.voiceAgent.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    if (!agent) {
      // No agent found - return error ExoML
      const exoml = generateExoML(
        `<Say voice="Polly.Joanna">We're sorry, our system is currently unavailable. Please try again later.</Say><Hangup/>`
      );
      return { callId: '', twiml: exoml };
    }

    const conversationId = uuidv4();

    // Try to find existing lead by phone number
    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: agent.organizationId,
        phone: data.From,
      },
    });

    // Create inbound call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: agent.id,
        phoneNumber: data.From,
        twilioCallSid: data.CallSid,
        conversationId,
        status: 'IN_PROGRESS',
        direction: 'INBOUND',
        startedAt: new Date(),
        answeredAt: new Date(),
        leadId: existingLead?.id,
      },
    });

    // Generate TwiML for inbound call
    const twiml = await this.generateInboundTwiML(call.id, agent, data.CallerName);

    return { callId: call.id, twiml };
  }

  // Generate ExoML for inbound calls
  private async generateInboundTwiML(callId: string, agent: any, callerName?: string): Promise<string> {
    const baseUrl = config.baseUrl;

    // Personalized greeting if we know the caller
    let greeting = agent.greeting || "Hello! Thank you for calling. How can I help you today?";
    if (callerName) {
      greeting = `Hello ${callerName}! Thank you for calling. How can I help you today?`;
    }

    // Initialize transcript
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript: [
          { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
        ],
      },
    });

    // Generate ExoML with speech gathering
    const exoml = generateExoML(`
      <Gather input="speech" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
        <Say voice="Polly.Joanna">${greeting}</Say>
      </Gather>
      <Say voice="Polly.Joanna">I didn't catch that. Could you please repeat?</Say>
      <Redirect>${baseUrl}/api/outbound-calls/inbound/continue/${callId}</Redirect>
    `);

    return exoml;
  }

  // Continue inbound call after timeout
  async continueInboundCall(callId: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      return generateExoML(`<Say voice="Polly.Joanna">We're sorry, an error occurred. Goodbye.</Say><Hangup/>`);
    }

    const baseUrl = config.baseUrl;

    return generateExoML(`
      <Gather input="speech" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
        <Say voice="Polly.Joanna">Are you still there? How can I help you?</Say>
      </Gather>
      <Say voice="Polly.Joanna">I haven't heard from you. Thank you for calling. Goodbye!</Say>
      <Hangup/>
    `);
  }

  // ==================== SINGLE CALL MANAGEMENT ====================

  async makeCall(data: {
    agentId: string;
    phone: string;
    campaignId?: string;
    contactId?: string;
    leadId?: string;
    contactName?: string;
    customData?: any;
  }) {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: data.agentId },
      include: {
        organization: {
          select: { id: true, name: true, settings: true }
        }
      }
    });

    if (!agent) {
      throw new Error('Voice agent not found');
    }

    // Check voice minutes availability before making call
    if (agent.organization?.id) {
      const usageCheck = await voiceMinutesService.checkUsage(agent.organization.id);
      if (!usageCheck.allowed) {
        throw new Error(usageCheck.reason || 'Insufficient voice minutes to make this call');
      }
    }

    // Replace placeholders in agent with organization settings
    const orgSettings = (agent.organization?.settings as any) || {};
    agent.systemPrompt = replacePlaceholders(agent.systemPrompt, orgSettings);
    agent.greeting = agent.greeting ? replacePlaceholders(agent.greeting, orgSettings) : agent.greeting;
    agent.endMessage = agent.endMessage ? replacePlaceholders(agent.endMessage, orgSettings) : agent.endMessage;
    agent.fallbackMessage = agent.fallbackMessage ? replacePlaceholders(agent.fallbackMessage, orgSettings) : agent.fallbackMessage;

    // Replace placeholders in questions
    if (agent.questions && Array.isArray(agent.questions)) {
      agent.questions = (agent.questions as any[]).map(q => ({
        ...q,
        question: replacePlaceholders(q.question, orgSettings)
      }));
    }

    const conversationId = uuidv4();

    // Create call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: data.agentId,
        phoneNumber: data.phone,
        campaignId: data.campaignId,
        contactId: data.contactId,
        leadId: data.leadId,
        conversationId,
        status: 'INITIATED',
        direction: 'OUTBOUND',
      },
    });

    // Update contact status if from campaign
    if (data.contactId) {
      await prisma.outboundCallContact.update({
        where: { id: data.contactId },
        data: {
          status: 'IN_PROGRESS',
          attempts: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
    }

    try {
      // Base URL for webhooks
      const baseUrl = config.baseUrl;

      // Select provider based on configuration
      if (CALL_PROVIDER === 'exotel' && exotelService.isConfigured()) {
        // Use Exotel for India calling with passthru URL
        const exotelResult = await exotelService.makeCall({
          to: data.phone,
          customField: JSON.stringify({ callId: call.id, conversationId, phone: data.phone }),
          callbackUrl: `${baseUrl}/api/exotel/passthru`,  // Generic passthru endpoint
          statusCallback: `${baseUrl}/api/exotel/webhook/status`,
          timeLimit: 600,
          timeOut: 30,
          record: true,  // Enable call recording
          recordingFormat: 'mp3',
        });

        if (exotelResult.success) {
          await prisma.outboundCall.update({
            where: { id: call.id },
            data: {
              twilioCallSid: exotelResult.callSid, // Reusing field for Exotel SID
              status: 'QUEUED',
            },
          });

          return {
            callId: call.id,
            exotelSid: exotelResult.callSid,
            conversationId,
            status: 'QUEUED',
            provider: 'exotel',
          };
        } else {
          throw new Error(exotelResult.error || 'Exotel call failed');
        }
      } else {
        // Exotel not configured
        throw new Error('Exotel is not configured. Please set EXOTEL_ACCOUNT_SID, EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_CALLER_ID environment variables.');
      }
    } catch (error) {
      // Update call as failed
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: { status: 'FAILED' },
      });

      if (data.contactId) {
        await prisma.outboundCallContact.update({
          where: { id: data.contactId },
          data: { status: 'FAILED' },
        });
      }

      throw error;
    }
  }

  // Generate ExoML for the call
  async generateTwiML(callId: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      throw new Error('Call not found');
    }

    const baseUrl = config.baseUrl;
    const langConfig = getLanguageConfig(call.agent.language || 'en');

    // Check if consent has been given - if not, ask for consent first
    if (call.consentGiven === null && call.direction === 'OUTBOUND') {
      const consentMessage = "This call may be recorded for quality and training purposes. Press 1 or say yes to continue, or press 2 or say no to opt out.";

      await prisma.outboundCall.update({
        where: { id: callId },
        data: { consentAskedAt: new Date() },
      });

      return generateExoML(`
        <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/consent/${callId}" method="POST" numDigits="1" timeout="10">
          <Say voice="${langConfig.ttsVoice}">${consentMessage}</Say>
        </Gather>
        <Redirect>${baseUrl}/api/outbound-calls/webhook/consent/${callId}?defaultConsent=true</Redirect>
      `);
    }

    // If consent was explicitly denied, end the call
    if (call.consentGiven === false) {
      const declineMessage = call.agent.language?.startsWith('hi')
        ? "Aapka faisla ka samman karte hain. Dhanyavaad. Alvida."
        : "We respect your decision. Thank you for your time. Goodbye.";
      return generateExoML(`<Say voice="${langConfig.ttsVoice}">${declineMessage}</Say><Hangup/>`);
    }

    // Consent given or inbound call - proceed with greeting
    const defaultGreeting = call.agent.language?.startsWith('hi')
      ? "Namaste! Main aapki organization ki taraf se call kar raha hoon. Kya aapke paas kuch samay hai?"
      : "Hello! I'm calling on behalf of our organization. Do you have a moment to speak?";
    const greeting = call.agent.greeting || defaultGreeting;

    // Get the first question from agent's questions array
    const questions = call.agent.questions as any[] || [];
    const defaultFirstQuestion = call.agent.language?.startsWith('hi')
      ? "Main aapki kaise madad kar sakta hoon?"
      : 'How can I help you today?';
    const firstQuestion = questions.length > 0
      ? questions[0].question
      : defaultFirstQuestion;

    // Initialize transcript with greeting
    const currentTranscript = (call.transcript as any[]) || [];
    if (currentTranscript.length === 0) {
      await prisma.outboundCall.update({
        where: { id: callId },
        data: {
          transcript: [
            { role: 'assistant', content: greeting, timestamp: new Date().toISOString() },
            { role: 'assistant', content: firstQuestion, timestamp: new Date().toISOString() },
          ],
          language: langConfig.speechLanguage,
        },
      });
    }

    const retryMessage = call.agent.language?.startsWith('hi')
      ? "Mujhe samajh nahi aaya. Kripya dobara bataiye."
      : "I didn't catch that. Let me try again.";

    return generateExoML(`
      <Say voice="${langConfig.ttsVoice}">${greeting}</Say>
      <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/speech/${call.id}" method="POST" timeout="5">
        <Say voice="${langConfig.ttsVoice}">${firstQuestion}</Say>
      </Gather>
      <Say voice="${langConfig.ttsVoice}">${retryMessage}</Say>
      <Redirect>${baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>
    `);
  }

  // Handle speech input from Gather (supports barge-in via speech or DTMF)
  async handleSpeechInput(callId: string, speechResult: string, dtmfDigits?: string): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) {
      throw new Error('Call not found');
    }

    // Handle DTMF input (keypad interruption)
    let userInput = speechResult;
    if (dtmfDigits && !speechResult) {
      // User pressed keys instead of speaking - handle special cases
      switch (dtmfDigits) {
        case '0':
          userInput = 'I want to speak to a human agent';
          break;
        case '9':
          userInput = 'Please repeat that';
          break;
        case '*':
          userInput = 'Go back to the previous question';
          break;
        case '#':
          userInput = 'Skip this question';
          break;
        default:
          userInput = `[User pressed: ${dtmfDigits}]`;
      }
    }

    // Get current transcript
    const transcript = (call.transcript as any[]) || [];
    transcript.push({
      role: 'user',
      content: userInput,
      timestamp: new Date().toISOString(),
      interruptedAI: !!dtmfDigits || (speechResult && speechResult.length < 20), // Short input likely means interruption
    });

    // Check if caller wants to be transferred to human agent
    const transferCheck = await this.checkShouldTransfer(speechResult, transcript, call.agentId);
    if (transferCheck.shouldTransfer) {
      // Update transcript before transfer
      await prisma.outboundCall.update({
        where: { id: callId },
        data: { transcript },
      });
      return this.generateTransferTwiML(callId, transferCheck.config);
    }

    // Get AI response
    const messages: any[] = [
      {
        role: 'system',
        content: this.buildCallSystemPrompt(call.agent),
      },
    ];

    // Add conversation history
    for (const t of transcript) {
      messages.push({
        role: t.role,
        content: t.content,
      });
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: call.agent.temperature,
      max_tokens: 300,
    });

    const aiResponse = completion.choices[0]?.message?.content ||
      call.agent.fallbackMessage ||
      "I'm sorry, could you please repeat that?";

    // Add AI response to transcript
    transcript.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    });

    // Extract qualification data
    const qualification = await this.extractQualification(speechResult, call.agent);

    // Update call with new transcript and qualification
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        transcript,
        qualification: {
          ...(call.qualification as object || {}),
          ...qualification,
        },
      },
    });

    // Check if call should end
    const shouldEnd = this.checkShouldEnd(aiResponse, transcript);

    // Get language configuration
    const langConfig = getLanguageConfig(call.agent.language || 'en');
    const baseUrl = config.baseUrl;

    if (shouldEnd) {
      const defaultEndMessage = call.agent.language?.startsWith('hi')
        ? 'Aapke samay ke liye dhanyavaad. Alvida!'
        : 'Thank you for your time. Goodbye!';
      return generateExoML(`
        <Say voice="${langConfig.ttsVoice}">${aiResponse}</Say>
        <Say voice="${langConfig.ttsVoice}">${call.agent.endMessage || defaultEndMessage}</Say>
        <Hangup/>
      `);
    } else {
      const stillThereMessage = call.agent.language?.startsWith('hi')
        ? 'Mujhe kuch sunai nahi diya. Kya aap abhi bhi hain?'
        : "I didn't hear anything. Are you still there?";
      return generateExoML(`
        <Gather input="speech dtmf" action="${baseUrl}/api/outbound-calls/webhook/speech/${callId}" method="POST" timeout="5">
          <Say voice="${langConfig.ttsVoice}">${aiResponse}</Say>
        </Gather>
        <Say voice="${langConfig.ttsVoice}">${stillThereMessage}</Say>
        <Redirect>${baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>
      `);
    }
  }

  // Build system prompt for phone calls
  private buildCallSystemPrompt(agent: any): string {
    const questions = agent.questions as any[] || [];
    const isHindi = agent.language?.startsWith('hi');

    let prompt = `You are an AI voice assistant making an outbound phone call. ${agent.systemPrompt}

IMPORTANT PHONE CALL GUIDELINES:
- Keep responses SHORT and conversational (1-2 sentences max)
- Speak naturally as if on a phone call
- Don't use bullet points or lists - speak in sentences
- If the person says they're busy, offer to call back
- If they're not interested, thank them politely and end the call
${isHindi ? `
LANGUAGE INSTRUCTION:
- You MUST respond in Hindi (Hinglish is acceptable)
- Use Roman script Hindi (e.g., "Namaste, main aapki madad kaise kar sakta hoon?")
- Be polite and use respectful Hindi terms (aap, ji, etc.)
- If the user speaks in English, you can respond in a mix of Hindi and English
` : ''}
CRITICAL - YOU MUST ASK THESE QUESTIONS ONE BY ONE:
You MUST proactively ask the following questions during the conversation. Ask them naturally, one at a time, and wait for answers before moving to the next question.
`;

    // Add questions to collect with numbered order
    if (questions.length > 0) {
      prompt += '\n';
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        prompt += `${i + 1}. ASK: "${q.question}" (to collect: ${q.field}${q.required ? ' - REQUIRED' : ' - optional'})\n`;
      }
      prompt += `
After greeting, start by asking Question 1, then proceed through each question.
When you receive an answer, acknowledge it briefly and ask the next question.
Keep track of which questions have been answered and make sure to ask all REQUIRED questions.
If the person provides information before you ask, acknowledge it and skip that question.
`;
    }

    // Add FAQs
    if (agent.faqs && (agent.faqs as any[]).length > 0) {
      prompt += '\n\nIf they ask questions, use these answers:\n';
      for (const faq of agent.faqs as any[]) {
        prompt += `Q: ${faq.question}\nA: ${faq.answer}\n`;
      }
    }

    return prompt;
  }

  // Extract qualification data
  private async extractQualification(userMessage: string, agent: any): Promise<any> {
    const questions = agent.questions as any[];
    if (!questions || questions.length === 0) {
      console.info(`[OutboundCall] extractQualification: No questions configured for agent: ${agent.id}`);
      return {};
    }

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
  private checkShouldEnd(response: string, transcript: any[]): boolean {
    const endIndicators = [
      'goodbye',
      'thank you for your time',
      'have a great day',
      'not interested',
      'call back later',
      'end the call',
    ];

    const lowerResponse = response.toLowerCase();
    if (endIndicators.some(indicator => lowerResponse.includes(indicator))) {
      return true;
    }

    // End after 10 exchanges
    if (transcript.length >= 20) {
      return true;
    }

    return false;
  }

  // Check if call should be transferred to human agent
  private async checkShouldTransfer(
    userMessage: string,
    transcript: any[],
    agentId: string
  ): Promise<{ shouldTransfer: boolean; config?: any }> {
    const lowerMessage = userMessage.toLowerCase();

    // Get transfer config for this agent
    const transferConfig = await prisma.transferConfig.findFirst({
      where: {
        OR: [
          { agentId: agentId },
          { agentId: null }, // Organization-wide config
        ],
        isActive: true,
      },
      orderBy: { agentId: 'desc' }, // Prefer agent-specific config
    });

    if (!transferConfig) {
      // Check default keywords if no config
      const hasTransferKeyword = DEFAULT_TRANSFER_KEYWORDS.some(keyword =>
        lowerMessage.includes(keyword.toLowerCase())
      );
      return { shouldTransfer: hasTransferKeyword };
    }

    // Check trigger keywords from config
    const triggerKeywords = (transferConfig.triggerKeywords as string[]) || DEFAULT_TRANSFER_KEYWORDS;
    const hasTransferKeyword = triggerKeywords.some(keyword =>
      lowerMessage.includes(keyword.toLowerCase())
    );

    if (hasTransferKeyword) {
      return { shouldTransfer: true, config: transferConfig };
    }

    // Check max AI turns
    if (transferConfig.maxAITurns) {
      const userTurns = transcript.filter(t => t.role === 'user').length;
      if (userTurns >= transferConfig.maxAITurns) {
        return { shouldTransfer: true, config: transferConfig };
      }
    }

    // Check negative sentiment trigger
    if (transferConfig.triggerSentiment === 'negative') {
      const sentiment = await this.analyzeSentiment(transcript);
      if (sentiment === 'negative') {
        return { shouldTransfer: true, config: transferConfig };
      }
    }

    return { shouldTransfer: false };
  }

  // Generate ExoML for transferring to human agent
  private async generateTransferTwiML(callId: string, transferConfig: any): Promise<string> {
    const transferMessage = transferConfig?.transferMessage ||
      "Please hold while I transfer you to a live agent.";
    const transferType = transferConfig?.transferType || 'PHONE';
    const transferTo = transferConfig?.transferTo;

    let exomlContent = `<Say voice="Polly.Joanna">${transferMessage}</Say>`;

    if (!transferTo) {
      // No transfer destination configured - leave voicemail or end
      if (transferConfig?.voicemailEnabled) {
        exomlContent += `
          <Say voice="Polly.Joanna">I'm sorry, no agents are currently available. Please leave a message after the beep.</Say>
          <Record maxLength="120" playBeep="true"/>
        `;
      } else {
        const fallbackMsg = transferConfig?.fallbackMessage ||
          "I'm sorry, no agents are currently available. We'll call you back soon.";
        exomlContent += `<Say voice="Polly.Joanna">${fallbackMsg}</Say>`;
      }
      exomlContent += '<Hangup/>';
    } else {
      // Transfer to configured destination
      switch (transferType) {
        case 'PHONE':
          exomlContent += `
            <Dial callerId="${config.exotel.callerId}" timeout="30" action="${config.baseUrl}/api/outbound-calls/webhook/transfer-status/${callId}">
              <Number>${transferTo}</Number>
            </Dial>
          `;
          break;

        case 'SIP':
          exomlContent += `
            <Dial timeout="30" action="${config.baseUrl}/api/outbound-calls/webhook/transfer-status/${callId}">
              <Sip>${transferTo}</Sip>
            </Dial>
          `;
          break;

        case 'QUEUE':
          exomlContent += `<Enqueue>${transferTo}</Enqueue>`;
          break;

        case 'VOICEMAIL':
          exomlContent += `
            <Say voice="Polly.Joanna">Please leave a message after the beep.</Say>
            <Record maxLength="120" playBeep="true"/>
            <Hangup/>
          `;
          break;
      }
    }

    // Update call status to transferred
    await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        outcome: 'CALLBACK_REQUESTED',
        outcomeNotes: `Transferred to human agent: ${transferTo || 'voicemail'}`,
      },
    });

    // Add to telecaller queue if transfer destination is configured
    if (transferTo && transferType === 'PHONE') {
      const call = await prisma.outboundCall.findUnique({
        where: { id: callId },
        include: { agent: true },
      });

      if (call) {
        await prisma.telecallerQueue.create({
          data: {
            organizationId: call.agent?.organizationId || '',
            leadId: call.leadId,
            outboundCallId: call.id,
            phoneNumber: call.phoneNumber,
            contactName: undefined,
            aiCallSummary: call.summary,
            aiCallSentiment: call.sentiment,
            aiCallOutcome: call.outcome,
            aiCallDuration: call.duration,
            qualification: call.qualification || {},
            priority: 1, // High priority for live transfers
            status: 'PENDING',
            reason: 'Customer requested human agent',
          },
        });
      }
    }

    return generateExoML(exomlContent);
  }

  // Handle transfer status callback
  async handleTransferStatus(callId: string, data: { DialCallStatus: string; DialCallDuration?: string }) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
    });

    if (!call) return;

    const notes = call.outcomeNotes || '';
    let newNotes = notes;

    switch (data.DialCallStatus) {
      case 'completed':
        newNotes = `${notes} - Transfer successful, duration: ${data.DialCallDuration}s`;
        break;
      case 'busy':
      case 'no-answer':
      case 'failed':
        newNotes = `${notes} - Transfer failed: ${data.DialCallStatus}`;
        break;
    }

    await prisma.outboundCall.update({
      where: { id: callId },
      data: { outcomeNotes: newNotes },
    });
  }

  // Handle consent response
  async handleConsentResponse(callId: string, data: {
    Digits?: string;
    SpeechResult?: string;
    defaultConsent?: boolean;
  }): Promise<string> {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
    });

    if (!call) {
      return generateExoML(`<Say voice="Polly.Joanna">An error occurred. Goodbye.</Say><Hangup/>`);
    }

    // Determine consent based on input
    let consentGiven = false;

    if (data.defaultConsent) {
      // No response - assume consent
      consentGiven = true;
    } else if (data.Digits) {
      // DTMF input: 1 = yes, 2 = no
      consentGiven = data.Digits === '1';
    } else if (data.SpeechResult) {
      // Speech input
      const speech = data.SpeechResult.toLowerCase();
      const yesIndicators = ['yes', 'yeah', 'yep', 'okay', 'ok', 'sure', 'continue', 'proceed', 'go ahead', 'fine'];
      const noIndicators = ['no', 'nope', 'don\'t', 'stop', 'opt out', 'hang up', 'end'];

      if (yesIndicators.some(y => speech.includes(y))) {
        consentGiven = true;
      } else if (noIndicators.some(n => speech.includes(n))) {
        consentGiven = false;
      } else {
        // Unclear response - assume consent to continue
        consentGiven = true;
      }
    } else {
      // No input at all - assume consent
      consentGiven = true;
    }

    // Update consent status
    await prisma.outboundCall.update({
      where: { id: callId },
      data: { consentGiven },
    });

    // If consent denied, add to DNC list
    if (!consentGiven) {
      const call = await prisma.outboundCall.findUnique({
        where: { id: callId },
        include: { agent: true },
      });

      if (call?.agent?.organizationId) {
        await prisma.doNotCallList.upsert({
          where: {
            organizationId_phoneNumber: {
              organizationId: call.agent.organizationId,
              phoneNumber: call.phoneNumber,
            },
          },
          create: {
            organizationId: call.agent.organizationId,
            phoneNumber: call.phoneNumber,
            reason: 'CUSTOMER_REQUEST',
            notes: 'Opted out during call consent',
          },
          update: {
            reason: 'CUSTOMER_REQUEST',
            notes: 'Opted out during call consent',
          },
        });
      }
    }

    // Redirect to continue the call (will check consent status)
    return generateExoML(`<Redirect>${config.baseUrl}/api/outbound-calls/twiml/${callId}</Redirect>`);
  }

  // ==================== WEBHOOK HANDLERS ====================

  async handleStatusCallback(data: {
    CallSid: string;
    CallStatus: string;
    CallDuration?: string;
    AnsweredBy?: string;
  }) {
    const statusMap: Record<string, OutboundCallStatus> = {
      'initiated': 'INITIATED',
      'queued': 'QUEUED',
      'ringing': 'RINGING',
      'in-progress': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'busy': 'BUSY',
      'no-answer': 'NO_ANSWER',
      'failed': 'FAILED',
      'canceled': 'CANCELLED',
    };

    const call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: data.CallSid },
      include: {
        agent: {
          select: { organizationId: true },
        },
      },
    });

    if (!call) {
      console.error('Call not found for SID:', data.CallSid);
      return;
    }

    const status = statusMap[data.CallStatus] || 'FAILED';
    const updateData: any = { status };

    if (data.CallStatus === 'ringing') {
      updateData.startedAt = new Date();
    } else if (data.CallStatus === 'in-progress') {
      updateData.answeredAt = new Date();
    } else if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(data.CallStatus)) {
      updateData.endedAt = new Date();
      if (data.CallDuration) {
        updateData.duration = parseInt(data.CallDuration);
      }

      // Determine outcome based on status
      if (data.CallStatus === 'completed') {
        updateData.outcome = 'NEEDS_FOLLOWUP';
      } else if (data.CallStatus === 'busy') {
        updateData.outcome = 'BUSY';
      } else if (data.CallStatus === 'no-answer') {
        updateData.outcome = 'NO_ANSWER';
      }

      // Handle voicemail/machine detection
      if (data.AnsweredBy === 'machine_end_beep' || data.AnsweredBy === 'machine_start') {
        updateData.outcome = 'VOICEMAIL';
      }
    }

    const updatedCall = await prisma.outboundCall.update({
      where: { id: call.id },
      data: updateData,
    });

    // Update contact status if from campaign
    if (call.contactId) {
      const contactStatus = ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'].includes(status as string)
        ? 'COMPLETED'
        : 'IN_PROGRESS';

      await prisma.outboundCallContact.update({
        where: { id: call.contactId },
        data: { status: contactStatus as OutboundContactStatus },
      });
    }

    // Update campaign stats if completed
    if (call.campaignId && ['COMPLETED', 'BUSY', 'NO_ANSWER', 'FAILED'].includes(status as string)) {
      const incrementField = status === 'COMPLETED' ? 'successfulCalls' : 'failedCalls';
      await prisma.outboundCallCampaign.update({
        where: { id: call.campaignId },
        data: {
          completedCalls: { increment: 1 },
          [incrementField]: { increment: 1 },
        },
      });
    }

    // Record voice minutes usage when call ends
    if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(data.CallStatus) && data.CallDuration) {
      const durationMinutes = parseInt(data.CallDuration) / 60;
      if (durationMinutes > 0 && call.agent?.organizationId) {
        try {
          await voiceMinutesService.recordUsage(
            call.agent.organizationId,
            null, // userId not available in webhook
            durationMinutes
          );
        } catch (error) {
          console.error('[VoiceMinutes] Failed to record usage:', error);
        }
      }
    }

    // Generate summary and lead if call completed
    if (status === 'COMPLETED' && updatedCall.transcript) {
      await this.finalizeCall(call.id);
    }

    return updatedCall;
  }

  async handleRecordingCallback(data: {
    CallSid: string;
    RecordingSid: string;
    RecordingUrl: string;
    RecordingDuration: string;
  }) {
    const call = await prisma.outboundCall.findFirst({
      where: { twilioCallSid: data.CallSid },
    });

    if (!call) {
      console.error('Call not found for recording SID:', data.CallSid);
      return;
    }

    return prisma.outboundCall.update({
      where: { id: call.id },
      data: {
        recordingSid: data.RecordingSid,
        recordingUrl: data.RecordingUrl + '.mp3',
        recordingDuration: parseInt(data.RecordingDuration),
      },
    });
  }

  // Finalize call - generate summary and create lead
  private async finalizeCall(callId: string) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) return;

    const transcript = call.transcript as any[];
    if (!transcript || transcript.length === 0) return;

    // Generate summary
    const summary = await this.generateSummary(transcript);

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(transcript);

    // Determine outcome from conversation
    const outcome = await this.determineOutcome(transcript);

    // Update call
    const updatedCall = await prisma.outboundCall.update({
      where: { id: callId },
      data: {
        summary,
        sentiment,
        outcome,
      },
      include: { agent: true },
    });

    // Check if this call was for a RawImportRecord
    await this.updateRawImportRecordFromCall(updatedCall);

    // If call was made to an existing lead, update the lead's tabs
    if (call.leadId) {
      await this.updateExistingLeadWithCallData(call.leadId, updatedCall);
    } else {
      // Create lead if qualified
      const qualification = call.qualification as any;
      if (qualification && Object.keys(qualification).length > 0) {
        await this.createLeadFromCall(updatedCall, qualification);
      }
    }
  }

  // Update RawImportRecord based on call outcome
  private async updateRawImportRecordFromCall(call: any) {
    try {
      // Find raw import record by phone number and agent organization
      const rawRecord = await prisma.rawImportRecord.findFirst({
        where: {
          phone: call.phoneNumber,
          organizationId: call.agent?.organizationId,
          status: { in: ['ASSIGNED', 'CALLING'] },
          assignedAgentId: call.agentId,
        },
      });

      if (!rawRecord) {
        return; // Not a raw import record call
      }

      // Map call outcome to raw import status
      let newStatus: 'INTERESTED' | 'NOT_INTERESTED' | 'NO_ANSWER' | 'CALLBACK_REQUESTED' | 'CALLING' = 'CALLING';

      switch (call.outcome) {
        case 'INTERESTED':
          newStatus = 'INTERESTED';
          break;
        case 'NOT_INTERESTED':
          newStatus = 'NOT_INTERESTED';
          break;
        case 'NO_ANSWER':
          newStatus = 'NO_ANSWER';
          break;
        case 'CALLBACK_REQUESTED':
        case 'NEEDS_FOLLOWUP':
          newStatus = 'CALLBACK_REQUESTED';
          break;
        default:
          // If call completed but outcome unclear, check sentiment
          if (call.sentiment === 'positive') {
            newStatus = 'INTERESTED';
          } else if (call.sentiment === 'negative') {
            newStatus = 'NOT_INTERESTED';
          }
      }

      // Update the raw import record
      const updatedRecord = await prisma.rawImportRecord.update({
        where: { id: rawRecord.id },
        data: {
          status: newStatus,
          lastCallAt: new Date(),
          callAttempts: { increment: 1 },
          outboundCallId: call.id,
          callSummary: call.summary,
          callSentiment: call.sentiment,
          interestLevel: call.sentiment === 'positive' ? 'high' :
                         call.sentiment === 'negative' ? 'low' : 'medium',
        },
      });

      console.log(`[OutboundCall] Updated raw import record ${rawRecord.id} status to ${newStatus}`);

      // If interested, auto-convert to lead
      if (newStatus === 'INTERESTED' && call.agent?.organizationId) {
        try {
          const lead = await prisma.lead.create({
            data: {
              organizationId: call.agent.organizationId,
              firstName: rawRecord.firstName,
              lastName: rawRecord.lastName,
              email: rawRecord.email,
              phone: rawRecord.phone,
              alternatePhone: rawRecord.alternatePhone,
              source: 'BULK_UPLOAD',
              sourceDetails: 'Converted from AI call - Interested',
              priority: 'HIGH',
              customFields: rawRecord.customFields || {},
            },
          });

          // Update record as converted
          await prisma.rawImportRecord.update({
            where: { id: rawRecord.id },
            data: {
              status: 'CONVERTED',
              convertedLeadId: lead.id,
              convertedAt: new Date(),
            },
          });

          // Update bulk import converted count
          await prisma.bulkImport.update({
            where: { id: rawRecord.bulkImportId },
            data: {
              convertedCount: { increment: 1 },
            },
          });

          // Create note on the lead
          await prisma.leadNote.create({
            data: {
              leadId: lead.id,
              userId: call.agent.organizationId, // Use org as system user
              content: `**Auto-converted from AI Call**\n\n${call.summary || 'Contact expressed interest during AI call.'}`,
              isPinned: true,
            },
          });

          console.log(`[OutboundCall] Auto-converted raw import record ${rawRecord.id} to lead ${lead.id}`);
        } catch (error) {
          console.error('Error auto-converting raw import to lead:', error);
        }
      }
    } catch (error) {
      console.error('Error updating raw import record from call:', error);
    }
  }

  // Update existing lead with AI call data
  private async updateExistingLeadWithCallData(leadId: string, call: any) {
    try {
      // Create call log entry
      await prisma.callLog.create({
        data: {
          leadId,
          callerId: call.agent?.organizationId || call.agentId,
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'AI',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript ? JSON.stringify(call.transcript) : null,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Create note with AI call summary
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId,
            content: `**AI Call Summary**\n\n${call.summary}\n\n**Sentiment:** ${call.sentiment || 'neutral'}\n**Outcome:** ${call.outcome || 'NEEDS_FOLLOWUP'}`,
            isPinned: true,
          },
        });
      }

      // Create activity for the AI call
      await prisma.leadActivity.create({
        data: {
          leadId,
          type: 'CALL_MADE',
          title: 'AI Outbound Call Completed',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          metadata: {
            callId: call.id,
            agentName: call.agent?.name,
            outcome: call.outcome,
            sentiment: call.sentiment,
            recordingUrl: call.recordingUrl,
          },
        },
      });

      // Create follow-up if needed
      if (call.outcome === 'CALLBACK_REQUESTED' || call.outcome === 'NEEDS_FOLLOWUP' || call.outcome === 'INTERESTED') {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + (call.outcome === 'CALLBACK_REQUESTED' ? 1 : 3));

        await prisma.followUp.create({
          data: {
            leadId,
            scheduledAt,
            message: call.outcome === 'CALLBACK_REQUESTED'
              ? 'Lead requested a callback during AI call'
              : `Follow up on AI call - ${call.outcome}`,
            notes: call.summary,
            status: 'UPCOMING',
          },
        });
      }

      // Update lead's custom fields with any qualification data
      if (call.qualification && Object.keys(call.qualification).length > 0) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        const existingFields = (lead?.customFields as object) || {};

        await prisma.lead.update({
          where: { id: leadId },
          data: {
            customFields: { ...existingFields, ...call.qualification },
          },
        });
      }

      console.log(`Updated existing lead ${leadId} with AI call data`);
    } catch (error) {
      console.error('Error updating lead with call data:', error);
    }
  }

  private async generateSummary(transcript: any[]): Promise<string> {
    try {
      const text = transcript
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize this phone call in 2-3 sentences. Focus on key points and outcomes.',
          },
          {
            role: 'user',
            content: text,
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

  private async analyzeSentiment(transcript: any[]): Promise<string> {
    try {
      const userMessages = transcript
        .filter((t: any) => t.role === 'user')
        .map((t: any) => t.content)
        .join(' ');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Analyze the sentiment. Reply with only: positive, neutral, or negative.',
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

  private async determineOutcome(transcript: any[]): Promise<CallOutcome> {
    try {
      const text = transcript
        .map((t: any) => `${t.role}: ${t.content}`)
        .join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Based on this phone call, determine the outcome. Reply with only one of:
INTERESTED, NOT_INTERESTED, CALLBACK_REQUESTED, NEEDS_FOLLOWUP, CONVERTED`,
          },
          {
            role: 'user',
            content: text,
          },
        ],
        temperature: 0,
        max_tokens: 20,
      });

      const result = completion.choices[0]?.message?.content?.toUpperCase().trim();
      const validOutcomes: CallOutcome[] = ['INTERESTED', 'NOT_INTERESTED', 'CALLBACK_REQUESTED', 'NEEDS_FOLLOWUP', 'CONVERTED'];

      if (validOutcomes.includes(result as CallOutcome)) {
        return result as CallOutcome;
      }
      return 'NEEDS_FOLLOWUP';
    } catch (error) {
      return 'NEEDS_FOLLOWUP';
    }
  }

  private async createLeadFromCall(call: any, qualification: any) {
    try {
      const leadData: any = {
        organizationId: call.agent.organizationId,
        firstName: qualification.firstName || qualification.name || 'Call Lead',
        phone: call.phoneNumber,
        email: qualification.email,
        source: 'CHATBOT',
        sourceDetails: `Outbound Call - ${call.agent.name}`,
        customFields: qualification,
      };

      const lead = await prisma.lead.create({
        data: leadData,
      });

      // Update call with lead reference
      await prisma.outboundCall.update({
        where: { id: call.id },
        data: {
          leadGenerated: true,
          generatedLeadId: lead.id,
        },
      });

      // Create call log entry for the lead
      await prisma.callLog.create({
        data: {
          leadId: lead.id,
          callerId: call.agent.organizationId, // Use org ID as caller
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'AI',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript ? JSON.stringify(call.transcript) : null,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Create note with AI call summary
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            content: `**AI Call Summary**\n\n${call.summary}\n\n**Sentiment:** ${call.sentiment || 'neutral'}\n**Outcome:** ${call.outcome || 'NEEDS_FOLLOWUP'}`,
            isPinned: true,
          },
        });
      }

      // Create activity for the AI call
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'CALL_MADE',
          title: 'AI Outbound Call Completed',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          metadata: {
            callId: call.id,
            agentName: call.agent.name,
            outcome: call.outcome,
            sentiment: call.sentiment,
            recordingUrl: call.recordingUrl,
          },
        },
      });

      // Create follow-up if callback requested or needs follow-up
      if (call.outcome === 'CALLBACK_REQUESTED' || call.outcome === 'NEEDS_FOLLOWUP' || call.outcome === 'INTERESTED') {
        const scheduledAt = new Date();
        scheduledAt.setDate(scheduledAt.getDate() + (call.outcome === 'CALLBACK_REQUESTED' ? 1 : 3));

        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            scheduledAt,
            message: call.outcome === 'CALLBACK_REQUESTED'
              ? 'Lead requested a callback during AI call'
              : `Follow up on AI call - ${call.outcome}`,
            notes: call.summary,
            status: 'UPCOMING',
          },
        });
      }

      // Update campaign stats
      if (call.campaignId) {
        await prisma.outboundCallCampaign.update({
          where: { id: call.campaignId },
          data: {
            leadsGenerated: { increment: 1 },
          },
        });
      }

      console.log(`Lead created from AI call: ${lead.id} with notes, activity, and call log`);
      return lead;
    } catch (error) {
      console.error('Error creating lead from call:', error);
    }
  }

  // ==================== CALL QUERIES ====================

  async getCall(callId: string) {
    return prisma.outboundCall.findUnique({
      where: { id: callId },
      include: {
        agent: true,
        campaign: true,
        contact: true,
      },
    });
  }

  async listCalls(filters: {
    organizationId?: string;
    agentId?: string;
    campaignId?: string;
    status?: OutboundCallStatus;
    outcome?: CallOutcome;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters.agentId) {
      where.agentId = filters.agentId;
    }
    if (filters.campaignId) {
      where.campaignId = filters.campaignId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.outcome) {
      where.outcome = filters.outcome;
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo;
      }
    }
    if (filters.organizationId) {
      where.agent = { organizationId: filters.organizationId };
    }

    const [calls, total] = await Promise.all([
      prisma.outboundCall.findMany({
        where,
        include: {
          agent: { select: { id: true, name: true, industry: true } },
          campaign: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      prisma.outboundCall.count({ where }),
    ]);

    return { calls, total };
  }

  // Get call analytics
  async getCallAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: startDate },
      },
      select: {
        status: true,
        outcome: true,
        duration: true,
        sentiment: true,
        leadGenerated: true,
      },
    });

    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status === 'COMPLETED').length;
    const answeredCalls = calls.filter(c => c.duration && c.duration > 0).length;
    const leadsGenerated = calls.filter(c => c.leadGenerated).length;
    const avgDuration = calls.reduce((acc, c) => acc + (c.duration || 0), 0) / answeredCalls || 0;

    const outcomeBreakdown: Record<string, number> = {};
    for (const call of calls) {
      if (call.outcome) {
        outcomeBreakdown[call.outcome] = (outcomeBreakdown[call.outcome] || 0) + 1;
      }
    }

    const sentimentBreakdown = {
      positive: calls.filter(c => c.sentiment === 'positive').length,
      neutral: calls.filter(c => c.sentiment === 'neutral').length,
      negative: calls.filter(c => c.sentiment === 'negative').length,
    };

    return {
      totalCalls,
      completedCalls,
      answeredCalls,
      answerRate: totalCalls ? ((answeredCalls / totalCalls) * 100).toFixed(1) : 0,
      leadsGenerated,
      conversionRate: answeredCalls ? ((leadsGenerated / answeredCalls) * 100).toFixed(1) : 0,
      avgDuration: Math.round(avgDuration),
      outcomeBreakdown,
      sentimentBreakdown,
    };
  }
}

export const outboundCallService = new OutboundCallService();
