import { Router, Request, Response } from 'express';
import { query, body, param } from 'express-validator';
import { validate } from '../middlewares/validate';
import { platformRealtimeService } from '../services/platform-realtime.service';
import { tenantIntelligenceService } from '../services/tenant-intelligence.service';
import { platformFinancialService } from '../services/platform-financial.service';
import { featureFlagsService } from '../services/feature-flags.service';
import { platformComplianceService } from '../services/platform-compliance.service';
import { platformSystemService } from '../services/platform-system.service';
import { whiteLabelService } from '../services/white-label.service';
import { supportToolsService } from '../services/support-tools.service';

const router = Router();

// ==================== REAL-TIME MONITORING ====================

/**
 * GET /realtime/overview - Get real-time platform overview
 */
router.get('/realtime/overview', async (req: Request, res: Response) => {
  try {
    const overview = await platformRealtimeService.getPlatformOverview();
    res.json({ success: true, data: overview });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /realtime/active-users - Get currently active users
 */
router.get('/realtime/active-users', async (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 15;
    const data = await platformRealtimeService.getActiveUsers(minutes);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /realtime/ongoing-calls - Get ongoing calls
 */
router.get('/realtime/ongoing-calls', async (req: Request, res: Response) => {
  try {
    const data = await platformRealtimeService.getOngoingCalls();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /realtime/messages - Get recent message activity
 */
router.get('/realtime/messages', async (req: Request, res: Response) => {
  try {
    const minutes = parseInt(req.query.minutes as string) || 60;
    const data = await platformRealtimeService.getMessageActivity(minutes);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /realtime/activity-feed - Get live activity feed
 */
router.get('/realtime/activity-feed', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const data = await platformRealtimeService.getLiveActivityFeed(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /realtime/system-health - Get system health metrics
 */
router.get('/realtime/system-health', async (req: Request, res: Response) => {
  try {
    const data = await platformRealtimeService.getSystemHealth();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TENANT INTELLIGENCE ====================

/**
 * GET /intelligence/health-scores - Get all tenant health scores
 */
router.get('/intelligence/health-scores', async (req: Request, res: Response) => {
  try {
    const data = await tenantIntelligenceService.calculateAllTenantHealthScores();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /intelligence/health-scores/:orgId - Get health score for specific tenant
 */
router.get('/intelligence/health-scores/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await tenantIntelligenceService.calculateTenantHealthScore(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /intelligence/at-risk - Get tenants at risk of churning
 */
router.get('/intelligence/at-risk', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const data = await tenantIntelligenceService.getAtRiskTenants(limit);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /intelligence/engagement/:orgId - Get tenant engagement metrics
 */
router.get('/intelligence/engagement/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await tenantIntelligenceService.getTenantEngagement(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /intelligence/feature-adoption - Get platform feature adoption stats
 */
router.get('/intelligence/feature-adoption', async (req: Request, res: Response) => {
  try {
    const data = await tenantIntelligenceService.getFeatureAdoption();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /intelligence/recommendations - Get growth recommendations
 */
router.get('/intelligence/recommendations', async (req: Request, res: Response) => {
  try {
    const data = await tenantIntelligenceService.getGrowthRecommendations();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FINANCIAL MANAGEMENT ====================

/**
 * GET /financial/pricing - Get all tenant pricing configurations
 */
router.get('/financial/pricing', async (req: Request, res: Response) => {
  try {
    const data = await platformFinancialService.getAllTenantPricing();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /financial/pricing/:orgId - Set custom pricing for tenant
 */
router.post('/financial/pricing/:orgId', validate([
  body('discount').isNumeric().withMessage('Discount must be a number'),
  body('discountType').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
]), async (req: Request, res: Response) => {
  try {
    const { discount, discountType, validUntil, notes } = req.body;
    const data = await platformFinancialService.setTenantPricing(
      req.params.orgId,
      discount,
      discountType,
      validUntil ? new Date(validUntil) : undefined,
      notes
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /financial/failed-payments - Get failed payment alerts
 */
router.get('/financial/failed-payments', async (req: Request, res: Response) => {
  try {
    const data = await platformFinancialService.getFailedPaymentAlerts();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /financial/forecast - Get revenue forecast
 */
router.get('/financial/forecast', async (req: Request, res: Response) => {
  try {
    const data = await platformFinancialService.getRevenueForecast();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /financial/mrr - Get current MRR
 */
router.get('/financial/mrr', async (req: Request, res: Response) => {
  try {
    const mrr = await platformFinancialService.calculateCurrentMRR();
    const byPlan = await platformFinancialService.getRevenueByPlan();
    res.json({ success: true, data: { mrr, byPlan } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /financial/trends - Get revenue trends
 */
router.get('/financial/trends', async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query.months as string) || 12;
    const data = await platformFinancialService.getRevenueTrends(months);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== FEATURE FLAGS ====================

/**
 * GET /feature-flags - Get all feature flags
 */
router.get('/feature-flags', async (req: Request, res: Response) => {
  try {
    const data = await featureFlagsService.getAllFeatureFlags();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PATCH /feature-flags/:key - Update feature flag
 */
router.patch('/feature-flags/:key', async (req: Request, res: Response) => {
  try {
    const data = await featureFlagsService.updateFeatureFlag(req.params.key, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /feature-flags/tenant/:orgId - Get features for a tenant
 */
router.get('/feature-flags/tenant/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await featureFlagsService.getTenantFeatures(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /feature-flags/override/:orgId - Set feature override for tenant
 */
router.post('/feature-flags/override/:orgId', validate([
  body('featureKey').notEmpty().withMessage('Feature key required'),
  body('value').isBoolean().withMessage('Value must be boolean'),
]), async (req: Request, res: Response) => {
  try {
    const { featureKey, value, reason, expiresAt } = req.body;
    const data = await featureFlagsService.setTenantOverride(
      req.params.orgId,
      featureKey,
      value,
      reason,
      expiresAt ? new Date(expiresAt) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /feature-flags/override/:orgId/:featureKey - Remove feature override
 */
router.delete('/feature-flags/override/:orgId/:featureKey', async (req: Request, res: Response) => {
  try {
    await featureFlagsService.removeTenantOverride(req.params.orgId, req.params.featureKey);
    res.json({ success: true, message: 'Override removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /feature-flags/stats - Get feature flag statistics
 */
router.get('/feature-flags/stats', async (req: Request, res: Response) => {
  try {
    const data = await featureFlagsService.getFeatureFlagStats();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== COMPLIANCE & SECURITY ====================

/**
 * POST /compliance/gdpr/export - Create GDPR export request
 */
router.post('/compliance/gdpr/export', validate([
  body('organizationId').isUUID().withMessage('Valid organization ID required'),
]), async (req: Request, res: Response) => {
  try {
    const { organizationId } = req.body;
    const superAdmin = (req as any).superAdmin;
    const data = await platformComplianceService.createGDPRExportRequest(
      organizationId,
      superAdmin?.userId || superAdmin?.superAdminId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /compliance/gdpr/exports - Get all GDPR export requests
 */
router.get('/compliance/gdpr/exports', async (req: Request, res: Response) => {
  try {
    const data = await platformComplianceService.getGDPRExportRequests();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /compliance/incidents - Get security incidents
 */
router.get('/compliance/incidents', async (req: Request, res: Response) => {
  try {
    const { status, severity } = req.query;
    const data = await platformComplianceService.getSecurityIncidents(
      status as string,
      severity as string
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /compliance/incidents - Create security incident
 */
router.post('/compliance/incidents', async (req: Request, res: Response) => {
  try {
    const data = await platformComplianceService.createSecurityIncident(req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /compliance/access-logs - Get access logs
 */
router.get('/compliance/access-logs', async (req: Request, res: Response) => {
  try {
    const { organizationId, userId, action, startDate, endDate, page, limit } = req.query;
    const data = await platformComplianceService.getAccessLogs(
      {
        organizationId: organizationId as string,
        userId: userId as string,
        action: action as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      },
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );
    res.json({ success: true, ...data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /compliance/ip-whitelist/:orgId - Get IP whitelist for tenant
 */
router.get('/compliance/ip-whitelist/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await platformComplianceService.getIPWhitelist(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /compliance/ip-whitelist/:orgId - Add IP to whitelist
 */
router.post('/compliance/ip-whitelist/:orgId', validate([
  body('ipAddress').notEmpty().withMessage('IP address required'),
  body('description').notEmpty().withMessage('Description required'),
]), async (req: Request, res: Response) => {
  try {
    const { ipAddress, description, expiresAt } = req.body;
    const superAdmin = (req as any).superAdmin;
    const data = await platformComplianceService.addIPToWhitelist(
      req.params.orgId,
      ipAddress,
      description,
      superAdmin?.userId || superAdmin?.superAdminId,
      expiresAt ? new Date(expiresAt) : undefined
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /compliance/summary - Get compliance summary
 */
router.get('/compliance/summary', async (req: Request, res: Response) => {
  try {
    const data = await platformComplianceService.getComplianceSummary();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SYSTEM ADMINISTRATION ====================

/**
 * GET /system/overview - Get system overview
 */
router.get('/system/overview', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getSystemOverview();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/database - Get database health
 */
router.get('/system/database', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getDatabaseHealth();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/queues - Get queue statuses
 */
router.get('/system/queues', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getQueueStatuses();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/jobs - Get scheduled job statuses
 */
router.get('/system/jobs', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getJobStatuses();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/metrics - Get system metrics
 */
router.get('/system/metrics', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getSystemMetrics();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/rate-limits - Get rate limit configs
 */
router.get('/system/rate-limits', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.getRateLimitConfigs();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /system/maintenance - Set maintenance mode
 */
router.post('/system/maintenance', async (req: Request, res: Response) => {
  try {
    const { enabled, message } = req.body;
    await platformSystemService.setMaintenanceMode(enabled, message);
    res.json({ success: true, message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /system/maintenance - Get maintenance status
 */
router.get('/system/maintenance', async (req: Request, res: Response) => {
  try {
    const data = platformSystemService.isMaintenanceModeActive();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /system/maintenance/schedule - Schedule maintenance window
 */
router.post('/system/maintenance/schedule', async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;
    const data = await platformSystemService.scheduleMaintenanceWindow({
      ...req.body,
      createdBy: superAdmin?.userId || superAdmin?.superAdminId,
      startTime: new Date(req.body.startTime),
      endTime: new Date(req.body.endTime),
    });
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /system/backup - Trigger manual backup
 */
router.post('/system/backup', async (req: Request, res: Response) => {
  try {
    const data = await platformSystemService.triggerBackup();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== WHITE-LABEL MANAGEMENT ====================

/**
 * GET /white-label - Get all tenant white-label configs
 */
router.get('/white-label', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.getAllWhiteLabelConfigs();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /white-label/:orgId - Get white-label config for specific tenant
 */
router.get('/white-label/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.getTenantWhiteLabelConfig(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /white-label/:orgId/branding - Update tenant branding
 */
router.put('/white-label/:orgId/branding', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.updateBranding(req.params.orgId, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /white-label/:orgId/domain - Set up custom domain
 */
router.post('/white-label/:orgId/domain', validate([
  body('domain').notEmpty().withMessage('Domain is required'),
]), async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.setupCustomDomain(req.params.orgId, req.body.domain);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /white-label/:orgId/domain/verify - Verify custom domain DNS
 */
router.post('/white-label/:orgId/domain/verify', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.verifyCustomDomain(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /white-label/:orgId/domain/ssl - Provision SSL for custom domain
 */
router.post('/white-label/:orgId/domain/ssl', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.provisionSSL(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /white-label/:orgId/domain - Remove custom domain
 */
router.delete('/white-label/:orgId/domain', async (req: Request, res: Response) => {
  try {
    await whiteLabelService.removeCustomDomain(req.params.orgId);
    res.json({ success: true, message: 'Custom domain removed' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /white-label/:orgId/email-templates - Update email templates
 */
router.put('/white-label/:orgId/email-templates', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.updateEmailTemplates(req.params.orgId, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /white-label/:orgId/login-page - Update login page config
 */
router.put('/white-label/:orgId/login-page', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.updateLoginPage(req.params.orgId, req.body);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /white-label/domains - Get all custom domains
 */
router.get('/white-label/domains/all', async (req: Request, res: Response) => {
  try {
    const data = await whiteLabelService.getAllCustomDomains();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /white-label/:orgId/reset - Reset to defaults
 */
router.post('/white-label/:orgId/reset', async (req: Request, res: Response) => {
  try {
    await whiteLabelService.resetToDefaults(req.params.orgId);
    res.json({ success: true, message: 'White-label config reset to defaults' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /white-label/:orgId/preview - Generate preview URL
 */
router.get('/white-label/:orgId/preview', async (req: Request, res: Response) => {
  try {
    const previewUrl = await whiteLabelService.generatePreviewUrl(req.params.orgId);
    res.json({ success: true, data: { previewUrl } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== SUPPORT TOOLS ====================

/**
 * POST /support/impersonate - Start impersonation session
 */
router.post('/support/impersonate', validate([
  body('userId').isUUID().withMessage('Valid user ID required'),
  body('reason').notEmpty().withMessage('Reason required'),
]), async (req: Request, res: Response) => {
  try {
    const { userId, reason, durationMinutes } = req.body;
    const superAdmin = (req as any).superAdmin;
    const data = await supportToolsService.startImpersonation(
      superAdmin?.userId || superAdmin?.superAdminId,
      superAdmin?.email || 'unknown',
      userId,
      reason,
      durationMinutes
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/impersonate/:sessionId/end - End impersonation session
 */
router.post('/support/impersonate/:sessionId/end', async (req: Request, res: Response) => {
  try {
    await supportToolsService.endImpersonation(req.params.sessionId);
    res.json({ success: true, message: 'Impersonation session ended' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/impersonate/active - Get active impersonation sessions
 */
router.get('/support/impersonate/active', async (req: Request, res: Response) => {
  try {
    const data = await supportToolsService.getActiveImpersonationSessions();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/impersonate/history - Get impersonation history
 */
router.get('/support/impersonate/history', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const data = await supportToolsService.getImpersonationHistory(days);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/debug/:orgId - Get tenant debug info
 */
router.get('/support/debug/:orgId', async (req: Request, res: Response) => {
  try {
    const data = await supportToolsService.getTenantDebugInfo(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/debug/:orgId/diagnostics - Run tenant diagnostics
 */
router.get('/support/debug/:orgId/diagnostics', async (req: Request, res: Response) => {
  try {
    const data = await supportToolsService.runTenantDiagnostics(req.params.orgId);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/debug/:orgId/timeline - Get tenant activity timeline
 */
router.get('/support/debug/:orgId/timeline', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const data = await supportToolsService.getTenantActivityTimeline(req.params.orgId, days);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/recovery - Create data recovery request
 */
router.post('/support/recovery', validate([
  body('organizationId').isUUID().withMessage('Valid organization ID required'),
  body('requestType').isIn(['lead', 'user', 'call', 'message', 'full_backup']).withMessage('Invalid request type'),
  body('reason').notEmpty().withMessage('Reason required'),
  body('targetDate').isISO8601().withMessage('Valid target date required'),
]), async (req: Request, res: Response) => {
  try {
    const { organizationId, requestType, reason, targetDate } = req.body;
    const superAdmin = (req as any).superAdmin;
    const data = await supportToolsService.createRecoveryRequest(
      organizationId,
      requestType,
      superAdmin?.userId || superAdmin?.superAdminId,
      reason,
      new Date(targetDate)
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /support/recovery - Get recovery requests
 */
router.get('/support/recovery', async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const data = await supportToolsService.getRecoveryRequests(status as string);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/recovery/:requestId/approve - Approve recovery request
 */
router.post('/support/recovery/:requestId/approve', async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;
    const data = await supportToolsService.approveRecoveryRequest(
      req.params.requestId,
      superAdmin?.userId || superAdmin?.superAdminId
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/users/:userId/reset-password - Reset user password
 */
router.post('/support/users/:userId/reset-password', validate([
  body('reason').notEmpty().withMessage('Reason required'),
]), async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;
    const data = await supportToolsService.resetUserPassword(
      req.params.userId,
      superAdmin?.userId || superAdmin?.superAdminId,
      req.body.reason
    );
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/users/:userId/unlock - Unlock user account
 */
router.post('/support/users/:userId/unlock', validate([
  body('reason').notEmpty().withMessage('Reason required'),
]), async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;
    await supportToolsService.unlockUserAccount(
      req.params.userId,
      superAdmin?.userId || superAdmin?.superAdminId,
      req.body.reason
    );
    res.json({ success: true, message: 'User account unlocked' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /support/users/:userId/force-logout - Force logout user
 */
router.post('/support/users/:userId/force-logout', validate([
  body('reason').notEmpty().withMessage('Reason required'),
]), async (req: Request, res: Response) => {
  try {
    const superAdmin = (req as any).superAdmin;
    await supportToolsService.forceLogoutUser(
      req.params.userId,
      superAdmin?.userId || superAdmin?.superAdminId,
      req.body.reason
    );
    res.json({ success: true, message: 'User logged out from all sessions' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
