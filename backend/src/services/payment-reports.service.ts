/**
 * Payment Reports Service
 * Tenant-scoped payment/revenue reporting
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';
import { Prisma, PaymentStatus } from '@prisma/client';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  branchId?: string;
  courseId?: string;
  paymentMethod?: string;
}

interface RevenueSummary {
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  totalTransactions: number;
  avgTransactionValue: number;
  collectionRate: string;
}

interface RevenueByPeriod {
  period: string;
  collected: number;
  pending: number;
  count: number;
}

interface RevenueByCategory {
  category: string;
  categoryCode: string;
  amount: number;
  count: number;
  percentage: string;
}

interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  percentage: string;
}

interface PendingPayment {
  id: string;
  studentName: string;
  phone: string;
  amount: number;
  dueDate: Date | null;
  daysPastDue: number;
  splitNumber: number | null;
}

interface CollectorPerformance {
  userId: string;
  userName: string;
  collectedAmount: number;
  transactionCount: number;
  avgCollection: number;
}

class PaymentReportsService {
  /**
   * Get default date range (current month)
   */
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start, end };
  }

  /**
   * 1. REVENUE SUMMARY
   */
  async getRevenueSummary(filters: ReportFilters): Promise<RevenueSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const [completed, pending, refunded, total] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'PENDING',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'REFUNDED',
          updatedAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const collectedAmount = Number(completed._sum.amount || 0);
    const pendingAmount = Number(pending._sum.amount || 0);
    const refundedAmount = Number(refunded._sum.amount || 0);
    const totalRevenue = Number(total._sum.amount || 0);
    const totalTransactions = total._count.id || 0;

    return {
      totalRevenue,
      collectedAmount,
      pendingAmount,
      refundedAmount,
      totalTransactions,
      avgTransactionValue: totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0,
      collectionRate: totalRevenue > 0 ? ((collectedAmount / totalRevenue) * 100).toFixed(1) : '0',
    };
  }

  /**
   * 2. REVENUE BY PERIOD (Daily/Weekly/Monthly trend)
   */
  async getRevenueByPeriod(
    filters: ReportFilters,
    interval: 'day' | 'week' | 'month' = 'day'
  ): Promise<RevenueByPeriod[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      select: { createdAt: true, amount: true, status: true, paidAt: true },
    });

    const grouped = new Map<string, { collected: number; pending: number; count: number }>();

    for (const payment of payments) {
      const key = this.getIntervalKey(payment.paidAt || payment.createdAt, interval);
      const current = grouped.get(key) || { collected: 0, pending: 0, count: 0 };
      current.count++;
      if (payment.status === 'COMPLETED') {
        current.collected += Number(payment.amount);
      } else if (payment.status === 'PENDING') {
        current.pending += Number(payment.amount);
      }
      grouped.set(key, current);
    }

    return Array.from(grouped.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 3. REVENUE BY CATEGORY (Fee types)
   */
  async getRevenueByCategory(filters: ReportFilters): Promise<RevenueByCategory[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    // Get payment categories
    const categories = await prisma.paymentCategory.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, code: true },
    });

    // For now, group by description since payments don't have categoryId
    // In a real implementation, you'd add categoryId to Payment model
    const payments = await prisma.payment.groupBy({
      by: ['description'],
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalAmount = payments.reduce((sum, p) => sum + Number(p._sum.amount || 0), 0);

    return payments.map(p => ({
      category: p.description || 'General',
      categoryCode: p.description?.toUpperCase().replace(/\s+/g, '_') || 'GENERAL',
      amount: Number(p._sum.amount || 0),
      count: p._count.id,
      percentage: totalAmount > 0 ? ((Number(p._sum.amount || 0) / totalAmount) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * 4. PAYMENT METHOD BREAKDOWN
   */
  async getPaymentMethodBreakdown(filters: ReportFilters): Promise<PaymentMethodBreakdown[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byMethod = await prisma.payment.groupBy({
      by: ['paymentMethod'],
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const totalAmount = byMethod.reduce((sum, m) => sum + Number(m._sum.amount || 0), 0);

    return byMethod.map(m => ({
      method: m.paymentMethod || 'Unknown',
      amount: Number(m._sum.amount || 0),
      count: m._count.id,
      percentage: totalAmount > 0 ? ((Number(m._sum.amount || 0) / totalAmount) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.amount - a.amount);
  }

  /**
   * 5. PENDING PAYMENTS (Overdue)
   */
  async getPendingPayments(filters: ReportFilters, limit = 50): Promise<{
    payments: PendingPayment[];
    totalPending: number;
    overdueAmount: number;
    overdueCount: number;
  }> {
    const { organizationId } = filters;
    const now = new Date();

    // Get pending payment splits (installments)
    const pendingSplits = await prisma.paymentSplit.findMany({
      where: {
        payment: { organizationId },
        status: 'PENDING',
      },
      include: {
        payment: {
          include: {
            studentProfile: {
              include: {
                user: { select: { firstName: true, lastName: true, phone: true } },
              },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: limit,
    });

    // Get pending full payments (no splits)
    const pendingPayments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'PENDING',
        splits: { none: {} },
      },
      include: {
        studentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    const payments: PendingPayment[] = [];
    let overdueAmount = 0;
    let overdueCount = 0;

    // Process splits
    for (const split of pendingSplits) {
      const daysPastDue = split.dueDate
        ? Math.max(0, Math.floor((now.getTime() - split.dueDate.getTime()) / (24 * 60 * 60 * 1000)))
        : 0;

      if (daysPastDue > 0) {
        overdueAmount += Number(split.amount);
        overdueCount++;
      }

      payments.push({
        id: split.id,
        studentName: `${split.payment.studentProfile.user.firstName} ${split.payment.studentProfile.user.lastName}`.trim(),
        phone: split.payment.studentProfile.user.phone || '',
        amount: Number(split.amount),
        dueDate: split.dueDate,
        daysPastDue,
        splitNumber: split.splitNumber,
      });
    }

    // Process full payments
    for (const payment of pendingPayments) {
      payments.push({
        id: payment.id,
        studentName: `${payment.studentProfile.user.firstName} ${payment.studentProfile.user.lastName}`.trim(),
        phone: payment.studentProfile.user.phone || '',
        amount: Number(payment.amount),
        dueDate: null,
        daysPastDue: 0,
        splitNumber: null,
      });
    }

    // Calculate totals
    const totalPending = await prisma.payment.aggregate({
      where: { organizationId, status: 'PENDING' },
      _sum: { amount: true },
    });

    return {
      payments: payments.slice(0, limit),
      totalPending: Number(totalPending._sum.amount || 0),
      overdueAmount,
      overdueCount,
    };
  }

  /**
   * 6. COLLECTOR PERFORMANCE
   */
  async getCollectorPerformance(filters: ReportFilters): Promise<CollectorPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byCollector = await prisma.payment.groupBy({
      by: ['createdById'],
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    const userIds = byCollector.map(c => c.createdById);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName} ${u.lastName}`.trim();
      return acc;
    }, {} as Record<string, string>);

    return byCollector.map(c => ({
      userId: c.createdById,
      userName: userMap[c.createdById] || 'Unknown',
      collectedAmount: Number(c._sum.amount || 0),
      transactionCount: c._count.id,
      avgCollection: c._count.id > 0 ? Math.round(Number(c._sum.amount || 0) / c._count.id) : 0,
    })).sort((a, b) => b.collectedAmount - a.collectedAmount);
  }

  /**
   * 7. REFUNDS REPORT
   */
  async getRefundsReport(filters: ReportFilters): Promise<{
    totalRefunded: number;
    refundCount: number;
    avgRefundAmount: number;
    refunds: { id: string; studentName: string; amount: number; refundedAt: Date }[];
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const refunds = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'REFUNDED',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
      },
      include: {
        studentProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const totalRefunded = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      totalRefunded,
      refundCount: refunds.length,
      avgRefundAmount: refunds.length > 0 ? Math.round(totalRefunded / refunds.length) : 0,
      refunds: refunds.map(r => ({
        id: r.id,
        studentName: `${r.studentProfile.user.firstName} ${r.studentProfile.user.lastName}`.trim(),
        amount: Number(r.amount),
        refundedAt: r.updatedAt,
      })),
    };
  }

  /**
   * COMPREHENSIVE PAYMENT REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: RevenueSummary;
    byPeriod: RevenueByPeriod[];
    byCategory: RevenueByCategory[];
    byMethod: PaymentMethodBreakdown[];
    pending: Awaited<ReturnType<typeof this.getPendingPayments>>;
    collectors: CollectorPerformance[];
    refunds: Awaited<ReturnType<typeof this.getRefundsReport>>;
  }> {
    const [summary, byPeriod, byCategory, byMethod, pending, collectors, refunds] = await Promise.all([
      this.getRevenueSummary(filters),
      this.getRevenueByPeriod(filters),
      this.getRevenueByCategory(filters),
      this.getPaymentMethodBreakdown(filters),
      this.getPendingPayments(filters, 20),
      this.getCollectorPerformance(filters),
      this.getRefundsReport(filters),
    ]);

    return { summary, byPeriod, byCategory, byMethod, pending, collectors, refunds };
  }

  /**
   * Helper: Get interval key
   */
  private getIntervalKey(date: Date, interval: string): string {
    const d = new Date(date);
    switch (interval) {
      case 'day':
        return d.toISOString().slice(0, 10);
      case 'week':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().slice(0, 10);
      case 'month':
        return d.toISOString().slice(0, 7);
      default:
        return d.toISOString().slice(0, 10);
    }
  }
}

export const paymentReportsService = new PaymentReportsService();
