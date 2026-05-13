/**
 * Prospect Conversion Service
 *
 * Converts a PlatformProspect into a paying tenant by creating an
 * Organization + admin User + Subscription (trial), then linking the
 * prospect back to the new org for revenue attribution.
 *
 * Used when:
 *   1. Sales rep manually clicks "Convert to Trial" on the prospect detail page
 *   2. (Future) Prospect self-serves a trial signup from the marketing site
 *
 * Idempotent: if prospect already has organizationId, returns the existing
 * org without re-creating anything.
 */

import { prisma } from '../config/database';
import { NotFoundError, ValidationError } from '../utils/errors';
import { superAdminService } from './super-admin.service';
import { ProspectActivityType, ProspectStage, BillingCycle, SubscriptionStatus } from '@prisma/client';

export interface ConvertProspectInput {
  prospectId: string;
  actorUserId: string;
  planId?: string;
  trialDurationDays?: number;
  billingCycle?: BillingCycle;
}

export class ProspectConversionService {
  /**
   * Slugify a company name into a valid org slug.
   * Ensures uniqueness by appending a random suffix if needed.
   */
  private async generateUniqueSlug(companyName: string): Promise<string> {
    const base = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'tenant';

    let slug = base;
    let attempt = 0;
    while (attempt < 10) {
      const existing = await prisma.organization.findUnique({ where: { slug } });
      if (!existing) return slug;
      attempt += 1;
      slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
    }
    throw new Error('Failed to generate unique organization slug');
  }

  async convert(input: ConvertProspectInput) {
    const prospect = await prisma.platformProspect.findUnique({
      where: { id: input.prospectId },
    });

    if (!prospect) {
      throw new NotFoundError('Prospect not found');
    }

    if (prospect.organizationId) {
      const existingOrg = await prisma.organization.findUnique({
        where: { id: prospect.organizationId },
      });
      return {
        prospect,
        organization: existingOrg,
        alreadyConverted: true,
      };
    }

    if (!prospect.email || !prospect.fullName) {
      throw new ValidationError('Prospect must have email and fullName to be converted');
    }

    const existingUser = await prisma.user.findFirst({
      where: { email: prospect.email },
    });
    if (existingUser) {
      throw new ValidationError(
        `A user with email ${prospect.email} already exists. Link manually instead.`,
      );
    }

    const companyName = prospect.companyName || prospect.fullName;
    const slug = await this.generateUniqueSlug(companyName);

    const [firstName, ...rest] = prospect.fullName.split(' ');
    const lastName = rest.join(' ') || '—';

    const planId = input.planId || 'starter';
    const trialDays = input.trialDurationDays ?? 14;
    const billingCycle = input.billingCycle || BillingCycle.monthly;

    const created = await superAdminService.createOrganization({
      organizationName: companyName,
      slug,
      adminEmail: prospect.email,
      adminFirstName: firstName,
      adminLastName: lastName,
      planId,
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    const subscription = await prisma.subscription.create({
      data: {
        organizationId: created.organization.id,
        planId,
        billingCycle,
        userCount: 1,
        status: SubscriptionStatus.TRIAL,
        amount: 0,
        currency: 'INR',
      },
    });

    const [updatedProspect] = await prisma.$transaction([
      prisma.platformProspect.update({
        where: { id: prospect.id },
        data: {
          organizationId: created.organization.id,
          stage: ProspectStage.TRIAL_STARTED,
          trialStartedAt: new Date(),
        },
      }),
      prisma.prospectActivity.create({
        data: {
          prospectId: prospect.id,
          userId: input.actorUserId,
          type: ProspectActivityType.STAGE_CHANGE,
          fromStage: prospect.stage,
          toStage: ProspectStage.TRIAL_STARTED,
          noteContent: `Converted to trial tenant: ${companyName} (${slug}). Plan: ${planId}, trial ${trialDays} days.`,
          metadata: {
            event: 'PROSPECT_CONVERTED',
            organizationId: created.organization.id,
            subscriptionId: subscription.id,
            slug,
            planId,
            trialDays,
            trialEndsAt: trialEndsAt.toISOString(),
          },
        },
      }),
    ]);

    return {
      prospect: updatedProspect,
      organization: created.organization,
      adminUser: created.user,
      tempPassword: created.tempPassword,
      subscription,
      trialEndsAt,
      alreadyConverted: false,
    };
  }
}

export const prospectConversionService = new ProspectConversionService();
