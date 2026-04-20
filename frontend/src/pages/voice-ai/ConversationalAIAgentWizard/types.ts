/**
 * Conversational AI Agent Creation Wizard Types
 */

export type AgentType = 'blank' | 'personal' | 'business';

export interface Industry {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface UseCase {
  id: string;
  name: string;
  icon: string;
  industryId: string;
  description?: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  category?: string;
  accent?: string;
  gender?: 'male' | 'female' | 'neutral';
  age?: string;
  preview_url?: string;
  isPrimary?: boolean;
}

export interface Language {
  code: string;
  name: string;
  flag: string;
}

export interface LLMOption {
  id: string;
  name: string;
  provider: string;
  description?: string;
}

export interface KnowledgeBaseItem {
  id: string;
  type: 'file' | 'url' | 'text';
  name: string;
  content?: string;
  url?: string;
  status: 'pending' | 'processing' | 'ready' | 'error';
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface PhoneNumberOption {
  id: string;
  number: string;
  displayNumber: string;
  friendlyName?: string;
  provider: string;
  status: string;
}

export interface AgentFormData {
  // Step 1
  agentType: AgentType;

  // Step 2
  industry: string;

  // Step 3
  useCase: string;

  // Step 4
  knowledgeBase: KnowledgeBaseItem[];
  tools: Tool[];

  // Step 5
  name: string;
  website?: string;
  mainGoal: string;
  chatOnly: boolean;
  phoneNumberId?: string; // Selected phone number for outbound calls

  // Agent Config
  systemPrompt: string;
  firstMessage: string;

  // Voice & Language
  primaryVoice: Voice | null;
  additionalVoices: Voice[];
  language: string;
  additionalLanguages: string[];

  // LLM
  llm: string;

