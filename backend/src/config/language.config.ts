/**
 * Language Configuration - India-focused voice AI settings
 * Single Responsibility: Language/region mappings and TTS configuration
 */

export interface LanguageConfigEntry {
  speechLanguage: string;
  ttsVoice: string;
  ttsVoiceFemale: string;
  ttsVoiceMale: string;
  displayName: string;
  region?: string;
}

// Language configuration - Comprehensive Indian language support
export const LANGUAGE_CONFIG: Record<string, LanguageConfigEntry> = {
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
export const INDIA_STATE_LANGUAGE_MAP: Record<string, { language: string; region: string }> = {
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
export const INDIA_PHONE_PREFIX_MAP: Record<string, string> = {
  // Delhi NCR
  '911': 'delhi', '981': 'delhi', '982': 'delhi', '999': 'delhi',
  // Maharashtra
  '912': 'maharashtra', '983': 'maharashtra', '902': 'maharashtra',
  // Karnataka
  '918': 'karnataka', '974': 'karnataka', '984': 'karnataka',
  // Tamil Nadu
  '914': 'tamil nadu', '944': 'tamil nadu',
  // Telangana/AP
  '900': 'telangana', '940': 'telangana',
  // West Bengal
  '913': 'west bengal',
  // Gujarat
  '942': 'gujarat', '990': 'gujarat',
  // Punjab
  '917': 'punjab', '988': 'punjab',
  // Kerala
  '994': 'kerala', '949': 'kerala',
};

// Transfer trigger keywords
export const DEFAULT_TRANSFER_KEYWORDS = [
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

// Helper functions
export function getLanguageConfig(language: string = 'en'): LanguageConfigEntry {
  return LANGUAGE_CONFIG[language] || LANGUAGE_CONFIG['en'];
}

export function getLanguageConfigByState(state?: string): { language: string; config: LanguageConfigEntry } {
  if (state) {
    const stateKey = state.toLowerCase().trim();
    const mapping = INDIA_STATE_LANGUAGE_MAP[stateKey] || INDIA_STATE_LANGUAGE_MAP['default'];
    const config = LANGUAGE_CONFIG[mapping.language] || LANGUAGE_CONFIG['en-IN'];
    return { language: mapping.language, config };
  }
  return { language: 'en-IN', config: LANGUAGE_CONFIG['en-IN'] };
}

export function getLanguageFromPhone(phone: string): { language: string; state?: string } {
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
}

export function isHindiLanguage(language?: string): boolean {
  return language?.startsWith('hi') || false;
}

// Voice provider selection
export function getVoiceProvider(): 'exotel' | 'plivo' {
  return (process.env.VOICE_PROVIDER as 'exotel' | 'plivo') || 'exotel';
}

// ExoML helper
export function generateExoML(content: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${content}</Response>`;
}
