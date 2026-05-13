/**
 * Meta Lead Ads Webhook Service
 *
 * Handles incoming lead notifications from Meta (Facebook + Instagram
 * Lead Ads share the same webhook infrastructure).
 *
 * Flow:
 *   1. Meta POSTs a notification to /api/platform-webhooks/meta with a
 *      leadgen_id (NOT the actual lead data)
 *   2. We verify the X-Hub-Signature-256 header against META_APP_SECRET
 *   3. We GET /{leadgen_id} from Meta Graph API using the page access
 *      token to fetch the full lead field_data
 *   4. We map Meta's field names to PlatformProspect fields and call
 *      platformProspectService.create() with source = META_LEAD_AD
 *
 * Configuration:
 *   META_WEBHOOK_VERIFY_TOKEN   — set in Meta App Dashboard webhook config
 *   META_APP_SECRET             — Meta App secret (for signature verify)
 *   META_PAGE_ACCESS_TOKEN      — long-lived page access token; fetches
 *                                 lead details from Graph API
 *   META_GRAPH_API_VERSION      — defaults to v18.0
 *
 * The page access token can be a single token for one page, or you can
 * extend this service to look up per-page tokens from DB when MyLeadX
 * grows to multiple Facebook Pages.
 */

import crypto from 'crypto';
import { platformProspectService } from './platform-prospect.service';
import { ProspectSource } from '@prisma/client';

export interface MetaWebhookEntry {
  id: string;
  time: number;
  changes: Array<{
    value: {
      form_id?: string;
      leadgen_id?: string;
      created_time?: number;
      page_id?: string;
      adgroup_id?: string;
      ad_id?: string;
    };
    field?: string;
  }>;
}

export interface MetaWebhookBody {
  object: string;
  entry: MetaWebhookEntry[];
}

interface MetaFieldDatum {
  name: string;
  values: string[];
}

interface MetaLeadDetails {
  id: string;
  created_time: string;
  ad_id?: string;
  ad_name?: string;
  campaign_id?: string;
  campaign_name?: string;
  form_id?: string;
  form_name?: string;
  field_data: MetaFieldDatum[];
}

const FIELD_ALIASES: Record<string, string[]> = {
  fullName: ['full_name', 'name', 'first_name', 'your_name'],
  email: ['email', 'work_email', 'email_address'],
  phone: ['phone_number', 'phone', 'mobile', 'mobile_number', 'whatsapp_number'],
  companyName: ['company_name', 'company', 'organization', 'business_name'],
  designation: ['job_title', 'designation', 'role', 'position'],
  industry: ['industry', 'business_industry'],
  teamSize: ['team_size', 'company_size', 'employee_count'],
  currentCrm: ['current_crm', 'existing_crm', 'crm_software'],
};

export class MetaLeadAdsService {
  private get appSecret(): string | undefined {
    return process.env.META_APP_SECRET;
  }

  private get verifyToken(): string | undefined {
    return process.env.META_WEBHOOK_VERIFY_TOKEN;
  }

  private get pageAccessToken(): string | undefined {
    return process.env.META_PAGE_ACCESS_TOKEN;
  }

  private get graphVersion(): string {
    return process.env.META_GRAPH_API_VERSION ?? 'v18.0';
  }

  /**
   * Meta's webhook verification handshake.
   * Called once when setting up the webhook in Meta App Dashboard.
   */
  verifyChallenge(mode: string | undefined, token: string | undefined, challenge: string | undefined): string | null {
    if (!this.verifyToken) {
      console.warn('[MetaLeadAds] META_WEBHOOK_VERIFY_TOKEN not configured');
      return null;
    }
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge ?? null;
    }
    return null;
  }

  /**
   * Validate Meta's X-Hub-Signature-256 header against the raw body.
   * Returns true if the signature matches META_APP_SECRET.
   */
  verifySignature(rawBody: string | Buffer, signatureHeader: string | undefined): boolean {
    if (!this.appSecret) {
      console.warn('[MetaLeadAds] META_APP_SECRET not configured — signature check skipped');
      return false;
    }
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

    const expected = crypto
      .createHmac('sha256', this.appSecret)
      .update(rawBody)
      .digest('hex');
    const provided = signatureHeader.slice('sha256='.length);

    try {
      return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'));
    } catch {
      return false;
    }
  }

  /**
   * Process a webhook POST body — iterate entries, fetch each leadgen_id
   * from Graph API, create a PlatformProspect for each lead.
   *
   * Returns a summary so the controller can log/respond.
   */
  async handleWebhook(body: MetaWebhookBody): Promise<{ processed: number; failed: number }> {
    let processed = 0;
    let failed = 0;

    if (body.object !== 'page') {
      return { processed, failed };
    }

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue;
        const leadgenId = change.value.leadgen_id;
        if (!leadgenId) continue;

        try {
          await this.processLeadgenId(leadgenId, change.value);
          processed += 1;
        } catch (err) {
          failed += 1;
          console.error('[MetaLeadAds] Failed to process leadgen_id:', leadgenId, (err as Error).message);
        }
      }
    }

    return { processed, failed };
  }

  private async processLeadgenId(
    leadgenId: string,
    webhookValue: MetaWebhookEntry['changes'][0]['value'],
  ): Promise<void> {
    const details = await this.fetchLeadDetails(leadgenId);

    const extracted = this.extractFields(details.field_data);
    if (!extracted.fullName || !extracted.email || !extracted.phone) {
      console.warn('[MetaLeadAds] Skipping lead with missing required fields:', leadgenId, extracted);
      return;
    }

    await platformProspectService.create({
      fullName: extracted.fullName,
      email: extracted.email,
      phone: extracted.phone,
      companyName: extracted.companyName,
      designation: extracted.designation,
      industry: extracted.industry,
      teamSize: extracted.teamSize,
      currentCrm: extracted.currentCrm,
      source: ProspectSource.META_LEAD_AD,
      adId: details.ad_id ?? webhookValue.ad_id,
      adName: details.ad_name,
      campaign: details.campaign_name ?? webhookValue.adgroup_id,
      medium: 'meta_lead_ad',
      rawData: {
        leadgenId: details.id,
        formId: details.form_id ?? webhookValue.form_id,
        formName: details.form_name,
        createdTime: details.created_time,
        pageId: webhookValue.page_id,
        fieldData: details.field_data,
      },
    });
  }

  private async fetchLeadDetails(leadgenId: string): Promise<MetaLeadDetails> {
    if (!this.pageAccessToken) {
      throw new Error('META_PAGE_ACCESS_TOKEN not configured');
    }

    const fields = 'id,created_time,ad_id,ad_name,campaign_id,campaign_name,form_id,field_data';
    const url = `https://graph.facebook.com/${this.graphVersion}/${leadgenId}?fields=${fields}&access_token=${this.pageAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Graph API returned ${response.status}: ${text}`);
    }

    return (await response.json()) as MetaLeadDetails;
  }

  private extractFields(fieldData: MetaFieldDatum[]) {
    const fields: Record<string, string> = {};
    for (const datum of fieldData) {
      const name = datum.name.toLowerCase();
      const value = datum.values?.[0];
      if (!value) continue;
      fields[name] = value;
    }

    const result: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
    for (const [target, aliases] of Object.entries(FIELD_ALIASES)) {
      for (const alias of aliases) {
        if (fields[alias]) {
          result[target as keyof typeof FIELD_ALIASES] = fields[alias];
          break;
        }
      }
    }
    return result;
  }
}

export const metaLeadAdsService = new MetaLeadAdsService();
