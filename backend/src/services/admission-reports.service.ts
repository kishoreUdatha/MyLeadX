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
   * 1. ADMISSION SUMMARY
   */
  async getAdmissionSummary(filters: ReportFilters): Promise<AdmissionSummary> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const baseWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    };

    const [
      total,
      active,
      completed,
      dropped,
      feeStats,
    ] = await Promise.all([
      prisma.admission.count({ where: baseWhere }),
      prisma.admission.count({ where: { ...baseWhere, status: { in: ['ADMITTED', 'PAYMENT_PENDING'] } } }),
      prisma.admission.count({ where: { ...baseWhere, status: 'ENROLLED' } }),
      prisma.admission.count({ where: { ...baseWhere, status: 'DROPPED' } }),
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
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const admissions = await prisma.admission.groupBy({
      by: ['universityId'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      _sum: { totalFee: true, paidAmount: true, pendingAmount: true, commissionAmount: true },
    });

    const universityIds = admissions.map(a => a.universityId);
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true },
    });

    const uniMap = universities.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    return admissions.map(a => ({
      universityId: a.universityId,
      universityName: uniMap[a.universityId] || 'Unknown',
      admissions: a._count.id,
      totalFee: Number(a._sum.totalFee || 0),
      collected: Number(a._sum.paidAmount || 0),
      pending: Number(a._sum.pendingAmount || 0),
      commissionEarned: Number(a._sum.commissionAmount || 0),
    })).sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 3. ADMISSIONS BY COURSE
   */
  async getAdmissionsByCourse(filters: ReportFilters): Promise<AdmissionsByCourse[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byCourse = await prisma.admission.groupBy({
      by: ['courseName'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
        courseName: { not: null },
      },
      _count: { id: true },
      _sum: { totalFee: true },
    });

    const totalAdmissions = byCourse.reduce((sum, c) => sum + c._count.id, 0);

    return byCourse.map(c => ({
      courseName: c.courseName || 'Unknown',
      admissions: c._count.id,
      totalFee: Number(c._sum.totalFee || 0),
      avgFee: c._count.id > 0 ? Math.round(Number(c._sum.totalFee || 0) / c._count.id) : 0,
      percentage: totalAdmissions > 0 ? ((c._count.id / totalAdmissions) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 4. ADMISSIONS BY TYPE (Donation/Non-Donation/NRI/Scholarship)
   */
  async getAdmissionsByType(filters: ReportFilters): Promise<AdmissionsByType[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byType = await prisma.admission.groupBy({
      by: ['admissionType'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      _sum: { totalFee: true },
    });

    const totalAdmissions = byType.reduce((sum, t) => sum + t._count.id, 0);

    return byType.map(t => ({
      type: t.admissionType,
      count: t._count.id,
      totalFee: Number(t._sum.totalFee || 0),
      avgFee: t._count.id > 0 ? Math.round(Number(t._sum.totalFee || 0) / t._count.id) : 0,
      percentage: totalAdmissions > 0 ? ((t._count.id / totalAdmissions) * 100).toFixed(1) : '0',
    })).sort((a, b) => b.count - a.count);
  }

  /**
   * 5. ADMISSIONS BY STATUS (Pipeline view)
   */
  async getAdmissionsByStatus(filters: ReportFilters): Promise<AdmissionsByStatus[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byStatus = await prisma.admission.groupBy({
      by: ['status'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
    });

    const total = byStatus.reduce((sum, s) => sum + s._count.id, 0);

    const statusOrder = [
      'INQUIRY', 'INTERESTED', 'VISIT_SCHEDULED', 'VISIT_COMPLETED',
      'DOCUMENTS_PENDING', 'ADMISSION_PROCESSING', 'PAYMENT_PENDING',
      'ADMITTED', 'ENROLLED', 'DROPPED'
    ];

    return byStatus
      .map(s => ({
        status: s.status,
        count: s._count.id,
        percentage: total > 0 ? ((s._count.id / total) * 100).toFixed(1) : '0',
      }))
      .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status));
  }

  /**
   * 6. COUNSELOR PERFORMANCE
   */
  async getCounselorPerformance(filters: ReportFilters): Promise<CounselorPerformance[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const byCounselor = await prisma.admission.groupBy({
      by: ['closedById'],
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
      },
      _count: { id: true },
      _sum: { totalFee: true, commissionAmount: true },
    });

    const userIds = byCounselor.map(c => c.closedById);
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
    for (const counselor of byCounselor) {
      const count = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: counselor.closedById, isActive: true } },
          createdAt: { gte: dateRange.start, lte: dateRange.end },
        },
      });
      leadCounts[counselor.closedById] = count;
    }

    return byCounselor.map(c => ({
      userId: c.closedById,
      userName: userMap[c.closedById] || 'Unknown',
      admissions: c._count.id,
      totalFeeGenerated: Number(c._sum.totalFee || 0),
      commissionEarned: Number(c._sum.commissionAmount || 0),
      avgFeePerAdmission: c._count.id > 0 ? Math.round(Number(c._sum.totalFee || 0) / c._count.id) : 0,
      conversionRate: leadCounts[c.closedById] > 0
        ? ((c._count.id / leadCounts[c.closedById]) * 100).toFixed(1)
        : '0',
    })).sort((a, b) => b.admissions - a.admissions);
  }

  /**
   * 7. ADMISSION TRENDS
   */
  async getAdmissionTrends(
    filters: ReportFilters,
    interval: 'day' | 'week' | 'month' = 'month'
  ): Promise<AdmissionTrend[]> {
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const admissions = await prisma.admission.findMany({
      where: {
        organizationId,
        createdAt: { gte: dateRange.start, lte: dateRange.end },
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
    const { organizationId, dateRange = this.getDefaultDateRange() } = filters;

    const baseWhere: Prisma.AdmissionWhereInput = {
      organizationId,
      createdAt: { gte: dateRange.start, lte: dateRange.end },
    };

    const [total, received, pending, avgPercent, byUniversity] = await Promise.all([
      prisma.admission.aggregate({
        where: baseWhere,
        _sum: { commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where: { ...baseWhere, commissionStatus: 'RECEIVED' },
        _sum: { commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where: { ...baseWhere, commissionStatus: 'PENDING' },
        _sum: { commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where: baseWhere,
        _avg: { commissionPercent: true },
      }),
      prisma.admission.groupBy({
        by: ['universityId', 'commissionStatus'],
        where: baseWhere,
        _sum: { commissionAmount: true },
      }),
    ]);

    // Get university names
    const universityIds = [...new Set(byUniversity.map(u => u.universityId))];
    const universities = await prisma.university.findMany({
      where: { id: { in: universityIds } },
      select: { id: true, name: true },
    });
    const uniMap = universities.reduce((acc, u) => {
      acc[u.id] = u.name;
      return acc;
    }, {} as Record<string, string>);

    return {
      totalCommission: Number(total._sum.commissionAmount || 0),
      receivedCommission: Number(received._sum.commissionAmount || 0),
      pendingCommission: Number(pending._sum.commissionAmount || 0),
      avgCommissionPercent: Number(avgPercent._avg.commissionPercent || 0),
      byUniversity: byUniversity.map(u => ({
        university: uniMap[u.universityId] || 'Unknown',
        commission: Number(u._sum.commissionAmount || 0),
        status: u.commissionStatus,
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
    const { organizationId } = filters;
    const now = new Date();
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    const previousYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const previousYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);

    const [currentStats, previousStats] = await Promise.all([
      prisma.admission.aggregate({
        where: {
          organizationId,
          createdAt: { gte: currentYearStart },
        },
        _count: { id: true },
        _sum: { totalFee: true, commissionAmount: true },
      }),
      prisma.admission.aggregate({
        where: {
          organizationId,
          createdAt: { gte: previousYearStart, lte: previousYearEnd },
        },
        _count: { id: true },
        _sum: { totalFee: true, commissionAmount: true },
      }),
    ]);

    const current = {
      admissions: currentStats._count.id || 0,
      fee: Number(currentStats._sum.totalFee || 0),
      commission: Number(currentStats._sum.commissionAmount || 0),
    };

    const previous = {
      admissions: previousStats._count.id || 0,
      fee: Number(previousStats._sum.totalFee || 0),
      commission: Number(previousStats._sum.commissionAmount || 0),
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
