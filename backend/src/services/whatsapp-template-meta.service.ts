/**
 * WhatsApp Template ↔ Meta integration service
 *
 * Connects MyLeadX's local MessageTemplate records (type=WHATSAPP) to Meta's
 * message_templates API. Three responsibilities:
 *
 *   1. submitForApproval()  — POST a template to Meta for review
 *   2. handleStatusWebhook() — apply incoming message_template_status_update
 *      events to the local MessageTemplate row
 *   3. syncStatusForOrg()   — pull Meta's current statuses for one org as a
 *      fallback when webhooks are missed
 *
 * All three honor tenant isolation: every call is scoped by organizationId,
 * and Meta credentials are read from organization.settings.whatsapp — never
 * from process.env in production paths.
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { WhatsAppTemplateStatus } from '@prisma/client';

const GRAPH_API_VERSION = 'v18.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

interface MetaCredentials {
  accessToken: string;
  businessAccountId: string;
}

/** Load the tenant's WhatsApp credentials. Returns null if not configured. */
async function loadCredentials(organizationId: string): Promise<MetaCredentials | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  if (!org) return null;

  const settings = (org.settings as any) || {};
  const wa = settings.whatsapp;
  if (!wa?.accessToken || !wa?.businessAccountId) return null;

  return {
    accessToken: wa.accessToken,
    businessAccountId: wa.businessAccountId,
  };
}

/**
 * Convert MyLeadX's `{{variable}}` placeholders to Meta's `{{1}}`, `{{2}}` form.
 * Returns the converted body string + the ordered list of original variable names
 * so we can reconstruct the mapping when sending.
 */
function convertVariablesToMeta(content: string): { body: string; orderedVars: string[] } {
  const matches = Array.from(content.matchAll(/\{\{(\w+)\}\}/g));
  const orderedVars: string[] = [];
  let body = content;

  for (const match of matches) {
    const varName = match[1];
    let idx = orderedVars.indexOf(varName);
    if (idx === -1) {
      orderedVars.push(varName);
      idx = orderedVars.length - 1;
    }
    // Use a placeholder unlikely to collide while we substitute.
    body = body.replace(match[0], `__META_VAR_${idx + 1}__`);
  }

  // Now swap our placeholders for Meta's {{N}} form. Done in two passes so
  // we don't accidentally re-replace something inside an earlier substitution.
  for (let i = 0; i < orderedVars.length; i++) {
    body = body.split(`__META_VAR_${i + 1}__`).join(`{{${i + 1}}}`);
  }

  return { body, orderedVars };
}

/** Build the components array Meta expects from our MessageTemplate fields. */
function buildMetaComponents(template: {
  content: string;
  headerType: string | null;
  headerContent: string | null;
  footerContent: string | null;
  buttons: any;
  sampleValues: any;
}): { components: any[]; orderedVars: string[] } {
  const components: any[] = [];

  // Header (optional)
  if (template.headerType && template.headerContent) {
    const headerType = template.headerType.toUpperCase();
    if (headerType === 'TEXT') {
      components.push({
        type: 'HEADER',
        format: 'TEXT',
        text: template.headerContent,
      });
    } else if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(headerType)) {
      components.push({
        type: 'HEADER',
        format: headerType,
        example: { header_handle: [template.headerContent] },
      });
    }
  }

  // Body (required) — variable conversion happens here
  const { body, orderedVars } = convertVariablesToMeta(template.content);
  const bodyComponent: any = {
    type: 'BODY',
    text: body,
  };
  // Meta requires sample values for every {{N}} placeholder in the body.
  if (orderedVars.length > 0) {
    const sampleValues = (template.sampleValues as Record<string, string>) || {};
    bodyComponent.example = {
      body_text: [orderedVars.map((v) => sampleValues[v] || `Sample ${v}`)],
    };
  }
  components.push(bodyComponent);

  // Footer (optional)
  if (template.footerContent) {
    components.push({
      type: 'FOOTER',
      text: template.footerContent,
    });
  }

  // Buttons (optional) — supports QUICK_REPLY and URL types
  const buttons = Array.isArray(template.buttons) ? template.buttons : [];
  if (buttons.length > 0) {
    components.push({
      type: 'BUTTONS',
      buttons: buttons.map((b: any) => {
        if (b.type === 'URL') {
          return { type: 'URL', text: b.text, url: b.url };
        }
        if (b.type === 'PHONE_NUMBER') {
          return { type: 'PHONE_NUMBER', text: b.text, phone_number: b.phone };
        }
        return { type: 'QUICK_REPLY', text: b.text };
      }),
    });
  }

  return { components, orderedVars };
}

