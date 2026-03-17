import { PrismaClient, AgentType } from '@prisma/client';
import OpenAI from 'openai';
import { emailService } from '../integrations/email.service';
import { communicationService } from './communication.service';
import { createWhatsAppService } from '../integrations/whatsapp.service';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ==================== BASE AGENT SERVICE ====================

interface AgentContext {
  agentId: string;
  organizationId: string;
  leadId?: string;
  phone: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  conversationHistory: Array<{ role: string; content: string }>;
  metadata?: Record<string, any>;
}

interface AgentResponse {
  message: string;
  action?: string;
  data?: Record<string, any>;
  shouldEnd?: boolean;
  nextAgent?: AgentType;
}

// ==================== SALES AGENT ====================

export class SalesAgentService {
  /**
   * Handle sales conversation - qualify, pitch, handle objections, close
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const salesPitch = agent.salesPitch || '';
    const objectionHandling = (agent.objectionHandling as any[]) || [];
    const pricingInfo = agent.pricingInfo as any || {};
    const closingTechniques = (agent.closingTechniques as any[]) || [];

    // Build system prompt for sales agent
    const systemPrompt = `You are ${agent.name}, a professional sales agent.

YOUR ROLE:
- Qualify the lead's needs and budget
- Present products/services convincingly
- Handle objections professionally
- Negotiate within authorized limits (max ${agent.discountAuthority}% discount)
- Close the deal when ready

SALES PITCH:
${salesPitch}

PRICING INFO:
${JSON.stringify(pricingInfo, null, 2)}

OBJECTION HANDLING:
${objectionHandling.map((o: any) => `- If they say "${o.objection}": ${o.response}`).join('\n')}

CLOSING TECHNIQUES:
${closingTechniques.map((t: any) => `- ${t}`).join('\n')}

IMPORTANT:
- Be consultative, not pushy
- Understand their needs before pitching
- If they're ready to buy, guide them to payment
- If they need an appointment, offer to schedule

Respond naturally in conversation. If the lead is ready to proceed, include [ACTION:PAYMENT] or [ACTION:APPOINTMENT] in your response.`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    });

    const aiMessage = response.choices[0]?.message?.content || '';

    // Parse actions from response
    let action: string | undefined;
    let nextAgent: AgentType | undefined;
    let cleanMessage = aiMessage;

    if (aiMessage.includes('[ACTION:PAYMENT]')) {
      action = 'initiate_payment';
      nextAgent = 'PAYMENT';
      cleanMessage = aiMessage.replace('[ACTION:PAYMENT]', '').trim();
    } else if (aiMessage.includes('[ACTION:APPOINTMENT]')) {
      action = 'book_appointment';
      nextAgent = 'APPOINTMENT';
      cleanMessage = aiMessage.replace('[ACTION:APPOINTMENT]', '').trim();
    }

    // Update lead status if we have a lead
    if (context.leadId && action) {
      await prisma.lead.update({
        where: { id: context.leadId },
        data: {
          status: action === 'initiate_payment' ? 'CONVERTED' : 'QUALIFIED',
          customFields: {
            ...((await prisma.lead.findUnique({ where: { id: context.leadId } }))?.customFields as any || {}),
            salesAgentInteraction: new Date().toISOString(),
            lastAction: action,
          },
        },
      });
    }

    return {
      message: cleanMessage,
      action,
      nextAgent,
      shouldEnd: false,
    };
  }

  /**
   * Generate a quote for the lead
   */
  async generateQuote(context: AgentContext, products: any[], discount: number = 0): Promise<any> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const maxDiscount = agent.discountAuthority || 0;
    const finalDiscount = Math.min(discount, maxDiscount);

    const quote = {
      id: `QT-${Date.now()}`,
      leadId: context.leadId,
      products,
      subtotal: products.reduce((sum, p) => sum + (p.price * p.quantity), 0),
      discount: finalDiscount,
      total: 0,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      createdAt: new Date(),
    };

    quote.total = quote.subtotal * (1 - finalDiscount / 100);

    return quote;
  }
}

// ==================== APPOINTMENT AGENT ====================

