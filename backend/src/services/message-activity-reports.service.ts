/**
 * Message Activity Reports Service
 * Tenant-scoped messaging activity reporting (SMS, WhatsApp, Email)
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

interface ReportFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  userRole?: string;
}

interface MessageSummary {
  totalMessages: number;
  sms: number;
  whatsapp: number;
  email: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

interface UserMessageStats {
  userId: string;
  userName: string;
  reportingManager: string;
  sms: number;
  whatsapp: number;
  email: number;
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

class MessageActivityReportsService {
  /**
   * Build where clause with role-based filtering
   */
  private async buildWhereClause(filters: ReportFilters): Promise<Prisma.MessageLogWhereInput> {
    const { organizationId, startDate, endDate, userId, userRole } = filters;

    const where: Prisma.MessageLogWhereInput = {
      organizationId,
    };

    // Date range filter
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      if (userId) {
        where.userId = userId;
      }
    } else if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamMembers.map(m => m.id)];
      where.userId = { in: allMemberIds };
    } else if (normalizedRole === 'manager' && userId) {
      const teamLeads = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      const allTeamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          OR: [{ managerId: { in: teamLeadIds } }, { managerId: userId }],
          isActive: true,
        },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamLeadIds, ...allTeamMembers.map(m => m.id)];
      where.userId = { in: allMemberIds };
    }

    return where;
  }

  /**
   * Get message summary statistics
   */
  async getSummary(filters: ReportFilters): Promise<MessageSummary> {
    const where = await this.buildWhereClause(filters);

    const [total, sms, whatsapp, email, delivered, failed, pending] = await Promise.all([
      prisma.messageLog.count({ where }),
      prisma.messageLog.count({ where: { ...where, type: 'SMS' } }),
      prisma.messageLog.count({ where: { ...where, type: 'WHATSAPP' } }),
      prisma.messageLog.count({ where: { ...where, type: 'EMAIL' } }),
      prisma.messageLog.count({ where: { ...where, status: 'DELIVERED' } }),
      prisma.messageLog.count({ where: { ...where, status: 'FAILED' } }),
      prisma.messageLog.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    const deliveryRate = total > 0 ? (delivered / total) * 100 : 0;

    return {
      totalMessages: total,
      sms,
      whatsapp,
      email,
      delivered,
      failed,
      pending,
      deliveryRate: Math.round(deliveryRate * 10) / 10,
    };
  }

  /**
   * Get user message statistics
   */
  async getUserStats(filters: ReportFilters): Promise<UserMessageStats[]> {
    const where = await this.buildWhereClause(filters);

    // Get all messages with user info
    const messages = await prisma.messageLog.findMany({
      where: {
        ...where,
        userId: { not: null },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            manager: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    // Group by user
    const userMap = new Map<string, {
      userId: string;
      userName: string;
      reportingManager: string;
      sms: number;
      whatsapp: number;
      email: number;
      delivered: number;
      failed: number;
      pending: number;
    }>();

    for (const message of messages) {
      if (!message.user) continue;

      const userId = message.user.id;
      const userName = `${message.user.firstName} ${message.user.lastName}`.trim();
      const reportingManager = message.user.manager
        ? `${message.user.manager.firstName} ${message.user.manager.lastName}`.trim()
        : '-';

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName,
          reportingManager,
          sms: 0,
          whatsapp: 0,
          email: 0,
          delivered: 0,
          failed: 0,
          pending: 0,
        });
      }

      const userData = userMap.get(userId)!;

      // Count by type
      if (message.type === 'SMS') userData.sms++;
      else if (message.type === 'WHATSAPP') userData.whatsapp++;
      else if (message.type === 'EMAIL') userData.email++;

      // Count by status
      if (message.status === 'DELIVERED' || message.status === 'READ') userData.delivered++;
      else if (message.status === 'FAILED') userData.failed++;
      else if (message.status === 'PENDING') userData.pending++;
    }

    // Calculate stats for each user
    const stats: UserMessageStats[] = [];

    for (const [userId, userData] of userMap) {
      const total = userData.sms + userData.whatsapp + userData.email;
      const deliveryRate = total > 0 ? (userData.delivered / total) * 100 : 0;

      stats.push({
        userId: userData.userId,
        userName: userData.userName,
        reportingManager: userData.reportingManager,
        sms: userData.sms,
        whatsapp: userData.whatsapp,
        email: userData.email,
        total,
        delivered: userData.delivered,
        failed: userData.failed,
        pending: userData.pending,
        deliveryRate: Math.round(deliveryRate * 10) / 10,
      });
    }

    // Sort by total messages descending
    stats.sort((a, b) => b.total - a.total);

    return stats;
  }

  /**
   * Get comprehensive message activity report
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: MessageSummary;
    users: UserMessageStats[];
  }> {
    const [summary, users] = await Promise.all([
      this.getSummary(filters),
      this.getUserStats(filters),
    ]);

    return { summary, users };
  }
}

export const messageActivityReportsService = new MessageActivityReportsService();
