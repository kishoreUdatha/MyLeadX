/**
 * Meta Conversions API (CAPI) Service
 *
 * Server-side complement to the browser Pixel. Same event ("Lead") gets
 * reported from both sides; Meta uses the shared event_id to deduplicate.
 *
 * Why bother when the browser Pixel already fires?
 *   - iOS 14+ ATT blocks ~80% of browser Pixel signals
 *   - Ad blockers strip the Pixel for many users
 *   - CAPI runs server-to-server — no browser involved, can't be blocked
 *   - Meta's optimization algorithm gets stronger when both signals match
 *
 * Configuration:
 *   META_PIXEL_ID                  — same as VITE_META_PIXEL_ID
 *   META_CAPI_ACCESS_TOKEN         — long-lived token from Events Manager
 *   META_CAPI_TEST_EVENT_CODE      — optional, surfaces events in Test Events tab
 *   META_GRAPH_API_VERSION         — optional, defaults to v18.0
 */

import crypto from 'crypto';

export interface CapiLeadEvent {
  eventId: string;
  eventTime?: number; // unix seconds, defaults to now
  sourceUrl?: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  ipAddress?: string;
  userAgent?: string;
  fbp?: string; // _fbp cookie
  fbc?: string; // _fbc cookie (click id)
  customData?: Record<string, unknown>;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function hashIfPresent(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return sha256(value);
}

function normalisePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  return phone.replace(/[^0-9]/g, '');
}

export class MetaCapiService {
  private get pixelId(): string | undefined {
    return process.env.META_PIXEL_ID;
  }

  private get accessToken(): string | undefined {
    return process.env.META_CAPI_ACCESS_TOKEN;
  }

  private get graphVersion(): string {
    return process.env.META_GRAPH_API_VERSION ?? 'v18.0';
  }

  isConfigured(): boolean {
    return Boolean(this.pixelId && this.accessToken);
  }

  /**
   * Fire a "Lead" event server-side. Designed to be fire-and-forget — caller
   * should NOT await this on the critical path (e.g. don't make a form
   * submission wait for Meta's response).
   */
  async sendLeadEvent(event: CapiLeadEvent): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }

    const userData: Record<string, unknown> = {};
    if (event.email) userData.em = [hashIfPresent(event.email)];
    const phone = normalisePhone(event.phone);
    if (phone) userData.ph = [hashIfPresent(phone)];
    if (event.firstName) userData.fn = [hashIfPresent(event.firstName)];
    if (event.lastName) userData.ln = [hashIfPresent(event.lastName)];
    if (event.city) userData.ct = [hashIfPresent(event.city)];
    if (event.state) userData.st = [hashIfPresent(event.state)];
    if (event.zip) userData.zp = [hashIfPresent(event.zip)];
    if (event.country) userData.country = [hashIfPresent(event.country)];
    if (event.ipAddress) userData.client_ip_address = event.ipAddress;
    if (event.userAgent) userData.client_user_agent = event.userAgent;
    if (event.fbp) userData.fbp = event.fbp;
    if (event.fbc) userData.fbc = event.fbc;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: 'Lead',
          event_time: event.eventTime ?? Math.floor(Date.now() / 1000),
          event_id: event.eventId,
          action_source: 'website',
          event_source_url: event.sourceUrl,
          user_data: userData,
          custom_data: {
            currency: 'INR',
            value: 0,
            content_name: 'MyLeadX Demo Lead',
            ...(event.customData ?? {}),
          },
        },
      ],
    };

    const testCode = process.env.META_CAPI_TEST_EVENT_CODE;
    if (testCode) {
      (payload as Record<string, unknown>).test_event_code = testCode;
    }

    const url = `https://graph.facebook.com/${this.graphVersion}/${this.pixelId}/events?access_token=${this.accessToken}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`[MetaCAPI] Lead event failed (${response.status}):`, text);
      } else if (process.env.META_CAPI_VERBOSE === 'true') {
        const body = await response.json();
        console.log('[MetaCAPI] Lead event accepted:', body);
      }
    } catch (error) {
      console.error('[MetaCAPI] Lead event error:', (error as Error).message);
    }
  }
}

export const metaCapiService = new MetaCapiService();
