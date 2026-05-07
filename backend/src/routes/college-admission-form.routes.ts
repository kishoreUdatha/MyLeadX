import { Router, Request, Response, NextFunction } from 'express';
import { collegeAdmissionFormService } from '../services/college-admission-form.service';
import { authenticate, authorize } from '../middlewares/auth';
import { validateRequest } from '../middlewares/validate';
import { z } from 'zod';

const router = Router();

// ==================== Validation Schemas ====================

const formFieldSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  fieldType: z.enum(['text', 'textarea', 'number', 'email', 'phone', 'date', 'select', 'radio', 'checkbox', 'file']),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  validation: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    pattern: z.string().optional(),
    message: z.string().optional(),
  }).optional(),
  helpText: z.string().optional(),
  gridSpan: z.number().min(1).max(2).optional(),
});

const formSectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  fields: z.array(z.string()),
});

const createFormSchema = z.object({
  body: z.object({
    universityId: z.string().uuid(),
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    formName: z.string().min(2),
    description: z.string().optional(),
    formFields: z.array(formFieldSchema).min(1),
    sections: z.array(formSectionSchema).optional(),
  }),
});

const updateFormSchema = z.object({
  body: z.object({
    formName: z.string().min(2).optional(),
    description: z.string().optional(),
    formFields: z.array(formFieldSchema).optional(),
    sections: z.array(formSectionSchema).optional(),
    isActive: z.boolean().optional(),
  }),
});

const cloneFormSchema = z.object({
  body: z.object({
    collegeId: z.string().uuid().optional(),
    courseId: z.string().uuid().optional(),
    formName: z.string().min(2),
  }),
});

// ==================== Routes ====================

// Get default form template
router.get(
  '/template',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const formFields = collegeAdmissionFormService.getDefaultFormTemplate();
      const sections = collegeAdmissionFormService.getDefaultSectionsTemplate();

      res.json({
        success: true,
        data: {
          formFields,
          sections,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

// Create new form
router.post(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(createFormSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await collegeAdmissionFormService.createForm({
        organizationId: req.user!.organizationId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
);

// List all forms
router.get(
  '/',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await collegeAdmissionFormService.listForms({
        organizationId: req.user!.organizationId,
        universityId: req.query.universityId as string,
        collegeId: req.query.collegeId as string,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });

      res.json({
        success: true,
        data: result.forms,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get form for a specific college (hierarchical lookup)
router.get(
  '/lookup',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { universityId, collegeId, courseId } = req.query;

      if (!universityId) {
        return res.status(400).json({
          success: false,
          message: 'universityId is required',
        });
      }

      const form = await collegeAdmissionFormService.getFormForCollege(
        req.user!.organizationId,
        universityId as string,
        collegeId as string,
        courseId as string
      );

      res.json({
        success: true,
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get form by ID
router.get(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await collegeAdmissionFormService.getFormById(req.params.id);

      res.json({
        success: true,
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Update form
router.patch(
  '/:id',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(updateFormSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await collegeAdmissionFormService.updateForm(req.params.id, req.body);

      res.json({
        success: true,
        message: 'Form updated successfully',
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Clone form to another college/course
router.post(
  '/:id/clone',
  authenticate,
  authorize(['admin', 'manager']),
  validateRequest(cloneFormSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const form = await collegeAdmissionFormService.cloneForm(req.params.id, req.body);

      res.status(201).json({
        success: true,
        message: 'Form cloned successfully',
        data: form,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete form
router.delete(
  '/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await collegeAdmissionFormService.deleteForm(req.params.id);

      res.json({
        success: true,
        message: 'Form deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
