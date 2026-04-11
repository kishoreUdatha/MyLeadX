/**
 * Commission Config Routes
 * Endpoints for managing commission configuration per admission type
 */

import { Router, Response } from 'express';
import { commissionConfigService } from '../services/commission-config.service';
import { authenticate } from '../middlewares/auth';
import { TenantRequest, tenantMiddleware } from '../middlewares/tenant';

const router = Router();

// Apply authentication and tenant middleware to all routes
router.use(authenticate, tenantMiddleware);

/**
 * @route GET /api/commission-config
 * @desc Get all commission configs for the organization
 * @access Admin, Manager
 */
router.get('/', async (req: TenantRequest, res: Response) => {
  try {
    const configs = await commissionConfigService.getAll(req.organizationId!);
    res.json({ success: true, data: configs });
  } catch (error: any) {
    console.error('[CommissionConfig] Error fetching configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route POST /api/commission-config/initialize
 * @desc Initialize default configs for all admission types
 * @access Admin
 */
router.post('/initialize', async (req: TenantRequest, res: Response) => {
  try {
    const configs = await commissionConfigService.initializeDefaults(req.organizationId!);
    res.json({ success: true, data: configs });
  } catch (error: any) {
    console.error('[CommissionConfig] Error initializing configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/commission-config
 * @desc Update commission configs (bulk)
 * @access Admin
 */
router.put('/', async (req: TenantRequest, res: Response) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return res.status(400).json({ success: false, error: 'configs must be an array' });
    }

    const results = await commissionConfigService.bulkUpsert(req.organizationId!, configs);
    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('[CommissionConfig] Error updating configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * @route PUT /api/commission-config/:admissionType
 * @desc Update single commission config
 * @access Admin
 */
router.put('/:admissionType', async (req: TenantRequest, res: Response) => {
  try {
    const { admissionType } = req.params;
    const { telecallerAmount, teamLeadAmount, managerAmount } = req.body;

    const config = await commissionConfigService.upsert(req.organizationId!, {
      admissionType: admissionType as any,
      telecallerAmount: telecallerAmount || 0,
      teamLeadAmount: teamLeadAmount || 0,
      managerAmount: managerAmount || 0,
    });

    res.json({ success: true, data: config });
  } catch (error: any) {
    console.error('[CommissionConfig] Error updating config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
