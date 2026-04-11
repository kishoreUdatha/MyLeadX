import { prisma } from '../config/database';
import { AuthenticatedRequest } from '../middlewares/auth';
import { isSuperAdmin } from '../middlewares/tenant-isolation';

/**
 * BASE TENANT SERVICE
 *
 * Provides tenant-scoped database operations.
 * All services should extend this class to ensure proper tenant isolation.
 *
 * SECURITY RULES ENFORCED:
 * 1. All queries are automatically filtered by organizationId
 * 2. Organization ID comes from JWT token, NEVER from request body/params
 * 3. Super admins can optionally access cross-tenant data
 * 4. All mutations automatically include organizationId
 */

export interface TenantContext {
  organizationId: string;
  userId: string;
  userRole: string;
  isSuperAdmin: boolean;
}

export class BaseTenantService {
  protected prisma = prisma;

  /**
   * Extract tenant context from authenticated request
   * ALWAYS use this instead of reading organizationId from request body
   */
  protected getTenantContext(req: AuthenticatedRequest): TenantContext {
    if (!req.user) {
      throw new Error('User not authenticated');
    }

    return {
      organizationId: req.user.organizationId,
      userId: req.user.id,
      userRole: req.user.roleSlug,
      isSuperAdmin: isSuperAdmin(req.user),
    };
  }

  /**
   * Get organization ID for queries
   * - For regular users: ALWAYS returns their own organizationId
   * - For super admins with allowCrossTenant: Can specify target org
   */
  protected getOrgId(
    req: AuthenticatedRequest,
    allowCrossTenant: boolean = false
  ): string {
    const ctx = this.getTenantContext(req);

    if (allowCrossTenant && ctx.isSuperAdmin) {
      // Super admin can query specific organization
      const targetOrgId = req.query.organizationId as string ||
                          req.params.organizationId;
      if (targetOrgId) {
        return targetOrgId;
      }
    }

    // ALWAYS use organizationId from JWT
    return ctx.organizationId;
  }

  /**
   * Create where clause with tenant filter
   * Use in all findMany, findFirst operations
   */
  protected where(
    req: AuthenticatedRequest,
    additionalFilters: Record<string, any> = {},
    allowCrossTenant: boolean = false
  ): Record<string, any> {
    return {
      organizationId: this.getOrgId(req, allowCrossTenant),
      ...additionalFilters,
    };
  }

  /**
   * Create data object with tenant ID for create operations
   * Automatically injects organizationId
   */
  protected withTenantId(
    req: AuthenticatedRequest,
    data: Record<string, any>
  ): Record<string, any> {
    const ctx = this.getTenantContext(req);

    // Remove any organizationId that might have been sent from frontend
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { organizationId: _ignored, ...safeData } = data;

    return {
      ...safeData,
      organizationId: ctx.organizationId,
    };
  }

  /**
   * Validate that a resource belongs to user's organization
   * Use before update/delete operations
   */
  protected async validateOwnership(
    req: AuthenticatedRequest,
    model: 'lead' | 'user' | 'form' | 'campaign' | 'branch' | 'deal' | 'payment',
    resourceId: string
  ): Promise<boolean> {
    const ctx = this.getTenantContext(req);

    // Super admins can access any resource
    if (ctx.isSuperAdmin) return true;

    const modelMap = {
      lead: this.prisma.lead,
      user: this.prisma.user,
      form: this.prisma.form,
      campaign: this.prisma.campaign,
      branch: this.prisma.branch,
      deal: this.prisma.deal,
      payment: this.prisma.payment,
    };

    const prismaModel = modelMap[model];

    const resource = await (prismaModel as any).findFirst({
      where: {
        id: resourceId,
        organizationId: ctx.organizationId,
      },
      select: { id: true },
    });

    return !!resource;
  }

  /**
   * Throw error if resource doesn't belong to tenant
   */
  protected async requireOwnership(
    req: AuthenticatedRequest,
    model: 'lead' | 'user' | 'form' | 'campaign' | 'branch' | 'deal' | 'payment',
    resourceId: string,
    errorMessage: string = 'Resource not found or unauthorized'
  ): Promise<void> {
    const isOwner = await this.validateOwnership(req, model, resourceId);
    if (!isOwner) {
      throw new Error(errorMessage);
    }
  }
}

/**
 * USAGE EXAMPLE:
 *
 * class LeadService extends BaseTenantService {
 *   async getLeads(req: AuthenticatedRequest, filters: any) {
 *     // Automatically filtered by organizationId from JWT
 *     return this.prisma.lead.findMany({
 *       where: this.where(req, {
 *         status: filters.status,
 *         // other filters...
 *       }),
 *     });
 *   }
 *
 *   async createLead(req: AuthenticatedRequest, data: any) {
 *     // Automatically injects organizationId from JWT
 *     return this.prisma.lead.create({
 *       data: this.withTenantId(req, {
 *         name: data.name,
 *         email: data.email,
 *         // organizationId is automatically added
 *       }),
 *     });
 *   }
 *
 *   async updateLead(req: AuthenticatedRequest, leadId: string, data: any) {
 *     // Validate ownership before update
 *     await this.requireOwnership(req, 'lead', leadId);
 *
 *     return this.prisma.lead.update({
 *       where: { id: leadId },
 *       data,
 *     });
 *   }
 *
 *   async deleteLead(req: AuthenticatedRequest, leadId: string) {
 *     // Validate ownership before delete
 *     await this.requireOwnership(req, 'lead', leadId);
 *
 *     return this.prisma.lead.delete({
 *       where: { id: leadId },
 *     });
 *   }
 * }
 */

export default BaseTenantService;
