import type { IndustryDetail, VoiceOption, LanguageOption, LLMOption, Variable } from '../types/voiceAgent.types';

export const industryDetails: Record<string, IndustryDetail> = {
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

export const voiceOptions: VoiceOption[] = [
  // ElevenLabs Premium Voices
  { id: 'elevenlabs-21m00Tcm4TlvDq8ikWAM', name: 'Rachel', description: 'Calm, warm - American', region: 'elevenlabs', gender: 'female', recommended: true, provider: 'elevenlabs', language: 'en-US', premium: true, testText: 'Hello! I am Rachel, your AI assistant. How can I help you today?' },
  { id: 'elevenlabs-EXAVITQu4vr4xnSDxMaL', name: 'Bella', description: 'Soft, young - American', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-XB0fDUnXU5powFXDhCwa', name: 'Charlotte', description: 'Elegant - British', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-ThT5KcBeYPX3keUQqHPh', name: 'Dorothy', description: 'Pleasant - British', region: 'elevenlabs', gender: 'female', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-pNInz6obpgDQGcFmaJgB', name: 'Adam', description: 'Deep narrator - American', region: 'elevenlabs', gender: 'male', recommended: true, provider: 'elevenlabs', language: 'en-US', premium: true, testText: 'Hello! I am Adam, your AI assistant. How may I assist you?' },
  { id: 'elevenlabs-TxGEqnHWrfWFTfGW9XjX', name: 'Josh', description: 'Young, dynamic - American', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-onwK4e9ZLuTAKqWW03F9', name: 'Daniel', description: 'Authoritative - British', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-GB', premium: true },
  { id: 'elevenlabs-IKne3meq5aSn9XLyUdCD', name: 'Charlie', description: 'Casual - Australian', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-AU', premium: true },
  { id: 'elevenlabs-ZQe5CZNOzWyzPSCn5a3c', name: 'James', description: 'Calm, mature - Australian', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-AU', premium: true },
  { id: 'elevenlabs-GBv7mTt0atIp3Br8iCZE', name: 'Thomas', description: 'Calm, meditation - American', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-US', premium: true },
  { id: 'elevenlabs-Yko7PKHZNXotIFUBG7I9', name: 'Matthew', description: 'Audiobook narrator - British', region: 'elevenlabs', gender: 'male', provider: 'elevenlabs', language: 'en-GB', premium: true },
  // Custom Cloned Voices
  { id: 'elevenlabs_qf2cb4kpdw9Zfp2UNLcR', name: 'My Custom Voice', description: 'Custom Cloned Voice', region: 'custom', gender: 'male', recommended: true, provider: 'elevenlabs', language: 'te-IN', testText: 'Namaskaram! Nenu mee AI sahaayakudini.' },
  // Sarvam AI Voices (Indian Languages)
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
  // OpenAI Voices (Indian)
  { id: 'openai-nova', name: 'Ananya', description: 'English - Friendly', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-shimmer', name: 'Lakshmi', description: 'English - Warm', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-alloy', name: 'Shreya', description: 'English - Clear', region: 'india', gender: 'female', provider: 'openai', language: 'en-IN' },
  { id: 'openai-echo', name: 'Raj', description: 'English - Conversational', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'openai-onyx', name: 'Vikram', description: 'English - Professional', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  { id: 'openai-fable', name: 'Kiran', description: 'English - Engaging', region: 'india', gender: 'male', provider: 'openai', language: 'en-IN' },
  // OpenAI Voices (International)
  { id: 'openai-nova-intl', name: 'Nova', description: 'Friendly, upbeat', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'openai-shimmer-intl', name: 'Shimmer', description: 'Soft, gentle', region: 'international', gender: 'female', provider: 'openai', language: 'en-US' },
  { id: 'openai-alloy-intl', name: 'Alloy', description: 'Neutral, balanced', region: 'international', gender: 'neutral', provider: 'openai', language: 'en-US' },
  { id: 'openai-echo-intl', name: 'Echo', description: 'Warm, conversational', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'openai-onyx-intl', name: 'Onyx', description: 'Deep, authoritative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
  { id: 'openai-fable-intl', name: 'Fable', description: 'Expressive, narrative', region: 'international', gender: 'male', provider: 'openai', language: 'en-US' },
];

export const languageOptions: LanguageOption[] = [
  { id: 'en-IN', name: 'English (India)', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'hi-IN', name: 'Hindi', flag: '🇮🇳', countryCode: 'IN', popular: true, greetingTemplate: 'Namaste! Main aapki kya madad kar sakta hoon?' },
  { id: 'te-IN', name: 'Telugu', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskaram! Nenu mee ki ela sahaayam cheyagalanu?' },
  { id: 'ta-IN', name: 'Tamil', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Vanakkam! Ungalukku eppadi udhavi seiya mudiyum?' },
  { id: 'kn-IN', name: 'Kannada', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskara! Naanu nimge hege sahaaya maadaballe?' },
  { id: 'ml-IN', name: 'Malayalam', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskkaram! Ninakku njan engane sahaayikkum?' },
  { id: 'mr-IN', name: 'Marathi', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Mi tumhala kashi madad karu shakto?' },
  { id: 'bn-IN', name: 'Bengali', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Ami apnake ki bhabe sahajya korte pari?' },
  { id: 'gu-IN', name: 'Gujarati', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Namaskar! Hu tamne kem madad kari saku?' },
  { id: 'pa-IN', name: 'Punjabi', flag: '🇮🇳', countryCode: 'IN', greetingTemplate: 'Sat sri akaal! Main tuhadi ki madad kar sakda haan?' },
  { id: 'en-US', name: 'English (US)', flag: '🇺🇸', countryCode: 'US', greetingTemplate: 'Hello! How can I help you today?' },
  { id: 'auto', name: 'Auto-detect', flag: '🌐', countryCode: 'globe', greetingTemplate: 'Hello! How can I help you today?' },
];

export const llmOptions: LLMOption[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast & Cost-effective', provider: 'OpenAI' },
  { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable, best reasoning', provider: 'OpenAI' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'High performance, faster', provider: 'OpenAI' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast & efficient', provider: 'Google' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku', description: 'Quick & concise', provider: 'Anthropic' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Balanced performance', provider: 'Anthropic' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', description: 'Most intelligent', provider: 'Anthropic' },
];

export const availableVariables: Variable[] = [
  { key: 'firstName', label: 'First Name', example: 'John' },
  { key: 'lastName', label: 'Last Name', example: 'Doe' },
  { key: 'phone', label: 'Phone', example: '+1234567890' },
  { key: 'email', label: 'Email', example: 'john@example.com' },
  { key: 'company', label: 'Company', example: 'Acme Inc' },
  { key: 'INSTITUTION_NAME', label: 'Institution Name', example: 'VoiceBridge' },
  { key: 'INSTITUTION_PHONE', label: 'Institution Phone', example: '+1800123456' },
];

export const defaultFormData = {
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
  documents: [] as any[],
  useCustomVoice: false,
  customVoiceName: '',
  personality: 'professional' as const,
  responseSpeed: 'normal' as const,
  creativity: 0.7,
  interruptHandling: 'polite' as const,
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  afterHoursMessage: "Thank you for calling. Our office is currently closed. Please call back during business hours or leave a message.",
  maxCallDuration: 10,
  silenceTimeout: 30,
  recordCalls: true,
  autoCreateLeads: true,
  deduplicateByPhone: true,
  defaultStageId: '',
  defaultAssigneeId: '',
  appointmentEnabled: false,
  appointmentType: 'consultation',
  appointmentDuration: 30,
  crmIntegration: 'internal' as const,
  triggerWebhookOnLead: true,
  callFlowId: '',
};

export const defaultIntegrations = {
  calendar: {
    enabled: false,
    provider: 'google' as const,
    connected: false,
    calendarId: '',
    bufferTime: 15,
    workingHours: { start: '09:00', end: '18:00' },
  },
  crm: {
    enabled: false,
    provider: 'internal' as const,
    connected: false,
    autoCreateLead: true,
    autoUpdateStatus: true,
    fieldMapping: {} as Record<string, string>,
  },
  payment: {
    enabled: false,
    provider: 'razorpay' as const,
    connected: false,
    currency: 'INR',
    collectDuringCall: false,
  },
  customApi: {
    enabled: false,
    endpoints: [] as any[],
  },
};

export const defaultFunctions = [
  { id: '1', name: 'Book Appointment', description: 'Schedule appointments with leads', type: 'book_appointment' as const, enabled: true, config: {} },
  { id: '2', name: 'Transfer Call', description: 'Transfer to human agent when needed', type: 'transfer_call' as const, enabled: true, config: {} },
  { id: '3', name: 'Send SMS', description: 'Send confirmation or follow-up SMS', type: 'send_sms' as const, enabled: false, config: {} },
  { id: '4', name: 'Lookup CRM', description: 'Fetch lead details from CRM', type: 'lookup_crm' as const, enabled: false, config: {} },
  { id: '5', name: 'End Call', description: 'Gracefully end the conversation', type: 'end_call' as const, enabled: true, config: {} },
];
