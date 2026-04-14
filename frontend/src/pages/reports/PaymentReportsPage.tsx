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
  ListBulletIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  AcademicCapIcon,
  BellAlertIcon,
  TrophyIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  paymentReportsService,
  ComprehensivePaymentReport,
  ReportFilters,
} from '../../services/payment-reports.service';
import { branchService, Branch } from '../../services/branch.service';

type TabType = 'overview' | 'transactions' | 'pending' | 'collectors' | 'refunds';

export default function PaymentReportsPage() {
  const [report, setReport] = useState<ComprehensivePaymentReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trendInterval, setTrendInterval] = useState<'day' | 'week' | 'month'>('day');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    branchService.getAll(true).then(setBranches).catch(console.error);
  }, []);

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

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      await paymentReportsService.exportToCSV(filters);
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-6 h-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  if (!report) return null;

  const { summary, comparison, byPeriod, byCategory, byMethod, byBranch, byCourse, pending, upcomingDues, collectors, refunds, transactions } = report;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: ChartBarIcon },
    { key: 'transactions', label: 'Transactions', icon: ListBulletIcon, badge: transactions?.total },
    { key: 'pending', label: 'Pending', icon: ClockIcon, badge: pending.payments.length },
    { key: 'collectors', label: 'Collectors', icon: UserGroupIcon },
    { key: 'refunds', label: 'Refunds', icon: ArrowTrendingDownIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Payment Reports</h1>
              <p className="text-gray-500 text-sm">Revenue collection and payment analytics</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="text-sm py-2 px-3 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {datePresets.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border transition-colors ${showFilters ? 'bg-purple-50 border-purple-200 text-purple-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                <FunnelIcon className="w-5 h-5" />
              </button>
              <button onClick={loadReport} className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                <ArrowPathIcon className="w-5 h-5" />
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isExporting}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <DocumentArrowDownIcon className={`w-5 h-5 ${isExporting ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as TabType)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'text-purple-600 border-purple-600 bg-purple-50'
                      : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => { setDatePreset('custom'); setFilters({ ...filters, startDate: e.target.value }); }}
                className="w-full text-sm py-2 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => { setDatePreset('custom'); setFilters({ ...filters, endDate: e.target.value }); }}
                className="w-full text-sm py-2 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {branches.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
                <select
                  value={filters.branchId || ''}
                  onChange={(e) => setFilters({ ...filters, branchId: e.target.value || undefined })}
                  className="w-full text-sm py-2 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">All Branches</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod || ''}
                onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value || undefined })}
                className="w-full text-sm py-2 px-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
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

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Total Revenue"
            value={formatCurrency(summary.totalRevenue)}
            subtitle={`${summary.totalTransactions} transactions`}
            change={comparison?.revenueGrowth}
            icon={CurrencyRupeeIcon}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Collected"
            value={formatCurrency(summary.collectedAmount)}
            subtitle={`${summary.collectionRate}% collection rate`}
            change={comparison?.collectedGrowth}
            icon={CheckCircleIcon}
            iconBg="bg-green-50"
            iconColor="text-green-600"
            valueColor="text-green-600"
          />
          <SummaryCard
            title="Pending"
            value={formatCurrency(summary.pendingAmount)}
            subtitle={pending.overdueCount > 0 ? `${pending.overdueCount} overdue` : 'No overdue'}
            icon={ClockIcon}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
            valueColor="text-amber-600"
            subtitleColor={pending.overdueCount > 0 ? 'text-red-500' : undefined}
          />
          <SummaryCard
            title="Refunded"
            value={formatCurrency(summary.refundedAmount)}
            subtitle={`${refunds.refundCount} refunds`}
            icon={XCircleIcon}
            iconBg="bg-red-50"
            iconColor="text-red-600"
            valueColor="text-red-600"
          />
        </div>

        {/* Upcoming Dues Alert */}
        {upcomingDues && upcomingDues.count > 0 && (
          <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-amber-100">
                <BellAlertIcon className="w-6 h-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-amber-800">
                  {upcomingDues.count} payment{upcomingDues.count > 1 ? 's' : ''} due in next 7 days
                </p>
                <p className="text-sm text-amber-600">Total: {formatCurrency(upcomingDues.totalAmount)}</p>
              </div>
              <button
                onClick={() => setActiveTab('pending')}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors"
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue Trend */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Revenue Trend</h3>
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {(['day', 'week', 'month'] as const).map((interval) => (
                    <button
                      key={interval}
                      onClick={() => setTrendInterval(interval)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        trendInterval === interval ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {interval.charAt(0).toUpperCase() + interval.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-5">
                {byPeriod.length === 0 ? (
                  <EmptyState message="No data for selected period" />
                ) : (
                  <div className="space-y-3">
                    {byPeriod.slice(-10).map((period, index) => {
                      const maxAmount = Math.max(...byPeriod.map((p) => p.collected + p.pending));
                      const collectedPercent = maxAmount > 0 ? (period.collected / maxAmount) * 100 : 0;
                      const pendingPercent = maxAmount > 0 ? (period.pending / maxAmount) * 100 : 0;
                      return (
                        <div key={index} className="flex items-center gap-4">
                          <div className="w-16 text-xs font-medium text-gray-600">{period.period.slice(-5)}</div>
                          <div className="flex-1 flex h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div className="bg-green-500 h-full transition-all" style={{ width: `${collectedPercent}%` }} />
                            <div className="bg-amber-400 h-full transition-all" style={{ width: `${pendingPercent}%` }} />
                          </div>
                          <div className="w-28 text-right text-sm font-semibold text-gray-900">{formatCurrency(period.collected)}</div>
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-6 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded" />
                        <span className="text-xs text-gray-600">Collected</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-amber-400 rounded" />
                        <span className="text-xs text-gray-600">Pending</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Grid: Category + Methods + Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Revenue by Category */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Revenue by Category</h3>
                </div>
                <div className="p-5">
                  {byCategory.length === 0 ? (
                    <EmptyState message="No categories found" />
                  ) : (
                    <div className="space-y-3">
                      {byCategory.slice(0, 5).map((cat, index) => {
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2.5 h-2.5 rounded-full ${colors[index % colors.length]}`} />
                              <span className="text-sm text-gray-700 truncate max-w-[150px]">{cat.category}</span>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-gray-900">{formatCurrency(cat.amount)}</p>
                              <p className="text-xs text-gray-400">{cat.percentage}%</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Payment Methods</h3>
                </div>
                <div className="p-5">
                  {byMethod.length === 0 ? (
                    <EmptyState message="No payment data" />
                  ) : (
                    <div className="space-y-4">
                      {byMethod.map((method, index) => {
                        const colors: Record<string, string> = {
                          CASH: 'bg-green-500',
                          CARD: 'bg-blue-500',
                          UPI: 'bg-purple-500',
                          BANK_TRANSFER: 'bg-cyan-500',
                          CHEQUE: 'bg-orange-500',
                          ONLINE: 'bg-indigo-500',
                        };
                        return (
                          <div key={index}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <BanknotesIcon className="w-4 h-4 text-gray-400" />
                                <span className="text-sm font-medium text-gray-700">{method.method}</span>
                              </div>
                              <span className="text-xs text-gray-400">{method.count} txns</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex-1 bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${colors[method.method] || 'bg-gray-400'}`}
                                  style={{ width: `${parseFloat(method.percentage)}%` }}
                                />
                              </div>
                              <span className="text-sm font-semibold text-gray-900 w-24 text-right">{formatCurrency(method.amount)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">Quick Stats</h3>
                </div>
                <div className="p-5 space-y-4">
                  <StatItem label="Total Transactions" value={summary.totalTransactions.toString()} />
                  <StatItem label="Avg Transaction" value={formatCurrency(summary.avgTransactionValue)} color="text-blue-600" />
                  <StatItem label="Overdue Amount" value={formatCurrency(pending.overdueAmount)} color="text-amber-600" />
                  <StatItem label="Collection Rate" value={`${summary.collectionRate}%`} color="text-green-600" />
                </div>
              </div>
            </div>

            {/* Grid: Collectors + Branch + Course */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Top Collectors */}
              {collectors.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrophyIcon className="w-5 h-5 text-yellow-500" />
                      <h3 className="font-semibold text-gray-900">Top Collectors</h3>
                    </div>
                    <button onClick={() => setActiveTab('collectors')} className="text-xs text-purple-600 hover:text-purple-700 font-medium">
                      View All
                    </button>
                  </div>
                  <div className="p-5 space-y-3">
                    {collectors.slice(0, 3).map((collector, index) => (
                      <div key={collector.userId} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-400'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{collector.userName}</p>
                          <p className="text-xs text-gray-400">{collector.transactionCount} txns</p>
                        </div>
                        <p className="text-sm font-bold text-green-600">{formatCurrency(collector.collectedAmount)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Branch-wise Revenue */}
              {byBranch && byBranch.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Branch Revenue</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {byBranch.slice(0, 4).map((branch, index) => {
                      const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                      return (
                        <div key={branch.branchId}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-gray-700 truncate max-w-[150px]">{branch.branchName}</span>
                            <span className="text-xs text-gray-400">{branch.percentage}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${colors[index % colors.length]}`} style={{ width: `${parseFloat(branch.percentage)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-900">{formatCurrency(branch.collected)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Course-wise Revenue */}
              {byCourse && byCourse.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <AcademicCapIcon className="w-5 h-5 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">Course Revenue</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {byCourse.slice(0, 4).map((course, index) => (
                      <div key={course.courseId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{course.courseName}</p>
                          <p className="text-xs text-gray-400">{course.admissions} admissions</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatCurrency(course.collected)}</p>
                          <p className="text-xs text-gray-400">{course.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Other tabs content remains the same but with updated styling */}
        {activeTab === 'transactions' && (
          <DataTable
            title="Payment Transactions"
            subtitle={`${transactions?.total || 0} transactions in selected period`}
            columns={['Date', 'Lead/Student', 'Contact', 'Amount', 'Method', 'Type', 'Reference', 'Status', 'Collected By']}
            emptyMessage="No transactions found"
            data={transactions?.transactions || []}
            renderRow={(txn) => (
              <tr key={txn.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{formatDate(txn.paidAt || txn.createdAt)}</p>
                  <p className="text-xs text-gray-400">{new Date(txn.paidAt || txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{txn.leadName}</p>
                  {txn.description && <p className="text-xs text-gray-400 truncate max-w-[150px]">{txn.description}</p>}
                </td>
                <td className="px-4 py-3">
                  {txn.phone && <div className="flex items-center gap-1 text-xs text-gray-500"><PhoneIcon className="w-3 h-3" />{txn.phone}</div>}
                  {txn.email && <div className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[120px]"><EnvelopeIcon className="w-3 h-3" />{txn.email}</div>}
                </td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(txn.amount)}</td>
                <td className="px-4 py-3"><Badge text={txn.paymentMethod} variant={txn.paymentMethod === 'CASH' ? 'green' : txn.paymentMethod === 'UPI' ? 'purple' : 'blue'} /></td>
                <td className="px-4 py-3 text-sm text-gray-500">{txn.paymentType}</td>
                <td className="px-4 py-3">{txn.referenceNumber ? <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{txn.referenceNumber}</code> : <span className="text-gray-300">-</span>}</td>
                <td className="px-4 py-3"><Badge text={txn.status} variant={txn.status === 'COMPLETED' ? 'green' : txn.status === 'PENDING' ? 'amber' : 'red'} /></td>
                <td className="px-4 py-3 text-sm text-gray-500">{txn.collectorName}</td>
              </tr>
            )}
          />
        )}

        {activeTab === 'pending' && (
          <DataTable
            title="Pending Payments"
            subtitle={`Total: ${formatCurrency(pending.totalPending)} | Overdue: ${formatCurrency(pending.overdueAmount)}`}
            columns={['Student', 'Phone', 'Amount', 'Due Date', 'Status', 'Split']}
            emptyMessage="No pending payments"
            data={pending.payments}
            renderRow={(payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{payment.studentName}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{payment.phone || '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">{formatCurrency(payment.amount)}</td>
                <td className="px-4 py-3 text-sm text-gray-500">{formatDate(payment.dueDate)}</td>
                <td className="px-4 py-3">
                  {payment.daysPastDue > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-red-50 text-red-600 rounded-full">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      {payment.daysPastDue}d overdue
                    </span>
                  ) : (
                    <Badge text="Pending" variant="amber" />
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">{payment.splitNumber ? `#${payment.splitNumber}` : 'Full'}</td>
              </tr>
            )}
          />
        )}

        {activeTab === 'collectors' && (
          <DataTable
            title="Collector Performance"
            columns={['#', 'Collector', 'Collected', 'Transactions', 'Avg Collection']}
            emptyMessage="No collector data"
            data={collectors}
            renderRow={(collector, index) => (
              <tr key={collector.userId} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-gray-300'
                  }`}>
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{collector.userName}</td>
                <td className="px-4 py-3 text-right text-sm font-bold text-green-600">{formatCurrency(collector.collectedAmount)}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">{collector.transactionCount}</td>
                <td className="px-4 py-3 text-right text-sm text-gray-500">{formatCurrency(collector.avgCollection)}</td>
              </tr>
            )}
          />
        )}

        {activeTab === 'refunds' && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-2xl font-bold text-red-600">{formatCurrency(refunds.totalRefunded)}</p>
                <p className="text-sm text-gray-500">Total Refunded</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-2xl font-bold text-gray-900">{refunds.refundCount}</p>
                <p className="text-sm text-gray-500">Refund Count</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(refunds.avgRefundAmount)}</p>
                <p className="text-sm text-gray-500">Avg Refund</p>
              </div>
            </div>
            <DataTable
              title="Recent Refunds"
              columns={['Student', 'Amount', 'Refunded On']}
              emptyMessage="No refunds in this period"
              data={refunds.refunds}
              renderRow={(refund) => (
                <tr key={refund.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{refund.studentName}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-red-600">-{formatCurrency(refund.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(refund.refundedAt)}</td>
                </tr>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Reusable Components
function SummaryCard({ title, value, subtitle, change, icon: Icon, iconBg, iconColor, valueColor, subtitleColor }: {
  title: string; value: string; subtitle: string; change?: number; icon: React.ElementType;
  iconBg: string; iconColor: string; valueColor?: string; subtitleColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className={`text-2xl font-bold ${valueColor || 'text-gray-900'}`}>{value}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs ${subtitleColor || 'text-gray-400'}`}>{subtitle}</span>
            {change !== undefined && change !== 0 && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${change > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {change > 0 ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                {change > 0 ? '+' : ''}{change}%
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-xl ${iconBg}`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${color || 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

function Badge({ text, variant }: { text: string; variant: 'green' | 'amber' | 'red' | 'blue' | 'purple' }) {
  const colors = {
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colors[variant]}`}>{text}</span>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <ChartBarIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

function DataTable({ title, subtitle, columns, data, renderRow, emptyMessage }: {
  title: string; subtitle?: string; columns: string[]; data: any[]; renderRow: (item: any, index: number) => React.ReactNode; emptyMessage: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider ${col === 'Amount' || col === 'Collected' || col === 'Transactions' || col === 'Avg Collection' ? 'text-right' : 'text-left'}`}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">{emptyMessage}</td></tr>
            ) : (
              data.map((item, index) => renderRow(item, index))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
