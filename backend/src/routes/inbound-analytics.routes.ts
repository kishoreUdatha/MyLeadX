import { Router, Response } from 'express';
import { inboundAnalyticsService } from '../services/inbound-analytics.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware, TenantRequest } from '../middlewares/tenant';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Live dashboard
router.get('/live', async (req: TenantRequest, res: Response) => {
  try {
    const dashboard = await inboundAnalyticsService.getLiveDashboard(
      req.organizationId!
    );
    return ApiResponse.success(res, dashboard);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Call volume over time
router.get('/call-volume', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, queueId, ivrFlowId } = req.query;

    const data = await inboundAnalyticsService.getCallVolume({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      queueId: queueId as string,
      ivrFlowId: ivrFlowId as string,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Hourly distribution
router.get('/hourly-distribution', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getHourlyDistribution({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Queue metrics
router.get('/queue-metrics', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, queueId } = req.query;

    const metrics = await inboundAnalyticsService.getQueueMetrics({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      queueId: queueId as string,
    });

    return ApiResponse.success(res, metrics);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Queue service levels
router.get('/service-levels', async (req: TenantRequest, res: Response) => {
  try {
    const data = await inboundAnalyticsService.getQueueServiceLevels(
      req.organizationId!
    );
    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Agent performance
router.get('/agent-performance', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getAgentPerformance({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// IVR metrics
router.get('/ivr-metrics', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo, ivrFlowId } = req.query;

    const metrics = await inboundAnalyticsService.getIvrMetrics({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      ivrFlowId: ivrFlowId as string,
    });

    return ApiResponse.success(res, metrics);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Call outcomes
router.get('/call-outcomes', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.getCallOutcomes({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

// Export call logs
router.get('/export', async (req: TenantRequest, res: Response) => {
  try {
    const { dateFrom, dateTo } = req.query;

    const data = await inboundAnalyticsService.exportCallLogs({
      organizationId: req.organizationId!,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });

    return ApiResponse.success(res, data);
  } catch (error: any) {
    return ApiResponse.error(res, error.message);
  }
});

export default router;
