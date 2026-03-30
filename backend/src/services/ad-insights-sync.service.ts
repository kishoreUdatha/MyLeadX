import { AdPlatform } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import axios from 'axios';
import { prisma } from '../config/database';
import { googleAdsService } from '../integrations/google-ads.service';
import { linkedinService } from '../integrations/linkedin.service';
import { youtubeAdsService } from '../integrations/youtube-ads.service';
import { twitterAdsService } from '../integrations/twitter-ads.service';
import { tiktokAdsService } from '../integrations/tiktok-ads.service';

const FB_API_VERSION = 'v18.0';
const FB_GRAPH_URL = `https://graph.facebook.com/${FB_API_VERSION}`;

interface InsightsData {
  impressions: number;
  reach: number;
  clicks: number;
  spend: number;
  cpc?: number;
  cpm?: number;
  ctr?: number;
}

interface SyncResult {
  campaignId: string;
  campaignName: string;
  platform: AdPlatform;
  success: boolean;
  error?: string;
  metricsUpdated?: boolean;
  dailyMetricsCreated?: number;
}

interface PlatformSyncResult {
  success: boolean;
  synced: number;
  errors: number;
}

interface AllPlatformsSyncResult {
  facebook: PlatformSyncResult;
  instagram: PlatformSyncResult;
  linkedin: PlatformSyncResult;
  google: PlatformSyncResult;
  youtube: PlatformSyncResult;
  twitter: PlatformSyncResult;
  tiktok: PlatformSyncResult;
  totalCampaigns: number;
  totalSynced: number;
  totalErrors: number;
}

interface BatchSyncResult {
  organizations: number;
  totalCampaigns: number;
  totalSynced: number;
  totalErrors: number;
  errors: Array<{ organizationId: string; error: string }>;
}

interface DateRange {
  start: Date;
  end: Date;
}

