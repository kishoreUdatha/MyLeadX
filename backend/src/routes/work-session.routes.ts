/**
 * Work Session Routes
 * Handles user work sessions (login/logout) and break management
 */

import { Router, Response } from 'express';
import { workSessionService } from '../services/work-session.service';
import { authenticate, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Start a new work session (called on login)
 */
router.post('/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const metadata = {
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      device: req.body.device,
    };

    const session = await workSessionService.startSession(userId, organizationId, metadata);
    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error starting work session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * End current work session (called on logout)
 */
router.post('/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const session = await workSessionService.endSession(userId, organizationId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'No active session found' });
    }
    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error ending work session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get current active session
 */
router.get('/current', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    console.log('[WorkSession] Getting session for user:', userId, 'name:', req.user?.firstName, req.user?.lastName);

    const session = await workSessionService.getActiveSession(userId, organizationId);

    console.log('[WorkSession] Session status:', session?.status, 'breaks:', session?.breaks?.length || 0);

    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error getting current session:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Start a break
 */
router.post('/break/start', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;
    const { breakType, reason } = req.body;

    const breakRecord = await workSessionService.startBreak(userId, organizationId, breakType, reason);
    res.json({ success: true, data: breakRecord });
  } catch (error: any) {
    console.error('Error starting break:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * End current break
 */
router.post('/break/end', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const breakRecord = await workSessionService.endBreak(userId, organizationId);
    res.json({ success: true, data: breakRecord });
  } catch (error: any) {
    console.error('Error ending break:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

/**
 * Get user's breaks for today or date range
 */
router.get('/breaks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;
    const { startDate, endDate } = req.query;

    const breaks = await workSessionService.getUserBreaks(
      userId,
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: breaks });
  } catch (error: any) {
    console.error('Error getting breaks:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get session summary for reporting (managers/admins)
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { userId, startDate, endDate } = req.query;

    const summary = await workSessionService.getSessionSummary({
      organizationId,
      userId: userId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    });
    res.json({ success: true, data: summary });
  } catch (error: any) {
    console.error('Error getting session summary:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get organization-wide stats
 */
router.get('/org-stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { startDate, endDate } = req.query;

    const stats = await workSessionService.getOrganizationStats(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Error getting org stats:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Add active time (called after completing a call or activity)
 */
router.post('/add-active-time', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;
    const { seconds } = req.body;

    if (!seconds || typeof seconds !== 'number') {
      return res.status(400).json({ success: false, error: 'seconds is required and must be a number' });
    }

    const session = await workSessionService.addActiveTime(userId, organizationId, seconds);
    res.json({ success: true, data: session });
  } catch (error: any) {
    console.error('Error adding active time:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get session history for reporting (login report)
 */
router.get('/history', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;
    const { startDate, endDate } = req.query;

    const sessions = await workSessionService.getSessionHistory(
      organizationId,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );
    res.json({ success: true, data: { sessions } });
  } catch (error: any) {
    console.error('Error getting session history:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Get team work status (for admins/managers)
 * Shows who is active, on break, or offline
 */
router.get('/team-status', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const organizationId = req.user!.organizationId;

    // Check if user is admin/manager
    const userRole = req.user?.roleSlug?.toLowerCase() || '';
    const isAdminOrManager = ['admin', 'manager', 'team_lead', 'super_admin', 'org_admin'].some(r =>
      userRole.includes(r.replace('_', ''))
    );

    if (!isAdminOrManager) {
      return res.status(403).json({ success: false, error: 'Not authorized to view team status' });
    }

    const status = await workSessionService.getTeamWorkStatus(organizationId);

    console.log('[WorkSession] Team status:', {
      active: status.active.length,
      onBreak: status.onBreak.length,
      offline: status.offline.length
    });

    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Error getting team work status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
