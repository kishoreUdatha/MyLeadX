/**
 * Google Ads Enhanced Conversions for Leads (server-side)
 *
 * Server-to-server reporting of lead conversions back to Google Ads so the
 * bid algorithm learns from real outcomes. Equivalent of Meta CAPI.
 *
 * Two upload paths:
 *   1. ClickConversion (when we captured a gclid from the URL) — most
 *      precise attribution
 *   2. (Future) ConversionAdjustment with hashed user identifiers when
 *      there is no gclid — covers email/phone matching for offline /
 *      organic leads
 *
 * Auth: Google Ads API uses OAuth2 refresh-token flow + a developer
 * token + a customer (manager + login customer) id. Setup is more
 * involved than Meta's static access token but it's a one-time config.
 *
 * Configuration:
 *   GOOGLE_ADS_DEVELOPER_TOKEN     — from Google Ads API Center
 *   GOOGLE_ADS_CLIENT_ID           — OAuth client id
 *   GOOGLE_ADS_CLIENT_SECRET       — OAuth client secret
 *   GOOGLE_ADS_REFRESH_TOKEN       — long-lived refresh token (oauth playground)
 *   GOOGLE_ADS_CUSTOMER_ID         — 10-digit Google Ads account id
 *                                    (no dashes — e.g. 1234567890)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID   — manager account id (optional)
 *   GOOGLE_ADS_CONVERSION_ACTION_ID — numeric id of the Conversion Action
 *                                    you defined for "MyLeadX Demo Lead"
 *   GOOGLE_ADS_API_VERSION         — defaults to v15
 */

import crypto from 'crypto';

export interface ClickConversionInput {
  gclid: string;
  email?: string;
  phone?: string;
  conversionDateTime?: string; // 'yyyy-MM-dd HH:mm:ss+HH:MM'
  conversionValue?: number;
  currencyCode?: string;
  orderId?: string;
}

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

function normalisePhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  // E.164 required by Google
  const cleaned = phone.replace(/[^0-9+]/g, '');
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

function nowFormatted(): string {
  // yyyy-MM-dd HH:mm:ss+offset — Google's required format
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // Use UTC to keep the offset predictable
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}+00:00`;
}

export class GoogleAdsCapiService {
  private cachedAccessToken: { token: string; expiresAt: number } | null = null;

  private get developerToken(): string | undefined {
    return process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  }
  private get clientId(): string | undefined {
    return process.env.GOOGLE_ADS_CLIENT_ID;
  }
  private get clientSecret(): string | undefined {
    return process.env.GOOGLE_ADS_CLIENT_SECRET;
  }
  private get refreshToken(): string | undefined {
    return process.env.GOOGLE_ADS_REFRESH_TOKEN;
  }
  private get customerId(): string | undefined {
    return process.env.GOOGLE_ADS_CUSTOMER_ID;
  }
  private get loginCustomerId(): string | undefined {
    return process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID;
  }
  private get conversionActionId(): string | undefined {
    return process.env.GOOGLE_ADS_CONVERSION_ACTION_ID;
  }
  private get apiVersion(): string {
    return process.env.GOOGLE_ADS_API_VERSION ?? 'v15';
  }

  isConfigured(): boolean {
    return Boolean(
      this.developerToken &&
        this.clientId &&
        this.clientSecret &&
        this.refreshToken &&
        this.customerId &&
        this.conversionActionId,
    );
  }

  /**
   * Exchange refresh_token for a short-lived access_token. Cached for
   * its lifetime (Google issues hour-long tokens).
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && this.cachedAccessToken.expiresAt > Date.now() + 60_000) {
      return this.cachedAccessToken.token;
    }

    const body = new URLSearchParams({
      client_id: this.clientId!,
      client_secret: this.clientSecret!,
      refresh_token: this.refreshToken!,
      grant_type: 'refresh_token',
    });

    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Google OAuth refresh failed: ${response.status} ${text}`);
    }
    const json = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedAccessToken = {
      token: json.access_token,
      expiresAt: Date.now() + json.expires_in * 1000,
    };
    return json.access_token;
  }

  /**
   * Upload a click conversion with optional Enhanced Conversion user
   * identifiers. Fire-and-forget — caller should not block on this.
   */
  async uploadClickConversion(input: ClickConversionInput): Promise<void> {
    if (!this.isConfigured()) {
      return;
    }
    if (!input.gclid) {
      // Without gclid, we'd need to use Conversion Adjustments — skipping
      // for now so we don't double-count.
      return;
    }

    try {
      const accessToken = await this.getAccessToken();
      const conversionAction = `customers/${this.customerId}/conversionActions/${this.conversionActionId}`;
      const phone = normalisePhone(input.phone);

      const userIdentifiers: Array<Record<string, unknown>> = [];
      if (input.email) {
        userIdentifiers.push({ hashedEmail: sha256(input.email) });
      }
      if (phone) {
        userIdentifiers.push({ hashedPhoneNumber: sha256(phone) });
      }

      const payload = {
        conversions: [
          {
            gclid: input.gclid,
            conversionAction,
            conversionDateTime: input.conversionDateTime ?? nowFormatted(),
            conversionValue: input.conversionValue ?? 0,
            currencyCode: input.currencyCode ?? 'INR',
            orderId: input.orderId,
            userIdentifiers: userIdentifiers.length > 0 ? userIdentifiers : undefined,
          },
        ],
        partialFailure: true,
      };

      const url = `https://googleads.googleapis.com/${this.apiVersion}/customers/${this.customerId}:uploadClickConversions`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'developer-token': this.developerToken!,
      };
      if (this.loginCustomerId) {
        headers['login-customer-id'] = this.loginCustomerId;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error(`[GoogleAdsCAPI] uploadClickConversion failed (${response.status}):`, text);
        return;
      }

      const json = (await response.json()) as {
        partialFailureError?: { message?: string };
      };
      if (json.partialFailureError?.message) {
        console.error('[GoogleAdsCAPI] Partial failure:', json.partialFailureError.message);
      } else if (process.env.GOOGLE_ADS_CAPI_VERBOSE === 'true') {
        console.log('[GoogleAdsCAPI] Click conversion uploaded:', json);
      }
    } catch (error) {
      console.error('[GoogleAdsCAPI] Error:', (error as Error).message);
    }
  }
}

export const googleAdsCapiService = new GoogleAdsCapiService();