/** Map Meta's status string to our enum. */
function mapMetaStatus(metaStatus: string): WhatsAppTemplateStatus {
  switch (metaStatus.toUpperCase()) {
    case 'APPROVED':
      return WhatsAppTemplateStatus.APPROVED;
    case 'REJECTED':
      return WhatsAppTemplateStatus.REJECTED;
    case 'PAUSED':
    case 'DISABLED':
      return WhatsAppTemplateStatus.PAUSED;
    default:
      // PENDING, IN_APPEAL, PENDING_DELETION etc. → PENDING
      return WhatsAppTemplateStatus.PENDING;
  }
}

export class WhatsAppTemplateMetaService {
  /**
   * Submit a local MessageTemplate to Meta for approval. Stores the returned
   * Meta template ID and status on the local row. Idempotent — if the row
   * already has a whatsappTemplateId, this throws to prevent duplicate submits
   * (use resubmit() if you really want to push again).
   */
  async submitForApproval(templateId: string, organizationId: string): Promise<{
    templateId: string;
    metaTemplateId: string;
    status: WhatsAppTemplateStatus;
  }> {
    const template = await prisma.messageTemplate.findFirst({
      where: { id: templateId, organizationId, type: 'WHATSAPP' },
    });
    if (!template) {
      throw new Error('WhatsApp template not found for this organization');
    }
    if (template.whatsappTemplateId) {
      throw new Error('Template already submitted to Meta — use resubmit to push again');
    }

    const creds = await loadCredentials(organizationId);
    if (!creds) {
      throw new Error('WhatsApp Meta credentials not configured for this organization');
    }

    const { components } = buildMetaComponents({
      content: template.content,
      headerType: template.headerType,
      headerContent: template.headerContent,
      footerContent: template.footerContent,
      buttons: template.buttons,
      sampleValues: template.sampleValues,
    });

    // Meta template names must be lowercase, no spaces. Normalize.
    const metaName = template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 512);
    const category = (template.category || 'MARKETING').toUpperCase();
    const validCategory = ['MARKETING', 'UTILITY', 'AUTHENTICATION'].includes(category)
      ? category
      : 'MARKETING';

    const payload = {
      name: metaName,
      language: template.whatsappLanguage || 'en',
      category: validCategory,
      components,
    };

    if (__DEV__()) console.log('[WhatsAppTemplate] Submitting to Meta:', metaName);

