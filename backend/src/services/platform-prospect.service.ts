/**
 * Platform Prospect Service — SaaS sales for MyLeadX
 *
 * Handles prospects/leads for SMARTGROW INFOTECH selling MyLeadX subscriptions
 * to new businesses. Completely separate from tenant-level Lead service.
 */

import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import {
  ProspectSource,
  ProspectStage,
  ProspectActivityType,
  Prisma,
} from '@prisma/client';
import { resendService } from './resend.service';
import { metaCapiService } from './meta-capi.service';

const PROSPECT_SOURCE_LABELS: Record<ProspectSource, string> = {
  META_LEAD_AD: 'Meta Lead Ad',
  META_LANDING_PAGE: 'Meta Landing Page',
  GOOGLE_LEAD_FORM: 'Google Lead Form',
  GOOGLE_ADS_LANDING: 'Google Ads',
  LINKEDIN_LEAD_GEN: 'LinkedIn',
  TIKTOK_LEAD_GEN: 'TikTok',
  TWITTER_LEAD_GEN: 'Twitter / X',
  YOUTUBE_LEAD_GEN: 'YouTube',
  ORGANIC: 'Organic',
  DIRECT: 'Direct',
  REFERRAL: 'Referral',
  MANUAL: 'Manual Entry',
  EMAIL_CAMPAIGN: 'Email Campaign',
  WEBINAR: 'Webinar',
  EVENT: 'Event',
  PARTNER: 'Partner',
  COLD_OUTREACH: 'Cold Outreach',
  OTHER: 'Other',
};

export interface CreateProspectInput {
  fullName: string;
  email: string;
  phone: string;
  companyName?: string;
  designation?: string;
  teamSize?: string;
  industry?: string;
  currentCrm?: string;

  source: ProspectSource;
  campaign?: string;
  medium?: string;
  utmContent?: string;
  utmTerm?: string;
  adId?: string;
  adName?: string;
  landingPageId?: string;
  referrerUrl?: string;

  referrerName?: string;
  referrerProspectId?: string;
  eventName?: string;

  ipAddress?: string;
  userAgent?: string;
  rawData?: Record<string, unknown>;

  // Meta CAPI dedup signals — passed through from the public landing page
  metaEventId?: string;
  metaFbp?: string;
  metaFbc?: string;
  pageUrl?: string;
}

export interface UpdateProspectInput {
  fullName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  designation?: string;
  teamSize?: string;
  industry?: string;
  currentCrm?: string;
  stage?: ProspectStage;
  score?: number;
  lostReason?: string;
  assignedToId?: string | null;
}

export interface ListProspectsFilters {
  source?: ProspectSource;
  stage?: ProspectStage;
  assignedToId?: string;
  search?: string;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  pageSize?: number;
}

