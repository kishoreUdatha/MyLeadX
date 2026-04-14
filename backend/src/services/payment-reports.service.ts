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
   * Build branch filter condition for queries
   * Filter by the user who created the payment (createdBy.branchId)
   */
  private getBranchFilter(branchId?: string): any {
    if (!branchId) return {};
    return { createdBy: { branchId: branchId } };
  }

  /**
   * 1. REVENUE SUMMARY
   */
  async getRevenueSummary(filters: ReportFilters): Promise<RevenueSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const [completed, pending, refunded, total] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'PENDING',
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'REFUNDED',
          updatedAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
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
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
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
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Get payment categories
    const categories = await prisma.paymentCategory.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, code: true },
    });

    // For groupBy with branch filter, we need to fetch and manually group
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: { description: true, amount: true },
    });

    // Group by description manually
    const grouped = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const desc = p.description || 'General';
      const current = grouped.get(desc) || { amount: 0, count: 0 };
      current.amount += Number(p.amount);
      current.count++;
      grouped.set(desc, current);
    }

    const totalAmount = Array.from(grouped.values()).reduce((sum, g) => sum + g.amount, 0);

    return Array.from(grouped.entries())
      .map(([description, data]) => ({
        category: description,
        categoryCode: description.toUpperCase().replace(/\s+/g, '_'),
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  /**
   * 4. PAYMENT METHOD BREAKDOWN
   */
  async getPaymentMethodBreakdown(filters: ReportFilters): Promise<PaymentMethodBreakdown[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: { paymentMethod: true, amount: true },
    });

    const grouped = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const method = p.paymentMethod || 'Unknown';
      const current = grouped.get(method) || { amount: 0, count: 0 };
      current.amount += Number(p.amount);
      current.count++;
      grouped.set(method, current);
    }

    const totalAmount = Array.from(grouped.values()).reduce((sum, g) => sum + g.amount, 0);

    return Array.from(grouped.entries())
      .map(([method, data]) => ({
        method,
        amount: data.amount,
        count: data.count,
        percentage: totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.amount - a.amount);
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
    const { organizationId, branchId } = filters;
    const now = new Date();

    // Build branch filter for payment creator
    const creatorBranchFilter = branchId ? { branchId: branchId } : {};

    // Get pending payment splits (installments)
    const pendingSplits = await prisma.paymentSplit.findMany({
      where: {
        payment: {
          organizationId,
          createdBy: creatorBranchFilter,
        },
        status: 'PENDING',
      },
      include: {
        payment: {
          include: {
            lead: { select: { firstName: true, lastName: true, phone: true } },
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
        createdBy: creatorBranchFilter,
      },
      include: {
        lead: { select: { firstName: true, lastName: true, phone: true } },
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
        studentName: `${split.payment.lead.firstName || ''} ${split.payment.lead.lastName || ''}`.trim(),
        phone: split.payment.lead.phone || '',
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
        studentName: `${payment.lead.firstName || ''} ${payment.lead.lastName || ''}`.trim(),
        phone: payment.lead.phone || '',
        amount: Number(payment.amount),
        dueDate: null,
        daysPastDue: 0,
        splitNumber: null,
      });
    }

    // Calculate totals
    const totalPending = await prisma.payment.aggregate({
      where: {
        organizationId,
        status: 'PENDING',
        createdBy: creatorBranchFilter,
      },
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
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: { createdById: true, amount: true },
    });

    const grouped = new Map<string, { amount: number; count: number }>();
    for (const p of payments) {
      const current = grouped.get(p.createdById) || { amount: 0, count: 0 };
      current.amount += Number(p.amount);
      current.count++;
      grouped.set(p.createdById, current);
    }

    const userIds = Array.from(grouped.keys());
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = `${u.firstName} ${u.lastName}`.trim();
      return acc;
    }, {} as Record<string, string>);

    return Array.from(grouped.entries())
      .map(([userId, data]) => ({
        userId,
        userName: userMap[userId] || 'Unknown',
        collectedAmount: data.amount,
        transactionCount: data.count,
        avgCollection: data.count > 0 ? Math.round(data.amount / data.count) : 0,
      }))
      .sort((a, b) => b.collectedAmount - a.collectedAmount);
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
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const refunds = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'REFUNDED',
        updatedAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      include: {
        lead: { select: { firstName: true, lastName: true } },
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
        studentName: `${r.lead.firstName || ''} ${r.lead.lastName || ''}`.trim(),
        amount: Number(r.amount),
        refundedAt: r.updatedAt,
      })),
    };
  }

  /**
   * 8. RECENT TRANSACTIONS (Detailed payment list)
   */
  async getRecentTransactions(filters: ReportFilters, limit = 50): Promise<{
    transactions: {
      id: string;
      leadName: string;
      phone: string;
      email: string;
      amount: number;
      status: string;
      paymentMethod: string;
      paymentType: string;
      description: string;
      referenceNumber: string;
      collectorName: string;
      paidAt: Date | null;
      createdAt: Date;
    }[];
    total: number;
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
        include: {
          lead: { select: { firstName: true, lastName: true, phone: true, email: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.payment.count({
        where: {
          organizationId,
          createdAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
      }),
    ]);

    return {
      transactions: payments.map(p => ({
        id: p.id,
        leadName: `${p.lead.firstName || ''} ${p.lead.lastName || ''}`.trim() || 'Unknown',
        phone: p.lead.phone || '',
        email: p.lead.email || '',
        amount: Number(p.amount),
        status: p.status,
        paymentMethod: p.paymentMethod || 'N/A',
        paymentType: p.paymentType || 'N/A',
        description: p.description || '',
        referenceNumber: p.referenceNumber || '',
        collectorName: `${p.createdBy.firstName || ''} ${p.createdBy.lastName || ''}`.trim(),
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      })),
      total,
    };
  }

  /**
   * 9. PREVIOUS PERIOD COMPARISON
   */
  async getPreviousPeriodComparison(filters: ReportFilters): Promise<{
    previousCollected: number;
    previousTransactions: number;
    collectedGrowth: number;
    transactionsGrowth: number;
  }> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Calculate previous period (same duration, before current)
    const duration = dateRange.end.getTime() - dateRange.start.getTime();
    const prevStart = new Date(dateRange.start.getTime() - duration);
    const prevEnd = new Date(dateRange.start.getTime() - 1);

    const [currentData, previousData] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
          paidAt: { gte: dateRange.start, lte: dateRange.end },
          ...branchFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.payment.aggregate({
        where: {
          organizationId,
          status: 'COMPLETED',
          paidAt: { gte: prevStart, lte: prevEnd },
          ...branchFilter,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const currentCollected = Number(currentData._sum.amount || 0);
    const previousCollected = Number(previousData._sum.amount || 0);
    const currentTxns = currentData._count.id || 0;
    const previousTxns = previousData._count.id || 0;

    return {
      previousCollected,
      previousTransactions: previousTxns,
      collectedGrowth: previousCollected > 0
        ? Math.round(((currentCollected - previousCollected) / previousCollected) * 100)
        : currentCollected > 0 ? 100 : 0,
      transactionsGrowth: previousTxns > 0
        ? Math.round(((currentTxns - previousTxns) / previousTxns) * 100)
        : currentTxns > 0 ? 100 : 0,
    };
  }

  /**
   * 10. BRANCH-WISE REVENUE
   * Groups revenue by the branch of the user who created/collected the payment
   */
  async getBranchWiseRevenue(filters: ReportFilters): Promise<{
    branchId: string;
    branchName: string;
    collected: number;
    transactions: number;
    percentage: string;
  }[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Get payments with creator's branch info
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      include: {
        createdBy: {
          select: { branchId: true },
        },
      },
    });

    // Group by creator's branch
    const byBranch = new Map<string, { collected: number; count: number }>();
    for (const p of payments) {
      const creatorBranchId = p.createdBy?.branchId || 'unassigned';
      const current = byBranch.get(creatorBranchId) || { collected: 0, count: 0 };
      current.collected += Number(p.amount);
      current.count++;
      byBranch.set(creatorBranchId, current);
    }

    // Get branch names
    const branchIds = Array.from(byBranch.keys()).filter(id => id !== 'unassigned');
    const branches = await prisma.branch.findMany({
      where: { id: { in: branchIds } },
      select: { id: true, name: true },
    });
    const branchMap = branches.reduce((acc, b) => {
      acc[b.id] = b.name;
      return acc;
    }, {} as Record<string, string>);

    const totalCollected = Array.from(byBranch.values()).reduce((sum, b) => sum + b.collected, 0);

    return Array.from(byBranch.entries())
      .map(([branchId, data]) => ({
        branchId,
        branchName: branchId === 'unassigned' ? 'Unassigned' : (branchMap[branchId] || 'Unknown'),
        collected: data.collected,
        transactions: data.count,
        percentage: totalCollected > 0 ? ((data.collected / totalCollected) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.collected - a.collected);
  }

  /**
   * 11. COURSE/PROGRAM WISE REVENUE
   */
  async getCourseWiseRevenue(filters: ReportFilters): Promise<{
    courseId: string;
    courseName: string;
    collected: number;
    admissions: number;
    percentage: string;
  }[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Get payments linked to admissions with course info
    const payments = await prisma.payment.findMany({
      where: {
        organizationId,
        status: 'COMPLETED',
        paidAt: { gte: dateRange.start, lte: dateRange.end },
        admissionId: { not: null },
        ...branchFilter,
      },
      include: {
        admission: {
          select: { id: true, courseName: true },
        },
      },
    });

    // Group by course name
    const byCourse = new Map<string, { collected: number; admissionIds: Set<string> }>();
    for (const p of payments) {
      const courseName = p.admission?.courseName || 'Other';
      const current = byCourse.get(courseName) || { collected: 0, admissionIds: new Set() };
      current.collected += Number(p.amount);
      if (p.admissionId) current.admissionIds.add(p.admissionId);
      byCourse.set(courseName, current);
    }

    const totalCollected = Array.from(byCourse.values()).reduce((sum, c) => sum + c.collected, 0);

    return Array.from(byCourse.entries())
      .map(([courseName, data]) => ({
        courseId: courseName.toLowerCase().replace(/\s+/g, '-'),
        courseName,
        collected: data.collected,
        admissions: data.admissionIds.size,
        percentage: totalCollected > 0 ? ((data.collected / totalCollected) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.collected - a.collected);
  }

  /**
   * 12. UPCOMING DUES (Next 7 days)
   */
  async getUpcomingDues(filters: ReportFilters): Promise<{
    dues: {
      id: string;
      studentName: string;
      phone: string;
      amount: number;
      dueDate: Date;
      daysUntilDue: number;
      splitNumber: number;
    }[];
    totalAmount: number;
    count: number;
  }> {
    const { organizationId, branchId } = filters;
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Build branch filter for payment creator
    const creatorBranchFilter = branchId ? { branchId: branchId } : {};

    const upcomingSplits = await prisma.paymentSplit.findMany({
      where: {
        payment: {
          organizationId,
          createdBy: creatorBranchFilter,
        },
        status: 'PENDING',
        dueDate: { gte: now, lte: nextWeek },
      },
      include: {
        payment: {
          include: {
            lead: { select: { firstName: true, lastName: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    const dues = upcomingSplits.map(split => ({
      id: split.id,
      studentName: `${split.payment.lead.firstName || ''} ${split.payment.lead.lastName || ''}`.trim(),
      phone: split.payment.lead.phone || '',
      amount: Number(split.amount),
      dueDate: split.dueDate,
      daysUntilDue: Math.ceil((split.dueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
      splitNumber: split.splitNumber,
    }));

    return {
      dues,
      totalAmount: dues.reduce((sum, d) => sum + d.amount, 0),
      count: dues.length,
    };
  }

  /**
   * COMPREHENSIVE PAYMENT REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: RevenueSummary;
    comparison: Awaited<ReturnType<typeof this.getPreviousPeriodComparison>>;
    byPeriod: RevenueByPeriod[];
    byCategory: RevenueByCategory[];
    byMethod: PaymentMethodBreakdown[];
    byBranch: Awaited<ReturnType<typeof this.getBranchWiseRevenue>>;
    byCourse: Awaited<ReturnType<typeof this.getCourseWiseRevenue>>;
    pending: Awaited<ReturnType<typeof this.getPendingPayments>>;
    upcomingDues: Awaited<ReturnType<typeof this.getUpcomingDues>>;
    collectors: CollectorPerformance[];
    refunds: Awaited<ReturnType<typeof this.getRefundsReport>>;
    transactions: Awaited<ReturnType<typeof this.getRecentTransactions>>;
  }> {
    const [
      summary, comparison, byPeriod, byCategory, byMethod, byBranch, byCourse,
      pending, upcomingDues, collectors, refunds, transactions
    ] = await Promise.all([
      this.getRevenueSummary(filters),
      this.getPreviousPeriodComparison(filters),
      this.getRevenueByPeriod(filters),
      this.getRevenueByCategory(filters),
      this.getPaymentMethodBreakdown(filters),
      this.getBranchWiseRevenue(filters),
      this.getCourseWiseRevenue(filters),
      this.getPendingPayments(filters, 20),
      this.getUpcomingDues(filters),
      this.getCollectorPerformance(filters),
      this.getRefundsReport(filters),
      this.getRecentTransactions(filters, 50),
    ]);

    return {
      summary, comparison, byPeriod, byCategory, byMethod, byBranch, byCourse,
      pending, upcomingDues, collectors, refunds, transactions
    };
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
