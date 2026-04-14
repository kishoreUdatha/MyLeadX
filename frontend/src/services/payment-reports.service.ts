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

export interface PaymentTransaction {
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
  paidAt: string | null;
  createdAt: string;
}

export interface TransactionsReport {
  transactions: PaymentTransaction[];
  total: number;
}

export interface PeriodComparison {
  previousCollected: number;
  previousTransactions: number;
  collectedGrowth: number;
  transactionsGrowth: number;
}

export interface BranchRevenue {
  branchId: string;
  branchName: string;
  collected: number;
  transactions: number;
  percentage: string;
}

export interface CourseRevenue {
  courseId: string;
  courseName: string;
  collected: number;
  admissions: number;
  percentage: string;
}

export interface UpcomingDue {
  id: string;
  studentName: string;
  phone: string;
  amount: number;
  dueDate: string;
  daysUntilDue: number;
  splitNumber: number;
}

export interface UpcomingDuesReport {
  dues: UpcomingDue[];
  totalAmount: number;
  count: number;
}

export interface ComprehensivePaymentReport {
  summary: RevenueSummary;
  comparison: PeriodComparison;
  byPeriod: RevenueByPeriod[];
  byCategory: RevenueByCategory[];
  byMethod: PaymentMethodBreakdown[];
  byBranch: BranchRevenue[];
  byCourse: CourseRevenue[];
  pending: PendingPaymentsReport;
  upcomingDues: UpcomingDuesReport;
  collectors: CollectorPerformance[];
  refunds: RefundsReport;
  transactions: TransactionsReport;
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

  async exportReport(filters: ReportFilters = {}): Promise<void> {
    const query = this.buildQueryString(filters);
    const response = await api.get(`/payment-reports/export?${query}`, {
      responseType: 'blob',
    });

    // Create download link
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-report-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async exportToCSV(filters: ReportFilters = {}): Promise<void> {
    const report = await this.getComprehensive(filters);

    // Convert transactions to CSV
    const headers = ['Date', 'Lead Name', 'Phone', 'Email', 'Amount', 'Method', 'Type', 'Reference', 'Status', 'Collected By'];
    const rows = report.transactions.transactions.map(t => [
      t.paidAt || t.createdAt,
      t.leadName,
      t.phone,
      t.email,
      t.amount,
      t.paymentMethod,
      t.paymentType,
      t.referenceNumber,
      t.status,
      t.collectorName,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `payment-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export const paymentReportsService = new PaymentReportsService();
