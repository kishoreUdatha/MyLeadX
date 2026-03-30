import { Response, NextFunction, Request } from 'express';
import { formService } from '../services/form.service';
import { ApiResponse } from '../utils/apiResponse';
import { TenantRequest } from '../middlewares/tenant';

export class FormController {
  async create(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const form = await formService.create({
        organizationId: req.organizationId!,
        ...req.body,
      });

      ApiResponse.created(res, 'Form created successfully', form);
    } catch (error) {
      next(error);
    }
  }

  async findById(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const form = await formService.findById(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Form retrieved successfully', form);
    } catch (error) {
      next(error);
    }
  }

  async findAll(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const forms = await formService.findAll(req.organizationId!);
      ApiResponse.success(res, 'Forms retrieved successfully', forms);
    } catch (error) {
      next(error);
    }
  }

  async update(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const form = await formService.update(req.params.id, req.organizationId!, req.body);
      ApiResponse.success(res, 'Form updated successfully', form);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      await formService.delete(req.params.id, req.organizationId!);
      ApiResponse.success(res, 'Form deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Public endpoint for form submission
  async submit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await formService.submitForm(req.params.id, req.body, {
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      ApiResponse.created(res, 'Form submitted successfully', {
        submissionId: result.submission.id,
      });
    } catch (error) {
      next(error);
    }
  }

  // Public endpoint to get form config for embedding
  async getPublicForm(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const form = await formService.findByIdPublic(req.params.id);
      ApiResponse.success(res, 'Form retrieved successfully', form);
    } catch (error) {
      next(error);
    }
  }

  async getEmbedCode(req: TenantRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const form = await formService.findById(req.params.id, req.organizationId!);
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const embedScript = formService.getEmbedScript(form.id, baseUrl);

      ApiResponse.success(res, 'Embed code generated', {
        script: embedScript,
        iframe: `<iframe src="${baseUrl}/embed/form/${form.id}" width="100%" height="600" frameborder="0"></iframe>`,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const formController = new FormController();
