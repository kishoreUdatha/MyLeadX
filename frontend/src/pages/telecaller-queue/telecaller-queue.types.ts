/**
 * Telecaller Queue Page Types
 */

export interface CompleteFormData {
  outcome: string;
  notes: string;
  callbackDate: string;
  callbackTime: string;
}

export interface SentimentColor {
  bg: string;
  text: string;
}

export type SentimentType = 'positive' | 'neutral' | 'negative';
