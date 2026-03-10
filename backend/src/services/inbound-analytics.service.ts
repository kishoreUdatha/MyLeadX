import { prisma } from '../config/database';
import { Prisma, InboundCallStatus } from '@prisma/client';

interface DateRangeFilter {
  organizationId: string;
  dateFrom?: Date;
  dateTo?: Date;
  queueId?: string;
  ivrFlowId?: string;
}

interface CallVolumeData {
  date: string;
  total: number;
  answered: number;
  abandoned: number;
  voicemail: number;
}

interface HourlyDistribution {
  hour: number;
  count: number;
}

interface AgentPerformance {
  userId: string;
  userName: string;
  totalCalls: number;
  avgHandleTime: number;
  avgTalkTime: number;
  avgWrapUpTime: number;
}

export class InboundAnalyticsService {
  // === Call Volume Analytics ===
  async getCallVolume(filter: DateRangeFilter): Promise<CallVolumeData[]> {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    if (filter.queueId) {
      where.queueId = filter.queueId;
    }

    if (filter.ivrFlowId) {
      where.ivrFlowId = filter.ivrFlowId;
    }

    // Group by date
    const calls = await prisma.inboundCallLog.findMany({
      where,
      select: {
        createdAt: true,
        status: true,
      },
    });

    // Process into daily data
    const dailyData: Record<string, CallVolumeData> = {};

    calls.forEach(call => {
      const date = call.createdAt.toISOString().split('T')[0];

      if (!dailyData[date]) {
        dailyData[date] = {
          date,
          total: 0,
          answered: 0,
          abandoned: 0,
          voicemail: 0,
        };
      }

      dailyData[date].total++;

      if (call.status === 'COMPLETED') {
        dailyData[date].answered++;
      } else if (call.status === 'ABANDONED') {
        dailyData[date].abandoned++;
      } else if (call.status === 'VOICEMAIL') {
        dailyData[date].voicemail++;
      }
    });

    return Object.values(dailyData).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
  }

  async getHourlyDistribution(filter: DateRangeFilter): Promise<HourlyDistribution[]> {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    const calls = await prisma.inboundCallLog.findMany({
      where,
      select: { createdAt: true },
    });

    const hourlyData: Record<number, number> = {};

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyData[i] = 0;
    }

    calls.forEach(call => {
      const hour = call.createdAt.getHours();
      hourlyData[hour]++;
    });

