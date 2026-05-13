import api from './api';

export type ProspectSource =
  | 'META_LEAD_AD'
  | 'META_LANDING_PAGE'
  | 'GOOGLE_LEAD_FORM'
  | 'GOOGLE_ADS_LANDING'
  | 'LINKEDIN_LEAD_GEN'
  | 'TIKTOK_LEAD_GEN'
  | 'TWITTER_LEAD_GEN'
  | 'YOUTUBE_LEAD_GEN'
  | 'ORGANIC'
  | 'DIRECT'
  | 'REFERRAL'
  | 'MANUAL'
  | 'EMAIL_CAMPAIGN'
  | 'WEBINAR'
  | 'EVENT'
  | 'PARTNER'
  | 'COLD_OUTREACH'
  | 'OTHER';

export type ProspectStage =
  | 'NEW'
  | 'MQL'
  | 'SQL'
  | 'DEMO_SCHEDULED'
  | 'DEMO_DONE'
  | 'PROPOSAL_SENT'
  | 'NEGOTIATING'
  | 'TRIAL_STARTED'
  | 'CONVERTED'
  | 'LOST'
  | 'UNRESPONSIVE';

export type ProspectActivityType =
  | 'CALL'
  | 'EMAIL'
  | 'SMS'
  | 'WHATSAPP'
  | 'NOTE'
  | 'DEMO_SCHEDULED'
  | 'DEMO_COMPLETED'
  | 'TASK'
  | 'STAGE_CHANGE'
  | 'ASSIGNMENT_CHANGE'
  | 'EMAIL_OPENED'
  | 'EMAIL_CLICKED'
  | 'FORM_SUBMITTED';

export interface PlatformProspect {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  designation?: string;
  teamSize?: string;
  industry?: string;
  currentCrm?: string;

  source: ProspectSource;
  campaign?: string;
  medium?: string;
  utmContent?: string;
  utmTerm?: string;
  adId?: string;
  adName?: string;
  landingPageId?: string;
  referrerUrl?: string;
  referrerName?: string;
  eventName?: string;

  stage: ProspectStage;
  score: number;
  lostReason?: string;

  assignedToId?: string;
  assignedAt?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  firstResponseAt?: string;
  demoScheduledAt?: string;
  trialStartedAt?: string;
  convertedAt?: string;
  lostAt?: string;

  organizationId?: string;
  organization?: { id: string; name: string; slug: string };

  createdAt: string;
  updatedAt: string;
}

export interface ProspectActivity {
  id: string;
  prospectId: string;
  userId: string;
  type: ProspectActivityType;
  callDurationSeconds?: number;
  callRecordingUrl?: string;
  callOutcome?: string;
  emailSubject?: string;
  emailBody?: string;
  emailDirection?: string;
  noteContent?: string;
  taskTitle?: string;
  taskDueDate?: string;
  taskCompleted: boolean;
  fromStage?: string;
  toStage?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  user?: { id: string; firstName: string; lastName: string };
}

