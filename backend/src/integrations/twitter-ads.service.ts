import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

const TWITTER_ADS_API_URL = 'https://ads-api.twitter.com/12';
const TWITTER_API_URL = 'https://api.twitter.com/2';

interface TwitterCredentials {
  accessToken: string;
  accessTokenSecret?: string;
  adAccountId: string;
  webhookSecret?: string;
}

interface TwitterCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget?: number;
  impressions?: number;
  engagements?: number;
  clicks?: number;
  spend?: number;
}

interface TwitterLeadData {
  leadId: string;
  cardId: string;
  campaignId: string;
  tweetId?: string;
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

export class TwitterAdsService {
  private credentials: TwitterCredentials | null = null;

  /**
   * Initialize with credentials
   */
  initialize(credentials: TwitterCredentials) {
    this.credentials = credentials;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.credentials !== null;
  }

  /**
   * Get auth headers for Twitter API
   */
  private getAuthHeaders() {
    if (!this.credentials?.accessToken) {
      throw new Error('Twitter Ads not configured');
    }
    return {
      Authorization: `Bearer ${this.credentials.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify webhook signature using HMAC-SHA256
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.credentials?.webhookSecret) {
      console.warn('[TwitterAds] Webhook secret not configured - skipping verification');
      return true;
    }

    try {
      const expectedSignature = crypto
        .createHmac('sha256', this.credentials.webhookSecret)
        .update(payload)
        .digest('base64');

      return signature === `sha256=${expectedSignature}` || signature === expectedSignature;
    } catch (error) {
      console.error('[TwitterAds] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Handle CRC challenge for webhook verification
   */
  handleCrcChallenge(crcToken: string): string {
    if (!this.credentials?.webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    const hmac = crypto
      .createHmac('sha256', this.credentials.webhookSecret)
      .update(crcToken)
      .digest('base64');

    return `sha256=${hmac}`;
  }

  /**
   * Sync campaigns from Twitter Ads
   */
  async syncCampaigns(organizationId: string): Promise<TwitterCampaign[]> {
    if (!this.credentials?.adAccountId) {
      console.log('[TwitterAds] No ad account ID configured');
      return [];
    }

    try {
      const response = await axios.get(
        `${TWITTER_ADS_API_URL}/accounts/${this.credentials.adAccountId}/campaigns`,
        {
          headers: this.getAuthHeaders(),
          params: {
            with_deleted: false,
          },
        }
      );

      const results: TwitterCampaign[] = [];
      const campaigns = response.data.data || [];

      for (const campaign of campaigns) {
        const campaignId = campaign.id;

        const campaignData: TwitterCampaign = {
          id: campaignId,
          name: campaign.name,
          status: campaign.entity_status,
          objective: campaign.objective || 'WEBSITE_CLICKS',
          budget: campaign.daily_budget_amount_local_micro ? campaign.daily_budget_amount_local_micro / 1000000 : undefined,
        };

        // Get campaign stats
        try {
          const statsResponse = await axios.get(
            `${TWITTER_ADS_API_URL}/stats/accounts/${this.credentials.adAccountId}`,
            {
              headers: this.getAuthHeaders(),
              params: {
                entity: 'CAMPAIGN',
                entity_ids: campaignId,
                metric_groups: 'ENGAGEMENT,BILLING',
                granularity: 'TOTAL',
              },
            }
          );

          const stats = statsResponse.data.data?.[0]?.id_data?.[0]?.metrics;
          if (stats) {
            campaignData.impressions = stats.impressions?.[0] || 0;
            campaignData.engagements = stats.engagements?.[0] || 0;
            campaignData.clicks = stats.url_clicks?.[0] || stats.clicks?.[0] || 0;
            campaignData.spend = stats.billed_charge_local_micro?.[0] ? stats.billed_charge_local_micro[0] / 1000000 : 0;
          }
        } catch (statsError) {
          console.warn(`[TwitterAds] Failed to get stats for campaign ${campaignId}:`, statsError);
        }

        // Upsert to database
        const existing = await prisma.adCampaign.findUnique({
          where: {
            platform_externalId: {
              platform: AdPlatform.TWITTER,
              externalId: campaignId,
            },
          },
        });

        const data = {
          name: campaignData.name,
          status: campaignData.status,
          impressions: campaignData.impressions,
          clicks: campaignData.clicks,
          spend: campaignData.spend,
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
              platform: AdPlatform.TWITTER,
              externalId: campaignId,
              ...data,
            },
          });
        }

        results.push(campaignData);
      }

      return results;
    } catch (error) {
      console.error('[TwitterAds] Failed to sync campaigns:', error);
      return [];
    }
  }

  /**
   * Get Lead Gen Cards for the account
   */
  async getLeadGenCards() {
    if (!this.credentials?.adAccountId) {
      throw new Error('Ad account ID not configured');
    }

    const response = await axios.get(
      `${TWITTER_ADS_API_URL}/accounts/${this.credentials.adAccountId}/cards/lead_gen`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    return response.data.data || [];
  }

  /**
   * Handle webhook for Twitter Lead Gen Card submissions
   */
  async handleWebhook(payload: any, organizationId: string): Promise<any> {
    console.info(`[TwitterAds] Processing webhook for org: ${organizationId}`);

    // Format 1: Twitter Lead Gen Card submission
    if (payload.card_uri || payload.cardUri || payload.lead_gen_card_id) {
      const leadData: TwitterLeadData = {
        leadId: payload.lead_id || payload.leadId || `twitter-${Date.now()}`,
        cardId: payload.card_uri || payload.cardUri || payload.lead_gen_card_id,
        campaignId: payload.campaign_id || payload.campaignId || 'unknown',
        tweetId: payload.tweet_id || payload.tweetId,
        submittedAt: payload.created_at || payload.submittedAt || new Date().toISOString(),
        fields: this.extractFields(payload),
      };

      return this.processLeadSubmission(leadData, organizationId);
    }

    // Format 2: Flat field format (Zapier/Make integrations)
    if (payload.email || payload.firstName || payload.name) {
      const leadData: TwitterLeadData = {
        leadId: payload.lead_id || `twitter-${Date.now()}`,
        cardId: payload.card_id || 'unknown',
        campaignId: payload.campaign_id || 'unknown',
        tweetId: payload.tweet_id,
        submittedAt: payload.submitted_at || new Date().toISOString(),
        fields: this.extractFields(payload),
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
          console.error('[TwitterAds] Failed to process lead in batch:', error);
        }
      }
      return results;
    }

    // Format 4: Twitter Account Activity API format
    if (payload.for_user_id && payload.lead_gen_card_submission_events) {
      const events = payload.lead_gen_card_submission_events;
      const results = [];

      for (const event of events) {
        const leadData: TwitterLeadData = {
          leadId: event.id || `twitter-${Date.now()}`,
          cardId: event.card?.id || 'unknown',
          campaignId: event.campaign_id || 'unknown',
          tweetId: event.tweet?.id,
          submittedAt: event.created_timestamp || new Date().toISOString(),
          fields: event.user_data || {},
        };

        try {
          const result = await this.processLeadSubmission(leadData, organizationId);
          if (result) results.push(result);
        } catch (error) {
          console.error('[TwitterAds] Failed to process event:', error);
        }
      }

      return results;
    }

    console.warn('[TwitterAds] Webhook received but no recognizable lead format found');
    return null;
  }

  /**
   * Extract fields from payload
   */
  private extractFields(payload: any): Record<string, string> {
    const fields: Record<string, string> = {};
    const fieldNames = ['name', 'firstName', 'lastName', 'email', 'phone', 'screen_name', 'company'];

    for (const field of fieldNames) {
      if (payload[field]) {
        fields[this.mapFieldName(field)] = payload[field];
      }
    }

    // Parse name into firstName/lastName if needed
    if (payload.name && !payload.firstName) {
      const nameParts = payload.name.split(' ');
      fields.firstName = nameParts[0];
      fields.lastName = nameParts.slice(1).join(' ');
    }

    // Also check nested user_data
    const userData = payload.user_data || payload.lead_data || {};
    for (const [key, value] of Object.entries(userData)) {
      if (typeof value === 'string') {
        fields[this.mapFieldName(key)] = value;
      }
    }

    return fields;
  }

  /**
   * Map field names to standard format
   */
  private mapFieldName(name: string): string {
    const mappings: Record<string, string> = {
      'screen_name': 'twitterHandle',
      'name': 'fullName',
      'first_name': 'firstName',
      'last_name': 'lastName',
      'email_address': 'email',
      'phone_number': 'phone',
    };
    return mappings[name.toLowerCase()] || name;
  }

  /**
   * Process a lead submission
   */
  async processLeadSubmission(leadData: TwitterLeadData, organizationId: string) {
    // Check for duplicate by external ID
    const existingAdLead = await prisma.adLead.findFirst({
      where: { externalId: leadData.leadId },
    });

    if (existingAdLead) {
      console.log(`[TwitterAds] Lead already exists: ${leadData.leadId}`);
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
        console.log(`[TwitterAds] Duplicate lead by email/phone: ${existingLead.id}`);
        return existingLead;
      }
    }

    // Find or create campaign
    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.TWITTER,
          externalId: leadData.campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.TWITTER,
          externalId: leadData.campaignId,
          name: 'Twitter/X Campaign',
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
      source: 'AD_TWITTER',
      sourceDetails: `Twitter Campaign: ${adCampaign.name}`,
      campaignName: adCampaign.name,
      customFields: {
        ...leadData.fields,
        leadId: leadData.leadId,
        cardId: leadData.cardId,
        tweetId: leadData.tweetId,
        campaignId: leadData.campaignId,
      },
    });

    if (result.isDuplicate) {
      console.log(`[TwitterAds] Duplicate lead skipped: ${leadData.fields.phone || leadData.fields.email}`);
      return null;
    }

    // Update campaign conversions
    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    console.log(`[TwitterAds] Lead imported: ${result.rawImportRecord.id}`);
    return result.rawImportRecord;
  }

  /**
   * Get Lead Gen Card submissions
   */
  async getCardSubmissions(cardId: string, sinceId?: string) {
    if (!this.credentials?.adAccountId) {
      throw new Error('Ad account ID not configured');
    }

    const params: any = {
      count: 100,
    };
    if (sinceId) {
      params.since_id = sinceId;
    }

    const response = await axios.get(
      `${TWITTER_ADS_API_URL}/accounts/${this.credentials.adAccountId}/cards/lead_gen/${cardId}/submissions`,
      {
        headers: this.getAuthHeaders(),
        params,
      }
    );

    return response.data.data || [];
  }

  /**
   * Sync form leads with deduplication
   */
  async syncFormLeads(
    cardId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ): Promise<SyncResult> {
    try {
      const submissions = await this.getCardSubmissions(cardId);

      let created = 0;
      let skipped = 0;

      for (const submission of submissions) {
        const leadData: TwitterLeadData = {
          leadId: submission.id,
          cardId: cardId,
          campaignId: submission.campaign_id || 'unknown',
          tweetId: submission.tweet_id,
          submittedAt: submission.created_at,
          fields: this.applyFieldMapping(submission.user_data || {}, fieldMapping),
        };

        const result = await this.processLeadSubmission(leadData, organizationId);
        if (result) {
          created++;
        } else {
          skipped++;
        }
      }

      return { created, skipped, total: submissions.length };
    } catch (error) {
      console.error('[TwitterAds] Failed to sync form leads:', error);
      return { created: 0, skipped: 0, total: 0 };
    }
  }

  /**
   * Apply field mapping
   */
  private applyFieldMapping(
    fields: Record<string, string>,
    mapping: Record<string, string>
  ): Record<string, string> {
    if (!mapping || Object.keys(mapping).length === 0) {
      return fields;
    }

    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(fields)) {
      const mappedKey = mapping[key] || key;
      result[mappedKey] = value;
    }

    return result;
  }

  /**
   * Get form fields schema
   */
  async getFormFields(cardId: string): Promise<LeadFormField[]> {
    try {
      const cards = await this.getLeadGenCards();
      const card = cards.find((c: any) => c.id === cardId);

      if (!card) return [];

      // Twitter Lead Gen Cards have fixed fields
      return [
        { key: 'name', label: 'Name', type: 'TEXT' },
        { key: 'email', label: 'Email', type: 'EMAIL' },
        { key: 'screen_name', label: 'Twitter Handle', type: 'TEXT' },
      ];
    } catch (error) {
      console.error('[TwitterAds] Failed to get form fields:', error);
      return [];
    }
  }
}

export const twitterAdsService = new TwitterAdsService();
