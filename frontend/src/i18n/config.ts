export interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en-IN', name: 'English (India)', nativeName: 'English', direction: 'ltr' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr' },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr' },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', direction: 'ltr' },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', direction: 'ltr' },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', direction: 'ltr' },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr' },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr' },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', direction: 'ltr' },
];

export const NAMESPACES = [
  'common',
  'auth',
  'navigation',
  'dashboard',
  'leads',
  'forms',
  'validation',
  'notifications',
  'voiceAi',
  'subscription',
] as const;

export type Namespace = (typeof NAMESPACES)[number];

export const DEFAULT_LANGUAGE = 'en-IN';
export const LANGUAGE_STORAGE_KEY = 'crm_language';

export const getLanguageByCode = (code: string): Language | undefined => {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code);
};

export const isValidLanguage = (code: string): boolean => {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code);
};
