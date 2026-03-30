/**
 * Edit Template Page Constants
 */

import {
  DocumentTextIcon,
  QuestionMarkCircleIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  SpeakerWaveIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

export const FIELD_OPTIONS = [
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

export const LANGUAGE_OPTIONS = [
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

export const VOICE_OPTIONS = [
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

export const INDUSTRY_OPTIONS = [
  { value: 'EDUCATION', label: 'Education', icon: '🎓' },
  { value: 'IT_RECRUITMENT', label: 'IT Recruitment', icon: '💼' },
  { value: 'REAL_ESTATE', label: 'Real Estate', icon: '🏠' },
  { value: 'CUSTOMER_CARE', label: 'Customer Care', icon: '📞' },
  { value: 'HEALTHCARE', label: 'Healthcare', icon: '🏥' },
  { value: 'FINANCE', label: 'Finance', icon: '💰' },
  { value: 'ECOMMERCE', label: 'E-commerce', icon: '🛒' },
  { value: 'CUSTOM', label: 'Custom', icon: '⚙️' },
];

export const TEMPLATE_TABS = [
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
