import { prisma } from '../config/database';

/**
 * PLATFORM FINANCIAL MANAGEMENT SERVICE
 *
 * Financial management for super admins:
 * - Custom pricing per tenant
 * - Discount management
 * - Invoice generation
 * - Failed payment alerts
 * - Revenue forecasting
 */

interface TenantPricing {
  organizationId: string;
  organizationName: string;
  basePlanId: string;
  basePlanPrice: number;
  customDiscount: number;
  discountType: 'percentage' | 'fixed';
  effectivePrice: number;
  validUntil: Date | null;
  notes: string | null;
}

interface Invoice {
  id: string;
  organizationId: string;
  organizationName: string;
  invoiceNumber: string;
  amount: number;
  tax: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  dueDate: Date;
  items: InvoiceItem[];
  createdAt: Date;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface FailedPaymentAlert {
  organizationId: string;
  organizationName: string;
  email: string;
  amount: number;
  failureReason: string;
  failedAt: Date;
  retryCount: number;
  lastRetryAt: Date | null;
}

interface RevenueForecast {
  month: string;
  predictedMRR: number;
  predictedChurn: number;
  predictedNewRevenue: number;
  confidence: number;
}

export class PlatformFinancialService {
  /**
   * Get all tenant pricing configurations
   */
  async getAllTenantPricing(): Promise<TenantPricing[]> {
    const tenants = await prisma.organization.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        activePlanId: true,
        settings: true,
      },
    });

    return tenants.map((tenant) => {
      const settings = (tenant.settings as any) || {};
      const customPricing = settings.customPricing || {};

      return {
        organizationId: tenant.id,
        organizationName: tenant.name,
        basePlanId: tenant.activePlanId || 'free',
        basePlanPrice: this.getPlanPrice(tenant.activePlanId),
        customDiscount: customPricing.discount || 0,
        discountType: customPricing.discountType || 'percentage',
        effectivePrice: this.calculateEffectivePrice(
          this.getPlanPrice(tenant.activePlanId),
          customPricing.discount || 0,
          customPricing.discountType || 'percentage'
        ),
        validUntil: customPricing.validUntil ? new Date(customPricing.validUntil) : null,
        notes: customPricing.notes || null,
      };
    });
  }

  /**
   * Set custom pricing for a tenant
   */
  async setTenantPricing(
    organizationId: string,
    discount: number,
    discountType: 'percentage' | 'fixed',
    validUntil?: Date,
    notes?: string
  ): Promise<TenantPricing> {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, activePlanId: true, settings: true },
    });

    if (!tenant) throw new Error('Organization not found');

    const currentSettings = (tenant.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      customPricing: {
        discount,
        discountType,
        validUntil: validUntil?.toISOString(),
        notes,
        updatedAt: new Date().toISOString(),
      },
    };

    await prisma.organization.update({
      where: { id: organizationId },
      data: { settings: updatedSettings },
    });

    return {
      organizationId: tenant.id,
      organizationName: tenant.name,
      basePlanId: tenant.activePlanId || 'free',
      basePlanPrice: this.getPlanPrice(tenant.activePlanId),
      customDiscount: discount,
      discountType,
      effectivePrice: this.calculateEffectivePrice(
        this.getPlanPrice(tenant.activePlanId),
        discount,
        discountType
      ),
      validUntil: validUntil || null,
      notes: notes || null,
    };
  }

  /**
   * Get failed payment alerts
   */
  async getFailedPaymentAlerts(): Promise<FailedPaymentAlert[]> {
    const failedPayments = await prisma.payment.findMany({
      where: {
        status: 'FAILED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      select: {
        id: true,
        organizationId: true,
        amount: true,
        failureReason: true,
        createdAt: true,
        organization: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by organization and count retries
    const alertMap = new Map<string, FailedPaymentAlert>();

    failedPayments.forEach((payment) => {
      const existing = alertMap.get(payment.organizationId);
      if (existing) {
        existing.retryCount++;
        if (payment.createdAt > (existing.lastRetryAt || new Date(0))) {
          existing.lastRetryAt = payment.createdAt;
        }
      } else {
        alertMap.set(payment.organizationId, {
          organizationId: payment.organizationId,
          organizationName: payment.organization.name,
          email: payment.organization.email || '',
          amount: Number(payment.amount),
          failureReason: payment.failureReason || 'Unknown',
          failedAt: payment.createdAt,
          retryCount: 1,
          lastRetryAt: null,
        });
      }
    });

    return Array.from(alertMap.values())
      .sort((a, b) => b.retryCount - a.retryCount);
  }

  /**
   * Generate invoice for a tenant
   */
  async generateInvoice(
    organizationId: string,
    items: InvoiceItem[],
    dueDate: Date,
    taxRate: number = 18
  ): Promise<Invoice> {
    const tenant = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!tenant) throw new Error('Organization not found');

    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;

    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Store invoice (would need Invoice model in schema)
    // For now, return the generated invoice object
    return {
      id: `inv_${Date.now()}`,
      organizationId: tenant.id,
      organizationName: tenant.name,
      invoiceNumber,
      amount: subtotal,
      tax,
      total,
      status: 'draft',
      dueDate,
      items,
      createdAt: new Date(),
    };
  }

  /**
   * Get revenue forecast for next 6 months
   */
  async getRevenueForecast(): Promise<RevenueForecast[]> {
    // Get current MRR
    const currentMRR = await this.calculateCurrentMRR();

    // Get historical growth rate
    const historicalGrowth = await this.calculateHistoricalGrowthRate();

    // Get churn rate
    const churnRate = await this.calculateChurnRate();

    const forecasts: RevenueForecast[] = [];
    let projectedMRR = currentMRR;

    for (let i = 1; i <= 6; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i);
      const monthStr = date.toISOString().substring(0, 7);

      const churnLoss = projectedMRR * (churnRate / 100);
      const newRevenue = projectedMRR * (historicalGrowth / 100);
      projectedMRR = projectedMRR - churnLoss + newRevenue;

      forecasts.push({
        month: monthStr,
        predictedMRR: Math.round(projectedMRR),
        predictedChurn: Math.round(churnLoss),
        predictedNewRevenue: Math.round(newRevenue),
        confidence: Math.max(50, 95 - i * 7), // Confidence decreases over time
      });
    }

    return forecasts;
  }

  /**
   * Calculate current MRR
   */
  async calculateCurrentMRR(): Promise<number> {
    const activeSubscriptions = await prisma.organization.findMany({
      where: {
        isActive: true,
        subscriptionStatus: 'ACTIVE',
      },
      select: { activePlanId: true },
    });

    return activeSubscriptions.reduce((total, org) => {
      return total + this.getPlanPrice(org.activePlanId);
    }, 0);
  }

  /**
   * Get revenue breakdown by plan
   */
  async getRevenueByPlan(): Promise<Array<{ plan: string; mrr: number; count: number }>> {
    const planGroups = await prisma.organization.groupBy({
      by: ['activePlanId'],
      where: { isActive: true, subscriptionStatus: 'ACTIVE' },
      _count: { id: true },
    });

    return planGroups.map((group) => ({
      plan: group.activePlanId || 'free',
      mrr: this.getPlanPrice(group.activePlanId) * group._count.id,
      count: group._count.id,
    }));
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(months: number = 12): Promise<Array<{
    month: string;
    revenue: number;
    newCustomers: number;
    churnedCustomers: number;
  }>> {
    const trends: Array<{
      month: string;
      revenue: number;
      newCustomers: number;
      churnedCustomers: number;
    }> = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const [revenue, newCustomers] = await Promise.all([
        prisma.payment.aggregate({
          where: {
            status: 'COMPLETED',
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.organization.count({
          where: {
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
        }),
      ]);

      trends.push({
        month: startOfMonth.toISOString().substring(0, 7),
        revenue: Number(revenue._sum.amount) || 0,
        newCustomers,
        churnedCustomers: 0, // Would need churn tracking
      });
    }

    return trends;
  }

  /**
   * Helper: Get plan price
   */
  private getPlanPrice(planId: string | null): number {
    const prices: Record<string, number> = {
      free: 0,
      starter: 999,
      growth: 2499,
      business: 4999,
      enterprise: 9999,
    };
    return prices[planId || 'free'] || 0;
  }

  /**
   * Helper: Calculate effective price with discount
   */
  private calculateEffectivePrice(
    basePrice: number,
    discount: number,
    discountType: 'percentage' | 'fixed'
  ): number {
    if (discountType === 'percentage') {
      return Math.round(basePrice * (1 - discount / 100));
    }
    return Math.max(0, basePrice - discount);
  }

  /**
   * Helper: Calculate historical growth rate
   */
  private async calculateHistoricalGrowthRate(): Promise<number> {
    // Simplified - return average growth rate
    return 5; // 5% monthly growth
  }

  /**
   * Helper: Calculate churn rate
   */
  private async calculateChurnRate(): Promise<number> {
    // Simplified - return average churn rate
    return 3; // 3% monthly churn
  }
}

export const platformFinancialService = new PlatformFinancialService();
