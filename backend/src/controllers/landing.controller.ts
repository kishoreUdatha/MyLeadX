import { Request, Response, NextFunction } from 'express';
import { landingPageService } from '../services/landingPage.service';
import { ApiResponse } from '../utils/apiResponse';

export class LandingPageController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, slug, title, description, content, styles, seoSettings, formId } = req.body;
      const organizationId = req.user!.organizationId;

      const landingPage = await landingPageService.create({
        organizationId,
        name,
        slug,
        title,
        description,
        content,
        styles,
        seoSettings,
        formId,
      });

      return ApiResponse.created(res, 'Landing page created successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user!.organizationId;
      const landingPages = await landingPageService.findAll(organizationId);

      return ApiResponse.success(res, 'Landing pages retrieved successfully', landingPages);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const landingPage = await landingPageService.findById(id, organizationId);

      return ApiResponse.success(res, 'Landing page retrieved successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }

  async getPublic(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgSlug, pageSlug } = req.params;

      const landingPage = await landingPageService.findBySlug(orgSlug, pageSlug);

      return ApiResponse.success(res, 'Landing page retrieved successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;
      const { name, slug, title, description, content, styles, seoSettings, formId, isPublished } = req.body;

      const landingPage = await landingPageService.update(id, organizationId, {
        name,
        slug,
        title,
        description,
        content,
        styles,
        seoSettings,
        formId,
        isPublished,
      });

      return ApiResponse.success(res, 'Landing page updated successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      await landingPageService.delete(id, organizationId);

      return ApiResponse.success(res, 'Landing page deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async publish(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const landingPage = await landingPageService.publish(id, organizationId);

      return ApiResponse.success(res, 'Landing page published successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }

  async unpublish(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const organizationId = req.user!.organizationId;

      const landingPage = await landingPageService.unpublish(id, organizationId);

      return ApiResponse.success(res, 'Landing page unpublished successfully', landingPage);
    } catch (error) {
      next(error);
    }
  }
}

export const landingPageController = new LandingPageController();
