import axios from 'axios';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3';
const GOOGLE_ADS_API_URL = 'https://googleads.googleapis.com/v14';

interface YouTubeCredentials {
  accessToken: string;
  refreshToken?: string;
  customerId?: string; // Google Ads Customer ID (linked)
  channelId: string;
}

interface YouTubeCampaign {
  id: string;
  name: string;
  status: string;
  type: string; // VIDEO, DISCOVERY, etc.
  budget?: number;
  impressions?: number;
  views?: number;
  clicks?: number;
  spend?: number;
}

interface YouTubeLeadData {
  leadId: string;
  formId: string;
  campaignId: string;
  videoId?: string;
  submittedAt: string;
  fields: Record<string, string>;
}

interface LeadFormField {
  key: string;
  label: string;
  type: string;
}

interface SyncResult {
  created: number;
  skipped: number;
  total: number;
}

export class YouTubeAdsService {
  private credentials: YouTubeCredentials | null = null;

  /**
   * Initialize with credentials
   */
  initialize(credentials: YouTubeCredentials) {
    this.credentials = credentials;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders() {
    if (!this.credentials?.accessToken) {
      throw new Error('YouTube Ads not configured');
    }
    return {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Get YouTube channel info
   */
  async getChannelInfo() {
    const response = await axios.get(`${YOUTUBE_API_URL}/channels`, {
      headers: this.getAuthHeaders(),
      params: {
        part: 'snippet,statistics',
        mine: true,
      },
    });

    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('No YouTube channel found');
    }

    return {
      id: channel.id,
      name: channel.snippet?.title,
      description: channel.snippet?.description,
      subscriberCount: channel.statistics?.subscriberCount,
      videoCount: channel.statistics?.videoCount,
    };
  }

  /**
   * Sync video ad campaigns from Google Ads
   * YouTube ads are managed through Google Ads API
   */
  async syncCampaigns(organizationId: string): Promise<YouTubeCampaign[]> {
    if (!this.credentials?.customerId) {
      console.log('[YouTubeAds] No Google Ads Customer ID configured');
      return [];
    }

    try {
      // Query Google Ads API for VIDEO campaign types
      const response = await axios.post(
        `${GOOGLE_ADS_API_URL}/customers/${this.credentials.customerId}/googleAds:searchStream`,
        {
          query: `
            SELECT
              campaign.id,
              campaign.name,
              campaign.status,
              campaign.advertising_channel_type,
              campaign_budget.amount_micros,
              metrics.impressions,
              metrics.video_views,
              metrics.clicks,
              metrics.cost_micros
            FROM campaign
            WHERE campaign.advertising_channel_type = 'VIDEO'
            AND campaign.status != 'REMOVED'
          `,
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      const results: YouTubeCampaign[] = [];
      const rows = response.data.results || [];

      for (const row of rows) {
        const campaignId = row.campaign?.id?.toString() || '';
        const campaignName = row.campaign?.name || 'Unknown Campaign';
        const status = row.campaign?.status || 'UNKNOWN';

        const campaign: YouTubeCampaign = {
          id: campaignId,
          name: campaignName,
          status: String(status),
          type: 'VIDEO',
          budget: Number(row.campaign_budget?.amount_micros || 0) / 1000000,
          impressions: Number(row.metrics?.impressions || 0),
          views: Number(row.metrics?.video_views || 0),
          clicks: Number(row.metrics?.clicks || 0),
          spend: Number(row.metrics?.cost_micros || 0) / 1000000,
        };

        // Upsert to database
        const existing = await prisma.adCampaign.findUnique({
          where: {
            platform_externalId: {
              platform: AdPlatform.YOUTUBE,
              externalId: campaignId,
            },
          },
        });

        const data = {
          name: campaign.name,
          status: campaign.status,
          impressions: campaign.impressions,
          clicks: campaign.clicks,
          spend: campaign.spend,
          syncedAt: new Date(),
        };

        if (existing) {
          await prisma.adCampaign.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await prisma.adCampaign.create({
            data: {
              organizationId,
              platform: AdPlatform.YOUTUBE,
              externalId: campaignId,
              ...data,
            },
          });
        }

        results.push(campaign);
      }

      return results;
    } catch (error) {
      console.error('[YouTubeAds] Failed to sync campaigns:', error);
      return [];
    }
  }

  /**
   * Handle webhook for YouTube TrueView lead form submissions
   */
  async handleWebhook(payload: any, organizationId: string): Promise<any> {
    console.info(`[YouTubeAds] Processing webhook for org: ${organizationId}`);

    // Format 1: Direct lead form submission
    if (payload.lead_id || payload.leadId) {
      const leadData: YouTubeLeadData = {
        leadId: payload.lead_id || payload.leadId,
        formId: payload.form_id || payload.formId || 'unknown',
        campaignId: payload.campaign_id || payload.campaignId || 'unknown',
        videoId: payload.video_id || payload.videoId,
        submittedAt: payload.submitted_at || payload.submittedAt || new Date().toISOString(),
        fields: this.extractFields(payload),
      };

      return this.processLeadSubmission(leadData, organizationId);
    }

    // Format 2: Google Ads webhook with lead form data
    if (payload.leadFormSubmission) {
      const submission = payload.leadFormSubmission;
      const leadData: YouTubeLeadData = {
        leadId: submission.lead_id,
        formId: submission.form_id,
        campaignId: submission.campaign_id,
        videoId: submission.video_id,
        submittedAt: submission.lead_submit_timestamp,
        fields: this.parseColumnData(submission.user_column_data || submission.column_data || []),
      };

      return this.processLeadSubmission(leadData, organizationId);
    }

    // Format 3: Batch format
    if (Array.isArray(payload.leads)) {
      const results = [];
      for (const lead of payload.leads) {
        try {
          const result = await this.handleWebhook(lead, organizationId);
          if (result) results.push(result);
        } catch (error) {
          console.error('[YouTubeAds] Failed to process lead in batch:', error);
        }
      }
      return results;
    }

    console.warn('[YouTubeAds] Webhook received but no recognizable lead format found');
    return null;
  }

  /**
   * Extract fields from payload
   */
  private extractFields(payload: any): Record<string, string> {
    const fields: Record<string, string> = {};
    const fieldNames = ['firstName', 'lastName', 'email', 'phone', 'company', 'city', 'country'];

    for (const field of fieldNames) {
      if (payload[field]) {
        fields[field] = payload[field];
      }
    }

    // Also check nested data
    const userData = payload.user_data || payload.lead_data || payload.data || {};
    for (const [key, value] of Object.entries(userData)) {
      if (typeof value === 'string') {
        fields[this.mapFieldName(key)] = value;
      }
    }

    return fields;
  }

  /**
   * Parse column data format from Google Ads
   */
  private parseColumnData(columns: any[]): Record<string, string> {
    const fields: Record<string, string> = {};
    for (const col of columns) {
      if (col.string_value) {
        const fieldName = this.mapFieldName(col.column_name || col.column_id);
        fields[fieldName] = col.string_value;
      }
    }
    return fields;
  }

  /**
   * Map field names to standard format
   */
  private mapFieldName(name: string): string {
    const mappings: Record<string, string> = {
      'FULL_NAME': 'fullName',
      'FIRST_NAME': 'firstName',
      'LAST_NAME': 'lastName',
      'EMAIL': 'email',
      'PHONE_NUMBER': 'phone',
      'CITY': 'city',
      'REGION': 'state',
      'COUNTRY': 'country',
      'COMPANY_NAME': 'company',
    };
    return mappings[name.toUpperCase()] || name.toLowerCase();
  }

  /**
   * Process a lead submission
   */
  async processLeadSubmission(leadData: YouTubeLeadData, organizationId: string) {
    // Check for duplicate
    const existingAdLead = await prisma.adLead.findFirst({
      where: { externalId: leadData.leadId },
    });

    if (existingAdLead) {
      console.log(`[YouTubeAds] Lead already exists: ${leadData.leadId}`);
      return null;
    }

    // Check for duplicate by email/phone
    const { email, phone } = leadData.fields;
    if (email || phone) {
      const existingLead = await prisma.lead.findFirst({
        where: {
          organizationId,
          OR: [
            ...(email ? [{ email }] : []),
            ...(phone ? [{ phone }] : []),
          ],
        },
      });

      if (existingLead) {
        console.log(`[YouTubeAds] Duplicate lead by email/phone: ${existingLead.id}`);
        return existingLead;
      }
    }

    // Find or create campaign
    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.YOUTUBE,
          externalId: leadData.campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.YOUTUBE,
          externalId: leadData.campaignId,
          name: 'YouTube Video Campaign',
          status: 'ACTIVE',
          syncedAt: new Date(),
        },
      });
    }

    // Route to RawImportRecord
    const result = await externalLeadImportService.importExternalLead(organizationId, {
      firstName: leadData.fields.firstName || leadData.fields.fullName?.split(' ')[0] || 'Unknown',
      lastName: leadData.fields.lastName || leadData.fields.fullName?.split(' ').slice(1).join(' '),
      email: leadData.fields.email,
      phone: leadData.fields.phone || 'N/A',
      source: 'AD_YOUTUBE',
      sourceDetails: `YouTube Campaign: ${adCampaign.name}`,
      campaignName: adCampaign.name,
      customFields: {
        ...leadData.fields,
        leadId: leadData.leadId,
        videoId: leadData.videoId,
        campaignId: leadData.campaignId,
        formId: leadData.formId,
      },
    });

    if (result.isDuplicate) {
      console.log(`[YouTubeAds] Duplicate lead skipped: ${leadData.fields.phone}`);
      return null;
    }

    // Update campaign conversions
    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    console.log(`[YouTubeAds] Lead imported: ${result.rawImportRecord.id}`);
    return result.rawImportRecord;
  }

  /**
   * Get video performance metrics
   */
  async getVideoMetrics(videoId: string) {
    const response = await axios.get(`${YOUTUBE_API_URL}/videos`, {
      headers: this.getAuthHeaders(),
      params: {
        part: 'statistics,snippet',
        id: videoId,
      },
    });

    const video = response.data.items?.[0];
    if (!video) return null;

    return {
      id: video.id,
      title: video.snippet?.title,
      views: parseInt(video.statistics?.viewCount || '0'),
      likes: parseInt(video.statistics?.likeCount || '0'),
      comments: parseInt(video.statistics?.commentCount || '0'),
    };
  }

  /**
   * Sync form leads with deduplication
   */
  async syncFormLeads(
    formId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ): Promise<SyncResult> {
    // This would use Google Ads API to fetch lead form submissions
    // Similar to google-ads.service.ts
    console.log(`[YouTubeAds] Syncing form leads for form: ${formId}`);

    // Implementation would follow Google Ads API pattern
    return { created: 0, skipped: 0, total: 0 };
  }

  /**
   * Get form fields schema
   */
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    // Would use Google Ads API to get lead form fields
    return [];
  }
}

export const youtubeAdsService = new YouTubeAdsService();
