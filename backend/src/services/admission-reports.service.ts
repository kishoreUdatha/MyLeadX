/**
 * Admission Reports Service
 * Tenant-scoped admission/enrollment reporting
 *
 * SECURITY: All reports filtered by organizationId from JWT token
 */

import { prisma } from '../config/database';
import { Prisma, AdmissionType } from '@prisma/client';

interface DateRange {
  start: Date;
  end: Date;
}

interface ReportFilters {
  organizationId: string;
  dateRange?: DateRange;
  universityId?: string;
  branchId?: string;
  counselorId?: string;
}

interface AdmissionSummary {
  totalAdmissions: number;
  activeAdmissions: number;
  completedAdmissions: number;
  droppedAdmissions: number;
  totalFeeValue: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: string;
  avgFeePerAdmission: number;
}

interface AdmissionsByUniversity {
  universityId: string;
  universityName: string;
  admissions: number;
  totalFee: number;
  collected: number;
  pending: number;
  commissionEarned: number;
}

interface AdmissionsByCourse {
  courseName: string;
  admissions: number;
  totalFee: number;
  avgFee: number;
  percentage: string;
}

interface AdmissionsByType {
  type: string;
  count: number;
  totalFee: number;
  avgFee: number;
  percentage: string;
}

interface AdmissionsByStatus {
  status: string;
  count: number;
  percentage: string;
}

interface CounselorPerformance {
  userId: string;
  userName: string;
  admissions: number;
  totalFeeGenerated: number;
  commissionEarned: number;
  avgFeePerAdmission: number;
  conversionRate: string;
}

interface AdmissionTrend {
  period: string;
  admissions: number;
  feeCollected: number;
  cumulative: number;
}

interface CommissionSummary {
  totalCommission: number;
  receivedCommission: number;
  pendingCommission: number;
  avgCommissionPercent: number;
  byUniversity: { university: string; commission: number; status: string }[];
}

class AdmissionReportsService {
  /**
   * Get default date range (current academic year)
   */
  private getDefaultDateRange(): DateRange {
    const now = new Date();
    const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    const start = new Date(year, 3, 1); // April 1st
    const end = new Date(year + 1, 2, 31, 23, 59, 59); // March 31st
    return { start, end };
  }

  /**
   * Build branch filter condition for queries
   * Filter by the user who closed the admission (closedBy.branchId)
   */
  private getBranchFilter(branchId?: string): any {
    if (!branchId) return {};
    return { closedBy: { branchId: branchId } };
  }