export interface ListProspectsResult {
  items: PlatformProspect[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ListProspectsFilters {
  source?: ProspectSource;
  stage?: ProspectStage;
  assignedToId?: string;
  search?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export const platformProspectService = {
  async list(filters: ListProspectsFilters = {}): Promise<ListProspectsResult> {
    const params: Record<string, string | number> = {};
    if (filters.source) params.source = filters.source;
    if (filters.stage) params.stage = filters.stage;
    if (filters.assignedToId) params.assignedToId = filters.assignedToId;
    if (filters.search) params.search = filters.search;
    if (filters.fromDate) params.fromDate = filters.fromDate;
    if (filters.toDate) params.toDate = filters.toDate;
    if (filters.page) params.page = filters.page;
    if (filters.pageSize) params.pageSize = filters.pageSize;

    const response = await api.get('/platform-prospects', { params });
    return response.data.data;
  },

  async getById(id: string): Promise<PlatformProspect & { activities: ProspectActivity[] }> {
    const response = await api.get(`/platform-prospects/${id}`);
    return response.data.data;
  },

  async create(input: Partial<PlatformProspect>): Promise<{ id: string; isDuplicate: boolean }> {
    const response = await api.post('/platform-prospects', input);
    return response.data.data;
  },

  async update(id: string, input: Partial<PlatformProspect>): Promise<PlatformProspect> {
    const response = await api.put(`/platform-prospects/${id}`, input);
    return response.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/platform-prospects/${id}`);
  },

  async changeStage(id: string, stage: ProspectStage, reason?: string): Promise<PlatformProspect> {
    const response = await api.post(`/platform-prospects/${id}/stage`, { stage, reason });
    return response.data.data;
  },

  async assign(id: string, userId: string | null): Promise<PlatformProspect> {
    const response = await api.post(`/platform-prospects/${id}/assign`, { userId });
    return response.data.data;
  },

  async logActivity(
    id: string,
    type: ProspectActivityType,
    data: Record<string, unknown> = {},
  ): Promise<ProspectActivity> {
    const response = await api.post(`/platform-prospects/${id}/activities`, { type, ...data });
    return response.data.data;
  },

  async pipelineSummary(): Promise<Record<ProspectStage, number>> {
    const response = await api.get('/platform-prospects/pipeline-summary');
    return response.data.data;
  },

  async sourceBreakdown(
    fromDate?: string,
    toDate?: string,
  ): Promise<Array<{ source: ProspectSource; _count: { _all: number } }>> {
    const params: Record<string, string> = {};
    if (fromDate) params.fromDate = fromDate;
    if (toDate) params.toDate = toDate;
    const response = await api.get('/platform-prospects/source-breakdown', { params });
    return response.data.data;
  },

  async convertToTenant(
    id: string,
    options: { planId?: string; trialDurationDays?: number; billingCycle?: 'monthly' | 'annual' } = {},
  ): Promise<{
    prospect: PlatformProspect;
    organization: { id: string; name: string; slug: string };
    adminUser: { id: string; email: string; firstName: string; lastName: string };
    tempPassword?: string;
    trialEndsAt: string;
    alreadyConverted: boolean;
  }> {
    const response = await api.post(`/platform-prospects/${id}/convert`, options);
    return response.data.data;
  },
};

export const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  META_LEAD_AD: 'Meta Lead Ad',
  META_LANDING_PAGE: 'Meta Landing Page',
  GOOGLE_LEAD_FORM: 'Google Lead Form',
  GOOGLE_ADS_LANDING: 'Google Ads',
  LINKEDIN_LEAD_GEN: 'LinkedIn',
  TIKTOK_LEAD_GEN: 'TikTok',
  TWITTER_LEAD_GEN: 'Twitter / X',
  YOUTUBE_LEAD_GEN: 'YouTube',
  ORGANIC: 'Organic',
  DIRECT: 'Direct',
  REFERRAL: 'Referral',
  MANUAL: 'Manual Entry',
  EMAIL_CAMPAIGN: 'Email Campaign',
  WEBINAR: 'Webinar',
  EVENT: 'Event',
  PARTNER: 'Partner',
  COLD_OUTREACH: 'Cold Outreach',
  OTHER: 'Other',
};

export const PROSPECT_STAGE_LABELS: Record<ProspectStage, string> = {
  NEW: 'New',
  MQL: 'MQL',
  SQL: 'SQL',
  DEMO_SCHEDULED: 'Demo Scheduled',
  DEMO_DONE: 'Demo Done',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATING: 'Negotiating',
  TRIAL_STARTED: 'Trial Started',
  CONVERTED: 'Converted',
  LOST: 'Lost',
  UNRESPONSIVE: 'Unresponsive',
};

export const PROSPECT_STAGE_COLORS: Record<ProspectStage, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  MQL: 'bg-blue-100 text-blue-800',
  SQL: 'bg-indigo-100 text-indigo-800',
  DEMO_SCHEDULED: 'bg-purple-100 text-purple-800',
  DEMO_DONE: 'bg-violet-100 text-violet-800',
  PROPOSAL_SENT: 'bg-yellow-100 text-yellow-800',
  NEGOTIATING: 'bg-orange-100 text-orange-800',
  TRIAL_STARTED: 'bg-cyan-100 text-cyan-800',
  CONVERTED: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
  UNRESPONSIVE: 'bg-slate-100 text-slate-800',
};
