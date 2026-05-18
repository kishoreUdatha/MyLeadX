/**
 * Follow-up Processor Service
 *
 * Applies each org's FollowUpConfig rules to live FollowUp records:
 *   1. Reminders     — notify assignee `reminderBeforeMinutes` before scheduledAt
 *   2. Escalation    — when scheduledAt + escalationAfterHours has passed and status is still UPCOMING,
 *                      notify assignee + manager, reassign lead to autoAssignToManagerId,
 *                      auto-move lead.stageId to autoMoveToStageId
 *   3. Priority bump — when FollowUp.attemptCount >= priorityAfterAttempts, set lead.priority = HIGH
 *
 * Config resolution per follow-up:
 *   lead.stage.followUpConfigId  →  org's default config  →  skip
 *
 * Dedupes via LeadActivity.metadata.followUpProcessor.{kind, followUpId}.
 */

import { ActivityType, LeadPriority, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { pushNotificationService } from './push-notification.service';
import { emailSettingsService } from './emailSettings.service';

type ProcessorRunCounts = {
  reminders: number;
  escalated: number;
  priorityBumped: number;
};

type RelevantConfig = {
  id: string;
  isDefault: boolean;
  reminderEnabled: boolean;
  reminderBeforeMinutes: number;
  escalationAfterHours: number | null;
  autoAssignToManagerId: string | null;
  autoMoveToStageId: string | null;
  priorityAfterAttempts: number | null;
};

class FollowUpProcessorService {
  async runAll(): Promise<ProcessorRunCounts> {
    const totals: ProcessorRunCounts = { reminders: 0, escalated: 0, priorityBumped: 0 };

    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const { id: organizationId } of orgs) {
      try {
        const counts = await this.runForOrg(organizationId);
        totals.reminders += counts.reminders;
        totals.escalated += counts.escalated;
        totals.priorityBumped += counts.priorityBumped;
      } catch (error) {
        console.error(`[FollowUpProcessor] org ${organizationId} failed:`, error);
      }
    }

    return totals;
  }

  private async runForOrg(organizationId: string): Promise<ProcessorRunCounts> {
    const configs: RelevantConfig[] = await prisma.followUpConfig.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        isDefault: true,
        reminderEnabled: true,
        reminderBeforeMinutes: true,
        escalationAfterHours: true,
        autoAssignToManagerId: true,
        autoMoveToStageId: true,
        priorityAfterAttempts: true,
      },
    });

    if (configs.length === 0) {
      return { reminders: 0, escalated: 0, priorityBumped: 0 };
    }

    const totals: ProcessorRunCounts = { reminders: 0, escalated: 0, priorityBumped: 0 };

    for (const config of configs) {
      const leadFilter = this.buildLeadFilter(organizationId, config);
      const counts = await this.runPassesForConfig(organizationId, config, leadFilter);
      totals.reminders += counts.reminders;
      totals.escalated += counts.escalated;
      totals.priorityBumped += counts.priorityBumped;
    }

    return totals;
  }

  /**
   * Lead-scoping rule per config:
   *   - Non-default config: leads whose stage explicitly maps to this config.
   *   - Default config: leads whose stage has no mapping OR who have no stage at all.
   */
  private buildLeadFilter(
    organizationId: string,
    config: RelevantConfig
  ): Prisma.LeadWhereInput {
    if (!config.isDefault) {
      return {
        organizationId,
        stage: { is: { followUpConfigId: config.id } },
      };
    }
    return {
      organizationId,
      OR: [
        { stageId: null },
        { stage: { is: { followUpConfigId: null } } },
      ],
    };
  }

  private async runPassesForConfig(
    organizationId: string,
    config: RelevantConfig,
    leadFilter: Prisma.LeadWhereInput
  ): Promise<ProcessorRunCounts> {
    const reminders = config.reminderEnabled
      ? await this.sendReminders(organizationId, config.reminderBeforeMinutes, leadFilter)
      : 0;

    const escalated = config.escalationAfterHours
      ? await this.escalateOverdue(organizationId, config, leadFilter)
      : 0;

    const priorityBumped = config.priorityAfterAttempts
      ? await this.bumpPriority(config.priorityAfterAttempts, leadFilter)
      : 0;

    return { reminders, escalated, priorityBumped };
  }

  // ---------- 1. Reminders ----------

  private async sendReminders(
    organizationId: string,
    beforeMinutes: number,
    leadFilter: Prisma.LeadWhereInput
  ): Promise<number> {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + beforeMinutes * 60_000);

    const due = await prisma.followUp.findMany({
      where: {
        status: 'UPCOMING',
        scheduledAt: { gte: now, lte: windowEnd },
        lead: { is: leadFilter },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true } },
        assignee: { select: { id: true, email: true } },
      },
      take: 200,
    });

    let sent = 0;
    for (const fu of due) {
      if (await this.alreadyProcessed(fu.leadId, fu.id, 'reminder_sent')) continue;

      const leadName = this.formatLeadName(fu.lead.firstName, fu.lead.lastName);
      const title = 'Follow-up reminder';
      const body = `Follow-up with ${leadName} is due in ${beforeMinutes} min`;

      try {
        await pushNotificationService.sendToUser(fu.assigneeId, {
          title,
          body,
          type: 'FOLLOW_UP_REMINDER',
          data: { followUpId: fu.id, leadId: fu.leadId },
        });

        if (fu.assignee?.email) {
          await emailSettingsService
            .sendEmail(organizationId, {
              to: fu.assignee.email,
              subject: title,
              text: body,
            })
            .catch((e) =>
              console.error(`[FollowUpProcessor] reminder email failed for ${fu.id}:`, e)
            );
        }

        await this.markProcessed(fu.leadId, fu.assigneeId, fu.id, 'reminder_sent', {
          beforeMinutes,
        });
        sent++;
      } catch (error) {
        console.error(`[FollowUpProcessor] reminder send failed for ${fu.id}:`, error);
      }
    }

    return sent;
  }

  // ---------- 2. Escalation ----------

  private async escalateOverdue(
    organizationId: string,
    config: RelevantConfig,
    leadFilter: Prisma.LeadWhereInput
  ): Promise<number> {
    if (!config.escalationAfterHours) return 0;

    const threshold = new Date(Date.now() - config.escalationAfterHours * 60 * 60 * 1000);

    const overdue = await prisma.followUp.findMany({
      where: {
        status: 'UPCOMING',
        scheduledAt: { lt: threshold },
        lead: { is: leadFilter },
      },
      include: {
        lead: { select: { id: true, firstName: true, lastName: true, stageId: true } },
        assignee: { select: { id: true, email: true } },
      },
      take: 100,
    });

    let escalated = 0;
    for (const fu of overdue) {
      if (await this.alreadyProcessed(fu.leadId, fu.id, 'escalated')) continue;

      const leadName = this.formatLeadName(fu.lead.firstName, fu.lead.lastName);
      const title = 'Follow-up overdue';
      const body = `Follow-up with ${leadName} is past SLA (${config.escalationAfterHours}h)`;

      try {
        await this.notifyUser(organizationId, fu.assigneeId, fu.assignee?.email ?? null, title, body, {
          followUpId: fu.id,
          leadId: fu.leadId,
          kind: 'overdue',
        });

        if (config.autoAssignToManagerId && config.autoAssignToManagerId !== fu.assigneeId) {
          const managerEmail = await this.getUserEmail(config.autoAssignToManagerId);
          await this.notifyUser(
            organizationId,
            config.autoAssignToManagerId,
            managerEmail,
            'Team follow-up overdue',
            body,
            { followUpId: fu.id, leadId: fu.leadId, kind: 'overdue_team' }
          );

          await prisma.leadAssignment.updateMany({
            where: { leadId: fu.leadId, isActive: true },
            data: { isActive: false, unassignedAt: new Date() },
          });
          await prisma.leadAssignment.create({
            data: {
              leadId: fu.leadId,
              assignedToId: config.autoAssignToManagerId,
            },
          });
          await prisma.leadActivity.create({
            data: {
              leadId: fu.leadId,
              type: ActivityType.ASSIGNMENT_CHANGED,
              title: 'Auto-reassigned to manager (follow-up SLA breached)',
              metadata: {
                trigger: 'followup_escalation',
                fromUserId: fu.assigneeId,
                toUserId: config.autoAssignToManagerId,
                followUpId: fu.id,
                configId: config.id,
              },
            },
          });
        }

        if (config.autoMoveToStageId && fu.lead.stageId !== config.autoMoveToStageId) {
          await prisma.lead.update({
            where: { id: fu.leadId },
            data: { stageId: config.autoMoveToStageId },
          });
          await prisma.leadActivity.create({
            data: {
              leadId: fu.leadId,
              type: ActivityType.STAGE_CHANGED,
              title: 'Auto-moved on follow-up escalation',
              metadata: {
                trigger: 'followup_escalation',
                fromStageId: fu.lead.stageId,
                toStageId: config.autoMoveToStageId,
                followUpId: fu.id,
                configId: config.id,
              },
            },
          });
        }

        await this.markProcessed(fu.leadId, null, fu.id, 'escalated', {
          escalationAfterHours: config.escalationAfterHours,
          configId: config.id,
        });
        escalated++;
      } catch (error) {
        console.error(`[FollowUpProcessor] escalation failed for ${fu.id}:`, error);
      }
    }

    return escalated;
  }

  // ---------- 3. Priority bump ----------

  private async bumpPriority(
    threshold: number,
    leadFilter: Prisma.LeadWhereInput
  ): Promise<number> {
    const candidates = await prisma.followUp.findMany({
      where: {
        attemptCount: { gte: threshold },
        lead: {
          is: {
            ...leadFilter,
            priority: { in: [LeadPriority.LOW, LeadPriority.MEDIUM] },
          },
        },
      },
      select: { id: true, leadId: true, attemptCount: true },
      take: 200,
    });

    let bumped = 0;
    const seenLeads = new Set<string>();

    for (const fu of candidates) {
      if (seenLeads.has(fu.leadId)) continue;
      seenLeads.add(fu.leadId);

      if (await this.alreadyProcessed(fu.leadId, fu.id, 'priority_bumped')) continue;

      try {
        await prisma.lead.update({
          where: { id: fu.leadId },
          data: { priority: LeadPriority.HIGH },
        });
        await this.markProcessed(fu.leadId, null, fu.id, 'priority_bumped', {
          attemptCount: fu.attemptCount,
          threshold,
        });
        bumped++;
      } catch (error) {
        console.error(`[FollowUpProcessor] priority bump failed for lead ${fu.leadId}:`, error);
      }
    }

    return bumped;
  }

  // ---------- Helpers ----------

  private async notifyUser(
    organizationId: string,
    userId: string,
    email: string | null,
    title: string,
    body: string,
    data: Record<string, string>
  ): Promise<void> {
    await pushNotificationService
      .sendToUser(userId, { title, body, type: 'FOLLOW_UP_REMINDER', data })
      .catch((e) => console.error(`[FollowUpProcessor] push failed for ${userId}:`, e));

    if (email) {
      await emailSettingsService
        .sendEmail(organizationId, { to: email, subject: title, text: body })
        .catch((e) => console.error(`[FollowUpProcessor] email failed for ${userId}:`, e));
    }
  }

  private async getUserEmail(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  private async alreadyProcessed(
    leadId: string,
    followUpId: string,
    kind: 'reminder_sent' | 'escalated' | 'priority_bumped'
  ): Promise<boolean> {
    const existing = await prisma.leadActivity.findFirst({
      where: {
        leadId,
        AND: [
          { metadata: { path: ['followUpProcessor', 'kind'], equals: kind } },
          { metadata: { path: ['followUpProcessor', 'followUpId'], equals: followUpId } },
        ],
      },
      select: { id: true },
    });
    return !!existing;
  }

  private async markProcessed(
    leadId: string,
    userId: string | null,
    followUpId: string,
    kind: 'reminder_sent' | 'escalated' | 'priority_bumped',
    extra: Record<string, unknown> = {}
  ): Promise<void> {
    const titles: Record<typeof kind, string> = {
      reminder_sent: 'Follow-up reminder sent',
      escalated: 'Follow-up escalated',
      priority_bumped: 'Priority bumped to HIGH (follow-up attempts threshold reached)',
    };

    await prisma.leadActivity.create({
      data: {
        leadId,
        userId: userId ?? undefined,
        type: ActivityType.CUSTOM,
        title: titles[kind],
        metadata: {
          followUpProcessor: { kind, followUpId },
          ...extra,
        },
      },
    });
  }

  private formatLeadName(firstName: string, lastName: string | null): string {
    return lastName ? `${firstName} ${lastName}` : firstName;
  }
}

export const followUpProcessorService = new FollowUpProcessorService();
