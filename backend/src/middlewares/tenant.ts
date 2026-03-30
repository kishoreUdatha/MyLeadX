import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth';
import { ApiResponse } from '../utils/apiResponse';
import { prisma } from '../config/database';

export interface TenantRequest extends AuthenticatedRequest {
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
    settings: Record<string, unknown>;
  };
}

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

    const organizationId = req.user.organizationId;

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

    req.organizationId = organizationId;
    req.organization = {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      settings: (organization.settings as Record<string, unknown>) || {},
    };

    next();
  } catch (error) {
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