export class AppointmentAgentService {
  /**
   * Handle appointment booking conversation
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const slotDuration = agent.slotDuration || 30;
    const maxAdvanceBooking = agent.maxAdvanceBooking || 30;

    // Get available slots (mock - should integrate with calendar)
    const availableSlots = await this.getAvailableSlots(context.agentId, 7);

    const systemPrompt = `You are ${agent.name}, an appointment booking assistant.

YOUR ROLE:
- Help customers book appointments/demos/meetings
- Check availability and suggest suitable times
- Confirm bookings and send reminders
- Handle rescheduling and cancellations

AVAILABLE SLOTS (Next 7 days):
${availableSlots.map(s => `- ${s.date}: ${s.times.join(', ')}`).join('\n')}

APPOINTMENT DETAILS:
- Duration: ${slotDuration} minutes
- Max booking: ${maxAdvanceBooking} days in advance

CONVERSATION FLOW:
1. Ask what type of meeting they need
2. Suggest available times
3. Confirm their details (name, email, phone)
4. Book and confirm

When booking is complete, include [BOOKED:date,time] in your response.
When they want to reschedule, include [RESCHEDULE:bookingId].
When they want to cancel, include [CANCEL:bookingId].`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiMessage = response.choices[0]?.message?.content || '';
    let cleanMessage = aiMessage;
    let action: string | undefined;
    let data: Record<string, any> | undefined;

    // Parse booking action
    const bookingMatch = aiMessage.match(/\[BOOKED:([^,]+),([^\]]+)\]/);
    if (bookingMatch) {
      action = 'appointment_booked';
      data = { date: bookingMatch[1], time: bookingMatch[2] };
      cleanMessage = aiMessage.replace(/\[BOOKED:[^\]]+\]/, '').trim();

      // Create appointment
      await this.bookAppointment(context, data.date, data.time, slotDuration);
    }

    return {
      message: cleanMessage,
      action,
      data,
      shouldEnd: action === 'appointment_booked',
    };
  }

  /**
   * Get available appointment slots
   */
  async getAvailableSlots(agentId: string, days: number = 7): Promise<any[]> {
    const slots = [];
    const now = new Date();

    for (let i = 1; i <= days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      const dateStr = date.toISOString().split('T')[0];
      slots.push({
        date: dateStr,
        times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
      });
    }

    return slots;
  }

  /**
   * Book an appointment
   */
  async bookAppointment(context: AgentContext, date: string, time: string, duration: number): Promise<any> {
    const appointment = await prisma.appointment.create({
      data: {
        leadId: context.leadId!,
        organizationId: context.organizationId,
        title: 'Scheduled Appointment',
        startTime: new Date(`${date}T${time}:00`),
        endTime: new Date(new Date(`${date}T${time}:00`).getTime() + duration * 60000),
        status: 'SCHEDULED',
        appointmentType: 'DEMO',
        bookedVia: 'AI_AGENT',
      },
    });

    // Send confirmation
    if (context.email) {
      await emailService.sendEmail({
        to: context.email,
        subject: 'Appointment Confirmed',
        body: `Your appointment is confirmed for ${date} at ${time}.`,
        leadId: context.leadId,
        userId: 'system',
      });
    }

    if (context.phone) {
      await communicationService.sendSms({
        to: context.phone,
        message: `Appointment confirmed: ${date} at ${time}. We look forward to meeting you!`,
        leadId: context.leadId,
        userId: 'system',
      });
    }

    return appointment;
  }

  /**
   * Send appointment reminders
   */
  async sendReminders(appointmentId: string): Promise<void> {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { lead: true },
    });

    if (!appointment || !appointment.lead) return;

    const lead = appointment.lead;
    const startTime = new Date(appointment.startTime);
    const formattedDate = startTime.toLocaleDateString();
    const formattedTime = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Send SMS reminder
    if (lead.phone) {
      await communicationService.sendSms({
        to: lead.phone,
        message: `Reminder: Your appointment is tomorrow at ${formattedTime}. See you then!`,
        leadId: lead.id,
        userId: 'system',
      });
    }

    // Send email reminder
    if (lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: 'Appointment Reminder',
        body: `This is a reminder for your appointment on ${formattedDate} at ${formattedTime}.`,
        leadId: lead.id,
        userId: 'system',
      });
    }
  }
}

// ==================== PAYMENT AGENT ====================

