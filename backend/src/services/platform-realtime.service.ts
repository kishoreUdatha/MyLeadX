import { prisma } from '../config/database';
import { websocketService } from './websocket.service';

/**
 * PLATFORM REAL-TIME MONITORING SERVICE
 *
 * Provides live monitoring capabilities for super admins:
 * - Active users right now
 * - Ongoing calls/messages
 * - System health metrics
 * - Live tenant activity
 */

interface ActiveUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  organizationName: string;
  lastActivityAt: Date;
  currentPage?: string;
}

interface LiveActivity {
  type: 'call' | 'message' | 'login' | 'lead_created' | 'payment';
  tenantId: string;
  tenantName: string;
  userId?: string;
  userName?: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface SystemHealth {
  database: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    connections: number;
  };
  redis: {
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    memoryUsage: number;
  };
  api: {
    status: 'healthy' | 'degraded' | 'down';
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  };
  websocket: {
    status: 'healthy' | 'degraded' | 'down';
    activeConnections: number;
  };
}

export class PlatformRealtimeService {
  private activityBuffer: LiveActivity[] = [];
  private readonly MAX_BUFFER_SIZE = 100;

  /**
   * Get currently active users across all tenants
   */
  async getActiveUsers(minutesThreshold: number = 15): Promise<{
    total: number;
    byTenant: Array<{ tenantId: string; tenantName: string; count: number }>;
    users: ActiveUser[];
  }> {
    const threshold = new Date(Date.now() - minutesThreshold * 60 * 1000);

    // Get users with recent activity
    const activeUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        lastLoginAt: { gte: threshold },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        organizationId: true,
        lastLoginAt: true,
        organization: {
          select: { name: true },
        },
      },
      orderBy: { lastLoginAt: 'desc' },
      take: 100,
    });

    // Group by tenant
    const tenantMap = new Map<string, { name: string; count: number }>();
    activeUsers.forEach((user) => {
      const existing = tenantMap.get(user.organizationId);
      if (existing) {
        existing.count++;
      } else {
        tenantMap.set(user.organizationId, {
          name: user.organization.name,
          count: 1,
        });
      }
    });

    const byTenant = Array.from(tenantMap.entries()).map(([tenantId, data]) => ({
      tenantId,
      tenantName: data.name,
      count: data.count,
    }));

    return {
      total: activeUsers.length,
      byTenant: byTenant.sort((a, b) => b.count - a.count),
      users: activeUsers.map((u) => ({
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        organizationId: u.organizationId,
        organizationName: u.organization.name,
        lastActivityAt: u.lastLoginAt!,
      })),
    };
  }

  /**
   * Get ongoing calls across all tenants
   */
  async getOngoingCalls(): Promise<{
    total: number;
    byTenant: Array<{ tenantId: string; tenantName: string; count: number }>;
    calls: Array<{
      id: string;
      tenantId: string;
      tenantName: string;
      callerNumber: string;
      status: string;
      startedAt: Date;
      duration: number;
    }>;
  }> {
    const ongoingCalls = await prisma.call.findMany({
      where: {
        status: { in: ['IN_PROGRESS', 'RINGING', 'CONNECTED'] },
      },
      select: {
        id: true,
        organizationId: true,
        phoneNumber: true,
        status: true,
        createdAt: true,
        duration: true,
        organization: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const tenantMap = new Map<string, { name: string; count: number }>();
    ongoingCalls.forEach((call) => {
      const existing = tenantMap.get(call.organizationId);
      if (existing) {
        existing.count++;
      } else {
        tenantMap.set(call.organizationId, {
          name: call.organization.name,
          count: 1,
        });
      }
    });

    return {
      total: ongoingCalls.length,
      byTenant: Array.from(tenantMap.entries()).map(([tenantId, data]) => ({
        tenantId,
        tenantName: data.name,
        count: data.count,
      })),
      calls: ongoingCalls.map((c) => ({
        id: c.id,
        tenantId: c.organizationId,
        tenantName: c.organization.name,
        callerNumber: c.phoneNumber || 'Unknown',
        status: c.status,
        startedAt: c.createdAt,
        duration: c.duration || 0,
      })),
    };
  }

  /**
   * Get real-time message activity
   */
  async getMessageActivity(minutesBack: number = 60): Promise<{
    total: number;
    byType: { sms: number; whatsapp: number; email: number };
    byTenant: Array<{ tenantId: string; tenantName: string; count: number }>;
  }> {
    const since = new Date(Date.now() - minutesBack * 60 * 1000);

    const [smsCount, whatsappCount, emailCount] = await Promise.all([
      prisma.smsLog.count({ where: { createdAt: { gte: since } } }),
      prisma.whatsappLog.count({ where: { createdAt: { gte: since } } }),
      prisma.emailLog.count({ where: { createdAt: { gte: since } } }),
    ]);

    // Get by tenant
    const smsByTenant = await prisma.smsLog.groupBy({
      by: ['organizationId'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    });

    const tenantIds = smsByTenant.map((s) => s.organizationId);
    const tenants = await prisma.organization.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });

    const tenantNameMap = new Map(tenants.map((t) => [t.id, t.name]));

    return {
      total: smsCount + whatsappCount + emailCount,
      byType: { sms: smsCount, whatsapp: whatsappCount, email: emailCount },
      byTenant: smsByTenant.map((s) => ({
        tenantId: s.organizationId,
        tenantName: tenantNameMap.get(s.organizationId) || 'Unknown',
        count: s._count.id,
      })),
    };
  }

  /**
   * Get system health metrics
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const startTime = Date.now();

    // Check database health
    let dbStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
    let dbResponseTime = 0;
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbResponseTime = Date.now() - dbStart;
      if (dbResponseTime > 1000) dbStatus = 'degraded';
    } catch {
      dbStatus = 'down';
    }

    // Get WebSocket connections
    const wsConnections = websocketService.getConnectionCount?.() || 0;

    // Calculate API metrics (simplified - would need actual metrics collection)
    const apiMetrics = await this.getApiMetrics();

    return {
      database: {
        status: dbStatus,
        responseTime: dbResponseTime,
        connections: 0, // Would need pg pool stats
      },
      redis: {
        status: 'healthy', // Would need actual Redis check
        responseTime: 0,
        memoryUsage: 0,
      },
      api: {
        status: apiMetrics.errorRate > 5 ? 'degraded' : 'healthy',
        requestsPerMinute: apiMetrics.requestsPerMinute,
        averageResponseTime: apiMetrics.averageResponseTime,
        errorRate: apiMetrics.errorRate,
      },
      websocket: {
        status: 'healthy',
        activeConnections: wsConnections,
      },
    };
  }

  /**
   * Get API metrics (simplified)
   */
  private async getApiMetrics(): Promise<{
    requestsPerMinute: number;
    averageResponseTime: number;
    errorRate: number;
  }> {
    // In production, this would read from actual metrics collection
    // For now, return simulated healthy metrics
    return {
      requestsPerMinute: Math.floor(Math.random() * 500) + 100,
      averageResponseTime: Math.floor(Math.random() * 200) + 50,
      errorRate: Math.random() * 2,
    };
  }

  /**
   * Get live activity feed
   */
  async getLiveActivityFeed(limit: number = 50): Promise<LiveActivity[]> {
    // Get recent activities from various sources
    const since = new Date(Date.now() - 60 * 60 * 1000); // Last hour

    const [recentLogins, recentLeads, recentPayments] = await Promise.all([
      // Recent logins
      prisma.user.findMany({
        where: { lastLoginAt: { gte: since } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          lastLoginAt: true,
          organizationId: true,
          organization: { select: { name: true } },
        },
        orderBy: { lastLoginAt: 'desc' },
        take: 20,
      }),

      // Recent leads
      prisma.lead.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          firstName: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Recent payments
      prisma.payment.findMany({
        where: { createdAt: { gte: since } },
        select: {
          id: true,
          amount: true,
          organizationId: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const activities: LiveActivity[] = [];

    recentLogins.forEach((login) => {
      activities.push({
        type: 'login',
        tenantId: login.organizationId,
        tenantName: login.organization.name,
        userId: login.id,
        userName: `${login.firstName} ${login.lastName}`,
        details: {},
        timestamp: login.lastLoginAt!,
      });
    });

    recentLeads.forEach((lead) => {
      activities.push({
        type: 'lead_created',
        tenantId: lead.organizationId,
        tenantName: lead.organization.name,
        details: { leadName: lead.firstName },
        timestamp: lead.createdAt,
      });
    });

    recentPayments.forEach((payment) => {
      activities.push({
        type: 'payment',
        tenantId: payment.organizationId,
        tenantName: payment.organization.name,
        details: { amount: payment.amount },
        timestamp: payment.createdAt,
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get platform overview metrics
   */
  async getPlatformOverview(): Promise<{
    activeUsersNow: number;
    ongoingCalls: number;
    messagesLastHour: number;
    leadsToday: number;
    revenueToday: number;
    newTenantsToday: number;
    systemStatus: 'operational' | 'degraded' | 'outage';
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);
    const last15Min = new Date(Date.now() - 15 * 60 * 1000);

    const [
      activeUsers,
      ongoingCalls,
      messagesLastHour,
      leadsToday,
      paymentsToday,
      newTenants,
    ] = await Promise.all([
      prisma.user.count({
        where: { isActive: true, lastLoginAt: { gte: last15Min } },
      }),
      prisma.call.count({
        where: { status: { in: ['IN_PROGRESS', 'RINGING', 'CONNECTED'] } },
      }),
      prisma.message.count({
        where: { createdAt: { gte: lastHour } },
      }),
      prisma.lead.count({
        where: { createdAt: { gte: today } },
      }),
      prisma.payment.aggregate({
        where: { createdAt: { gte: today }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.organization.count({
        where: { createdAt: { gte: today } },
      }),
    ]);

    const health = await this.getSystemHealth();
    const systemStatus =
      health.database.status === 'down' || health.api.status === 'down'
        ? 'outage'
        : health.database.status === 'degraded' || health.api.status === 'degraded'
        ? 'degraded'
        : 'operational';

    return {
      activeUsersNow: activeUsers,
      ongoingCalls,
      messagesLastHour,
      leadsToday,
      revenueToday: Number(paymentsToday._sum.amount) || 0,
      newTenantsToday: newTenants,
      systemStatus,
    };
  }
}

export const platformRealtimeService = new PlatformRealtimeService();
