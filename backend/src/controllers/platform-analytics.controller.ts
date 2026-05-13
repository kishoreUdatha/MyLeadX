import { Request, Response, NextFunction } from 'express';
import { platformAnalyticsService } from '../services/platform-analytics.service';
import { ApiResponse } from '../utils/apiResponse';
import { ProspectSource } from '@prisma/client';

export class PlatformAnalyticsController {
  private parseRange(req: Request) {
    const { fromDate, toDate } = req.query;
    return {
      fromDate: fromDate ? new Date(fromDate as string) : undefined,
      toDate: toDate ? new Date(toDate as string) : undefined,
    };
  }

  async channelBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformAnalyticsService.channelBreakdown(this.parseRange(req));
      return ApiResponse.success(res, 'Channel breakdown', data);
    } catch (error) {
      next(error);
    }
  }

  async conversionFunnel(req: Request, res: Response, next: NextFunction) {
    try {
      const { source } = req.query;
      const data = await platformAnalyticsService.conversionFunnel(
        source ? (source as ProspectSource) : undefined,
        this.parseRange(req),
      );
      return ApiResponse.success(res, 'Conversion funnel', data);
    } catch (error) {
      next(error);
    }
  }

  async salesRepLeaderboard(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformAnalyticsService.salesRepLeaderboard(this.parseRange(req));
      return ApiResponse.success(res, 'Sales rep leaderboard', data);
    } catch (error) {
      next(error);
    }
  }

  async dailyProspectCounts(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await platformAnalyticsService.dailyProspectCounts(this.parseRange(req));
      return ApiResponse.success(res, 'Daily prospect counts', data);
    } catch (error) {
      next(error);
    }
  }
}

export const platformAnalyticsController = new PlatformAnalyticsController();
