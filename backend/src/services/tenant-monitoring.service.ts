import { prisma } from '../config/database';

/**
 * Tenant Monitoring Service
 * Tracks tenant activity, usage, and subscription changes for platform monitoring
 */
class TenantMonitoringService {
  /**
   * Log tenant activity
   */
  async logActivity(data: {
    organizationId: string;
    userId?: string;
    action: string;
    module: string;
    description?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return prisma.tenantActivityLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        module: data.module,
        description: data.description,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });
  }

  /**
   * Update daily usage metrics
   */
  async updateDailyUsage(
    organizationId: string,
    metrics: {
      leadsCreated?: number;
      leadsConverted?: number;
      callsCount?: number;
      aiCallsCount?: number;
      manualCallsCount?: number;
      voiceMinutesUsed?: number;
      smsCount?: number;
      whatsappCount?: number;
      emailsCount?: number;
      apiRequestsCount?: number;
      storageUsedMb?: number;
    }
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get current user counts
    const [usersCount, activeUsersCount] = await Promise.all([
      prisma.user.count({ where: { organizationId, isActive: true } }),
      prisma.user.count({
        where: {
          organizationId,
          isActive: true,
          lastLoginAt: { gte: today },
        },
      }),
    ]);

    return prisma.tenantUsageDaily.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
      create: {
        organizationId,
        date: today,
        usersCount,
        activeUsersCount,
        ...metrics,
      },
      update: {
        usersCount,
        activeUsersCount,
        leadsCreated: metrics.leadsCreated !== undefined
          ? { increment: metrics.leadsCreated }
          : undefined,
        leadsConverted: metrics.leadsConverted !== undefined
          ? { increment: metrics.leadsConverted }
          : undefined,
        callsCount: metrics.callsCount !== undefined
          ? { increment: metrics.callsCount }
          : undefined,
        aiCallsCount: metrics.aiCallsCount !== undefined
          ? { increment: metrics.aiCallsCount }
          : undefined,
        manualCallsCount: metrics.manualCallsCount !== undefined
          ? { increment: metrics.manualCallsCount }
          : undefined,
        voiceMinutesUsed: metrics.voiceMinutesUsed !== undefined
          ? { increment: metrics.voiceMinutesUsed }
          : undefined,
        smsCount: metrics.smsCount !== undefined
          ? { increment: metrics.smsCount }
          : undefined,
        whatsappCount: metrics.whatsappCount !== undefined
          ? { increment: metrics.whatsappCount }
          : undefined,
        emailsCount: metrics.emailsCount !== undefined
          ? { increment: metrics.emailsCount }
          : undefined,
        apiRequestsCount: metrics.apiRequestsCount !== undefined
          ? { increment: metrics.apiRequestsCount }
          : undefined,
        storageUsedMb: metrics.storageUsedMb,
      },
    });
  }

  /**
   * Log subscription change
   */
  async logSubscriptionChange(data: {
    organizationId: string;
    planName: string;
    planId?: string;
    billingCycle: string;
    startDate: Date;
    endDate?: Date;
    amount: number;
    currency?: string;
    paymentStatus?: string;
    paymentId?: string;
    invoiceId?: string;
    changeType?: string;
    changedBy?: string;
    changeNotes?: string;
  }) {
    return prisma.tenantSubscriptionHistory.create({
      data: {
        organizationId: data.organizationId,
        planName: data.planName,
        planId: data.planId,
        billingCycle: data.billingCycle,
        startDate: data.startDate,
        endDate: data.endDate,
        amount: data.amount,
        currency: data.currency || 'INR',
        paymentStatus: data.paymentStatus || 'pending',
        paymentId: data.paymentId,
        invoiceId: data.invoiceId,
        changeType: data.changeType,
        changedBy: data.changedBy,
        changeNotes: data.changeNotes,
      },
    });
  }

  /**
   * Get tenant activity summary for a period
   */
  async getTenantActivitySummary(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ) {
    const [activities, usage, subscriptionChanges] = await Promise.all([
      // Activity counts by module
      prisma.tenantActivityLog.groupBy({
        by: ['module', 'action'],
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
        _count: true,
      }),

      // Daily usage for the period
      prisma.tenantUsageDaily.findMany({
        where: {
          organizationId,
          date: { gte: startDate, lte: endDate },
        },
        orderBy: { date: 'asc' },
      }),

      // Subscription changes
      prisma.tenantSubscriptionHistory.findMany({
        where: {
          organizationId,
          createdAt: { gte: startDate, lte: endDate },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Aggregate usage totals
    const usageTotals = usage.reduce(
      (acc, day) => ({
        leadsCreated: acc.leadsCreated + day.leadsCreated,
        leadsConverted: acc.leadsConverted + day.leadsConverted,
        callsCount: acc.callsCount + day.callsCount,
        aiCallsCount: acc.aiCallsCount + day.aiCallsCount,
        voiceMinutesUsed: acc.voiceMinutesUsed + day.voiceMinutesUsed,
        smsCount: acc.smsCount + day.smsCount,
        whatsappCount: acc.whatsappCount + day.whatsappCount,
        emailsCount: acc.emailsCount + day.emailsCount,
        apiRequestsCount: acc.apiRequestsCount + day.apiRequestsCount,
      }),
      {
        leadsCreated: 0,
        leadsConverted: 0,
        callsCount: 0,
        aiCallsCount: 0,
        voiceMinutesUsed: 0,
        smsCount: 0,
        whatsappCount: 0,
        emailsCount: 0,
        apiRequestsCount: 0,
      }
    );

    return {
      period: { startDate, endDate },
      activities,
      dailyUsage: usage,
      usageTotals,
      subscriptionChanges,
    };
  }

  /**
   * Get all tenants activity for platform dashboard
   */
  async getAllTenantsActivity(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get activity counts per tenant
    const activityByTenant = await prisma.tenantActivityLog.groupBy({
      by: ['organizationId'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Get login counts per tenant
    const loginsByTenant = await prisma.loginHistory.groupBy({
      by: ['organizationId'],
      where: {
        createdAt: { gte: startDate },
        status: 'success',
      },
      _count: true,
    });

    // Get last activity per tenant
    const lastActivities = await prisma.tenantActivityLog.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['organizationId'],
      select: {
        organizationId: true,
        createdAt: true,
        action: true,
      },
    });

    // Get organization details
    const orgIds = [...new Set([
      ...activityByTenant.map(a => a.organizationId),
      ...loginsByTenant.map(l => l.organizationId),
    ])];

    const organizations = await prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: {
        id: true,
        name: true,
        activePlanId: true,
        subscriptionStatus: true,
        isActive: true,
      },
    });

    const orgMap = new Map(organizations.map(o => [o.id, o]));
    const activityMap = new Map(activityByTenant.map(a => [a.organizationId, a._count]));
    const loginMap = new Map(loginsByTenant.map(l => [l.organizationId, l._count]));
    const lastActivityMap = new Map(lastActivities.map(a => [a.organizationId, a]));

    return organizations.map(org => ({
      organization: org,
      activityCount: activityMap.get(org.id) || 0,
      loginCount: loginMap.get(org.id) || 0,
      lastActivity: lastActivityMap.get(org.id) || null,
    })).sort((a, b) => b.activityCount - a.activityCount);
  }

  /**
   * Increment API request count for a tenant
   */
  async incrementApiRequests(organizationId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.tenantUsageDaily.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
      create: {
        organizationId,
        date: today,
        apiRequestsCount: 1,
      },
      update: {
        apiRequestsCount: { increment: 1 },
      },
    });
  }

  // ==================== AI USAGE TRACKING ====================

  /**
   * Update AI usage metrics
   */
  async updateAIUsage(
    organizationId: string,
    metrics: {
      aiOutboundCalls?: number;
      aiInboundCalls?: number;
      aiOutboundMinutes?: number;
      aiInboundMinutes?: number;
      transcriptsGenerated?: number;
      sentimentAnalysisRun?: number;
      callSummariesGenerated?: number;
      llmTokensUsed?: number;
      llmPromptTokens?: number;
      llmCompletionTokens?: number;
      speechToTextMinutes?: number;
      textToSpeechChars?: number;
      estimatedCostUSD?: number;
      llmCostUSD?: number;
      voiceCostUSD?: number;
      modelsUsed?: Record<string, number>;
    }
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalMinutes = (metrics.aiOutboundMinutes || 0) + (metrics.aiInboundMinutes || 0);

    return prisma.tenantAIUsage.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
      create: {
        organizationId,
        date: today,
        aiTotalMinutes: totalMinutes,
        ...metrics,
      },
      update: {
        aiOutboundCalls: metrics.aiOutboundCalls !== undefined
          ? { increment: metrics.aiOutboundCalls } : undefined,
        aiInboundCalls: metrics.aiInboundCalls !== undefined
          ? { increment: metrics.aiInboundCalls } : undefined,
        aiOutboundMinutes: metrics.aiOutboundMinutes !== undefined
          ? { increment: metrics.aiOutboundMinutes } : undefined,
        aiInboundMinutes: metrics.aiInboundMinutes !== undefined
          ? { increment: metrics.aiInboundMinutes } : undefined,
        aiTotalMinutes: totalMinutes > 0 ? { increment: totalMinutes } : undefined,
        transcriptsGenerated: metrics.transcriptsGenerated !== undefined
          ? { increment: metrics.transcriptsGenerated } : undefined,
        sentimentAnalysisRun: metrics.sentimentAnalysisRun !== undefined
          ? { increment: metrics.sentimentAnalysisRun } : undefined,
        callSummariesGenerated: metrics.callSummariesGenerated !== undefined
          ? { increment: metrics.callSummariesGenerated } : undefined,
        llmTokensUsed: metrics.llmTokensUsed !== undefined
          ? { increment: metrics.llmTokensUsed } : undefined,
        llmPromptTokens: metrics.llmPromptTokens !== undefined
          ? { increment: metrics.llmPromptTokens } : undefined,
        llmCompletionTokens: metrics.llmCompletionTokens !== undefined
          ? { increment: metrics.llmCompletionTokens } : undefined,
        speechToTextMinutes: metrics.speechToTextMinutes !== undefined
          ? { increment: metrics.speechToTextMinutes } : undefined,
        textToSpeechChars: metrics.textToSpeechChars !== undefined
          ? { increment: metrics.textToSpeechChars } : undefined,
        estimatedCostUSD: metrics.estimatedCostUSD !== undefined
          ? { increment: metrics.estimatedCostUSD } : undefined,
        llmCostUSD: metrics.llmCostUSD !== undefined
          ? { increment: metrics.llmCostUSD } : undefined,
        voiceCostUSD: metrics.voiceCostUSD !== undefined
          ? { increment: metrics.voiceCostUSD } : undefined,
      },
    });
  }

  // ==================== CRM METRICS TRACKING ====================

  /**
   * Update CRM metrics
   */
  async updateCRMMetrics(
    organizationId: string,
    metrics: {
      dealsCreated?: number;
      dealsWon?: number;
      dealsLost?: number;
      dealsValue?: number;
      dealsWonValue?: number;
      followUpsCreated?: number;
      followUpsCompleted?: number;
      followUpsMissed?: number;
      tasksCreated?: number;
      tasksCompleted?: number;
      campaignsCreated?: number;
      campaignsRun?: number;
      campaignLeadsGenerated?: number;
      appointmentsScheduled?: number;
      appointmentsCompleted?: number;
    }
  ) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.tenantCRMMetrics.upsert({
      where: {
        organizationId_date: {
          organizationId,
          date: today,
        },
      },
      create: {
        organizationId,
        date: today,
        ...metrics,
      },
      update: {
        dealsCreated: metrics.dealsCreated !== undefined
          ? { increment: metrics.dealsCreated } : undefined,
        dealsWon: metrics.dealsWon !== undefined
          ? { increment: metrics.dealsWon } : undefined,
        dealsLost: metrics.dealsLost !== undefined
          ? { increment: metrics.dealsLost } : undefined,
        dealsValue: metrics.dealsValue !== undefined
          ? { increment: metrics.dealsValue } : undefined,
        dealsWonValue: metrics.dealsWonValue !== undefined
          ? { increment: metrics.dealsWonValue } : undefined,
        followUpsCreated: metrics.followUpsCreated !== undefined
          ? { increment: metrics.followUpsCreated } : undefined,
        followUpsCompleted: metrics.followUpsCompleted !== undefined
          ? { increment: metrics.followUpsCompleted } : undefined,
        followUpsMissed: metrics.followUpsMissed !== undefined
          ? { increment: metrics.followUpsMissed } : undefined,
        tasksCreated: metrics.tasksCreated !== undefined
          ? { increment: metrics.tasksCreated } : undefined,
        tasksCompleted: metrics.tasksCompleted !== undefined
          ? { increment: metrics.tasksCompleted } : undefined,
        campaignsCreated: metrics.campaignsCreated !== undefined
          ? { increment: metrics.campaignsCreated } : undefined,
        campaignsRun: metrics.campaignsRun !== undefined
          ? { increment: metrics.campaignsRun } : undefined,
        campaignLeadsGenerated: metrics.campaignLeadsGenerated !== undefined
          ? { increment: metrics.campaignLeadsGenerated } : undefined,
        appointmentsScheduled: metrics.appointmentsScheduled !== undefined
          ? { increment: metrics.appointmentsScheduled } : undefined,
        appointmentsCompleted: metrics.appointmentsCompleted !== undefined
          ? { increment: metrics.appointmentsCompleted } : undefined,
      },
    });
  }

  // ==================== SECURITY LOGGING ====================

  /**
   * Log security event
   */
  async logSecurityEvent(data: {
    organizationId: string;
    userId?: string;
    eventType: string;
    severity?: string;
    description?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    location?: string;
    deviceId?: string;
    riskScore?: number;
    isBlocked?: boolean;
    requiresReview?: boolean;
  }) {
    return prisma.tenantSecurityLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        eventType: data.eventType,
        severity: data.severity || 'info',
        description: data.description,
        metadata: data.metadata || {},
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        location: data.location,
        deviceId: data.deviceId,
        riskScore: data.riskScore,
        isBlocked: data.isBlocked || false,
        requiresReview: data.requiresReview || false,
      },
    });
  }

  /**
   * Get security alerts for a tenant
   */
  async getSecurityAlerts(
    organizationId: string,
    options: {
      severity?: string;
      unreviewed?: boolean;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ) {
    const where: any = { organizationId };

    if (options.severity) where.severity = options.severity;
    if (options.unreviewed) where.reviewedAt = null;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return prisma.tenantSecurityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ==================== DATA EXPORT TRACKING ====================

  /**
   * Log data export
   */
  async logDataExport(data: {
    organizationId: string;
    userId: string;
    exportType: string;
    recordCount: number;
    fileFormat: string;
    fileSize?: number;
    fileName?: string;
    ipAddress?: string;
    userAgent?: string;
    reason?: string;
  }) {
    // Calculate expiry (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    return prisma.tenantDataExport.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        exportType: data.exportType,
        recordCount: data.recordCount,
        fileFormat: data.fileFormat,
        fileSize: data.fileSize,
        fileName: data.fileName,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        reason: data.reason,
        expiresAt,
      },
    });
  }

  /**
   * Get export history for a tenant
   */
  async getExportHistory(
    organizationId: string,
    options: {
      userId?: string;
      exportType?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ) {
    const where: any = { organizationId };

    if (options.userId) where.userId = options.userId;
    if (options.exportType) where.exportType = options.exportType;
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) where.createdAt.gte = options.startDate;
      if (options.endDate) where.createdAt.lte = options.endDate;
    }

    return prisma.tenantDataExport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ==================== COMPREHENSIVE TENANT REPORT ====================

  /**
   * Get comprehensive tenant report for platform admin
   */
  async getTenantReport(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [
      org,
      dailyUsage,
      aiUsage,
      crmMetrics,
      securityLogs,
      dataExports,
      loginHistory,
      subscriptionHistory,
    ] = await Promise.all([
      // Organization details
      prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          _count: {
            select: { users: true, leads: true, callLogs: true },
          },
        },
      }),

      // Daily usage
      prisma.tenantUsageDaily.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),

      // AI usage
      prisma.tenantAIUsage.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),

      // CRM metrics
      prisma.tenantCRMMetrics.findMany({
        where: { organizationId, date: { gte: startDate } },
        orderBy: { date: 'asc' },
      }),

      // Security logs summary
      prisma.tenantSecurityLog.groupBy({
        by: ['eventType', 'severity'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: true,
      }),

      // Data exports
      prisma.tenantDataExport.findMany({
        where: { organizationId, createdAt: { gte: startDate } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),

      // Login history summary
      prisma.loginHistory.groupBy({
        by: ['status'],
        where: { organizationId, createdAt: { gte: startDate } },
        _count: true,
      }),

      // Subscription history
      prisma.tenantSubscriptionHistory.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    // Aggregate totals
    const usageTotals = dailyUsage.reduce(
      (acc, day) => ({
        leadsCreated: acc.leadsCreated + day.leadsCreated,
        callsCount: acc.callsCount + day.callsCount,
        smsCount: acc.smsCount + day.smsCount,
        whatsappCount: acc.whatsappCount + day.whatsappCount,
        emailsCount: acc.emailsCount + day.emailsCount,
        apiRequestsCount: acc.apiRequestsCount + day.apiRequestsCount,
      }),
      { leadsCreated: 0, callsCount: 0, smsCount: 0, whatsappCount: 0, emailsCount: 0, apiRequestsCount: 0 }
    );

    const aiTotals = aiUsage.reduce(
      (acc, day) => ({
        aiOutboundCalls: acc.aiOutboundCalls + day.aiOutboundCalls,
        aiInboundCalls: acc.aiInboundCalls + day.aiInboundCalls,
        aiTotalMinutes: acc.aiTotalMinutes + day.aiTotalMinutes,
        llmTokensUsed: acc.llmTokensUsed + day.llmTokensUsed,
        estimatedCostUSD: acc.estimatedCostUSD + day.estimatedCostUSD,
      }),
      { aiOutboundCalls: 0, aiInboundCalls: 0, aiTotalMinutes: 0, llmTokensUsed: 0, estimatedCostUSD: 0 }
    );

    const crmTotals = crmMetrics.reduce(
      (acc, day) => ({
        dealsCreated: acc.dealsCreated + day.dealsCreated,
        dealsWon: acc.dealsWon + day.dealsWon,
        dealsWonValue: acc.dealsWonValue + day.dealsWonValue,
        followUpsCompleted: acc.followUpsCompleted + day.followUpsCompleted,
        campaignsRun: acc.campaignsRun + day.campaignsRun,
      }),
      { dealsCreated: 0, dealsWon: 0, dealsWonValue: 0, followUpsCompleted: 0, campaignsRun: 0 }
    );

    return {
      organization: org,
      period: { startDate, endDate: new Date(), days },
      usage: {
        daily: dailyUsage,
        totals: usageTotals,
      },
      aiUsage: {
        daily: aiUsage,
        totals: aiTotals,
      },
      crmMetrics: {
        daily: crmMetrics,
        totals: crmTotals,
      },
      security: {
        summary: securityLogs,
        loginHistory,
      },
      dataExports,
      subscriptionHistory,
    };
  }
}

export const tenantMonitoringService = new TenantMonitoringService();
export default tenantMonitoringService;