    let metaResponse: any;
    try {
      const response = await axios.post(
        `${GRAPH_BASE}/${creds.businessAccountId}/message_templates`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${creds.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      metaResponse = response.data;
    } catch (error: any) {
      const metaError = error.response?.data?.error;
      const message = metaError?.error_user_msg || metaError?.message || error.message;
      throw new Error(`Meta rejected submission: ${message}`);
    }

    const newStatus = mapMetaStatus(metaResponse.status || 'PENDING');

    await prisma.messageTemplate.update({
      where: { id: template.id },
      data: {
        whatsappTemplateId: metaResponse.id,
        whatsappStatus: newStatus,
      },
    });

    return {
      templateId: template.id,
      metaTemplateId: metaResponse.id,
      status: newStatus,
    };
  }

  /**
   * Handle a `message_template_status_update` webhook event from Meta.
   * Looks up the local MessageTemplate by Meta's template ID and updates
   * whatsappStatus. Silent no-op if no matching row exists (e.g. template
   * was created directly in Meta UI without going through MyLeadX).
   */
  async handleStatusWebhook(value: {
    message_template_id?: string | number;
    message_template_name?: string;
    message_template_language?: string;
    event?: string;
    reason?: string;
  }): Promise<void> {
    const metaId = value.message_template_id?.toString();
    if (!metaId) return;

    const newStatus = mapMetaStatus(value.event || 'PENDING');

    // Update every matching template (could be multiple orgs theoretically;
    // in practice each Meta template ID is unique to one WABA = one org).
    const result = await prisma.messageTemplate.updateMany({
      where: { whatsappTemplateId: metaId },
      data: { whatsappStatus: newStatus },
    });

    if (__DEV__()) {
      console.log(
        `[WhatsAppTemplate] Webhook updated ${result.count} row(s) for meta ID ${metaId} → ${newStatus}`,
        value.reason ? `(reason: ${value.reason})` : ''
      );
    }
  }

  /**
   * Fallback sync — fetches Meta's current template list for one org and
   * updates any local MessageTemplate rows whose whatsappStatus diverges.
   * Used by the hourly scheduled job when webhooks are missed or replayed.
   */
  async syncStatusForOrg(organizationId: string): Promise<{
    checked: number;
    updated: number;
  }> {
    const creds = await loadCredentials(organizationId);
    if (!creds) return { checked: 0, updated: 0 };

    let metaTemplates: any[] = [];
    try {
      const response = await axios.get(
        `${GRAPH_BASE}/${creds.businessAccountId}/message_templates`,
        {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
          params: { fields: 'id,name,status,language', limit: 200 },
        }
      );
      metaTemplates = response.data?.data || [];
    } catch (error: any) {
      // Don't throw — this is a best-effort fallback. Log and move on.
      if (__DEV__()) {
        console.warn(
          `[WhatsAppTemplate] Sync failed for org ${organizationId}:`,
          error.response?.data?.error?.message || error.message
        );
      }
      return { checked: 0, updated: 0 };
    }

    // Build a map of meta_id → meta_status for fast lookup.
    const metaStatusById = new Map<string, string>();
    for (const t of metaTemplates) {
      if (t.id) metaStatusById.set(t.id.toString(), t.status || 'PENDING');
    }

    // Pull all local WhatsApp templates for this org that already have a Meta ID.
    const localTemplates = await prisma.messageTemplate.findMany({
      where: {
        organizationId,
        type: 'WHATSAPP',
        whatsappTemplateId: { not: null },
      },
      select: { id: true, whatsappTemplateId: true, whatsappStatus: true },
    });

    let updated = 0;
    for (const local of localTemplates) {
      const metaStatus = local.whatsappTemplateId
        ? metaStatusById.get(local.whatsappTemplateId)
        : undefined;
      if (!metaStatus) continue;

      const mapped = mapMetaStatus(metaStatus);
      if (mapped !== local.whatsappStatus) {
        await prisma.messageTemplate.update({
          where: { id: local.id },
          data: { whatsappStatus: mapped },
        });
        updated += 1;
      }
    }

    return { checked: localTemplates.length, updated };
  }

  /**
   * Sweep across every org with WhatsApp configured. Called by the
   * scheduled job hourly. Returns aggregate counts for logging.
   */
  async syncAllOrgs(): Promise<{ orgsChecked: number; templatesUpdated: number }> {
    // Find org IDs that have a whatsapp.businessAccountId configured. We
    // can't filter on the nested JSON cheaply, so pull org IDs broadly and
    // filter at the credentials-load step.
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    let templatesUpdated = 0;
    let orgsChecked = 0;
    for (const org of orgs) {
      const result = await this.syncStatusForOrg(org.id);
      if (result.checked > 0) {
        orgsChecked += 1;
        templatesUpdated += result.updated;
      }
    }
    return { orgsChecked, templatesUpdated };
  }
}

// Tiny helper that mirrors RN's __DEV__ — in Node we check NODE_ENV.
// Lets us suppress verbose logs in production without sprinkling
// `if (process.env.NODE_ENV !== 'production')` everywhere.
function __DEV__(): boolean {
  return process.env.NODE_ENV !== 'production';
}

export const whatsappTemplateMetaService = new WhatsAppTemplateMetaService();
