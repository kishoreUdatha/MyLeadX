import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { MonitoringMode, Prisma } from '@prisma/client';

interface StartMonitoringInput {
  organizationId: string;
  supervisorId: string;
  agentUserId: string;
  inboundCallId?: string;
  outboundCallId?: string;
  mode?: MonitoringMode;
}

export class CallMonitoringService {
  // === Start Monitoring ===
  async startMonitoring(input: StartMonitoringInput) {
    // Verify there's an active call to monitor
    if (input.inboundCallId) {
      const call = await prisma.inboundCallLog.findFirst({
        where: {
          id: input.inboundCallId,
          organizationId: input.organizationId,
          status: 'IN_PROGRESS',
        },
      });

      if (!call) {
        throw new NotFoundError('No active inbound call found');
      }
    } else if (input.outboundCallId) {
      const call = await prisma.outboundCall.findFirst({
        where: {
          id: input.outboundCallId,
          status: 'IN_PROGRESS',
        },
      });

      if (!call) {
        throw new NotFoundError('No active outbound call found');
      }
    } else {
      throw new Error('Either inboundCallId or outboundCallId is required');
    }

    // Check if supervisor already monitoring this call
    const existingSession = await prisma.callMonitoringSession.findFirst({
      where: {
        supervisorId: input.supervisorId,
        endedAt: null,
      },
    });

    if (existingSession) {
      // End previous session
      await this.stopMonitoring(existingSession.id);
    }

    return prisma.callMonitoringSession.create({
      data: {
        organizationId: input.organizationId,
        supervisorId: input.supervisorId,
        agentUserId: input.agentUserId,
        inboundCallId: input.inboundCallId,
        outboundCallId: input.outboundCallId,
        mode: input.mode ?? MonitoringMode.LISTEN,
      },
    });
  }

  // === Change Monitoring Mode ===
  async startWhisper(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.WHISPER },
    });
  }

  async bargeIn(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.BARGE },
    });
  }

  async switchToListen(sessionId: string) {
    const session = await this.getActiveSession(sessionId);

    return prisma.callMonitoringSession.update({
      where: { id: session.id },
      data: { mode: MonitoringMode.LISTEN },
    });
  }

  // === Stop Monitoring ===
  async stopMonitoring(sessionId: string, notes?: string) {
    const session = await prisma.callMonitoringSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundError('Monitoring session not found');
    }

    return prisma.callMonitoringSession.update({
      where: { id: sessionId },
      data: {
        endedAt: new Date(),
        notes,
      },
    });
  }

  // === Get Active Sessions ===
  async getActiveSession(sessionId: string) {
    const session = await prisma.callMonitoringSession.findFirst({
      where: {
        id: sessionId,
        endedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundError('Active monitoring session not found');
    }

    return session;
  }

  async getActiveSessions(organizationId: string) {
    return prisma.callMonitoringSession.findMany({
      where: {
        organizationId,
        endedAt: null,
      },
      orderBy: { startedAt: 'desc' },
    });
  }

  async getSupervisorSessions(supervisorId: string) {
    return prisma.callMonitoringSession.findMany({
      where: {
        supervisorId,
        endedAt: null,
      },
    });
  }

  async getAgentBeingMonitored(agentUserId: string) {
    return prisma.callMonitoringSession.findFirst({
      where: {
        agentUserId,
        endedAt: null,
      },
    });
  }

  // === Get Active Calls for Monitoring ===
  async getActiveCallsForMonitoring(organizationId: string) {
    const [inboundCalls, outboundCalls] = await Promise.all([
      prisma.inboundCallLog.findMany({
        where: {
          organizationId,
          status: 'IN_PROGRESS',
        },
        select: {
          id: true,
          callerNumber: true,
          answeredByUserId: true,
          startedAt: true,
          duration: true,
        },
      }),
      prisma.outboundCall.findMany({
        where: {
          campaign: { organizationId },
          status: 'IN_PROGRESS',
        },
        select: {
          id: true,
          phoneNumber: true,
          agentId: true,
          startedAt: true,
          duration: true,
        },
      }),
    ]);

    // Get user details for agents
    const agentIds = [
      ...inboundCalls.map(c => c.answeredByUserId).filter(Boolean),
      // Outbound calls use voice agent IDs, not user IDs
    ] as string[];

    const users = await prisma.user.findMany({
      where: { id: { in: agentIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = new Map(users.map(u => [u.id, `${u.firstName} ${u.lastName}`]));

    return {
      inbound: inboundCalls.map(call => ({
        id: call.id,
        type: 'inbound' as const,
        phoneNumber: call.callerNumber,
        agentUserId: call.answeredByUserId,
        agentName: call.answeredByUserId ? userMap.get(call.answeredByUserId) : undefined,
        startedAt: call.startedAt,
        duration: call.duration,
      })),
      outbound: outboundCalls.map(call => ({
        id: call.id,
        type: 'outbound' as const,
        phoneNumber: call.phoneNumber,
        agentId: call.agentId,
        startedAt: call.startedAt,
        duration: call.duration,
      })),
    };
  }

  // === Session History ===
  async getSessionHistory(
    organizationId: string,
    supervisorId?: string,
    agentUserId?: string,
    page = 1,
    limit = 20
  ) {
    const where: Prisma.CallMonitoringSessionWhereInput = {
      organizationId,
      endedAt: { not: null },
    };

    if (supervisorId) {
      where.supervisorId = supervisorId;
    }

    if (agentUserId) {
      where.agentUserId = agentUserId;
    }

    const [sessions, total] = await Promise.all([
      prisma.callMonitoringSession.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.callMonitoringSession.count({ where }),
    ]);

    return { sessions, total, page, limit };
  }

  // === Stats ===
  async getMonitoringStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.CallMonitoringSessionWhereInput = {
      organizationId,
    };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [totalSessions, byMode] = await Promise.all([
      prisma.callMonitoringSession.count({ where }),
      prisma.callMonitoringSession.groupBy({
        by: ['mode'],
        where,
        _count: { id: true },
      }),
    ]);

    const modeStats = byMode.reduce((acc, item) => {
      acc[item.mode] = item._count.id;
      return acc;
    }, {} as Record<MonitoringMode, number>);

    return {
      totalSessions,
      byMode: modeStats,
    };
  }
}

export const callMonitoringService = new CallMonitoringService();
