/**
 * Bulk Messaging Service
 * Manages bulk SMS, WhatsApp, and RCS campaigns
 */

import { prisma } from '../../config/database';
import {
  MessageChannel,
  BulkRecipientSource,
  BulkMessageJobStatus,
  BulkMessageDeliveryStatus,
} from '@prisma/client';
import { messageCreditsService } from './message-credits.service';
import { smsService } from './sms.service';
import { whatsappService } from './whatsapp.service';
import { rcsService } from './rcs.service';

export interface CreateBulkJobParams {
  organizationId: string;
  userId: string;
  channel: MessageChannel;
  name?: string;
  description?: string;
  templateId?: string;
  message?: string;
  mediaUrl?: string;
  recipientSource: BulkRecipientSource;
  recipientFilter?: Record<string, unknown>;
  recipientListId?: string;
  phoneNumbers?: string[];
  recipients?: Array<{ phone: string; variables?: Record<string, string> }>;
  scheduledAt?: Date;
  variables?: string[];
  rcsRichCardPayload?: Record<string, unknown>;
  rcsCarouselPayload?: Record<string, unknown>;
  rcsSuggestedReplies?: Record<string, unknown>;
}

export interface JobFilters {
  status?: BulkMessageJobStatus;
  channel?: MessageChannel;
  fromDate?: Date;
  toDate?: Date;
  page?: number;
  limit?: number;
}

interface Recipient {
  phone: string;
  name?: string;
  email?: string;
  variables?: Record<string, string>;
}

class BulkMessagingService {
  /**
   * Create a new bulk messaging job
   */
  async createJob(params: CreateBulkJobParams): Promise<{ success: boolean; job?: any; error?: string }> {
    const {
      organizationId,
      userId,
      channel,
      name,
      description,
      templateId,
      message,
      mediaUrl,
      recipientSource,
      recipientFilter,
      recipientListId,
      phoneNumbers,
      recipients,
      scheduledAt,
      variables,
      rcsRichCardPayload,
      rcsCarouselPayload,
      rcsSuggestedReplies,
    } = params;

    // Validate message content
    if (!templateId && !message) {
      return { success: false, error: 'Either template or message content is required' };
    }

    // Get template content if template ID is provided
    let messageContent = message;
    let templateVars: string[] = variables || [];
    let dltTemplateId: string | undefined;

    if (templateId) {
      const template = await prisma.messageTemplate.findFirst({
        where: { id: templateId, isActive: true },
      });

      if (!template) {
        return { success: false, error: 'Template not found or inactive' };
      }

      messageContent = template.content;
      templateVars = (template.variables as string[]) || [];
      dltTemplateId = template.dltTemplateId || undefined; // Store DLT template ID
    }

    // Calculate recipient count based on source
    let recipientCount = 0;
    let recipientData: string[] = [];

    switch (recipientSource) {
      case BulkRecipientSource.FILTER:
        // Count messaging contacts (not CRM leads) for messaging portal
        const contactCount = await prisma.messagingContact.count({
          where: {
            organizationId,
            isActive: true,
            phone: { not: '' },
          },
        });
        recipientCount = contactCount;
        break;

      case BulkRecipientSource.LIST:
        // Count contacts in the group
        if (!recipientListId) {
          return { success: false, error: 'Recipient list ID is required' };
        }
        const groupCount = await prisma.messagingContactGroupMember.count({
          where: { groupId: recipientListId },
        });
        recipientCount = groupCount;
        break;

      case BulkRecipientSource.CSV:
      case BulkRecipientSource.MANUAL:
        // Support both: recipients with variables OR plain phone numbers
        if (recipients && recipients.length > 0) {
          recipientCount = recipients.length;
          recipientData = recipients as any; // Store full recipient objects with variables
        } else if (phoneNumbers && phoneNumbers.length > 0) {
          recipientCount = phoneNumbers.length;
          recipientData = phoneNumbers;
        } else {
          return { success: false, error: 'Phone numbers are required' };
        }
        break;
    }

    if (recipientCount === 0) {
      return { success: false, error: 'No recipients found' };
    }

    // Check if organization has enough credits
    const hasCredits = await messageCreditsService.hasCredits(organizationId, channel, recipientCount);
    if (!hasCredits) {
      return { success: false, error: `Insufficient ${channel} credits. Need ${recipientCount} credits.` };
    }

    // Get pricing to calculate estimated cost
    const pricing = await messageCreditsService.getPricing(organizationId);
    let pricePerMessage = 0;
    switch (channel) {
      case MessageChannel.SMS:
        pricePerMessage = pricing.smsPrice;
        break;
      case MessageChannel.WHATSAPP:
        pricePerMessage = pricing.whatsappPrice;
        break;
      case MessageChannel.RCS:
        pricePerMessage = pricing.rcsPrice;
        break;
    }

    // Create the job
    const job = await prisma.bulkMessageJob.create({
      data: {
        organizationId,
        userId,
        channel,
        name: name || `${channel} Campaign - ${new Date().toLocaleDateString()}`,
        description,
        templateId,
        dltTemplateId, // Store DLT template ID for SMS sending
        recipientSource,
        recipientFilter: recipientFilter || {},
        recipientListId,
        phoneNumbers: recipientData,
        totalCount: recipientCount,
        pendingCount: recipientCount,
        status: scheduledAt ? BulkMessageJobStatus.SCHEDULED : BulkMessageJobStatus.DRAFT,
        scheduledAt,
        message: messageContent,
        mediaUrl,
        variables: templateVars,
        rcsRichCardPayload,
        rcsCarouselPayload,
        rcsSuggestedReplies,
        estimatedCost: pricePerMessage * recipientCount,
      },
    });

    return { success: true, job };
  }

