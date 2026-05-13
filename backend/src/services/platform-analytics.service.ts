/**
 * Platform Analytics Service
 *
 * Marketing ROI metrics for MyLeadX's own SaaS sales:
 *   - Channel breakdown (prospects, conversions, CAC, LTV, ROI by source)
 *   - Conversion funnel (NEW → MQL → SQL → DEMO → TRIAL → PAID)
 *   - Sales rep performance leaderboard
 *
 * Spend data is read from the existing AdCampaign / ad-insights-sync flow
 * when available; manual spend can be stitched in later via the
 * marketing_spend table (Phase 9).
 */

import { prisma } from '../config/database';
import { ProspectSource, ProspectStage, SubscriptionStatus, Prisma } from '@prisma/client';

export interface AnalyticsDateRange {
  fromDate?: Date;
  toDate?: Date;
}

export interface ChannelMetric {
  source: ProspectSource;
  prospects: number;
  mqlPlus: number;
  demos: number;
  trials: number;
  paid: number;
  lost: number;
  totalRevenue: number;
  cpl: number | null;
  cac: number | null;
  ltv: number | null;
  roi: number | null;
  spend: number;
  conversionRate: number;
}

export interface FunnelStep {
  stage: ProspectStage;
  count: number;
  pctOfTop: number;
}

export interface SalesRepMetric {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  prospectsAssigned: number;
  callsMade: number;
  demosScheduled: number;
  trialsStarted: number;
  paidConversions: number;
  totalRevenue: number;
}

export class PlatformAnalyticsService {
  private dateFilter(range: AnalyticsDateRange): Prisma.PlatformProspectWhereInput {
    if (!range.fromDate && !range.toDate) return {};
    const createdAt: Prisma.DateTimeFilter = {};
    if (range.fromDate) createdAt.gte = range.fromDate;
    if (range.toDate) createdAt.lte = range.toDate;
    return { createdAt };
  }

  /**
   * Per-channel breakdown: counts at every stage, revenue, derived ratios.
   */
  async channelBreakdown(range: AnalyticsDateRange = {}): Promise<ChannelMetric[]> {
    const whereBase = this.dateFilter(range);

    const allProspects = await prisma.platformProspect.findMany({
      where: whereBase,
      select: {
        id: true,
        source: true,
        stage: true,
        organizationId: true,
      },
    });

    const convertedOrgIds = allProspects
      .filter((p) => p.organizationId)
      .map((p) => p.organizationId!) as string[];

    const subscriptions = convertedOrgIds.length
      ? await prisma.subscription.findMany({
          where: {
            organizationId: { in: convertedOrgIds },
            status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
          },
          select: { organizationId: true, amount: true, status: true },
        })
      : [];

    const subByOrg = new Map<string, { amount: number; isPaid: boolean }>();
    for (const sub of subscriptions) {
      subByOrg.set(sub.organizationId, {
        amount: Number(sub.amount),
        isPaid: sub.status === SubscriptionStatus.ACTIVE,
      });
    }

    const adSpend = await prisma.adCampaign.groupBy({
      by: ['platform'],
      where: {},
      _sum: { spend: true },
    });
    const spendByPlatform: Record<string, number> = {};
    for (const row of adSpend) {
      spendByPlatform[row.platform] = Number(row._sum.spend || 0);
    }

    const grouped = new Map<ProspectSource, ChannelMetric>();
    for (const p of allProspects) {
      if (!grouped.has(p.source)) {
        grouped.set(p.source, this.emptyChannelMetric(p.source));
      }
      const m = grouped.get(p.source)!;
      m.prospects += 1;
      if (this.isMqlOrAbove(p.stage)) m.mqlPlus += 1;
      if (this.isDemoOrAbove(p.stage)) m.demos += 1;
      if (this.isTrialOrAbove(p.stage)) m.trials += 1;
      if (p.stage === ProspectStage.CONVERTED) m.paid += 1;
      if (p.stage === ProspectStage.LOST) m.lost += 1;

      if (p.organizationId && subByOrg.has(p.organizationId)) {
        const sub = subByOrg.get(p.organizationId)!;
        if (sub.isPaid) m.totalRevenue += sub.amount;
      }
    }

    for (const m of grouped.values()) {
      m.spend = this.estimateSpendForSource(m.source, spendByPlatform);
      m.cpl = m.spend > 0 && m.prospects > 0 ? m.spend / m.prospects : null;
      m.cac = m.spend > 0 && m.paid > 0 ? m.spend / m.paid : null;
      m.ltv = m.paid > 0 ? m.totalRevenue / m.paid : null;
      m.roi = m.spend > 0 ? (m.totalRevenue - m.spend) / m.spend : null;
      m.conversionRate = m.prospects > 0 ? m.paid / m.prospects : 0;
    }

    return Array.from(grouped.values()).sort((a, b) => b.prospects - a.prospects);
  }

