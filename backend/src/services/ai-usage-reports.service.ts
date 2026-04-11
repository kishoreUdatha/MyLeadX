/**
 * AI Usage Reports Service
 * Tenant-scoped AI voice/chat agent analytics
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  agentId?: string;
}

interface AIUsageSummary {
  totalCalls: number;
  connectedCalls: number;
  totalMinutes: number;
  avgCallDuration: number;
  qualifiedLeads: number;
  transfersToHuman: number;
  successRate: string;
  costEstimate: number;
}

interface AICallsReport {
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  connectedCalls: number;
  failedCalls: number;
  busyCalls: number;
  noAnswerCalls: number;
  connectionRate: string;
}

interface AIMinutesReport {
  totalMinutes: number;
  avgMinutesPerCall: number;
  peakHour: string;
  byDay: { date: string; minutes: number; calls: number }[];
}

interface AIQualifiedLeads {
  totalQualified: number;
  qualificationRate: string;
  byOutcome: { outcome: string; count: number; percentage: string }[];
  topQualifyingAgents: { agentId: string; agentName: string; qualified: number }[];
}

interface AITransferReport {
  totalTransfers: number;
  transferRate: string;
  avgTimeBeforeTransfer: number;
  transferReasons: { reason: string; count: number }[];
  transfersByAgent: { agentId: string; agentName: string; transfers: number }[];
}

interface AIAgentPerformance {
  agentId: string;
  agentName: string;
  totalCalls: number;
  connectedCalls: number;
  avgDuration: number;
  qualifiedLeads: number;
  transfers: number;
  successRate: string;
}

interface AIScriptPerformance {
  scriptId: string;
  scriptName: string;
  callsUsed: number;
  avgDuration: number;
  qualificationRate: string;
  transferRate: string;
}

interface TokenUsageSummary {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  byModel: { model: string; tokens: number; cost: number }[];
  byAgent: { agentId: string; agentName: string; tokens: number }[];
}

class AIUsageReportsService {
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * 1. AI USAGE SUMMARY
   */
  async getAIUsageSummary(filters: ReportFilters): Promise<AIUsageSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get AI calls from outbound calls
    const aiCalls = await prisma.outboundCall.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        status: true,
        duration: true,
        callOutcome: true,
        transferredToHuman: true,
      },
    });

    const totalCalls = aiCalls.length;
    const connectedCalls = aiCalls.filter(c => c.status === 'COMPLETED').length;
    const totalSeconds = aiCalls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);
    const qualifiedLeads = aiCalls.filter(c =>
      c.callOutcome === 'INTERESTED' || c.callOutcome === 'QUALIFIED'
    ).length;
    const transfersToHuman = aiCalls.filter(c => c.transferredToHuman).length;

    // Estimate cost ($0.10 per minute)
    const costEstimate = totalMinutes * 0.10;

    return {
      totalCalls,
      connectedCalls,
      totalMinutes,
      avgCallDuration: connectedCalls > 0 ? Math.round(totalSeconds / connectedCalls) : 0,
      qualifiedLeads,
      transfersToHuman,
      successRate: totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0',
      costEstimate,
    };
  }

  /**
   * 2. AI CALLS REPORT
   */
  async getAICallsReport(filters: ReportFilters): Promise<AICallsReport> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    const statusMap: Record<string, number> = {};
    let totalCalls = 0;

    for (const item of calls) {
      statusMap[item.status] = item._count.id;
      totalCalls += item._count.id;
    }

    const connectedCalls = statusMap['COMPLETED'] || 0;
    const failedCalls = statusMap['FAILED'] || 0;
    const busyCalls = statusMap['BUSY'] || 0;
    const noAnswerCalls = statusMap['NO_ANSWER'] || 0;

    // Get inbound vs outbound (if tracked)
    const inboundCalls = await prisma.outboundCall.count({
      where: {
        organizationId,
        direction: 'INBOUND',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
    });

    return {
      totalCalls,
      inboundCalls,
      outboundCalls: totalCalls - inboundCalls,
      connectedCalls,
      failedCalls,
      busyCalls,
      noAnswerCalls,
      connectionRate: totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0',
    };
  }

  /**
   * 3. AI MINUTES CONSUMED
   */
  async getAIMinutesReport(filters: ReportFilters): Promise<AIMinutesReport> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true, duration: true },
    });

    const totalSeconds = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    // Group by day
    const byDayMap = new Map<string, { minutes: number; calls: number }>();
    const hourCounts = new Array(24).fill(0);

    for (const call of calls) {
      const dateKey = call.createdAt.toISOString().split('T')[0];
      const hour = call.createdAt.getHours();
      const minutes = Math.round((call.duration || 0) / 60);

      const existing = byDayMap.get(dateKey) || { minutes: 0, calls: 0 };
      existing.minutes += minutes;
      existing.calls += 1;
      byDayMap.set(dateKey, existing);

      hourCounts[hour]++;
    }

    const peakHourIndex = hourCounts.indexOf(Math.max(...hourCounts));
    const peakHour = `${peakHourIndex.toString().padStart(2, '0')}:00`;

    const byDay = Array.from(byDayMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalMinutes,
      avgMinutesPerCall: calls.length > 0 ? Math.round(totalMinutes / calls.length) : 0,
      peakHour,
      byDay,
    };
  }

  /**
   * 4. AI QUALIFIED LEADS
   */
  async getAIQualifiedLeads(filters: ReportFilters): Promise<AIQualifiedLeads> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { callOutcome: true, agentId: true },
    });

    const totalCalls = calls.length;
    const outcomeCounts = new Map<string, number>();

    for (const call of calls) {
      const outcome = call.callOutcome || 'UNKNOWN';
      outcomeCounts.set(outcome, (outcomeCounts.get(outcome) || 0) + 1);
    }

    const qualifiedOutcomes = ['INTERESTED', 'QUALIFIED', 'CALLBACK_REQUESTED'];
    const totalQualified = qualifiedOutcomes.reduce(
      (sum, o) => sum + (outcomeCounts.get(o) || 0),
      0
    );

    const byOutcome = Array.from(outcomeCounts.entries())
      .map(([outcome, count]) => ({
        outcome,
        count,
        percentage: totalCalls > 0 ? ((count / totalCalls) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);

    // Top qualifying agents
    const agentQualified = new Map<string, number>();
    for (const call of calls) {
      if (call.agentId && qualifiedOutcomes.includes(call.callOutcome || '')) {
        agentQualified.set(call.agentId, (agentQualified.get(call.agentId) || 0) + 1);
      }
    }

    const agentIds = Array.from(agentQualified.keys());
    const agents = await prisma.voiceAIAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    const agentMap = agents.reduce((acc, a) => {
      acc[a.id] = a.name;
      return acc;
    }, {} as Record<string, string>);

    const topQualifyingAgents = Array.from(agentQualified.entries())
      .map(([agentId, qualified]) => ({
        agentId,
        agentName: agentMap[agentId] || 'Unknown Agent',
        qualified,
      }))
      .sort((a, b) => b.qualified - a.qualified)
      .slice(0, 5);

    return {
      totalQualified,
      qualificationRate: totalCalls > 0 ? ((totalQualified / totalCalls) * 100).toFixed(1) : '0',
      byOutcome,
      topQualifyingAgents,
    };
  }

  /**
   * 5. AI TRANSFER TO HUMAN REPORT
   */
  async getAITransferReport(filters: ReportFilters): Promise<AITransferReport> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const calls = await prisma.outboundCall.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        transferredToHuman: true,
        transferReason: true,
        duration: true,
        agentId: true,
      },
    });

    const totalCalls = calls.length;
    const transferredCalls = calls.filter(c => c.transferredToHuman);
    const totalTransfers = transferredCalls.length;

    // Transfer reasons
    const reasonCounts = new Map<string, number>();
    let totalTimeBeforeTransfer = 0;

    for (const call of transferredCalls) {
      const reason = call.transferReason || 'User Request';
      reasonCounts.set(reason, (reasonCounts.get(reason) || 0) + 1);
      totalTimeBeforeTransfer += call.duration || 0;
    }

    const transferReasons = Array.from(reasonCounts.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    // Transfers by agent
    const agentTransfers = new Map<string, number>();
    for (const call of transferredCalls) {
      if (call.agentId) {
        agentTransfers.set(call.agentId, (agentTransfers.get(call.agentId) || 0) + 1);
      }
    }

    const agentIds = Array.from(agentTransfers.keys());
    const agents = await prisma.voiceAIAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    const agentMap = agents.reduce((acc, a) => {
      acc[a.id] = a.name;
      return acc;
    }, {} as Record<string, string>);

    const transfersByAgent = Array.from(agentTransfers.entries())
      .map(([agentId, transfers]) => ({
        agentId,
        agentName: agentMap[agentId] || 'Unknown Agent',
        transfers,
      }))
      .sort((a, b) => b.transfers - a.transfers);

    return {
      totalTransfers,
      transferRate: totalCalls > 0 ? ((totalTransfers / totalCalls) * 100).toFixed(1) : '0',
      avgTimeBeforeTransfer: totalTransfers > 0 ? Math.round(totalTimeBeforeTransfer / totalTransfers) : 0,
      transferReasons,
      transfersByAgent,
    };
  }

  /**
   * 6. AI AGENT PERFORMANCE
   */
  async getAIAgentPerformance(filters: ReportFilters): Promise<AIAgentPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const agents = await prisma.voiceAIAgent.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const results: AIAgentPerformance[] = [];

    for (const agent of agents) {
      const calls = await prisma.outboundCall.findMany({
        where: {
          agentId: agent.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          status: true,
          duration: true,
          callOutcome: true,
          transferredToHuman: true,
        },
      });

      const totalCalls = calls.length;
      if (totalCalls === 0) continue;

      const connectedCalls = calls.filter(c => c.status === 'COMPLETED').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const qualifiedLeads = calls.filter(c =>
        c.callOutcome === 'INTERESTED' || c.callOutcome === 'QUALIFIED'
      ).length;
      const transfers = calls.filter(c => c.transferredToHuman).length;

      results.push({
        agentId: agent.id,
        agentName: agent.name,
        totalCalls,
        connectedCalls,
        avgDuration: connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0,
        qualifiedLeads,
        transfers,
        successRate: totalCalls > 0 ? ((connectedCalls / totalCalls) * 100).toFixed(1) : '0',
      });
    }

    return results.sort((a, b) => b.totalCalls - a.totalCalls);
  }

  /**
   * 7. AI SCRIPT PERFORMANCE
   */
  async getAIScriptPerformance(filters: ReportFilters): Promise<AIScriptPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get scripts/templates
    const templates = await prisma.voiceTemplate.findMany({
      where: { organizationId },
      select: { id: true, name: true },
    });

    const results: AIScriptPerformance[] = [];

    for (const template of templates) {
      // Get calls using this template's agents
      const agents = await prisma.voiceAIAgent.findMany({
        where: { templateId: template.id },
        select: { id: true },
      });

      const agentIds = agents.map(a => a.id);
      if (agentIds.length === 0) continue;

      const calls = await prisma.outboundCall.findMany({
        where: {
          agentId: { in: agentIds },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          status: true,
          duration: true,
          callOutcome: true,
          transferredToHuman: true,
        },
      });

      const callsUsed = calls.length;
      if (callsUsed === 0) continue;

      const connectedCalls = calls.filter(c => c.status === 'COMPLETED').length;
      const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
      const qualified = calls.filter(c =>
        c.callOutcome === 'INTERESTED' || c.callOutcome === 'QUALIFIED'
      ).length;
      const transferred = calls.filter(c => c.transferredToHuman).length;

      results.push({
        scriptId: template.id,
        scriptName: template.name,
        callsUsed,
        avgDuration: connectedCalls > 0 ? Math.round(totalDuration / connectedCalls) : 0,
        qualificationRate: connectedCalls > 0 ? ((qualified / connectedCalls) * 100).toFixed(1) : '0',
        transferRate: connectedCalls > 0 ? ((transferred / connectedCalls) * 100).toFixed(1) : '0',
      });
    }

    return results.sort((a, b) => b.callsUsed - a.callsUsed);
  }

  /**
   * 8. TOKEN/MODEL USAGE SUMMARY
   */
  async getTokenUsageSummary(filters: ReportFilters): Promise<TokenUsageSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // This would need a token usage tracking table
    // For now, estimate based on call duration
    const calls = await prisma.outboundCall.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { duration: true, agentId: true },
    });

    // Rough estimate: ~50 tokens per second of conversation
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);
    const estimatedTokens = totalDuration * 50;

    // Estimate cost at $0.002 per 1K tokens
    const estimatedCost = (estimatedTokens / 1000) * 0.002;

    // Group by agent
    const agentTokens = new Map<string, number>();
    for (const call of calls) {
      if (call.agentId) {
        const tokens = (call.duration || 0) * 50;
        agentTokens.set(call.agentId, (agentTokens.get(call.agentId) || 0) + tokens);
      }
    }

    const agentIds = Array.from(agentTokens.keys());
    const agents = await prisma.voiceAIAgent.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, name: true },
    });

    const agentMap = agents.reduce((acc, a) => {
      acc[a.id] = a.name;
      return acc;
    }, {} as Record<string, string>);

    const byAgent = Array.from(agentTokens.entries())
      .map(([agentId, tokens]) => ({
        agentId,
        agentName: agentMap[agentId] || 'Unknown Agent',
        tokens,
      }))
      .sort((a, b) => b.tokens - a.tokens);

    return {
      totalTokens: estimatedTokens,
      inputTokens: Math.round(estimatedTokens * 0.4),
      outputTokens: Math.round(estimatedTokens * 0.6),
      estimatedCost,
      byModel: [
        { model: 'gpt-4o', tokens: estimatedTokens, cost: estimatedCost },
      ],
      byAgent,
    };
  }

  /**
   * COMPREHENSIVE AI USAGE REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: AIUsageSummary;
    calls: AICallsReport;
    minutes: AIMinutesReport;
    qualified: AIQualifiedLeads;
    transfers: AITransferReport;
    agentPerformance: AIAgentPerformance[];
    scriptPerformance: AIScriptPerformance[];
    tokenUsage: TokenUsageSummary;
  }> {
    const [summary, calls, minutes, qualified, transfers, agentPerformance, scriptPerformance, tokenUsage] =
      await Promise.all([
        this.getAIUsageSummary(filters),
        this.getAICallsReport(filters),
        this.getAIMinutesReport(filters),
        this.getAIQualifiedLeads(filters),
        this.getAITransferReport(filters),
        this.getAIAgentPerformance(filters),
        this.getAIScriptPerformance(filters),
        this.getTokenUsageSummary(filters),
      ]);

    return { summary, calls, minutes, qualified, transfers, agentPerformance, scriptPerformance, tokenUsage };
  }
}

export const aiUsageReportsService = new AIUsageReportsService();
