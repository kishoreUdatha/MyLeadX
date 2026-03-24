/**
 * Lead Lifecycle Service
 *
 * Manages the complete lead lifecycle from first contact to closure:
 * - Phone number duplicate detection
 * - Lead creation/update from AI calls
 * - Data merging from multiple interactions
 * - Follow-up scheduling (AI or human)
 * - Interaction timeline tracking
 */

import { prisma } from '../config/database';
import {
  Lead,
  OutboundCall,
  FollowUp,
  LeadActivity,
  ActivityType,
  FollowUpType,
  FollowUpStatus,
  CallOutcome
} from '@prisma/client';

interface QualificationData {
  name?: string;
  customerName?: string;
  email?: string;
  phone?: string;
  company?: string;
  location?: string;
  city?: string;
  interest?: string;
  budget?: string;
  timeline?: string;
  [key: string]: any;
}

interface CallData {
  id: string;
  phoneNumber: string;
  outcome?: CallOutcome | null;
  qualification?: QualificationData | null;
  summary?: string | null;
  sentiment?: string | null;
  duration?: number | null;
  agentId: string;
  campaignId?: string | null;
}

interface FollowUpConfig {
  scheduledAt: Date;
  followUpType: FollowUpType;
  voiceAgentId?: string;
  message?: string;
  assigneeId: string;
  createdById: string;
}

class LeadLifecycleService {

