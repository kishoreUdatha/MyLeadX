/**
 * Trial Management Routes
 * Super Admin routes for managing tenant trials
 */

import { Router, Request, Response } from 'express';
import { query, param, body } from 'express-validator';
import { validate } from '../middlewares/validate';
import { trialManagementService } from '../services/trial-management.service';

const router = Router();

/**
 * GET /stats - Get trial statistics overview
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await trialManagementService.getTrialStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('[TrialRoutes] Error getting stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /organizations - Get trial organizations with pagination
 */
router.get('/organizations', validate([
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('filter').optional().isIn(['all', 'expiring_soon', 'expired', 'active']),
  query('search').optional().isString(),
  query('sortBy').optional().isIn(['daysRemaining', 'createdAt', 'name']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
]), async (req: Request, res: Response) => {
  try {
    const result = await trialManagementService.getTrialOrganizations({
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      filter: req.query.filter as any,
      search: req.query.search as string,
      sortBy: req.query.sortBy as any,
      sortOrder: req.query.sortOrder as any,
    });

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error('[TrialRoutes] Error getting organizations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /organizations/:id/extend - Extend trial for an organization
 */
router.post('/organizations/:id/extend', validate([
  param('id').isUUID(),
  body('days').isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90'),
  body('reason').notEmpty().withMessage('Reason is required'),
]), async (req: Request, res: Response) => {
  try {
    const { days, reason } = req.body;
    const actorId = (req as any).superAdmin?.id;

    const result = await trialManagementService.extendTrial(
      req.params.id,
      days,
      reason,
      actorId
    );

    res.json({
      success: true,
      message: `Trial extended by ${days} days`,
      data: result,
    });
  } catch (error: any) {
    console.error('[TrialRoutes] Error extending trial:', error);
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * POST /organizations/:id/send-reminder - Manually send a reminder
 */
router.post('/organizations/:id/send-reminder', validate([
  param('id').isUUID(),
  body('type').isIn(['7_days', '3_days', '1_day', 'expired']).withMessage('Invalid reminder type'),
]), async (req: Request, res: Response) => {
  try {
    const { type } = req.body;
    const sent = await trialManagementService.sendTrialReminder(req.params.id, type);

    if (sent) {
      res.json({ success: true, message: 'Reminder sent successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Failed to send reminder' });
    }
  } catch (error: any) {
    console.error('[TrialRoutes] Error sending reminder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /organizations/:id/expire - Manually expire a trial
 */
router.post('/organizations/:id/expire', validate([
  param('id').isUUID(),
]), async (req: Request, res: Response) => {
  try {
    await trialManagementService.handleExpiredTrial(req.params.id);
    res.json({ success: true, message: 'Trial expired and downgraded to free plan' });
  } catch (error: any) {
    console.error('[TrialRoutes] Error expiring trial:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /conversion-funnel - Get conversion funnel data
 */
router.get('/conversion-funnel', validate([
  query('months').optional().isInt({ min: 1, max: 12 }),
]), async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 3;
    const data = await trialManagementService.getConversionFunnel(months);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[TrialRoutes] Error getting conversion funnel:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /process-reminders - Manually trigger reminder processing (for testing)
 */
router.post('/process-reminders', async (req: Request, res: Response) => {
  try {
    const results = await trialManagementService.processTrialReminders();
    res.json({
      success: true,
      message: 'Reminders processed',
      data: results,
    });
  } catch (error: any) {
    console.error('[TrialRoutes] Error processing reminders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
