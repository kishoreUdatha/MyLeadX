import { Router } from 'express';
import { platformAnalyticsController } from '../controllers/platform-analytics.controller';
import { verifySuperAdmin } from '../middlewares/super-admin-auth';

const router = Router();

router.use(verifySuperAdmin);

router.get('/channel-breakdown', platformAnalyticsController.channelBreakdown.bind(platformAnalyticsController));
router.get('/conversion-funnel', platformAnalyticsController.conversionFunnel.bind(platformAnalyticsController));
router.get('/sales-rep-leaderboard', platformAnalyticsController.salesRepLeaderboard.bind(platformAnalyticsController));
router.get('/daily-prospects', platformAnalyticsController.dailyProspectCounts.bind(platformAnalyticsController));

export default router;
