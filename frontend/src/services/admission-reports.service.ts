/**
 * Admission Reports Service
 * Frontend API calls for tenant-scoped admission/enrollment reporting
 */

import api from './api';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilters extends Partial<DateRange> {
  universityId?: string;
  branchId?: string;
  counselorId?: string;
}

export interface AdmissionSummary {
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

export interface AdmissionsByUniversity {
  universityId: string;
  universityName: string;
  admissions: number;
  totalFee: number;
  collected: number;
  pending: number;
  commissionEarned: number;
}

export interface AdmissionsByCourse {
  courseName: string;
  admissions: number;
  totalFee: number;
  avgFee: number;
  percentage: string;
}

export interface AdmissionsByType {
  type: string;
  count: number;
  totalFee: number;
  avgFee: number;
  percentage: string;
}

export interface AdmissionsByStatus {
  status: string;
  count: number;
  percentage: string;
}

export interface CounselorPerformance {
  userId: string;
  userName: string;
  admissions: number;
  totalFeeGenerated: number;
  commissionEarned: number;
  avgFeePerAdmission: number;
  conversionRate: string;
}

export interface AdmissionTrend {
  period: string;
  admissions: number;
  feeCollected: number;
  cumulative: number;
}

export interface CommissionSummary {
  totalCommission: number;
  receivedCommission: number;
  pendingCommission: number;
  avgCommissionPercent: number;
  byUniversity: { university: string; commission: number; status: string }[];
}

export interface YearOverYear {
  currentYear: { admissions: number; fee: number; commission: number };
  previousYear: { admissions: number; fee: number; commission: number };
  growth: { admissions: string; fee: string; commission: string };
}

export interface ComprehensiveAdmissionReport {
  summary: AdmissionSummary;
  byUniversity: AdmissionsByUniversity[];
  byCourse: AdmissionsByCourse[];
  byType: AdmissionsByType[];
  byStatus: AdmissionsByStatus[];
  counselorPerformance: CounselorPerformance[];
  trends: AdmissionTrend[];
  commission: CommissionSummary;
  yearOverYear: YearOverYear;
}

class AdmissionReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.universityId) params.append('universityId', filters.universityId);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.counselorId) params.append('counselorId', filters.counselorId);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<AdmissionSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getByUniversity(filters: ReportFilters = {}): Promise<AdmissionsByUniversity[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/by-university?${query}`);
    return response.data.data.byUniversity;
  }

  async getByCourse(filters: ReportFilters = {}): Promise<AdmissionsByCourse[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/by-course?${query}`);
    return response.data.data.byCourse;
  }

  async getByType(filters: ReportFilters = {}): Promise<AdmissionsByType[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/by-type?${query}`);
    return response.data.data.byType;
  }

  async getByStatus(filters: ReportFilters = {}): Promise<AdmissionsByStatus[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/by-status?${query}`);
    return response.data.data.byStatus;
  }

  async getCounselorPerformance(filters: ReportFilters = {}): Promise<CounselorPerformance[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/counselor-performance?${query}`);
    return response.data.data.counselorPerformance;
  }

  async getTrends(filters: ReportFilters = {}, interval: 'day' | 'week' | 'month' = 'month'): Promise<AdmissionTrend[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/trends?${query}&interval=${interval}`);
    return response.data.data.trends;
  }

  async getCommission(filters: ReportFilters = {}): Promise<CommissionSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/commission?${query}`);
    return response.data.data.commission;
  }

  async getYearOverYear(filters: ReportFilters = {}): Promise<YearOverYear> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/year-over-year?${query}`);
    return response.data.data.yearOverYear;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensiveAdmissionReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/admission-reports/comprehensive?${query}`);
    return response.data.data.report;
  }
}

export const admissionReportsService = new AdmissionReportsService();