export class PlatformProspectService {
  /**
   * Create a new prospect. Dedupes on email/phone — returns existing if match found.
   */
  async create(input: CreateProspectInput) {
    const existing = await this.findDuplicate(input.email, input.phone);
    if (existing) {
      await prisma.prospectAttribution.create({
        data: {
          prospectId: existing.id,
          touchpointType: 'ASSIST',
          source: input.source,
          campaign: input.campaign,
          medium: input.medium,
        },
      });
      return { prospect: existing, isDuplicate: true };
    }

    const prospect = await prisma.platformProspect.create({
      data: {
        fullName: input.fullName,
        email: input.email.toLowerCase().trim(),
        phone: input.phone.trim(),
        companyName: input.companyName,
        designation: input.designation,
        teamSize: input.teamSize,
        industry: input.industry,
        currentCrm: input.currentCrm,
        source: input.source,
        campaign: input.campaign,
        medium: input.medium,
        utmContent: input.utmContent,
        utmTerm: input.utmTerm,
        adId: input.adId,
        adName: input.adName,
        landingPageId: input.landingPageId,
        referrerUrl: input.referrerUrl,
        referrerName: input.referrerName,
        referrerProspectId: input.referrerProspectId,
        eventName: input.eventName,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        rawData: (input.rawData ?? {}) as Prisma.InputJsonValue,
        stageHistory: [
          {
            from: null,
            to: 'NEW',
            at: new Date().toISOString(),
            reason: 'Created',
          },
        ] as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.prospectAttribution.create({
      data: {
        prospectId: prospect.id,
        touchpointType: 'FIRST_TOUCH',
        source: input.source,
        campaign: input.campaign,
        medium: input.medium,
      },
    });

    // Fire-and-forget notification — don't block form submission if email fails
    this.notifyNewProspect(prospect.id).catch((err) => {
      console.error('[PlatformProspect] notification failed:', err.message);
    });

    // Fire-and-forget Meta CAPI Lead event — no-op if META_CAPI_ACCESS_TOKEN unset
    if (input.metaEventId && metaCapiService.isConfigured()) {
      const [firstName, ...rest] = input.fullName.split(' ');
      metaCapiService
        .sendLeadEvent({
          eventId: input.metaEventId,
          email: input.email,
          phone: input.phone,
          firstName,
          lastName: rest.join(' '),
          country: 'IN',
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          fbp: input.metaFbp,
          fbc: input.metaFbc,
          sourceUrl: input.pageUrl,
          customData: {
            source: input.source,
            campaign: input.campaign,
            company_name: input.companyName,
          },
        })
        .catch((err) => {
          console.error('[PlatformProspect] CAPI failed:', err.message);
        });
    }

    return { prospect, isDuplicate: false };
  }

  /**
   * Email super admins about a new platform prospect.
   * Triggered on create() after the prospect is persisted.
   *
   * Recipients: env PLATFORM_SALES_NOTIFICATION_EMAILS (comma-separated)
   * if set, otherwise all active SuperAdmins in the super_admins table.
   */
  private async notifyNewProspect(prospectId: string) {
    const prospect = await prisma.platformProspect.findUnique({
      where: { id: prospectId },
    });
    if (!prospect) return;

    const recipients = await this.notificationRecipients();
    if (recipients.length === 0) return;

    const sourceLabel = PROSPECT_SOURCE_LABELS[prospect.source] ?? prospect.source;
    const baseUrl = process.env.FRONTEND_URL ?? process.env.PUBLIC_APP_URL ?? 'http://localhost:5173';
    const detailUrl = `${baseUrl}/super-admin/prospects/${prospect.id}`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937;">
        <h2 style="color: #06b6d4; margin: 0 0 16px;">🎯 New MyLeadX Prospect</h2>
        <p style="margin: 0 0 16px;">A new lead just submitted the form. Details below:</p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
          <tr><td style="padding: 6px 0; color: #6b7280;">Name</td><td style="padding: 6px 0; font-weight: 600;">${escapeHtml(prospect.fullName)}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td style="padding: 6px 0;"><a href="mailto:${escapeHtml(prospect.email)}">${escapeHtml(prospect.email)}</a></td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Phone</td><td style="padding: 6px 0;">${escapeHtml(prospect.phone)}</td></tr>
          ${prospect.companyName ? `<tr><td style="padding: 6px 0; color: #6b7280;">Company</td><td style="padding: 6px 0;">${escapeHtml(prospect.companyName)}</td></tr>` : ''}
          ${prospect.designation ? `<tr><td style="padding: 6px 0; color: #6b7280;">Role</td><td style="padding: 6px 0;">${escapeHtml(prospect.designation)}</td></tr>` : ''}
          ${prospect.teamSize ? `<tr><td style="padding: 6px 0; color: #6b7280;">Team Size</td><td style="padding: 6px 0;">${escapeHtml(prospect.teamSize)}</td></tr>` : ''}
          ${prospect.industry ? `<tr><td style="padding: 6px 0; color: #6b7280;">Industry</td><td style="padding: 6px 0;">${escapeHtml(prospect.industry)}</td></tr>` : ''}
          <tr><td style="padding: 6px 0; color: #6b7280;">Source</td><td style="padding: 6px 0;">${escapeHtml(sourceLabel)}</td></tr>
          ${prospect.campaign ? `<tr><td style="padding: 6px 0; color: #6b7280;">Campaign</td><td style="padding: 6px 0;">${escapeHtml(prospect.campaign)}</td></tr>` : ''}
        </table>
        <a href="${detailUrl}" style="display: inline-block; padding: 10px 20px; background: #06b6d4; color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">Open Prospect →</a>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">SLA: respond within 5 minutes for highest conversion. MyLeadX Platform Sales.</p>
      </div>
    `;

    const body = `New MyLeadX prospect: ${prospect.fullName} (${prospect.email}, ${prospect.phone}) from ${sourceLabel}${prospect.campaign ? ` / ${prospect.campaign}` : ''}.\n\nOpen: ${detailUrl}`;

    await Promise.allSettled(
      recipients.map((to) =>
        resendService.sendEmail({
          to,
          subject: `🎯 New Prospect: ${prospect.fullName}${prospect.companyName ? ` (${prospect.companyName})` : ''}`,
          body,
          html,
        }),
      ),
    );
  }

  private async notificationRecipients(): Promise<string[]> {
    const fromEnv = process.env.PLATFORM_SALES_NOTIFICATION_EMAILS;
    if (fromEnv) {
      return fromEnv
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.includes('@'));
    }
    const admins = await prisma.superAdmin.findMany({
      where: { isActive: true },
      select: { email: true },
    });
    return admins.map((a) => a.email);
  }

  /**
   * Look up existing prospect by email or phone for deduplication.
   */
  async findDuplicate(email: string, phone: string) {
    return prisma.platformProspect.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase().trim() },
          { phone: phone.trim() },
        ],
      },
    });
  }

  async findAll(filters: ListProspectsFilters = {}) {
    const page = filters.page ?? 1;
    const pageSize = Math.min(filters.pageSize ?? 25, 100);

    const where: Prisma.PlatformProspectWhereInput = {};
    if (filters.source) where.source = filters.source;
    if (filters.stage) where.stage = filters.stage;
    if (filters.assignedToId) where.assignedToId = filters.assignedToId;
    if (filters.fromDate || filters.toDate) {
      where.createdAt = {};
      if (filters.fromDate) where.createdAt.gte = filters.fromDate;
      if (filters.toDate) where.createdAt.lte = filters.toDate;
    }
    if (filters.search) {
      where.OR = [
        { fullName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search } },
        { companyName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.platformProspect.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          assignedTo: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      prisma.platformProspect.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findById(id: string) {
    const prospect = await prisma.platformProspect.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        organization: {
          select: { id: true, name: true, slug: true },
        },
        demos: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            host: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        attributions: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });

    if (!prospect) {
      throw new NotFoundError('Prospect not found');
    }

    return prospect;
  }

  async update(id: string, input: UpdateProspectInput, actorUserId: string) {
    const current = await prisma.platformProspect.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Prospect not found');

    const updateData: Prisma.PlatformProspectUpdateInput = {};
    if (input.fullName !== undefined) updateData.fullName = input.fullName;
    if (input.email !== undefined) updateData.email = input.email.toLowerCase().trim();
    if (input.phone !== undefined) updateData.phone = input.phone.trim();
    if (input.companyName !== undefined) updateData.companyName = input.companyName;
    if (input.designation !== undefined) updateData.designation = input.designation;
    if (input.teamSize !== undefined) updateData.teamSize = input.teamSize;
    if (input.industry !== undefined) updateData.industry = input.industry;
    if (input.currentCrm !== undefined) updateData.currentCrm = input.currentCrm;
    if (input.score !== undefined) updateData.score = input.score;
    if (input.lostReason !== undefined) updateData.lostReason = input.lostReason;

    if (input.stage !== undefined && input.stage !== current.stage) {
      return this.changeStage(id, input.stage, actorUserId, input.lostReason);
    }

    if (input.assignedToId !== undefined && input.assignedToId !== current.assignedToId) {
      return this.assignTo(id, input.assignedToId, actorUserId);
    }

    return prisma.platformProspect.update({ where: { id }, data: updateData });
  }

  async changeStage(
    id: string,
    newStage: ProspectStage,
    actorUserId: string,
    reason?: string,
  ) {
    const current = await prisma.platformProspect.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Prospect not found');
    if (current.stage === newStage) return current;

    const history = (current.stageHistory as unknown as Array<Record<string, unknown>>) ?? [];
    history.push({
      from: current.stage,
      to: newStage,
      at: new Date().toISOString(),
      by: actorUserId,
      reason: reason ?? null,
    });

    const updateData: Prisma.PlatformProspectUpdateInput = {
      stage: newStage,
      stageHistory: history as unknown as Prisma.InputJsonValue,
    };

    if (newStage === 'DEMO_SCHEDULED' && !current.demoScheduledAt) {
      updateData.demoScheduledAt = new Date();
    }
    if (newStage === 'TRIAL_STARTED' && !current.trialStartedAt) {
      updateData.trialStartedAt = new Date();
    }
    if (newStage === 'CONVERTED' && !current.convertedAt) {
      updateData.convertedAt = new Date();
    }
    if (newStage === 'LOST' && !current.lostAt) {
      updateData.lostAt = new Date();
      if (reason) updateData.lostReason = reason;
    }

    const [updated] = await prisma.$transaction([
      prisma.platformProspect.update({ where: { id }, data: updateData }),
      prisma.prospectActivity.create({
        data: {
          prospectId: id,
          userId: actorUserId,
          type: ProspectActivityType.STAGE_CHANGE,
          fromStage: current.stage,
          toStage: newStage,
          noteContent: reason ?? null,
        },
      }),
    ]);

    return updated;
  }

  async assignTo(id: string, userId: string | null, actorUserId: string) {
    const current = await prisma.platformProspect.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Prospect not found');

    const [updated] = await prisma.$transaction([
      prisma.platformProspect.update({
        where: { id },
        data: {
          assignedToId: userId,
          assignedAt: userId ? new Date() : null,
        },
      }),
      prisma.prospectActivity.create({
        data: {
          prospectId: id,
          userId: actorUserId,
          type: ProspectActivityType.ASSIGNMENT_CHANGE,
          metadata: {
            fromUserId: current.assignedToId,
            toUserId: userId,
          } as unknown as Prisma.InputJsonValue,
        },
      }),
    ]);

    return updated;
  }

  async logActivity(
    prospectId: string,
    userId: string,
    type: ProspectActivityType,
    data: Partial<{
      callDurationSeconds: number;
      callRecordingUrl: string;
      callOutcome: string;
      emailSubject: string;
      emailBody: string;
      emailDirection: string;
      noteContent: string;
      taskTitle: string;
      taskDueDate: Date;
      taskCompleted: boolean;
      metadata: Record<string, unknown>;
    }> = {},
  ) {
    const prospect = await prisma.platformProspect.findUnique({ where: { id: prospectId } });
    if (!prospect) throw new NotFoundError('Prospect not found');

    return prisma.prospectActivity.create({
      data: {
        prospectId,
        userId,
        type,
        callDurationSeconds: data.callDurationSeconds,
        callRecordingUrl: data.callRecordingUrl,
        callOutcome: data.callOutcome,
        emailSubject: data.emailSubject,
        emailBody: data.emailBody,
        emailDirection: data.emailDirection,
        noteContent: data.noteContent,
        taskTitle: data.taskTitle,
        taskDueDate: data.taskDueDate,
        taskCompleted: data.taskCompleted ?? false,
        metadata: (data.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  async delete(id: string) {
    const existing = await prisma.platformProspect.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Prospect not found');
    await prisma.platformProspect.delete({ where: { id } });
  }

  /**
   * Users in the platform org who can be assigned prospects.
   * Used to populate the assignment dropdown on the prospects list.
   */
  async assignableUsers() {
    const org = await prisma.organization.findUnique({
      where: { slug: 'smartgrow-info-tech' },
    });
    if (!org) return [];
    return prisma.user.findMany({
      where: { organizationId: org.id, isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: { select: { name: true, slug: true } },
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /**
   * Pipeline summary — counts of prospects per stage, used by Kanban view.
   */
  async pipelineSummary() {
    const grouped = await prisma.platformProspect.groupBy({
      by: ['stage'],
      _count: { _all: true },
    });

    const summary: Record<string, number> = {};
    for (const row of grouped) {
      summary[row.stage] = row._count._all;
    }
    return summary;
  }

  /**
   * Per-source breakdown for marketing analytics.
   */
  async sourceBreakdown(fromDate?: Date, toDate?: Date) {
    const where: Prisma.PlatformProspectWhereInput = {};
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    return prisma.platformProspect.groupBy({
      by: ['source'],
      where,
      _count: { _all: true },
    });
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const platformProspectService = new PlatformProspectService();
