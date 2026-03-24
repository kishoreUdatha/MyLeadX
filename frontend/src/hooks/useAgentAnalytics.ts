/**
 * useAgentAnalytics Hook
 * Custom hook for fetching and managing agent analytics data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  agentAnalyticsApiService,
  AgentAnalytics,
  ConversationRecord,
  AnalyticsFilters,
} from '../services/agent-analytics.service';

interface UseAgentAnalyticsOptions {
  agentId: string;
  autoFetch?: boolean;
}

interface UseAgentAnalyticsReturn {
  // Analytics
  analytics: AgentAnalytics | null;
  analyticsLoading: boolean;
  analyticsError: string | null;
  refreshAnalytics: () => Promise<void>;

  // Conversations
  conversations: ConversationRecord[];
  conversationsLoading: boolean;
  conversationsError: string | null;
  totalConversations: number;
  currentPage: number;
  totalPages: number;
  pageSize: number;

  // Actions
  fetchConversations: (page?: number, filters?: AnalyticsFilters) => Promise<void>;
  setPageSize: (size: number) => void;
  exportToCSV: (filters?: AnalyticsFilters) => Promise<void>;
  exportLoading: boolean;

  // Selected conversation
  selectedConversation: ConversationRecord | null;
  selectConversation: (conversation: ConversationRecord | null) => void;
  fetchConversationDetail: (id: string, type: 'voice_session' | 'outbound_call') => Promise<void>;
  detailLoading: boolean;
}

export function useAgentAnalytics({
  agentId,
  autoFetch = true,
}: UseAgentAnalyticsOptions): UseAgentAnalyticsReturn {
  // Analytics state
  const [analytics, setAnalytics] = useState<AgentAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Conversations state
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [conversationsError, setConversationsError] = useState<string | null>(null);
  const [totalConversations, setTotalConversations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // Selected conversation
  const [selectedConversation, setSelectedConversation] = useState<ConversationRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);

  // Fetch analytics
  const refreshAnalytics = useCallback(async () => {
    if (!agentId) return;

    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const data = await agentAnalyticsApiService.getAnalytics(agentId);
      setAnalytics(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setAnalyticsError('Failed to fetch analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [agentId]);

  // Fetch conversations
  const fetchConversations = useCallback(
    async (page: number = 1, filters: AnalyticsFilters = {}) => {
      if (!agentId) return;

      setConversationsLoading(true);
      setConversationsError(null);

      try {
        const data = await agentAnalyticsApiService.getConversations(
          agentId,
          page,
          pageSize,
          filters
        );
        setConversations(data.conversations);
        setTotalConversations(data.total);
        setCurrentPage(data.page);
        setTotalPages(data.totalPages);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
        setConversationsError('Failed to fetch conversations');
      } finally {
        setConversationsLoading(false);
      }
    },
    [agentId, pageSize]
  );

  // Fetch conversation detail
  const fetchConversationDetail = useCallback(
    async (id: string, type: 'voice_session' | 'outbound_call') => {
      if (!agentId) return;

      setDetailLoading(true);

      try {
        const data = await agentAnalyticsApiService.getConversationDetail(agentId, id, type);
        setSelectedConversation(data);
      } catch (error) {
        console.error('Failed to fetch conversation detail:', error);
      } finally {
        setDetailLoading(false);
      }
    },
    [agentId]
  );

  // Export to CSV
  const exportToCSV = useCallback(
    async (filters: AnalyticsFilters = {}) => {
      if (!agentId) return;

      setExportLoading(true);

      try {
        await agentAnalyticsApiService.exportConversations(agentId, filters);
      } catch (error) {
        console.error('Failed to export conversations:', error);
      } finally {
        setExportLoading(false);
      }
    },
    [agentId]
  );

  // Select conversation
  const selectConversation = useCallback((conversation: ConversationRecord | null) => {
    setSelectedConversation(conversation);
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && agentId) {
      refreshAnalytics();
      fetchConversations();
    }
  }, [autoFetch, agentId, refreshAnalytics, fetchConversations]);

  return {
    // Analytics
    analytics,
    analyticsLoading,
    analyticsError,
    refreshAnalytics,

    // Conversations
    conversations,
    conversationsLoading,
    conversationsError,
    totalConversations,
    currentPage,
    totalPages,
    pageSize,

    // Actions
    fetchConversations,
    setPageSize,
    exportToCSV,
    exportLoading,

    // Selected conversation
    selectedConversation,
    selectConversation,
    fetchConversationDetail,
    detailLoading,
  };
}
