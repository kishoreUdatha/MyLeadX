import { PrismaClient, CallOutcome, LeadGrade, FollowUpActionType, ScheduledCallStatus } from '@prisma/client';
import OpenAI from 'openai';
import { exotelService } from '../integrations/exotel.service';
import { emailService } from '../integrations/email.service';

const prisma = new PrismaClient();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ==================== LEAD SCORING ====================

class LeadScoringService {
  // Calculate lead score from call data
  async calculateScore(leadId: string, callData: {
    transcript: any[];
    duration: number;
    sentiment: string;
    qualification: any;
    outcome: CallOutcome;
  }): Promise<{
    overallScore: number;
    grade: LeadGrade;
    buyingSignals: string[];
    objections: string[];
  }> {
    // Base scores
    let engagementScore = 0;
    let qualificationScore = 0;
    let sentimentScore = 50;
    let intentScore = 0;

    // Engagement: Based on call duration and responses
    if (callData.duration > 300) engagementScore = 100;
    else if (callData.duration > 180) engagementScore = 80;
    else if (callData.duration > 60) engagementScore = 60;
    else if (callData.duration > 30) engagementScore = 40;
    else engagementScore = 20;

    // Qualification: Based on data collected
    const qualFields = Object.keys(callData.qualification || {}).length;
    qualificationScore = Math.min(qualFields * 15, 100);

    // Sentiment
    if (callData.sentiment === 'positive') sentimentScore = 85;
    else if (callData.sentiment === 'negative') sentimentScore = 25;

    // Intent based on outcome
    const intentMap: Record<string, number> = {
      'CONVERTED': 100,
      'INTERESTED': 85,
      'CALLBACK_REQUESTED': 70,
      'NEEDS_FOLLOWUP': 55,
      'NOT_INTERESTED': 20,
      'DO_NOT_CALL': 0,
    };
    intentScore = intentMap[callData.outcome] || 40;

    // AI Analysis for buying signals and objections
    let buyingSignals: string[] = [];
    let objections: string[] = [];

    if (callData.transcript && callData.transcript.length > 0) {
      const analysis = await this.analyzeConversation(callData.transcript);
      buyingSignals = analysis.buyingSignals;
      objections = analysis.objections;

      // Boost scores based on buying signals
      intentScore = Math.min(intentScore + buyingSignals.length * 5, 100);
    }

    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      engagementScore * 0.2 +
      qualificationScore * 0.25 +
      sentimentScore * 0.25 +
      intentScore * 0.3
    );

    // Determine grade
    let grade: LeadGrade;
    if (overallScore >= 90) grade = 'A_PLUS';
    else if (overallScore >= 75) grade = 'A';
    else if (overallScore >= 60) grade = 'B';
    else if (overallScore >= 40) grade = 'C';
    else if (overallScore >= 25) grade = 'D';
    else grade = 'F';

    // Save or update lead score
    await prisma.leadScore.upsert({
      where: { leadId },
      create: {
        leadId,
        overallScore,
        engagementScore,
        qualificationScore,
        sentimentScore,
        intentScore,
        buyingSignals,
        objections,
        grade,
        priority: this.calculatePriority(overallScore, callData.outcome),
        callCount: 1,
        avgCallDuration: callData.duration,
        lastInteraction: new Date(),
      },
      update: {
        overallScore,
        engagementScore,
        qualificationScore,
        sentimentScore,
        intentScore,
        buyingSignals,
        objections,
        grade,
        priority: this.calculatePriority(overallScore, callData.outcome),
        callCount: { increment: 1 },
        avgCallDuration: callData.duration,
        lastInteraction: new Date(),
      },
    });