export class PaymentAgentService {
  /**
   * Handle payment collection conversation
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const paymentTypes = (agent.paymentTypes as string[]) || ['full', 'emi', 'partial'];
    const emiOptions = (agent.emiOptions as any[]) || [];

    // Get pending payments for this lead
    const pendingPayments = context.leadId ? await this.getPendingPayments(context.leadId) : [];

    const systemPrompt = `You are ${agent.name}, a payment collection assistant.

YOUR ROLE:
- Help customers complete their payments
- Explain payment options (full, EMI, partial)
- Generate and share payment links
- Handle payment-related queries
- Follow up on failed/pending payments

PAYMENT OPTIONS:
${paymentTypes.map(t => `- ${t.toUpperCase()}`).join('\n')}

EMI PLANS:
${emiOptions.map((e: any) => `- ${e.months} months: ${e.interest}% interest, min amount: ${e.minAmount}`).join('\n')}

PENDING PAYMENTS:
${pendingPayments.length > 0
  ? pendingPayments.map(p => `- Invoice ${p.id}: ₹${p.amount} due on ${p.dueDate}`).join('\n')
  : 'No pending payments'}

CONVERSATION FLOW:
1. Acknowledge the payment due
2. Explain payment options
3. Generate payment link when ready
4. Confirm payment status

When generating payment link, include [PAYMENT_LINK:amount,type] in your response.
When payment is confirmed, include [PAYMENT_CONFIRMED:paymentId].`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiMessage = response.choices[0]?.message?.content || '';
    let cleanMessage = aiMessage;
    let action: string | undefined;
    let data: Record<string, any> | undefined;

    // Parse payment link action
    const paymentMatch = aiMessage.match(/\[PAYMENT_LINK:(\d+),(\w+)\]/);
    if (paymentMatch) {
      action = 'generate_payment_link';
      const amount = parseInt(paymentMatch[1]);
      const type = paymentMatch[2];

      // Generate payment link (mock - should integrate with Razorpay)
      const paymentLink = await this.generatePaymentLink(context, amount, type);
      data = { paymentLink, amount, type };
      cleanMessage = aiMessage.replace(/\[PAYMENT_LINK:[^\]]+\]/, `\n\nPayment Link: ${paymentLink}`).trim();
    }

    return {
      message: cleanMessage,
      action,
      data,
    };
  }

  /**
   * Get pending payments for a lead
   */
  async getPendingPayments(leadId: string): Promise<any[]> {
    // This would integrate with your payment/invoice system
    // For now, return mock data
    return [];
  }

  /**
   * Generate payment link
   */
  async generatePaymentLink(context: AgentContext, amount: number, type: string): Promise<string> {
    // This should integrate with Razorpay/Stripe
    // For now, return a mock link
    const baseUrl = process.env.FRONTEND_URL || 'https://app.voicebridge.com';
    return `${baseUrl}/pay/${context.leadId}?amount=${amount}&type=${type}`;
  }

  /**
   * Send payment reminder
   */
  async sendPaymentReminder(leadId: string, invoiceId: string, daysOverdue: number): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const urgency = daysOverdue > 7 ? 'urgent' : 'gentle';
    const message = daysOverdue > 7
      ? `Important: Your payment of ₹X is ${daysOverdue} days overdue. Please pay immediately to avoid service interruption.`
      : `Friendly reminder: Your payment is due. Please complete it at your earliest convenience.`;

    if (lead.phone) {
      await communicationService.sendSms({
        to: lead.phone,
        message,
        leadId,
        userId: 'system',
      });
    }
  }
}

// ==================== SUPPORT AGENT ====================

