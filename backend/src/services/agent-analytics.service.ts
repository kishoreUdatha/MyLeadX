/**
 * Agent Analytics Service
 * Provides analytics and conversation history for Voice AI agents
 */

import { prisma } from '../config/database';
import { VoiceSessionStatus, OutboundCallStatus, CallOutcome } from '@prisma/client';

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
  transcript: any[];
  startedAt: Date;
  endedAt: Date | null;
  createdAt: Date;
}

export interface ConversationListResponse {
  conversations: ConversationRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyticsFilters {
  startDate?: Date;
  endDate?: Date;
  status?: string;
  sentiment?: string;
  outcome?: string;
  search?: string;
}

class AgentAnalyticsService {
  /**
   * Get comprehensive analytics for an agent
   */
  async getAgentAnalytics(agentId: string, organizationId: string): Promise<AgentAnalytics> {
    // Get all voice sessions for this agent
    const voiceSessions = await prisma.voiceSession.findMany({
      where: {
        agentId,
        agent: { organizationId },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        sentiment: true,
        startedAt: true,
      },
    });

    // Get all outbound calls for this agent
    const outboundCalls = await prisma.outboundCall.findMany({
      where: {
        agentId,
        agent: { organizationId },
      },
      select: {
        id: true,
        status: true,
        duration: true,
        sentiment: true,
        outcome: true,
        startedAt: true,
      },
    });

    const totalConversations = voiceSessions.length + outboundCalls.length;

    // Calculate success rate
    const successfulSessions = voiceSessions.filter(
      s => s.status === VoiceSessionStatus.COMPLETED
    ).length;
    const successfulCalls = outboundCalls.filter(
      c => c.outcome === CallOutcome.INTERESTED ||
           c.outcome === CallOutcome.APPOINTMENT_BOOKED ||
           c.outcome === CallOutcome.CALLBACK_REQUESTED
    ).length;
    const successRate = totalConversations > 0
      ? Math.round(((successfulSessions + successfulCalls) / totalConversations) * 100)
      : 0;

    // Calculate average duration
    const allDurations = [
      ...voiceSessions.map(s => s.duration).filter((d): d is number => d !== null),
      ...outboundCalls.map(c => c.duration).filter((d): d is number => d !== null),
    ];
    const avgDuration = allDurations.length > 0
      ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
      : 0;

    // Sentiment breakdown
    const allSentiments = [
      ...voiceSessions.map(s => s.sentiment),
      ...outboundCalls.map(c => c.sentiment),
    ].filter((s): s is string => s !== null);

    const sentimentBreakdown = {
      positive: allSentiments.filter(s => s === 'positive').length,
      neutral: allSentiments.filter(s => s === 'neutral').length,
      negative: allSentiments.filter(s => s === 'negative').length,
    };

    // Outcome breakdown (from outbound calls)
    const outcomeBreakdown: Record<string, number> = {};
    outboundCalls.forEach(call => {
      if (call.outcome) {
        outcomeBreakdown[call.outcome] = (outcomeBreakdown[call.outcome] || 0) + 1;
      }
    });

    // Time-based stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const conversationsToday = [...voiceSessions, ...outboundCalls].filter(
      c => c.startedAt && c.startedAt >= startOfToday
    ).length;

    const conversationsThisWeek = [...voiceSessions, ...outboundCalls].filter(
      c => c.startedAt && c.startedAt >= startOfWeek
    ).length;

    const conversationsThisMonth = [...voiceSessions, ...outboundCalls].filter(
      c => c.startedAt && c.startedAt >= startOfMonth
    ).length;

