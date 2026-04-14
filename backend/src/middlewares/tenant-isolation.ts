import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';

/**
 * TENANT ISOLATION SECURITY MIDDLEWARE
 *
 * Critical rules enforced:
 * 1. Tenant admin can only access own tenant data
 * 2. User cannot manually send another tenant's ID
 * 3. Super admin only can access all tenants
 * 4. Audit logs capture cross-module actions
 * 5. Reports are tenant filtered automatically
 *
 * NEVER trust frontend for tenant isolation.
 * ALWAYS enforce in backend and database layer.
 */

// Super admin roles that can access all tenants
const SUPER_ADMIN_ROLES = ['super-admin', 'platform-admin'];

/**
 * Check if user is a super admin with cross-tenant access
 */
export function isSuperAdmin(user: AuthenticatedRequest['user']): boolean {
  if (!user) return false;
  return SUPER_ADMIN_ROLES.includes(user.roleSlug?.toLowerCase());
}

/**
 * Get the effective organization ID for queries
 * - Regular users: Always use their own organizationId from JWT (NEVER from request)
 * - Super admins: Can optionally specify a target organizationId
 *
 * @param req - Authenticated request
 * @param allowCrossTenant - Whether to allow super admin cross-tenant access
 * @returns organizationId to use for queries
 */
export function getEffectiveOrgId(
  req: AuthenticatedRequest,
  allowCrossTenant: boolean = false
): string {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  // Super admin requesting specific tenant data
  if (allowCrossTenant && isSuperAdmin(req.user)) {
    const targetOrgId = req.query.organizationId as string ||
                        req.params.organizationId ||
                        req.body?.organizationId;

    if (targetOrgId) {
      return targetOrgId;
    }
  }

  // ALWAYS use organizationId from JWT token, NEVER from request
  return req.user.organizationId;
}

/**
 * Middleware to enforce tenant isolation
 * Prevents users from accessing data outside their organization
 */
export function enforceTenantIsolation(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  // Super admins bypass tenant isolation checks
  if (isSuperAdmin(req.user)) {
    next();
    return;
  }

  // Check if request contains organizationId that doesn't match user's org
  const requestOrgId = req.body?.organizationId ||
                       req.query.organizationId ||
                       req.params.organizationId;

  if (requestOrgId && requestOrgId !== req.user.organizationId) {
    // Log suspicious cross-tenant access attempt
    logSecurityEvent(req, 'CROSS_TENANT_ACCESS_ATTEMPT', {
      requestedOrgId: requestOrgId,
      userOrgId: req.user.organizationId,
      endpoint: req.originalUrl,
      method: req.method,
    });

    ApiResponse.forbidden(res, 'Access denied: Cannot access other organization data');
    return;
  }

  next();
}

/**
 * Middleware that automatically injects organizationId into request body
 * Ensures all mutations are tenant-scoped
 */
export function injectTenantId(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  // Always override organizationId with user's org from JWT
  // This prevents any frontend manipulation
  if (req.body && typeof req.body === 'object') {
    req.body.organizationId = req.user.organizationId;
  }

  next();
}

/**
 * Create tenant-scoped Prisma where clause
 * Use this helper in all queries to ensure tenant isolation
 */
export function tenantWhere(
  req: AuthenticatedRequest,
  additionalWhere: Record<string, unknown> = {},
  allowCrossTenant: boolean = false
): Record<string, unknown> {
  const orgId = getEffectiveOrgId(req, allowCrossTenant);

  return {
    organizationId: orgId,
    ...additionalWhere,
  };
}

/**
 * Validate that a resource belongs to the user's organization
 * Use before update/delete operations
 */
export async function validateResourceOwnership(
  req: AuthenticatedRequest,
  model: string,
  resourceId: string
): Promise<boolean> {
  if (!req.user) return false;

  // Super admins can access any resource
  if (isSuperAdmin(req.user)) return true;

  const modelMap: Record<string, any> = {
    lead: prisma.lead,
    user: prisma.user,
    form: prisma.form,
    campaign: prisma.campaign,
    branch: prisma.branch,
    // Add other models as needed
  };

  const prismaModel = modelMap[model.toLowerCase()];
  if (!prismaModel) {
    console.error(`[TenantIsolation] Unknown model: ${model}`);
    return false;
  }

  try {
    const resource = await prismaModel.findFirst({
      where: {
        id: resourceId,
        organizationId: req.user.organizationId,
      },
      select: { id: true },
    });

    return !!resource;
  } catch (error) {
    console.error(`[TenantIsolation] Error validating ownership:`, error);
    return false;
  }
}

/**
 * Middleware to validate resource ownership before operations
 */
export function requireResourceOwnership(model: string, idParam: string = 'id') {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    const resourceId = req.params[idParam];
    if (!resourceId) {
      ApiResponse.badRequest(res, `Missing ${idParam} parameter`);
      return;
    }

    const isOwner = await validateResourceOwnership(req, model, resourceId);
    if (!isOwner) {
      // Log unauthorized access attempt
      logSecurityEvent(req, 'UNAUTHORIZED_RESOURCE_ACCESS', {
        model,
        resourceId,
        endpoint: req.originalUrl,
      });

      ApiResponse.forbidden(res, 'Access denied: Resource not found or unauthorized');
      return;
    }

    next();
  };
}

/**
 * Log security events for audit trail
 */