export class SupportAgentService {
  /**
   * Handle support conversation
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const ticketCategories = (agent.ticketCategories as string[]) || [];
    const escalationRules = (agent.escalationRules as any[]) || [];
    const knowledgeBase = agent.knowledgeBase || '';
    const faqs = (agent.faqs as any[]) || [];

    const systemPrompt = `You are ${agent.name}, a customer support agent.

YOUR ROLE:
- Help customers with their queries and issues
- Provide accurate information from the knowledge base
- Create support tickets for complex issues
- Escalate to human agents when needed

KNOWLEDGE BASE:
${knowledgeBase}

FAQS:
${faqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}

TICKET CATEGORIES:
${ticketCategories.map(c => `- ${c}`).join('\n')}

ESCALATION RULES:
${escalationRules.map((r: any) => `- If "${r.trigger}": Escalate to ${r.team}`).join('\n')}

CONVERSATION FLOW:
1. Understand the customer's issue
2. Try to resolve using knowledge base
3. If complex, create a ticket
4. If urgent or negative sentiment, escalate

When creating a ticket, include [CREATE_TICKET:category,priority] in your response.
When escalating, include [ESCALATE:reason].
When issue is resolved, include [RESOLVED].`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 500,
    });

    const aiMessage = response.choices[0]?.message?.content || '';
    let cleanMessage = aiMessage;
    let action: string | undefined;
    let data: Record<string, any> | undefined;

    // Parse ticket creation
    const ticketMatch = aiMessage.match(/\[CREATE_TICKET:([^,]+),(\w+)\]/);
    if (ticketMatch) {
      action = 'create_ticket';
      const ticket = await this.createTicket(context, ticketMatch[1], ticketMatch[2], userMessage);
      data = { ticketId: ticket.id, category: ticketMatch[1], priority: ticketMatch[2] };
      cleanMessage = aiMessage.replace(/\[CREATE_TICKET:[^\]]+\]/, `\n\nI've created ticket #${ticket.id} for you.`).trim();
    }

    // Parse escalation
    const escalateMatch = aiMessage.match(/\[ESCALATE:([^\]]+)\]/);
    if (escalateMatch) {
      action = 'escalate';
      data = { reason: escalateMatch[1] };
      cleanMessage = aiMessage.replace(/\[ESCALATE:[^\]]+\]/, '\n\nI\'m connecting you with a human agent now.').trim();
    }

    // Parse resolved
    if (aiMessage.includes('[RESOLVED]')) {
      action = 'resolved';
      cleanMessage = aiMessage.replace('[RESOLVED]', '').trim();
    }

    return {
      message: cleanMessage,
      action,
      data,
      shouldEnd: action === 'escalate',
    };
  }

  /**
   * Create support ticket
   */
  async createTicket(context: AgentContext, category: string, priority: string, description: string): Promise<any> {
    // This would integrate with your ticketing system
    const ticket = {
      id: `TKT-${Date.now()}`,
      leadId: context.leadId,
      category,
      priority,
      description,
      status: 'OPEN',
      createdAt: new Date(),
    };

    // Store in database or send to external ticketing system
    console.log('[Support] Created ticket:', ticket);

    return ticket;
  }
}

// ==================== FOLLOW-UP AGENT ====================

export class FollowUpAgentService {
  /**
   * Handle follow-up/nurturing conversation
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    // Get lead's history
    const lead = context.leadId ? await prisma.lead.findUnique({
      where: { id: context.leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
    }) : null;

    const lastInteraction = lead?.callLogs?.[0]?.createdAt || lead?.updatedAt;
    const daysSinceLastContact = lastInteraction
      ? Math.floor((Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const systemPrompt = `You are ${agent.name}, a follow-up and nurturing agent.

YOUR ROLE:
- Re-engage leads who haven't responded
- Provide value through helpful information
- Understand why they went cold
- Reignite their interest
- Never be pushy or aggressive

LEAD CONTEXT:
- Name: ${context.firstName || 'Customer'}
- Days since last contact: ${daysSinceLastContact}
- Previous status: ${lead?.status || 'Unknown'}

APPROACH:
${daysSinceLastContact < 7
  ? '- Gentle check-in, offer assistance'
  : daysSinceLastContact < 30
  ? '- Re-introduce yourself, share new offers/updates'
  : '- Win-back approach, ask what changed, offer incentive'}

CONVERSATION FLOW:
1. Warm greeting, acknowledge time gap
2. Ask how they're doing (genuine interest)
3. Share relevant value (news, offers, updates)
4. Gauge interest level
5. If interested, hand off to sales agent

When lead shows interest, include [INTERESTED:level] where level is hot/warm/cold.
When lead explicitly declines, include [DECLINED].
When suggesting sales conversation, include [HANDOFF:SALES].`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.8,
      max_tokens: 400,
    });

    const aiMessage = response.choices[0]?.message?.content || '';
    let cleanMessage = aiMessage;
    let action: string | undefined;
    let nextAgent: AgentType | undefined;

    // Parse interest level
    const interestMatch = aiMessage.match(/\[INTERESTED:(\w+)\]/);
    if (interestMatch) {
      action = 'interest_detected';
      cleanMessage = aiMessage.replace(/\[INTERESTED:\w+\]/, '').trim();

      // Update lead status
      if (context.leadId) {
        await prisma.lead.update({
          where: { id: context.leadId },
          data: { status: interestMatch[1] === 'hot' ? 'QUALIFIED' : 'CONTACTED' },
        });
      }
    }

    // Parse handoff
    if (aiMessage.includes('[HANDOFF:SALES]')) {
      action = 'handoff';
      nextAgent = 'SALES';
      cleanMessage = aiMessage.replace('[HANDOFF:SALES]', '').trim();
    }

    // Parse decline
    if (aiMessage.includes('[DECLINED]')) {
      action = 'declined';
      cleanMessage = aiMessage.replace('[DECLINED]', '').trim();

      if (context.leadId) {
        await prisma.lead.update({
          where: { id: context.leadId },
          data: { status: 'LOST' },
        });
      }
    }

    return {
      message: cleanMessage,
      action,
      nextAgent,
    };
  }

  /**
   * Execute follow-up sequence for a lead
   */
  async executeFollowUpSequence(leadId: string, agentId: string): Promise<void> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
    });

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!agent || !lead) return;

    const sequence = (agent.followupSequence as any[]) || [];

    for (const step of sequence) {
      const { dayOffset, channel, template } = step;

      // Schedule the follow-up
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset);

      // Create scheduled task (this would integrate with a job queue)
      console.log(`[FollowUp] Scheduled ${channel} for lead ${leadId} on ${scheduledDate.toISOString()}`);
    }
  }
}

