/**
 * Super Admin Billing Dashboard - Comprehensive billing management
 */
import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition, Tab } from '@headlessui/react';
import {
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  UsersIcon,
  CreditCardIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  TicketIcon,
  ChartBarIcon,
  DocumentTextIcon,
  XMarkIcon,
  CheckCircleIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

// Types
interface BillingDashboard {
  mrr: number;
  arr: number;
  mrrGrowth: number;
  subscriptionStats: {
    total: number;
    active: number;
    trial: number;
    cancelled: number;
    pastDue: number;
  };
  walletTotals: {
    totalBalance: number;
    totalCredits: number;
    totalDebits: number;
  };
  promoStats: {
    totalCodes: number;
    activeCodes: number;
    totalRedemptions: number;
    totalDiscountGiven: number;
  };
  recentActivity: Array<{
    type: string;
    description: string;
    amount: number;
    organizationName: string;
    createdAt: string;
  }>;
}

interface WalletTransaction {
  id: string;
  organizationId: string;
  type: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
  organization?: { name: string; email?: string };
}

interface Subscription {
  id: string;
  organizationId: string;
  planId: string;
  status: string;
  billingCycle: string;
  amount: number;
  startDate: string;
  endDate: string;
  organization?: { name: string };
  plan?: { name: string };
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
  organization?: { name: string };
}

interface PromoAnalytics {
  codes: Array<{
    id: string;
    code: string;
    discountType: string;
    discountValue: number;
    usedCount: number;
    maxUses: number | null;
    totalDiscountGiven: number;
    isActive: boolean;
  }>;
  summary: {
    totalCodes: number;
    activeCodes: number;
    totalRedemptions: number;
    totalDiscountGiven: number;
  };
}

interface ChurnData {
  month: string;
  totalStart: number;
  cancelled: number;
  churnRate: number;
  revenue: number;
  revenueChurn: number;
}

interface ForecastData {
  month: string;
  projectedMRR: number;
  activeSubscriptions: number;
}

// Helper functions
const formatCurrency = (amount: number, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-green-100 text-green-800',
    PAID: 'bg-green-100 text-green-800',
    TRIAL: 'bg-blue-100 text-blue-800',
    PENDING: 'bg-yellow-100 text-yellow-800',
    CANCELLED: 'bg-red-100 text-red-800',
    FAILED: 'bg-red-100 text-red-800',
    PAST_DUE: 'bg-orange-100 text-orange-800',
    CREDIT: 'bg-green-100 text-green-800',
    DEBIT: 'bg-red-100 text-red-800',
    REFUND: 'bg-purple-100 text-purple-800',
  };
  return colors[status] || 'bg-slate-100 text-slate-800';
};