export async function logSecurityEvent(
  req: AuthenticatedRequest,
  eventType: string,
  details: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.tenantSecurityLog.create({
      data: {
        organizationId: req.user?.organizationId || 'unknown',
        eventType,
        severity: getSeverity(eventType),
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        userId: req.user?.id || null,
        details: {
          ...details,
          timestamp: new Date().toISOString(),
          path: req.originalUrl,
          method: req.method,
        },
      },
    });
  } catch (error) {
    // Don't fail the request if logging fails
    console.error('[SecurityLog] Failed to log event:', error);
  }
}

/**
 * Log audit event for data access/modification
 */
export async function logAuditEvent(
  req: AuthenticatedRequest,
  action: string,
  module: string,
  resourceId: string | null,
  details: Record<string, unknown> = {}
): Promise<void> {
  try {
    await prisma.tenantActivityLog.create({
      data: {
        organizationId: req.user?.organizationId || 'unknown',
        action,
        module,
        resourceId,
        userId: req.user?.id || null,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        details: {
          ...details,
          userEmail: req.user?.email,
          userName: req.user ? `${req.user.firstName} ${req.user.lastName}` : null,
        },
      },
    });
  } catch (error) {
    console.error('[AuditLog] Failed to log event:', error);
  }
}

/**
 * Middleware to automatically audit API calls
 */
export function auditAction(action: string, module: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to capture response and log after success
    res.json = function(body: any) {
      // Log audit event after response
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const resourceId = req.params.id || req.body?.id || body?.data?.id || null;
        logAuditEvent(req, action, module, resourceId, {
          success: true,
          statusCode: res.statusCode,
        }).catch(() => {});
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Super admin only middleware
 */
export function requireSuperAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.user) {
    ApiResponse.unauthorized(res);
    return;
  }

  if (!isSuperAdmin(req.user)) {
    logSecurityEvent(req, 'SUPER_ADMIN_ACCESS_DENIED', {
      endpoint: req.originalUrl,
      userRole: req.user.roleSlug,
    });

    ApiResponse.forbidden(res, 'Super admin access required');
    return;
  }

  next();
}

/**
 * Helper to get severity level for security events
 */
function getSeverity(eventType: string): string {
  const criticalEvents = [
    'CROSS_TENANT_ACCESS_ATTEMPT',
    'UNAUTHORIZED_RESOURCE_ACCESS',
    'SUPER_ADMIN_ACCESS_DENIED',
    'DATA_EXPORT_UNAUTHORIZED',
  ];

  const highEvents = [
    'BULK_DELETE',
    'PERMISSION_CHANGE',
    'ROLE_CHANGE',
  ];

  if (criticalEvents.includes(eventType)) return 'CRITICAL';
  if (highEvents.includes(eventType)) return 'HIGH';
  return 'MEDIUM';
}

/**
 * Get client IP address
 */
function getClientIp(req: AuthenticatedRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Prisma extension for automatic tenant filtering
 * Use: const tenantPrisma = createTenantPrisma(req);
 */
export function createTenantPrisma(req: AuthenticatedRequest) {
  const orgId = getEffectiveOrgId(req, false);

  return prisma.$extends({
    query: {
      $allModels: {
        async findMany({ model, operation, args, query }) {
          // Auto-add organizationId filter if model has it
          if (hasOrganizationId(model)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }
          return query(args);
        },
        async findFirst({ model, operation, args, query }) {
          if (hasOrganizationId(model)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }
          return query(args);
        },
        async findUnique({ model, operation, args, query }) {
          const result = await query(args);
          // Verify result belongs to tenant
          if (result && hasOrganizationId(model) && (result as any).organizationId !== orgId) {
            return null;
          }
          return result;
        },
        async create({ model, operation, args, query }) {
          if (hasOrganizationId(model)) {
            args.data = {
              ...args.data,
              organizationId: orgId,
            };
          }
          return query(args);
        },
        async update({ model, operation, args, query }) {
          if (hasOrganizationId(model)) {
            args.where = {
              ...args.where,
              organizationId: orgId,
            };
          }
          return query(args);
        },
        async delete({ model, operation, args, query }) {
          if (hasOrganizationId(model)) {
            // First verify ownership
            const existing = await prisma.$queryRawUnsafe(
              `SELECT id FROM "${model}" WHERE id = $1 AND "organizationId" = $2`,
              (args.where as any).id,
              orgId
            );
            if (!existing || (existing as any[]).length === 0) {
              throw new Error('Resource not found or unauthorized');
            }
          }
          return query(args);
        },
      },
    },
  });
}

/**
 * Models that have organizationId field
 */
const TENANT_SCOPED_MODELS = [
  'User',
  'Lead',
  'Form',
  'Campaign',
  'Branch',
  'Role',
  'Deal',
  'Payment',
  'Admission',
  'Message',
  'Call',
  'Task',
  'Note',
  'Document',
  'Template',
  'Webhook',
  'ApiKey',
  'Integration',
  // Add all tenant-scoped models
];

function hasOrganizationId(model: string): boolean {
  return TENANT_SCOPED_MODELS.includes(model);
}

export default {
  enforceTenantIsolation,
  injectTenantId,
  requireResourceOwnership,
  requireSuperAdmin,
  auditAction,
  getEffectiveOrgId,
  tenantWhere,
  validateResourceOwnership,
  logSecurityEvent,
  logAuditEvent,
  isSuperAdmin,
  createTenantPrisma,
};
