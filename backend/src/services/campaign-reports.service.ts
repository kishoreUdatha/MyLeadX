/**
 * Campaign/Source Reports Service
 * Tenant-scoped lead source and campaign analytics
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
  sourceId?: string;
  campaignId?: string;
  branchId?: string;
}

interface SourceLeadCount {
  sourceId: string;
  sourceName: string;
  leadCount: number;
  percentage: string;
  trend: number; // % change from previous period
}

interface SourceCost {
  sourceId: string;
  sourceName: string;
  totalCost: number;
  leadCount: number;
  costPerLead: number;
  conversions: number;
  costPerConversion: number;
}

interface SourceConversion {
  sourceId: string;
  sourceName: string;
  leads: number;
  contacted: number;
  qualified: number;
  conversions: number;
  conversionRate: string;
  avgConversionTime: number; // days
}

interface CampaignROI {
  campaignId: string;
  campaignName: string;
  source: string;
  totalSpend: number;
  leads: number;
  conversions: number;
  revenue: number;
  roi: string;
  costPerLead: number;
  costPerConversion: number;
}

interface BranchSourceReport {
  branchId: string;
  branchName: string;
  sources: {
    sourceId: string;
    sourceName: string;
    leads: number;
    conversions: number;
    conversionRate: string;
  }[];
  totalLeads: number;
  totalConversions: number;
}

interface SourceTrend {
  period: string;
  sources: { sourceId: string; sourceName: string; count: number }[];
  total: number;
}

interface CampaignLeadStats {
  campaignId: string;
  campaignName: string;
  newLeads: number;
  qualified: number;
  unqualified: number;
  contacted: number;
  notContacted: number;
  avgScore: number;
  topSource: string;
}

interface CampaignStageStats {
  campaign: string;
  stages: Record<string, number>;
  total: number;
}

interface CampaignDealStats {
  campaign: string;
  wonDeals: number;
  lostDeals: number;
  totalRevenue: number;
  avgDealValue: number;
  winRate: string;
  pipelineValue: number;
}

interface CampaignLeadSummary {
  totalLeads: number;
  newThisWeek: number;
  qualifiedLeads: number;
  avgLeadScore: number;
}

class CampaignReportsService {
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * 1. SOURCE-WISE LEAD COUNT
   */
  async getSourceLeadCount(filters: ReportFilters): Promise<SourceLeadCount[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Current period - group by source enum
    const bySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    // Previous period for trend
    const periodLength = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - periodLength);
    const prevEnd = new Date(dateRange.start.getTime() - 1);

    const prevBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: prevStart, lte: prevEnd },
      },
      _count: { id: true },
    });

    const prevSourceMap = prevBySource.reduce((acc, s) => {
      acc[s.source] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    const totalLeads = bySource.reduce((sum, s) => sum + s._count.id, 0);

    return bySource.map(s => {
      const prevCount = prevSourceMap[s.source] || 0;
      const trend = prevCount > 0 ? ((s._count.id - prevCount) / prevCount) * 100 : 0;

      return {
        sourceId: s.source,
        sourceName: formatSourceName(s.source),
        leadCount: s._count.id,
        percentage: totalLeads > 0 ? ((s._count.id / totalLeads) * 100).toFixed(1) : '0',
        trend: Math.round(trend),
      };
    }).sort((a, b) => b.leadCount - a.leadCount);
  }

  /**
   * 2. SOURCE-WISE COST
   */
  async getSourceCost(filters: ReportFilters): Promise<SourceCost[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get leads grouped by source enum
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    // Get conversions by source
    const conversionsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        isConverted: true,
      },
      _count: { id: true },
    });

    const conversionMap = conversionsBySource.reduce((acc, s) => {
      acc[s.source] = s._count.id;
      return acc;
    }, {} as Record<string, number>);

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    return leadsBySource.map(s => ({
      sourceId: s.source,
      sourceName: formatSourceName(s.source),
      totalCost: 0, // Cost tracking not available per source
      leadCount: s._count.id,
      costPerLead: 0,
      conversions: conversionMap[s.source] || 0,
      costPerConversion: 0,
    })).sort((a, b) => b.leadCount - a.leadCount);
  }

  /**
   * 3. SOURCE-WISE CONVERSION
   */
  async getSourceConversion(filters: ReportFilters): Promise<SourceConversion[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get all unique sources used in leads
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    const results: SourceConversion[] = [];

    for (const sourceGroup of leadsBySource) {
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          source: sourceGroup.source,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          isConverted: true,
          pipelineStage: { select: { stageType: true } },
        },
      });

      if (leads.length === 0) continue;

      let contacted = 0;
      let qualified = 0;
      let conversions = 0;

      for (const lead of leads) {
        const stageType = lead.pipelineStage?.stageType?.toLowerCase() || '';
        // stageType values: "entry", "active", "won", "lost", "archived"
        if (['active', 'won'].includes(stageType)) {
          contacted++;
        }
        if (['active', 'won'].includes(stageType)) {
          qualified++;
        }
        if (lead.isConverted || stageType === 'won') {
          conversions++;
        }
      }

      results.push({
        sourceId: sourceGroup.source,
        sourceName: formatSourceName(sourceGroup.source),
        leads: leads.length,
        contacted,
        qualified,
        conversions,
        conversionRate: leads.length > 0 ? ((conversions / leads.length) * 100).toFixed(1) : '0',
        avgConversionTime: 0,
      });
    }

    return results.sort((a, b) => parseFloat(b.conversionRate) - parseFloat(a.conversionRate));
  }

  /**
   * 4. CAMPAIGN ROI
   */
  async getCampaignROI(filters: ReportFilters): Promise<CampaignROI[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const campaigns = await prisma.campaign.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        id: true,
        name: true,
        sourceType: true,
        budget: true,
        leads: {
          select: {
            pipelineStage: { select: { stageType: true } },
            admissions: { select: { totalFee: true } },
          },
        },
      },
    });

    return campaigns.map(campaign => {
      const leads = campaign.leads.length;
      const conversions = campaign.leads.filter(
        l => l.pipelineStage?.stageType === 'won'
      ).length;
      const revenue = campaign.leads.reduce((sum, l) => {
        return sum + l.admissions.reduce((s, a) => s + Number(a.totalFee || 0), 0);
      }, 0);
      const spend = Number(campaign.budget || 0);

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        source: campaign.sourceType || 'Unknown',
        totalSpend: spend,
        leads,
        conversions,
        revenue,
        roi: spend > 0 ? (((revenue - spend) / spend) * 100).toFixed(1) : '0',
        costPerLead: leads > 0 ? Math.round(spend / leads) : 0,
        costPerConversion: conversions > 0 ? Math.round(spend / conversions) : 0,
      };
    }).sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
  }

  /**
   * 5. BRANCH-WISE SOURCE REPORT
   */
  async getBranchSourceReport(filters: ReportFilters): Promise<BranchSourceReport[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const branches = await prisma.branch.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true },
    });

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    const results: BranchSourceReport[] = [];

    for (const branch of branches) {
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          orgBranchId: branch.id,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        select: {
          source: true,
          isConverted: true,
          pipelineStage: { select: { stageType: true } },
        },
      });

      // Group by source
      const sourceStats = new Map<string, {
        name: string;
        leads: number;
        conversions: number;
      }>();

      for (const lead of leads) {
        const sourceId = lead.source;
        const existing = sourceStats.get(sourceId) || {
          name: formatSourceName(lead.source),
          leads: 0,
          conversions: 0,
        };
        existing.leads++;
        const stageType = lead.pipelineStage?.stageType?.toLowerCase() || '';
        if (lead.isConverted || stageType === 'won') {
          existing.conversions++;
        }
        sourceStats.set(sourceId, existing);
      }

      const sources = Array.from(sourceStats.entries()).map(([sourceId, stats]) => ({
        sourceId,
        sourceName: stats.name,
        leads: stats.leads,
        conversions: stats.conversions,
        conversionRate: stats.leads > 0 ? ((stats.conversions / stats.leads) * 100).toFixed(1) : '0',
      }));

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        sources: sources.sort((a, b) => b.leads - a.leads),
        totalLeads: leads.length,
        totalConversions: sources.reduce((sum, s) => sum + s.conversions, 0),
      });
    }

    return results.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  /**
   * 6. SOURCE TRENDS (Over time)
   */
  async getSourceTrends(
    filters: ReportFilters,
    interval: 'day' | 'week' | 'month' = 'week'
  ): Promise<SourceTrend[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: {
        createdAt: true,
        source: true,
      },
    });

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    const grouped = new Map<string, Map<string, { name: string; count: number }>>();

    for (const lead of leads) {
      const periodKey = this.getIntervalKey(lead.createdAt, interval);
      const sourceId = lead.source;
      const sourceName = formatSourceName(lead.source);

      if (!grouped.has(periodKey)) {
        grouped.set(periodKey, new Map());
      }

      const periodSources = grouped.get(periodKey)!;
      const existing = periodSources.get(sourceId) || { name: sourceName, count: 0 };
      existing.count++;
      periodSources.set(sourceId, existing);
    }

    return Array.from(grouped.entries())
      .map(([period, sources]) => ({
        period,
        sources: Array.from(sources.entries()).map(([sourceId, data]) => ({
          sourceId,
          sourceName: data.name,
          count: data.count,
        })),
        total: Array.from(sources.values()).reduce((sum, s) => sum + s.count, 0),
      }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 7. CAMPAIGN LEAD STATS (for Campaign Lead Report page)
   * Groups leads by source since Campaign model doesn't have direct leads relation
   */
  async getCampaignLeadStats(filters: ReportFilters): Promise<{
    summary: CampaignLeadSummary;
    campaigns: CampaignLeadStats[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    // Calculate this week's date range
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    // Get all leads grouped by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    let totalLeads = 0;
    let newThisWeek = 0;
    let qualifiedLeads = 0;
    let totalScore = 0;
    let scoreCount = 0;

    const campaignStats: CampaignLeadStats[] = [];

    for (const sourceGroup of leadsBySource) {
      const source = sourceGroup.source;
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          source,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        include: {
          pipelineStage: { select: { stageType: true } },
          leadScore: { select: { overallScore: true } },
        },
      });

      totalLeads += leads.length;
      const thisWeekLeads = leads.filter(l => new Date(l.createdAt) >= weekStart);
      newThisWeek += thisWeekLeads.length;

      let qualified = 0;
      let unqualified = 0;
      let contacted = 0;
      let notContacted = 0;
      let sourceScoreSum = 0;
      let sourceScoreCount = 0;

      for (const lead of leads) {
        const stageType = lead.pipelineStage?.stageType?.toLowerCase() || 'entry';

        // Qualified: leads in active or won stages
        if (['active', 'won'].includes(stageType)) {
          qualified++;
          qualifiedLeads++;
        } else if (stageType === 'lost') {
          unqualified++;
        }

        // Contacted: leads not in entry stage
        if (stageType !== 'entry') {
          contacted++;
        } else {
          notContacted++;
        }

        // Lead score
        if (lead.leadScore?.overallScore) {
          sourceScoreSum += lead.leadScore.score;
          sourceScoreCount++;
          totalScore += lead.leadScore.score;
          scoreCount++;
        }
      }

      const avgScore = sourceScoreCount > 0 ? Math.round(sourceScoreSum / sourceScoreCount) : 0;

      campaignStats.push({
        campaignId: source,
        campaignName: formatSourceName(source),
        newLeads: leads.length,
        qualified,
        unqualified,
        contacted,
        notContacted,
        avgScore,
        topSource: formatSourceName(source),
      });
    }

    // Sort by new leads descending
    campaignStats.sort((a, b) => b.newLeads - a.newLeads);

    const avgLeadScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return {
      summary: {
        totalLeads,
        newThisWeek,
        qualifiedLeads,
        avgLeadScore,
      },
      campaigns: campaignStats,
    };
  }

  /**
   * 8. CAMPAIGN DEAL STATS (for Campaign Deal Report page)
   * Shows deal performance by campaign/source
   */
  async getCampaignDealStats(filters: ReportFilters): Promise<{
    summary: {
      totalDeals: number;
      totalRevenue: number;
      avgDealValue: number;
      bestCampaign: string;
    };
    campaigns: CampaignDealStats[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get all leads grouped by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    const campaignStats: CampaignDealStats[] = [];
    let totalDeals = 0;
    let totalRevenue = 0;
    let bestCampaign = '';
    let bestCampaignRevenue = 0;

    for (const sourceGroup of leadsBySource) {
      const source = sourceGroup.source;

      // Get leads with their stages and deals/admissions
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          source,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        include: {
          pipelineStage: { select: { stageType: true } },
          admissions: { select: { totalFee: true, status: true } },
          deals: { select: { amount: true, stage: true } },
        },
      });

      let wonDeals = 0;
      let lostDeals = 0;
      let campaignRevenue = 0;
      let pipelineValue = 0;

      for (const lead of leads) {
        const stageType = lead.pipelineStage?.stageType?.toLowerCase() || '';

        // Count won/lost based on stage type or isConverted
        if (lead.isConverted || stageType === 'won') {
          wonDeals++;
          // Add revenue from admissions
          for (const admission of lead.admissions) {
            campaignRevenue += Number(admission.totalFee || 0);
          }
          // Add revenue from deals marked as WON
          for (const deal of lead.deals) {
            if (deal.stage === 'WON') {
              campaignRevenue += Number(deal.amount || 0);
            }
          }
        } else if (stageType === 'lost') {
          lostDeals++;
        }

        // Also count deals directly
        for (const deal of lead.deals) {
          if (deal.stage === 'WON') {
            // Already counted above if lead is converted
            if (!lead.isConverted && stageType !== 'won') {
              wonDeals++;
              campaignRevenue += Number(deal.amount || 0);
            }
          } else if (deal.stage === 'LOST') {
            if (stageType !== 'lost') {
              lostDeals++;
            }
          } else {
            // Pipeline value - deals in progress
            pipelineValue += Number(deal.amount || 0);
          }
        }
      }

      const totalCampaignDeals = wonDeals + lostDeals;
      const winRate = totalCampaignDeals > 0 ? ((wonDeals / totalCampaignDeals) * 100).toFixed(1) : '0';
      const avgDealValue = wonDeals > 0 ? Math.round(campaignRevenue / wonDeals) : 0;

      campaignStats.push({
        campaign: formatSourceName(source),
        wonDeals,
        lostDeals,
        totalRevenue: campaignRevenue,
        avgDealValue,
        winRate,
        pipelineValue,
      });

      totalDeals += wonDeals;
      totalRevenue += campaignRevenue;

      if (campaignRevenue > bestCampaignRevenue) {
        bestCampaignRevenue = campaignRevenue;
        bestCampaign = formatSourceName(source);
      }
    }

    // Sort by revenue descending
    campaignStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    const avgDealValue = totalDeals > 0 ? Math.round(totalRevenue / totalDeals) : 0;

    return {
      summary: {
        totalDeals,
        totalRevenue,
        avgDealValue,
        bestCampaign: bestCampaign || 'N/A',
      },
      campaigns: campaignStats,
    };
  }

  /**
   * 9. CAMPAIGN STAGE STATS (for Campaign Stage Report page)
   * Shows lead stage distribution by campaign/source
   */
  async getCampaignStageStats(filters: ReportFilters): Promise<{
    stages: string[];
    campaigns: CampaignStageStats[];
    totals: Record<string, number>;
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Format source names
    const formatSourceName = (source: string): string => {
      return source
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
    };

    // Get all pipeline stages for this organization
    const pipelineStages = await prisma.pipelineStage.findMany({
      where: {
        pipeline: { organizationId },
      },
      select: { id: true, name: true, stageType: true, order: true },
      orderBy: { order: 'asc' },
    });

    // Create stage name list (unique)
    const stageNames = [...new Set(pipelineStages.map(s => s.name))];

    // Get all leads grouped by source
    const leadsBySource = await prisma.lead.groupBy({
      by: ['source'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    const campaignStats: CampaignStageStats[] = [];
    const totals: Record<string, number> = {};

    // Initialize totals
    for (const stageName of stageNames) {
      totals[stageName] = 0;
    }

    for (const sourceGroup of leadsBySource) {
      const source = sourceGroup.source;

      // Get leads with their stages
      const leads = await prisma.lead.findMany({
        where: {
          organizationId,
          source,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        include: {
          pipelineStage: { select: { name: true } },
        },
      });

      // Count leads per stage
      const stageCounts: Record<string, number> = {};
      for (const stageName of stageNames) {
        stageCounts[stageName] = 0;
      }

      for (const lead of leads) {
        const stageName = lead.pipelineStage?.name || 'New';
        if (stageCounts[stageName] !== undefined) {
          stageCounts[stageName]++;
          totals[stageName]++;
        } else {
          // Handle leads with stages not in our list
          if (!stageCounts['Other']) {
            stageCounts['Other'] = 0;
            if (!stageNames.includes('Other')) stageNames.push('Other');
            if (totals['Other'] === undefined) totals['Other'] = 0;
          }
          stageCounts['Other']++;
          totals['Other']++;
        }
      }

      campaignStats.push({
        campaign: formatSourceName(source),
        stages: stageCounts,
        total: leads.length,
      });
    }

    // Sort by total leads descending
    campaignStats.sort((a, b) => b.total - a.total);

    return {
      stages: stageNames,
      campaigns: campaignStats,
      totals,
    };
  }

  /**
   * COMPREHENSIVE CAMPAIGN REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    sourceLeadCount: SourceLeadCount[];
    sourceCost: SourceCost[];
    sourceConversion: SourceConversion[];
    campaignROI: CampaignROI[];
    branchSource: BranchSourceReport[];
    trends: SourceTrend[];
  }> {
    const [sourceLeadCount, sourceCost, sourceConversion, campaignROI, branchSource, trends] =
      await Promise.all([
        this.getSourceLeadCount(filters),
        this.getSourceCost(filters),
        this.getSourceConversion(filters),
        this.getCampaignROI(filters),
        this.getBranchSourceReport(filters),
        this.getSourceTrends(filters),
      ]);

    return { sourceLeadCount, sourceCost, sourceConversion, campaignROI, branchSource, trends };
  }

  private getIntervalKey(date: Date, interval: string): string {
    const d = new Date(date);
    switch (interval) {
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }
}

export const campaignReportsService = new CampaignReportsService();