  /**
   * 1. ADMISSION SUMMARY
   */
  async getAdmissionSummary(filters: ReportFilters): Promise<AdmissionSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const baseWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      ...branchFilter,
    };

    const [
      total,
      active,
      completed,
      dropped,
      feeStats,
    ] = await Promise.all([
      prisma.admission.count({ where: baseWhere }),
      // Active admissions (status ACTIVE with pending payment)
      prisma.admission.count({ where: { ...baseWhere, status: 'ACTIVE', paymentStatus: { in: ['PENDING', 'PARTIAL'] } } }),
      // Completed admissions (status ACTIVE with PAID payment)
      prisma.admission.count({ where: { ...baseWhere, status: 'ACTIVE', paymentStatus: 'PAID' } }),
      // Cancelled/Refunded
      prisma.admission.count({ where: { ...baseWhere, status: { in: ['CANCELLED', 'REFUNDED'] } } }),
      prisma.admission.aggregate({
        where: baseWhere,
        _sum: { totalFee: true, paidAmount: true, pendingAmount: true },
      }),
    ]);

    const totalFeeValue = Number(feeStats._sum.totalFee || 0);
    const collectedAmount = Number(feeStats._sum.paidAmount || 0);
    const pendingAmount = Number(feeStats._sum.pendingAmount || 0);

    return {
      totalAdmissions: total,
      activeAdmissions: active,
      completedAdmissions: completed,
      droppedAdmissions: dropped,
      totalFeeValue,
      collectedAmount,
      pendingAmount,
      collectionRate: totalFeeValue > 0 ? ((collectedAmount / totalFeeValue) * 100).toFixed(1) : '0',
      avgFeePerAdmission: total > 0 ? Math.round(totalFeeValue / total) : 0,
    };
  }

  /**
   * 2. ADMISSIONS BY UNIVERSITY
   */
  async getAdmissionsByUniversity(filters: ReportFilters): Promise<AdmissionsByUniversity[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: {
        universityId: true,
        totalFee: true,
        paidAmount: true,
        pendingAmount: true,
        commissionAmount: true,
      },
    });

    // Group by university
    const grouped = new Map<string, { count: number; totalFee: number; paidAmount: number; pendingAmount: number; commissionAmount: number }>();
    for (const a of admissions) {
      const current = grouped.get(a.universityId) || { count: 0, totalFee: 0, paidAmount: 0, pendingAmount: 0, commissionAmount: 0 };
      current.count++;
      current.totalFee += Number(a.totalFee);
      current.paidAmount += Number(a.paidAmount);
      current.pendingAmount += Number(a.pendingAmount);
      current.commissionAmount += Number(a.commissionAmount);
      grouped.set(a.universityId, current);
    }

    const universityIds = Array.from(grouped.keys());
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true },
    });

    const uniMap = universities.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    return Array.from(grouped.entries())
      .map(([universityId, data]) => ({
        universityId,
        universityName: uniMap[universityId] || 'Unknown',
        admissions: data.count,
        totalFee: data.totalFee,
        collected: data.paidAmount,
        pending: data.pendingAmount,
        commissionEarned: data.commissionAmount,
      }))
      .sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 3. ADMISSIONS BY COURSE
   */
  async getAdmissionsByCourse(filters: ReportFilters): Promise<AdmissionsByCourse[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        courseName: { not: null },
        ...branchFilter,
      },
      select: {
        courseName: true,
        totalFee: true,
      },
    });

    // Group by course
    const grouped = new Map<string, { count: number; totalFee: number }>();
    for (const a of admissions) {
      const course = a.courseName || 'Unknown';
      const current = grouped.get(course) || { count: 0, totalFee: 0 };
      current.count++;
      current.totalFee += Number(a.totalFee);
      grouped.set(course, current);
    }

    const totalAdmissions = admissions.length;

    return Array.from(grouped.entries())
      .map(([courseName, data]) => ({
        courseName,
        admissions: data.count,
        totalFee: data.totalFee,
        avgFee: data.count > 0 ? Math.round(data.totalFee / data.count) : 0,
        percentage: totalAdmissions > 0 ? ((data.count / totalAdmissions) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 4. ADMISSIONS BY TYPE (Donation/Non-Donation/NRI/Scholarship)
   */
  async getAdmissionsByType(filters: ReportFilters): Promise<AdmissionsByType[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: {
        admissionType: true,
        totalFee: true,
      },
    });

    // Group by type
    const grouped = new Map<string, { count: number; totalFee: number }>();
    for (const a of admissions) {
      const current = grouped.get(a.admissionType) || { count: 0, totalFee: 0 };
      current.count++;
      current.totalFee += Number(a.totalFee);
      grouped.set(a.admissionType, current);
    }

    const totalAdmissions = admissions.length;

    return Array.from(grouped.entries())
      .map(([type, data]) => ({
        type,
        count: data.count,
        totalFee: data.totalFee,
        avgFee: data.count > 0 ? Math.round(data.totalFee / data.count) : 0,
        percentage: totalAdmissions > 0 ? ((data.count / totalAdmissions) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 5. ADMISSIONS BY STATUS (Pipeline view)
   * Groups by payment status since main status is just ACTIVE/CANCELLED/REFUNDED
   */
  async getAdmissionsByStatus(filters: ReportFilters): Promise<AdmissionsByStatus[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: {
        status: true,
        paymentStatus: true,
      },
    });

    // Group by payment status for active, count cancelled/refunded separately
    const grouped = new Map<string, number>();
    let cancelledCount = 0;

    for (const a of admissions) {
      if (a.status === 'CANCELLED' || a.status === 'REFUNDED') {
        cancelledCount++;
      } else {
        const current = grouped.get(a.paymentStatus) || 0;
        grouped.set(a.paymentStatus, current + 1);
      }
    }

    const total = admissions.length;

    const statusMap: Record<string, string> = {
      'PENDING': 'Payment Pending',
      'PARTIAL': 'Partial Payment',
      'PAID': 'Fully Paid',
    };

    const results: AdmissionsByStatus[] = Array.from(grouped.entries()).map(([paymentStatus, count]) => ({
      status: statusMap[paymentStatus] || paymentStatus,
      count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(1) : '0',
    }));

    if (cancelledCount > 0) {
      results.push({
        status: 'Cancelled/Refunded',
        count: cancelledCount,
        percentage: total > 0 ? ((cancelledCount / total) * 100).toFixed(1) : '0',
      });
    }

    // Sort by count descending
    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * 6. COUNSELOR PERFORMANCE
   */
  async getCounselorPerformance(filters: ReportFilters): Promise<CounselorPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    // Fetch and manually group for branch filter support
    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: {
        closedById: true,
        totalFee: true,
        commissionAmount: true,
      },
    });

    // Group by counselor
    const grouped = new Map<string, { count: number; totalFee: number; commissionAmount: number }>();
    for (const a of admissions) {
      const current = grouped.get(a.closedById) || { count: 0, totalFee: 0, commissionAmount: 0 };
      current.count++;
      current.totalFee += Number(a.totalFee);
      current.commissionAmount += Number(a.commissionAmount);
      grouped.set(a.closedById, current);
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

    // Get lead counts for conversion rate
    const leadCounts: Record<string, number> = {};
    for (const userId of userIds) {
      const count = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: userId, isActive: true } },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });
      leadCounts[userId] = count;
    }

    return Array.from(grouped.entries())
      .map(([userId, data]) => ({
        userId,
        userName: userMap[userId] || 'Unknown',
        admissions: data.count,
        totalFeeGenerated: data.totalFee,
        commissionEarned: data.commissionAmount,
        avgFeePerAdmission: data.count > 0 ? Math.round(data.totalFee / data.count) : 0,
        conversionRate: leadCounts[userId] > 0
          ? ((data.count / leadCounts[userId]) * 100).toFixed(1)
          : '0',
      }))
      .sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 7. ADMISSION TRENDS
   */
  async getAdmissionTrends(
    filters: ReportFilters,
    interval: 'day' | 'week' | 'month' = 'month'
  ): Promise<AdmissionTrend[]> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        ...branchFilter,
      },
      select: { createdAt: true, paidAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const grouped = new Map<string, { admissions: number; feeCollected: number }>();

    for (const admission of admissions) {
      const key = this.getIntervalKey(admission.createdAt, interval);
      const current = grouped.get(key) || { admissions: 0, feeCollected: 0 };
      current.admissions++;
      current.feeCollected += Number(admission.paidAmount || 0);
      grouped.set(key, current);
    }

    let cumulative = 0;
    return Array.from(grouped.entries())
      .map(([period, data]) => {
        cumulative += data.admissions;
        return {
          period,
          admissions: data.admissions,
          feeCollected: data.feeCollected,
          cumulative,
        };
      })
      .sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * 8. COMMISSION SUMMARY
   */
  async getCommissionSummary(filters: ReportFilters): Promise<CommissionSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange(), branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);

    const baseWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
      ...branchFilter,
    };

    // Fetch all admissions and calculate manually for branch filter support
    const admissions = await prisma.admission.findMany({
      where: baseWhere,
      select: {
        universityId: true,
        commissionAmount: true,
        commissionPercent: true,
        commissionStatus: true,
      },
    });

    let totalCommission = 0;
    let receivedCommission = 0;
    let pendingCommission = 0;
    let totalPercent = 0;
    let percentCount = 0;

    // Group by university and status
    const byUniStatus = new Map<string, { commission: number; status: string }[]>();

    for (const a of admissions) {
      const commission = Number(a.commissionAmount || 0);
      totalCommission += commission;

      if (a.commissionStatus === 'RECEIVED') {
        receivedCommission += commission;
      } else if (a.commissionStatus === 'PENDING') {
        pendingCommission += commission;
      }

      if (a.commissionPercent) {
        totalPercent += Number(a.commissionPercent);
        percentCount++;
      }

      // Group by university
      const key = `${a.universityId}:${a.commissionStatus}`;
      if (!byUniStatus.has(key)) {
        byUniStatus.set(key, []);
      }
      byUniStatus.get(key)!.push({ commission, status: a.commissionStatus });
    }

    // Aggregate by university-status combination
    const universityStats = new Map<string, { universityId: string; status: string; commission: number }>();
    for (const a of admissions) {
      const key = `${a.universityId}:${a.commissionStatus}`;
      const current = universityStats.get(key) || { universityId: a.universityId, status: a.commissionStatus, commission: 0 };
      current.commission += Number(a.commissionAmount || 0);
      universityStats.set(key, current);
    }

    // Get university names
    const universityIds = [...new Set(admissions.map(a => a.universityId))];
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true },
    });
    const uniMap = universities.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    return {
      totalCommission,
      receivedCommission,
      pendingCommission,
      avgCommissionPercent: percentCount > 0 ? totalPercent / percentCount : 0,
      byUniversity: Array.from(universityStats.values()).map(u => ({
        university: uniMap[u.universityId] || 'Unknown',
        commission: u.commission,
        status: u.status,
      })),
    };
  }

  /**
   * 9. YEAR-OVER-YEAR COMPARISON
   */
  async getYearOverYearComparison(filters: ReportFilters): Promise<{
    currentYear: { admissions: number; fee: number; commission: number };
    previousYear: { admissions: number; fee: number; commission: number };
    growth: { admissions: string; fee: string; commission: string };
  }> {
    const { organizationId, branchId } = filters;
    const branchFilter = this.getBranchFilter(branchId);
    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    // Fetch and calculate manually for branch filter support
    const [currentAdmissions, previousAdmissions] = await Promise.all([
      prisma.admission.findMany({
        where: {
          organizationId,
          createdAt: { gte: currentYearStart },
          ...branchFilter,
        },
        select: { totalFee: true, commissionAmount: true },
      }),
      prisma.admission.findMany({
        where: {
          organizationId,
          createdAt: { gte: previousYearStart, lte: previousYearEnd },
          ...branchFilter,
        },
        select: { totalFee: true, commissionAmount: true },
      }),
    ]);

    const current = {
      admissions: currentAdmissions.length,
      fee: currentAdmissions.reduce((sum, a) => sum + Number(a.totalFee || 0), 0),
      commission: currentAdmissions.reduce((sum, a) => sum + Number(a.commissionAmount || 0), 0),
    };

    const previous = {
      admissions: previousAdmissions.length,
      fee: previousAdmissions.reduce((sum, a) => sum + Number(a.totalFee || 0), 0),
      commission: previousAdmissions.reduce((sum, a) => sum + Number(a.commissionAmount || 0), 0),
    };

    const calcGrowth = (curr: number, prev: number) =>
      prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : curr > 0 ? '100' : '0';

    return {
      currentYear: current,
      previousYear: previous,
      growth: {
        admissions: calcGrowth(current.admissions, previous.admissions),
        fee: calcGrowth(current.fee, previous.fee),
        commission: calcGrowth(current.commission, previous.commission),
      },
    };
  }

  /**
   * COMPREHENSIVE ADMISSION REPORT
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: AdmissionSummary;
    byUniversity: AdmissionsByUniversity[];
    byCourse: AdmissionsByCourse[];
    byType: AdmissionsByType[];
    byStatus: AdmissionsByStatus[];
    counselorPerformance: CounselorPerformance[];
    trends: AdmissionTrend[];
    commission: CommissionSummary;
    yearOverYear: Awaited<ReturnType<typeof this.getYearOverYearComparison>>;
  }> {
    const [
      summary,
      byUniversity,
      byCourse,
      byType,
      byStatus,
      counselorPerformance,
      trends,
      commission,
      yearOverYear,
    ] = await Promise.all([
      this.getAdmissionSummary(filters),
      this.getAdmissionsByUniversity(filters),
      this.getAdmissionsByCourse(filters),
      this.getAdmissionsByType(filters),
      this.getAdmissionsByStatus(filters),
      this.getCounselorPerformance(filters),
      this.getAdmissionTrends(filters),
      this.getCommissionSummary(filters),
      this.getYearOverYearComparison(filters),
    ]);

    return {
      summary,
      byUniversity,
      byCourse,
      byType,
      byStatus,
      counselorPerformance,
      trends,
      commission,
      yearOverYear,
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

export const admissionReportsService = new AdmissionReportsService();
