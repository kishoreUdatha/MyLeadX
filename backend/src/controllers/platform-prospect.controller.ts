/**
 * Platform Prospect Controller — SaaS sales for MyLeadX
 *
 * Super-admin-only endpoints for managing prospects (Meta/Google/LinkedIn ads,
 * organic forms, referrals, manual entry).
 */

import { Request, Response, NextFunction } from 'express';
import { platformProspectService } from '../services/platform-prospect.service';
import { prospectConversionService } from '../services/prospect-conversion.service';
import { ApiResponse } from '../utils/apiResponse';
import {
  ProspectSource,
  ProspectStage,
  ProspectActivityType,
  BillingCycle,
} from '@prisma/client';

export class PlatformProspectController {
  /**
   * PUBLIC — create a prospect from a marketing form submission.
   * No auth required (this is called from myleadx.ai or tenant landing pages).
   */
  async createPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        fullName,
        email,
        phone,
        companyName,
        designation,
        teamSize,
        industry,
        currentCrm,
        source,
        campaign,
        medium,
        utmContent,
        utmTerm,
        adId,
        adName,
        landingPageId,
        referrerUrl,
        eventName,
        rawData,
      } = req.body;

      if (!fullName || !email || !phone) {
        return ApiResponse.badRequest(res, 'fullName, email, and phone are required');
      }

      const validatedSource = this.validateSource(source) ?? ProspectSource.ORGANIC;

      const result = await platformProspectService.create({
        fullName,
        email,
        phone,
        companyName,
        designation,
        teamSize,
        industry,
        currentCrm,
        source: validatedSource,
        campaign,
        medium,
        utmContent,
        utmTerm,
        adId,
        adName,
        landingPageId,
        referrerUrl,
        eventName,
        ipAddress: req.ip,
        userAgent: req.get('user-agent') ?? undefined,
        rawData,
      });

      return ApiResponse.created(res, 'Prospect captured successfully', {
        id: result.prospect.id,
        isDuplicate: result.isDuplicate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * SUPER-ADMIN — list prospects with filters.
   */
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        source,
        stage,
        assignedToId,
        search,
        fromDate,
        toDate,
        page,
        pageSize,
      } = req.query;

      const result = await platformProspectService.findAll({
        source: this.validateSource(source as string),
        stage: this.validateStage(stage as string),
        assignedToId: assignedToId as string | undefined,
        search: search as string | undefined,
        fromDate: fromDate ? new Date(fromDate as string) : undefined,
        toDate: toDate ? new Date(toDate as string) : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        pageSize: pageSize ? parseInt(pageSize as string, 10) : undefined,
      });

      return ApiResponse.success(res, 'Prospects retrieved', result);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const prospect = await platformProspectService.findById(id);
      return ApiResponse.success(res, 'Prospect retrieved', prospect);
    } catch (error) {
      next(error);
    }
  }

  /**
   * SUPER-ADMIN — manually create a prospect (offline lead, cold outreach, etc.).
   */
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await platformProspectService.create({
        ...req.body,
        source: this.validateSource(req.body.source) ?? ProspectSource.MANUAL,
        rawData: { createdManuallyBy: req.user!.id },
      });

      return ApiResponse.created(res, 'Prospect created', {
        id: result.prospect.id,
        isDuplicate: result.isDuplicate,
      });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await platformProspectService.update(id, req.body, req.user!.id);
      return ApiResponse.success(res, 'Prospect updated', updated);
    } catch (error) {
      next(error);
    }
  }

  async changeStage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { stage, reason } = req.body;
      const validatedStage = this.validateStage(stage);
      if (!validatedStage) {
        return ApiResponse.badRequest(res, 'Invalid stage value');
      }
      const updated = await platformProspectService.changeStage(
        id,
        validatedStage,
        req.user!.id,
        reason,
      );
      return ApiResponse.success(res, 'Stage changed', updated);
    } catch (error) {
      next(error);
    }
  }

  async assign(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { userId } = req.body;
      const updated = await platformProspectService.assignTo(id, userId ?? null, req.user!.id);
      return ApiResponse.success(res, 'Assignment updated', updated);
    } catch (error) {
      next(error);
    }
  }

  async logActivity(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { type, ...activityData } = req.body;
      const validatedType = this.validateActivityType(type);
      if (!validatedType) {
        return ApiResponse.badRequest(res, 'Invalid activity type');
      }
      const activity = await platformProspectService.logActivity(
        id,
        req.user!.id,
        validatedType,
        activityData,
      );
      return ApiResponse.created(res, 'Activity logged', activity);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await platformProspectService.delete(id);
      return ApiResponse.success(res, 'Prospect deleted');
    } catch (error) {
      next(error);
    }
  }

  async pipelineSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await platformProspectService.pipelineSummary();
      return ApiResponse.success(res, 'Pipeline summary', summary);
    } catch (error) {
      next(error);
    }
  }

  async assignableUsers(_req: Request, res: Response, next: NextFunction) {
    try {
      const users = await platformProspectService.assignableUsers();
      return ApiResponse.success(res, 'Assignable users', users);
    } catch (error) {
      next(error);
    }
  }

  async sourceBreakdown(req: Request, res: Response, next: NextFunction) {
    try {
      const { fromDate, toDate } = req.query;
      const breakdown = await platformProspectService.sourceBreakdown(
        fromDate ? new Date(fromDate as string) : undefined,
        toDate ? new Date(toDate as string) : undefined,
      );
      return ApiResponse.success(res, 'Source breakdown', breakdown);
    } catch (error) {
      next(error);
    }
  }

  async convertToTenant(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { planId, trialDurationDays, billingCycle } = req.body;

      const result = await prospectConversionService.convert({
        prospectId: id,
        actorUserId: req.user!.id,
        planId,
        trialDurationDays,
        billingCycle: billingCycle as BillingCycle | undefined,
      });

      return ApiResponse.success(res, 'Prospect converted to tenant', result);
    } catch (error) {
      next(error);
    }
  }

  private validateSource(value?: string): ProspectSource | undefined {
    if (!value) return undefined;
    return Object.values(ProspectSource).includes(value as ProspectSource)
      ? (value as ProspectSource)
      : undefined;
  }

  private validateStage(value?: string): ProspectStage | undefined {
    if (!value) return undefined;
    return Object.values(ProspectStage).includes(value as ProspectStage)
      ? (value as ProspectStage)
      : undefined;
  }

  private validateActivityType(value?: string): ProspectActivityType | undefined {
    if (!value) return undefined;
    return Object.values(ProspectActivityType).includes(value as ProspectActivityType)
      ? (value as ProspectActivityType)
      : undefined;
  }
}

export const platformProspectController = new PlatformProspectController();