    // Peak hours analysis
    const hourCounts: Record<number, number> = {};
    [...voiceSessions, ...outboundCalls].forEach(c => {
      if (c.startedAt) {
        const hour = new Date(c.startedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    const peakHours = Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalConversations,
      successRate,
      avgDuration,
      avgRating: null, // Rating system not implemented yet
      sentimentBreakdown,
      outcomeBreakdown,
      conversationsToday,
      conversationsThisWeek,
      conversationsThisMonth,
      peakHours,
    };
  }

  /**
   * Get paginated conversation history for an agent
   */
  async getConversationHistory(
    agentId: string,
    organizationId: string,
    page: number = 1,
    pageSize: number = 20,
    filters: AnalyticsFilters = {}
  ): Promise<ConversationListResponse> {
    const skip = (page - 1) * pageSize;

    // Build where clauses for filtering
    const sessionWhere: any = {
      agentId,
      agent: { organizationId },
    };

    const callWhere: any = {
      agentId,
      agent: { organizationId },
    };

    // Apply filters
    if (filters.startDate) {
      sessionWhere.startedAt = { ...sessionWhere.startedAt, gte: filters.startDate };
      callWhere.startedAt = { ...callWhere.startedAt, gte: filters.startDate };
    }
    if (filters.endDate) {
      sessionWhere.startedAt = { ...sessionWhere.startedAt, lte: filters.endDate };
      callWhere.startedAt = { ...callWhere.startedAt, lte: filters.endDate };
    }
    if (filters.sentiment) {
      sessionWhere.sentiment = filters.sentiment;
      callWhere.sentiment = filters.sentiment;
    }
    if (filters.outcome) {
      callWhere.outcome = filters.outcome;
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      sessionWhere.OR = [
        { visitorName: { contains: searchTerm, mode: 'insensitive' } },
        { visitorEmail: { contains: searchTerm, mode: 'insensitive' } },
        { visitorPhone: { contains: searchTerm } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
      ];
      callWhere.OR = [
        { phoneNumber: { contains: searchTerm } },
        { summary: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Fetch voice sessions
    const voiceSessions = await prisma.voiceSession.findMany({
      where: sessionWhere,
      include: {
        transcripts: {
          orderBy: { timestamp: 'asc' },
          select: {
            role: true,
            content: true,
            timestamp: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Fetch outbound calls
    const outboundCalls = await prisma.outboundCall.findMany({
      where: callWhere,
      orderBy: { startedAt: 'desc' },
    });

    // Combine and format conversations
    const allConversations: ConversationRecord[] = [
      ...voiceSessions.map(session => ({
        id: session.id,
        type: 'voice_session' as const,
        contactName: session.visitorName,
        contactPhone: session.visitorPhone,
        contactEmail: session.visitorEmail,
        status: session.status,
        duration: session.duration,
        sentiment: session.sentiment,
        outcome: null,
        summary: session.summary,
        qualification: (session.qualification as Record<string, any>) || {},
        transcript: session.transcripts.map(t => ({
          role: t.role,
          content: t.content,
          timestamp: t.timestamp,
        })),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
      })),
      ...outboundCalls.map(call => ({
        id: call.id,
        type: 'outbound_call' as const,
        contactName: null,
        contactPhone: call.phoneNumber,
        contactEmail: null,
        status: call.status,
        duration: call.duration,
        sentiment: call.sentiment,
        outcome: call.outcome,
        summary: call.summary,
        qualification: (call.qualification as Record<string, any>) || {},
        transcript: (call.transcript as any[]) || [],
        startedAt: call.startedAt || call.createdAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
      })),
    ];

    // Sort by startedAt descending
    allConversations.sort((a, b) =>
      new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Apply pagination
    const total = allConversations.length;
    const paginatedConversations = allConversations.slice(skip, skip + pageSize);

    return {
      conversations: paginatedConversations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get a single conversation detail
   */
  async getConversationDetail(
    conversationId: string,
    type: 'voice_session' | 'outbound_call',
    organizationId: string
  ): Promise<ConversationRecord | null> {
    if (type === 'voice_session') {
      const session = await prisma.voiceSession.findFirst({
        where: {
          id: conversationId,
          agent: { organizationId },
        },
        include: {
          transcripts: {
            orderBy: { timestamp: 'asc' },
          },
          agent: {
            select: { name: true },
          },
        },
      });

      if (!session) return null;

      return {
        id: session.id,
        type: 'voice_session',
        contactName: session.visitorName,
        contactPhone: session.visitorPhone,
        contactEmail: session.visitorEmail,
        status: session.status,
        duration: session.duration,
        sentiment: session.sentiment,
        outcome: null,
        summary: session.summary,
        qualification: (session.qualification as Record<string, any>) || {},
        transcript: session.transcripts.map(t => ({
          role: t.role,
          content: t.content,
          timestamp: t.timestamp,
        })),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        createdAt: session.createdAt,
      };
    } else {
      const call = await prisma.outboundCall.findFirst({
        where: {
          id: conversationId,
          agent: { organizationId },
        },
        include: {
          agent: {
            select: { name: true },
          },
        },
      });

      if (!call) return null;

      return {
        id: call.id,
        type: 'outbound_call',
        contactName: null,
        contactPhone: call.phoneNumber,
        contactEmail: null,
        status: call.status,
        duration: call.duration,
        sentiment: call.sentiment,
        outcome: call.outcome,
        summary: call.summary,
        qualification: (call.qualification as Record<string, any>) || {},
        transcript: (call.transcript as any[]) || [],
        startedAt: call.startedAt || call.createdAt,
        endedAt: call.endedAt,
        createdAt: call.createdAt,
      };
    }
  }

  /**
   * Export conversations to CSV format
   */
  async exportConversationsCSV(
    agentId: string,
    organizationId: string,
    filters: AnalyticsFilters = {}
  ): Promise<string> {
    const { conversations } = await this.getConversationHistory(
      agentId,
      organizationId,
      1,
      10000, // Get all for export
      filters
    );

    // CSV headers
    const headers = [
      'ID',
      'Type',
      'Contact Name',
      'Contact Phone',
      'Contact Email',
      'Status',
      'Duration (seconds)',
      'Sentiment',
      'Outcome',
      'Summary',
      'Started At',
      'Ended At',
    ];

    // CSV rows
    const rows = conversations.map(conv => [
      conv.id,
      conv.type,
      conv.contactName || '',
      conv.contactPhone || '',
      conv.contactEmail || '',
      conv.status,
      conv.duration?.toString() || '',
      conv.sentiment || '',
      conv.outcome || '',
      (conv.summary || '').replace(/"/g, '""'), // Escape quotes
      conv.startedAt.toISOString(),
      conv.endedAt?.toISOString() || '',
    ]);

    // Build CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    return csvContent;
  }
}

export const agentAnalyticsService = new AgentAnalyticsService();