export default function BillingPage() {
  // State
  const [dashboard, setDashboard] = useState<BillingDashboard | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [promoAnalytics, setPromoAnalytics] = useState<PromoAnalytics | null>(null);
  const [churnData, setChurnData] = useState<ChurnData[]>([]);
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [failedPayments, setFailedPayments] = useState<WalletTransaction[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Filters
  const [transactionFilter, setTransactionFilter] = useState({ status: '', type: '' });
  const [subscriptionFilter, setSubscriptionFilter] = useState({ status: '' });

  // Pagination
  const [transactionPage, setTransactionPage] = useState(1);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);

  // Modals
  const [walletAdjustModalOpen, setWalletAdjustModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedOrganization, setSelectedOrganization] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    fetchDashboard();
    fetchTransactions();
    fetchSubscriptions();
    fetchInvoices();
    fetchPromoAnalytics();
    fetchChurnData();
    fetchForecast();
    fetchFailedPayments();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/super-admin/billing/dashboard');
      setDashboard(res.data.data);
    } catch (error) {
      console.error('Failed to fetch billing dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (transactionFilter.status) params.append('status', transactionFilter.status);
      if (transactionFilter.type) params.append('type', transactionFilter.type);

      const res = await api.get(`/super-admin/billing/transactions?${params}`);
      setTransactions(res.data.data.transactions || []);
      setTransactionPage(page);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    }
  };

  const fetchSubscriptions = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (subscriptionFilter.status) params.append('status', subscriptionFilter.status);

      const res = await api.get(`/super-admin/billing/subscriptions?${params}`);
      setSubscriptions(res.data.data.subscriptions || []);
      setSubscriptionPage(page);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  };

  const fetchInvoices = async (page = 1) => {
    try {
      const res = await api.get(`/super-admin/billing/invoices?page=${page}&limit=20`);
      setInvoices(res.data.data.invoices || []);
      setInvoicePage(page);
    } catch (error) {
      console.error('Failed to fetch invoices:', error);
    }
  };

  const fetchPromoAnalytics = async () => {
    try {
      const res = await api.get('/super-admin/billing/promo-analytics');
      setPromoAnalytics(res.data.data);
    } catch (error) {
      console.error('Failed to fetch promo analytics:', error);
    }
  };

  const fetchChurnData = async () => {
    try {
      const res = await api.get('/super-admin/billing/churn?months=6');
      setChurnData(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch churn data:', error);
    }
  };

  const fetchForecast = async () => {
    try {
      const res = await api.get('/super-admin/billing/forecast?months=3');
      setForecastData(res.data.data || []);
    } catch (error) {
      console.error('Failed to fetch forecast:', error);
    }
  };

  const fetchFailedPayments = async () => {
    try {
      const res = await api.get('/super-admin/billing/failed-payments');
      setFailedPayments(res.data.data.transactions || []);
    } catch (error) {
      console.error('Failed to fetch failed payments:', error);
    }
  };

  const handleExport = async (type: 'transactions' | 'subscriptions' | 'invoices') => {
    try {
      const res = await api.get(`/super-admin/billing/export?type=${type}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}-export-${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Billing Dashboard</h1>
          <p className="text-slate-500">Platform-wide billing, subscriptions, and revenue analytics</p>
        </div>
        <button
          onClick={() => {
            fetchDashboard();
            fetchTransactions();
            fetchSubscriptions();
            fetchInvoices();
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* MRR */}
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboard?.mrr || 0)}</p>
              {dashboard?.mrrGrowth !== undefined && (
                <p className={`text-sm mt-1 ${dashboard.mrrGrowth >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {dashboard.mrrGrowth >= 0 ? '+' : ''}{dashboard.mrrGrowth.toFixed(1)}% vs last month
                </p>
              )}
            </div>
            <CurrencyRupeeIcon className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        {/* ARR */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Annual Recurring Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(dashboard?.arr || 0)}</p>
            </div>
            <ArrowTrendingUpIcon className="w-10 h-10 text-blue-200" />
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Active Subscriptions</p>
              <p className="text-3xl font-bold text-slate-900">
                {dashboard?.subscriptionStats?.active || 0}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {dashboard?.subscriptionStats?.trial || 0} in trial
              </p>
            </div>
            <UsersIcon className="w-10 h-10 text-green-500" />
          </div>
        </div>

        {/* Wallet Balance Total */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-500 text-sm">Total Wallet Balance</p>
              <p className="text-3xl font-bold text-slate-900">
                {formatCurrency(dashboard?.walletTotals?.totalBalance || 0)}
              </p>
            </div>
            <CreditCardIcon className="w-10 h-10 text-amber-500" />
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Past Due</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboard?.subscriptionStats?.pastDue || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Cancelled</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboard?.subscriptionStats?.cancelled || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TicketIcon className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Promo Redemptions</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboard?.promoStats?.totalRedemptions || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Promo Codes</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboard?.promoStats?.activeCodes || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-slate-100 p-1">
          {['Transactions', 'Subscriptions', 'Invoices', 'Promo Codes', 'Churn & Forecast', 'Failed Payments'].map((tab) => (
            <Tab
              key={tab}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-colors
                ${selected
                  ? 'bg-white text-purple-700 shadow'
                  : 'text-slate-600 hover:bg-white/50 hover:text-slate-900'
                }`
              }
            >
              {tab}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels className="mt-4">
          {/* Transactions Panel */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-slate-900">Wallet Transactions</h3>
                  <div className="flex items-center gap-2">
                    <select
                      value={transactionFilter.type}
                      onChange={(e) => {
                        setTransactionFilter(f => ({ ...f, type: e.target.value }));
                        fetchTransactions(1);
                      }}
                      className="text-sm border-slate-300 rounded-md"
                    >
                      <option value="">All Types</option>
                      <option value="CREDIT">Credit</option>
                      <option value="DEBIT">Debit</option>
                      <option value="REFUND">Refund</option>
                    </select>
                    <select
                      value={transactionFilter.status}
                      onChange={(e) => {
                        setTransactionFilter(f => ({ ...f, status: e.target.value }));
                        fetchTransactions(1);
                      }}
                      className="text-sm border-slate-300 rounded-md"
                    >
                      <option value="">All Status</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="PENDING">Pending</option>
                      <option value="FAILED">Failed</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setWalletAdjustModalOpen(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Adjust Wallet
                  </button>
                  <button
                    onClick={() => handleExport('transactions')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm text-slate-600">{formatDate(tx.createdAt)}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{tx.organization?.name || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(tx.type)}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">
                          {formatCurrency(tx.amount, tx.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">{tx.description}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => {
                              setSelectedOrganization({ id: tx.organizationId, name: tx.organization?.name || '' });
                              setRefundModalOpen(true);
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            Refund
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => fetchTransactions(transactionPage - 1)}
                  disabled={transactionPage <= 1}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {transactionPage}</span>
                <button
                  onClick={() => fetchTransactions(transactionPage + 1)}
                  disabled={transactions.length < 20}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* Subscriptions Panel */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h3 className="font-semibold text-slate-900">All Subscriptions</h3>
                  <select
                    value={subscriptionFilter.status}
                    onChange={(e) => {
                      setSubscriptionFilter({ status: e.target.value });
                      fetchSubscriptions(1);
                    }}
                    className="text-sm border-slate-300 rounded-md"
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="TRIAL">Trial</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="PAST_DUE">Past Due</option>
                  </select>
                </div>
                <button
                  onClick={() => handleExport('subscriptions')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Plan</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Billing</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Start Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((sub) => (
                      <tr key={sub.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{sub.organization?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{sub.plan?.name || sub.planId}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(sub.status)}`}>
                            {sub.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600 capitalize">{sub.billingCycle?.toLowerCase()}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{formatCurrency(sub.amount)}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{sub.startDate ? formatDate(sub.startDate) : '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{sub.endDate ? formatDate(sub.endDate) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => fetchSubscriptions(subscriptionPage - 1)}
                  disabled={subscriptionPage <= 1}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {subscriptionPage}</span>
                <button
                  onClick={() => fetchSubscriptions(subscriptionPage + 1)}
                  disabled={subscriptions.length < 20}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* Invoices Panel */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">All Invoices</h3>
                <button
                  onClick={() => handleExport('invoices')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                  Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Invoice #</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Tax</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Total</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Due Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-sm font-medium text-purple-600">{inv.invoiceNumber}</td>
                        <td className="py-3 px-4 text-sm text-slate-900">{inv.organization?.name || 'N/A'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{formatCurrency(inv.amount)}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{formatCurrency(inv.taxAmount)}</td>
                        <td className="py-3 px-4 text-sm font-medium text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-slate-600">{inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{inv.paidAt ? formatDate(inv.paidAt) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => fetchInvoices(invoicePage - 1)}
                  disabled={invoicePage <= 1}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {invoicePage}</span>
                <button
                  onClick={() => fetchInvoices(invoicePage + 1)}
                  disabled={invoices.length < 20}
                  className="px-3 py-1.5 text-sm text-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </Tab.Panel>

          {/* Promo Codes Panel */}
          <Tab.Panel>
            <div className="space-y-6">
              {/* Promo Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Total Codes</p>
                  <p className="text-2xl font-bold text-slate-900">{promoAnalytics?.summary?.totalCodes || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Active Codes</p>
                  <p className="text-2xl font-bold text-green-600">{promoAnalytics?.summary?.activeCodes || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Total Redemptions</p>
                  <p className="text-2xl font-bold text-purple-600">{promoAnalytics?.summary?.totalRedemptions || 0}</p>
                </div>
                <div className="bg-white rounded-lg p-4 border border-slate-200">
                  <p className="text-sm text-slate-500">Total Discount Given</p>
                  <p className="text-2xl font-bold text-amber-600">{formatCurrency(promoAnalytics?.summary?.totalDiscountGiven || 0)}</p>
                </div>
              </div>

              {/* Promo Codes Table */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Promo Code Performance</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Code</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Value</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Used</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Max Uses</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Discount Given</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoAnalytics?.codes?.map((code) => (
                        <tr key={code.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm font-mono font-medium text-slate-900">{code.code}</td>
                          <td className="py-3 px-4 text-sm text-slate-600 capitalize">{code.discountType.toLowerCase()}</td>
                          <td className="py-3 px-4 text-sm text-slate-900">
                            {code.discountType === 'PERCENTAGE' ? `${code.discountValue}%` : formatCurrency(code.discountValue)}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-600">{code.usedCount}</td>
                          <td className="py-3 px-4 text-sm text-slate-600">{code.maxUses || 'Unlimited'}</td>
                          <td className="py-3 px-4 text-sm font-medium text-amber-600">{formatCurrency(code.totalDiscountGiven)}</td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${code.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {code.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Churn & Forecast Panel */}
          <Tab.Panel>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Churn Analytics */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Churn Analytics (Last 6 Months)</h3>
                <div className="space-y-4">
                  {churnData.map((data, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{data.month}</p>
                        <p className="text-sm text-slate-500">
                          {data.totalStart} subscribers, {data.cancelled} cancelled
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${data.churnRate > 5 ? 'text-red-600' : data.churnRate > 2 ? 'text-amber-600' : 'text-green-600'}`}>
                          {data.churnRate.toFixed(1)}%
                        </p>
                        <p className="text-xs text-slate-500">churn rate</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revenue Forecast */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-4">Revenue Forecast (Next 3 Months)</h3>
                <div className="space-y-4">
                  {forecastData.map((data, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{data.month}</p>
                        <p className="text-sm text-slate-500">
                          {data.activeSubscriptions} active subscriptions
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-600">
                          {formatCurrency(data.projectedMRR)}
                        </p>
                        <p className="text-xs text-slate-500">projected MRR</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Tab.Panel>

          {/* Failed Payments Panel */}
          <Tab.Panel>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-slate-900">Failed & Pending Payments</h3>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Organization</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Amount</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Status</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Description</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {failedPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No failed or pending payments
                        </td>
                      </tr>
                    ) : (
                      failedPayments.map((tx) => (
                        <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4 text-sm text-slate-600">{formatDate(tx.createdAt)}</td>
                          <td className="py-3 px-4">
                            <p className="text-sm font-medium text-slate-900">{tx.organization?.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{tx.organization?.email}</p>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(tx.status)}`}>
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">{tx.description}</td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => {
                                setSelectedOrganization({ id: tx.organizationId, name: tx.organization?.name || '' });
                                setWalletAdjustModalOpen(true);
                              }}
                              className="text-xs text-purple-600 hover:text-purple-800"
                            >
                              Credit Wallet
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Wallet Adjust Modal */}
      <WalletAdjustModal
        isOpen={walletAdjustModalOpen}
        onClose={() => {
          setWalletAdjustModalOpen(false);
          setSelectedOrganization(null);
        }}
        organization={selectedOrganization}
        onSuccess={() => {
          setWalletAdjustModalOpen(false);
          setSelectedOrganization(null);
          fetchTransactions();
          fetchDashboard();
        }}
      />

      {/* Refund Modal */}
      <RefundModal
        isOpen={refundModalOpen}
        onClose={() => {
          setRefundModalOpen(false);
          setSelectedOrganization(null);
        }}
        organization={selectedOrganization}
        onSuccess={() => {
          setRefundModalOpen(false);
          setSelectedOrganization(null);
          fetchTransactions();
          fetchDashboard();
        }}
      />
    </div>
  );
}

// Wallet Adjust Modal Component
function WalletAdjustModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  organization: { id: string; name: string } | null;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [reason, setReason] = useState('');
  const [orgSearch, setOrgSearch] = useState('');
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string } | null>(organization);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setSelectedOrg(organization);
  }, [organization]);

  const searchOrganizations = async (query: string) => {
    if (query.length < 2) return;
    try {
      const res = await api.get(`/super-admin/organizations?search=${query}&limit=10`);
      setOrganizations(res.data.data.organizations || []);
    } catch (err) {
      console.error('Failed to search organizations:', err);
    }
  };

  const handleSubmit = async () => {
    if (!selectedOrg || !amount || !reason) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/super-admin/billing/wallet-adjust', {
        organizationId: selectedOrg.id,
        amount: parseFloat(amount),
        type,
        reason,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to adjust wallet');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-slate-900 mb-4">
                  Adjust Wallet Balance
                </Dialog.Title>

                <div className="space-y-4">
                  {/* Organization Selection */}
                  {!organization && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Organization
                      </label>
                      <input
                        type="text"
                        value={orgSearch}
                        onChange={(e) => {
                          setOrgSearch(e.target.value);
                          searchOrganizations(e.target.value);
                        }}
                        placeholder="Search organization..."
                        className="w-full border-slate-300 rounded-lg"
                      />
                      {organizations.length > 0 && (
                        <div className="mt-1 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                          {organizations.map((org) => (
                            <button
                              key={org.id}
                              onClick={() => {
                                setSelectedOrg(org);
                                setOrgSearch(org.name);
                                setOrganizations([]);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                            >
                              {org.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedOrg && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{selectedOrg.name}</p>
                    </div>
                  )}

                  {/* Type */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Type
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setType('CREDIT')}
                        className={`flex-1 py-2 px-4 rounded-lg border ${type === 'CREDIT' ? 'bg-green-50 border-green-500 text-green-700' : 'border-slate-300'}`}
                      >
                        <PlusIcon className="w-4 h-4 inline mr-1" />
                        Credit
                      </button>
                      <button
                        onClick={() => setType('DEBIT')}
                        className={`flex-1 py-2 px-4 rounded-lg border ${type === 'DEBIT' ? 'bg-red-50 border-red-500 text-red-700' : 'border-slate-300'}`}
                      >
                        <MinusIcon className="w-4 h-4 inline mr-1" />
                        Debit
                      </button>
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Amount (INR)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                      min="1"
                      className="w-full border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for adjustment..."
                      rows={2}
                      className="w-full border-slate-300 rounded-lg"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : `${type === 'CREDIT' ? 'Add' : 'Deduct'} Balance`}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

// Refund Modal Component
function RefundModal({
  isOpen,
  onClose,
  organization,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  organization: { id: string; name: string } | null;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!organization || !amount || !reason) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/super-admin/billing/refund', {
        organizationId: organization.id,
        amount: parseFloat(amount),
        reason,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to issue refund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 shadow-xl transition-all">
                <Dialog.Title className="text-lg font-semibold text-slate-900 mb-4">
                  Issue Refund
                </Dialog.Title>

                <div className="space-y-4">
                  {organization && (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-sm font-medium text-slate-900">{organization.name}</p>
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Refund Amount (INR)
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter refund amount"
                      min="1"
                      className="w-full border-slate-300 rounded-lg"
                    />
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Reason
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Reason for refund..."
                      rows={2}
                      className="w-full border-slate-300 rounded-lg"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-red-600">{error}</p>
                  )}

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={onClose}
                      className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                    >
                      {loading ? 'Processing...' : 'Issue Refund'}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