  /**
   * Start processing a bulk job
   */
  async startJob(jobId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (job.status !== BulkMessageJobStatus.DRAFT && job.status !== BulkMessageJobStatus.SCHEDULED) {
      return { success: false, error: 'Job cannot be started in its current status' };
    }

    // Check credits again before starting
    const hasCredits = await messageCreditsService.hasCredits(
      job.organizationId,
      job.channel,
      job.totalCount
    );

    if (!hasCredits) {
      return { success: false, error: `Insufficient ${job.channel} credits` };
    }

    // Deduct credits upfront
    const deductResult = await messageCreditsService.deductCredits(
      job.organizationId,
      job.channel,
      job.totalCount,
      job.id,
      userId
    );

    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Update job status
    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: BulkMessageJobStatus.PROCESSING,
        startedAt: new Date(),
        creditsUsed: job.totalCount,
      },
    });

    // Start processing in background
    this.processJobInBackground(jobId).catch(console.error);

    return { success: true };
  }

  /**
   * Process job in background
   */
  private async processJobInBackground(jobId: string): Promise<void> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    });

    if (!job) return;

    try {
      // Get recipients based on source
      const recipients = await this.getRecipients(job);

      let sentCount = 0;
      let failedCount = 0;

      // Process recipients in batches
      const batchSize = 100;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);

        // Check if job was cancelled
        const currentJob = await prisma.bulkMessageJob.findUnique({
          where: { id: jobId },
        });

        if (currentJob?.status === BulkMessageJobStatus.CANCELLED) {
          break;
        }

        // Process batch
        const results = await Promise.allSettled(
          batch.map((recipient) => this.sendMessage(job, recipient))
        );

        // Count results and create logs
        for (let j = 0; j < results.length; j++) {
          const result = results[j];
          const recipient = batch[j];

          if (result.status === 'fulfilled' && result.value.success) {
            sentCount++;
            await this.createMessageLog(job, recipient, result.value, BulkMessageDeliveryStatus.SENT);
          } else {
            failedCount++;
            const error = result.status === 'rejected' ? result.reason?.message : result.value?.error;
            await this.createMessageLog(job, recipient, { error }, BulkMessageDeliveryStatus.FAILED);
          }
        }

        // Update job progress
        await prisma.bulkMessageJob.update({
          where: { id: jobId },
          data: {
            sentCount,
            failedCount,
            pendingCount: job.totalCount - sentCount - failedCount,
          },
        });
      }

      // Refund credits for failed messages
      if (failedCount > 0) {
        await messageCreditsService.refundCredits(
          job.organizationId,
          job.channel,
          failedCount,
          job.id,
          job.userId
        );
      }

      // Mark job as completed
      await prisma.bulkMessageJob.update({
        where: { id: jobId },
        data: {
          status: BulkMessageJobStatus.COMPLETED,
          completedAt: new Date(),
          creditsRefund: failedCount,
          actualCost: (sentCount * Number(job.estimatedCost)) / job.totalCount,
        },
      });
    } catch (error) {
      console.error(`Error processing bulk job ${jobId}:`, error);

      await prisma.bulkMessageJob.update({
        where: { id: jobId },
        data: {
          status: BulkMessageJobStatus.FAILED,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Refund all credits on failure
      await messageCreditsService.refundCredits(
        job.organizationId,
        job.channel,
        job.totalCount,
        job.id,
        job.userId
      );
    }
  }

  /**
   * Get recipients based on job configuration
   */
  private async getRecipients(job: any): Promise<Recipient[]> {
    const recipients: Recipient[] = [];

    switch (job.recipientSource) {
      case BulkRecipientSource.FILTER:
        // Get all messaging contacts for this organization
        const allContacts = await prisma.messagingContact.findMany({
          where: {
            organizationId: job.organizationId,
            isActive: true,
            phone: { not: '' },
          },
          select: {
            phone: true,
            name: true,
            email: true,
            customFields: true,
          },
        });
        for (const contact of allContacts) {
          recipients.push({
            phone: contact.phone,
            name: contact.name || undefined,
            email: contact.email || undefined,
            variables: (contact.customFields as Record<string, string>) || {},
          });
        }
        break;

      case BulkRecipientSource.LIST:
        const contacts = await prisma.messagingContactGroupMember.findMany({
          where: { groupId: job.recipientListId },
          include: { contact: true },
        });
        for (const member of contacts) {
          recipients.push({
            phone: member.contact.phone,
            name: member.contact.name || undefined,
            email: member.contact.email || undefined,
            variables: (member.contact.customFields as Record<string, string>) || {},
          });
        }
        break;

      case BulkRecipientSource.CSV:
      case BulkRecipientSource.MANUAL:
        const phoneData = job.phoneNumbers as any[];
        if (phoneData && phoneData.length > 0) {
          for (const item of phoneData) {
            // Handle both formats: string (phone only) or object (phone + variables)
            if (typeof item === 'string') {
              recipients.push({ phone: item });
            } else if (item && item.phone) {
              recipients.push({
                phone: item.phone,
                variables: item.variables || {},
              });
            }
          }
        }
        break;
    }

    return recipients;
  }

  /**
   * Send a message to a single recipient
   */
  private async sendMessage(
    job: any,
    recipient: Recipient
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    // Replace variables in message
    const message = this.replaceVariables(job.message, recipient.variables || {});

    switch (job.channel) {
      case MessageChannel.SMS:
        // Use stored DLT template ID from job (captured at job creation time)
        return smsService.send({
          phone: recipient.phone,
          message,
          dltTemplateId: job.dltTemplateId || undefined,
          organizationId: job.organizationId,
          userId: job.userId,
        });

      case MessageChannel.WHATSAPP:
        return whatsappService.send({
          phone: recipient.phone,
          message,
          mediaUrl: job.mediaUrl,
          organizationId: job.organizationId,
          userId: job.userId,
        });

      case MessageChannel.RCS:
        return rcsService.send({
          phone: recipient.phone,
          message,
          mediaUrl: job.mediaUrl,
          richCardPayload: job.rcsRichCardPayload,
          carouselPayload: job.rcsCarouselPayload,
          suggestedReplies: job.rcsSuggestedReplies,
          organizationId: job.organizationId,
          userId: job.userId,
        });

      default:
        return { success: false, error: 'Unknown channel' };
    }
  }

  /**
   * Create a message log entry
   */
  private async createMessageLog(
    job: any,
    recipient: Recipient,
    result: any,
    status: BulkMessageDeliveryStatus
  ): Promise<void> {
    await prisma.bulkMessageLog.create({
      data: {
        organizationId: job.organizationId,
        bulkJobId: job.id,
        userId: job.userId,
        phone: recipient.phone,
        name: recipient.name,
        email: recipient.email,
        message: this.replaceVariables(job.message, recipient.variables || {}),
        channel: job.channel,
        status,
        providerMsgId: result.messageId,
        errorMessage: result.error,
        sentAt: status === BulkMessageDeliveryStatus.SENT ? new Date() : undefined,
        failedAt: status === BulkMessageDeliveryStatus.FAILED ? new Date() : undefined,
      },
    });
  }

  /**
   * Replace variables in message
   */
  private replaceVariables(message: string, variables: Record<string, string>): string {
    if (!message) return '';

    let result = message;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value || '');
    }
    return result;
  }

  /**
   * Extract variables from lead data
   */
  private extractLeadVariables(lead: any): Record<string, string> {
    return {
      firstName: lead.firstName || lead.name?.split(' ')[0] || '',
      lastName: lead.lastName || lead.name?.split(' ').slice(1).join(' ') || '',
      name: lead.name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      ...((lead.customFields as Record<string, string>) || {}),
    };
  }

  /**
   * Count leads from filter
   */
  private async countLeadsFromFilter(
    organizationId: string,
    filter: Record<string, unknown>
  ): Promise<number> {
    const where = this.buildLeadWhereClause(organizationId, filter);
    return prisma.lead.count({ where });
  }

  /**
   * Get leads from filter
   */
  private async getLeadsFromFilter(organizationId: string, filter: Record<string, unknown>): Promise<any[]> {
    const where = this.buildLeadWhereClause(organizationId, filter);
    return prisma.lead.findMany({
      where,
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        customFields: true,
      },
    });
  }

  /**
   * Build Prisma where clause from filter
   */
  private buildLeadWhereClause(
    organizationId: string,
    filter: Record<string, unknown>
  ): Record<string, unknown> {
    const where: Record<string, unknown> = {
      organizationId,
      phone: { not: '' }, // Filter out leads with empty phone numbers (also excludes null via implicit check)
    };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.source) {
      where.source = filter.source;
    }

    if (filter.stageId) {
      where.stageId = filter.stageId;
    }

    if (filter.assignedToId) {
      where.assignedToId = filter.assignedToId;
    }

    if (filter.tags && Array.isArray(filter.tags) && filter.tags.length > 0) {
      where.tags = {
        some: {
          id: { in: filter.tags },
        },
      };
    }

    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) {
        (where.createdAt as Record<string, unknown>).gte = new Date(filter.fromDate as string);
      }
      if (filter.toDate) {
        (where.createdAt as Record<string, unknown>).lte = new Date(filter.toDate as string);
      }
    }

    return where;
  }

  /**
   * Cancel a scheduled or processing job
   */
  async cancelJob(jobId: string): Promise<{ success: boolean; error?: string }> {
    const job = await prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      return { success: false, error: 'Job not found' };
    }

    if (
      job.status !== BulkMessageJobStatus.SCHEDULED &&
      job.status !== BulkMessageJobStatus.PROCESSING &&
      job.status !== BulkMessageJobStatus.DRAFT
    ) {
      return { success: false, error: 'Job cannot be cancelled in its current status' };
    }

    // If credits were deducted, refund remaining
    if (job.creditsUsed > 0) {
      const toRefund = job.pendingCount;
      if (toRefund > 0) {
        await messageCreditsService.refundCredits(
          job.organizationId,
          job.channel,
          toRefund,
          job.id,
          job.userId
        );
      }
    }

    await prisma.bulkMessageJob.update({
      where: { id: jobId },
      data: {
        status: BulkMessageJobStatus.CANCELLED,
        creditsRefund: job.pendingCount,
      },
    });

    return { success: true };
  }

  /**
   * Get job status and details
   */
  async getJobStatus(jobId: string): Promise<any> {
    return prisma.bulkMessageJob.findUnique({
      where: { id: jobId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * List jobs for an organization
   */
  async listJobs(organizationId: string, filters: JobFilters = {}) {
    const { status, channel, fromDate, toDate, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { organizationId };

    if (status) where.status = status;
    if (channel) where.channel = channel;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as Record<string, unknown>).gte = fromDate;
      if (toDate) (where.createdAt as Record<string, unknown>).lte = toDate;
    }

    const [jobs, total] = await Promise.all([
      prisma.bulkMessageJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.bulkMessageJob.count({ where }),
    ]);

    return {
      jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get job delivery report
   */
  async getJobReport(jobId: string, options: { page?: number; limit?: number; status?: BulkMessageDeliveryStatus } = {}) {
    const { page = 1, limit = 100, status } = options;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { bulkJobId: jobId };
    if (status) where.status = status;

    const [logs, total] = await Promise.all([
      prisma.bulkMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.bulkMessageLog.count({ where }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Update message delivery status (from webhook)
   */
  async updateMessageStatus(
    providerMsgId: string,
    status: BulkMessageDeliveryStatus,
    timestamp?: Date
  ): Promise<void> {
    const updateData: Record<string, unknown> = { status };

    switch (status) {
      case BulkMessageDeliveryStatus.DELIVERED:
        updateData.deliveredAt = timestamp || new Date();
        break;
      case BulkMessageDeliveryStatus.READ:
        updateData.readAt = timestamp || new Date();
        break;
      case BulkMessageDeliveryStatus.FAILED:
        updateData.failedAt = timestamp || new Date();
        break;
    }

    const log = await prisma.bulkMessageLog.findFirst({
      where: { providerMsgId },
    });

    if (log) {
      await prisma.bulkMessageLog.update({
        where: { id: log.id },
        data: updateData,
      });

      // Update job delivery counts
      if (status === BulkMessageDeliveryStatus.DELIVERED) {
        await prisma.bulkMessageJob.update({
          where: { id: log.bulkJobId },
          data: { deliveredCount: { increment: 1 } },
        });
      } else if (status === BulkMessageDeliveryStatus.READ) {
        await prisma.bulkMessageJob.update({
          where: { id: log.bulkJobId },
          data: { readCount: { increment: 1 } },
        });
      }
    }
  }
}

export const bulkMessagingService = new BulkMessagingService();
