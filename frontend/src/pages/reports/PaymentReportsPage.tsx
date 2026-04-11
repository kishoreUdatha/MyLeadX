import { useEffect, useState } from 'react';
import {
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  paymentReportsService,
  ComprehensivePaymentReport,
  ReportFilters,
} from '../../services/payment-reports.service';

type TabType = 'overview' | 'pending' | 'collectors' | 'refunds';

export default function PaymentReportsPage() {
  const [report, setReport] = useState<ComprehensivePaymentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trendInterval, setTrendInterval] = useState<'day' | 'week' | 'month'>('day');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Date presets
  const datePresets = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Year', value: 'thisYear' },
    { label: 'Custom', value: 'custom' },
  ];
  const [datePreset, setDatePreset] = useState('thisMonth');

  useEffect(() => {
    applyDatePreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadReport();
    }
  }, [filters]);

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        start = new Date(now);
        start.setDate(now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
        start = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        return;
    }

    setFilters({
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await paymentReportsService.getComprehensive(filters);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load payment reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!report) return null;

  const { summary, byPeriod, byCategory, byMethod, pending, collectors, refunds } = report;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Payment Reports</h1>
          <p className="text-slate-500 text-xs">Revenue collection and payment analytics</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="input text-sm py-1.5 px-3"
          >
            {datePresets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary py-1.5 px-3 ${showFilters ? 'bg-primary-100' : ''}`}
          >
            <FunnelIcon className="w-4 h-4" />
          </button>
          <button onClick={loadReport} className="btn btn-secondary py-1.5 px-3">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button className="btn btn-secondary py-1.5 px-3">
            <DocumentArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Date Range */}
      {showFilters && (
        <div className="card p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, startDate: e.target.value });
                }}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, endDate: e.target.value });
                }}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
              <select
                value={filters.branchId || ''}
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value || undefined })}
                className="input text-sm py-1.5"
              >
                <option value="">All Branches</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value || undefined })}
                className="input text-sm py-1.5"
              >
                <option value="">All Methods</option>
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="UPI">UPI</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total Revenue</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalRevenue)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.totalTransactions} transactions</p>
            </div>
            <div className="p-2 rounded-lg bg-primary-100 flex-shrink-0">
              <CurrencyRupeeIcon className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="text-xl font-bold text-success-600">{formatCurrency(summary.collectedAmount)}</p>
              <div className="flex items-center gap-1 mt-1">
                <ArrowTrendingUpIcon className="w-3 h-3 text-success-500" />
                <span className="text-xs font-medium text-success-600">{summary.collectionRate}%</span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-success-100 flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-xl font-bold text-warning-600">{formatCurrency(summary.pendingAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {pending.overdueCount > 0 && (
                  <span className="text-danger-600">{pending.overdueCount} overdue</span>
                )}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-warning-100 flex-shrink-0">
              <ClockIcon className="w-5 h-5 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Refunded</p>
              <p className="text-xl font-bold text-danger-600">{formatCurrency(summary.refundedAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">{refunds.refundCount} refunds</p>
            </div>
            <div className="p-2 rounded-lg bg-danger-100 flex-shrink-0">
              <XCircleIcon className="w-5 h-5 text-danger-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { key: 'overview', label: 'Overview', icon: CurrencyRupeeIcon },
            { key: 'pending', label: 'Pending', icon: ClockIcon, badge: pending.payments.length },
            { key: 'collectors', label: 'Collectors', icon: UserGroupIcon },
            { key: 'refunds', label: 'Refunds', icon: ArrowTrendingDownIcon },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-warning-100 text-warning-700 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Revenue Trend */}
          <div className="card lg:col-span-2">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Revenue Trend</h3>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setTrendInterval(interval)}
                    className={`px-2 py-1 text-xs rounded ${
                      trendInterval === interval
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {interval.charAt(0).toUpperCase() + interval.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3">
              {byPeriod.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No data for selected period</div>
              ) : (
                <div className="space-y-2">
                  {byPeriod.slice(-10).map((period, index) => {
                    const maxAmount = Math.max(...byPeriod.map((p) => p.collected + p.pending));
                    const collectedPercent = maxAmount > 0 ? (period.collected / maxAmount) * 100 : 0;
                    const pendingPercent = maxAmount > 0 ? (period.pending / maxAmount) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-20 text-xs text-slate-600 font-medium">
                          {period.period.slice(-5)}
                        </div>
                        <div className="flex-1 flex h-6 bg-slate-100 rounded overflow-hidden">
                          <div
                            className="bg-success-500 h-full transition-all"
                            style={{ width: `${collectedPercent}%` }}
                            title={`Collected: ${formatCurrency(period.collected)}`}
                          />
                          <div
                            className="bg-warning-400 h-full transition-all"
                            style={{ width: `${pendingPercent}%` }}
                            title={`Pending: ${formatCurrency(period.pending)}`}
                          />
                        </div>
                        <div className="w-24 text-right">
                          <span className="text-xs font-medium text-slate-700">
                            {formatCurrency(period.collected)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-success-500 rounded" />
                      <span className="text-xs text-slate-600">Collected</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-warning-400 rounded" />
                      <span className="text-xs text-slate-600">Pending</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Category */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Revenue by Category</h3>
            </div>
            <div className="p-3">
              {byCategory.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">No categories found</div>
              ) : (
                <div className="space-y-2">
                  {byCategory.slice(0, 6).map((cat, index) => {
                    const colors = [
                      'bg-primary-500',
                      'bg-success-500',
                      'bg-warning-500',
                      'bg-purple-500',
                      'bg-pink-500',
                      'bg-cyan-500',
                    ];
                    return (
                      <div key={index} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${colors[index % colors.length]}`} />
                          <span className="text-xs font-medium text-slate-700">{cat.category}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(cat.amount)}</p>
                          <p className="text-[10px] text-slate-500">{cat.percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Payment Methods</h3>
            </div>
            <div className="p-3">
              {byMethod.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">No payment data</div>
              ) : (
                <div className="space-y-2">
                  {byMethod.map((method, index) => {
                    const icons: Record<string, string> = {
                      CASH: 'bg-green-100 text-green-600',
                      CARD: 'bg-blue-100 text-blue-600',
                      UPI: 'bg-purple-100 text-purple-600',
                      BANK_TRANSFER: 'bg-cyan-100 text-cyan-600',
                      CHEQUE: 'bg-orange-100 text-orange-600',
                    };
                    const colorClass = icons[method.method] || 'bg-slate-100 text-slate-600';
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <BanknotesIcon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700">{method.method}</span>
                            <span className="text-xs text-slate-500">{method.count} txns</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5">
                            <div
                              className="bg-primary-500 h-1.5 rounded-full transition-all"
                              style={{ width: `${parseFloat(method.percentage)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(method.amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card lg:col-span-2">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Quick Stats</h3>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-2xl font-bold text-slate-900">{summary.totalTransactions}</p>
                  <p className="text-xs text-slate-500">Total Transactions</p>
                </div>
                <div className="text-center p-3 bg-primary-50 rounded-lg">
                  <p className="text-2xl font-bold text-primary-600">
                    {formatCurrency(summary.avgTransactionValue)}
                  </p>
                  <p className="text-xs text-slate-500">Avg Transaction</p>
                </div>
                <div className="text-center p-3 bg-warning-50 rounded-lg">
                  <p className="text-2xl font-bold text-warning-600">
                    {formatCurrency(pending.overdueAmount)}
                  </p>
                  <p className="text-xs text-slate-500">Overdue Amount</p>
                </div>
                <div className="text-center p-3 bg-success-50 rounded-lg">
                  <p className="text-2xl font-bold text-success-600">{summary.collectionRate}%</p>
                  <p className="text-xs text-slate-500">Collection Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Pending Payments</h3>
              <p className="text-xs text-slate-500">
                Total: {formatCurrency(pending.totalPending)} | Overdue: {formatCurrency(pending.overdueAmount)}
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Student</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Phone</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Amount</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Due Date</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pending.payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No pending payments
                    </td>
                  </tr>
                ) : (
                  pending.payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-slate-900">{payment.studentName}</p>
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">{payment.phone || '-'}</td>
                      <td className="px-3 py-2 text-sm font-medium text-slate-900 text-right">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">{formatDate(payment.dueDate)}</td>
                      <td className="px-3 py-2">
                        {payment.daysPastDue > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-danger-100 text-danger-700 rounded-full">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            {payment.daysPastDue} days overdue
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-xs font-medium bg-warning-100 text-warning-700 rounded-full">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600">
                        {payment.splitNumber ? `#${payment.splitNumber}` : 'Full'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'collectors' && (
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Collector Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Collector</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Collected</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Transactions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Avg Collection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {collectors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No collector data
                    </td>
                  </tr>
                ) : (
                  collectors.map((collector, index) => (
                    <tr key={collector.userId} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                              ? 'bg-slate-400'
                              : index === 2
                              ? 'bg-orange-400'
                              : 'bg-slate-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-slate-900">{collector.userName}</p>
                      </td>
                      <td className="px-3 py-2 text-sm font-bold text-success-600 text-right">
                        {formatCurrency(collector.collectedAmount)}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600 text-right">
                        {collector.transactionCount}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600 text-right">
                        {formatCurrency(collector.avgCollection)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'refunds' && (
        <div className="space-y-3">
          {/* Refund Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-danger-600">{formatCurrency(refunds.totalRefunded)}</p>
              <p className="text-xs text-slate-500">Total Refunded</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{refunds.refundCount}</p>
              <p className="text-xs text-slate-500">Refund Count</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(refunds.avgRefundAmount)}</p>
              <p className="text-xs text-slate-500">Avg Refund</p>
            </div>
          </div>

          {/* Refunds Table */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Refunds</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Student</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Amount</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Refunded On</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.refunds.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        No refunds in this period
                      </td>
                    </tr>
                  ) : (
                    refunds.refunds.map((refund) => (
                      <tr key={refund.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2">
                          <p className="text-sm font-medium text-slate-900">{refund.studentName}</p>
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-danger-600 text-right">
                          -{formatCurrency(refund.amount)}
                        </td>
                        <td className="px-3 py-2 text-sm text-slate-600">
                          <div className="flex items-center gap-1">
                            <CalendarDaysIcon className="w-4 h-4" />
                            {formatDate(refund.refundedAt)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
