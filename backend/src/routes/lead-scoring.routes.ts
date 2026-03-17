import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { leadScoringService } from '../services/advanced-features.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import OpenAI from 'openai';

const router = Router();
const prisma = new PrismaClient();
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// All routes require authentication
router.use(authenticate);

/**
 * @api {get} /lead-scoring/leads Get Scored Leads
 */
router.get(
  '/leads',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      grade,
      minScore,
      maxScore,
      aiClassification,
      sortBy = 'overallScore',
      sortOrder = 'desc',
      page = '1',
      limit = '50',
    } = req.query;

    const where: any = {
      lead: { organizationId },
    };

    if (grade) where.grade = grade;
    if (aiClassification) where.aiClassification = aiClassification;
    if (minScore || maxScore) {
      where.overallScore = {};
      if (minScore) where.overallScore.gte = parseInt(minScore as string);
      if (maxScore) where.overallScore.lte = parseInt(maxScore as string);
    }

    const orderBy: any = {};
    orderBy[sortBy as string] = sortOrder;

    const [scores, total] = await Promise.all([
      prisma.leadScore.findMany({
        where,
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
        orderBy,
        include: {
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              source: true,
              stage: { select: { id: true, name: true, color: true } },
            },
          },
        },
      }),
      prisma.leadScore.count({ where }),
    ]);

    res.json({
      success: true,
      data: scores,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/leads/:leadId Get Lead Score
 */
router.get(
  '/leads/:leadId',
  asyncHandler(async (req, res) => {
    const score = await leadScoringService.getLeadScore(req.params.leadId);

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'Lead score not found',
      });
    }

    res.json({ success: true, data: score });
  })
);

/**
 * @api {post} /lead-scoring/classify/:callId Classify Lead from Call
 */