    return { overallScore, grade, buyingSignals, objections };
  }

  private async analyzeConversation(transcript: any[]): Promise<{
    buyingSignals: string[];
    objections: string[];
  }> {
    try {
      const text = transcript.map(t => `${t.role}: ${t.content}`).join('\n');

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this sales conversation and extract:
1. Buying signals - phrases indicating purchase intent
2. Objections - concerns or hesitations raised

Return JSON: {"buyingSignals": ["signal1"], "objections": ["objection1"]}`,
          },
          { role: 'user', content: text },
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      return JSON.parse(completion.choices[0]?.message?.content || '{"buyingSignals":[],"objections":[]}');
    } catch (error) {
      return { buyingSignals: [], objections: [] };
    }
  }

  private calculatePriority(score: number, outcome: CallOutcome): number {
    if (outcome === 'CALLBACK_REQUESTED') return 1;
    if (score >= 80) return 2;
    if (score >= 60) return 3;
    if (score >= 40) return 5;
    return 7;
  }

  async getLeadScore(leadId: string) {
    return prisma.leadScore.findUnique({ where: { leadId } });
  }

  async getTopLeads(organizationId: string, limit: number = 20) {
    return prisma.leadScore.findMany({
      where: {
        lead: {
          organizationId,
        },
      },
      orderBy: [{ priority: 'asc' }, { overallScore: 'desc' }],
      take: limit,
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            source: true,
            priority: true,
            stage: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });
  }
}

// ==================== CALL SCHEDULING ====================

class CallSchedulingService {
  async scheduleCall(data: {
    organizationId: string;
    agentId: string;
    phoneNumber: string;
    contactName?: string;
    scheduledAt: Date;
    leadId?: string;
    callType?: 'SCHEDULED' | 'CALLBACK' | 'FOLLOWUP' | 'REMINDER';
    priority?: number;
    notes?: string;
  }) {
    // Check DNC list
    const isDNC = await this.isOnDNCList(data.organizationId, data.phoneNumber);
    if (isDNC) {
      throw new Error('Phone number is on Do Not Call list');
    }

    return prisma.scheduledCall.create({
      data: {
        organizationId: data.organizationId,
        agentId: data.agentId,
        phoneNumber: data.phoneNumber,
        contactName: data.contactName,
        scheduledAt: data.scheduledAt,
        leadId: data.leadId,
        callType: data.callType || 'SCHEDULED',
        priority: data.priority || 5,
        notes: data.notes,
      },
    });
  }

  async scheduleCallback(callId: string, callbackTime: Date) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call) throw new Error('Call not found');

    return this.scheduleCall({
      organizationId: call.agent.organizationId,
      agentId: call.agentId,
      phoneNumber: call.phoneNumber,
      scheduledAt: callbackTime,
      leadId: call.leadId || undefined,
      callType: 'CALLBACK',
      priority: 1, // High priority for callbacks
      notes: `Callback requested during call ${callId}`,
    });
  }

  async getScheduledCalls(organizationId: string, options: {
    status?: ScheduledCallStatus;
    fromDate?: Date;
    toDate?: Date;
    agentId?: string;
  }) {
    const where: any = { organizationId };

    if (options.status) where.status = options.status;
    if (options.agentId) where.agentId = options.agentId;
    if (options.fromDate || options.toDate) {
      where.scheduledAt = {};
      if (options.fromDate) where.scheduledAt.gte = options.fromDate;
      if (options.toDate) where.scheduledAt.lte = options.toDate;
    }

    return prisma.scheduledCall.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
      include: { agent: { select: { id: true, name: true } } },
    });
  }

  async getDueScheduledCalls() {
    const now = new Date();
    return prisma.scheduledCall.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: now },
      },
      orderBy: [{ priority: 'asc' }, { scheduledAt: 'asc' }],
      include: { agent: true },
    });
  }

  async updateScheduledCallStatus(id: string, status: ScheduledCallStatus, resultCallId?: string) {
    return prisma.scheduledCall.update({
      where: { id },
      data: {
        status,
        resultCallId,
        completedAt: ['COMPLETED', 'FAILED', 'CANCELLED'].includes(status) ? new Date() : undefined,
      },
    });
  }

  async rescheduleCall(id: string, newTime: Date) {
    return prisma.scheduledCall.update({
      where: { id },
      data: {
        scheduledAt: newTime,
        status: 'PENDING',
        attemptCount: 0,
      },
    });
  }

  private async isOnDNCList(organizationId: string, phoneNumber: string): Promise<boolean> {
    const dnc = await prisma.doNotCallList.findUnique({
      where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
    });
    return !!dnc && (!dnc.expiresAt || dnc.expiresAt > new Date());
  }
}

// ==================== DNC LIST ====================

class DNCListService {
  async addToDNCList(data: {
    organizationId: string;
    phoneNumber: string;
    reason: 'CUSTOMER_REQUEST' | 'LEGAL_REQUIREMENT' | 'WRONG_NUMBER' | 'DECEASED' | 'COMPETITOR' | 'SPAM_COMPLAINT' | 'OTHER';
    notes?: string;
    addedBy?: string;
    expiresAt?: Date;
  }) {
    return prisma.doNotCallList.upsert({
      where: {
        organizationId_phoneNumber: {
          organizationId: data.organizationId,
          phoneNumber: data.phoneNumber,
        },
      },
      create: data,
      update: {
        reason: data.reason,
        notes: data.notes,
        expiresAt: data.expiresAt,
      },
    });
  }

  async removeFromDNCList(organizationId: string, phoneNumber: string) {
    return prisma.doNotCallList.delete({
      where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
    });
  }

  async isOnDNCList(organizationId: string, phoneNumber: string): Promise<boolean> {
    const entry = await prisma.doNotCallList.findUnique({
      where: { organizationId_phoneNumber: { organizationId, phoneNumber } },
    });
    return !!entry && (!entry.expiresAt || entry.expiresAt > new Date());
  }

  async getDNCList(organizationId: string) {
    return prisma.doNotCallList.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async importDNCList(organizationId: string, phoneNumbers: string[], reason: string, addedBy?: string) {
    const entries = phoneNumbers.map(phone => ({
      organizationId,
      phoneNumber: phone,
      reason: reason as any,
      addedBy,
    }));

    return prisma.doNotCallList.createMany({
      data: entries,
      skipDuplicates: true,
    });
  }
}

// ==================== AUTO FOLLOW-UP ====================

class AutoFollowUpService {
  async createRule(data: {
    organizationId: string;
    agentId?: string;
    name: string;
    triggerOutcome?: CallOutcome;
    triggerSentiment?: string;
    minCallDuration?: number;
    actionType: FollowUpActionType;
    delayMinutes: number;
    messageTemplate: string;
    useAI?: boolean;
  }) {
    return prisma.followUpRule.create({ data });
  }

  async processCallForFollowUp(callId: string) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call || !call.agent) return;

    // Find matching rules
    const rules = await prisma.followUpRule.findMany({
      where: {
        organizationId: call.agent.organizationId,
        isActive: true,
        OR: [
          { agentId: call.agentId },
          { agentId: null },
        ],
      },
    });

    for (const rule of rules) {
      if (this.ruleMatches(rule, call)) {
        await this.scheduleFollowUp(rule, call);
      }
    }
  }

  private ruleMatches(rule: any, call: any): boolean {
    if (rule.triggerOutcome && rule.triggerOutcome !== call.outcome) return false;
    if (rule.triggerSentiment && rule.triggerSentiment !== call.sentiment) return false;
    if (rule.minCallDuration && (call.duration || 0) < rule.minCallDuration) return false;
    return true;
  }

  private async scheduleFollowUp(rule: any, call: any) {
    const scheduledAt = new Date(Date.now() + rule.delayMinutes * 60 * 1000);

    // Personalize message if AI enabled
    let message = rule.messageTemplate;
    if (rule.useAI) {
      message = await this.personalizeMessage(rule.messageTemplate, call);
    }

    await prisma.followUpLog.create({
      data: {
        ruleId: rule.id,
        callId: call.id,
        leadId: call.generatedLeadId,
        actionType: rule.actionType,
        scheduledAt,
        message,
      },
    });
  }

  private async personalizeMessage(template: string, call: any): Promise<string> {
    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Personalize this follow-up message based on the call summary. Keep it concise and professional.
Template: ${template}
Call Summary: ${call.summary || 'No summary available'}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content || template;
    } catch {
      return template;
    }
  }

  async executePendingFollowUps() {
    const pending = await prisma.followUpLog.findMany({
      where: {
        status: 'PENDING',
        scheduledAt: { lte: new Date() },
      },
      take: 50,
    });

    for (const followUp of pending) {
      try {
        await this.executeFollowUp(followUp);
      } catch (error) {
        await prisma.followUpLog.update({
          where: { id: followUp.id },
          data: { status: 'FAILED', error: (error as Error).message },
        });
      }
    }
  }

  private async executeFollowUp(followUp: any) {
    // Get lead info
    const call = await prisma.outboundCall.findUnique({
      where: { id: followUp.callId },
    });

    if (!call) {
      throw new Error('Call not found');
    }

    switch (followUp.actionType) {
      case 'SMS':
        await exotelService.sendSms(call.phoneNumber, followUp.message);
        break;

      case 'EMAIL':
        // Get lead email if leadId exists
        if (followUp.leadId) {
          const lead = await prisma.lead.findUnique({
            where: { id: followUp.leadId },
            select: { email: true, alternateEmail: true, firstName: true },
          });

          if (lead && (lead.email || lead.alternateEmail)) {
            await emailService.sendEmail({
              to: lead.email || lead.alternateEmail!,
              subject: 'Follow-up',
              body: followUp.message,
              html: `<p>${followUp.message.replace(/\n/g, '<br>')}</p>`,
              leadId: followUp.leadId,
              userId: 'system',
            });
          } else {
            throw new Error('Lead has no email address');
          }
        } else {
          throw new Error('No lead associated with this follow-up');
        }
        break;

      case 'WHATSAPP':
        await exotelService.sendWhatsApp(call.phoneNumber, followUp.message);
        break;

      case 'SCHEDULE_CALL':
        // Schedule a follow-up call
        const callForSchedule = await prisma.outboundCall.findUnique({
          where: { id: followUp.callId },
          include: { agent: true },
        });

        if (callForSchedule && callForSchedule.agent) {
          await callSchedulingService.scheduleCall({
            organizationId: callForSchedule.agent.organizationId,
            agentId: callForSchedule.agentId,
            phoneNumber: callForSchedule.phoneNumber,
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Schedule for tomorrow
            leadId: followUp.leadId || undefined,
            callType: 'FOLLOWUP',
            priority: 3,
            notes: `Auto follow-up: ${followUp.message}`,
          });
        } else {
          throw new Error('Cannot schedule call: original call not found');
        }
        break;
    }

    await prisma.followUpLog.update({
      where: { id: followUp.id },
      data: { status: 'SENT', executedAt: new Date() },
    });
  }

  async getFollowUpRules(organizationId: string) {
    return prisma.followUpRule.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRule(id: string, data: any) {
    return prisma.followUpRule.update({ where: { id }, data });
  }

  async deleteRule(id: string) {
    return prisma.followUpRule.delete({ where: { id } });
  }
}

// ==================== APPOINTMENTS ====================

class AppointmentService {
  async bookAppointment(data: {
    organizationId: string;
    leadId?: string;
    callId?: string;
    title: string;
    description?: string;
    appointmentType?: string;
    scheduledAt: Date;
    duration?: number;
    locationType?: 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'OTHER';
    locationDetails?: string;
    contactName: string;
    contactPhone: string;
    contactEmail?: string;
  }) {
    return prisma.appointment.create({ data });
  }

  async bookFromCall(callId: string, appointmentDetails: {
    scheduledAt: Date;
    title?: string;
    duration?: number;
    locationType?: 'PHONE' | 'VIDEO' | 'IN_PERSON' | 'OTHER';
    locationDetails?: string;
  }) {
    const call = await prisma.outboundCall.findUnique({
      where: { id: callId },
      include: { agent: true },
    });

    if (!call) throw new Error('Call not found');

    const qualification = call.qualification as any || {};

    return this.bookAppointment({
      organizationId: call.agent.organizationId,
      leadId: call.generatedLeadId || undefined,
      callId,
      title: appointmentDetails.title || `Appointment with ${qualification.name || 'Customer'}`,
      scheduledAt: appointmentDetails.scheduledAt,
      duration: appointmentDetails.duration || 30,
      locationType: appointmentDetails.locationType || 'PHONE',
      locationDetails: appointmentDetails.locationDetails,
      contactName: qualification.name || 'Customer',
      contactPhone: call.phoneNumber,
      contactEmail: qualification.email,
    });
  }

  async getAppointments(organizationId: string, options: {
    fromDate?: Date;
    toDate?: Date;
    status?: string;
  }) {
    const where: any = { organizationId };

    if (options.status) where.status = options.status;
    if (options.fromDate || options.toDate) {
      where.scheduledAt = {};
      if (options.fromDate) where.scheduledAt.gte = options.fromDate;
      if (options.toDate) where.scheduledAt.lte = options.toDate;
    }

    return prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateAppointmentStatus(id: string, status: string) {
    const updateData: any = { status };

    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();

    return prisma.appointment.update({ where: { id }, data: updateData });
  }

  async sendReminders() {
    const reminderWindow = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const upcomingAppointments = await prisma.appointment.findMany({
      where: {
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        reminderSent: false,
        scheduledAt: { lte: reminderWindow, gte: new Date() },
      },
    });

    for (const apt of upcomingAppointments) {
      try {
        const message = `Reminder: You have an appointment "${apt.title}" scheduled for ${apt.scheduledAt.toLocaleString()}. Location: ${apt.locationDetails || apt.locationType}`;

        await exotelService.sendSms(apt.contactPhone, message);

        await prisma.appointment.update({
          where: { id: apt.id },
          data: { reminderSent: true },
        });
      } catch (error) {
        console.error(`Failed to send reminder for appointment ${apt.id}:`, error);
      }
    }
  }
}

// ==================== WEBHOOKS ====================

class WebhookService {
  async createWebhook(data: {
    organizationId: string;
    name: string;
    url: string;
    events: string[];
    authType?: 'NONE' | 'API_KEY' | 'BEARER' | 'BASIC' | 'CUSTOM_HEADER';
    authHeader?: string;
    authValue?: string;
  }) {
    return prisma.webhookConfig.create({ data: { ...data, events: data.events } });
  }

  async triggerWebhooks(organizationId: string, event: string, payload: any) {
    const webhooks = await prisma.webhookConfig.findMany({
      where: {
        organizationId,
        isActive: true,
      },
    });

    for (const webhook of webhooks) {
      const events = webhook.events as string[];
      if (events.includes(event) || events.includes('*')) {
        await this.queueWebhook(webhook.id, event, payload);
      }
    }
  }

  private async queueWebhook(webhookId: string, event: string, payload: any) {
    await prisma.webhookLog.create({
      data: {
        webhookId,
        event,
        payload,
        status: 'PENDING',
      },
    });
  }

  async processPendingWebhooks() {
    const pending = await prisma.webhookLog.findMany({
      where: {
        status: { in: ['PENDING', 'RETRYING'] },
        OR: [
          { nextRetryAt: null },
          { nextRetryAt: { lte: new Date() } },
        ],
      },
      take: 50,
      include: { },
    });

    for (const log of pending) {
      const webhook = await prisma.webhookConfig.findUnique({ where: { id: log.webhookId } });
      if (!webhook) continue;

      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };

        if (webhook.authType === 'API_KEY' && webhook.authHeader && webhook.authValue) {
          headers[webhook.authHeader] = webhook.authValue;
        } else if (webhook.authType === 'BEARER' && webhook.authValue) {
          headers['Authorization'] = `Bearer ${webhook.authValue}`;
        }

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            event: log.event,
            timestamp: new Date().toISOString(),
            data: log.payload,
          }),
        });

        await prisma.webhookLog.update({
          where: { id: log.id },
          data: {
            status: response.ok ? 'SUCCESS' : 'FAILED',
            responseCode: response.status,
            responseBody: await response.text(),
            attempts: { increment: 1 },
          },
        });

        await prisma.webhookConfig.update({
          where: { id: webhook.id },
          data: {
            successCount: { increment: response.ok ? 1 : 0 },
            failureCount: { increment: response.ok ? 0 : 1 },
            lastTriggeredAt: new Date(),
          },
        });
      } catch (error) {
        const attempts = log.attempts + 1;
        const shouldRetry = attempts < 3;

        await prisma.webhookLog.update({
          where: { id: log.id },
          data: {
            status: shouldRetry ? 'RETRYING' : 'FAILED',
            error: (error as Error).message,
            attempts,
            nextRetryAt: shouldRetry ? new Date(Date.now() + attempts * 60000) : null,
          },
        });
      }
    }
  }

  async getWebhooks(organizationId: string) {
    return prisma.webhookConfig.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteWebhook(id: string) {
    return prisma.webhookConfig.delete({ where: { id } });
  }
}

// ==================== ANALYTICS ====================

class AnalyticsService {
  async aggregateDailyStats(organizationId: string, date: Date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all calls for the day
    const calls = await prisma.outboundCall.findMany({
      where: {
        agent: { organizationId },
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    });

    const totalCalls = calls.length;
    const answeredCalls = calls.filter(c => c.status === 'COMPLETED' && c.duration && c.duration > 0).length;
    const missedCalls = calls.filter(c => ['NO_ANSWER', 'BUSY', 'FAILED'].includes(c.status)).length;
    const totalDuration = calls.reduce((sum, c) => sum + (c.duration || 0), 0);

    const outcomes = {
      interested: calls.filter(c => c.outcome === 'INTERESTED').length,
      notInterested: calls.filter(c => c.outcome === 'NOT_INTERESTED').length,
      callbacks: calls.filter(c => c.outcome === 'CALLBACK_REQUESTED').length,
      converted: calls.filter(c => c.outcome === 'CONVERTED').length,
    };

    const sentiment = {
      positive: calls.filter(c => c.sentiment === 'positive').length,
      neutral: calls.filter(c => c.sentiment === 'neutral').length,
      negative: calls.filter(c => c.sentiment === 'negative').length,
    };

    const leadsGenerated = calls.filter(c => c.leadGenerated).length;

    await prisma.analyticsDaily.upsert({
      where: {
        organizationId_agentId_date: {
          organizationId,
          agentId: null as any,
          date: startOfDay,
        },
      },
      create: {
        organizationId,
        date: startOfDay,
        totalCalls,
        answeredCalls,
        missedCalls,
        totalDuration,
        avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
        ...outcomes,
        leadsGenerated,
        positiveCount: sentiment.positive,
        neutralCount: sentiment.neutral,
        negativeCount: sentiment.negative,
        answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
        conversionRate: answeredCalls > 0 ? (outcomes.converted / answeredCalls) * 100 : 0,
      },
      update: {
        totalCalls,
        answeredCalls,
        missedCalls,
        totalDuration,
        avgDuration: answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0,
        ...outcomes,
        leadsGenerated,
        positiveCount: sentiment.positive,
        neutralCount: sentiment.neutral,
        negativeCount: sentiment.negative,
        answerRate: totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0,
        conversionRate: answeredCalls > 0 ? (outcomes.converted / answeredCalls) * 100 : 0,
      },
    });
  }

  async getAnalytics(organizationId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await prisma.analyticsDaily.findMany({
      where: {
        organizationId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Calculate totals
    const totals = dailyStats.reduce(
      (acc, day) => ({
        totalCalls: acc.totalCalls + day.totalCalls,
        answeredCalls: acc.answeredCalls + day.answeredCalls,
        missedCalls: acc.missedCalls + day.missedCalls,
        totalDuration: acc.totalDuration + day.totalDuration,
        interested: acc.interested + day.interested,
        notInterested: acc.notInterested + day.notInterested,
        callbacks: acc.callbacks + day.callbacks,
        converted: acc.converted + day.converted,
        leadsGenerated: acc.leadsGenerated + day.leadsGenerated,
        positive: acc.positive + day.positiveCount,
        neutral: acc.neutral + day.neutralCount,
        negative: acc.negative + day.negativeCount,
      }),
      {
        totalCalls: 0,
        answeredCalls: 0,
        missedCalls: 0,
        totalDuration: 0,
        interested: 0,
        notInterested: 0,
        callbacks: 0,
        converted: 0,
        leadsGenerated: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
      }
    );

    return {
      period: { days, startDate, endDate: new Date() },
      totals: {
        ...totals,
        avgDuration: totals.answeredCalls > 0 ? Math.round(totals.totalDuration / totals.answeredCalls) : 0,
        answerRate: totals.totalCalls > 0 ? ((totals.answeredCalls / totals.totalCalls) * 100).toFixed(1) : 0,
        conversionRate: totals.answeredCalls > 0 ? ((totals.converted / totals.answeredCalls) * 100).toFixed(1) : 0,
      },
      dailyStats: dailyStats.map(d => ({
        date: d.date.toISOString().split('T')[0],
        calls: d.totalCalls,
        answered: d.answeredCalls,
        converted: d.converted,
        leads: d.leadsGenerated,
      })),
      outcomeBreakdown: {
        interested: totals.interested,
        notInterested: totals.notInterested,
        callbacks: totals.callbacks,
        converted: totals.converted,
      },
      sentimentBreakdown: {
        positive: totals.positive,
        neutral: totals.neutral,
        negative: totals.negative,
      },
    };
  }
}

// ==================== CALL EVENTS (Real-time) ====================

class CallEventService {
  async logEvent(callId: string, eventType: string, data?: any) {
    return prisma.callEvent.create({
      data: { callId, eventType, data },
    });
  }

  async getCallEvents(callId: string) {
    return prisma.callEvent.findMany({
      where: { callId },
      orderBy: { timestamp: 'asc' },
    });
  }

  async getRecentEvents(organizationId: string, limit: number = 50) {
    // Get recent call IDs for the organization
    const recentCalls = await prisma.outboundCall.findMany({
      where: { agent: { organizationId } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true },
    });

    const callIds = recentCalls.map(c => c.id);

    return prisma.callEvent.findMany({
      where: { callId: { in: callIds } },
      orderBy: { timestamp: 'desc' },
      take: limit,
    });
  }
}

// Export all services
export const leadScoringService = new LeadScoringService();
export const callSchedulingService = new CallSchedulingService();
export const dncListService = new DNCListService();
export const autoFollowUpService = new AutoFollowUpService();
export const appointmentService = new AppointmentService();
export const webhookService = new WebhookService();
export const analyticsService = new AnalyticsService();
export const callEventService = new CallEventService();