  /**
   * Find existing lead by phone number
   */
  async findLeadByPhone(organizationId: string, phone: string): Promise<Lead | null> {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = this.normalizePhone(phone);

    // Search for exact match and variations
    const lead = await prisma.lead.findFirst({
      where: {
        organizationId,
        OR: [
          { phone: normalizedPhone },
          { phone: phone },
          { phone: { contains: normalizedPhone.slice(-10) } }, // Last 10 digits
          { alternatePhone: normalizedPhone },
          { alternatePhone: phone },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return lead;
  }

  /**
   * Process completed call - either create new lead or update existing
   * Accepts either full call object (from callFinalizationService) or separate params
   */
  async processCompletedCall(
    callOrOrgId: any,
    callDataOrUserId?: CallData | string,
    userId?: string
  ): Promise<{
    lead: Lead;
    isNew: boolean;
    isUpdated: boolean;
    followUpScheduled: boolean;
  }> {
    // Handle both call patterns:
    // 1. processCompletedCall(call) - from callFinalizationService
    // 2. processCompletedCall(orgId, callData, userId) - direct call
    let organizationId: string;
    let callData: CallData;
    let effectiveUserId: string | undefined;

    if (typeof callOrOrgId === 'string') {
      // Pattern 2: separate parameters
      organizationId = callOrOrgId;
      callData = callDataOrUserId as CallData;
      effectiveUserId = userId;
    } else {
      // Pattern 1: full call object from callFinalizationService
      const call = callOrOrgId;
      if (!call.agent?.organizationId) {
        throw new Error('Call must have agent with organizationId');
      }
      organizationId = call.agent.organizationId;
      callData = {
        id: call.id,
        phoneNumber: call.phoneNumber,
        outcome: call.outcome,
        qualification: call.qualification as QualificationData,
        summary: call.summary,
        sentiment: call.sentiment,
        duration: call.duration,
        agentId: call.agentId,
        campaignId: call.campaignId,
      };
      effectiveUserId = undefined;
    }

    // 1. Check for existing lead
    const existingLead = await this.findLeadByPhone(organizationId, callData.phoneNumber);

    let lead: Lead;
    let isNew = false;
    let isUpdated = false;

    if (existingLead) {
      // 2a. Update existing lead with new data
      lead = await this.updateLeadFromCall(existingLead, callData, effectiveUserId);
      isUpdated = true;

      // Log activity
      await this.logActivity(lead.id, effectiveUserId, ActivityType.AI_CALL_COMPLETED,
        'Follow-up call completed', {
          callId: callData.id,
          outcome: callData.outcome,
          sentiment: callData.sentiment,
          isFollowUp: true,
          callNumber: (existingLead.totalCalls || 0) + 1,
        }
      );

    } else {
      // 2b. Create new lead
      lead = await this.createLeadFromCall(organizationId, callData, effectiveUserId);
      isNew = true;

      // Log activity
      await this.logActivity(lead.id, effectiveUserId, ActivityType.LEAD_CREATED,
        'Lead created from AI call', {
          callId: callData.id,
          outcome: callData.outcome,
          sentiment: callData.sentiment,
          source: 'AI_CALL',
        }
      );
    }

    // 3. Link call to lead
    await prisma.outboundCall.update({
      where: { id: callData.id },
      data: {
        existingLeadId: lead.id,
        leadGenerated: isNew,
        generatedLeadId: isNew ? lead.id : undefined,
        isFollowUpCall: !isNew,
        followUpNumber: (existingLead?.totalCalls || 0) + 1,
      },
    });

    // 4. Schedule follow-up if needed
    let followUpScheduled = false;
    if (this.shouldScheduleFollowUp(callData.outcome)) {
      await this.scheduleAutoFollowUp(lead, callData, effectiveUserId);
      followUpScheduled = true;
    }

    return { lead, isNew, isUpdated, followUpScheduled };
  }

  /**
   * Create a new lead from call data
   */
  private async createLeadFromCall(
    organizationId: string,
    callData: CallData,
    userId?: string
  ): Promise<Lead> {
    const qualification = callData.qualification || {};

    // Extract name from qualification
    const fullName = qualification.name || qualification.customerName || '';
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || undefined;

    // Get default stage for new leads
    const defaultStage = await prisma.leadStage.findFirst({
      where: { organizationId, isDefault: true },
    });

    const lead = await prisma.lead.create({
      data: {
        organizationId,
        firstName,
        lastName,
        phone: this.normalizePhone(callData.phoneNumber),
        email: qualification.email,
        source: 'AI_CALL' as any,
        sourceDetails: `AI Voice Agent Call - ${callData.campaignId ? 'Campaign' : 'Direct'}`,
        stageId: defaultStage?.id,
        city: qualification.city || qualification.location,
        customFields: {
          aiCallData: {
            firstCallId: callData.id,
            firstCallOutcome: callData.outcome,
            firstCallSentiment: callData.sentiment,
            firstCallSummary: callData.summary,
          },
          qualification: qualification,
        },
        totalCalls: 1,
        lastContactedAt: new Date(),
      },
    });

    return lead;
  }

  /**
   * Update existing lead with new call data
   */
  private async updateLeadFromCall(
    existingLead: Lead,
    callData: CallData,
    userId?: string
  ): Promise<Lead> {
    const qualification = callData.qualification || {};
    const existingCustomFields = (existingLead.customFields as any) || {};

    // Merge qualification data
    const mergedQualification = this.mergeQualificationData(
      existingCustomFields.qualification || {},
      qualification
    );

    // Track call history
    const callHistory = existingCustomFields.callHistory || [];
    callHistory.push({
      callId: callData.id,
      timestamp: new Date().toISOString(),
      outcome: callData.outcome,
      sentiment: callData.sentiment,
      summary: callData.summary,
      newDataCaptured: Object.keys(qualification).length > 0,
    });

    // Update lead with merged data
    const lead = await prisma.lead.update({
      where: { id: existingLead.id },
      data: {
        // Update fields if new data is better
        email: qualification.email || existingLead.email,
        city: qualification.city || qualification.location || existingLead.city,

        // Update custom fields with merged data
        customFields: {
          ...existingCustomFields,
          qualification: mergedQualification,
          callHistory,
          lastCallData: {
            callId: callData.id,
            outcome: callData.outcome,
            sentiment: callData.sentiment,
            summary: callData.summary,
            timestamp: new Date().toISOString(),
          },
        },

        // Update tracking fields
        totalCalls: (existingLead.totalCalls || 0) + 1,
        lastContactedAt: new Date(),
      },
    });

    // Log data update activity if new data was captured
    if (Object.keys(qualification).length > 0) {
      await this.logActivity(lead.id, userId, ActivityType.DATA_CAPTURED,
        'New information captured from call', {
          callId: callData.id,
          fieldsUpdated: Object.keys(qualification),
        }
      );
    }

    return lead;
  }

  /**
   * Merge qualification data from multiple calls
   */
  private mergeQualificationData(
    existing: QualificationData,
    newData: QualificationData
  ): QualificationData {
    const merged: QualificationData = { ...existing };

    for (const [key, value] of Object.entries(newData)) {
      if (value !== null && value !== undefined && value !== '') {
        // Only overwrite if new value exists and old value is empty
        if (!merged[key] || merged[key] === '' || merged[key] === null) {
          merged[key] = value;
        } else if (typeof value === 'string' && value.length > (merged[key] as string).length) {
          // Or if new value is more detailed (longer string)
          merged[key] = value;
        }
      }
    }

    // Track merge history
    merged._mergeHistory = merged._mergeHistory || [];
    merged._mergeHistory.push({
      timestamp: new Date().toISOString(),
      fieldsAdded: Object.keys(newData).filter(k => !existing[k]),
      fieldsUpdated: Object.keys(newData).filter(k => existing[k] && existing[k] !== newData[k]),
    });

    return merged;
  }

  /**
   * Determine if follow-up should be scheduled based on outcome
   */
  private shouldScheduleFollowUp(outcome?: CallOutcome | null): boolean {
    const followUpOutcomes: CallOutcome[] = [
      'INTERESTED',
      'CALLBACK_REQUESTED',
      'NEEDS_FOLLOWUP',
      'NO_ANSWER',
      'BUSY',
      'VOICEMAIL',
    ];

    return outcome ? followUpOutcomes.includes(outcome) : false;
  }

  /**
   * Schedule automatic follow-up based on call outcome
   */
  private async scheduleAutoFollowUp(
    lead: Lead,
    callData: CallData,
    userId?: string
  ): Promise<FollowUp | null> {
    // Get voice agent settings
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: callData.agentId },
    });

    if (!agent) return null;

    // Determine follow-up timing based on outcome
    const followUpDelay = this.getFollowUpDelay(callData.outcome);
    const scheduledAt = new Date(Date.now() + followUpDelay);

    // Determine follow-up type
    let followUpType: FollowUpType = 'AI_CALL';

    // If interested or callback requested, may need human touch
    if (callData.outcome === 'INTERESTED' && (lead.totalCalls || 0) >= 2) {
      followUpType = 'HUMAN_CALL';
    }

    // Get or create system user for assignment
    const assignee = await this.getDefaultAssignee(lead.organizationId, agent.defaultAssigneeId);
    if (!assignee) return null;

    const followUp = await prisma.followUp.create({
      data: {
        leadId: lead.id,
        assigneeId: assignee.id,
        createdById: userId || assignee.id,
        scheduledAt,
        followUpType,
        voiceAgentId: followUpType === 'AI_CALL' ? callData.agentId : undefined,
        sourceCallId: callData.id,
        message: this.getFollowUpMessage(callData.outcome),
        status: 'UPCOMING',
      },
    });

    // Update lead with next follow-up date
    await prisma.lead.update({
      where: { id: lead.id },
      data: { nextFollowUpAt: scheduledAt },
    });

    // Log activity
    await this.logActivity(lead.id, userId, ActivityType.FOLLOWUP_SCHEDULED,
      `${followUpType === 'AI_CALL' ? 'AI' : 'Human'} follow-up scheduled`, {
        followUpId: followUp.id,
        scheduledAt: scheduledAt.toISOString(),
        followUpType,
        reason: callData.outcome,
      }
    );

    return followUp;
  }

  /**
   * Get follow-up delay based on outcome
   */
  private getFollowUpDelay(outcome?: CallOutcome | null): number {
    const delays: Record<string, number> = {
      CALLBACK_REQUESTED: 4 * 60 * 60 * 1000,  // 4 hours
      INTERESTED: 24 * 60 * 60 * 1000,         // 1 day
      NEEDS_FOLLOWUP: 24 * 60 * 60 * 1000,     // 1 day
      NO_ANSWER: 2 * 60 * 60 * 1000,           // 2 hours
      BUSY: 1 * 60 * 60 * 1000,                // 1 hour
      VOICEMAIL: 4 * 60 * 60 * 1000,           // 4 hours
    };

    return delays[outcome || ''] || 24 * 60 * 60 * 1000; // Default 1 day
  }

  /**
   * Get follow-up message based on outcome
   */
  private getFollowUpMessage(outcome?: CallOutcome | null): string {
    const messages: Record<string, string> = {
      CALLBACK_REQUESTED: 'Customer requested a callback',
      INTERESTED: 'Customer showed interest, follow up to close',
      NEEDS_FOLLOWUP: 'Needs additional follow-up',
      NO_ANSWER: 'No answer on previous call, retry',
      BUSY: 'Customer was busy, retry later',
      VOICEMAIL: 'Left voicemail, follow up',
    };

    return messages[outcome || ''] || 'Scheduled follow-up call';
  }

  /**
   * Schedule a manual follow-up
   */
  async scheduleFollowUp(
    leadId: string,
    config: FollowUpConfig
  ): Promise<FollowUp> {
    const followUp = await prisma.followUp.create({
      data: {
        leadId,
        assigneeId: config.assigneeId,
        createdById: config.createdById,
        scheduledAt: config.scheduledAt,
        followUpType: config.followUpType,
        voiceAgentId: config.voiceAgentId,
        message: config.message,
        status: 'UPCOMING',
      },
    });

    // Update lead
    await prisma.lead.update({
      where: { id: leadId },
      data: { nextFollowUpAt: config.scheduledAt },
    });

    // Log activity
    await this.logActivity(leadId, config.createdById, ActivityType.FOLLOWUP_SCHEDULED,
      `Follow-up scheduled`, {
        followUpId: followUp.id,
        scheduledAt: config.scheduledAt.toISOString(),
        followUpType: config.followUpType,
      }
    );

    return followUp;
  }

  /**
   * Execute pending AI follow-ups
   * Returns array of results for each follow-up processed
   */
  async executePendingAIFollowUps(): Promise<Array<{ followUpId: string; success: boolean; error?: string }>> {
    const now = new Date();

    // Find due AI follow-ups that haven't exceeded max attempts
    const dueFollowUps = await prisma.followUp.findMany({
      where: {
        followUpType: 'AI_CALL',
        status: 'UPCOMING',
        scheduledAt: { lte: now },
      },
      include: {
        lead: true,
        voiceAgent: true,
      },
      take: 10, // Process in batches
    });

    // Filter out follow-ups that have exceeded max attempts
    const eligibleFollowUps = dueFollowUps.filter(f => f.attemptCount < f.maxAttempts);

    const results: Array<{ followUpId: string; success: boolean; error?: string }> = [];

    for (const followUp of eligibleFollowUps) {
      try {
        if (!followUp.voiceAgent || !followUp.lead) {
          await this.markFollowUpFailed(followUp.id, 'Missing agent or lead');
          results.push({ followUpId: followUp.id, success: false, error: 'Missing agent or lead' });
          continue;
        }

        // Trigger AI call
        const call = await this.triggerAICallForLead(
          followUp.lead,
          followUp.voiceAgent.id,
          followUp.id
        );

        // Update follow-up
        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            outboundCallId: call.id,
            attemptCount: followUp.attemptCount + 1,
            lastAttemptAt: now,
            status: 'COMPLETED',
            completedAt: now,
          },
        });

        results.push({ followUpId: followUp.id, success: true });
      } catch (error: any) {
        console.error(`[LeadLifecycle] Failed to execute follow-up ${followUp.id}:`, error);

        await prisma.followUp.update({
          where: { id: followUp.id },
          data: {
            attemptCount: followUp.attemptCount + 1,
            lastAttemptAt: now,
          },
        });

        results.push({ followUpId: followUp.id, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Trigger AI call for existing lead
   */
  async triggerAICallForLead(
    lead: Lead,
    voiceAgentId: string,
    followUpId?: string
  ): Promise<OutboundCall> {
    // Import job queue service to add call job
    const { jobQueueService } = await import('./job-queue.service');

    // Create outbound call record
    const call = await prisma.outboundCall.create({
      data: {
        agentId: voiceAgentId,
        phoneNumber: lead.phone,
        existingLeadId: lead.id,
        isFollowUpCall: true,
        followUpNumber: (lead.totalCalls || 0) + 1,
        status: 'INITIATED',
      },
    });

    // Queue the call
    await jobQueueService.addJob('OUTBOUND_CALL', {
      callId: call.id,
      phoneNumber: lead.phone,
      agentId: voiceAgentId,
      leadId: lead.id,
      isFollowUp: true,
      followUpId,
      context: {
        leadName: `${lead.firstName} ${lead.lastName || ''}`.trim(),
        previousCalls: lead.totalCalls || 0,
        customFields: lead.customFields,
      },
    }, {
      organizationId: lead.organizationId,
    });

    return call;
  }

  /**
   * Get lead timeline with all interactions
   */
  async getLeadTimeline(leadId: string): Promise<{
    activities: LeadActivity[];
    calls: OutboundCall[];
    followUps: FollowUp[];
  }> {
    const [activities, calls, followUps] = await Promise.all([
      prisma.leadActivity.findMany({
        where: { leadId },
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
        take: 50,
      }),
      prisma.outboundCall.findMany({
        where: { existingLeadId: leadId },
        orderBy: { createdAt: 'desc' },
        include: { agent: { select: { id: true, name: true } } },
      }),
      prisma.followUp.findMany({
        where: { leadId },
        orderBy: { scheduledAt: 'desc' },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true } },
          voiceAgent: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { activities, calls, followUps };
  }

  /**
   * Get all calls for a lead
   */
  async getLeadCalls(leadId: string): Promise<OutboundCall[]> {
    return prisma.outboundCall.findMany({
      where: { existingLeadId: leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        agent: { select: { id: true, name: true } },
        campaign: { select: { id: true, name: true } },
      },
    });
  }

  /**
   * Log activity to lead timeline
   */
  private async logActivity(
    leadId: string,
    userId: string | undefined,
    type: ActivityType,
    title: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await prisma.leadActivity.create({
      data: {
        leadId,
        userId,
        type,
        title,
        description: metadata ? JSON.stringify(metadata) : undefined,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Mark follow-up as failed
   */
  private async markFollowUpFailed(followUpId: string, reason: string): Promise<void> {
    await prisma.followUp.update({
      where: { id: followUpId },
      data: {
        status: 'MISSED',
        notes: reason,
      },
    });
  }

  /**
   * Get default assignee for follow-ups
   */
  private async getDefaultAssignee(
    organizationId: string,
    preferredId?: string | null
  ): Promise<{ id: string } | null> {
    if (preferredId) {
      const user = await prisma.user.findUnique({
        where: { id: preferredId },
        select: { id: true },
      });
      if (user) return user;
    }

    // Get first admin user
    return prisma.user.findFirst({
      where: {
        organizationId,
        role: { slug: 'admin' },
      },
      select: { id: true },
    });
  }

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    // Remove all non-digit characters except +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Ensure it starts with + if it has country code
    if (normalized.length > 10 && !normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }
}

export const leadLifecycleService = new LeadLifecycleService();
export default leadLifecycleService;
