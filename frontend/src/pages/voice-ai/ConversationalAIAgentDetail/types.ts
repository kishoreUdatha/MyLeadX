/**
 * Conversational AI Agent Detail Page Types
 */

// Call Flow Types - for workflow persistence
export interface CallFlowNode {
  id: string;
  type: 'START' | 'GREETING' | 'QUESTION' | 'CONDITION' | 'AI_RESPONSE' | 'ACTION' | 'TRANSFER' | 'END';
  position: { x: number; y: number };
  data: {
    label: string;
    message?: string;
    question?: string;
    variableName?: string;
    variableType?: 'text' | 'number' | 'email' | 'phone' | 'date' | 'boolean' | 'choice';
    choices?: string[];
    required?: boolean;
    validation?: string;
    condition?: {
      variable: string;
      operator: 'equals' | 'contains' | 'greater' | 'less' | 'exists' | 'not_exists';
      value: string;
    };
    actionType?: string;
    actionConfig?: Record<string, any>;
    transferNumber?: string;
    transferMessage?: string;
    outcomeType?: string;
    aiPrompt?: string;
    maxRetries?: number;
    retryMessage?: string;
  };
}

export interface CallFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
}

export interface CallFlow {
  id: string;
  name: string;
  description?: string;
  industry?: string;
  nodes: CallFlowNode[];
  edges: CallFlowEdge[];
  variables?: Array<{ name: string; type: string; defaultValue?: string }>;
  isTemplate: boolean;
  isActive: boolean;
  organizationId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export type CallDirectionType = 'INBOUND' | 'OUTBOUND' | 'HYBRID';
export type PublishStatusType = 'DRAFT' | 'PUBLISHED';

export interface AgentVersion {
  version: number;
  publishedAt: string;
  publishedBy?: string;
  description?: string;
}

export interface ConversationalAIAgent {
  id: string;
  name: string;
  industry: string;
  useCase: string;
  systemPrompt: string;
  greeting: string;
  voiceId: string;
  language: string;
  knowledgeBase: string | null;
  callDirection?: CallDirectionType; // INBOUND, OUTBOUND, or HYBRID
  // Publish status
  status?: PublishStatusType; // DRAFT or PUBLISHED
  publishedAt?: string;
  versionNumber?: number;
  versionHistory?: AgentVersion[];
  metadata: {
    conversationalAIAgentId?: string;
    conversationalAISyncedAt?: string;
    website?: string;
    mainGoal?: string;
    llm?: string;
    provider?: string;
    createdVia?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Voice {
  id: string;
  name: string;
  description: string;
  category: string;
  labels: Record<string, string>;
  preview_url?: string;
  accent?: string;
  gender?: string;
  age?: string;
  use_case?: string;
  provider?: 'sarvam' | 'ai4bharat' | 'elevenlabs' | 'openai';
}

export interface VoiceCategory {
  id: string;
  name: string;
  count: number;
}

export type TabId =
  | 'agent'
  | 'workflow'
  | 'branches'
  | 'knowledge-base'
  | 'analysis'
  | 'tools'
  | 'tests'
  | 'widget'
  | 'security'
  | 'advanced';

export interface Tab {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

export const TABS: Tab[] = [
  { id: 'agent', label: 'Agent' },
  { id: 'workflow', label: 'Workflow' },
  { id: 'branches', label: 'Branches' },
  { id: 'knowledge-base', label: 'Knowledge base' },
  { id: 'analysis', label: 'Analysis' },
  { id: 'tools', label: 'Tools' },
  { id: 'tests', label: 'Tests' },
  { id: 'widget', label: 'Widget' },
  { id: 'security', label: 'Security' },
  { id: 'advanced', label: 'Advanced' },
];

export const VOICE_CATEGORIES: VoiceCategory[] = [
  { id: 'all', name: 'All', count: 0 },
  { id: 'indian', name: 'Sarvam 🇮🇳', count: 0 },
  { id: 'ai4bharat', name: 'AI4Bharat 🔓', count: 0 },
  { id: 'india', name: 'English (India)', count: 0 },
  { id: 'elevenlabs', name: 'Premium', count: 0 },
  { id: 'international', name: 'International', count: 0 },
  { id: 'custom', name: 'Custom', count: 0 },
];

export const DEFAULT_VOICES: Voice[] = [
  {
    id: 'eric001',
    name: 'Eric',
    description: 'Smooth, Trustworthy',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged' },
    accent: 'American',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'conversational',
  },
  {
    id: '21m00Tcm4TlvDq8ikWAM',
    name: 'Rachel',
    description: 'Calm, Composed',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'AZnzlk1XvdvUeBnXmlld',
    name: 'Domi',
    description: 'Strong, Confident',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'EXAVITQu4vr4xnSDxMaL',
    name: 'Bella',
    description: 'Soft, Gentle',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'meditation',
  },
  {
    id: 'ErXwobaYiN019PkySvjV',
    name: 'Antoni',
    description: 'Versatile, Natural',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'young' },
    accent: 'American',
    gender: 'male',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'MF3mGyEYCl7XYWbV9V6O',
    name: 'Elli',
    description: 'Emotional, Engaging',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'TxGEqnHWrfWFTfGW9XjX',
    name: 'Josh',
    description: 'Deep, Resonant',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'young' },
    accent: 'American',
    gender: 'male',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'VR6AewLTigWG4xSOukaG',
    name: 'Arnold',
    description: 'Crisp and clear, great for educational content.',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged' },
    accent: 'American',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'narration',
  },
  {
    id: 'pNInz6obpgDQGcFmaJgB',
    name: 'Adam',
    description: 'Deep and mature voice with a natural tone.',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged' },
    accent: 'American',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'narration',
  },
  {
    id: 'yoZ06aMxZJJ28mfd3POQ',
    name: 'Sam',
    description: 'Raspy and dynamic, perfect for trailers and promos.',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'young' },
    accent: 'American',
    gender: 'male',
    age: 'Young',
    use_case: 'characters_animation',
  },
  {
    id: 'onwK4e9ZLuTAKqWW03F9',
    name: 'Daniel',
    description: 'British accent, authoritative and professional.',
    category: 'curated',
    labels: { accent: 'british', gender: 'male', age: 'middle_aged' },
    accent: 'British',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'news',
  },
  {
    id: 'jBpfuIE2acCO8z3wKNLl',
    name: 'Gigi',
    description: 'Childlike and playful, great for animations.',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'characters_animation',
  },
  {
    id: 'jsCqWAovK2LkecY7zXl4',
    name: 'Freya',
    description: 'Nordic-inspired voice with a mysterious quality.',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'characters_animation',
  },
  // Indian Voices (Sarvam AI)
  {
    id: 'sarvam-priya',
    name: 'Priya',
    description: 'Natural Hindi female voice, warm and professional.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
  },
  {
    id: 'sarvam-dev',
    name: 'Dev',
    description: 'Clear Hindi male voice, authoritative and friendly.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'male', age: 'middle_aged' },
    accent: 'Indian',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'conversational',
  },
  {
    id: 'sarvam-kavya',
    name: 'Kavya',
    description: 'Indian English female voice, professional and engaging.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'sarvam-ravi',
    name: 'Ravi',
    description: 'Indian English male voice, confident and clear.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'male', age: 'middle_aged' },
    accent: 'Indian',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'narration',
  },
  {
    id: 'sarvam-neha',
    name: 'Neha',
    description: 'Multilingual Indian female voice for Hindi/English.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
  },
  {
    id: 'sarvam-aditya',
    name: 'Aditya',
    description: 'Multilingual Indian male voice for Hindi/English.',
    category: 'curated',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
  },
  // AI4Bharat Voices (Open Source Indian Languages)
  {
    id: 'ai4bharat-te-female',
    name: 'Telugu Female',
    description: 'Telugu language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-te-male',
    name: 'Telugu Male',
    description: 'Telugu language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-hi-female',
    name: 'Hindi Female',
    description: 'Hindi language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-hi-male',
    name: 'Hindi Male',
    description: 'Hindi language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-ta-female',
    name: 'Tamil Female',
    description: 'Tamil language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-ta-male',
    name: 'Tamil Male',
    description: 'Tamil language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-kn-female',
    name: 'Kannada Female',
    description: 'Kannada language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-kn-male',
    name: 'Kannada Male',
    description: 'Kannada language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-ml-female',
    name: 'Malayalam Female',
    description: 'Malayalam language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-ml-male',
    name: 'Malayalam Male',
    description: 'Malayalam language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-bn-female',
    name: 'Bengali Female',
    description: 'Bengali language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-bn-male',
    name: 'Bengali Male',
    description: 'Bengali language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-mr-female',
    name: 'Marathi Female',
    description: 'Marathi language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-mr-male',
    name: 'Marathi Male',
    description: 'Marathi language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-gu-female',
    name: 'Gujarati Female',
    description: 'Gujarati language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'female', age: 'young' },
    accent: 'Indian',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  {
    id: 'ai4bharat-gu-male',
    name: 'Gujarati Male',
    description: 'Gujarati language voice - Open Source AI4Bharat',
    category: 'ai4bharat',
    labels: { accent: 'indian', gender: 'male', age: 'young' },
    accent: 'Indian',
    gender: 'male',
    age: 'Young',
    use_case: 'conversational',
    provider: 'ai4bharat',
  },
  // OpenAI Voices
  {
    id: 'openai-alloy',
    name: 'Alloy',
    description: 'Neutral and balanced, versatile for any use case.',
    category: 'curated',
    labels: { accent: 'american', gender: 'neutral', age: 'young' },
    accent: 'American',
    gender: 'neutral',
    age: 'Young',
    use_case: 'conversational',
  },
  {
    id: 'openai-echo',
    name: 'Echo',
    description: 'Clear and resonant male voice.',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'young' },
    accent: 'American',
    gender: 'male',
    age: 'Young',
    use_case: 'narration',
  },
  {
    id: 'openai-fable',
    name: 'Fable',
    description: 'British storyteller voice, warm and engaging.',
    category: 'curated',
    labels: { accent: 'british', gender: 'male', age: 'middle_aged' },
    accent: 'British',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'narration',
  },
  {
    id: 'openai-onyx',
    name: 'Onyx',
    description: 'Deep and authoritative male voice.',
    category: 'curated',
    labels: { accent: 'american', gender: 'male', age: 'middle_aged' },
    accent: 'American',
    gender: 'male',
    age: 'Middle-aged',
    use_case: 'news',
  },
  {
    id: 'openai-nova',
    name: 'Nova',
    description: 'Warm and engaging female voice.',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'conversational',
  },
  {
    id: 'openai-shimmer',
    name: 'Shimmer',
    description: 'Soft and soothing female voice.',
    category: 'curated',
    labels: { accent: 'american', gender: 'female', age: 'young' },
    accent: 'American',
    gender: 'female',
    age: 'Young',
    use_case: 'meditation',
  },
];

export const CONVERSATIONAL_AI_LANGUAGES = [
  { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
  { code: 'en-IN', name: 'English (India)', flag: '🇮🇳' },
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
  // Indian Languages - use full locale codes for AI4Bharat compatibility
  { code: 'hi-IN', name: 'Hindi', flag: '🇮🇳' },
  { code: 'te-IN', name: 'Telugu', flag: '🇮🇳' },
  { code: 'ta-IN', name: 'Tamil', flag: '🇮🇳' },
  { code: 'kn-IN', name: 'Kannada', flag: '🇮🇳' },
  { code: 'ml-IN', name: 'Malayalam', flag: '🇮🇳' },
  { code: 'mr-IN', name: 'Marathi', flag: '🇮🇳' },
  { code: 'bn-IN', name: 'Bengali', flag: '🇮🇳' },
  { code: 'gu-IN', name: 'Gujarati', flag: '🇮🇳' },
  { code: 'pa-IN', name: 'Punjabi', flag: '🇮🇳' },
  { code: 'or-IN', name: 'Odia', flag: '🇮🇳' },
  { code: 'as-IN', name: 'Assamese', flag: '🇮🇳' },
  { code: 'ur-IN', name: 'Urdu', flag: '🇮🇳' },
  // Other international languages
  { code: 'hu', name: 'Hungarian', flag: '🇭🇺' },
  { code: 'id', name: 'Indonesian', flag: '🇮🇩' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ro', name: 'Romanian', flag: '🇷🇴' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'sk', name: 'Slovak', flag: '🇸🇰' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'vi', name: 'Vietnamese', flag: '🇻🇳' },
];
