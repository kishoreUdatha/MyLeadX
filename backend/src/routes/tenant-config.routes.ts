import { Router, Request, Response } from 'express';
import { tenantConfigService } from '../services/tenant-config.service';
import { authenticate } from '../middlewares/auth';
import { tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

// ==================== TENANT CONFIGURATION ====================

// Get tenant configuration
router.get('/config', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const config = await tenantConfigService.getTenantConfig(organizationId);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update tenant configuration
router.put('/config', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const config = await tenantConfigService.updateTenantConfig(organizationId, req.body);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== TENANT LABELS ====================

// Get all labels
router.get('/labels', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const labels = await tenantConfigService.getTenantLabels(organizationId);
    res.json(labels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific label
router.get('/labels/:entityKey', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const label = await tenantConfigService.getLabel(organizationId, req.params.entityKey);
    if (!label) {
      return res.status(404).json({ error: 'Label not found' });
    }
    res.json(label);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update or create a label
router.put('/labels/:entityKey', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { singularLabel, pluralLabel, icon } = req.body;

    if (!singularLabel || !pluralLabel) {
      return res.status(400).json({ error: 'singularLabel and pluralLabel are required' });
    }

    const label = await tenantConfigService.upsertLabel(organizationId, {
      entityKey: req.params.entityKey,
      singularLabel,
      pluralLabel,
      icon,
    });

    res.json(label);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Bulk update labels
router.put('/labels', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { labels } = req.body;

    if (!Array.isArray(labels)) {
      return res.status(400).json({ error: 'labels must be an array' });
    }

    const result = await tenantConfigService.bulkUpdateLabels(organizationId, labels);
    res.json({ message: 'Labels updated successfully', count: result.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset a label to default
router.delete('/labels/:entityKey', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    await tenantConfigService.resetLabel(organizationId, req.params.entityKey);
    res.json({ message: 'Label reset to default' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset all labels to defaults
router.delete('/labels', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    await tenantConfigService.resetAllLabels(organizationId);
    res.json({ message: 'All labels reset to defaults' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ENABLED MODULES ====================

// Get enabled modules
router.get('/modules', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const modules = await tenantConfigService.getEnabledModules(organizationId);
    res.json(modules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update enabled modules
router.put('/modules', async (req: Request, res: Response) => {
  try {
    const organizationId = (req as any).organizationId;
    const { modules } = req.body;

    if (!Array.isArray(modules)) {
      return res.status(400).json({ error: 'modules must be an array' });
    }

    const config = await tenantConfigService.updateEnabledModules(organizationId, modules);
    res.json(config);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== INDUSTRY HELPERS ====================

// Get industry-specific default labels (public helper)
router.get('/industry-labels/:industry', async (req: Request, res: Response) => {
  try {
    const labels = tenantConfigService.getIndustryLabels(req.params.industry as any);
    res.json(labels);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get default labels
router.get('/default-labels', async (req: Request, res: Response) => {
  try {
    res.json(tenantConfigService.DEFAULT_LABELS);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
