import { prisma } from '../config/database';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

interface TrackingData {
  emailLogId: string;
  leadId?: string;
  campaignId?: string;
}

export class EmailTrackingService {
  private readonly secretKey: string;

  constructor() {
    // Use JWT secret for signing tracking tokens
    this.secretKey = config.jwt.secret;
  }

  /**
   * Generate a tracking token for email
   */
  generateTrackingToken(data: TrackingData): string {
    const payload = JSON.stringify(data);
    const signature = crypto
      .createHmac('sha256', this.secretKey)
      .update(payload)
      .digest('hex');

    // Create base64 encoded token
    const token = Buffer.from(JSON.stringify({ ...data, sig: signature })).toString('base64url');
    return token;
  }

  /**
   * Verify and decode tracking token
   */
  verifyTrackingToken(token: string): TrackingData | null {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
      const { sig, ...data } = decoded;

      // Verify signature
      const expectedSig = crypto
        .createHmac('sha256', this.secretKey)
        .update(JSON.stringify(data))
        .digest('hex');

      if (sig !== expectedSig) {
        return null;
      }

      return data as TrackingData;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate tracking pixel URL
   */
  getTrackingPixelUrl(emailLogId: string, leadId?: string, campaignId?: string): string {
    const token = this.generateTrackingToken({ emailLogId, leadId, campaignId });
    return `${config.baseUrl}/api/email-tracking/pixel/${token}.gif`;
  }

  /**
   * Generate tracked link URL
   */
  getTrackedLinkUrl(
    originalUrl: string,
    emailLogId: string,
    leadId?: string,
    campaignId?: string
  ): string {
    const token = this.generateTrackingToken({ emailLogId, leadId, campaignId });
    const encodedUrl = encodeURIComponent(originalUrl);
    return `${config.baseUrl}/api/email-tracking/click/${token}?url=${encodedUrl}`;
  }

  /**
   * Process all links in HTML to make them trackable
   */
  processHtmlForTracking(
    html: string,
    emailLogId: string,
    leadId?: string,
    campaignId?: string
  ): string {
    // Add tracking pixel at the end
    const trackingPixel = `<img src="${this.getTrackingPixelUrl(emailLogId, leadId, campaignId)}" width="1" height="1" alt="" style="display:none;" />`;

    // Replace links with tracked links
    const linkRegex = /<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi;
    const processedHtml = html.replace(linkRegex, (match, before, url, after) => {
      // Skip unsubscribe links and anchor links
      if (url.startsWith('#') || url.includes('unsubscribe')) {
        return match;
      }

      const trackedUrl = this.getTrackedLinkUrl(url, emailLogId, leadId, campaignId);
      return `<a ${before}href="${trackedUrl}"${after}>`;
    });

    // Add tracking pixel before closing body tag
    if (processedHtml.includes('</body>')) {
      return processedHtml.replace('</body>', `${trackingPixel}</body>`);
    }

    // If no body tag, append at the end
    return processedHtml + trackingPixel;
  }

  /**
   * Record email open event
   */
  async recordOpen(token: string, userAgent?: string, ip?: string): Promise<boolean> {
    const data = this.verifyTrackingToken(token);
    if (!data) return false;

    try {
      // Check if already opened
      const emailLog = await prisma.emailLog.findUnique({
        where: { id: data.emailLogId },
      });

      if (!emailLog) return false;

      // Update email log with open event
      await prisma.emailLog.update({
        where: { id: data.emailLogId },
        data: {
          status: 'READ',
          openedAt: emailLog.openedAt || new Date(), // Keep first open time
          metadata: {
            ...(emailLog.metadata as object || {}),
            opens: ((emailLog.metadata as any)?.opens || 0) + 1,
            lastOpenedAt: new Date().toISOString(),
            lastOpenUserAgent: userAgent,
            lastOpenIp: ip,
          },
        },
      });

      // Create tracking event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: data.emailLogId,
          eventType: 'OPEN',
          userAgent,
          ipAddress: ip,
        },
      });

      return true;
    } catch (error) {
      console.error('Error recording email open:', error);
      return false;
    }
  }

  /**
   * Record email click event
   */
  async recordClick(
    token: string,
    url: string,
    userAgent?: string,
    ip?: string
  ): Promise<boolean> {
    const data = this.verifyTrackingToken(token);
    if (!data) return false;

    try {
      const emailLog = await prisma.emailLog.findUnique({
        where: { id: data.emailLogId },
      });

      if (!emailLog) return false;

      // Update email log with click event
      const clicks = (emailLog.metadata as any)?.clicks || [];
      clicks.push({
        url,
        timestamp: new Date().toISOString(),
        userAgent,
        ip,
      });

      await prisma.emailLog.update({
        where: { id: data.emailLogId },
        data: {
          status: 'READ',
          clickedAt: emailLog.clickedAt || new Date(), // Keep first click time
          metadata: {
            ...(emailLog.metadata as object || {}),
            clicks,
            totalClicks: clicks.length,
          },
        },
      });

      // Create tracking event
      await prisma.emailTrackingEvent.create({
        data: {
          emailLogId: data.emailLogId,
          eventType: 'CLICK',
          url,
          userAgent,
          ipAddress: ip,
        },
      });

      return true;
    } catch (error) {
      console.error('Error recording email click:', error);
      return false;
    }
  }

  /**
   * Get email tracking stats
   */
  async getEmailStats(emailLogId: string) {
    const emailLog = await prisma.emailLog.findUnique({
      where: { id: emailLogId },
      include: {
        trackingEvents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!emailLog) return null;

    const events = emailLog.trackingEvents || [];
    const opens = events.filter(e => e.eventType === 'OPEN');
    const clicks = events.filter(e => e.eventType === 'CLICK');

    return {
      emailLogId,
      status: emailLog.status,
      sentAt: emailLog.sentAt,
      openedAt: emailLog.openedAt,
      clickedAt: emailLog.clickedAt,
      totalOpens: opens.length,
      totalClicks: clicks.length,
      uniqueClicks: new Set(clicks.map(c => c.url)).size,
      events: events.slice(0, 50), // Last 50 events
    };
  }

  /**
   * Get campaign tracking stats
   */
  async getCampaignStats(campaignId: string) {
    const [totalSent, opened, clicked, events] = await Promise.all([
      prisma.emailLog.count({
        where: { campaignId },
      }),
      prisma.emailLog.count({
        where: { campaignId, openedAt: { not: null } },
      }),
      prisma.emailLog.count({
        where: { campaignId, clickedAt: { not: null } },
      }),
      prisma.emailTrackingEvent.findMany({
        where: { emailLog: { campaignId } },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    return {
      campaignId,
      totalSent,
      opened,
      clicked,
      openRate: totalSent > 0 ? ((opened / totalSent) * 100).toFixed(2) : 0,
      clickRate: totalSent > 0 ? ((clicked / totalSent) * 100).toFixed(2) : 0,
      clickToOpenRate: opened > 0 ? ((clicked / opened) * 100).toFixed(2) : 0,
      recentEvents: events,
    };
  }
}

export const emailTrackingService = new EmailTrackingService();
