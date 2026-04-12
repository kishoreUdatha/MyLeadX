/**
 * Audit & Activity Reports Service
 * Tenant-scoped audit logs and security tracking
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
  userId?: string;
  action?: string;
  entityType?: string;
}

interface AuditSummary {
  totalActions: number;
  uniqueUsers: number;
  topActions: { action: string; count: number }[];
  topUsers: { userId: string; userName: string; count: number }[];
  actionsByDay: { date: string; count: number }[];
}

interface LeadEditLog {
  id: string;
  leadId: string;
  leadName: string;
  editedBy: string;
  editedById: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  editedAt: Date;
}

interface PaymentDeleteLog {
  id: string;
  paymentId: string;
  amount: number;
  deletedBy: string;
  deletedById: string;
  reason: string | null;
  deletedAt: Date;
}

interface DataExportLog {
  id: string;
  exportedBy: string;
  exportedById: string;
  exportType: string;
  recordCount: number;
  fileName: string | null;
  exportedAt: Date;
  ipAddress: string | null;
}

interface StageChangeLog {
  id: string;
  leadId: string;
  leadName: string;
  changedBy: string;
  changedById: string;
  fromStage: string;
  toStage: string;
  changedAt: Date;
}

interface LoginHistory {
  id: string;
  userId: string;
  userName: string;
  email: string;
  loginTime: Date;
  ipAddress: string | null;
  userAgent: string | null;
  location: string | null;
  status: 'SUCCESS' | 'FAILED';
}

interface FailedLoginAttempt {
  email: string;
  attemptCount: number;
  lastAttempt: Date;
  ipAddresses: string[];
  blocked: boolean;
}

interface SecurityAlert {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  userId?: string;
  userName?: string;
  timestamp: Date;
  details: Record<string, any>;
}

class AuditReportsService {
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * 1. AUDIT SUMMARY
   */
  async getAuditSummary(filters: ReportFilters): Promise<AuditSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get all audit logs
    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        action: true,
        actorId: true,
        actorEmail: true,
        createdAt: true,
      },
    });

    const totalActions = logs.length;
    const uniqueUsers = new Set(logs.filter(l => l.actorId).map(l => l.actorId)).size;

    // Top actions
    const actionCounts = new Map<string, number>();
    for (const log of logs) {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
    }
    const topActions = Array.from(actionCounts.entries())
      .map(([action, count]) => ({ action, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Top users
    const userCounts = new Map<string, { name: string; count: number }>();
    for (const log of logs) {
      if (!log.actorId) continue;
      const existing = userCounts.get(log.actorId) || {
        name: log.actorEmail || 'Unknown',
        count: 0,
      };
      existing.count++;
      userCounts.set(log.actorId, existing);
    }
    const topUsers = Array.from(userCounts.entries())
      .map(([userId, data]) => ({ userId, userName: data.name, count: data.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Actions by day
    const dayCounts = new Map<string, number>();
    for (const log of logs) {
      const date = log.createdAt.toISOString().split('T')[0];
      dayCounts.set(date, (dayCounts.get(date) || 0) + 1);
    }
    const actionsByDay = Array.from(dayCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalActions,
      uniqueUsers,
      topActions,
      topUsers,
      actionsByDay,
    };
  }

  /**
   * 2. LEAD EDIT HISTORY
   */
  async getLeadEditLogs(filters: ReportFilters, limit = 100): Promise<LeadEditLog[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userId } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['LEAD_UPDATE', 'LEAD_EDIT', 'lead_update', 'UPDATE_LEAD'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...(userId && { actorId: userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const changes = (log.changes as any) || {};
      return {
        id: log.id,
        leadId: log.targetId || '',
        leadName: changes.leadName || 'Unknown Lead',
        editedBy: log.actorEmail || 'Unknown',
        editedById: log.actorId || '',
        field: changes.field || 'Multiple fields',
        oldValue: changes.oldValue || null,
        newValue: changes.newValue || null,
        editedAt: log.createdAt,
      };
    });
  }

  /**
   * 3. PAYMENT DELETE LOGS
   */
  async getPaymentDeleteLogs(filters: ReportFilters, limit = 100): Promise<PaymentDeleteLog[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['PAYMENT_DELETE', 'DELETE_PAYMENT', 'payment_delete'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const changes = (log.changes as any) || {};
      return {
        id: log.id,
        paymentId: log.targetId || '',
        amount: changes.amount || 0,
        deletedBy: log.actorEmail || 'Unknown',
        deletedById: log.actorId || '',
        reason: changes.reason || null,
        deletedAt: log.createdAt,
      };
    });
  }

  /**
   * 4. DATA EXPORT LOGS
   */
  async getDataExportLogs(filters: ReportFilters, limit = 100): Promise<DataExportLog[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['EXPORT', 'DATA_EXPORT', 'EXPORT_DATA', 'export', 'BULK_EXPORT'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const changes = (log.changes as any) || {};
      return {
        id: log.id,
        exportedBy: log.actorEmail || 'Unknown',
        exportedById: log.actorId || '',
        exportType: changes.exportType || changes.targetType || 'Unknown',
        recordCount: changes.recordCount || changes.count || 0,
        fileName: changes.fileName || null,
        exportedAt: log.createdAt,
        ipAddress: log.ipAddress,
      };
    });
  }

  /**
   * 5. LEAD STAGE CHANGE LOGS
   */
  async getStageChangeLogs(filters: ReportFilters, limit = 100): Promise<StageChangeLog[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userId } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['STAGE_CHANGE', 'LEAD_STAGE_CHANGE', 'UPDATE_STAGE', 'stage_change'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...(userId && { actorId: userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const changes = (log.changes as any) || {};
      return {
        id: log.id,
        leadId: log.targetId || '',
        leadName: changes.leadName || 'Unknown Lead',
        changedBy: log.actorEmail || 'Unknown',
        changedById: log.actorId || '',
        fromStage: changes.fromStage || changes.oldStage || 'Unknown',
        toStage: changes.toStage || changes.newStage || 'Unknown',
        changedAt: log.createdAt,
      };
    });
  }

  /**
   * 6. LOGIN HISTORY
   */
  async getLoginHistory(filters: ReportFilters, limit = 100): Promise<LoginHistory[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), userId } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['LOGIN', 'login', 'USER_LOGIN'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...(userId && { actorId: userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs.map(log => {
      const changes = (log.changes as any) || {};
      return {
        id: log.id,
        userId: log.actorId || '',
        userName: log.actorEmail || 'Unknown',
        email: log.actorEmail || '',
        loginTime: log.createdAt,
        ipAddress: log.ipAddress,
        userAgent: changes.userAgent || null,
        location: changes.location || null,
        status: 'SUCCESS' as const,
      };
    });
  }

  /**
   * 7. FAILED LOGIN ATTEMPTS
   */
  async getFailedLoginAttempts(filters: ReportFilters): Promise<FailedLoginAttempt[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const logs = await prisma.auditLog.findMany({
      where: {
        organizationId,
        action: { in: ['LOGIN_FAILED', 'FAILED_LOGIN', 'login_failed'] },
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by email/identifier
    const attemptsByEmail = new Map<string, {
      count: number;
      lastAttempt: Date;
      ipAddresses: Set<string>;
    }>();

    for (const log of logs) {
      const changes = (log.changes as any) || {};
      const email = changes.email || changes.identifier || log.actorEmail || 'unknown';
      const existing = attemptsByEmail.get(email) || {
        count: 0,
        lastAttempt: log.createdAt,
        ipAddresses: new Set<string>(),
      };
      existing.count++;
      if (log.createdAt > existing.lastAttempt) {
        existing.lastAttempt = log.createdAt;
      }
      if (log.ipAddress) {
        existing.ipAddresses.add(log.ipAddress);
      }
      attemptsByEmail.set(email, existing);
    }

    return Array.from(attemptsByEmail.entries())
      .map(([email, data]) => ({
        email,
        attemptCount: data.count,
        lastAttempt: data.lastAttempt,
        ipAddresses: Array.from(data.ipAddresses),
        blocked: data.count >= 5, // Consider blocked after 5 attempts
      }))
      .sort((a, b) => b.attemptCount - a.attemptCount);
  }

  /**
   * 8. SECURITY ALERTS
   */
  async getSecurityAlerts(filters: ReportFilters): Promise<SecurityAlert[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const alerts: SecurityAlert[] = [];

    // Check for suspicious activities
    const failedLogins = await this.getFailedLoginAttempts(filters);
    for (const attempt of failedLogins) {
      if (attempt.attemptCount >= 5) {
        alerts.push({
          type: 'MULTIPLE_FAILED_LOGINS',
          severity: attempt.attemptCount >= 10 ? 'HIGH' : 'MEDIUM',
          message: `Multiple failed login attempts for ${attempt.email}`,
          timestamp: attempt.lastAttempt,
          details: {
            email: attempt.email,
            attemptCount: attempt.attemptCount,
            ipAddresses: attempt.ipAddresses,
          },
        });
      }
    }

    // Check for bulk exports
    const exports = await this.getDataExportLogs(filters);
    for (const exp of exports) {
      if (exp.recordCount > 1000) {
        alerts.push({
          type: 'LARGE_DATA_EXPORT',
          severity: exp.recordCount > 10000 ? 'HIGH' : 'MEDIUM',
          message: `Large data export by ${exp.exportedBy}`,
          userId: exp.exportedById,
          userName: exp.exportedBy,
          timestamp: exp.exportedAt,
          details: {
            recordCount: exp.recordCount,
            exportType: exp.exportType,
            ipAddress: exp.ipAddress,
          },
        });
      }
    }

    // Check for payment deletions
    const paymentDeletes = await this.getPaymentDeleteLogs(filters);
    for (const del of paymentDeletes) {
      if (del.amount > 50000) {
        alerts.push({
          type: 'HIGH_VALUE_PAYMENT_DELETE',
          severity: del.amount > 100000 ? 'HIGH' : 'MEDIUM',
          message: `High value payment deleted by ${del.deletedBy}`,
          userId: del.deletedById,
          userName: del.deletedBy,
          timestamp: del.deletedAt,
          details: {
            amount: del.amount,
            reason: del.reason,
          },
        });
      }
    }

    // Check for unusual login times
    const loginHistory = await this.getLoginHistory(filters);
    for (const login of loginHistory) {
      const hour = login.loginTime.getHours();
      if (hour >= 0 && hour < 6) {
        alerts.push({
          type: 'ODD_HOURS_LOGIN',
          severity: 'LOW',
          message: `Login at unusual hours by ${login.userName}`,
          userId: login.userId,
          userName: login.userName,
          timestamp: login.loginTime,
          details: {
            time: login.loginTime.toISOString(),
            ipAddress: login.ipAddress,
          },
        });
      }
    }

    return alerts.sort((a, b) => {
      const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * 9. ACTIVITY BY ENTITY TYPE
   */
  async getActivityByEntityType(filters: ReportFilters): Promise<{
    entityType: string;
    created: number;
    updated: number;
    deleted: number;
    total: number;
  }[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const logs = await prisma.auditLog.groupBy({
      by: ['targetType', 'action'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        targetType: { not: null },
      },
      _count: { id: true },
    });

    const entityStats = new Map<string, { created: number; updated: number; deleted: number }>();

    for (const log of logs) {
      const entityType = log.targetType || 'Unknown';
      const existing = entityStats.get(entityType) || { created: 0, updated: 0, deleted: 0 };
      const action = log.action.toUpperCase();

      if (action.includes('CREATE') || action.includes('ADD')) {
        existing.created += log._count.id;
      } else if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('CHANGE')) {
        existing.updated += log._count.id;
      } else if (action.includes('DELETE') || action.includes('REMOVE')) {
        existing.deleted += log._count.id;
      }

      entityStats.set(entityType, existing);
    }

    return Array.from(entityStats.entries())
      .map(([entityType, stats]) => ({
        entityType,
        ...stats,
        total: stats.created + stats.updated + stats.deleted,
      }))
      .sort((a, b) => b.total - a.total);
  }

  /**
   * COMPREHENSIVE AUDIT REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: AuditSummary;
    leadEdits: LeadEditLog[];
    paymentDeletes: PaymentDeleteLog[];
    dataExports: DataExportLog[];
    stageChanges: StageChangeLog[];
    loginHistory: LoginHistory[];
    failedLogins: FailedLoginAttempt[];
    securityAlerts: SecurityAlert[];
    activityByEntity: Awaited<ReturnType<typeof this.getActivityByEntityType>>;
  }> {
    const [
      summary,
      leadEdits,
      paymentDeletes,
      dataExports,
      stageChanges,
      loginHistory,
      failedLogins,
      securityAlerts,
      activityByEntity,
    ] = await Promise.all([
      this.getAuditSummary(filters),
      this.getLeadEditLogs(filters, 50),
      this.getPaymentDeleteLogs(filters, 50),
      this.getDataExportLogs(filters, 50),
      this.getStageChangeLogs(filters, 50),
      this.getLoginHistory(filters, 50),
      this.getFailedLoginAttempts(filters),
      this.getSecurityAlerts(filters),
      this.getActivityByEntityType(filters),
    ]);

    return {
      summary,
      leadEdits,
      paymentDeletes,
      dataExports,
      stageChanges,
      loginHistory,
      failedLogins,
      securityAlerts,
      activityByEntity,
    };
  }
}

export const auditReportsService = new AuditReportsService();
