import { AdInteractionType, AdPlatform } from '@prisma/client';
import { prisma } from '../config/database';

interface TrackAdClickParams {
  organizationId: string;
  visitorId: string;
  sessionId?: string;
  gclid?: string;
  fbclid?: string;
  ttclid?: string;
  twclid?: string;
  liclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage?: string;
  referrer?: string;
  userAgent?: string;
  ipAddress?: string;
  deviceType?: string;
  browser?: string;
}

interface TrackImpressionParams {
  organizationId: string;
  visitorId: string;
  sessionId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface TrackEngagementParams {
  organizationId: string;
  visitorId: string;
  sessionId?: string;
  scrollDepth?: number;
  timeOnPage?: number;
  videoWatchTime?: number;
  videoPercentage?: number;
  videoId?: string;
  videoEvent?: string;
}

interface ConvertToLeadParams {
  visitorId: string;
  organizationId: string;
  leadId: string;
}

interface GetUnconvertedClicksParams {
  organizationId: string;
  days?: number;
  limit?: number;
  offset?: number;
}

interface AdInteractionAnalytics {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  bySource: Array<{
    source: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
  byCampaign: Array<{
    campaign: string;
    clicks: number;
    conversions: number;
    conversionRate: number;
  }>;
}

class AdInteractionService {
  /**
   * Track an impression (page view)
   */
  async trackImpression(params: TrackImpressionParams) {
    const {
      organizationId,
      visitorId,
      sessionId,
      utmSource,
      utmMedium,
      utmCampaign,
      landingPage,
      userAgent,
      ipAddress,
    } = params;

    // Deduplicate by sessionId within the last hour
    if (sessionId) {
      const recent = await prisma.adInteraction.findFirst({
        where: {
          organizationId,
          sessionId,
          type: 'IMPRESSION',
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      if (recent) {
        console.log(`[AdInteraction] Duplicate impression for session ${sessionId}`);
        return recent;
      }
    }

    const interaction = await prisma.adInteraction.create({
      data: {
        organizationId,
        type: 'IMPRESSION',
        visitorId,
        sessionId,
        utmSource,
        utmMedium,
        utmCampaign,
        landingPage,
        userAgent,
        ipAddress,
      },
    });

    console.log(`[AdInteraction] Tracked impression for visitor ${visitorId}`);
    return interaction;
  }

  /**
   * Track engagement (scroll depth, time on page, video interactions)
   */
  async trackEngagement(params: TrackEngagementParams) {
    const {
      organizationId,
      visitorId,
      sessionId,
      scrollDepth,
      timeOnPage,
      videoWatchTime,
      videoPercentage,
    } = params;

    // Find existing session interaction to update
    let interaction = await prisma.adInteraction.findFirst({
      where: {
        organizationId,
        visitorId,
        sessionId,
        type: { in: ['IMPRESSION', 'ENGAGEMENT', 'CLICK'] },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (interaction) {
      // Update existing interaction with engagement data
      interaction = await prisma.adInteraction.update({
        where: { id: interaction.id },
        data: {
          type: 'ENGAGEMENT',
          scrollDepth: scrollDepth !== undefined ? Math.max(interaction.scrollDepth || 0, scrollDepth) : interaction.scrollDepth,
          timeOnPage: timeOnPage !== undefined ? Math.max(interaction.timeOnPage || 0, timeOnPage) : interaction.timeOnPage,
          videoWatchTime: videoWatchTime !== undefined ? Math.max(interaction.videoWatchTime || 0, videoWatchTime) : interaction.videoWatchTime,
          videoPercentage: videoPercentage !== undefined ? Math.max(interaction.videoPercentage || 0, videoPercentage) : interaction.videoPercentage,
          updatedAt: new Date(),
        },
      });
    } else {
      // Create new engagement record
      interaction = await prisma.adInteraction.create({
        data: {
          organizationId,
          type: 'ENGAGEMENT',
          visitorId,
          sessionId,
          scrollDepth,
          timeOnPage,
          videoWatchTime,
          videoPercentage,
        },
      });
    }

    return interaction;
  }

  /**
   * Track an ad click when a visitor lands on a page with gclid/fbclid
   */
  async trackAdClick(params: TrackAdClickParams) {
    const {
      organizationId,
      visitorId,
      sessionId,
      gclid,
      fbclid,
      ttclid,
      twclid,
      liclid,
      utmSource,
      utmMedium,
      utmCampaign,
      utmContent,
      utmTerm,
      landingPage,
      referrer,
      userAgent,
      ipAddress,
      deviceType,
      browser,
    } = params;

    // Don't create interaction if no click IDs are present
    if (!gclid && !fbclid && !ttclid && !twclid && !liclid) {
      return null;
    }

    // Check for duplicate click (same visitorId and click ID within last hour)
    const clickFilters: any[] = [];
    if (gclid) clickFilters.push({ gclid });
    if (fbclid) clickFilters.push({ fbclid });
    if (ttclid) clickFilters.push({ ttclid });
    if (twclid) clickFilters.push({ twclid });
    if (liclid) clickFilters.push({ liclid });

    const recentInteraction = await prisma.adInteraction.findFirst({
      where: {
        organizationId,
        visitorId,
        type: 'CLICK',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // Last hour
        },
        OR: clickFilters,
      },
    });

    if (recentInteraction) {
      console.log(`[AdInteraction] Duplicate click detected for visitor ${visitorId}`);
      return recentInteraction;
    }

    // Try to find matching ad campaign based on UTM parameters
    let adCampaignId: string | null = null;

    if (utmCampaign) {
      // Determine platform from click ID or UTM source
      let platform: AdPlatform | null = null;
      if (fbclid) {
        platform = 'FACEBOOK';
      } else if (gclid) {
        platform = 'GOOGLE';
      } else if (ttclid) {
        platform = 'TIKTOK';
      } else if (twclid) {
        platform = 'TWITTER';
      } else if (liclid) {
        platform = 'LINKEDIN';
      } else if (utmSource?.toLowerCase().includes('instagram')) {
        platform = 'INSTAGRAM';
      } else if (utmSource?.toLowerCase().includes('linkedin')) {
        platform = 'LINKEDIN';
      } else if (utmSource?.toLowerCase().includes('youtube')) {
        platform = 'YOUTUBE';
      } else if (utmSource?.toLowerCase().includes('twitter') || utmSource?.toLowerCase().includes('x.com')) {
        platform = 'TWITTER';
      } else if (utmSource?.toLowerCase().includes('tiktok')) {
        platform = 'TIKTOK';
      }

      if (platform) {
        const campaign = await prisma.adCampaign.findFirst({
          where: {
            organizationId,
            platform,
            name: { contains: utmCampaign, mode: 'insensitive' },
          },
        });
        adCampaignId = campaign?.id || null;
      }
    }

    // Create ad interaction record
    const interaction = await prisma.adInteraction.create({
      data: {
        organizationId,
        type: 'CLICK',
        visitorId,
        sessionId,
        gclid,
        fbclid,
        ttclid,
        twclid,
        liclid,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        landingPage,
        referrer,
        userAgent,
        ipAddress,
        deviceType,
        browser,
        adCampaignId,
      },
    });

    console.log(`[AdInteraction] Tracked click for visitor ${visitorId} (gclid: ${gclid}, fbclid: ${fbclid}, ttclid: ${ttclid}, twclid: ${twclid})`);
    return interaction;
  }

  /**
   * Mark an ad interaction as converted when visitor becomes a lead
   */
  async convertToLead(params: ConvertToLeadParams) {
    const { visitorId, organizationId, leadId } = params;

    // Find the most recent unconverted click interaction for this visitor
    const interaction = await prisma.adInteraction.findFirst({
      where: {
        organizationId,
        visitorId,
        type: 'CLICK',
        convertedToLeadId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!interaction) {
      console.log(`[AdInteraction] No unconverted click found for visitor ${visitorId}`);
      return null;
    }

    // Update the interaction to mark as converted
    const updatedInteraction = await prisma.adInteraction.update({
      where: { id: interaction.id },
      data: {
        type: 'CONVERSION',
        convertedToLeadId: leadId,
        convertedAt: new Date(),
      },
    });

    // Update campaign conversions count if linked to a campaign
    if (interaction.adCampaignId) {
      await prisma.adCampaign.update({
        where: { id: interaction.adCampaignId },
        data: {
          conversions: { increment: 1 },
        },
      });
    }

    console.log(`[AdInteraction] Converted click ${interaction.id} to lead ${leadId}`);
    return updatedInteraction;
  }

  /**
   * Get unconverted clicks for potential retargeting
   */
  async getUnconvertedClicks(params: GetUnconvertedClicksParams) {
    const { organizationId, days = 30, limit = 100, offset = 0 } = params;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [interactions, total] = await Promise.all([
      prisma.adInteraction.findMany({
        where: {
          organizationId,
          type: 'CLICK',
          convertedToLeadId: null,
          createdAt: { gte: cutoffDate },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          adCampaign: {
            select: {
              id: true,
              name: true,
              platform: true,
            },
          },
        },
      }),
      prisma.adInteraction.count({
        where: {
          organizationId,
          type: 'CLICK',
          convertedToLeadId: null,
          createdAt: { gte: cutoffDate },
        },
      }),
    ]);

    return {
      interactions,
      total,
      limit,
      offset,
    };
  }

  /**
   * Get ad interaction analytics
   */
  async getAnalytics(
    organizationId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<AdInteractionAnalytics> {
    const { start, end } = dateRange;

    // Get all interactions in date range
    const interactions = await prisma.adInteraction.findMany({
      where: {
        organizationId,
        createdAt: { gte: start, lte: end },
      },
      select: {
        type: true,
        utmSource: true,
        utmCampaign: true,
        convertedToLeadId: true,
      },
    });

    const totalClicks = interactions.filter(i => i.type === 'CLICK' || i.type === 'CONVERSION').length;
    const totalConversions = interactions.filter(i => i.type === 'CONVERSION').length;
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Group by source
    const sourceMap = new Map<string, { clicks: number; conversions: number }>();
    for (const interaction of interactions) {
      const source = interaction.utmSource || 'direct';
      const current = sourceMap.get(source) || { clicks: 0, conversions: 0 };
      current.clicks++;
      if (interaction.type === 'CONVERSION') {
        current.conversions++;
      }
      sourceMap.set(source, current);
    }

    const bySource = Array.from(sourceMap.entries()).map(([source, stats]) => ({
      source,
      clicks: stats.clicks,
      conversions: stats.conversions,
      conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
    })).sort((a, b) => b.clicks - a.clicks);

    // Group by campaign
    const campaignMap = new Map<string, { clicks: number; conversions: number }>();
    for (const interaction of interactions) {
      const campaign = interaction.utmCampaign || 'unknown';
      const current = campaignMap.get(campaign) || { clicks: 0, conversions: 0 };
      current.clicks++;
      if (interaction.type === 'CONVERSION') {
        current.conversions++;
      }
      campaignMap.set(campaign, current);
    }

    const byCampaign = Array.from(campaignMap.entries()).map(([campaign, stats]) => ({
      campaign,
      clicks: stats.clicks,
      conversions: stats.conversions,
      conversionRate: stats.clicks > 0 ? (stats.conversions / stats.clicks) * 100 : 0,
    })).sort((a, b) => b.clicks - a.clicks);

    return {
      totalClicks,
      totalConversions,
      conversionRate,
      bySource,
      byCampaign,
    };
  }

  /**
   * Find interaction by visitor ID (for linking during lead capture)
   */
  async findByVisitorId(visitorId: string, organizationId: string) {
    return prisma.adInteraction.findFirst({
      where: {
        organizationId,
        visitorId,
        type: 'CLICK',
        convertedToLeadId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get interaction by lead ID (to see which ad brought the lead)
   */
  async getByLeadId(leadId: string) {
    return prisma.adInteraction.findUnique({
      where: {
        convertedToLeadId: leadId,
      },
      include: {
        adCampaign: true,
      },
    });
  }

  /**
   * Bulk get interactions for multiple visitors
   */
  async findByVisitorIds(visitorIds: string[], organizationId: string) {
    return prisma.adInteraction.findMany({
      where: {
        organizationId,
        visitorId: { in: visitorIds },
        type: 'CLICK',
        convertedToLeadId: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

export const adInteractionService = new AdInteractionService();