  /**
   * Conversion funnel across all prospects (or filtered by source).
   */
  async conversionFunnel(source?: ProspectSource, range: AnalyticsDateRange = {}): Promise<FunnelStep[]> {
    const where: Prisma.PlatformProspectWhereInput = { ...this.dateFilter(range) };
    if (source) where.source = source;

    const all = await prisma.platformProspect.findMany({
      where,
      select: { stage: true, stageHistory: true },
    });

    const reached: Record<ProspectStage, number> = {
      NEW: 0,
      MQL: 0,
      SQL: 0,
      DEMO_SCHEDULED: 0,
      DEMO_DONE: 0,
      PROPOSAL_SENT: 0,
      NEGOTIATING: 0,
      TRIAL_STARTED: 0,
      CONVERTED: 0,
      LOST: 0,
      UNRESPONSIVE: 0,
    };

    for (const p of all) {
      const history = (p.stageHistory as unknown as Array<{ to?: string }>) || [];
      const reachedStages = new Set<string>([p.stage]);
      for (const entry of history) {
        if (entry.to) reachedStages.add(entry.to);
      }
      for (const stage of reachedStages) {
        if (stage in reached) {
          reached[stage as ProspectStage] += 1;
        }
      }
    }

    const orderedStages: ProspectStage[] = [
      ProspectStage.NEW,
      ProspectStage.MQL,
      ProspectStage.SQL,
      ProspectStage.DEMO_SCHEDULED,
      ProspectStage.DEMO_DONE,
      ProspectStage.TRIAL_STARTED,
      ProspectStage.CONVERTED,
    ];

    const top = reached[ProspectStage.NEW] || all.length || 1;

    return orderedStages.map((stage) => ({
      stage,
      count: reached[stage],
      pctOfTop: top > 0 ? reached[stage] / top : 0,
    }));
  }

  /**
   * Sales rep performance — uses ProspectActivity counts + assignment.
   */
  async salesRepLeaderboard(range: AnalyticsDateRange = {}): Promise<SalesRepMetric[]> {
    const activityWhere: Prisma.ProspectActivityWhereInput = {};
    if (range.fromDate || range.toDate) {
      activityWhere.createdAt = {};
      if (range.fromDate) activityWhere.createdAt.gte = range.fromDate;
      if (range.toDate) activityWhere.createdAt.lte = range.toDate;
    }

    const [assignments, callCounts, demoCounts, prospects, users] = await Promise.all([
      prisma.platformProspect.groupBy({
        by: ['assignedToId'],
        where: { assignedToId: { not: null }, ...this.dateFilter(range) },
        _count: { _all: true },
      }),
      prisma.prospectActivity.groupBy({
        by: ['userId'],
        where: { ...activityWhere, type: 'CALL' },
        _count: { _all: true },
      }),
      prisma.prospectActivity.groupBy({
        by: ['userId'],
        where: { ...activityWhere, type: 'DEMO_SCHEDULED' },
        _count: { _all: true },
      }),
      prisma.platformProspect.findMany({
        where: { assignedToId: { not: null }, ...this.dateFilter(range) },
        select: {
          assignedToId: true,
          stage: true,
          organizationId: true,
        },
      }),
      prisma.user.findMany({
        select: { id: true, firstName: true, lastName: true, email: true },
      }),
    ]);

    const orgIds = prospects.map((p) => p.organizationId).filter(Boolean) as string[];
    const subs = orgIds.length
      ? await prisma.subscription.findMany({
          where: { organizationId: { in: orgIds }, status: SubscriptionStatus.ACTIVE },
          select: { organizationId: true, amount: true },
        })
      : [];
    const revenueByOrg = new Map<string, number>();
    for (const s of subs) {
      revenueByOrg.set(s.organizationId, Number(s.amount));
    }

    const usersById = new Map(users.map((u) => [u.id, u]));
    const callsByUser = new Map(callCounts.map((c) => [c.userId, c._count._all]));
    const demosByUser = new Map(demoCounts.map((c) => [c.userId, c._count._all]));

    const repStats = new Map<string, SalesRepMetric>();
    const ensure = (userId: string): SalesRepMetric => {
      if (!repStats.has(userId)) {
        const u = usersById.get(userId);
        repStats.set(userId, {
          userId,
          firstName: u?.firstName || '—',
          lastName: u?.lastName || '',
          email: u?.email || '',
          prospectsAssigned: 0,
          callsMade: 0,
          demosScheduled: 0,
          trialsStarted: 0,
          paidConversions: 0,
          totalRevenue: 0,
        });
      }
      return repStats.get(userId)!;
    };

    for (const a of assignments) {
      if (!a.assignedToId) continue;
      ensure(a.assignedToId).prospectsAssigned = a._count._all;
    }
    for (const [userId, count] of callsByUser.entries()) {
      ensure(userId).callsMade = count;
    }
    for (const [userId, count] of demosByUser.entries()) {
      ensure(userId).demosScheduled = count;
    }

    for (const p of prospects) {
      if (!p.assignedToId) continue;
      const m = ensure(p.assignedToId);
      if (p.stage === ProspectStage.TRIAL_STARTED) m.trialsStarted += 1;
      if (p.stage === ProspectStage.CONVERTED) {
        m.paidConversions += 1;
        if (p.organizationId && revenueByOrg.has(p.organizationId)) {
          m.totalRevenue += revenueByOrg.get(p.organizationId)!;
        }
      }
    }

    return Array.from(repStats.values()).sort((a, b) => b.paidConversions - a.paidConversions);
  }

