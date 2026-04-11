import { prisma } from '../config/database';

/**
 * PLATFORM COMPLIANCE & SECURITY SERVICE
 *
 * Compliance and security management:
 * - GDPR data export/delete
 * - Security incident tracking
 * - Access logs viewer
 * - IP whitelist management
 */

interface GDPRExportRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: Date;
  downloadUrl?: string;
  expiresAt?: Date;
}

interface GDPRDeleteRequest {
  id: string;
  organizationId: string;
  organizationName: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
  completedAt?: Date;
  reason?: string;
}

interface SecurityIncident {
  id: string;
  type: 'unauthorized_access' | 'data_breach' | 'suspicious_activity' | 'policy_violation' | 'system_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedTenants: string[];
  affectedUsers: number;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  reportedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

interface AccessLog {
  id: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failure';
  timestamp: Date;
  details?: Record<string, any>;
}

interface IPWhitelistEntry {
  id: string;
  organizationId: string;
  ipAddress: string;
  description: string;
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

export class PlatformComplianceService {
  /**
   * Create GDPR data export request
   */
  async createGDPRExportRequest(
    organizationId: string,
    requestedBy: string
  ): Promise<GDPRExportRequest> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!org) throw new Error('Organization not found');

    // Create export record in TenantDataExport table
    const exportRecord = await prisma.tenantDataExport.create({
      data: {
        organizationId,
        exportType: 'GDPR_FULL',
        status: 'PENDING',
        requestedById: requestedBy,
        fileSize: 0,
      },
    });

    // Start async export process
    this.processGDPRExport(exportRecord.id, organizationId).catch(console.error);

    return {
      id: exportRecord.id,
      organizationId: org.id,
      organizationName: org.name,
      requestedBy,
      requestedAt: exportRecord.createdAt,
      status: 'pending',
    };
  }

