/**
 * Agent Analytics Service
 * Frontend service for fetching analytics and conversation history
 */

import api from './api';

export interface AgentAnalytics {
  totalConversations: number;
  successRate: number;
  avgDuration: number;
  avgRating: number | null;
  sentimentBreakdown: {
    positive: number;
    neutral: number;
    negative: number;
  };
  outcomeBreakdown: Record<string, number>;
  conversationsToday: number;
  conversationsThisWeek: number;
  conversationsThisMonth: number;
  peakHours: { hour: number; count: number }[];
}

export interface ConversationRecord {
  id: string;
  type: 'voice_session' | 'outbound_call';
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  status: string;
  duration: number | null;
  sentiment: string | null;
  outcome: string | null;
  summary: string | null;
  qualification: Record<string, any>;
  transcript: Array<{
    role: string;
    content: string;
    timestamp: string;
  }>;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface ConversationListResponse {
  conversations: ConversationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyticsFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  sentiment?: string;
  outcome?: string;
  search?: string;
}

class AgentAnalyticsApiService {
  /**
   * Get analytics for an agent
   */
  async getAnalytics(agentId: string): Promise<AgentAnalytics> {
    const response = await api.get(`/voice-ai/agents/${agentId}/analytics`);
    return response.data;
  }

  /**
   * Get conversation history
   */
  async getConversations(
    agentId: string,
    page: number = 1,
    pageSize: number = 20,
    filters: AnalyticsFilters = {}
  ): Promise<ConversationListResponse> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('pageSize', pageSize.toString());

    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sentiment) params.append('sentiment', filters.sentiment);
    if (filters.outcome) params.append('outcome', filters.outcome);
    if (filters.search) params.append('search', filters.search);

    const response = await api.get(`/voice-ai/agents/${agentId}/conversations?${params.toString()}`);
    return response.data;
  }

  /**
   * Get single conversation detail
   */
  async getConversationDetail(
    agentId: string,
    conversationId: string,
    type: 'voice_session' | 'outbound_call'
  ): Promise<ConversationRecord> {
    const response = await api.get(
      `/voice-ai/agents/${agentId}/conversations/${conversationId}?type=${type}`
    );
    return response.data;
  }

  /**
   * Export conversations to CSV
   */
  async exportConversations(agentId: string, filters: AnalyticsFilters = {}): Promise<void> {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.sentiment) params.append('sentiment', filters.sentiment);
    if (filters.outcome) params.append('outcome', filters.outcome);

    const response = await api.get(
      `/voice-ai/agents/${agentId}/conversations/export?${params.toString()}`,
      { responseType: 'blob' }
    );

    // Create download link
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;

    // Extract filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = 'conversations_export.csv';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }

    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

export const agentAnalyticsApiService = new AgentAnalyticsApiService();
