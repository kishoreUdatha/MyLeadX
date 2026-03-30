import { Router, Request, Response, NextFunction } from 'express';
import { emailTrackingService } from '../services/email-tracking.service';
import { authenticate, authorize } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

// Tracking pixel endpoint (public, no auth)
router.get('/pixel/:token.gif', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.headers['x-forwarded-for'] as string;

    // Record the open event asynchronously
    emailTrackingService.recordOpen(token, userAgent, ip).catch(console.error);

    // Always return the pixel, even if tracking fails
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRACKING_PIXEL.length,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.send(TRACKING_PIXEL);
  } catch (error) {
    // Still return pixel on error
    res.set('Content-Type', 'image/gif');
    res.send(TRACKING_PIXEL);
  }
});

// Click tracking endpoint (public, no auth)
router.get('/click/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { url } = req.query;
    const userAgent = req.headers['user-agent'];
    const ip = req.ip || req.headers['x-forwarded-for'] as string;

    if (!url || typeof url !== 'string') {
      return res.status(400).send('Missing URL parameter');
    }

    const decodedUrl = decodeURIComponent(url);

    // Record the click event asynchronously
    emailTrackingService.recordClick(token, decodedUrl, userAgent, ip).catch(console.error);

    // Redirect to the original URL
    res.redirect(302, decodedUrl);
  } catch (error) {
    console.error('Click tracking error:', error);
    // Redirect to homepage on error
    res.redirect(302, '/');
  }
});

// Protected routes for analytics
router.use(authenticate);
router.use(tenantMiddleware);

// Get email tracking stats
router.get(
  '/stats/:emailLogId',
  authorize('admin', 'counselor'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await emailTrackingService.getEmailStats(req.params.emailLogId);

      if (!stats) {
        return ApiResponse.notFound(res, 'Email log not found');
      }

      ApiResponse.success(res, 'Email stats retrieved', stats);
    } catch (error) {
      next(error);
    }
  }
);

// Get campaign tracking stats
router.get(
  '/campaign/:campaignId',
  authorize('admin', 'counselor'),
  async (req: TenantRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await emailTrackingService.getCampaignStats(req.params.campaignId);
      ApiResponse.success(res, 'Campaign stats retrieved', stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
