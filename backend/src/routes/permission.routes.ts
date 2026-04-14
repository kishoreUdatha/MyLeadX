import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth';
import permissionService from '../services/permission.service';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * GET /api/permissions
 * Get all permissions (grouped by category)
 */
router.get('/', async (req, res) => {
  try {
    const permissions = await permissionService.getAllPermissions();

    // Group by category
    const grouped = permissions.reduce((acc: any, perm) => {
      const category = perm.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(perm);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        permissions,
        grouped,
        total: permissions.length,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message,
    });
  }
});

/**
 * GET /api/permissions/module/:module
 * Get permissions by module
 */
router.get('/module/:module', async (req, res) => {
  try {
    const { module } = req.params;
    const permissions = await permissionService.getPermissionsByModule(module.toUpperCase());

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message,
    });
  }
});

/**
 * GET /api/permissions/category/:category
 * Get permissions by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const permissions = await permissionService.getPermissionsByCategory(category);

    res.json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch permissions',
      error: error.message,
    });
  }
});

/**
 * GET /api/permissions/role/:roleId
 * Get permissions assigned to a role
 */
router.get('/role/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    const rolePermissions = await permissionService.getRolePermissions(roleId);

    res.json({
      success: true,
      data: rolePermissions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch role permissions',
      error: error.message,
    });
  }
});

/**
 * POST /api/permissions/role/:roleId
 * Assign permissions to a role (admin only)
 */
router.post('/role/:roleId', authorize(['admin', 'tenant_admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        message: 'Permissions must be an array',
      });
    }

    const count = await permissionService.assignPermissionsToRole(roleId, permissions);

    res.json({
      success: true,
      message: `Assigned ${count} permissions to role`,
      data: { count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign permissions',
      error: error.message,
    });
  }
});

/**
 * POST /api/permissions/check
 * Check if current user has a specific permission
 */
router.post('/check', async (req, res) => {
  try {
    const { permissionCode, scope = 'OWN' } = req.body;
    const userId = (req as any).user.id;

    const hasPermission = await permissionService.checkPermission(userId, permissionCode, scope);

    res.json({
      success: true,
      data: {
        permissionCode,
        scope,
        hasPermission,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to check permission',
      error: error.message,
    });
  }
});

/**
 * POST /api/permissions/seed
 * Seed all permissions (super admin only)
 */
router.post('/seed', authorize(['super_admin']), async (req, res) => {
  try {
    const count = await permissionService.seedPermissions();

    res.json({
      success: true,
      message: `Seeded ${count} permissions`,
      data: { count },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to seed permissions',
      error: error.message,
    });
  }
});

/**
 * POST /api/permissions/setup-defaults/:organizationId
 * Setup default role permissions for an organization (admin only)
 */
router.post('/setup-defaults/:organizationId', authorize(['super_admin', 'admin']), async (req, res) => {
  try {
    const { organizationId } = req.params;

    await permissionService.setupDefaultRolePermissions(organizationId);

    res.json({
      success: true,
      message: 'Default role permissions setup complete',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Failed to setup default permissions',
      error: error.message,
    });
  }
});

export default router;
