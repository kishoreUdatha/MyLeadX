import { Router } from 'express';
import { platformAnalyticsController } from '../controllers/platform-analytics.controller';
import { authenticate } from '../middlewares/auth';
import { requireSuperAdmin } from '../middlewares/tenant-isolation';

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin);

router.get('/channel-breakdown', platformAnalyticsController.channelBreakdown.bind(platformAnalyticsController));
router.get('/conversion-funnel', platformAnalyticsController.conversionFunnel.bind(platformAnalyticsController));
router.get('/sales-rep-leaderboard', platformAnalyticsController.salesRepLeaderboard.bind(platformAnalyticsController));
router.get('/daily-prospects', platformAnalyticsController.dailyProspectCounts.bind(platformAnalyticsController));

export default router;
