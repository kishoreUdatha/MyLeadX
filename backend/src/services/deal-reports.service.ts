/**
 * Deal Reports Service
 * Tenant-scoped deal reporting for tracking user deal performance
 * Now supports Lead Stage-based velocity (works for all industries)
 */

import { prisma } from '../config/database';
import { Prisma, DealStage } from '@prisma/client';

interface ReportFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  userId?: string;
  userRole?: string;
}

interface DealSummary {
  totalDeals: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  dealsWon: number;
  dealsLost: number;
  dealsPending: number;
}

interface UserDealStats {
  userId: string;
  userName: string;
  reportingManager: string;
  dealsWon: number;
  dealsLost: number;
  dealsPending: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  avgConversionDays: number;
}

class DealReportsService {
  /**
   * Build where clause with role-based filtering
   */
  private async buildWhereClause(filters: ReportFilters): Promise<Prisma.DealWhereInput> {
    const { organizationId, startDate, endDate, userId, userRole } = filters;

    const where: Prisma.DealWhereInput = {
      organizationId,
    };

    // Date range filter on created date
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
        where.assignedToId = userId;
      }
    } else if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamMembers.map(m => m.id)];
      where.assignedToId = { in: allMemberIds };
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
      where.assignedToId = { in: allMemberIds };
    }

    return where;
  }

  /**
   * Get deal summary statistics
   */
  async getSummary(filters: ReportFilters): Promise<DealSummary> {
    const where = await this.buildWhereClause(filters);

    const [total, won, lost, pending, valueSum] = await Promise.all([
      prisma.deal.count({ where }),
      prisma.deal.count({ where: { ...where, stage: 'WON' } }),
      prisma.deal.count({ where: { ...where, stage: 'LOST' } }),
      prisma.deal.count({
        where: {
          ...where,
          stage: { notIn: ['WON', 'LOST'] },
        },
      }),
      prisma.deal.aggregate({
        where: { ...where, stage: 'WON' },
        _sum: { amount: true },
      }),
    ]);

    const totalValue = Number(valueSum._sum.amount) || 0;
    const avgDealSize = won > 0 ? totalValue / won : 0;
    const winRate = (won + lost) > 0 ? (won / (won + lost)) * 100 : 0;

    return {
      totalDeals: total,
      totalValue,
      avgDealSize,
      winRate: Math.round(winRate * 10) / 10,
      dealsWon: won,
      dealsLost: lost,
      dealsPending: pending,
    };
  }

  /**
   * Get user deal statistics
   */
  async getUserStats(filters: ReportFilters): Promise<UserDealStats[]> {
    const where = await this.buildWhereClause(filters);

    // Get all deals with assignee info
    const deals = await prisma.deal.findMany({
      where,
      include: {
        assignedTo: {
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
      deals: typeof deals;
    }>();

    for (const deal of deals) {
      if (!deal.assignedTo) continue;

      const userId = deal.assignedTo.id;
      const userName = `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`.trim();
      const reportingManager = deal.assignedTo.manager
        ? `${deal.assignedTo.manager.firstName} ${deal.assignedTo.manager.lastName}`.trim()
        : '-';

      if (!userMap.has(userId)) {
        userMap.set(userId, { userId, userName, reportingManager, deals: [] });
      }
      userMap.get(userId)!.deals.push(deal);
    }

    // Calculate stats for each user
    const stats: UserDealStats[] = [];

    for (const [userId, userData] of userMap) {
      const { userName, reportingManager, deals: userDeals } = userData;

      const wonDeals = userDeals.filter(d => d.stage === 'WON');
      const lostDeals = userDeals.filter(d => d.stage === 'LOST');
      const pendingDeals = userDeals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST');

      const totalValue = wonDeals.reduce((sum, d) => sum + Number(d.amount), 0);
      const avgDealSize = wonDeals.length > 0 ? totalValue / wonDeals.length : 0;
      const winRate = (wonDeals.length + lostDeals.length) > 0
        ? (wonDeals.length / (wonDeals.length + lostDeals.length)) * 100
        : 0;

      // Calculate average conversion time for won deals
      let avgConversionDays = 0;
      const wonDealsWithCloseDate = wonDeals.filter(d => d.actualCloseDate);
      if (wonDealsWithCloseDate.length > 0) {
        const totalDays = wonDealsWithCloseDate.reduce((sum, d) => {
          const days = Math.floor(
            (new Date(d.actualCloseDate!).getTime() - new Date(d.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
          );
          return sum + Math.max(0, days);
        }, 0);
        avgConversionDays = Math.round(totalDays / wonDealsWithCloseDate.length);
      }

      stats.push({
        userId,
        userName,
        reportingManager,
        dealsWon: wonDeals.length,
        dealsLost: lostDeals.length,
        dealsPending: pendingDeals.length,
        totalValue,
        avgDealSize: Math.round(avgDealSize),
        winRate: Math.round(winRate * 10) / 10,
        avgConversionDays,
      });
    }

    // Sort by total value descending
    stats.sort((a, b) => b.totalValue - a.totalValue);

    return stats;
  }

  /**
   * Get comprehensive deal report
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: DealSummary;
    users: UserDealStats[];
  }> {
    const [summary, users] = await Promise.all([
      this.getSummary(filters),
      this.getUserStats(filters),
    ]);

    return { summary, users };
  }

  /**
   * Get deal velocity metrics - stage-wise analysis
   */
  async getVelocityReport(filters: ReportFilters): Promise<{
    stageMetrics: StageMetrics[];
    velocitySummary: VelocitySummary;
    stalledDeals: StalledDeal[];
    trends: VelocityTrend[];
  }> {
    const where = await this.buildWhereClause(filters);

    // Get all deals with activities for stage tracking
    const deals = await prisma.deal.findMany({
      where,
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true },
        },
        lead: {
          select: { id: true, firstName: true, lastName: true },
        },
        activities: {
          where: { type: 'STAGE_CHANGE' },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // Calculate stage metrics
    const stageOrder: DealStage[] = [
      'PROSPECTING',
      'FIRST_MEETING',
      'NEEDS_ANALYSIS',
      'PROPOSAL_SENT',
      'NEGOTIATION',
      'DECISION_PENDING',
      'WON',
      'LOST',
    ];

    const stageMetrics: StageMetrics[] = [];
    const stageCounts: Record<string, number> = {};
    const stageValues: Record<string, number> = {};
    const stageDurations: Record<string, number[]> = {};

    // Initialize
    for (const stage of stageOrder) {
      stageCounts[stage] = 0;
      stageValues[stage] = 0;
      stageDurations[stage] = [];
    }

    // Process each deal
    const now = new Date();
    const stalledDeals: StalledDeal[] = [];
    let totalCycleDays = 0;
    let wonDealsCount = 0;
    let totalDealValue = 0;

    for (const deal of deals) {
      stageCounts[deal.stage]++;
      stageValues[deal.stage] += Number(deal.amount);
      totalDealValue += Number(deal.amount);

      // Calculate time in current stage
      const stageChanges = deal.activities.filter(a => a.type === 'STAGE_CHANGE');
      let lastStageChangeDate = deal.createdAt;

      if (stageChanges.length > 0) {
        const lastChange = stageChanges[stageChanges.length - 1];
        lastStageChangeDate = lastChange.createdAt;
      }

      const daysInCurrentStage = Math.floor(
        (now.getTime() - new Date(lastStageChangeDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Track duration in stage for active deals
      if (deal.stage !== 'WON' && deal.stage !== 'LOST') {
        stageDurations[deal.stage].push(daysInCurrentStage);

        // Identify stalled deals (no movement in 7+ days)
        if (daysInCurrentStage >= 7) {
          stalledDeals.push({
            dealId: deal.id,
            dealName: deal.name,
            stage: deal.stage,
            daysStalled: daysInCurrentStage,
            amount: Number(deal.amount),
            assignedTo: deal.assignedTo
              ? `${deal.assignedTo.firstName} ${deal.assignedTo.lastName}`
              : 'Unassigned',
            leadName: deal.lead
              ? `${deal.lead.firstName} ${deal.lead.lastName}`
              : '-',
          });
        }
      }

      // Calculate cycle time for won deals
      if (deal.stage === 'WON' && deal.actualCloseDate) {
        const cycleDays = Math.floor(
          (new Date(deal.actualCloseDate).getTime() - new Date(deal.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        totalCycleDays += cycleDays;
        wonDealsCount++;
      }
    }

    // Build stage metrics
    for (const stage of stageOrder) {
      const durations = stageDurations[stage];
      const avgDays =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;

      stageMetrics.push({
        stage,
        stageName: stage.replace(/_/g, ' '),
        count: stageCounts[stage],
        value: stageValues[stage],
        avgDaysInStage: avgDays,
        percentOfTotal: deals.length > 0 ? Math.round((stageCounts[stage] / deals.length) * 100) : 0,
      });
    }

    // Calculate velocity summary
    const activeDeals = deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST');
    const avgCycleTime = wonDealsCount > 0 ? Math.round(totalCycleDays / wonDealsCount) : 0;
    const pipelineValue = activeDeals.reduce((sum, d) => sum + Number(d.amount), 0);

    const velocitySummary: VelocitySummary = {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      avgCycleTimeDays: avgCycleTime,
      pipelineValue,
      pipelineVelocity: avgCycleTime > 0 ? Math.round(pipelineValue / avgCycleTime) : 0,
      stalledDealsCount: stalledDeals.length,
      stalledDealsValue: stalledDeals.reduce((sum, d) => sum + d.amount, 0),
    };

    // Calculate weekly trends (last 8 weeks)
    const trends: VelocityTrend[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekDeals = deals.filter(d => {
        const created = new Date(d.createdAt);
        return created >= weekStart && created < weekEnd;
      });

      const wonInWeek = deals.filter(d => {
        if (d.stage !== 'WON' || !d.actualCloseDate) return false;
        const closed = new Date(d.actualCloseDate);
        return closed >= weekStart && closed < weekEnd;
      });

      trends.push({
        weekLabel: `W${8 - i}`,
        weekStart: weekStart.toISOString().split('T')[0],
        dealsCreated: weekDeals.length,
        dealsClosed: wonInWeek.length,
        valueCreated: weekDeals.reduce((sum, d) => sum + Number(d.amount), 0),
        valueClosed: wonInWeek.reduce((sum, d) => sum + Number(d.amount), 0),
      });
    }

    // Sort stalled deals by days stalled (descending)
    stalledDeals.sort((a, b) => b.daysStalled - a.daysStalled);

    return {
      stageMetrics,
      velocitySummary,
      stalledDeals: stalledDeals.slice(0, 20), // Top 20 stalled deals
      trends,
    };
  }

  /**
   * Get Lead-based velocity report (works for all industries)
   * Uses LeadStage.autoSyncStatus for WON/LOST detection
   */
  async getLeadVelocityReport(filters: ReportFilters): Promise<{
    stageMetrics: StageMetrics[];
    velocitySummary: VelocitySummary;
    stalledDeals: StalledDeal[];
    trends: VelocityTrend[];
  }> {
    const { organizationId, startDate, endDate, userId, userRole } = filters;

    // Build where clause for leads
    const leadWhere: Prisma.LeadWhereInput = { organizationId };

    if (startDate && endDate) {
      leadWhere.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');
    if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      if (userId) leadWhere.assignedToId = userId;
    } else if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      leadWhere.assignedToId = { in: [userId, ...teamMembers.map(m => m.id)] };
    } else if (normalizedRole === 'manager' && userId) {
      const teamLeads = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);
      const allTeamMembers = await prisma.user.findMany({
        where: { organizationId, OR: [{ managerId: { in: teamLeadIds } }, { managerId: userId }], isActive: true },
        select: { id: true },
      });
      leadWhere.assignedToId = { in: [userId, ...teamLeadIds, ...allTeamMembers.map(m => m.id)] };
    }

    // Get all lead stages for this org
    const stages = await prisma.leadStage.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });

    // Get all leads with stage info and assignments
    const leads = await prisma.lead.findMany({
      where: leadWhere,
      include: {
        stage: { select: { id: true, name: true, autoSyncStatus: true, order: true } },
        assignments: {
          where: { isActive: true },
          include: { assignedTo: { select: { id: true, firstName: true, lastName: true } } },
          take: 1,
        },
        payments: { select: { amount: true, status: true } },
      },
    });

    const now = new Date();
    const stageMetrics: StageMetrics[] = [];
    const stalledDeals: StalledDeal[] = [];

    // Calculate metrics per stage
    for (const stage of stages) {
      const stageLeads = leads.filter(l => l.stageId === stage.id);

      // Calculate value from payments
      const stageValue = stageLeads.reduce((sum, lead) => {
        const paidAmount = lead.payments
          .filter(p => p.status === 'COMPLETED' || p.status === 'PAID')
          .reduce((s, p) => s + Number(p.amount), 0);
        return sum + paidAmount;
      }, 0);

      // Calculate avg days in stage (use pipelineEnteredAt or updatedAt or createdAt)
      const durations: number[] = [];
      for (const lead of stageLeads) {
        const stageDate = lead.pipelineEnteredAt || lead.updatedAt || lead.createdAt;
        const days = Math.floor((now.getTime() - new Date(stageDate).getTime()) / (1000 * 60 * 60 * 24));
        durations.push(days);

        // Get assigned user from assignments
        const assignedUser = lead.assignments[0]?.assignedTo;

        // Identify stalled leads (7+ days without movement, not won/lost)
        if (days >= 7 && stage.autoSyncStatus !== 'WON' && stage.autoSyncStatus !== 'LOST') {
          stalledDeals.push({
            dealId: lead.id,
            dealName: `${lead.firstName} ${lead.lastName || ''}`.trim() || 'Unknown',
            stage: stage.name,
            daysStalled: days,
            amount: lead.payments.reduce((s, p) => s + Number(p.amount), 0),
            assignedTo: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
            leadName: lead.email || lead.phone || '-',
          });
        }
      }

      const avgDays = durations.length > 0
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0;

      stageMetrics.push({
        stage: stage.id,
        stageName: stage.name,
        count: stageLeads.length,
        value: stageValue,
        avgDaysInStage: avgDays,
        percentOfTotal: leads.length > 0 ? Math.round((stageLeads.length / leads.length) * 100) : 0,
        stageStatus: stage.autoSyncStatus || null, // WON, LOST, or null (active)
        order: stage.order,
      });
    }

    // Calculate summary
    const wonStageIds = stages.filter(s => s.autoSyncStatus === 'WON').map(s => s.id);
    const lostStageIds = stages.filter(s => s.autoSyncStatus === 'LOST').map(s => s.id);

    const wonLeads = leads.filter(l => l.stageId && wonStageIds.includes(l.stageId));
    const lostLeads = leads.filter(l => l.stageId && lostStageIds.includes(l.stageId));
    const activeLeads = leads.filter(l => !l.stageId || (!wonStageIds.includes(l.stageId) && !lostStageIds.includes(l.stageId)));

    // Calculate total value from won leads' payments
    const totalValue = wonLeads.reduce((sum, lead) => {
      return sum + lead.payments
        .filter(p => p.status === 'COMPLETED' || p.status === 'PAID')
        .reduce((s, p) => s + Number(p.amount), 0);
    }, 0);

    // Calculate avg cycle time (days from creation to won)
    let totalCycleDays = 0;
    let cycleCount = 0;
    for (const lead of wonLeads) {
      const stageDate = lead.pipelineEnteredAt || lead.updatedAt;
      if (stageDate) {
        const days = Math.floor((new Date(stageDate).getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        totalCycleDays += Math.max(0, days);
        cycleCount++;
      }
    }
    const avgCycleTime = cycleCount > 0 ? Math.round(totalCycleDays / cycleCount) : 0;

    const pipelineValue = activeLeads.reduce((sum, lead) => {
      return sum + lead.payments.reduce((s, p) => s + Number(p.amount), 0);
    }, 0);

    const velocitySummary: VelocitySummary = {
      totalDeals: leads.length,
      activeDeals: activeLeads.length,
      avgCycleTimeDays: avgCycleTime,
      pipelineValue,
      pipelineVelocity: avgCycleTime > 0 ? Math.round(pipelineValue / avgCycleTime) : 0,
      stalledDealsCount: stalledDeals.length,
      stalledDealsValue: stalledDeals.reduce((sum, d) => sum + d.amount, 0),
    };

    // Calculate weekly trends
    const trends: VelocityTrend[] = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i + 1) * 7);
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);

      const weekLeads = leads.filter(l => {
        const created = new Date(l.createdAt);
        return created >= weekStart && created < weekEnd;
      });

      const wonInWeek = leads.filter(l => {
        if (!l.stageId || !wonStageIds.includes(l.stageId)) return false;
        const stageDate = l.pipelineEnteredAt || l.updatedAt;
        if (!stageDate) return false;
        const changed = new Date(stageDate);
        return changed >= weekStart && changed < weekEnd;
      });

      const weekValue = weekLeads.reduce((sum, l) => sum + l.payments.reduce((s, p) => s + Number(p.amount), 0), 0);
      const wonValue = wonInWeek.reduce((sum, l) => sum + l.payments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').reduce((s, p) => s + Number(p.amount), 0), 0);

      trends.push({
        weekLabel: `W${8 - i}`,
        weekStart: weekStart.toISOString().split('T')[0],
        dealsCreated: weekLeads.length,
        dealsClosed: wonInWeek.length,
        valueCreated: weekValue,
        valueClosed: wonValue,
      });
    }

    stalledDeals.sort((a, b) => b.daysStalled - a.daysStalled);

    return {
      stageMetrics,
      velocitySummary,
      stalledDeals: stalledDeals.slice(0, 20),
      trends,
    };
  }
}

// Additional interfaces for velocity report
interface StageMetrics {
  stage: string;
  stageName: string;
  count: number;
  value: number;
  avgDaysInStage: number;
  percentOfTotal: number;
  stageStatus: string | null; // WON, LOST, or null (active pipeline)
  order: number;
}

interface VelocitySummary {
  totalDeals: number;
  activeDeals: number;
  avgCycleTimeDays: number;
  pipelineValue: number;
  pipelineVelocity: number; // Value per day
  stalledDealsCount: number;
  stalledDealsValue: number;
}

interface StalledDeal {
  dealId: string;
  dealName: string;
  stage: string;
  daysStalled: number;
  amount: number;
  assignedTo: string;
  leadName: string;
}

interface VelocityTrend {
  weekLabel: string;
  weekStart: string;
  dealsCreated: number;
  dealsClosed: number;
  valueCreated: number;
  valueClosed: number;
}

export const dealReportsService = new DealReportsService();