// ==================== SURVEY AGENT ====================

export class SurveyAgentService {
  /**
   * Handle survey conversation
   */
  async handleConversation(context: AgentContext, userMessage: string): Promise<AgentResponse> {
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: context.agentId },
    });

    if (!agent) throw new Error('Agent not found');

    const surveyType = agent.surveyType || 'NPS';
    const surveyQuestions = (agent.surveyQuestions as any[]) || [];
    const reviewPlatforms = (agent.reviewPlatforms as string[]) || [];

    // Default NPS questions if none configured
    const questions = surveyQuestions.length > 0 ? surveyQuestions : [
      { id: 1, question: 'On a scale of 0-10, how likely are you to recommend us to a friend?', type: 'rating' },
      { id: 2, question: 'What is the primary reason for your score?', type: 'text' },
      { id: 3, question: 'Is there anything we could do better?', type: 'text' },
    ];

    const systemPrompt = `You are ${agent.name}, a friendly survey/feedback agent.

YOUR ROLE:
- Collect customer feedback professionally
- Keep it conversational, not robotic
- Thank them sincerely for their time
- Handle negative feedback gracefully
- Ask for reviews on external platforms for promoters

SURVEY TYPE: ${surveyType}

QUESTIONS TO ASK:
${questions.map((q: any, i: number) => `${i + 1}. ${q.question} (${q.type})`).join('\n')}

REVIEW PLATFORMS: ${reviewPlatforms.join(', ') || 'None configured'}

CONVERSATION FLOW:
1. Thank them for being a customer
2. Ask survey questions one by one
3. Listen and acknowledge responses
4. For high scores (9-10), ask for online review
5. For low scores (0-6), empathize and ask how to improve
6. Thank them and close

Record answers using [ANSWER:questionId,response].
For NPS score, include [NPS:score].
When requesting review, include [REVIEW_REQUEST:platform].
When survey is complete, include [SURVEY_COMPLETE].`;

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...context.conversationHistory,
      { role: 'user', content: userMessage },
    ];

    if (!openai) {
      return { message: 'AI service unavailable', shouldEnd: true };
    }

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    });

    const aiMessage = response.choices[0]?.message?.content || '';
    let cleanMessage = aiMessage;
    let action: string | undefined;
    let data: Record<string, any> | undefined;

    // Parse NPS score
    const npsMatch = aiMessage.match(/\[NPS:(\d+)\]/);
    if (npsMatch) {
      const npsScore = parseInt(npsMatch[1]);
      action = 'nps_recorded';
      data = { npsScore };
      cleanMessage = aiMessage.replace(/\[NPS:\d+\]/, '').trim();

      // Store NPS score
      if (context.leadId) {
        await prisma.lead.update({
          where: { id: context.leadId },
          data: {
            customFields: {
              ...((await prisma.lead.findUnique({ where: { id: context.leadId } }))?.customFields as any || {}),
              npsScore,
              npsDate: new Date().toISOString(),
            },
          },
        });
      }
    }

    // Parse survey complete
    if (aiMessage.includes('[SURVEY_COMPLETE]')) {
      action = 'survey_complete';
      cleanMessage = aiMessage.replace('[SURVEY_COMPLETE]', '').trim();
    }

    return {
      message: cleanMessage,
      action,
      data,
      shouldEnd: action === 'survey_complete',
    };
  }

  /**
   * Send survey request
   */
  async sendSurveyRequest(leadId: string, agentId: string, channel: 'sms' | 'whatsapp' | 'email' = 'sms'): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    const agent = await prisma.voiceAgent.findUnique({ where: { id: agentId } });

    if (!lead || !agent) return;

    const message = `Hi ${lead.firstName}! We'd love to hear about your experience. Would you mind sharing your feedback? Reply YES to start a quick survey.`;

    if (channel === 'sms' && lead.phone) {
      await communicationService.sendSms({
        to: lead.phone,
        message,
        leadId,
        userId: 'system',
      });
    } else if (channel === 'email' && lead.email) {
      await emailService.sendEmail({
        to: lead.email,
        subject: 'We\'d love your feedback!',
        body: message,
        leadId,
        userId: 'system',
      });
    }
  }
}