router.post(
  '/classify/:callId',
  asyncHandler(async (req, res) => {
    const call = await prisma.outboundCall.findUnique({
      where: { id: req.params.callId },
      include: { agent: true },
    });

    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found',
      });
    }

    if (!call.generatedLeadId) {
      return res.status(400).json({
        success: false,
        message: 'No lead associated with this call',
      });
    }

    // Get or create lead score
    let leadScore = await prisma.leadScore.findUnique({
      where: { leadId: call.generatedLeadId },
    });

    // AI Classification
    let aiClassification = 'cold_lead';
    let classificationConfidence = 0;

    if (openai && call.summary) {
      try {
        const completion = await openai.chat.completions.create({
          model: process.env.OPENAI_CHAT_MODEL || 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Classify this sales call lead based on the summary. Return JSON with:
- classification: one of "hot_lead", "warm_lead", "cold_lead", "not_qualified"
- confidence: number 0-1 indicating confidence
- reasoning: brief explanation

Definitions:
- hot_lead: Ready to buy, high intent, asked about pricing/next steps
- warm_lead: Interested but needs nurturing, asked questions, positive sentiment
- cold_lead: Low interest, hesitant, many objections
- not_qualified: Wrong fit, not the right person, unreachable`,
            },
            {
              role: 'user',
              content: `Call Summary: ${call.summary}\nOutcome: ${call.outcome}\nSentiment: ${call.sentiment}\nDuration: ${call.duration} seconds`,
            },
          ],
          temperature: 0,
          response_format: { type: 'json_object' },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
        aiClassification = result.classification || 'cold_lead';
        classificationConfidence = result.confidence || 0;
      } catch (error) {
        console.error('AI classification failed:', error);
      }
    }

    // Calculate demographic and behavior scores
    const lead = await prisma.lead.findUnique({
      where: { id: call.generatedLeadId },
      include: {
        callLogs: { select: { id: true } },
        emailLogs: { select: { id: true } },
        activities: { select: { id: true } },
      },
    });

    // Demographic score (0-100) based on profile completeness
    let demographicScore = 0;
    if (lead) {
      if (lead.email) demographicScore += 20;
      if (lead.phone) demographicScore += 20;
      if (lead.firstName && lead.lastName) demographicScore += 15;
      if (lead.city || lead.state) demographicScore += 15;
      if (lead.courseId) demographicScore += 15;
      if (lead.customFields && Object.keys(lead.customFields as object).length > 0) demographicScore += 15;
    }

    // Behavior score (0-100) based on engagement
    let behaviorScore = 0;
    if (lead) {
      const callCount = lead.callLogs?.length || 0;
      const emailCount = lead.emailLogs?.length || 0;
      const activityCount = lead.activities?.length || 0;

      behaviorScore = Math.min(
        (callCount * 15) + (emailCount * 10) + (activityCount * 5),
        100
      );
    }

    // Update lead score with AI classification
    leadScore = await prisma.leadScore.upsert({
      where: { leadId: call.generatedLeadId },
      create: {
        leadId: call.generatedLeadId,
        aiClassification,
        classificationConfidence,
        demographicScore,
        behaviorScore,
        lastCalculatedAt: new Date(),
      },
      update: {
        aiClassification,
        classificationConfidence,
        demographicScore,
        behaviorScore,
        lastCalculatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        leadScore,
        classification: {
          aiClassification,
          confidence: classificationConfidence,
          demographicScore,
          behaviorScore,
        },
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/distribution Get Score Distribution
 */
router.get(
  '/distribution',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;

    const [byGrade, byClassification, scoreRanges] = await Promise.all([
      // Distribution by grade
      prisma.leadScore.groupBy({
        by: ['grade'],
        where: { lead: { organizationId } },
        _count: { id: true },
      }),

      // Distribution by AI classification
      prisma.leadScore.groupBy({
        by: ['aiClassification'],
        where: {
          lead: { organizationId },
          aiClassification: { not: null },
        },
        _count: { id: true },
      }),

      // Score ranges
      prisma.$queryRaw`
        SELECT
          CASE
            WHEN "overallScore" >= 80 THEN '80-100'
            WHEN "overallScore" >= 60 THEN '60-79'
            WHEN "overallScore" >= 40 THEN '40-59'
            WHEN "overallScore" >= 20 THEN '20-39'
            ELSE '0-19'
          END as range,
          COUNT(*) as count
        FROM "lead_scores" ls
        JOIN "leads" l ON ls."leadId" = l.id
        WHERE l."organizationId" = ${organizationId}
        GROUP BY range
        ORDER BY range DESC
      ` as Promise<{ range: string; count: bigint }[]>,
    ]);

    res.json({
      success: true,
      data: {
        byGrade: byGrade.reduce((acc, item) => {
          acc[item.grade] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        byClassification: byClassification.reduce((acc, item) => {
          if (item.aiClassification) {
            acc[item.aiClassification] = item._count.id;
          }
          return acc;
        }, {} as Record<string, number>),
        scoreRanges: scoreRanges.map(r => ({
          range: r.range,
          count: Number(r.count),
        })),
      },
    });
  })
);

/**
 * @api {get} /lead-scoring/top Get Top Leads
 */
router.get(
  '/top',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { limit = '20' } = req.query;

    const topLeads = await leadScoringService.getTopLeads(
      organizationId,
      parseInt(limit as string)
    );

    res.json({ success: true, data: topLeads });
  })
);

/**
 * @api {post} /lead-scoring/recalculate/:leadId Recalculate Lead Score
 */
router.post(
  '/recalculate/:leadId',
  asyncHandler(async (req, res) => {
    const lead = await prisma.lead.findUnique({
      where: { id: req.params.leadId },
      include: {
        callLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: 'Lead not found',
      });
    }

    // Get the most recent call for this lead
    const recentCall = await prisma.outboundCall.findFirst({
      where: { generatedLeadId: lead.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!recentCall) {
      return res.status(400).json({
        success: false,
        message: 'No calls found for this lead',
      });
    }

    // Calculate score using the existing service
    const score = await leadScoringService.calculateScore(lead.id, {
      transcript: (recentCall.transcript as any[]) || [],
      duration: recentCall.duration || 0,
      sentiment: recentCall.sentiment || 'neutral',
      qualification: recentCall.qualification || {},
      outcome: recentCall.outcome!,
    });

    res.json({ success: true, data: score });
  })
);

export default router;