class AdInsightsSyncService {
  /**
   * Sync Facebook campaign insights for an organization
   */
  async syncFacebookInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Get Facebook integration for this organization
    const integration = await prisma.facebookIntegration.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active Facebook integration for org ${organizationId}`);
      return results;
    }

    // Get all Facebook campaigns for this organization
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        organizationId,
        platform: 'FACEBOOK',
      },
    });

    for (const campaign of campaigns) {
      try {
        const insights = await this.fetchFacebookCampaignInsights(
          campaign.externalId,
          integration.accessToken
        );

        if (insights) {
          // Update campaign metrics
          await prisma.adCampaign.update({
            where: { id: campaign.id },
            data: {
              impressions: insights.impressions,
              clicks: insights.clicks,
              spend: new Decimal(insights.spend),
              syncedAt: new Date(),
            },
          });

          // Store daily metrics
          await this.storeDailyMetrics(campaign.id, insights);

          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: 'FACEBOOK',
            success: true,
            metricsUpdated: true,
          });
        } else {
          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: 'FACEBOOK',
            success: true,
            metricsUpdated: false,
          });
        }
      } catch (error: any) {
        console.error(`[AdInsightsSync] Failed to sync Facebook campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'FACEBOOK',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Sync Instagram campaign insights for an organization
   */
  async syncInstagramInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    // Get Instagram integration for this organization
    const integration = await prisma.instagramIntegration.findFirst({
      where: {
        organizationId,
        isActive: true,
      },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active Instagram integration for org ${organizationId}`);
      return results;
    }

    // Get all Instagram campaigns for this organization
    const campaigns = await prisma.adCampaign.findMany({
      where: {
        organizationId,
        platform: 'INSTAGRAM',
      },
    });

    for (const campaign of campaigns) {
      try {
        const insights = await this.fetchInstagramCampaignInsights(
          campaign.externalId,
          integration.accessToken
        );

        if (insights) {
          // Update campaign metrics
          await prisma.adCampaign.update({
            where: { id: campaign.id },
            data: {
              impressions: insights.impressions,
              clicks: insights.clicks,
              spend: new Decimal(insights.spend),
              syncedAt: new Date(),
            },
          });

          // Store daily metrics
          await this.storeDailyMetrics(campaign.id, insights);

          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: 'INSTAGRAM',
            success: true,
            metricsUpdated: true,
          });
        } else {
          results.push({
            campaignId: campaign.id,
            campaignName: campaign.name,
            platform: 'INSTAGRAM',
            success: true,
            metricsUpdated: false,
          });
        }
      } catch (error: any) {
        console.error(`[AdInsightsSync] Failed to sync Instagram campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'INSTAGRAM',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Sync LinkedIn campaign insights for an organization
   */
  async syncLinkedInInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const integration = await prisma.linkedInIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active LinkedIn integration for org ${organizationId}`);
      return results;
    }

    linkedinService.setAccessToken(integration.accessToken);

    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId, platform: 'LINKEDIN' },
    });

    for (const campaign of campaigns) {
      try {
        // LinkedIn campaigns are synced via the service
        const syncedCampaigns = await linkedinService.syncCampaigns(organizationId, integration.adAccountId);
        const synced = syncedCampaigns.find(c => c.id === campaign.id);

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'LINKEDIN',
          success: true,
          metricsUpdated: !!synced,
        });
      } catch (error: any) {
        console.error(`[AdInsightsSync] Failed to sync LinkedIn campaign ${campaign.id}:`, error);
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'LINKEDIN',
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Sync Google Ads campaign insights for an organization
   */
  async syncGoogleAdsInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const integration = await prisma.googleAdsIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration || !integration.refreshToken) {
      console.log(`[AdInsightsSync] No active Google Ads integration for org ${organizationId}`);
      return results;
    }

    try {
      googleAdsService.initialize({
        clientId: integration.clientId || '',
        clientSecret: integration.clientSecret || '',
        developerToken: integration.developerToken || '',
        refreshToken: integration.refreshToken,
        customerId: integration.customerId,
      });

      const syncedCampaigns = await googleAdsService.syncCampaigns(organizationId);

      for (const campaign of syncedCampaigns) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'GOOGLE',
          success: true,
          metricsUpdated: true,
        });
      }
    } catch (error: any) {
      console.error(`[AdInsightsSync] Failed to sync Google Ads for org ${organizationId}:`, error);
      results.push({
        campaignId: 'all',
        campaignName: 'Google Ads',
        platform: 'GOOGLE',
        success: false,
        error: error.message,
      });
    }

    return results;
  }

  /**
   * Sync YouTube Ads campaign insights for an organization
   */
  async syncYouTubeInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const integration = await prisma.youTubeAdsIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active YouTube integration for org ${organizationId}`);
      return results;
    }

