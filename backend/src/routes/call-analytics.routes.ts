import { Router } from 'express';
import { callAnalyticsService } from '../services/call-analytics.service';
import { authenticate } from '../middlewares/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { CallOutcome } from '@prisma/client';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== FUNNEL ANALYTICS ====================

/**
 * @api {get} /call-analytics/funnels/:name Get Funnel Analytics
 */
router.get(
  '/funnels/:name',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate } = req.query;

    const funnelData = await callAnalyticsService.getFunnelAnalytics(
      organizationId,
      req.params.name,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      }
    );

    res.json({ success: true, data: funnelData });
  })
);

/**
 * @api {post} /call-analytics/funnels/track Track Funnel Event
 */
router.post(
  '/funnels/track',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      leadId,
      funnelName,
      stageName,
      stageOrder,
      sourceCallId,
      sourceAgentId,
      previousStage,
      metadata,
    } = req.body;

    if (!stageName || stageOrder === undefined) {
      return res.status(400).json({
        success: false,
        message: 'stageName and stageOrder are required',
      });
    }

    const event = await callAnalyticsService.trackFunnelEvent({
      organizationId,
      leadId,
      funnelName,
      stageName,
      stageOrder,
      sourceCallId,
      sourceAgentId,
      previousStage,
      metadata,
    });

    res.json({ success: true, data: event });
  })
);

/**
 * @api {get} /call-analytics/funnels/lead/:leadId Get Lead Journey
 */
router.get(
  '/funnels/lead/:leadId',
  asyncHandler(async (req, res) => {
    const { funnelName = 'sales' } = req.query;
    const journey = await callAnalyticsService.getLeadJourney(
      req.params.leadId,
      funnelName as string
    );
    res.json({ success: true, data: journey });
  })
);

// ==================== AGENT PERFORMANCE ====================

/**
 * @api {get} /call-analytics/agents/leaderboard Get Agent Leaderboard
 */
router.get(
  '/agents/leaderboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const {
      metric = 'calls',
      startDate,
      endDate,
      limit = '10',
    } = req.query;

    const leaderboard = await callAnalyticsService.getAgentLeaderboard(
      organizationId,
      metric as 'calls' | 'conversions' | 'appointments' | 'payments' | 'sentiment',
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
      }
    );

    res.json({ success: true, data: leaderboard });
  })
);

/**
 * @api {get} /call-analytics/agents/:agentId Get Agent Performance
 */
router.get(
  '/agents/:agentId',
  asyncHandler(async (req, res) => {
    const { days = '30' } = req.query;
    const performance = await callAnalyticsService.getAgentPerformance(
      req.params.agentId,
      parseInt(days as string)
    );
    res.json({ success: true, data: performance });
  })
);

/**
 * @api {post} /call-analytics/agents/aggregate Aggregate Daily Performance
 */
router.post(
  '/agents/aggregate',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { date } = req.body;

    const result = await callAnalyticsService.aggregateDailyPerformance(
      organizationId,
      date ? new Date(date) : new Date()
    );

    res.json({ success: true, data: result });
  })
);

// ==================== OUTCOME ANALYTICS ====================

/**
 * @api {get} /call-analytics/outcomes/distribution Get Outcome Distribution
 */
router.get(
  '/outcomes/distribution',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { startDate, endDate, agentId } = req.query;

    const distribution = await callAnalyticsService.getOutcomeDistribution(
      organizationId,
      {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        agentId: agentId as string,
      }
    );

    res.json({ success: true, data: distribution });
  })
);

/**
 * @api {get} /call-analytics/outcomes/trends Get Outcome Trends
 */
router.get(
  '/outcomes/trends',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30', agentId, outcomes } = req.query;

    const trends = await callAnalyticsService.getOutcomeTrends(
      organizationId,
      parseInt(days as string),
      {
        agentId: agentId as string,
        outcomes: outcomes
          ? (outcomes as string).split(',') as CallOutcome[]
          : undefined,
      }
    );

    res.json({ success: true, data: trends });
  })
);

// ==================== LEAD SOURCES ====================

/**
 * @api {get} /call-analytics/lead-sources Get Lead Sources Analytics
 * Compares Social Media leads vs AI Voice Agent leads
 */
router.get(
  '/lead-sources',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const leadSourcesData = await callAnalyticsService.getLeadSourcesAnalytics(
      organizationId,
      parseInt(days as string)
    );

    res.json({ success: true, data: leadSourcesData });
  })
);

// ==================== DASHBOARD ====================

/**
 * @api {get} /call-analytics/dashboard Get Combined Dashboard Data
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const { organizationId } = req.user!;
    const { days = '30' } = req.query;

    const dashboardData = await callAnalyticsService.getDashboardData(
      organizationId,
      parseInt(days as string)
    );

    res.json({ success: true, data: dashboardData });
  })
);

export default router;
