/**
 * Template Preview Types
 */

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

export interface TemplateData {
  id: string;
  name: string;
  greeting?: string;
  greetings?: Record<string, string>;
  voiceId?: string;
  language?: string;
  systemPrompt?: string;
  industry?: string;
  icon?: string;
  color?: string;
}

export interface TemplatePreviewModalProps {
  template: TemplateData;
  onClose: () => void;
}

export type ActiveTab = 'voice' | 'conversation';

export interface CallState {
  isActive: boolean;
  duration: number;
  isRecording: boolean;
  isPlaying: boolean;
  isProcessing: boolean;
  isLoadingAudio: boolean;
  currentTranscript: string;
}