    try {
      youtubeAdsService.initialize({
        accessToken: integration.accessToken,
        channelId: integration.channelId,
        customerId: integration.customerId || undefined,
      });

      const syncedCampaigns = await youtubeAdsService.syncCampaigns(organizationId);

      for (const campaign of syncedCampaigns) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'YOUTUBE',
          success: true,
          metricsUpdated: true,
        });
      }

      await prisma.youTubeAdsIntegration.update({
        where: { id: integration.id },
        data: { syncedAt: new Date() },
      });
    } catch (error: any) {
      console.error(`[AdInsightsSync] Failed to sync YouTube for org ${organizationId}:`, error);
      results.push({
        campaignId: 'all',
        campaignName: 'YouTube Ads',
        platform: 'YOUTUBE',
        success: false,
        error: error.message,
      });
    }

    return results;
  }

  /**
   * Sync Twitter/X Ads campaign insights for an organization
   */
  async syncTwitterInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const integration = await prisma.twitterAdsIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active Twitter integration for org ${organizationId}`);
      return results;
    }

    try {
      twitterAdsService.initialize({
        accessToken: integration.accessToken,
        adAccountId: integration.adAccountId,
        accessTokenSecret: integration.accessTokenSecret || undefined,
      });

      const syncedCampaigns = await twitterAdsService.syncCampaigns(organizationId);

      for (const campaign of syncedCampaigns) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'TWITTER',
          success: true,
          metricsUpdated: true,
        });
      }

      await prisma.twitterAdsIntegration.update({
        where: { id: integration.id },
        data: { syncedAt: new Date() },
      });
    } catch (error: any) {
      console.error(`[AdInsightsSync] Failed to sync Twitter for org ${organizationId}:`, error);
      results.push({
        campaignId: 'all',
        campaignName: 'Twitter Ads',
        platform: 'TWITTER',
        success: false,
        error: error.message,
      });
    }

    return results;
  }

  /**
   * Sync TikTok Ads campaign insights for an organization
   */
  async syncTikTokInsights(organizationId: string): Promise<SyncResult[]> {
    const results: SyncResult[] = [];

    const integration = await prisma.tikTokAdsIntegration.findFirst({
      where: { organizationId, isActive: true },
    });

    if (!integration || !integration.accessToken) {
      console.log(`[AdInsightsSync] No active TikTok integration for org ${organizationId}`);
      return results;
    }

    try {
      tiktokAdsService.initialize({
        accessToken: integration.accessToken,
        advertiserId: integration.advertiserId,
        pixelId: integration.pixelId || undefined,
      });

      const syncedCampaigns = await tiktokAdsService.syncCampaigns(organizationId);

      for (const campaign of syncedCampaigns) {
        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          platform: 'TIKTOK',
          success: true,
          metricsUpdated: true,
        });
      }

      await prisma.tikTokAdsIntegration.update({
        where: { id: integration.id },
        data: { syncedAt: new Date() },
      });
    } catch (error: any) {
      console.error(`[AdInsightsSync] Failed to sync TikTok for org ${organizationId}:`, error);
      results.push({
        campaignId: 'all',
        campaignName: 'TikTok Ads',
        platform: 'TIKTOK',
        success: false,
        error: error.message,
      });
    }

    return results;
  }

  /**
   * Sync all platforms for an organization (7 platforms)
   */
  async syncAllPlatforms(organizationId: string): Promise<AllPlatformsSyncResult> {
    console.log(`[AdInsightsSync] Starting sync for all platforms for org ${organizationId}`);

    // Run all platform syncs in parallel
    const [
      facebookResults,
      instagramResults,
      linkedinResults,
      googleResults,
      youtubeResults,
      twitterResults,
      tiktokResults,
    ] = await Promise.all([
      this.syncFacebookInsights(organizationId),
      this.syncInstagramInsights(organizationId),
      this.syncLinkedInInsights(organizationId),
      this.syncGoogleAdsInsights(organizationId),
      this.syncYouTubeInsights(organizationId),
      this.syncTwitterInsights(organizationId),
      this.syncTikTokInsights(organizationId),
    ]);

    const calcStats = (results: SyncResult[]) => ({
      success: results.filter(r => !r.success).length === 0,
      synced: results.filter(r => r.success && r.metricsUpdated).length,
      errors: results.filter(r => !r.success).length,
    });

    const facebook = calcStats(facebookResults);
    const instagram = calcStats(instagramResults);
    const linkedin = calcStats(linkedinResults);
    const google = calcStats(googleResults);
    const youtube = calcStats(youtubeResults);
    const twitter = calcStats(twitterResults);
    const tiktok = calcStats(tiktokResults);

    // Update last sync time for the organization
    await this.updateLastSyncTime(organizationId);

    const totalCampaigns =
      facebookResults.length +
      instagramResults.length +
      linkedinResults.length +
      googleResults.length +
      youtubeResults.length +
      twitterResults.length +
      tiktokResults.length;

    const totalSynced =
      facebook.synced +
      instagram.synced +
      linkedin.synced +
      google.synced +
      youtube.synced +
      twitter.synced +
      tiktok.synced;

    const totalErrors =
      facebook.errors +
      instagram.errors +
      linkedin.errors +
      google.errors +
      youtube.errors +
      twitter.errors +
      tiktok.errors;

    console.log(`[AdInsightsSync] Sync complete for org ${organizationId}: ${totalSynced} campaigns synced, ${totalErrors} errors`);

    return {
      facebook,
      instagram,
      linkedin,
      google,
      youtube,
      twitter,
      tiktok,
      totalCampaigns,
      totalSynced,
      totalErrors,
    };
  }

  /**
   * Sync all organizations (for scheduled job)
   */
  async syncAllOrganizations(): Promise<BatchSyncResult> {
    const errors: Array<{ organizationId: string; error: string }> = [];
    let totalCampaigns = 0;
    let totalSynced = 0;
    let totalErrors = 0;

    // Get all organizations with active ad integrations
    const organizationIds = await this.getOrganizationsWithActiveIntegrations();

    console.log(`[AdInsightsSync] Starting batch sync for ${organizationIds.length} organizations`);

    for (const organizationId of organizationIds) {
      try {
        const result = await this.syncAllPlatforms(organizationId);
        totalCampaigns += result.totalCampaigns;
        totalSynced += result.totalSynced;
        totalErrors += result.totalErrors;
      } catch (error: any) {
        console.error(`[AdInsightsSync] Failed to sync org ${organizationId}:`, error);
        errors.push({ organizationId, error: error.message });
        totalErrors++;
      }

      // Rate limiting - wait between organizations
      await this.delay(1000);
    }

    console.log(`[AdInsightsSync] Batch sync complete: ${totalSynced} campaigns synced, ${totalErrors} errors`);

    return {
      organizations: organizationIds.length,
      totalCampaigns,
      totalSynced,
      totalErrors,
      errors,
    };
  }

  /**
   * Fetch Facebook campaign insights from Graph API
   */
  private async fetchFacebookCampaignInsights(
    campaignExternalId: string,
    accessToken: string
  ): Promise<InsightsData | null> {
    try {
      const response = await axios.get(`${FB_GRAPH_URL}/${campaignExternalId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr',
          date_preset: 'lifetime',
        },
        timeout: 30000,
      });

      const data = response.data.data?.[0];
      if (!data) {
        return null;
      }

      return {
        impressions: parseInt(data.impressions || '0'),
        reach: parseInt(data.reach || '0'),
        clicks: parseInt(data.clicks || '0'),
        spend: parseFloat(data.spend || '0'),
        cpc: parseFloat(data.cpc || '0'),
        cpm: parseFloat(data.cpm || '0'),
        ctr: parseFloat(data.ctr || '0'),
      };
    } catch (error: any) {
      if (error.response?.status === 400) {
        // Campaign might not have insights yet
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch Instagram campaign insights from Graph API
   */
  private async fetchInstagramCampaignInsights(
    campaignExternalId: string,
    accessToken: string
  ): Promise<InsightsData | null> {
    try {
      // Instagram uses the same Graph API as Facebook
      const response = await axios.get(`${FB_GRAPH_URL}/${campaignExternalId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr',
          breakdowns: 'publisher_platform',
          date_preset: 'lifetime',
        },
        timeout: 30000,
      });

      // Filter for Instagram-specific data if available
      const data = response.data.data?.[0];
      if (!data) {
        return null;
      }

      return {
        impressions: parseInt(data.impressions || '0'),
        reach: parseInt(data.reach || '0'),
        clicks: parseInt(data.clicks || '0'),
        spend: parseFloat(data.spend || '0'),
        cpc: parseFloat(data.cpc || '0'),
        cpm: parseFloat(data.cpm || '0'),
        ctr: parseFloat(data.ctr || '0'),
      };
    } catch (error: any) {
      if (error.response?.status === 400) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Fetch insights for a date range
   */
  async fetchInsightsForDateRange(
    campaignExternalId: string,
    accessToken: string,
    dateRange: DateRange,
    platform: AdPlatform
  ): Promise<Array<{ date: Date; insights: InsightsData }>> {
    const results: Array<{ date: Date; insights: InsightsData }> = [];

    try {
      const response = await axios.get(`${FB_GRAPH_URL}/${campaignExternalId}/insights`, {
        params: {
          access_token: accessToken,
          fields: 'impressions,reach,clicks,spend,cpc,cpm,ctr',
          time_range: JSON.stringify({
            since: dateRange.start.toISOString().split('T')[0],
            until: dateRange.end.toISOString().split('T')[0],
          }),
          time_increment: 1, // Daily breakdown
          ...(platform === 'INSTAGRAM' ? { breakdowns: 'publisher_platform' } : {}),
        },
        timeout: 60000,
      });

      for (const dayData of response.data.data || []) {
        results.push({
          date: new Date(dayData.date_start),
          insights: {
            impressions: parseInt(dayData.impressions || '0'),
            reach: parseInt(dayData.reach || '0'),
            clicks: parseInt(dayData.clicks || '0'),
            spend: parseFloat(dayData.spend || '0'),
            cpc: parseFloat(dayData.cpc || '0'),
            cpm: parseFloat(dayData.cpm || '0'),
            ctr: parseFloat(dayData.ctr || '0'),
          },
        });
      }
    } catch (error) {
      console.error(`[AdInsightsSync] Failed to fetch date range insights:`, error);
    }

    return results;
  }

  /**
   * Store daily metrics in the database
   */
  private async storeDailyMetrics(campaignId: string, insights: InsightsData): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.adCampaignDailyMetrics.upsert({
      where: {
        adCampaignId_date: {
          adCampaignId: campaignId,
          date: today,
        },
      },
      update: {
        impressions: insights.impressions,
        reach: insights.reach,
        clicks: insights.clicks,
        spend: insights.spend ? new Decimal(insights.spend) : null,
        cpc: insights.cpc ? new Decimal(insights.cpc) : null,
        cpm: insights.cpm ? new Decimal(insights.cpm) : null,
        ctr: insights.ctr ? new Decimal(insights.ctr) : null,
      },
      create: {
        adCampaignId: campaignId,
        date: today,
        impressions: insights.impressions,
        reach: insights.reach,
        clicks: insights.clicks,
        spend: insights.spend ? new Decimal(insights.spend) : null,
        cpc: insights.cpc ? new Decimal(insights.cpc) : null,
        cpm: insights.cpm ? new Decimal(insights.cpm) : null,
        ctr: insights.ctr ? new Decimal(insights.ctr) : null,
      },
    });
  }

  /**
   * Store historical daily metrics
   */
  async storeHistoricalMetrics(
    campaignId: string,
    historicalData: Array<{ date: Date; insights: InsightsData }>
  ): Promise<number> {
    let stored = 0;

    for (const { date, insights } of historicalData) {
      try {
        await prisma.adCampaignDailyMetrics.upsert({
          where: {
            adCampaignId_date: {
              adCampaignId: campaignId,
              date,
            },
          },
          update: {
            impressions: insights.impressions,
            reach: insights.reach,
            clicks: insights.clicks,
            spend: insights.spend ? new Decimal(insights.spend) : null,
            cpc: insights.cpc ? new Decimal(insights.cpc) : null,
            cpm: insights.cpm ? new Decimal(insights.cpm) : null,
            ctr: insights.ctr ? new Decimal(insights.ctr) : null,
          },
          create: {
            adCampaignId: campaignId,
            date,
            impressions: insights.impressions,
            reach: insights.reach,
            clicks: insights.clicks,
            spend: insights.spend ? new Decimal(insights.spend) : null,
            cpc: insights.cpc ? new Decimal(insights.cpc) : null,
            cpm: insights.cpm ? new Decimal(insights.cpm) : null,
            ctr: insights.ctr ? new Decimal(insights.ctr) : null,
          },
        });
        stored++;
      } catch (error) {
        console.error(`[AdInsightsSync] Failed to store metrics for ${campaignId} on ${date}:`, error);
      }
    }

    return stored;
  }

  /**
   * Get historical metrics for a campaign
   */
  async getCampaignMetrics(campaignId: string, dateRange: DateRange) {
    return prisma.adCampaignDailyMetrics.findMany({
      where: {
        adCampaignId: campaignId,
        date: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  /**
   * Get last sync status for an organization (all platforms)
   */
  async getLastSyncStatus(organizationId: string) {
    const [
      facebookIntegration,
      instagramIntegration,
      linkedinIntegration,
      googleAdsIntegration,
      youtubeIntegration,
      twitterIntegration,
      tiktokIntegration,
    ] = await Promise.all([
      prisma.facebookIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.instagramIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.linkedInIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.googleAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.youTubeAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.twitterAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
      prisma.tikTokAdsIntegration.findFirst({
        where: { organizationId, isActive: true },
        select: { lastSyncedAt: true },
      }),
    ]);

    // Get campaign count and last sync times
    const campaigns = await prisma.adCampaign.findMany({
      where: { organizationId },
      select: {
        id: true,
        platform: true,
        syncedAt: true,
      },
    });

    const getPlatformStats = (platform: AdPlatform, integration: { lastSyncedAt: Date | null } | null) => {
      const platformCampaigns = campaigns.filter(c => c.platform === platform);
      return {
        connected: !!integration,
        lastSyncAt: integration?.lastSyncedAt || null,
        campaignCount: platformCampaigns.length,
        lastCampaignSync:
          platformCampaigns
            .map(c => c.syncedAt)
            .filter(Boolean)
            .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0] || null,
      };
    };

    return {
      facebook: getPlatformStats('FACEBOOK', facebookIntegration),
      instagram: getPlatformStats('INSTAGRAM', instagramIntegration),
      linkedin: getPlatformStats('LINKEDIN', linkedinIntegration),
      google: getPlatformStats('GOOGLE', googleAdsIntegration),
      youtube: getPlatformStats('YOUTUBE', youtubeIntegration),
      twitter: getPlatformStats('TWITTER', twitterIntegration),
      tiktok: getPlatformStats('TIKTOK', tiktokIntegration),
      totalCampaigns: campaigns.length,
    };
  }

  /**
   * Get organizations with active integrations (all 7 platforms)
   */
  private async getOrganizationsWithActiveIntegrations(): Promise<string[]> {
    const [
      facebookIntegrations,
      instagramIntegrations,
      linkedinIntegrations,
      googleAdsIntegrations,
      youtubeIntegrations,
      twitterIntegrations,
      tiktokIntegrations,
    ] = await Promise.all([
      prisma.facebookIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.instagramIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.linkedInIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.googleAdsIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.youTubeAdsIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.twitterAdsIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
      prisma.tikTokAdsIntegration.findMany({
        where: { isActive: true },
        select: { organizationId: true },
      }),
    ]);

    const orgIds = new Set<string>();
    facebookIntegrations.forEach(i => orgIds.add(i.organizationId));
    instagramIntegrations.forEach(i => orgIds.add(i.organizationId));
    linkedinIntegrations.forEach(i => orgIds.add(i.organizationId));
    googleAdsIntegrations.forEach(i => orgIds.add(i.organizationId));
    youtubeIntegrations.forEach(i => orgIds.add(i.organizationId));
    twitterIntegrations.forEach(i => orgIds.add(i.organizationId));
    tiktokIntegrations.forEach(i => orgIds.add(i.organizationId));

    return Array.from(orgIds);
  }

  /**
   * Update last sync time for all integrations
   */
  private async updateLastSyncTime(organizationId: string): Promise<void> {
    const now = new Date();

    await Promise.all([
      prisma.facebookIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.instagramIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.linkedInIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.googleAdsIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.youTubeAdsIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.twitterAdsIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
      prisma.tikTokAdsIntegration.updateMany({
        where: { organizationId, isActive: true },
        data: { lastSyncedAt: now },
      }),
    ]);
  }

  /**
   * Delay helper for rate limiting
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const adInsightsSyncService = new AdInsightsSyncService();
