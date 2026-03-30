/**
 * Edit Template Page Types
 */

export interface Question {
  id: string;
  question: string;
  field: string;
  required: boolean;
  type?: string;
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface TemplateDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  description: string;
  keywords: string[];
}

export interface TemplateFormData {
  name: string;
  description: string;
  industry: string;
  category: string;
  systemPrompt: string;
  knowledgeBase: string;
  questions: Question[];
  faqs: FAQ[];
  documents: TemplateDocument[];
  greeting: string;
  greetings: Record<string, string>;
  fallbackMessage: string;
  transferMessage: string;
  endMessage: string;
  afterHoursMessage: string;
  language: string;
  voiceId: string;
  temperature: number;
  personality: string;
  responseSpeed: string;
  maxDuration: number;
  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingDays: string[];
  autoCreateLeads: boolean;
  deduplicateByPhone: boolean;
  appointmentEnabled: boolean;
  appointmentType: string;
  appointmentDuration: number;
}

export const initialFormData: TemplateFormData = {
  name: '',
  description: '',
  industry: 'EDUCATION',
  category: '',
  systemPrompt: '',
  knowledgeBase: '',
  questions: [],
  faqs: [],
  documents: [],
  greeting: '',
  greetings: {},
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
};
