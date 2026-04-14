import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';

/**
 * Route to Permission Mapping
 *
 * Maps HTTP methods and route patterns to required permissions.
 * This allows automatic permission checking without updating each route.
 *
 * Pattern format: METHOD /path -> permission_name
 *
 * Examples:
 * - GET /api/leads -> leads_view
 * - POST /api/leads -> leads_create
 * - PUT /api/leads/:id -> leads_edit
 * - DELETE /api/leads/:id -> leads_delete
 */

// Route patterns to permission mapping
const routePermissionMap: Record<string, Record<string, string>> = {
  // Leads
  '/api/leads': {
    GET: 'leads_view',
    POST: 'leads_create',
  },
  '/api/leads/:id': {
    GET: 'leads_view',
    PUT: 'leads_edit',
    PATCH: 'leads_edit',
    DELETE: 'leads_delete',
  },
  '/api/leads/import': {
    POST: 'leads_import',
  },
  '/api/leads/export': {
    GET: 'leads_export',
    POST: 'leads_export',
  },
  '/api/leads/bulk': {
    POST: 'leads_bulk_update',
    PUT: 'leads_bulk_update',
    DELETE: 'leads_delete',
  },
  '/api/leads/assign': {
    POST: 'leads_assign',
    PUT: 'leads_assign',
  },

  // Users
  '/api/users': {
    GET: 'users_view',
    POST: 'users_create',
  },
  '/api/users/:id': {
    GET: 'users_view',
    PUT: 'users_edit',
    PATCH: 'users_edit',
    DELETE: 'users_delete',
  },

  // Roles
  '/api/roles': {
    GET: 'roles_view',
    POST: 'roles_create',
  },
  '/api/roles/:id': {
    GET: 'roles_view',
    PUT: 'roles_edit',
    PATCH: 'roles_edit',
    DELETE: 'roles_delete',
  },

  // Campaigns
  '/api/campaigns': {
    GET: 'campaigns_view',
    POST: 'campaigns_create',
  },
  '/api/campaigns/:id': {
    GET: 'campaigns_view',
    PUT: 'campaigns_edit',
    PATCH: 'campaigns_edit',
    DELETE: 'campaigns_delete',
  },
  '/api/campaigns/:id/launch': {
    POST: 'campaigns_launch',
  },

  // Reports
  '/api/reports': {
    GET: 'reports_view',
  },
  '/api/reports/export': {
    GET: 'reports_export',
    POST: 'reports_export',
  },

  // Admissions
  '/api/admissions': {
    GET: 'admissions_view',
    POST: 'admissions_create',
  },
  '/api/admissions/:id': {
    GET: 'admissions_view',
    PUT: 'admissions_edit',
    PATCH: 'admissions_edit',
    DELETE: 'admissions_cancel',
  },
  '/api/admissions/:id/approve': {
    POST: 'admissions_approve',
    PUT: 'admissions_approve',
  },

  // Fees
  '/api/fees': {
    GET: 'fees_view',
    POST: 'fees_collect',
  },
  '/api/fees/:id': {
    GET: 'fees_view',
    PUT: 'fees_edit',
    PATCH: 'fees_edit',
  },
  '/api/fees/:id/refund': {
    POST: 'fees_refund',
  },

  // Settings
  '/api/settings': {
    GET: 'settings_view',
    PUT: 'settings_general',
    PATCH: 'settings_general',
  },

  // Workflows
  '/api/workflows': {
    GET: 'workflows_view',
    POST: 'workflows_create',
  },
  '/api/workflows/:id': {
    GET: 'workflows_view',
    PUT: 'workflows_edit',
    PATCH: 'workflows_edit',
    DELETE: 'workflows_delete',
  },

  // Integrations
  '/api/integrations': {
    GET: 'integrations_view',
  },

  // Calls
  '/api/calls': {
    GET: 'calls_view',
    POST: 'calls_make',
  },
  '/api/calls/:id': {
    GET: 'calls_view',
    DELETE: 'calls_delete',
  },

  // Voice AI
  '/api/voice-ai': {
    GET: 'voice_ai_view',
    POST: 'voice_ai_create',
  },
  '/api/voice-ai/:id': {
    GET: 'voice_ai_view',
    PUT: 'voice_ai_edit',
    DELETE: 'voice_ai_delete',
  },

  // Followups
  '/api/followups': {
    GET: 'followups_view',
    POST: 'followups_create',
  },
  '/api/followups/:id': {
    GET: 'followups_view',
    PUT: 'followups_edit',
    DELETE: 'followups_delete',
  },

  // Tasks
  '/api/tasks': {
    GET: 'tasks_view',
    POST: 'tasks_create',
  },
  '/api/tasks/:id': {
    GET: 'tasks_view',
    PUT: 'tasks_edit',
    DELETE: 'tasks_delete',
  },

  // WhatsApp
  '/api/whatsapp': {
    GET: 'whatsapp_view',
    POST: 'whatsapp_send',
  },
  '/api/whatsapp/bulk': {
    POST: 'whatsapp_bulk',
  },

  // Email
  '/api/email': {
    GET: 'email_view',
    POST: 'email_send',
  },
  '/api/email/bulk': {
    POST: 'email_bulk',
  },

  // SMS
  '/api/sms': {
    GET: 'sms_view',
    POST: 'sms_send',
  },
  '/api/sms/bulk': {
    POST: 'sms_bulk',
  },
};