  /**
   * Process GDPR export asynchronously
   */
  private async processGDPRExport(exportId: string, organizationId: string): Promise<void> {
    try {
      await prisma.tenantDataExport.update({
        where: { id: exportId },
        data: { status: 'PROCESSING' },
      });

      // Gather all organization data
      const [users, leads, calls, messages, payments] = await Promise.all([
        prisma.user.findMany({
          where: { organizationId },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        }),
        prisma.lead.findMany({
          where: { organizationId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        }),
        prisma.call.count({ where: { organizationId } }),
        prisma.message.count({ where: { organizationId } }),
        prisma.payment.findMany({
          where: { organizationId },
          select: { id: true, amount: true, createdAt: true },
        }),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        organizationId,
        users,
        leads,
        callsCount: calls,
        messagesCount: messages,
        payments,
      };

      // In production, would upload to S3 and generate signed URL
      const fileSize = JSON.stringify(exportData).length;

      await prisma.tenantDataExport.update({
        where: { id: exportId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          fileSize,
          fileUrl: `/exports/${exportId}.json`, // Placeholder
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    } catch (error) {
      await prisma.tenantDataExport.update({
        where: { id: exportId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  /**
   * Get all GDPR export requests
   */
  async getGDPRExportRequests(): Promise<GDPRExportRequest[]> {
    const exports = await prisma.tenantDataExport.findMany({
      where: { exportType: 'GDPR_FULL' },
      include: {
        organization: { select: { name: true } },
        requestedBy: { select: { email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return exports.map((e) => ({
      id: e.id,
      organizationId: e.organizationId,
      organizationName: e.organization.name,
      requestedBy: e.requestedBy?.email || 'Unknown',
      requestedAt: e.createdAt,
      status: e.status.toLowerCase() as any,
      completedAt: e.completedAt || undefined,
      downloadUrl: e.fileUrl || undefined,
      expiresAt: e.expiresAt || undefined,
    }));
  }

  /**
   * Create GDPR delete request
   */
  async createGDPRDeleteRequest(
    organizationId: string,
    requestedBy: string,
    reason: string
  ): Promise<GDPRDeleteRequest> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!org) throw new Error('Organization not found');

    // Log the delete request in activity log
    await prisma.tenantActivityLog.create({
      data: {
        organizationId,
        action: 'GDPR_DELETE_REQUESTED',
        module: 'compliance',
        userId: requestedBy,
        details: { reason },
      },
    });

    return {
      id: `gdpr_del_${Date.now()}`,
      organizationId: org.id,
      organizationName: org.name,
      requestedBy,
      requestedAt: new Date(),
      status: 'pending',
      reason,
    };
  }

  /**
   * Get security incidents
   */
  async getSecurityIncidents(
    status?: string,
    severity?: string
  ): Promise<SecurityIncident[]> {
    const where: any = {};
    if (status) where.eventType = status;
    if (severity) where.severity = severity.toUpperCase();

    const incidents = await prisma.tenantSecurityLog.findMany({
      where: {
        eventType: { in: ['CROSS_TENANT_ACCESS_BLOCKED', 'UNAUTHORIZED_RESOURCE_ACCESS', 'SUPER_ADMIN_ACCESS_DENIED'] },
        ...where,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return incidents.map((i) => ({
      id: i.id,
      type: this.mapEventTypeToIncidentType(i.eventType),
      severity: (i.severity?.toLowerCase() || 'medium') as any,
      title: i.eventType,
      description: JSON.stringify(i.details),
      affectedTenants: [i.organizationId],
      affectedUsers: 1,
      status: 'open',
      reportedAt: i.createdAt,
    }));
  }

  /**
   * Create security incident
   */
  async createSecurityIncident(
    incident: Omit<SecurityIncident, 'id' | 'reportedAt' | 'status'>
  ): Promise<SecurityIncident> {
    // Log to security log for each affected tenant
    for (const tenantId of incident.affectedTenants) {
      await prisma.tenantSecurityLog.create({
        data: {
          organizationId: tenantId,
          eventType: incident.type.toUpperCase(),
          severity: incident.severity.toUpperCase(),
          details: {
            title: incident.title,
            description: incident.description,
            affectedUsers: incident.affectedUsers,
          },
        },
      });
    }

    return {
      ...incident,
      id: `incident_${Date.now()}`,
      status: 'open',
      reportedAt: new Date(),
    };
  }

  /**
   * Get access logs
   */
  async getAccessLogs(
    filters: {
      organizationId?: string;
      userId?: string;
      action?: string;
      startDate?: Date;
      endDate?: Date;
    },
    page: number = 1,
    limit: number = 50
  ): Promise<{ logs: AccessLog[]; total: number }> {
    const where: any = {};

    if (filters.organizationId) where.organizationId = filters.organizationId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = { contains: filters.action };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.tenantActivityLog.findMany({
        where,
        include: {
          organization: { select: { name: true } },
          user: { select: { email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.tenantActivityLog.count({ where }),
    ]);

    return {
      logs: logs.map((l) => ({
        id: l.id,
        organizationId: l.organizationId,
        organizationName: l.organization.name,
        userId: l.userId || '',
        userEmail: l.user?.email || 'System',
        action: l.action,
        resource: l.module,
        ipAddress: l.ipAddress || 'Unknown',
        userAgent: l.userAgent || 'Unknown',
        status: 'success',
        timestamp: l.createdAt,
        details: l.details as any,
      })),
      total,
    };
  }

  /**
   * Get IP whitelist for a tenant
   */
  async getIPWhitelist(organizationId: string): Promise<IPWhitelistEntry[]> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) return [];

    const settings = (org.settings as any) || {};
    const whitelist = settings.ipWhitelist || [];

    return whitelist.map((entry: any) => ({
      id: entry.id,
      organizationId,
      ipAddress: entry.ipAddress,
      description: entry.description,
      createdBy: entry.createdBy,
      createdAt: new Date(entry.createdAt),
      expiresAt: entry.expiresAt ? new Date(entry.expiresAt) : undefined,
      isActive: entry.isActive !== false,
    }));
  }

  /**
   * Add IP to whitelist
   */
  async addIPToWhitelist(
    organizationId: string,
    ipAddress: string,
    description: string,
    createdBy: string,
    expiresAt?: Date
  ): Promise<IPWhitelistEntry> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const settings = (org.settings as any) || {};
    const whitelist = settings.ipWhitelist || [];

    const newEntry = {
      id: `ip_${Date.now()}`,
      ipAddress,
      description,
      createdBy,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt?.toISOString(),
      isActive: true,
    };

    whitelist.push(newEntry);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: { ...settings, ipWhitelist: whitelist },
      },
    });

    return {
      ...newEntry,
      organizationId,
      createdAt: new Date(newEntry.createdAt),
      expiresAt: newEntry.expiresAt ? new Date(newEntry.expiresAt) : undefined,
    };
  }

  /**
   * Remove IP from whitelist
   */
  async removeIPFromWhitelist(organizationId: string, entryId: string): Promise<void> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!org) throw new Error('Organization not found');

    const settings = (org.settings as any) || {};
    const whitelist = (settings.ipWhitelist || []).filter((e: any) => e.id !== entryId);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: { ...settings, ipWhitelist: whitelist },
      },
    });
  }

  /**
   * Get compliance summary
   */
  async getComplianceSummary(): Promise<{
    pendingExportRequests: number;
    pendingDeleteRequests: number;
    openIncidents: number;
    criticalIncidents: number;
    tenantsWithIPWhitelist: number;
  }> {
    const [pendingExports, securityLogs, tenantsWithWhitelist] = await Promise.all([
      prisma.tenantDataExport.count({
        where: { status: 'PENDING' },
      }),
      prisma.tenantSecurityLog.findMany({
        where: {
          severity: 'CRITICAL',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.organization.count({
        where: {
          settings: { path: ['ipWhitelist'], not: { equals: null } },
        },
      }),
    ]);

    return {
      pendingExportRequests: pendingExports,
      pendingDeleteRequests: 0, // Would need separate tracking
      openIncidents: securityLogs.length,
      criticalIncidents: securityLogs.filter((l) => l.severity === 'CRITICAL').length,
      tenantsWithIPWhitelist: tenantsWithWhitelist,
    };
  }

  private mapEventTypeToIncidentType(eventType: string): SecurityIncident['type'] {
    const mapping: Record<string, SecurityIncident['type']> = {
      CROSS_TENANT_ACCESS_BLOCKED: 'unauthorized_access',
      UNAUTHORIZED_RESOURCE_ACCESS: 'unauthorized_access',
      SUPER_ADMIN_ACCESS_DENIED: 'policy_violation',
    };
    return mapping[eventType] || 'suspicious_activity';
  }
}

export const platformComplianceService = new PlatformComplianceService();
