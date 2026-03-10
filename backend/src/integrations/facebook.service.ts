import axios from 'axios';
import crypto from 'crypto';
import { config } from '../config';
import { prisma } from '../config/database';
import { AdPlatform, LeadSource, LeadPriority } from '@prisma/client';
import { leadAutoAssignService } from '../services/leadAutoAssign.service';
import { circuitBreakers, CircuitBreakerError } from '../utils/circuitBreaker';
import { API_VERSIONS, API_ENDPOINTS } from '../utils/constants';

const FB_GRAPH_URL = API_ENDPOINTS.FACEBOOK_GRAPH;

interface FacebookLeadData {
  id: string;
  created_time: string;
  field_data: Array<{ name: string; values: string[] }>;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  form_id?: string;
}

interface FacebookAdCampaign {
  id: string;
  name: string;
  status: string;
  objective?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
}

interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
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

export class FacebookService {
  private accessToken: string | null = null;

  constructor() {
    // Access token should be stored securely per organization
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string | null> {
    const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      console.info('[Facebook] Webhook verification successful');
      return challenge;
    }
    console.warn(`[Facebook] Webhook verification failed - mode: ${mode}, token match: ${token === verifyToken}`);
    return null;
  }

  verifySignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', config.facebook.appSecret || '')
      .update(payload)
      .digest('hex');
    return `sha256=${expectedSignature}` === signature;
  }

  async handleWebhook(payload: Record<string, unknown>, organizationId: string) {
    const entry = (payload.entry as any[])?.[0];
    const changes = entry?.changes?.[0];

    if (changes?.field === 'leadgen') {
      const leadgenId = changes.value?.leadgen_id;
      if (leadgenId) {
        console.info(`[Facebook] Processing leadgen event: ${leadgenId} for org: ${organizationId}`);
        return this.processLeadgenEvent(leadgenId, organizationId);
      }
      console.warn('[Facebook] Webhook received leadgen event but no leadgen_id found');
    } else {
      console.info(`[Facebook] Webhook received non-leadgen event: field=${changes?.field || 'unknown'}`);
    }

    return null;
  }

  async processLeadgenEvent(leadgenId: string, organizationId: string) {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    // Fetch lead data from Facebook with circuit breaker protection
    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/${leadgenId}`, {
        params: { access_token: this.accessToken },
      })
    );

    const leadData: FacebookLeadData = response.data;

    // Parse field data
    const fields = this.parseFieldData(leadData.field_data);

    // Find or create ad campaign
    let adCampaign = null;
    if (leadData.campaign_id) {
      adCampaign = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.FACEBOOK,
            externalId: leadData.campaign_id,
          },
        },
      });

      if (!adCampaign) {
        // Fetch campaign details with circuit breaker protection
        const campaignResponse = await circuitBreakers.facebook.execute(() =>
          axios.get(
            `${FB_GRAPH_URL}/${leadData.campaign_id}`,
            { params: { access_token: this.accessToken, fields: 'name,status' } }
          )
        );

        adCampaign = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.FACEBOOK,
            externalId: leadData.campaign_id,
            name: campaignResponse.data.name || 'Unknown Campaign',
            status: campaignResponse.data.status || 'UNKNOWN',
            syncedAt: new Date(),
          },
        });
      }
    }

    // Create lead
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: fields.first_name || fields.full_name?.split(' ')[0] || 'Unknown',
        lastName: fields.last_name || fields.full_name?.split(' ').slice(1).join(' '),
        email: fields.email,
        phone: fields.phone_number || 'N/A',
        source: LeadSource.AD_FACEBOOK,
        sourceDetails: `Campaign: ${adCampaign?.name || 'Unknown'}`,
        priority: LeadPriority.MEDIUM,
        customFields: fields,
      },
    });

    // Create ad lead record
    if (adCampaign) {
      await prisma.adLead.create({
        data: {
          adCampaignId: adCampaign.id,
          leadId: lead.id,
          externalId: leadgenId,
          rawData: leadData as any,
        },
      });

      // Update campaign conversions count
      await prisma.adCampaign.update({
        where: { id: adCampaign.id },
        data: { conversions: { increment: 1 } },
      });
    }

    // Auto-assign to AI agent for calling
    try {
      await leadAutoAssignService.processNewLead(lead.id);
      console.log(`Lead ${lead.id} auto-assigned to AI agent`);
    } catch (error) {
      console.error(`Failed to auto-assign lead ${lead.id}:`, error);
      // Don't throw - lead is already created
    }

    return lead;
  }

  private parseFieldData(fieldData: Array<{ name: string; values: string[] }>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const field of fieldData) {
      result[field.name] = field.values[0];
    }
    return result;
  }

  async syncCampaigns(organizationId: string, adAccountId: string) {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/act_${adAccountId}/campaigns`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,status,objective',
        },
      })
    );

    const campaigns: FacebookAdCampaign[] = response.data.data;
    const results = [];

    for (const campaign of campaigns) {
      const existing = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.FACEBOOK,
            externalId: campaign.id,
          },
        },
      });

      if (existing) {
        const updated = await prisma.adCampaign.update({
          where: { id: existing.id },
          data: {
            name: campaign.name,
            status: campaign.status,
            syncedAt: new Date(),
          },
        });
        results.push(updated);
      } else {
        const created = await prisma.adCampaign.create({
          data: {
            organizationId,
            platform: AdPlatform.FACEBOOK,
            externalId: campaign.id,
            name: campaign.name,
            status: campaign.status,
            syncedAt: new Date(),
          },
        });
        results.push(created);
      }
    }

    return results;
  }

  async getCampaignInsights(campaignId: string) {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/${campaignId}/insights`, {
        params: {
          access_token: this.accessToken,
          fields: 'spend,impressions,clicks,actions',
        },
      })
    );

    return response.data.data?.[0] || null;
  }

  /**
   * Get Facebook pages the user has access to
   */
  async getPages(): Promise<FacebookPage[]> {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/me/accounts`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,access_token',
        },
      })
    );

    return response.data.data || [];
  }

  /**
   * Get lead forms for a page
   */
  async getLeadForms(pageId: string) {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/${pageId}/leadgen_forms`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,status,leads_count,locale,created_time',
        },
      })
    );

    return response.data.data || [];
  }

  /**
   * Get form fields schema
   */
  async getFormFields(formId: string): Promise<LeadFormField[]> {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/${formId}`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,name,questions',
        },
      })
    );

    const questions = response.data.questions || [];
    return questions.map((q: any) => ({
      key: q.key,
      label: q.label,
      type: q.type,
    }));
  }

  /**
   * Sync leads from a form with deduplication
   */
  async syncFormLeads(
    formId: string,
    organizationId: string,
    fieldMapping: Record<string, string> = {}
  ): Promise<SyncResult> {
    if (!this.accessToken) {
      throw new Error('Facebook access token not set');
    }

    const response = await circuitBreakers.facebook.execute(() =>
      axios.get(`${FB_GRAPH_URL}/${formId}/leads`, {
        params: {
          access_token: this.accessToken,
          fields: 'id,created_time,field_data,ad_id,adset_id,campaign_id',
        },
      })
    );

    const leadsData = response.data.data || [];
    let created = 0;
    let skipped = 0;

    for (const leadData of leadsData) {
      const fields = this.parseFieldData(leadData.field_data);
      const mappedFields = this.applyFieldMapping(fields, fieldMapping);

      const phone = mappedFields.phone || mappedFields.phone_number || '';
      const email = mappedFields.email || '';

      // Check for duplicates
      if (phone || email) {
        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId,
            OR: [
              ...(phone ? [{ phone }] : []),
              ...(email ? [{ email }] : []),
            ],
          },
        });

        if (existingLead) {
          skipped++;
          continue;
        }
      }

      // Create lead
      await this.createLeadFromData(leadData, organizationId, mappedFields);
      created++;
    }

    return { created, skipped, total: leadsData.length };
  }

  /**
   * Apply field mapping to parsed fields
   */
  private applyFieldMapping(
    fields: Record<string, string>,
    mapping: Record<string, string>
  ): Record<string, string> {
    if (!mapping || Object.keys(mapping).length === 0) {
      return fields;
    }

    const result: Record<string, string> = {};
    for (const [sourceKey, value] of Object.entries(fields)) {
      const targetKey = mapping[sourceKey] || sourceKey;
      result[targetKey] = value;
    }

    return result;
  }

  /**
   * Create lead from Facebook lead data
   */
  private async createLeadFromData(
    leadData: FacebookLeadData,
    organizationId: string,
    fields: Record<string, string>
  ) {
    let adCampaign = null;
    if (leadData.campaign_id) {
      adCampaign = await prisma.adCampaign.findUnique({
        where: {
          platform_externalId: {
            platform: AdPlatform.FACEBOOK,
            externalId: leadData.campaign_id,
          },
        },
      });

      if (!adCampaign) {
        try {
          const campaignResponse = await circuitBreakers.facebook.execute(() =>
            axios.get(
              `${FB_GRAPH_URL}/${leadData.campaign_id}`,
              {
                params: {
                  access_token: this.accessToken,
                  fields: 'name,status',
                },
              }
            )
          );

          adCampaign = await prisma.adCampaign.create({
            data: {
              organizationId,
              platform: AdPlatform.FACEBOOK,
              externalId: leadData.campaign_id,
              name: campaignResponse.data.name || 'Facebook Campaign',
              status: campaignResponse.data.status || 'UNKNOWN',
              syncedAt: new Date(),
            },
          });
        } catch {
          adCampaign = await prisma.adCampaign.create({
            data: {
              organizationId,
              platform: AdPlatform.FACEBOOK,
              externalId: leadData.campaign_id,
              name: 'Facebook Campaign',
              status: 'UNKNOWN',
              syncedAt: new Date(),
            },
          });
        }
      }
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName: fields.first_name || fields.firstName || fields.full_name?.split(' ')[0] || 'Unknown',
        lastName: fields.last_name || fields.lastName || fields.full_name?.split(' ').slice(1).join(' '),
        email: fields.email,
        phone: fields.phone_number || fields.phone || 'N/A',
        source: LeadSource.AD_FACEBOOK,
        sourceDetails: `Facebook Campaign: ${adCampaign?.name || 'Unknown'}`,
        priority: LeadPriority.MEDIUM,
        customFields: fields,
      },
    });

    if (adCampaign) {
      await prisma.adLead.create({
        data: {
          adCampaignId: adCampaign.id,
          leadId: lead.id,
          externalId: leadData.id,
          rawData: leadData as any,
        },
      });

      await prisma.adCampaign.update({
        where: { id: adCampaign.id },
        data: { conversions: { increment: 1 } },
      });
    }

    return lead;
  }
}

export const facebookService = new FacebookService();
