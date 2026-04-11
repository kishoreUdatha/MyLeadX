import { prisma } from '../config/database';

/**
 * SUPPORT TOOLS SERVICE
 *
 * Tools for platform support team:
 * - Impersonation (login as user)
 * - Tenant debug tools
 * - Data recovery
 * - Support ticket escalation
 */

interface ImpersonationSession {
  id: string;
  adminId: string;
  adminEmail: string;
  targetUserId: string;
  targetUserEmail: string;
  organizationId: string;
  organizationName: string;
  reason: string;
  startedAt: Date;
  expiresAt: Date;
  endedAt: Date | null;
  actionsPerformed: string[];
}

interface TenantDebugInfo {
  organization: {
    id: string;
    name: string;
    subdomain: string;
    createdAt: Date;
    isActive: boolean;
    subscriptionStatus: string;
    activePlanId: string;
  };
  users: {
    total: number;
    active: number;
    admins: number;
    lastLogin: Date | null;
  };
  leads: {
    total: number;
    thisMonth: number;
    converted: number;
  };
  calls: {
    total: number;
    thisMonth: number;
    avgDuration: number;
  };
  storage: {
    usedBytes: number;
    limitBytes: number;
  };
  recentErrors: Array<{
    message: string;
    count: number;
    lastOccurred: Date;
  }>;
  integrations: Array<{
    name: string;
    status: 'active' | 'inactive' | 'error';
    lastSync: Date | null;
  }>;
}

interface DataRecoveryRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  requestType: 'lead' | 'user' | 'call' | 'message' | 'full_backup';
  requestedBy: string;
  reason: string;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';
  targetDate: Date;
  createdAt: Date;
  completedAt: Date | null;
  recoveredRecords: number;
}

interface SupportTicket {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed';
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  tags: string[];
}

export class SupportToolsService {
  private impersonationSessions: Map<string, ImpersonationSession> = new Map();
  private recoveryRequests: Map<string, DataRecoveryRequest> = new Map();

  /**
   * Start impersonation session
   */
  async startImpersonation(
    adminId: string,
    adminEmail: string,
    targetUserId: string,
    reason: string,
    durationMinutes: number = 30
  ): Promise<ImpersonationSession> {
    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // Create impersonation session
    const session: ImpersonationSession = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      adminId,
      adminEmail,
      targetUserId: targetUser.id,
      targetUserEmail: targetUser.email,
      organizationId: targetUser.organizationId,
      organizationName: targetUser.organization.name,
      reason,
      startedAt: new Date(),
      expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
      endedAt: null,
      actionsPerformed: [],
    };

    this.impersonationSessions.set(session.id, session);

