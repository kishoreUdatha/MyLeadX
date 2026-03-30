/**
 * Call Details Types
 */

export interface TranscriptMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface CallAgent {
  id: string;
  name: string;
  industry: string;
}

export interface CallCampaign {
  id: string;
  name: string;
}

export interface CallContact {
  id: string;
  name: string | null;
  email: string | null;
}

export interface CallDetails {
  id: string;
  phoneNumber: string;
  twilioCallSid: string | null;
  status: string;
  duration: number | null;
  ringDuration: number | null;
  startedAt: string | null;
  answeredAt: string | null;
  endedAt: string | null;
  recordingUrl: string | null;
  recordingDuration: number | null;
  transcript: TranscriptMessage[] | null;
  summary: string | null;
  sentiment: string | null;
  qualification: Record<string, any> | null;
  outcome: string | null;
  outcomeNotes: string | null;
  leadGenerated: boolean;
  generatedLeadId: string | null;
  createdAt: string;
  agent: CallAgent;
  campaign: CallCampaign | null;
  contact: CallContact | null;
}

export type ActiveTab = 'transcript' | 'info';

export interface StatusConfig {
  label: string;
  color: string;
}
