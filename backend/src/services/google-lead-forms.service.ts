/**
 * Google Lead Forms Webhook Service
 *
 * Handles incoming lead submissions from Google Ads Lead Form Extensions
 * (the in-ad form that appears below a Search ad).
 *
 * Unlike Meta, Google delivers the lead data INSIDE the webhook POST
 * itself — no Graph API fetch needed.
 *
 * Authentication: Google sends a static `google_key` field in the body
 * that we compare against GOOGLE_LEAD_FORMS_WEBHOOK_KEY. (Optionally,
 * Google supports HMAC signatures via the `Authorization` header for
 * Customer Match Lead Forms, but the basic key check is what the
 * standard Lead Form Extension uses.)
 *
 * Configuration:
 *   GOOGLE_LEAD_FORMS_WEBHOOK_KEY — token entered in the Google Ads
 *                                   Lead Form delivery settings
 */

import { platformProspectService } from './platform-prospect.service';
import { ProspectSource } from '@prisma/client';

export interface GoogleLeadFormBody {
  google_key?: string;
  lead_id?: string;
  api_version?: string;
  form_id?: string | number;
  campaign_id?: string | number;
  adgroup_id?: string | number;
  creative_id?: string | number;
  gcl_id?: string;
  // User-provided answers come back as snake_case top-level keys.
  full_name?: string;
  user_name?: string;
  first_name?: string;
  last_name?: string;
  user_email?: string;
  email?: string;
  user_phone?: string;
  phone_number?: string;
  company_name?: string;
  job_title?: string;
  industry?: string;
  // Plus arbitrary custom questions from the form
  [key: string]: unknown;
}

export class GoogleLeadFormsService {
  private get webhookKey(): string | undefined {
    return process.env.GOOGLE_LEAD_FORMS_WEBHOOK_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.webhookKey);
  }

  /**
   * Validate the google_key field against env. Returns true if matches.
   */
  verifyKey(body: GoogleLeadFormBody): boolean {
    if (!this.webhookKey) {
      console.warn('[GoogleLeadForms] GOOGLE_LEAD_FORMS_WEBHOOK_KEY not configured');
      return false;
    }
    return body.google_key === this.webhookKey;
  }

  async handleWebhook(body: GoogleLeadFormBody): Promise<{ processed: boolean }> {
    const fullName =
      body.full_name ??
      body.user_name ??
      [body.first_name, body.last_name].filter(Boolean).join(' ');
    const email = body.user_email ?? body.email;
    const phone = body.user_phone ?? body.phone_number;

    if (!fullName || !email || !phone) {
      console.warn('[GoogleLeadForms] Skipping lead with missing required fields:', {
        fullName: Boolean(fullName),
        email: Boolean(email),
        phone: Boolean(phone),
      });
      return { processed: false };
    }

    await platformProspectService.create({
      fullName: String(fullName),
      email: String(email),
      phone: String(phone),
      companyName: body.company_name ? String(body.company_name) : undefined,
      designation: body.job_title ? String(body.job_title) : undefined,
      industry: body.industry ? String(body.industry) : undefined,
      source: ProspectSource.GOOGLE_LEAD_FORM,
      adId: body.creative_id ? String(body.creative_id) : undefined,
      campaign: body.campaign_id ? String(body.campaign_id) : undefined,
      medium: 'google_lead_form',
      rawData: {
        leadId: body.lead_id,
        formId: body.form_id,
        adgroupId: body.adgroup_id,
        gclid: body.gcl_id,
        ...body,
      },
    });

    return { processed: true };
  }
}

export const googleLeadFormsService = new GoogleLeadFormsService();