// Roles that bypass permission checks
const bypassRoles = ['super_admin', 'org_admin'];

/**
 * Normalize route path by replacing :id, :param with :id placeholder
 */
function normalizeRoute(path: string): string {
  // Remove query params
  const cleanPath = path.split('?')[0];
  // Replace dynamic segments (:id, :leadId, etc.) with :id
  return cleanPath.replace(/\/[a-f0-9-]{36}/gi, '/:id').replace(/\/:\w+/g, '/:id');
}

/**
 * Find matching permission for a route
 */
function findPermission(method: string, path: string): string | null {
  const normalizedPath = normalizeRoute(path);

  // Try exact match first
  if (routePermissionMap[normalizedPath]?.[method]) {
    return routePermissionMap[normalizedPath][method];
  }

  // Try partial matches (for nested routes)
  for (const routePattern of Object.keys(routePermissionMap)) {
    if (normalizedPath.startsWith(routePattern.replace('/:id', ''))) {
      if (routePermissionMap[routePattern][method]) {
        return routePermissionMap[routePattern][method];
      }
    }
  }

  return null;
}

/**
 * Permission check middleware
 *
 * Automatically checks permissions based on route and HTTP method.
 * Use this AFTER authenticate middleware.
 *
 * Usage:
 * router.use(authenticate);
 * router.use(checkPermission);  // Auto-check permissions
 *
 * Or for specific routes:
 * router.delete('/:id', authenticate, checkPermission, controller.delete);
 */
export function checkPermission(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Skip if no user (should be handled by authenticate)
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  // Bypass for admin roles
  if (bypassRoles.includes(req.user.role)) {
    next();
    return;
  }

  // Find required permission for this route
  const requiredPermission = findPermission(req.method, req.path);

  // If no permission mapping found, allow access (fail-open for unmapped routes)
  // In production, you may want to fail-close instead
  if (!requiredPermission) {
    next();
    return;
  }

  // Check if user has the required permission
  const userPermissions = req.user.permissions || [];

  if (!userPermissions.includes(requiredPermission)) {
    ApiResponse.forbidden(res, `Permission denied: requires '${requiredPermission}'`);
    return;
  }

  next();
}

/**
 * Require specific permission(s)
 *
 * Use this when you need to check specific permissions that don't follow
 * the standard route pattern.
 *
 * Usage:
 * router.post('/special-action', authenticate, requirePermission('special_permission'), handler);
 * router.post('/bulk-action', authenticate, requirePermission(['perm1', 'perm2']), handler);
 */
export function requirePermission(permission: string | string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    // Bypass for admin roles
    if (bypassRoles.includes(req.user.role)) {
      next();
      return;
    }

    const userPermissions = req.user.permissions || [];
    const requiredPermissions = Array.isArray(permission) ? permission : [permission];

    const hasPermission = requiredPermissions.some((p) => userPermissions.includes(p));

    if (!hasPermission) {
      ApiResponse.forbidden(res, `Permission denied: requires one of [${requiredPermissions.join(', ')}]`);
      return;
    }

    next();
  };
}

/**
 * Require ALL specified permissions
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    // Bypass for admin roles
    if (bypassRoles.includes(req.user.role)) {
      next();
      return;
    }

    const userPermissions = req.user.permissions || [];
    const hasAllPermissions = permissions.every((p) => userPermissions.includes(p));

    if (!hasAllPermissions) {
      ApiResponse.forbidden(res, `Permission denied: requires all of [${permissions.join(', ')}]`);
      return;
    }

    next();
  };
}

export default checkPermission;
