/**
 * Payment Reports Service
 * Frontend API calls for tenant-scoped payment/revenue reporting
 */

import api from './api';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilters extends Partial<DateRange> {
  branchId?: string;
  courseId?: string;
  paymentMethod?: string;
}

export interface RevenueSummary {
  totalRevenue: number;
  collectedAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  totalTransactions: number;
  avgTransactionValue: number;
  collectionRate: string;
}

export interface RevenueByPeriod {
  period: string;
  collected: number;
  pending: number;
  count: number;
}

export interface RevenueByCategory {
  category: string;
  categoryCode: string;
  amount: number;
  count: number;
  percentage: string;
}

export interface PaymentMethodBreakdown {
  method: string;
  amount: number;
  count: number;
  percentage: string;
}

export interface PendingPayment {
  id: string;
  studentName: string;
  phone: string;
  amount: number;
  dueDate: string | null;
  daysPastDue: number;
  splitNumber: number | null;
}

export interface CollectorPerformance {
  userId: string;
  userName: string;
  collectedAmount: number;
  transactionCount: number;
  avgCollection: number;
}

export interface RefundItem {
  id: string;
  studentName: string;
  amount: number;
  refundedAt: string;
}

export interface RefundsReport {
  totalRefunded: number;
  refundCount: number;
  avgRefundAmount: number;
  refunds: RefundItem[];
}

export interface PendingPaymentsReport {
  payments: PendingPayment[];
  totalPending: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface ComprehensivePaymentReport {
  summary: RevenueSummary;
  byPeriod: RevenueByPeriod[];
  byCategory: RevenueByCategory[];
  byMethod: PaymentMethodBreakdown[];
  pending: PendingPaymentsReport;
  collectors: CollectorPerformance[];
  refunds: RefundsReport;
}

class PaymentReportsService {
  private buildQueryString(filters: ReportFilters): string {
    const params = new URLSearchParams();
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.courseId) params.append('courseId', filters.courseId);
    if (filters.paymentMethod) params.append('paymentMethod', filters.paymentMethod);
    return params.toString();
  }

  async getSummary(filters: ReportFilters = {}): Promise<RevenueSummary> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/summary?${query}`);
    return response.data.data.summary;
  }

  async getByPeriod(filters: ReportFilters = {}, interval: 'day' | 'week' | 'month' = 'day'): Promise<RevenueByPeriod[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/by-period?${query}&interval=${interval}`);
    return response.data.data.byPeriod;
  }

  async getByCategory(filters: ReportFilters = {}): Promise<RevenueByCategory[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/by-category?${query}`);
    return response.data.data.byCategory;
  }

  async getByMethod(filters: ReportFilters = {}): Promise<PaymentMethodBreakdown[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/by-method?${query}`);
    return response.data.data.byMethod;
  }

  async getPending(filters: ReportFilters = {}, limit = 50): Promise<PendingPaymentsReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/pending?${query}&limit=${limit}`);
    return response.data.data;
  }

  async getCollectors(filters: ReportFilters = {}): Promise<CollectorPerformance[]> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/collectors?${query}`);
    return response.data.data.collectors;
  }

  async getRefunds(filters: ReportFilters = {}): Promise<RefundsReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/refunds?${query}`);
    return response.data.data;
  }

  async getComprehensive(filters: ReportFilters = {}): Promise<ComprehensivePaymentReport> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/comprehensive?${query}`);
    return response.data.data.report;
  }
}

export const paymentReportsService = new PaymentReportsService();
