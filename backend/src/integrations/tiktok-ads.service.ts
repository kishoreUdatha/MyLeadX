import axios from 'axios';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { externalLeadImportService } from '../services/external-lead-import.service';

const TIKTOK_ADS_API_URL = 'https://business-api.tiktok.com/open_api/v1.3';

interface TikTokCredentials {
  accessToken: string;
  advertiserId: string;
  pixelId?: string;
  webhookSecret?: string;
}

interface TikTokCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  budget?: number;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  spend?: number;
  videoViews?: number;
}

interface TikTokLeadData {
  leadId: string;
  formId: string;
  campaignId: string;
  adId?: string;
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

export class TikTokAdsService {
  private credentials: TikTokCredentials | null = null;

  /**
   * Initialize with credentials
   */
  initialize(credentials: TikTokCredentials) {
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
      throw new Error('TikTok Ads not configured');
    }
    return {
      'Access-Token': this.credentials.accessToken,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, timestamp: string): boolean {
    if (!this.credentials?.webhookSecret) {
      console.warn('[TikTokAds] Webhook secret not configured - skipping verification');
      return true;
    }

    try {
      const signString = `${timestamp}${payload}`;
      const expectedSignature = crypto
        .createHmac('sha256', this.credentials.webhookSecret)
        .update(signString)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      console.error('[TikTokAds] Signature verification error:', error);
      return false;
    }
  }

  /**
   * Sync campaigns from TikTok Ads
   */
  async syncCampaigns(organizationId: string): Promise<TikTokCampaign[]> {
    if (!this.credentials?.advertiserId) {
      console.log('[TikTokAds] No advertiser ID configured');
      return [];
    }

    try {
      // Get campaigns
      const campaignsResponse = await axios.get(`${TIKTOK_ADS_API_URL}/campaign/get/`, {
        headers: this.getAuthHeaders(),
        params: {
          advertiser_id: this.credentials.advertiserId,
          page_size: 100,
        },
      });

      const campaigns = campaignsResponse.data.data?.list || [];
      const results: TikTokCampaign[] = [];

      for (const campaign of campaigns) {
        const campaignId = campaign.campaign_id;

        const campaignData: TikTokCampaign = {
          id: campaignId,
          name: campaign.campaign_name,
          status: campaign.operation_status || campaign.status,
          objective: campaign.objective_type,
          budget: campaign.budget,
        };

        // Get campaign metrics
        try {
          const metricsResponse = await axios.get(`${TIKTOK_ADS_API_URL}/report/integrated/get/`, {
            headers: this.getAuthHeaders(),
            params: {
              advertiser_id: this.credentials.advertiserId,
              report_type: 'BASIC',
              dimensions: JSON.stringify(['campaign_id']),
              metrics: JSON.stringify(['impressions', 'clicks', 'conversion', 'spend', 'video_views']),
              filters: JSON.stringify([{ field_name: 'campaign_id', filter_type: 'IN', filter_value: [campaignId] }]),
              data_level: 'AUCTION_CAMPAIGN',
              lifetime: true,
            },
          });

          const metrics = metricsResponse.data.data?.list?.[0]?.metrics;
          if (metrics) {
            campaignData.impressions = parseInt(metrics.impressions || '0');
            campaignData.clicks = parseInt(metrics.clicks || '0');
            campaignData.conversions = parseInt(metrics.conversion || '0');
            campaignData.spend = parseFloat(metrics.spend || '0');
            campaignData.videoViews = parseInt(metrics.video_views || '0');
          }
        } catch (metricsError) {
          console.warn(`[TikTokAds] Failed to get metrics for campaign ${campaignId}:`, metricsError);
        }

        // Upsert to database
        const existing = await prisma.adCampaign.findUnique({
          where: {
            platform_externalId: {
              platform: AdPlatform.TIKTOK,
              externalId: campaignId,
            },
          },
        });

        const data = {
          name: campaignData.name,
          status: campaignData.status,
          impressions: campaignData.impressions,
          clicks: campaignData.clicks,
          conversions: campaignData.conversions,
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
              platform: AdPlatform.TIKTOK,
              externalId: campaignId,
              ...data,
            },
          });
        }

        results.push(campaignData);
      }

