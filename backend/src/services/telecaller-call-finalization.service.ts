/**
 * Telecaller Call Finalization Service
 *
 * Processes telecaller call recordings with full AI analysis:
 * - Transcription (Sarvam/Whisper)
 * - Sentiment Analysis (OpenAI)
 * - Outcome Detection (OpenAI)
 * - Summary Generation (OpenAI)
 * - Lead Scoring
 * - Lead Lifecycle Integration
 * - Auto Follow-up Scheduling
 *
 * Works exactly like AI Voice Agent analysis but for human telecaller calls
 */

import OpenAI from 'openai';
import { PrismaClient, CallOutcome } from '@prisma/client';
import { sarvamService } from '../integrations/sarvam.service';
import { leadLifecycleService } from './lead-lifecycle.service';
import { leadScoringService } from './lead-scoring.service';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Valid call outcomes for AI analysis
const VALID_OUTCOMES: CallOutcome[] = [
  'INTERESTED',
  'NOT_INTERESTED',
  'CALLBACK_REQUESTED',
  'NEEDS_FOLLOWUP',
  'CONVERTED',
  'NO_ANSWER',
  'BUSY',
  'VOICEMAIL',
  'WRONG_NUMBER',
  'DNC_REQUESTED',
];

// TelecallerCallOutcome enum values (subset of CallOutcome)
type TelecallerCallOutcome = 'INTERESTED' | 'NOT_INTERESTED' | 'CALLBACK' | 'CONVERTED' | 'NO_ANSWER' | 'WRONG_NUMBER' | 'BUSY';

// Map CallOutcome to TelecallerCallOutcome
function mapToTelecallerOutcome(outcome: CallOutcome): TelecallerCallOutcome {
  const mapping: Record<string, TelecallerCallOutcome> = {
    'INTERESTED': 'INTERESTED',
    'NOT_INTERESTED': 'NOT_INTERESTED',
    'CALLBACK_REQUESTED': 'CALLBACK',
    'NEEDS_FOLLOWUP': 'CALLBACK',
    'CONVERTED': 'CONVERTED',
    'NO_ANSWER': 'NO_ANSWER',
    'BUSY': 'BUSY',
    'VOICEMAIL': 'NO_ANSWER',
    'WRONG_NUMBER': 'WRONG_NUMBER',
    'DNC_REQUESTED': 'NOT_INTERESTED',
  };
  return mapping[outcome] || 'CALLBACK';
}

