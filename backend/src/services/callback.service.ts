import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import { CallbackStatus, CallbackSource, Prisma } from '@prisma/client';

interface ScheduleCallbackInput {
  organizationId: string;
  phoneNumber: string;
  contactName?: string;
  leadId?: string;
  source: CallbackSource;
  queueId?: string;
  voicemailId?: string;
  ivrFlowId?: string;
  inboundCallId?: string;
  scheduledAt?: Date;
  preferredTimeStart?: Date;
  preferredTimeEnd?: Date;
  assignedAgentId?: string;
  priority?: number;
  notes?: string;
}

interface CallbackFilter {
  organizationId: string;
  status?: CallbackStatus;
  source?: CallbackSource;
  assignedAgentId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export class CallbackService {
  async scheduleCallback(input: ScheduleCallbackInput) {
    return prisma.callbackRequest.create({
      data: {
        organizationId: input.organizationId,
        phoneNumber: input.phoneNumber,
        contactName: input.contactName,
        leadId: input.leadId,
        source: input.source,
        queueId: input.queueId,
        voicemailId: input.voicemailId,
        ivrFlowId: input.ivrFlowId,
        inboundCallId: input.inboundCallId,
        scheduledAt: input.scheduledAt,
        preferredTimeStart: input.preferredTimeStart,
        preferredTimeEnd: input.preferredTimeEnd,
        assignedAgentId: input.assignedAgentId,
        priority: input.priority ?? 5,
        notes: input.notes,
        status: input.scheduledAt ? CallbackStatus.SCHEDULED : CallbackStatus.PENDING,
      },
    });
  }

  async getCallbackById(id: string, organizationId: string) {
    const callback = await prisma.callbackRequest.findFirst({
      where: { id, organizationId },
    });

    if (!callback) {
      throw new NotFoundError('Callback request not found');
    }

    return callback;
  }

  async getCallbacks(filter: CallbackFilter, page = 1, limit = 20) {
    const where: Prisma.CallbackRequestWhereInput = {
      organizationId: filter.organizationId,
    };

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.source) {
      where.source = filter.source;
    }

    if (filter.assignedAgentId) {
      where.assignedAgentId = filter.assignedAgentId;
    }

    if (filter.dateFrom || filter.dateTo) {
      where.createdAt = {};
      if (filter.dateFrom) {
        where.createdAt.gte = filter.dateFrom;
      }
      if (filter.dateTo) {
        where.createdAt.lte = filter.dateTo;
      }
    }

    if (filter.search) {
      where.OR = [
        { phoneNumber: { contains: filter.search } },
        { contactName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [callbacks, total] = await Promise.all([
      prisma.callbackRequest.findMany({
        where,
        orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.callbackRequest.count({ where }),
    ]);

    return { callbacks, total, page, limit };
  }

  async getPendingCallbacks(organizationId: string, assignedAgentId?: string) {
    const where: Prisma.CallbackRequestWhereInput = {
      organizationId,
      status: { in: [CallbackStatus.PENDING, CallbackStatus.SCHEDULED] },
    };

    if (assignedAgentId) {
      where.assignedAgentId = assignedAgentId;
    }

    // Get callbacks that are due (scheduled time has passed)
    where.OR = [
      { scheduledAt: null }, // Unscheduled callbacks
      { scheduledAt: { lte: new Date() } }, // Scheduled and due
    ];

    return prisma.callbackRequest.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async assignCallback(id: string, organizationId: string, agentUserId: string) {
    const callback = await this.getCallbackById(id, organizationId);

    return prisma.callbackRequest.update({
      where: { id: callback.id },
      data: {
        assignedAgentId: agentUserId,
      },
    });
  }

  async updateStatus(
    id: string,
    organizationId: string,
    status: CallbackStatus,
    additionalData?: {
      outcomeCallId?: string;
      completedById?: string;
      outcome?: string;
      notes?: string;
    }
  ) {
    const callback = await this.getCallbackById(id, organizationId);

    const updateData: Prisma.CallbackRequestUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (status === CallbackStatus.IN_PROGRESS) {
      updateData.attempts = { increment: 1 };
      updateData.lastAttemptAt = new Date();
    }

    if (status === CallbackStatus.COMPLETED) {
      updateData.completedAt = new Date();
      updateData.completedById = additionalData?.completedById;
      updateData.outcomeCallId = additionalData?.outcomeCallId;
      updateData.outcome = additionalData?.outcome;
    }

    if (status === CallbackStatus.FAILED) {
      // Check if max attempts reached
      if (callback.attempts >= callback.maxAttempts - 1) {
        updateData.status = CallbackStatus.FAILED;
      } else {
        // Schedule next attempt
        const nextAttempt = new Date();
        nextAttempt.setMinutes(nextAttempt.getMinutes() + 30);
        updateData.nextAttemptAt = nextAttempt;
        updateData.status = CallbackStatus.PENDING;
      }
    }

    if (additionalData?.notes) {
      updateData.notes = additionalData.notes;
    }

    return prisma.callbackRequest.update({
      where: { id: callback.id },
      data: updateData,
    });
  }

  async reschedule(
    id: string,
    organizationId: string,
    newScheduledAt: Date,
    notes?: string
  ) {
    const callback = await this.getCallbackById(id, organizationId);

    return prisma.callbackRequest.update({
      where: { id: callback.id },
      data: {
        scheduledAt: newScheduledAt,
        status: CallbackStatus.SCHEDULED,
        notes: notes ?? callback.notes,
      },
    });
  }

  async cancel(id: string, organizationId: string, reason?: string) {
    const callback = await this.getCallbackById(id, organizationId);

    return prisma.callbackRequest.update({
      where: { id: callback.id },
      data: {
        status: CallbackStatus.CANCELLED,
        notes: reason ? `${callback.notes || ''}\nCancelled: ${reason}` : callback.notes,
      },
    });
  }

  // === Process Callback Queue ===
  async processCallbackQueue(organizationId: string) {
    // Get all due callbacks
    const dueCallbacks = await prisma.callbackRequest.findMany({
      where: {
        organizationId,
        status: { in: [CallbackStatus.PENDING, CallbackStatus.SCHEDULED] },
        OR: [
          { scheduledAt: null },
          { scheduledAt: { lte: new Date() } },
          { nextAttemptAt: { lte: new Date() } },
        ],
      },
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
      take: 10, // Process in batches
    });

    return dueCallbacks;
  }

  async executeCallback(id: string, organizationId: string) {
    const callback = await this.getCallbackById(id, organizationId);

    // Mark as in progress
    await this.updateStatus(id, organizationId, CallbackStatus.IN_PROGRESS);

    // Return callback data for the calling system to initiate the call
    return {
      callbackId: callback.id,
      phoneNumber: callback.phoneNumber,
      contactName: callback.contactName,
      leadId: callback.leadId,
      attempts: callback.attempts + 1,
    };
  }

  // === Statistics ===
  async getStats(organizationId: string, dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.CallbackRequestWhereInput = { organizationId };

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      total,
      pending,
      scheduled,
      inProgress,
      completed,
      failed,
      cancelled,
    ] = await Promise.all([
      prisma.callbackRequest.count({ where }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.PENDING }
      }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.SCHEDULED }
      }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.IN_PROGRESS }
      }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.COMPLETED }
      }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.FAILED }
      }),
      prisma.callbackRequest.count({
        where: { ...where, status: CallbackStatus.CANCELLED }
      }),
    ]);

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      scheduled,
      inProgress,
      completed,
      failed,
      cancelled,
      completionRate,
    };
  }

  async getBySource(organizationId: string) {
    const results = await prisma.callbackRequest.groupBy({
      by: ['source'],
      where: { organizationId },
      _count: { id: true },
    });

    return results.reduce((acc, item) => {
      acc[item.source] = item._count.id;
      return acc;
    }, {} as Record<string, number>);
  }
}

export const callbackService = new CallbackService();
