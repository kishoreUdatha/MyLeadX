/**
 * Trial Management Service
 * Handles trial tracking, reminders, and expiry management
 */

import { prisma } from '../config/database';
import { resendService } from './resend.service';

export interface TrialOrganization {
  id: string;
  name: string;
  slug: string;
  email: string;
  contactPerson: string | null;
  trialEndsAt: Date | null;
  daysRemaining: number;
  subscriptionStatus: string | null;
  createdAt: Date;
  usersCount: number;
  leadsCount: number;
}

export interface TrialStats {
  totalTrials: number;
  expiringIn7Days: number;
  expiringIn3Days: number;
  expiringToday: number;
  expiredNotConverted: number;
  convertedThisMonth: number;
  conversionRate: number;
}

class TrialManagementService {
  /**
   * Get trial statistics overview
   */
  async getTrialStats(): Promise<TrialStats> {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalTrials,
      expiringIn7Days,
      expiringIn3Days,
      expiringToday,
      expiredNotConverted,
      convertedThisMonth,
      totalTrialEver,
    ] = await Promise.all([
      // Active trials
      prisma.organization.count({
        where: { subscriptionStatus: 'TRIAL' },
      }),
      // Expiring in 7 days
      prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: { lte: in7Days, gt: now },
        },
      }),
      // Expiring in 3 days
      prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: { lte: in3Days, gt: now },
        },
      }),
      // Expiring today
      prisma.organization.count({
        where: {
          subscriptionStatus: 'TRIAL',
          trialEndsAt: { lte: in1Day, gt: now },
        },
      }),
      // Expired but not converted
      prisma.organization.count({
        where: {
          subscriptionStatus: { in: ['EXPIRED', 'TRIAL'] },
          trialEndsAt: { lt: now },
        },
      }),
      // Converted this month (was trial, now active)
      prisma.organization.count({
        where: {
          subscriptionStatus: 'ACTIVE',
          updatedAt: { gte: startOfMonth },
          trialEndsAt: { not: null },
        },
      }),
      // Total organizations that had trial
      prisma.organization.count({
        where: { trialEndsAt: { not: null } },
      }),
    ]);

    const conversionRate = totalTrialEver > 0
      ? Math.round((convertedThisMonth / totalTrialEver) * 100 * 10) / 10
      : 0;

    return {
      totalTrials,
      expiringIn7Days,
      expiringIn3Days,
      expiringToday,
      expiredNotConverted,
      convertedThisMonth,
      conversionRate,
    };
  }

  /**
   * Get all trial organizations with pagination
   */
  async getTrialOrganizations(params: {
    page?: number;
    limit?: number;
    filter?: 'all' | 'expiring_soon' | 'expired' | 'active';
    search?: string;
    sortBy?: 'daysRemaining' | 'createdAt' | 'name';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ data: TrialOrganization[]; total: number; pagination: any }> {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build where clause
    const where: any = {};

    switch (params.filter) {
      case 'expiring_soon':
        where.subscriptionStatus = 'TRIAL';
        where.trialEndsAt = { lte: in7Days, gt: now };
        break;
      case 'expired':
        where.OR = [
          { subscriptionStatus: 'EXPIRED' },
          { subscriptionStatus: 'TRIAL', trialEndsAt: { lt: now } },
        ];
        break;
      case 'active':
        where.subscriptionStatus = 'TRIAL';
        where.trialEndsAt = { gt: now };
        break;
      default:
        where.OR = [
          { subscriptionStatus: 'TRIAL' },
          { subscriptionStatus: 'EXPIRED', trialEndsAt: { not: null } },
        ];
    }

    if (params.search) {
      where.AND = [
        {
          OR: [
            { name: { contains: params.search, mode: 'insensitive' } },
            { email: { contains: params.search, mode: 'insensitive' } },
            { slug: { contains: params.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // Determine sort order
    let orderBy: any = { trialEndsAt: 'asc' };
    if (params.sortBy === 'createdAt') {
      orderBy = { createdAt: params.sortOrder || 'desc' };
    } else if (params.sortBy === 'name') {
      orderBy = { name: params.sortOrder || 'asc' };
    }

    const [organizations, total] = await Promise.all([
      prisma.organization.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          email: true,
          contactPerson: true,
          trialEndsAt: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: {
            select: {
              users: true,
              leads: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.organization.count({ where }),
    ]);

    const data: TrialOrganization[] = organizations.map(org => {
      const daysRemaining = org.trialEndsAt
        ? Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        email: org.email,
        contactPerson: org.contactPerson,
        trialEndsAt: org.trialEndsAt,
        daysRemaining: Math.max(daysRemaining, 0),
        subscriptionStatus: org.subscriptionStatus,
        createdAt: org.createdAt,
        usersCount: org._count.users,
        leadsCount: org._count.leads,
      };
    });

    return {
      data,
      total,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Send trial reminder email
   */
  async sendTrialReminder(
    organizationId: string,
    reminderType: '7_days' | '3_days' | '1_day' | 'expired'
  ): Promise<boolean> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        users: {
          where: { role: { slug: { in: ['org_admin', 'admin', 'owner'] } } },
          take: 1,
        },
      },
    });

    if (!org) return false;

    const recipientEmail = org.users[0]?.email || org.email;
    const recipientName = org.users[0]?.firstName || org.contactPerson || org.name;

    const subjects: Record<string, string> = {
      '7_days': `Your trial expires in 7 days - ${org.name}`,
      '3_days': `Only 3 days left in your trial - ${org.name}`,
      '1_day': `Last day of your trial - Upgrade now!`,
      'expired': `Your trial has expired - ${org.name}`,
    };

    const daysLeft = org.trialEndsAt
      ? Math.max(0, Math.ceil((org.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : 0;

    const htmlContent = this.generateReminderEmail(reminderType, {
      orgName: org.name,
      recipientName,
      daysLeft,
      trialEndsAt: org.trialEndsAt,
    });

    try {
      await resendService.sendEmail({
        to: recipientEmail,
        subject: subjects[reminderType],
        body: `Trial ${reminderType} reminder for ${org.name}`,
        html: htmlContent,
      });

      // Log the reminder
      console.log(`[TrialReminder] Sent ${reminderType} reminder to ${recipientEmail} for org ${org.name}`);

      return true;
    } catch (error) {
      console.error(`[TrialReminder] Failed to send reminder to ${recipientEmail}:`, error);
      return false;
    }
  }

  /**
   * Process all trial reminders (called by scheduled job)
   */
  async processTrialReminders(): Promise<{
    sent7Days: number;
    sent3Days: number;
    sent1Day: number;
    sentExpired: number;
    errors: number;
  }> {
    const now = new Date();
    const results = { sent7Days: 0, sent3Days: 0, sent1Day: 0, sentExpired: 0, errors: 0 };

    // Get date ranges
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in7DaysStart = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const in3DaysStart = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const in1Day = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find organizations expiring in ~7 days (between 6-7 days)
    const expiring7Days = await prisma.organization.findMany({
      where: {
        subscriptionStatus: 'TRIAL',
        trialEndsAt: { gte: in7DaysStart, lt: in7Days },
      },
      select: { id: true },
    });

    for (const org of expiring7Days) {
      const sent = await this.sendTrialReminder(org.id, '7_days');
      sent ? results.sent7Days++ : results.errors++;
    }

    // Find organizations expiring in ~3 days
    const expiring3Days = await prisma.organization.findMany({
      where: {
        subscriptionStatus: 'TRIAL',
        trialEndsAt: { gte: in3DaysStart, lt: in3Days },
      },
      select: { id: true },
    });

    for (const org of expiring3Days) {
      const sent = await this.sendTrialReminder(org.id, '3_days');
      sent ? results.sent3Days++ : results.errors++;
    }

    // Find organizations expiring in ~1 day
    const expiring1Day = await prisma.organization.findMany({
      where: {
        subscriptionStatus: 'TRIAL',
        trialEndsAt: { gte: now, lt: in1Day },
      },
      select: { id: true },
    });

    for (const org of expiring1Day) {
      const sent = await this.sendTrialReminder(org.id, '1_day');
      sent ? results.sent1Day++ : results.errors++;
    }

    // Find expired trials that haven't been notified yet
    // Also catch organizations with trialEndsAt set but wrong status (data inconsistency)
    const justExpired = await prisma.organization.findMany({
      where: {
        OR: [
          { subscriptionStatus: 'TRIAL', trialEndsAt: { lt: now } },
          { subscriptionStatus: 'ACTIVE', trialEndsAt: { lt: now, not: null } },
        ],
      },
      select: { id: true },
    });

    for (const org of justExpired) {
      const sent = await this.sendTrialReminder(org.id, 'expired');
      if (sent) {
        results.sentExpired++;
        // Update status to EXPIRED
        await this.handleExpiredTrial(org.id);
      } else {
        results.errors++;
      }
    }

    console.log(`[TrialReminder] Processed: 7-day=${results.sent7Days}, 3-day=${results.sent3Days}, 1-day=${results.sent1Day}, expired=${results.sentExpired}, errors=${results.errors}`);

    return results;
  }

  /**
   * Handle expired trial - downgrade or suspend
   */
  async handleExpiredTrial(organizationId: string): Promise<void> {
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        subscriptionStatus: 'EXPIRED',
        activePlanId: 'free', // Downgrade to free plan
      },
    });

    console.log(`[TrialExpiry] Organization ${organizationId} trial expired, downgraded to free plan`);
  }

  /**
   * Extend trial for an organization
   */
  async extendTrial(
    organizationId: string,
    days: number,
    reason: string,
    actorId?: string
  ): Promise<{ success: boolean; newTrialEndsAt: Date }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error('Organization not found');
    }

    const currentEnd = org.trialEndsAt || new Date();
    const newTrialEndsAt = new Date(Math.max(currentEnd.getTime(), Date.now()) + days * 24 * 60 * 60 * 1000);

    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        trialEndsAt: newTrialEndsAt,
        subscriptionStatus: 'TRIAL',
      },
    });

    // Log the extension
    console.log(`[TrialManagement] Extended trial for org ${organizationId} by ${days} days. Reason: ${reason}`);

    return { success: true, newTrialEndsAt };
  }

  /**
   * Get trial conversion funnel data
   */
  async getConversionFunnel(months: number = 3): Promise<any[]> {
    const data = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const [started, converted, expired] = await Promise.all([
        // Trials started this month
        prisma.organization.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
            trialEndsAt: { not: null },
          },
        }),
        // Converted to paid this month
        prisma.organization.count({
          where: {
            subscriptionStatus: 'ACTIVE',
            trialEndsAt: { not: null },
            updatedAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
        // Expired this month
        prisma.organization.count({
          where: {
            subscriptionStatus: { in: ['EXPIRED', 'CANCELLED'] },
            trialEndsAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);

      data.push({
        month: startOfMonth.toLocaleString('default', { month: 'short' }),
        year: startOfMonth.getFullYear(),
        trialsStarted: started,
        converted,
        expired,
        conversionRate: started > 0 ? Math.round((converted / started) * 100) : 0,
      });
    }

    return data;
  }

  /**
   * Generate reminder email HTML
   */
  private generateReminderEmail(
    type: string,
    data: { orgName: string; recipientName: string; daysLeft: number; trialEndsAt: Date | null }
  ): string {
    const upgradeUrl = `${process.env.FRONTEND_URL || 'https://app.voicebridge.io'}/settings/billing`;

    const templates: Record<string, string> = {
      '7_days': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Your Trial Ends in 7 Days</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your free trial for <strong>${data.orgName}</strong> will expire on <strong>${data.trialEndsAt?.toLocaleDateString()}</strong>.</p>
          <p>Don't lose access to these features:</p>
          <ul>
            <li>AI Voice Agents</li>
            <li>Lead Management</li>
            <li>Automated Follow-ups</li>
            <li>Analytics & Reports</li>
          </ul>
          <p style="margin: 30px 0;">
            <a href="${upgradeUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Upgrade Now
            </a>
          </p>
          <p>Questions? Reply to this email or contact our support team.</p>
        </div>
      `,
      '3_days': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #F59E0B;">Only 3 Days Left!</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your trial for <strong>${data.orgName}</strong> expires in just <strong>3 days</strong>.</p>
          <p>Upgrade now to keep your data and continue using all features without interruption.</p>
          <p style="margin: 30px 0;">
            <a href="${upgradeUrl}" style="background: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Upgrade Before It's Too Late
            </a>
          </p>
        </div>
      `,
      '1_day': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #EF4444;">Last Day of Your Trial!</h2>
          <p>Hi ${data.recipientName},</p>
          <p><strong>Your trial expires TODAY!</strong></p>
          <p>After expiration, your account will be limited to the free plan. Upgrade now to maintain full access.</p>
          <p style="margin: 30px 0;">
            <a href="${upgradeUrl}" style="background: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Upgrade Now - Don't Lose Access
            </a>
          </p>
        </div>
      `,
      'expired': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6B7280;">Your Trial Has Expired</h2>
          <p>Hi ${data.recipientName},</p>
          <p>Your free trial for <strong>${data.orgName}</strong> has ended.</p>
          <p>Your account has been moved to the free plan with limited features. Upgrade anytime to restore full access.</p>
          <p style="margin: 30px 0;">
            <a href="${upgradeUrl}" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
              Upgrade to Premium
            </a>
          </p>
          <p>Your data is safe and will be available when you upgrade.</p>
        </div>
      `,
    };

    return templates[type] || templates['7_days'];
  }
}

export const trialManagementService = new TrialManagementService();
export default trialManagementService;