  // Settings
  interruptible: boolean;
  defaultPersonality: boolean;
  timezone?: string;
}

export interface WizardStep {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  current: boolean;
}

export const INDUSTRIES: Industry[] = [
  { id: 'retail', name: 'Retail & E-commerce', icon: '🛒' },
  { id: 'healthcare', name: 'Healthcare & Medical', icon: '🏥' },
  { id: 'finance', name: 'Finance & Banking', icon: '🏦' },
  { id: 'real_estate', name: 'Real Estate', icon: '🏠' },
  { id: 'education', name: 'Education & Training', icon: '🎓' },
  { id: 'hospitality', name: 'Hospitality & Travel', icon: '✈️' },
  { id: 'automotive', name: 'Automotive', icon: '🚗' },
  { id: 'professional', name: 'Professional Services', icon: '💼' },
  { id: 'technology', name: 'Technology & Software', icon: '💻' },
  { id: 'government', name: 'Government & Public', icon: '🏛️' },
  { id: 'food', name: 'Food & Beverage', icon: '🍽️' },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭' },
  { id: 'fitness', name: 'Fitness & Wellness', icon: '💪' },
  { id: 'legal', name: 'Legal Services', icon: '⚖️' },
  { id: 'nonprofit', name: 'Non-Profit', icon: '🤝' },
  { id: 'media', name: 'Media & Entertainment', icon: '🎬' },
  { id: 'other', name: 'Other', icon: '❓' },
];

export const USE_CASES: Record<string, UseCase[]> = {
  education: [
    { id: 'customer_support', name: 'Customer Support', icon: '🎧', industryId: 'education' },
    { id: 'outbound_sales', name: 'Outbound Sales', icon: '📈', industryId: 'education' },
    { id: 'learning_dev', name: 'Learning and Development', icon: '📚', industryId: 'education' },
    { id: 'scheduling', name: 'Scheduling', icon: '📅', industryId: 'education' },
    { id: 'lead_qualification', name: 'Lead Qualification', icon: '👥', industryId: 'education' },
    { id: 'answering_service', name: 'Answering Service', icon: '📞', industryId: 'education' },
    { id: 'student_enrollment', name: 'Student Enrollment', icon: '📝', industryId: 'education' },
    { id: 'course_recommendations', name: 'Course Recommendations', icon: '📖', industryId: 'education' },
    { id: 'tutoring_support', name: 'Tutoring Support', icon: '👨‍🏫', industryId: 'education' },
    { id: 'campus_information', name: 'Campus Information', icon: '📍', industryId: 'education' },
    { id: 'career_guidance', name: 'Career Guidance', icon: '🎯', industryId: 'education' },
    { id: 'learning_companion', name: 'Learning Companion', icon: '🤖', industryId: 'education' },
    { id: 'other', name: 'Other', icon: '❓', industryId: 'education' },
  ],
  real_estate: [
    { id: 'customer_support', name: 'Customer Support', icon: '🎧', industryId: 'real_estate' },
    { id: 'outbound_sales', name: 'Outbound Sales', icon: '📈', industryId: 'real_estate' },
    { id: 'lead_qualification', name: 'Lead Qualification', icon: '👥', industryId: 'real_estate' },
    { id: 'scheduling', name: 'Scheduling', icon: '📅', industryId: 'real_estate' },
    { id: 'property_inquiry', name: 'Property Inquiry', icon: '🏠', industryId: 'real_estate' },
    { id: 'site_visit_booking', name: 'Site Visit Booking', icon: '📍', industryId: 'real_estate' },
    { id: 'other', name: 'Other', icon: '❓', industryId: 'real_estate' },
  ],
  healthcare: [
    { id: 'customer_support', name: 'Customer Support', icon: '🎧', industryId: 'healthcare' },
    { id: 'appointment_booking', name: 'Appointment Booking', icon: '📅', industryId: 'healthcare' },
    { id: 'patient_intake', name: 'Patient Intake', icon: '📝', industryId: 'healthcare' },
    { id: 'prescription_refill', name: 'Prescription Refill', icon: '💊', industryId: 'healthcare' },
    { id: 'health_inquiry', name: 'Health Inquiry', icon: '❤️', industryId: 'healthcare' },
    { id: 'other', name: 'Other', icon: '❓', industryId: 'healthcare' },
  ],
  // Default use cases for other industries
  default: [
    { id: 'customer_support', name: 'Customer Support', icon: '🎧', industryId: 'default' },
    { id: 'outbound_sales', name: 'Outbound Sales', icon: '📈', industryId: 'default' },
    { id: 'lead_qualification', name: 'Lead Qualification', icon: '👥', industryId: 'default' },
    { id: 'scheduling', name: 'Scheduling', icon: '📅', industryId: 'default' },
    { id: 'answering_service', name: 'Answering Service', icon: '📞', industryId: 'default' },
    { id: 'other', name: 'Other', icon: '❓', industryId: 'default' },
  ],
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'bg', name: 'Bulgarian', flag: '🇧🇬' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'hr', name: 'Croatian', flag: '🇭🇷' },
  { code: 'cs', name: 'Czech', flag: '🇨🇿' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'fi', name: 'Finnish', flag: '🇫🇮' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'el', name: 'Greek', flag: '🇬🇷' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'te', name: 'Telugu', flag: '🇮🇳' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];

export const LLM_OPTIONS: LLMOption[] = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', description: 'Fast and efficient' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', description: 'Most capable' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', description: 'Fast & cost-effective' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable, best reasoning' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', description: 'Quick & concise' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', description: 'Balanced performance' },
];

export const INITIAL_FORM_DATA: AgentFormData = {
  agentType: 'business',
  industry: '',
  useCase: '',
  knowledgeBase: [],
  tools: [],
  name: '',
  website: '',
  mainGoal: '',
  chatOnly: false,
  phoneNumberId: '',
  systemPrompt: '',
  firstMessage: '',
  primaryVoice: null,
  additionalVoices: [],
  language: 'en',
  additionalLanguages: [],
  llm: 'gemini-2.5-flash',
  interruptible: true,
  defaultPersonality: true,
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};