// ==================== AGENT ORCHESTRATOR ====================

export class AgentOrchestrator {
  private salesAgent = new SalesAgentService();
  private appointmentAgent = new AppointmentAgentService();
  private paymentAgent = new PaymentAgentService();
  private supportAgent = new SupportAgentService();
  private followUpAgent = new FollowUpAgentService();
  private surveyAgent = new SurveyAgentService();

  /**
   * Route conversation to appropriate agent
   */
  async handleConversation(
    agentType: AgentType,
    context: AgentContext,
    userMessage: string
  ): Promise<AgentResponse> {
    switch (agentType) {
      case 'SALES':
        return this.salesAgent.handleConversation(context, userMessage);
      case 'APPOINTMENT':
        return this.appointmentAgent.handleConversation(context, userMessage);
      case 'PAYMENT':
        return this.paymentAgent.handleConversation(context, userMessage);
      case 'SUPPORT':
        return this.supportAgent.handleConversation(context, userMessage);
      case 'FOLLOWUP':
        return this.followUpAgent.handleConversation(context, userMessage);
      case 'SURVEY':
        return this.surveyAgent.handleConversation(context, userMessage);
      default:
        throw new Error(`Unknown agent type: ${agentType}`);
    }
  }

  /**
   * Hand off conversation from one agent to another
   */
  async handoffConversation(
    fromAgentType: AgentType,
    toAgentType: AgentType,
    context: AgentContext
  ): Promise<AgentResponse> {
    // Log the handoff
    console.log(`[Orchestrator] Handing off from ${fromAgentType} to ${toAgentType}`);

    // Get the new agent's greeting
    const handoffMessages: Record<AgentType, string> = {
      VOICE: "I'll connect you with our voice assistant.",
      SALES: "Let me connect you with our sales specialist who can help you further.",
      APPOINTMENT: "I'll help you schedule an appointment now.",
      PAYMENT: "Let me assist you with the payment process.",
      SUPPORT: "I'm transferring you to our support team.",
      FOLLOWUP: "We'll be in touch with you soon.",
      SURVEY: "I'd love to get your feedback on your experience.",
    };

    return {
      message: handoffMessages[toAgentType],
      action: 'handoff',
      data: { fromAgent: fromAgentType, toAgent: toAgentType },
    };
  }
}

// Export singleton instances
export const salesAgentService = new SalesAgentService();
export const appointmentAgentService = new AppointmentAgentService();
export const paymentAgentService = new PaymentAgentService();
export const supportAgentService = new SupportAgentService();
export const followUpAgentService = new FollowUpAgentService();
export const surveyAgentService = new SurveyAgentService();
export const agentOrchestrator = new AgentOrchestrator();
