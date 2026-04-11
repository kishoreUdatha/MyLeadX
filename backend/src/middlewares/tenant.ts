import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';
import { logSecurityEvent, isSuperAdmin } from './tenant-isolation';

export interface TenantRequest extends AuthenticatedRequest {
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
  };
}

/**
 * TENANT MIDDLEWARE - ENFORCES TENANT ISOLATION
 *
 * SECURITY RULES:
 * 1. organizationId ALWAYS comes from JWT token, NEVER from request
 * 2. Users cannot access data from other organizations
 * 3. Cross-tenant access attempts are logged as security events
 * 4. Super admins can access all tenants (logged for audit)
 */
export async function tenantMiddleware(
  req: TenantRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      ApiResponse.unauthorized(res);
      return;
    }

    // CRITICAL: organizationId comes from JWT token, NEVER from request body/params
    const organizationId = req.user.organizationId;

    // Check for cross-tenant access attempts (security violation)
    const requestedOrgId = req.body?.organizationId ||
                          req.query.organizationId ||
                          req.params.organizationId;

    if (requestedOrgId && requestedOrgId !== organizationId && !isSuperAdmin(req.user)) {
      // Log security event - user trying to access another tenant
      await logSecurityEvent(req, 'CROSS_TENANT_ACCESS_BLOCKED', {
        requestedOrgId,
        userOrgId: organizationId,
        endpoint: req.originalUrl,
        method: req.method,
        userEmail: req.user.email,
      });

      ApiResponse.forbidden(res, 'Access denied: Cannot access other organization data');
      return;
    }

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        settings: true,
        isActive: true,
      },
    });

    if (!organization || !organization.isActive) {
      ApiResponse.forbidden(res, 'Organization not found or inactive');
      return;
    }

    // Set organizationId from JWT (not from request)
    req.organizationId = organizationId;
    req.organization = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      settings: (organization.settings as Record<string, unknown>) || {},
    };

    // Override any organizationId in request body with JWT value
    // This prevents frontend manipulation
    if (req.body && typeof req.body === 'object') {
      req.body.organizationId = organizationId;
    }

    next();
  } catch (error) {
    console.error('[TenantMiddleware] Error:', error);
    ApiResponse.serverError(res, 'Failed to verify organization');
  }
}

// Helper function to ensure tenant isolation in queries
export function withTenant<T extends { organizationId?: string }>(
  organizationId: string,
  data: T
): T & { organizationId: string } {
  return {
    ...data,
    organizationId,
  };
}

// Helper function for filtering queries by organization
export function tenantFilter(organizationId: string) {
  return {
    organizationId,
  };
}
