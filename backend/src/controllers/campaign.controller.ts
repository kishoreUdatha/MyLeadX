import { Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class CampaignController {
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.create({
        organizationId: req.organizationId!,
        createdById: req.user!.id,
        ...req.body,
      });

      ApiResponse.created(res, 'Campaign created successfully', campaign);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const campaign = await campaignService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Campaign retrieved successfully', campaign);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const { campaigns, total } = await campaignService.findAll(
        req.organizationId!,
        page,
        limit
      );

      ApiResponse.paginated(res, 'Campaigns retrieved successfully', campaigns, page, limit, total);
    } catch (error) {
      next(error);
    }
  }

  async addRecipients(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.addRecipients({
        campaignId: req.params.id,
        recipients: req.body.recipients,
      });

      ApiResponse.success(res, 'Recipients added successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async execute(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await campaignService.execute(
        req.params.id,
        req.organizationId!,
        req.user!.id
      );

      ApiResponse.success(res, 'Campaign executed successfully', result);
    } catch (error) {
      next(error);
    }
  }

  async getStats(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await campaignService.getStats(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Campaign stats retrieved successfully', stats);
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