      return results;
    } catch (error) {
      console.error('[TikTokAds] Failed to sync campaigns:', error);
      return [];
    }
  }

  /**
   * Get Instant Form templates
   */
  async getInstantForms() {
    if (!this.credentials?.advertiserId) {
      throw new Error('Advertiser ID not configured');
    }

    const response = await axios.get(`${TIKTOK_ADS_API_URL}/creative/instant_page/list/`, {
      headers: this.getAuthHeaders(),
      params: {
        advertiser_id: this.credentials.advertiserId,
        page_size: 100,
      },
    });

    return response.data.data?.list || [];
  }

  /**
   * Get Instant Form leads
   */
  async getInstantFormLeads(formId: string, startDate?: string, endDate?: string) {
    if (!this.credentials?.advertiserId) {
      throw new Error('Advertiser ID not configured');
    }

    const params: any = {
      advertiser_id: this.credentials.advertiserId,
      page_id: formId,
      page_size: 100,
    };

    if (startDate) params.start_time = startDate;
    if (endDate) params.end_time = endDate;

    const response = await axios.get(`${TIKTOK_ADS_API_URL}/lead/get/`, {
      headers: this.getAuthHeaders(),
      params,
    });

    return response.data.data?.list || [];
  }

  /**
   * Handle webhook for TikTok Instant Form submissions
   */
  async handleWebhook(payload: any, organizationId: string): Promise<any> {
    console.info(`[TikTokAds] Processing webhook for org: ${organizationId}`);

    // Format 1: TikTok Lead Event
    if (payload.event_type === 'lead' || payload.lead_id) {
      const leadData: TikTokLeadData = {
        leadId: payload.lead_id || payload.leadId || `tiktok-${Date.now()}`,
        formId: payload.page_id || payload.form_id || payload.formId || 'unknown',
        campaignId: payload.campaign_id || payload.campaignId || 'unknown',
        adId: payload.ad_id || payload.adId,
        videoId: payload.video_id || payload.videoId,
        submittedAt: payload.create_time || payload.submittedAt || new Date().toISOString(),
        fields: this.extractFields(payload),
      };

      return this.processLeadSubmission(leadData, organizationId);
    }

    // Format 2: Flat field format (Zapier/Make integrations)
    if (payload.email || payload.firstName || payload.phone) {
      const leadData: TikTokLeadData = {
        leadId: payload.lead_id || `tiktok-${Date.now()}`,
        formId: payload.form_id || payload.page_id || 'unknown',
        campaignId: payload.campaign_id || 'unknown',
        adId: payload.ad_id,
        videoId: payload.video_id,
        submittedAt: payload.submitted_at || new Date().toISOString(),
        fields: this.extractFields(payload),
      };

      return this.processLeadSubmission(leadData, organizationId);
    }

    // Format 3: Batch format
    if (Array.isArray(payload.leads) || Array.isArray(payload.data)) {
      const leads = payload.leads || payload.data;
      const results = [];

      for (const lead of leads) {
        try {
          const result = await this.handleWebhook(lead, organizationId);
          if (result) results.push(result);
        } catch (error) {
          console.error('[TikTokAds] Failed to process lead in batch:', error);
        }
      }
      return results;
    }

    // Format 4: TikTok Events API format
    if (payload.data && Array.isArray(payload.data) && payload.data[0]?.event_type) {
      const results = [];
      for (const event of payload.data) {
        if (event.event_type === 'SubmitForm' || event.event_type === 'CompletePayment') {
          const leadData: TikTokLeadData = {
            leadId: event.event_id || `tiktok-${Date.now()}`,
            formId: event.properties?.page_id || 'unknown',
            campaignId: event.properties?.campaign_id || 'unknown',
            videoId: event.properties?.video_id,
            submittedAt: event.timestamp || new Date().toISOString(),
            fields: event.user || {},
          };

          try {
            const result = await this.processLeadSubmission(leadData, organizationId);
            if (result) results.push(result);
          } catch (error) {
            console.error('[TikTokAds] Failed to process event:', error);
          }
        }
      }
      return results;
    }

    console.warn('[TikTokAds] Webhook received but no recognizable lead format found');
    return null;
  }

  /**
   * Extract fields from payload
   */
  private extractFields(payload: any): Record<string, string> {
    const fields: Record<string, string> = {};
    const fieldNames = ['name', 'firstName', 'lastName', 'email', 'phone', 'city', 'country'];

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

    // Check nested field_data or user_data
    const fieldData = payload.field_data || payload.user_data || payload.user || {};
    for (const [key, value] of Object.entries(fieldData)) {
      if (typeof value === 'string') {
        fields[this.mapFieldName(key)] = value;
      }
    }

    // Parse TikTok specific field format
    if (Array.isArray(payload.fields)) {
      for (const field of payload.fields) {
        if (field.value) {
          fields[this.mapFieldName(field.name || field.key)] = field.value;
        }
      }
    }

    return fields;
  }

  /**
   * Map field names to standard format
   */
  private mapFieldName(name: string): string {
    const mappings: Record<string, string> = {
      'full_name': 'fullName',
      'first_name': 'firstName',
      'last_name': 'lastName',
      'email_address': 'email',
      'phone_number': 'phone',
      'phone_num': 'phone',
      'mobile': 'phone',
    };
    return mappings[name.toLowerCase()] || name;
  }

  /**
   * Process a lead submission
   */
  async processLeadSubmission(leadData: TikTokLeadData, organizationId: string) {
    // Check for duplicate by external ID
    const existingAdLead = await prisma.adLead.findFirst({
      where: { externalId: leadData.leadId },
    });

    if (existingAdLead) {
      console.log(`[TikTokAds] Lead already exists: ${leadData.leadId}`);
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
        console.log(`[TikTokAds] Duplicate lead by email/phone: ${existingLead.id}`);
        return existingLead;
      }
    }

    // Find or create campaign
    let adCampaign = await prisma.adCampaign.findUnique({
      where: {
        platform_externalId: {
          platform: AdPlatform.TIKTOK,
          externalId: leadData.campaignId,
        },
      },
    });

    if (!adCampaign) {
      adCampaign = await prisma.adCampaign.create({
        data: {
          organizationId,
          platform: AdPlatform.TIKTOK,
          externalId: leadData.campaignId,
          name: 'TikTok Campaign',
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
      source: 'AD_TIKTOK',
      sourceDetails: `TikTok Campaign: ${adCampaign.name}`,
      campaignName: adCampaign.name,
      customFields: {
        ...leadData.fields,
        leadId: leadData.leadId,
        formId: leadData.formId,
        adId: leadData.adId,
        videoId: leadData.videoId,
        campaignId: leadData.campaignId,
      },
    });

    if (result.isDuplicate) {
      console.log(`[TikTokAds] Duplicate lead skipped: ${leadData.fields.phone || leadData.fields.email}`);
      return null;
    }

    // Update campaign conversions
    await prisma.adCampaign.update({
      where: { id: adCampaign.id },
      data: { conversions: { increment: 1 } },
    });

    console.log(`[TikTokAds] Lead imported: ${result.rawImportRecord.id}`);
    return result.rawImportRecord;
  }

  /**
   * Track TikTok Pixel event
   */
  async trackPixelEvent(eventName: string, eventData: any) {
    if (!this.credentials?.pixelId) {
      console.warn('[TikTokAds] Pixel ID not configured');
      return null;
    }

    try {
      const response = await axios.post(
        `${TIKTOK_ADS_API_URL}/pixel/track/`,
        {
          pixel_code: this.credentials.pixelId,
          event: eventName,
          timestamp: new Date().toISOString(),
          context: {
            ad: eventData.adId ? { ad_id: eventData.adId } : undefined,
            page: eventData.pageUrl ? { url: eventData.pageUrl } : undefined,
            user: eventData.user || {},
          },
          properties: eventData.properties || {},
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error) {
      console.error('[TikTokAds] Failed to track pixel event:', error);
      return null;
    }
  }

  /**
   * Sync form leads with deduplication
   */
  async syncFormLeads(
    formId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ): Promise<SyncResult> {
    try {
      const leads = await this.getInstantFormLeads(formId);

      let created = 0;
      let skipped = 0;

      for (const lead of leads) {
        const fields = this.applyFieldMapping(this.extractFields(lead), fieldMapping);

        const leadData: TikTokLeadData = {
          leadId: lead.lead_id || `tiktok-${Date.now()}`,
          formId: formId,
          campaignId: lead.campaign_id || 'unknown',
          adId: lead.ad_id,
          submittedAt: lead.create_time,
          fields,
        };

        const result = await this.processLeadSubmission(leadData, organizationId);
        if (result) {
          created++;
        } else {
          skipped++;
        }
      }

      return { created, skipped, total: leads.length };
    } catch (error) {
      console.error('[TikTokAds] Failed to sync form leads:', error);
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
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    try {
      const forms = await this.getInstantForms();
      const form = forms.find((f: any) => f.page_id === formId);

      if (!form?.components) return [];

      return (form.components || [])
        .filter((c: any) => c.component_type === 'FORM')
        .flatMap((c: any) => c.fields || [])
        .map((f: any) => ({
          key: f.field_name || f.name,
          label: f.field_label || f.label || f.name,
          type: f.field_type || 'TEXT',
        }));
    } catch (error) {
      console.error('[TikTokAds] Failed to get form fields:', error);
      return [];
    }
  }
}

export const tiktokAdsService = new TikTokAdsService();
