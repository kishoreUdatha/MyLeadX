import { Router, Request, Response } from 'express';
import { industryTemplateService } from '../services/industry-template.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// ==================== PUBLIC ROUTES (for browsing templates) ====================

// Get all templates (public - for marketplace)
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const templates = await industryTemplateService.getAllTemplates();
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get template by slug (public)
router.get('/templates/slug/:slug', async (req: Request, res: Response) => {
  try {
    const template = await industryTemplateService.getTemplateBySlug(req.params.slug);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get templates by industry
router.get('/templates/industry/:industry', async (req: Request, res: Response) => {
  try {
    const templates = await industryTemplateService.getTemplatesByIndustry(req.params.industry as any);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get template by ID
router.get('/templates/:id', async (req: Request, res: Response) => {
  try {
    const template = await industryTemplateService.getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== PROTECTED ROUTES ====================

// Apply template to organization
router.post(
  '/apply/:templateId',
  authenticate,
  tenantMiddleware,
  async (req: Request, res: Response) => {
    try {
      const organizationId = (req as any).organizationId;
      const { templateId } = req.params;

      const result = await industryTemplateService.applyTemplateToOrganization(
        organizationId,
        templateId
      );

      res.json({
        message: 'Template applied successfully',
        config: result,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Get pipeline presets for an industry
router.get('/presets/pipeline/:industry', async (req: Request, res: Response) => {
  try {
    const presets = await industryTemplateService.getPipelinePresets(req.params.industry as any);
    res.json(presets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get field presets for an industry
router.get('/presets/fields/:industry', async (req: Request, res: Response) => {
  try {
    const presets = await industryTemplateService.getFieldPresets(req.params.industry as any);
    res.json(presets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get AI script templates for an industry
router.get('/presets/ai-scripts/:industry', async (req: Request, res: Response) => {
  try {
    const { purpose } = req.query;
    const templates = await industryTemplateService.getAIScriptTemplates(
      req.params.industry as any,
      purpose as string | undefined
    );
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get role templates for an industry
router.get('/presets/roles/:industry', async (req: Request, res: Response) => {
  try {
    const templates = await industryTemplateService.getRoleTemplates(req.params.industry as any);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ADMIN ROUTES (for managing templates) ====================

// Seed default templates (admin only)
router.post('/seed', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user is super admin
    const user = (req as any).user;
    if (user.role !== 'super_admin' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }

    const result = await industryTemplateService.seedDefaultTemplates();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create template (admin only)
router.post('/templates', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super_admin' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }

    const template = await industryTemplateService.createTemplate(req.body);
    res.status(201).json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update template (admin only)
router.put('/templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super_admin' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }

    const template = await industryTemplateService.updateTemplate(req.params.id, req.body);
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete template (admin only)
router.delete('/templates/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (user.role !== 'super_admin' && user.role !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Access denied. Super admin only.' });
    }

    await industryTemplateService.deleteTemplate(req.params.id);
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