    return Object.entries(hourlyData).map(([hour, count]) => ({
      hour: parseInt(hour),
      count,
    }));
  }

  // === Queue Metrics ===
  async getQueueMetrics(filter: DateRangeFilter) {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
      queueId: { not: null },
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    if (filter.queueId) {
      where.queueId = filter.queueId;
    }

    const [
      totalCalls,
      answeredCalls,
      abandonedCalls,
      aggregates,
    ] = await Promise.all([
      prisma.inboundCallLog.count({ where }),
      prisma.inboundCallLog.count({
        where: { ...where, status: 'COMPLETED' }
      }),
      prisma.inboundCallLog.count({
        where: { ...where, status: 'ABANDONED' }
      }),
      prisma.inboundCallLog.aggregate({
        where,
        _avg: {
          queueWaitTime: true,
          talkTime: true,
        },
      }),
    ]);

    const answerRate = totalCalls > 0
      ? Math.round((answeredCalls / totalCalls) * 100)
      : 0;

    const abandonRate = totalCalls > 0
      ? Math.round((abandonedCalls / totalCalls) * 100)
      : 0;

    return {
      totalCalls,
      answeredCalls,
      abandonedCalls,
      answerRate,
      abandonRate,
      avgWaitTime: Math.round(aggregates._avg.queueWaitTime ?? 0),
      avgTalkTime: Math.round(aggregates._avg.talkTime ?? 0),
    };
  }

  async getQueueServiceLevels(organizationId: string) {
    const queues = await prisma.callQueue.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        slaSeconds: true,
        serviceLevel: true,
        totalCalls: true,
        answeredCalls: true,
        abandonedCalls: true,
        avgWaitTime: true,
        avgHandleTime: true,
      },
    });

    return queues;
  }

  // === Agent Performance ===
  async getAgentPerformance(filter: DateRangeFilter): Promise<AgentPerformance[]> {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
      answeredByUserId: { not: null },
      status: 'COMPLETED',
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    const calls = await prisma.inboundCallLog.findMany({
      where,
      select: {
        answeredByUserId: true,
        talkTime: true,
        wrapUpTime: true,
        duration: true,
      },
    });

    // Group by agent
    const agentData: Record<string, {
      totalCalls: number;
      totalHandleTime: number;
      totalTalkTime: number;
      totalWrapUpTime: number;
    }> = {};

    calls.forEach(call => {
      if (!call.answeredByUserId) return;

      if (!agentData[call.answeredByUserId]) {
        agentData[call.answeredByUserId] = {
          totalCalls: 0,
          totalHandleTime: 0,
          totalTalkTime: 0,
          totalWrapUpTime: 0,
        };
      }

      agentData[call.answeredByUserId].totalCalls++;
      agentData[call.answeredByUserId].totalHandleTime += call.duration ?? 0;
      agentData[call.answeredByUserId].totalTalkTime += call.talkTime ?? 0;
      agentData[call.answeredByUserId].totalWrapUpTime += call.wrapUpTime ?? 0;
    });

    // Get user names
    const userIds = Object.keys(agentData);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return userIds.map(userId => ({
      userId,
      userName: userMap.get(userId) ?? 'Unknown',
      totalCalls: agentData[userId].totalCalls,
      avgHandleTime: Math.round(
        agentData[userId].totalHandleTime / agentData[userId].totalCalls
      ),
      avgTalkTime: Math.round(
        agentData[userId].totalTalkTime / agentData[userId].totalCalls
      ),
      avgWrapUpTime: Math.round(
        agentData[userId].totalWrapUpTime / agentData[userId].totalCalls
      ),
    })).sort((a, b) => b.totalCalls - a.totalCalls);
  }

  // === Live Dashboard ===
  async getLiveDashboard(organizationId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      // Today's stats
      todayCalls,
      todayAnswered,
      todayAbandoned,
      todayVoicemail,

      // Current queue status
      currentInQueue,
      currentInProgress,

      // Active agents
      availableAgents,
      busyAgents,

      // Pending callbacks
      pendingCallbacks,

      // New voicemails
      newVoicemails,
    ] = await Promise.all([
      prisma.inboundCallLog.count({
        where: { organizationId, createdAt: { gte: todayStart } }
      }),
      prisma.inboundCallLog.count({
        where: { organizationId, createdAt: { gte: todayStart }, status: 'COMPLETED' }
      }),
      prisma.inboundCallLog.count({
        where: { organizationId, createdAt: { gte: todayStart }, status: 'ABANDONED' }
      }),
      prisma.inboundCallLog.count({
        where: { organizationId, createdAt: { gte: todayStart }, status: 'VOICEMAIL' }
      }),

      prisma.queueEntry.count({
        where: {
          queue: { organizationId },
          status: 'WAITING',
        },
      }),
      prisma.inboundCallLog.count({
        where: { organizationId, status: 'IN_PROGRESS' }
      }),

      prisma.queueMember.count({
        where: {
          queue: { organizationId },
          status: 'AVAILABLE',
          isActive: true,
        },
      }),
      prisma.queueMember.count({
        where: {
          queue: { organizationId },
          status: 'ON_CALL',
          isActive: true,
        },
      }),

      prisma.callbackRequest.count({
        where: {
          organizationId,
          status: { in: ['PENDING', 'SCHEDULED'] },
        },
      }),

      prisma.voicemail.count({
        where: { organizationId, status: 'NEW' }
      }),
    ]);

    return {
      today: {
        totalCalls: todayCalls,
        answered: todayAnswered,
        abandoned: todayAbandoned,
        voicemail: todayVoicemail,
        answerRate: todayCalls > 0
          ? Math.round((todayAnswered / todayCalls) * 100)
          : 0,
      },
      current: {
        inQueue: currentInQueue,
        inProgress: currentInProgress,
        availableAgents,
        busyAgents,
      },
      actionItems: {
        pendingCallbacks,
        newVoicemails,
      },
    };
  }

  // === IVR Analytics ===
  async getIvrMetrics(filter: DateRangeFilter) {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
      ivrFlowId: { not: null },
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    if (filter.ivrFlowId) {
      where.ivrFlowId = filter.ivrFlowId;
    }

    const calls = await prisma.inboundCallLog.findMany({
      where,
      select: {
        ivrFlowId: true,
        ivrPath: true,
        status: true,
        duration: true,
      },
    });

    // Analyze IVR paths
    const pathAnalysis: Record<string, number> = {};

    calls.forEach(call => {
      const path = call.ivrPath as unknown as Array<{ nodeId: string; input?: string }>;
      if (Array.isArray(path)) {
        const pathKey = path.map(p => p.nodeId).join(' > ');
        pathAnalysis[pathKey] = (pathAnalysis[pathKey] || 0) + 1;
      }
    });

    // Sort by frequency
    const topPaths = Object.entries(pathAnalysis)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    return {
      totalCalls: calls.length,
      completionRate: calls.length > 0
        ? Math.round(
            (calls.filter(c => c.status === 'COMPLETED').length / calls.length) * 100
          )
        : 0,
      topPaths,
    };
  }

  // === Call Outcomes ===
  async getCallOutcomes(filter: DateRangeFilter) {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
      outcome: { not: null },
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    const results = await prisma.inboundCallLog.groupBy({
      by: ['outcome'],
      where,
      _count: { id: true },
    });

    return results.reduce((acc, item) => {
      if (item.outcome) {
        acc[item.outcome] = item._count.id;
      }
      return acc;
    }, {} as Record<string, number>);
  }

  // === Export Data ===
  async exportCallLogs(filter: DateRangeFilter) {
    const where: Prisma.InboundCallLogWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) where.createdAt.gte = filter.dateFrom;
      if (filter.dateTo) where.createdAt.lte = filter.dateTo;
    }

    return prisma.inboundCallLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        ivrFlow: { select: { name: true } },
        queue: { select: { name: true } },
      },
    });
  }
}

export const inboundAnalyticsService = new InboundAnalyticsService();