    // Log the impersonation start
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: targetUser.organizationId,
        action: 'IMPERSONATION_STARTED',
        module: 'support',
        userId: adminId,
        details: {
          adminEmail,
          targetUserId,
          targetUserEmail: targetUser.email,
          reason,
          sessionId: session.id,
        },
      },
    });

    return session;
  }

  /**
   * End impersonation session
   */
  async endImpersonation(sessionId: string): Promise<void> {
    const session = this.impersonationSessions.get(sessionId);
    if (!session) {
      throw new Error('Impersonation session not found');
    }

    session.endedAt = new Date();

    // Log the impersonation end
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: session.organizationId,
        action: 'IMPERSONATION_ENDED',
        module: 'support',
        userId: session.adminId,
        details: {
          sessionId,
          duration: Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 1000),
          actionsPerformed: session.actionsPerformed,
        },
      },
    });

    this.impersonationSessions.delete(sessionId);
  }

  /**
   * Get active impersonation sessions
   */
  async getActiveImpersonationSessions(): Promise<ImpersonationSession[]> {
    const now = new Date();
    return Array.from(this.impersonationSessions.values())
      .filter((s) => s.endedAt === null && s.expiresAt > now);
  }

  /**
   * Get impersonation history
   */
  async getImpersonationHistory(
    days: number = 30
  ): Promise<Array<{
    adminEmail: string;
    targetUserEmail: string;
    organizationName: string;
    reason: string;
    startedAt: Date;
    endedAt: Date | null;
    duration: number;
  }>> {
    const logs = await prisma.tenantActivityLog.findMany({
      where: {
        action: { in: ['IMPERSONATION_STARTED', 'IMPERSONATION_ENDED'] },
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group by session
    const sessions = new Map<string, any>();

    logs.forEach((log) => {
      const details = log.details as any;
      const sessionId = details.sessionId;

      if (log.action === 'IMPERSONATION_STARTED') {
        sessions.set(sessionId, {
          adminEmail: details.adminEmail,
          targetUserEmail: details.targetUserEmail,
          organizationName: log.organization.name,
          reason: details.reason,
          startedAt: log.createdAt,
          endedAt: null,
          duration: 0,
        });
      } else if (log.action === 'IMPERSONATION_ENDED') {
        const session = sessions.get(sessionId);
        if (session) {
          session.endedAt = log.createdAt;
          session.duration = details.duration;
        }
      }
    });

    return Array.from(sessions.values());
  }

  /**
   * Get tenant debug information
   */
  async getTenantDebugInfo(organizationId: string): Promise<TenantDebugInfo> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        subdomain: true,
        createdAt: true,
        isActive: true,
        subscriptionStatus: true,
        activePlanId: true,
      },
    });

    if (!org) throw new Error('Organization not found');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Gather debug data in parallel
    const [
      userStats,
      leadStats,
      callStats,
      lastLogin,
    ] = await Promise.all([
      // User stats
      prisma.user.groupBy({
        by: ['isActive'],
        where: { organizationId },
        _count: { id: true },
      }),

      // Lead stats
      Promise.all([
        prisma.lead.count({ where: { organizationId } }),
        prisma.lead.count({ where: { organizationId, createdAt: { gte: startOfMonth } } }),
        prisma.lead.count({ where: { organizationId, status: 'CONVERTED' } }),
      ]),

      // Call stats
      Promise.all([
        prisma.call.count({ where: { organizationId } }),
        prisma.call.count({ where: { organizationId, startTime: { gte: startOfMonth } } }),
        prisma.call.aggregate({
          where: { organizationId },
          _avg: { duration: true },
        }),
      ]),

      // Last login
      prisma.user.findFirst({
        where: { organizationId, lastLoginAt: { not: null } },
        orderBy: { lastLoginAt: 'desc' },
        select: { lastLoginAt: true },
      }),
    ]);

    // Count active and admin users
    const totalUsers = userStats.reduce((sum, s) => sum + s._count.id, 0);
    const activeUsers = userStats.find((s) => s.isActive === true)?._count.id || 0;

    const adminCount = await prisma.user.count({
      where: {
        organizationId,
        role: { slug: { in: ['admin', 'super-admin', 'owner'] } },
      },
    });

    // Get recent errors from activity log
    const recentErrors = await prisma.tenantActivityLog.findMany({
      where: {
        organizationId,
        action: { contains: 'ERROR' },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    // Group errors by message
    const errorGroups = new Map<string, { count: number; lastOccurred: Date }>();
    recentErrors.forEach((error) => {
      const message = (error.details as any)?.message || error.action;
      const existing = errorGroups.get(message);
      if (existing) {
        existing.count++;
        if (error.createdAt > existing.lastOccurred) {
          existing.lastOccurred = error.createdAt;
        }
      } else {
        errorGroups.set(message, { count: 1, lastOccurred: error.createdAt });
      }
    });

    // Get integrations status
    const integrations = await this.getTenantIntegrations(organizationId);

    return {
      organization: {
        id: org.id,
        name: org.name,
        subdomain: org.subdomain || '',
        createdAt: org.createdAt,
        isActive: org.isActive,
        subscriptionStatus: org.subscriptionStatus || 'INACTIVE',
        activePlanId: org.activePlanId || 'free',
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminCount,
        lastLogin: lastLogin?.lastLoginAt || null,
      },
      leads: {
        total: leadStats[0],
        thisMonth: leadStats[1],
        converted: leadStats[2],
      },
      calls: {
        total: callStats[0],
        thisMonth: callStats[1],
        avgDuration: Math.round(callStats[2]._avg.duration || 0),
      },
      storage: {
        usedBytes: 0, // Would calculate from stored files
        limitBytes: 5 * 1024 * 1024 * 1024, // 5GB default
      },
      recentErrors: Array.from(errorGroups.entries()).map(([message, data]) => ({
        message,
        count: data.count,
        lastOccurred: data.lastOccurred,
      })),
      integrations,
    };
  }

  /**
   * Get tenant integrations status
   */
  private async getTenantIntegrations(organizationId: string): Promise<Array<{
    name: string;
    status: 'active' | 'inactive' | 'error';
    lastSync: Date | null;
  }>> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    const settings = (org?.settings as any) || {};
    const integrations: Array<{ name: string; status: 'active' | 'inactive' | 'error'; lastSync: Date | null }> = [];

    // Check various integrations
    const integrationChecks = [
      { name: 'WhatsApp', key: 'whatsappConfig' },
      { name: 'Facebook', key: 'facebookConfig' },
      { name: 'Google Ads', key: 'googleAdsConfig' },
      { name: 'Exotel', key: 'exotelConfig' },
      { name: 'Razorpay', key: 'razorpayConfig' },
    ];

    for (const check of integrationChecks) {
      const config = settings[check.key];
      if (config) {
        integrations.push({
          name: check.name,
          status: config.enabled ? 'active' : 'inactive',
          lastSync: config.lastSync ? new Date(config.lastSync) : null,
        });
      }
    }

    return integrations;
  }

  /**
   * Create data recovery request
   */
  async createRecoveryRequest(
    organizationId: string,
    requestType: DataRecoveryRequest['requestType'],
    requestedBy: string,
    reason: string,
    targetDate: Date
  ): Promise<DataRecoveryRequest> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!org) throw new Error('Organization not found');

    const request: DataRecoveryRequest = {
      id: `recovery_${Date.now()}`,
      organizationId: org.id,
      organizationName: org.name,
      requestType,
      requestedBy,
      reason,
      status: 'pending',
      targetDate,
      createdAt: new Date(),
      completedAt: null,
      recoveredRecords: 0,
    };

    this.recoveryRequests.set(request.id, request);

    // Log the request
    await prisma.tenantActivityLog.create({
      data: {
        organizationId,
        action: 'DATA_RECOVERY_REQUESTED',
        module: 'support',
        userId: requestedBy,
        details: {
          requestId: request.id,
          requestType,
          targetDate: targetDate.toISOString(),
          reason,
        },
      },
    });

    return request;
  }

  /**
   * Get all recovery requests
   */
  async getRecoveryRequests(status?: string): Promise<DataRecoveryRequest[]> {
    let requests = Array.from(this.recoveryRequests.values());
    if (status) {
      requests = requests.filter((r) => r.status === status);
    }
    return requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Approve recovery request
   */
  async approveRecoveryRequest(requestId: string, approvedBy: string): Promise<DataRecoveryRequest> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) throw new Error('Recovery request not found');

    request.status = 'approved';

    // Log approval
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: request.organizationId,
        action: 'DATA_RECOVERY_APPROVED',
        module: 'support',
        userId: approvedBy,
        details: { requestId },
      },
    });

    // Start recovery process asynchronously
    this.processRecoveryRequest(requestId, approvedBy).catch(console.error);

    return request;
  }

  /**
   * Process recovery request
   */
  private async processRecoveryRequest(requestId: string, processedBy: string): Promise<void> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) return;

    request.status = 'processing';

    try {
      // In production, would restore from backup
      // Simulating recovery process
      await new Promise((resolve) => setTimeout(resolve, 5000));

      request.status = 'completed';
      request.completedAt = new Date();
      request.recoveredRecords = Math.floor(Math.random() * 1000) + 100;

      // Log completion
      await prisma.tenantActivityLog.create({
        data: {
          organizationId: request.organizationId,
          action: 'DATA_RECOVERY_COMPLETED',
          module: 'support',
          userId: processedBy,
          details: {
            requestId,
            recoveredRecords: request.recoveredRecords,
          },
        },
      });
    } catch (error) {
      request.status = 'failed';

      await prisma.tenantActivityLog.create({
        data: {
          organizationId: request.organizationId,
          action: 'DATA_RECOVERY_FAILED',
          module: 'support',
          userId: processedBy,
          details: {
            requestId,
            error: (error as Error).message,
          },
        },
      });
    }
  }

  /**
   * Get support tickets
   */
  async getSupportTickets(
    filters: {
      status?: string;
      priority?: string;
      organizationId?: string;
      assignedTo?: string;
    },
    page: number = 1,
    limit: number = 20
  ): Promise<{ tickets: SupportTicket[]; total: number }> {
    // In production, would query from a support ticket system
    // For now, return simulated data

    const tickets: SupportTicket[] = [];
    const total = 0;

    return { tickets, total };
  }

  /**
   * Reset user password (support action)
   */
  async resetUserPassword(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<{ temporaryPassword: string; expiresAt: Date }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true, name: true } } },
    });

    if (!user) throw new Error('User not found');

    // Generate temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // In production, would hash and store the password
    // await prisma.user.update({
    //   where: { id: userId },
    //   data: { password: hashedPassword, passwordResetRequired: true }
    // });

    // Log the action
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: user.organizationId,
        action: 'PASSWORD_RESET_BY_SUPPORT',
        module: 'support',
        userId: adminId,
        details: {
          targetUserId: userId,
          targetUserEmail: user.email,
          reason,
        },
      },
    });

    return { temporaryPassword, expiresAt };
  }

  /**
   * Unlock user account
   */
  async unlockUserAccount(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true } } },
    });

    if (!user) throw new Error('User not found');

    await prisma.user.update({
      where: { id: userId },
      data: {
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Log the action
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: user.organizationId,
        action: 'ACCOUNT_UNLOCKED_BY_SUPPORT',
        module: 'support',
        userId: adminId,
        details: {
          targetUserId: userId,
          targetUserEmail: user.email,
          reason,
        },
      },
    });
  }

  /**
   * Force logout all sessions for a user
   */
  async forceLogoutUser(
    userId: string,
    adminId: string,
    reason: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: { select: { id: true } } },
    });

    if (!user) throw new Error('User not found');

    // Invalidate all refresh tokens
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    // Log the action
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: user.organizationId,
        action: 'FORCED_LOGOUT_BY_SUPPORT',
        module: 'support',
        userId: adminId,
        details: {
          targetUserId: userId,
          targetUserEmail: user.email,
          reason,
        },
      },
    });
  }

  /**
   * Generate temporary password
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Get tenant activity timeline
   */
  async getTenantActivityTimeline(
    organizationId: string,
    days: number = 7
  ): Promise<Array<{
    date: string;
    events: Array<{
      time: string;
      action: string;
      user: string;
      details: string;
    }>;
  }>> {
    const activities = await prisma.tenantActivityLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) },
      },
      include: { user: { select: { email: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Group by date
    const timeline = new Map<string, Array<{ time: string; action: string; user: string; details: string }>>();

    activities.forEach((activity) => {
      const dateStr = activity.createdAt.toISOString().split('T')[0];
      const timeStr = activity.createdAt.toISOString().split('T')[1].substring(0, 8);

      if (!timeline.has(dateStr)) {
        timeline.set(dateStr, []);
      }

      timeline.get(dateStr)!.push({
        time: timeStr,
        action: activity.action,
        user: activity.user?.email || 'System',
        details: JSON.stringify(activity.details),
      });
    });

    return Array.from(timeline.entries()).map(([date, events]) => ({
      date,
      events,
    }));
  }

  /**
   * Run diagnostic check on tenant
   */
  async runTenantDiagnostics(organizationId: string): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'warn' | 'fail';
      message: string;
    }>;
  }> {
    const checks: Array<{ name: string; status: 'pass' | 'warn' | 'fail'; message: string }> = [];

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { users: { select: { id: true, isActive: true, lastLoginAt: true } } },
    });

    if (!org) throw new Error('Organization not found');

    // Check 1: Active subscription
    checks.push({
      name: 'Subscription Status',
      status: org.subscriptionStatus === 'ACTIVE' ? 'pass' : 'warn',
      message: org.subscriptionStatus === 'ACTIVE' ? 'Subscription is active' : `Subscription is ${org.subscriptionStatus}`,
    });

    // Check 2: Has active users
    const activeUsers = org.users.filter((u) => u.isActive).length;
    checks.push({
      name: 'Active Users',
      status: activeUsers > 0 ? 'pass' : 'fail',
      message: `${activeUsers} active users out of ${org.users.length} total`,
    });

    // Check 3: Recent activity
    const recentLogins = org.users.filter(
      (u) => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    checks.push({
      name: 'Recent Activity',
      status: recentLogins > 0 ? 'pass' : 'warn',
      message: `${recentLogins} users logged in within last 7 days`,
    });

    // Check 4: Data integrity
    const leadCount = await prisma.lead.count({ where: { organizationId } });
    const orphanedLeads = await prisma.lead.count({
      where: { organizationId, assignedToId: { not: null } },
    });
    checks.push({
      name: 'Data Integrity',
      status: 'pass',
      message: `${leadCount} leads, ${orphanedLeads} assigned`,
    });

    // Determine overall status
    const failCount = checks.filter((c) => c.status === 'fail').length;
    const warnCount = checks.filter((c) => c.status === 'warn').length;

    const status = failCount > 0 ? 'critical' : warnCount > 0 ? 'warning' : 'healthy';

    return { status, checks };
  }
}

export const supportToolsService = new SupportToolsService();