  /**
   * Daily prospect counts for a sparkline / time-series chart.
   */
  async dailyProspectCounts(range: AnalyticsDateRange): Promise<Array<{ date: string; count: number }>> {
    const where: Prisma.PlatformProspectWhereInput = {};
    if (range.fromDate || range.toDate) {
      where.createdAt = {};
      if (range.fromDate) where.createdAt.gte = range.fromDate;
      if (range.toDate) where.createdAt.lte = range.toDate;
    }

    const all = await prisma.platformProspect.findMany({
      where,
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const counts = new Map<string, number>();
    for (const p of all) {
      const day = p.createdAt.toISOString().slice(0, 10);
      counts.set(day, (counts.get(day) || 0) + 1);
    }

    return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
  }

  private isMqlOrAbove(stage: ProspectStage): boolean {
    return ![ProspectStage.NEW, ProspectStage.LOST, ProspectStage.UNRESPONSIVE].includes(stage);
  }

  private isDemoOrAbove(stage: ProspectStage): boolean {
    return [
      ProspectStage.DEMO_SCHEDULED,
      ProspectStage.DEMO_DONE,
      ProspectStage.PROPOSAL_SENT,
      ProspectStage.NEGOTIATING,
      ProspectStage.TRIAL_STARTED,
      ProspectStage.CONVERTED,
    ].includes(stage);
  }

  private isTrialOrAbove(stage: ProspectStage): boolean {
    return [ProspectStage.TRIAL_STARTED, ProspectStage.CONVERTED].includes(stage);
  }

  private emptyChannelMetric(source: ProspectSource): ChannelMetric {
    return {
      source,
      prospects: 0,
      mqlPlus: 0,
      demos: 0,
      trials: 0,
      paid: 0,
      lost: 0,
      totalRevenue: 0,
      cpl: null,
      cac: null,
      ltv: null,
      roi: null,
      spend: 0,
      conversionRate: 0,
    };
  }

  /**
   * Best-effort mapping from prospect source → AdCampaign platform total spend.
   * AdCampaign.platform values are platform-level (FACEBOOK, INSTAGRAM, GOOGLE, etc.).
   */
  private estimateSpendForSource(source: ProspectSource, spendByPlatform: Record<string, number>): number {
    const sourceToPlatforms: Partial<Record<ProspectSource, string[]>> = {
      META_LEAD_AD: ['FACEBOOK', 'INSTAGRAM'],
      META_LANDING_PAGE: ['FACEBOOK', 'INSTAGRAM'],
      GOOGLE_LEAD_FORM: ['GOOGLE'],
      GOOGLE_ADS_LANDING: ['GOOGLE'],
      LINKEDIN_LEAD_GEN: ['LINKEDIN'],
      TIKTOK_LEAD_GEN: ['TIKTOK'],
      TWITTER_LEAD_GEN: ['TWITTER'],
      YOUTUBE_LEAD_GEN: ['YOUTUBE'],
    };
    const platforms = sourceToPlatforms[source];
    if (!platforms) return 0;
    return platforms.reduce((sum, p) => sum + (spendByPlatform[p] || 0), 0);
  }
}

export const platformAnalyticsService = new PlatformAnalyticsService();
