// Voice Agent Types

export interface Template {
  industry: string;
  name: string;
  description: string;
}

export interface IndustryDetail {
  icon: string;
  color: string;
  description: string;
  gradient: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  region: string;
  gender: string;
  provider: string;
  language: string;
  premium?: boolean;
  recommended?: boolean;
  testText?: string;
}

export interface LanguageOption {
  id: string;
  name: string;
  flag: string;
  countryCode: string;
  popular?: boolean;
  greetingTemplate: string;
}

export interface LLMOption {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export interface AgentDocument {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'video' | 'document';
  url: string;
  description: string;
  keywords: string[];
}

export interface AgentFunction {
  id: string;
  name: string;
  description: string;
  type: 'book_appointment' | 'transfer_call' | 'send_sms' | 'lookup_crm' | 'custom_webhook' | 'end_call';
  enabled: boolean;
  config: Record<string, any>;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface ConversationExample {
  id: string;
  title: string;
  conversation: { role: 'user' | 'assistant'; content: string }[];
}

export interface CallFlowOption {
  id: string;
  name: string;
  description?: string;
  _count?: { callLogs: number };
}

export interface CalendarIntegration {
  enabled: boolean;
  provider: 'google' | 'outlook' | 'calendly';
  connected: boolean;
  calendarId: string;
  bufferTime: number;
  workingHours: { start: string; end: string };
}

export interface CRMIntegration {
  enabled: boolean;
  provider: 'internal' | 'salesforce' | 'hubspot' | 'zoho' | 'pipedrive';
  connected: boolean;
  autoCreateLead: boolean;
  autoUpdateStatus: boolean;
  fieldMapping: Record<string, string>;
}

export interface PaymentIntegration {
  enabled: boolean;
  provider: 'razorpay' | 'stripe' | 'paypal';
  connected: boolean;
  currency: string;
  collectDuringCall: boolean;
}

export interface CustomApiEndpoint {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST';
  trigger: string;
}

export interface IntegrationsState {
  calendar: CalendarIntegration;
  crm: CRMIntegration;
  payment: PaymentIntegration;
  customApi: {
    enabled: boolean;
    endpoints: CustomApiEndpoint[];
  };
}

export interface AgentFormData {
  name: string;
  voiceId: string;
  voiceName: string;
  language: string;
  widgetColor: string;
  widgetTitle: string;
  widgetSubtitle: string;
  greeting: string;
  systemPrompt: string;
  questions: any[];
  documents: AgentDocument[];
  useCustomVoice: boolean;
  customVoiceName: string;
  // AI Behavior
  personality: 'professional' | 'friendly' | 'casual';
  responseSpeed: 'fast' | 'normal' | 'thoughtful';
  creativity: number;
  interruptHandling: 'wait' | 'polite';
  // Call Handling
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  afterHoursMessage: string;
  maxCallDuration: number;
  silenceTimeout: number;
  recordCalls: boolean;
  // Lead Generation
  autoCreateLeads: boolean;
  deduplicateByPhone: boolean;
  defaultStageId: string;
  defaultAssigneeId: string;
  // Appointment
  appointmentEnabled: boolean;
  appointmentType: string;
  appointmentDuration: number;
  // CRM
  crmIntegration: 'internal' | 'salesforce' | 'hubspot' | 'zoho' | 'custom';
  triggerWebhookOnLead: boolean;
  // Call Flow
  callFlowId: string;
}

export interface LLMSettings {
  backupConfig: 'default' | 'custom' | 'disabled';
  temperature: number;
  thinkingBudgetEnabled: boolean;
  thinkingBudget: number;
  tokenLimit: number;
}

export interface SelectedLLM {
  id: string;
  name: string;
  description: string;
  provider: string;
}

export interface Variable {
  key: string;
  label: string;
  example: string;
}