class TelecallerCallFinalizationService {
  /**
   * Process a telecaller call recording with full AI analysis
   */
  async processRecording(callId: string, filePath: string): Promise<void> {
    console.log(`[TelecallerAI] Starting AI analysis for call ${callId}`);

    try {
      // Get call details
      const call = await prisma.telecallerCall.findUnique({
        where: { id: callId },
        include: {
          lead: true,
          telecaller: {
            select: { id: true, firstName: true, lastName: true, organizationId: true },
          },
        },
      });

      if (!call) {
        console.error(`[TelecallerAI] Call ${callId} not found`);
        return;
      }

      // Step 1: Transcribe the recording
      console.log(`[TelecallerAI] Step 1: Transcribing recording...`);
      const transcript = await this.transcribeRecording(filePath);

      if (!transcript) {
        console.error(`[TelecallerAI] Transcription failed for call ${callId}`);
        await this.updateCallWithError(callId, 'Transcription failed');
        return;
      }

      // Step 2: Analyze sentiment
      console.log(`[TelecallerAI] Step 2: Analyzing sentiment...`);
      const sentiment = await this.analyzeSentiment(transcript);

      // Step 3: Determine outcome
      console.log(`[TelecallerAI] Step 3: Determining outcome...`);
      const outcome = await this.determineOutcome(transcript);

      // Step 4: Generate summary
      console.log(`[TelecallerAI] Step 4: Generating summary...`);
      const summary = await this.generateSummary(transcript);

      // Step 5: Extract qualification data
      console.log(`[TelecallerAI] Step 5: Extracting qualification data...`);
      const qualification = await this.extractQualificationData(transcript);

      // Step 6: Detect buying signals and objections
      console.log(`[TelecallerAI] Step 6: Analyzing buying signals...`);
      const buyingSignals = await this.detectBuyingSignals(transcript);

      // Step 7: Update call with AI analysis
      console.log(`[TelecallerAI] Step 7: Updating call record...`);
      const telecallerOutcome = mapToTelecallerOutcome(outcome);
      const updatedCall = await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          transcript,
          sentiment,
          outcome: telecallerOutcome,
          summary,
          qualification: {
            ...qualification,
            buyingSignals: buyingSignals.signals,
            objections: buyingSignals.objections,
            aiAnalyzedAt: new Date().toISOString(),
          },
          aiAnalyzed: true,
          status: 'COMPLETED',
        },
        include: {
          lead: true,
          telecaller: true,
        },
      });

      // Step 8: Process lead lifecycle (create/update lead, schedule follow-ups)
      console.log(`[TelecallerAI] Step 8: Processing lead lifecycle...`);
      await this.processLeadLifecycle(updatedCall, qualification);

      // Step 9: Calculate and update lead score
      if (updatedCall.leadId) {
        console.log(`[TelecallerAI] Step 9: Calculating lead score...`);
        await this.updateLeadScore(updatedCall);
      }

      // Step 10: Log activity
      await this.logCallActivity(updatedCall);

      console.log(`[TelecallerAI] AI analysis completed for call ${callId}`);
      console.log(`[TelecallerAI] Results: Outcome=${outcome}, Sentiment=${sentiment}`);
    } catch (error) {
      console.error(`[TelecallerAI] Error processing call ${callId}:`, error);
      await this.updateCallWithError(callId, (error as Error).message);
    }
  }

  /**
   * Transcribe audio recording using Sarvam or Whisper
   */
  private async transcribeRecording(filePath: string): Promise<string | null> {
    try {
      // Read audio file
      const audioBuffer = fs.readFileSync(filePath);

      // Try Sarvam first (better for Indian languages)
      try {
        const result = await sarvamService.speechToText(audioBuffer);
        if (result && result.text) {
          return result.text;
        }
      } catch (sarvamError) {
        console.log('[TelecallerAI] Sarvam failed, trying Whisper...');
      }

      // Fallback to Whisper
      if (openai) {
        const response = await openai.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: 'whisper-1',
          language: 'en', // Can be made dynamic
        });
        return response.text;
      }

      return null;
    } catch (error) {
      console.error('[TelecallerAI] Transcription error:', error);
      return null;
    }
  }

  /**
   * Analyze sentiment using OpenAI
   */
  private async analyzeSentiment(transcript: string): Promise<string> {
    if (!openai) return 'neutral';

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze the customer's sentiment in this phone conversation.
Consider their tone, word choice, and overall attitude.
Reply with ONLY one word: positive, neutral, or negative.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 10,
      });

      const result = completion.choices[0]?.message?.content?.toLowerCase().trim();
      return ['positive', 'neutral', 'negative'].includes(result || '') ? result! : 'neutral';
    } catch (error) {
      console.error('[TelecallerAI] Sentiment analysis error:', error);
      return 'neutral';
    }
  }

  /**
   * Determine call outcome using OpenAI
   */
  private async determineOutcome(transcript: string): Promise<CallOutcome> {
    if (!openai) return 'NEEDS_FOLLOWUP';

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this phone call and determine the outcome.
Reply with ONLY one of these outcomes:
- INTERESTED: Customer showed interest in the product/service
- NOT_INTERESTED: Customer clearly not interested
- CALLBACK_REQUESTED: Customer asked to be called back later
- NEEDS_FOLLOWUP: Conversation incomplete, needs follow-up
- CONVERTED: Customer agreed to purchase/sign up
- NO_ANSWER: Call was not answered (rarely applicable for recordings)
- BUSY: Customer was busy, couldn't talk
- VOICEMAIL: Left a voicemail
- WRONG_NUMBER: Wrong number reached
- DNC_REQUESTED: Customer requested to not be called again`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 20,
      });

      const result = completion.choices[0]?.message?.content?.toUpperCase().trim() as CallOutcome;
      return VALID_OUTCOMES.includes(result) ? result : 'NEEDS_FOLLOWUP';
    } catch (error) {
      console.error('[TelecallerAI] Outcome determination error:', error);
      return 'NEEDS_FOLLOWUP';
    }
  }

  /**
   * Generate call summary using OpenAI
   */
  private async generateSummary(transcript: string): Promise<string> {
    if (!openai) return transcript.substring(0, 200);

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Summarize this phone call in 2-3 sentences.
Focus on:
- Main topic discussed
- Customer's response/attitude
- Any commitments or next steps agreed
- Key objections raised (if any)

Be concise and actionable.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      });

      return completion.choices[0]?.message?.content || transcript.substring(0, 200);
    } catch (error) {
      console.error('[TelecallerAI] Summary generation error:', error);
      return transcript.substring(0, 200);
    }
  }

  /**
   * Extract qualification data from transcript
   */
  private async extractQualificationData(transcript: string): Promise<Record<string, any>> {
    if (!openai) return {};

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract any customer information mentioned in this call.
Return a JSON object with any of these fields that were mentioned:
{
  "name": "customer name if mentioned",
  "email": "email if mentioned",
  "company": "company name if mentioned",
  "budget": "budget range if discussed",
  "timeline": "when they want to proceed",
  "requirements": "specific requirements mentioned",
  "currentSolution": "what they currently use",
  "decisionMaker": "true/false if they're the decision maker",
  "painPoints": ["list of problems they mentioned"]
}
Only include fields that were actually mentioned. Return empty {} if nothing was mentioned.`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 500,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      return content ? JSON.parse(content) : {};
    } catch (error) {
      console.error('[TelecallerAI] Qualification extraction error:', error);
      return {};
    }
  }

  /**
   * Detect buying signals and objections
   */
  private async detectBuyingSignals(transcript: string): Promise<{ signals: string[]; objections: string[] }> {
    if (!openai) return { signals: [], objections: [] };

    try {
      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze this sales call for buying signals and objections.

Return JSON:
{
  "signals": ["list of phrases/statements showing purchase intent"],
  "objections": ["list of concerns or hesitations expressed"]
}

Examples of buying signals:
- "How much does it cost?"
- "When can we start?"
- "Can you send me more information?"
- "That sounds interesting"

Examples of objections:
- "It's too expensive"
- "I need to think about it"
- "We're happy with our current solution"
- "Not the right time"`,
          },
          {
            role: 'user',
            content: transcript,
          },
        ],
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content);
        return {
          signals: parsed.signals || [],
          objections: parsed.objections || [],
        };
      }
      return { signals: [], objections: [] };
    } catch (error) {
      console.error('[TelecallerAI] Buying signals detection error:', error);
      return { signals: [], objections: [] };
    }
  }

  /**
   * Process lead lifecycle - create/update lead, schedule follow-ups
   */
  private async processLeadLifecycle(call: any, qualification: Record<string, any>): Promise<void> {
    try {
      const organizationId = call.telecaller?.organizationId;
      if (!organizationId) return;

      // If call has a linked lead, update it
      if (call.leadId) {
        await this.updateExistingLead(call, qualification);
      } else {
        // Try to find existing lead by phone or create new one
        const existingLead = await prisma.lead.findFirst({
          where: {
            organizationId,
            phone: call.phoneNumber,
          },
        });

        if (existingLead) {
          // Link call to existing lead and update
          await prisma.telecallerCall.update({
            where: { id: call.id },
            data: { leadId: existingLead.id },
          });
          call.leadId = existingLead.id;
          await this.updateExistingLead(call, qualification);
        } else if (
          call.outcome === 'INTERESTED' ||
          call.outcome === 'CONVERTED' ||
          call.outcome === 'CALLBACK_REQUESTED'
        ) {
          // Create new lead for interested customers
          await this.createLeadFromCall(call, qualification, organizationId);
        }
      }

      // Schedule follow-up if needed
      await this.scheduleFollowUp(call);
    } catch (error) {
      console.error('[TelecallerAI] Lead lifecycle error:', error);
    }
  }

  /**
   * Update existing lead with call data
   */
  private async updateExistingLead(call: any, qualification: Record<string, any>): Promise<void> {
    if (!call.leadId) return;

    try {
      const lead = await prisma.lead.findUnique({
        where: { id: call.leadId },
      });

      if (!lead) return;

      // Merge qualification data
      const existingCustomFields = (lead.customFields as object) || {};
      const mergedFields = {
        ...existingCustomFields,
        ...qualification,
        lastTelecallerCall: {
          callId: call.id,
          outcome: call.outcome,
          sentiment: call.sentiment,
          summary: call.summary,
          telecaller: `${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          timestamp: new Date().toISOString(),
        },
      };

      // Update lead
      await prisma.lead.update({
        where: { id: call.leadId },
        data: {
          customFields: mergedFields,
          lastContactedAt: new Date(),
          totalCalls: { increment: 1 },
          ...(qualification.email && !lead.email && { email: qualification.email }),
          ...(qualification.company && !lead.company && { company: qualification.company }),
        },
      });

      // Create call log
      await prisma.callLog.create({
        data: {
          leadId: call.leadId,
          callerId: call.telecallerId,
          phoneNumber: call.phoneNumber,
          direction: 'OUTBOUND',
          callType: 'MANUAL',
          status: 'COMPLETED',
          duration: call.duration || 0,
          recordingUrl: call.recordingUrl,
          transcript: call.transcript,
          notes: call.summary,
          startedAt: call.startedAt || call.createdAt,
          endedAt: call.endedAt || new Date(),
        },
      });

      // Create note with AI summary
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId: call.leadId,
            userId: call.telecallerId,
            content: `**Telecaller Call Summary (AI Generated)**

${call.summary}

**Sentiment:** ${call.sentiment}
**Outcome:** ${call.outcome}
**Telecaller:** ${call.telecaller?.firstName} ${call.telecaller?.lastName}
**Duration:** ${call.duration || 0} seconds`,
            isPinned: call.outcome === 'INTERESTED' || call.outcome === 'CONVERTED',
          },
        });
      }
    } catch (error) {
      console.error('[TelecallerAI] Update lead error:', error);
    }
  }

  /**
   * Create new lead from call
   */
  private async createLeadFromCall(
    call: any,
    qualification: Record<string, any>,
    organizationId: string
  ): Promise<void> {
    try {
      const lead = await prisma.lead.create({
        data: {
          organizationId,
          firstName: qualification.name?.split(' ')[0] || call.contactName || 'Lead',
          lastName: qualification.name?.split(' ').slice(1).join(' ') || '',
          phone: call.phoneNumber,
          email: qualification.email || null,
          company: qualification.company || null,
          source: 'MANUAL',
          sourceDetails: `Telecaller: ${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          priority: call.outcome === 'CONVERTED' ? 'HIGH' : 'MEDIUM',
          customFields: {
            ...qualification,
            createdFromCall: call.id,
            callOutcome: call.outcome,
            callSentiment: call.sentiment,
          },
          totalCalls: 1,
          lastContactedAt: new Date(),
        },
      });

      // Link call to new lead
      await prisma.telecallerCall.update({
        where: { id: call.id },
        data: { leadId: lead.id },
      });

      // Create initial note
      if (call.summary) {
        await prisma.leadNote.create({
          data: {
            leadId: lead.id,
            userId: call.telecallerId,
            content: `**Lead Created from Telecaller Call**

${call.summary}

**Sentiment:** ${call.sentiment}
**Outcome:** ${call.outcome}`,
            isPinned: true,
          },
        });
      }

      // Create activity
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'LEAD_CREATED',
          title: 'Lead Created from Telecaller Call',
          description: `Created from call with outcome: ${call.outcome}`,
          userId: call.telecallerId,
          metadata: {
            callId: call.id,
            outcome: call.outcome,
            sentiment: call.sentiment,
          },
        },
      });

      console.log(`[TelecallerAI] Created new lead ${lead.id} from call ${call.id}`);
    } catch (error) {
      console.error('[TelecallerAI] Create lead error:', error);
    }
  }

  /**
   * Schedule follow-up based on outcome
   */
  private async scheduleFollowUp(call: any): Promise<void> {
    if (!call.leadId || !call.telecallerId) return;

    const needsFollowUp = [
      'INTERESTED',
      'CALLBACK_REQUESTED',
      'NEEDS_FOLLOWUP',
      'BUSY',
      'NO_ANSWER',
      'VOICEMAIL',
    ].includes(call.outcome);

    if (!needsFollowUp) return;

    try {
      // Calculate follow-up date based on outcome
      const scheduledAt = new Date();
      switch (call.outcome) {
        case 'CALLBACK_REQUESTED':
          scheduledAt.setHours(scheduledAt.getHours() + 4);
          break;
        case 'INTERESTED':
          scheduledAt.setDate(scheduledAt.getDate() + 1);
          break;
        case 'BUSY':
          scheduledAt.setHours(scheduledAt.getHours() + 2);
          break;
        case 'NO_ANSWER':
        case 'VOICEMAIL':
          scheduledAt.setHours(scheduledAt.getHours() + 4);
          break;
        default:
          scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      await prisma.followUp.create({
        data: {
          leadId: call.leadId,
          createdById: call.telecallerId,
          assigneeId: call.telecallerId,
          scheduledAt,
          followUpType: 'HUMAN_CALL',
          status: 'UPCOMING',
          message: this.getFollowUpMessage(call.outcome, call.summary),
          notes: `Auto-scheduled based on call outcome: ${call.outcome}`,
        },
      });

      // Update lead with next follow-up date
      await prisma.lead.update({
        where: { id: call.leadId },
        data: { nextFollowUpAt: scheduledAt },
      });

      console.log(`[TelecallerAI] Scheduled follow-up for lead ${call.leadId}`);
    } catch (error) {
      console.error('[TelecallerAI] Schedule follow-up error:', error);
    }
  }

  /**
   * Get appropriate follow-up message
   */
  private getFollowUpMessage(outcome: string, summary: string | null): string {
    const messages: Record<string, string> = {
      CALLBACK_REQUESTED: 'Customer requested callback - follow up as promised',
      INTERESTED: 'Customer showed interest - continue conversation and close',
      NEEDS_FOLLOWUP: 'Conversation incomplete - continue discussion',
      BUSY: 'Customer was busy - call back at a better time',
      NO_ANSWER: 'No answer - try calling again',
      VOICEMAIL: 'Left voicemail - follow up to confirm receipt',
    };

    let message = messages[outcome] || 'Follow up on previous call';
    if (summary) {
      message += `\n\nPrevious call summary: ${summary}`;
    }
    return message;
  }

  /**
   * Update lead score based on call analysis
   */
  private async updateLeadScore(call: any): Promise<void> {
    if (!call.leadId) return;

    try {
      // Calculate scores based on call data
      const engagementScore = this.calculateEngagementScore(call.duration || 0);
      const sentimentScore = this.calculateSentimentScore(call.sentiment);
      const intentScore = this.calculateIntentScore(call.outcome);
      const qualification = (call.qualification as any) || {};
      const qualificationScore = this.calculateQualificationScore(qualification);

      // Weighted overall score
      const overallScore = Math.round(
        engagementScore * 0.2 +
        qualificationScore * 0.25 +
        sentimentScore * 0.25 +
        intentScore * 0.3
      );

      // Determine grade
      const grade = this.determineGrade(overallScore);

      // Determine priority
      const priority = this.determinePriority(call.outcome, overallScore);

      // Upsert lead score
      await prisma.leadScore.upsert({
        where: { leadId: call.leadId },
        create: {
          leadId: call.leadId,
          overallScore,
          engagementScore,
          qualificationScore,
          sentimentScore,
          intentScore,
          grade,
          priority,
          buyingSignals: qualification.buyingSignals || [],
          objections: qualification.objections || [],
          callCount: 1,
          avgCallDuration: call.duration || 0,
          lastInteraction: new Date(),
          aiClassification: this.getAIClassification(overallScore),
          classificationConfidence: 0.85,
        },
        update: {
          overallScore,
          engagementScore,
          qualificationScore,
          sentimentScore,
          intentScore,
          grade,
          priority,
          buyingSignals: qualification.buyingSignals || [],
          objections: qualification.objections || [],
          callCount: { increment: 1 },
          lastInteraction: new Date(),
          aiClassification: this.getAIClassification(overallScore),
        },
      });

      console.log(`[TelecallerAI] Updated lead score for ${call.leadId}: ${overallScore} (${grade})`);
    } catch (error) {
      console.error('[TelecallerAI] Update lead score error:', error);
    }
  }

  private calculateEngagementScore(duration: number): number {
    if (duration > 300) return 100;
    if (duration > 180) return 80;
    if (duration > 60) return 60;
    if (duration > 30) return 40;
    return 20;
  }

  private calculateSentimentScore(sentiment: string): number {
    switch (sentiment) {
      case 'positive': return 85;
      case 'negative': return 25;
      default: return 50;
    }
  }

  private calculateIntentScore(outcome: string): number {
    const scores: Record<string, number> = {
      CONVERTED: 100,
      INTERESTED: 85,
      CALLBACK_REQUESTED: 70,
      NEEDS_FOLLOWUP: 55,
      BUSY: 40,
      NO_ANSWER: 30,
      VOICEMAIL: 30,
      NOT_INTERESTED: 20,
      WRONG_NUMBER: 10,
      DNC_REQUESTED: 0,
    };
    return scores[outcome] || 50;
  }

  private calculateQualificationScore(qualification: any): number {
    const fields = ['name', 'email', 'company', 'budget', 'timeline', 'requirements'];
    let score = 0;
    fields.forEach(field => {
      if (qualification[field]) score += 15;
    });
    return Math.min(score, 100);
  }

  private determineGrade(score: number): string {
    if (score >= 90) return 'A_PLUS';
    if (score >= 75) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 25) return 'D';
    return 'F';
  }

  private determinePriority(outcome: string, score: number): number {
    if (outcome === 'CALLBACK_REQUESTED') return 1;
    if (outcome === 'CONVERTED') return 1;
    if (score >= 80) return 2;
    if (score >= 60) return 3;
    if (score >= 40) return 5;
    return 7;
  }

  private getAIClassification(score: number): string {
    if (score >= 75) return 'hot_lead';
    if (score >= 50) return 'warm_lead';
    if (score >= 25) return 'cold_lead';
    return 'not_qualified';
  }

  /**
   * Log call activity
   */
  private async logCallActivity(call: any): Promise<void> {
    if (!call.leadId) return;

    try {
      await prisma.leadActivity.create({
        data: {
          leadId: call.leadId,
          type: 'CALL_MADE',
          title: 'Telecaller Call Completed (AI Analyzed)',
          description: call.summary || `Call duration: ${call.duration || 0} seconds`,
          userId: call.telecallerId,
          metadata: {
            callId: call.id,
            outcome: call.outcome,
            sentiment: call.sentiment,
            aiAnalyzed: true,
            recordingUrl: call.recordingUrl,
            telecaller: `${call.telecaller?.firstName} ${call.telecaller?.lastName}`,
          },
        },
      });
    } catch (error) {
      console.error('[TelecallerAI] Log activity error:', error);
    }
  }

  /**
   * Update call with error status
   */
  private async updateCallWithError(callId: string, error: string): Promise<void> {
    try {
      await prisma.telecallerCall.update({
        where: { id: callId },
        data: {
          qualification: {
            aiError: error,
            aiAnalyzedAt: new Date().toISOString(),
          },
          aiAnalyzed: false,
        },
      });
    } catch (e) {
      console.error('[TelecallerAI] Error updating call with error:', e);
    }
  }
}

export const telecallerCallFinalizationService = new TelecallerCallFinalizationService();
export default telecallerCallFinalizationService;
