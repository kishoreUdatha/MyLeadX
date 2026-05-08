import React, { useState, useEffect } from 'react';
import {
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  DocumentCheckIcon,
  XMarkIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import api from '../../services/api';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  companyName?: string;
  partnerCode: string;
}

interface BankDetails {
  id: string;
  accountHolderName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  upiId?: string;
}

interface Payout {
  id: string;
  partnerId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  rejectionReason?: string;
  createdAt: string;
  approvedAt?: string;
  processedAt?: string;
  partner: Partner;
  bankDetails?: BankDetails;
}

interface PayoutStats {
  pending: { count: number; amount: number };
  approved: { count: number; amount: number };
  completed: { count: number; amount: number };
  rejected: { count: number; amount: number };
}

const statusColors: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: ClockIcon },
  APPROVED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: DocumentCheckIcon },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircleIcon },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircleIcon },
};

export const PayoutManagementPage: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showActionModal, setShowActionModal] = useState<'approve' | 'reject' | 'complete' | null>(null);
  const [actionData, setActionData] = useState({
    notes: '',
    reason: '',
    transactionId: '',
    paymentMethod: 'BANK_TRANSFER',
  });
  const [processing, setProcessing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });

  useEffect(() => {
    fetchPayouts();
    fetchStats();
  }, [filters, pagination.page]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await api.get(`/admission-partners/payouts?${params.toString()}`);

      if (response.data.success) {
        let data = response.data.data || [];

        // Client-side search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          data = data.filter((p: Payout) =>
            p.partner.name.toLowerCase().includes(searchLower) ||
            p.partner.partnerCode.toLowerCase().includes(searchLower) ||
            p.partner.email.toLowerCase().includes(searchLower)
          );
        }

        setPayouts(data);
        if (response.data.pagination) {
          setPagination(prev => ({ ...prev, ...response.data.pagination }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch payouts:', error);
      toast.error('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Calculate stats from payouts or use a separate endpoint
      const [pending, approved, completed, rejected] = await Promise.all([
        api.get('/admission-partners/payouts?status=PENDING&limit=1000'),
        api.get('/admission-partners/payouts?status=APPROVED&limit=1000'),
        api.get('/admission-partners/payouts?status=COMPLETED&limit=1000'),
        api.get('/admission-partners/payouts?status=REJECTED&limit=1000'),
      ]);

      const calcStats = (data: Payout[]) => ({
        count: data.length,
        amount: data.reduce((sum, p) => sum + Number(p.amount), 0),
      });

      setStats({
        pending: calcStats(pending.data.data || []),
        approved: calcStats(approved.data.data || []),
        completed: calcStats(completed.data.data || []),
        rejected: calcStats(rejected.data.data || []),
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleAction = async () => {
    if (!selectedPayout || !showActionModal) return;

    setProcessing(true);
    try {
      let response;

      switch (showActionModal) {
        case 'approve':
          response = await api.post(`/admission-partners/payouts/${selectedPayout.id}/approve`, {
            notes: actionData.notes,
          });
          toast.success('Payout approved successfully');
          break;
        case 'reject':
          if (!actionData.reason) {
            toast.error('Please provide a rejection reason');
            setProcessing(false);
            return;
          }
          response = await api.post(`/admission-partners/payouts/${selectedPayout.id}/reject`, {
            reason: actionData.reason,
          });
          toast.success('Payout rejected');
          break;
        case 'complete':
          if (!actionData.transactionId) {
            toast.error('Please provide transaction ID');
            setProcessing(false);
            return;
          }
          response = await api.post(`/admission-partners/payouts/${selectedPayout.id}/complete`, {
            transactionId: actionData.transactionId,
            paymentMethod: actionData.paymentMethod,
            notes: actionData.notes,
          });
          toast.success('Payout marked as completed');
          break;
      }

      setShowActionModal(null);
      setSelectedPayout(null);
      setActionData({ notes: '', reason: '', transactionId: '', paymentMethod: 'BANK_TRANSFER' });
      fetchPayouts();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(false);
    }
  };

  const openActionModal = (payout: Payout, action: 'approve' | 'reject' | 'complete') => {
    setSelectedPayout(payout);
    setShowActionModal(action);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payout Management</h1>
          <p className="text-gray-600">Manage partner payout requests</p>
        </div>
        <button
          onClick={() => { fetchPayouts(); fetchStats(); }}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowPathIcon className="h-5 w-5" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending.count}</p>
                <p className="text-sm text-yellow-600">{formatCurrency(stats.pending.amount)}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.approved.count}</p>
                <p className="text-sm text-blue-600">{formatCurrency(stats.approved.amount)}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completed.count}</p>
                <p className="text-sm text-green-600">{formatCurrency(stats.completed.amount)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rejected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.rejected.count}</p>
                <p className="text-sm text-red-600">{formatCurrency(stats.rejected.amount)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <XCircleIcon className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search partner name, code, email..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="From Date"
          />

          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="To Date"
          />

          {(filters.status || filters.search || filters.startDate || filters.endDate) && (
            <button
              onClick={() => setFilters({ status: '', search: '', startDate: '', endDate: '' })}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : payouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <BanknotesIcon className="h-12 w-12 mb-3 text-gray-300" />
            <p>No payout requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bank Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Requested</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payouts.map((payout) => {
                  const statusStyle = statusColors[payout.status];
                  const StatusIcon = statusStyle.icon;

                  return (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{payout.partner.name}</p>
                          <p className="text-sm text-gray-500">{payout.partner.partnerCode}</p>
                          <p className="text-xs text-gray-400">{payout.partner.email}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-lg font-bold text-gray-900">
                          {formatCurrency(payout.amount)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                          <StatusIcon className="h-3.5 w-3.5" />
                          {payout.status}
                        </span>
                        {payout.transactionId && (
                          <p className="text-xs text-gray-500 mt-1">
                            Txn: {payout.transactionId}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {payout.bankDetails ? (
                          <div className="text-sm">
                            <p className="text-gray-900">{payout.bankDetails.bankName}</p>
                            <p className="text-gray-500">A/C: ****{payout.bankDetails.accountNumber.slice(-4)}</p>
                            <p className="text-gray-500">IFSC: {payout.bankDetails.ifscCode}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No bank details</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(payout.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {payout.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => openActionModal(payout, 'approve')}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                title="Approve"
                              >
                                <CheckCircleIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => openActionModal(payout, 'reject')}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                title="Reject"
                              >
                                <XCircleIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                          {(payout.status === 'APPROVED' || payout.status === 'PENDING') && (
                            <button
                              onClick={() => openActionModal(payout, 'complete')}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Mark Complete"
                            >
                              <BanknotesIcon className="h-5 w-5" />
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayout(payout)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            title="View Details"
                          >
                            <EyeIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <p className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && selectedPayout && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {showActionModal === 'approve' && 'Approve Payout'}
                {showActionModal === 'reject' && 'Reject Payout'}
                {showActionModal === 'complete' && 'Complete Payout'}
              </h3>
              <button
                onClick={() => { setShowActionModal(null); setSelectedPayout(null); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Payout Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Partner:</span>
                  <span className="font-medium">{selectedPayout.partner.name}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-lg">{formatCurrency(selectedPayout.amount)}</span>
                </div>
                {selectedPayout.bankDetails && (
                  <div className="text-sm text-gray-500 mt-2 pt-2 border-t">
                    <p>{selectedPayout.bankDetails.bankName}</p>
                    <p>A/C: {selectedPayout.bankDetails.accountNumber}</p>
                    <p>IFSC: {selectedPayout.bankDetails.ifscCode}</p>
                    <p>Name: {selectedPayout.bankDetails.accountHolderName}</p>
                  </div>
                )}
              </div>

              {/* Action-specific fields */}
              {showActionModal === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={actionData.reason}
                    onChange={(e) => setActionData(prev => ({ ...prev, reason: e.target.value }))}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Enter reason for rejection..."
                    required
                  />
                </div>
              )}

              {showActionModal === 'complete' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={actionData.transactionId}
                      onChange={(e) => setActionData(prev => ({ ...prev, transactionId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="UTR/Reference number"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={actionData.paymentMethod}
                      onChange={(e) => setActionData(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                      <option value="IMPS">IMPS</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                      <option value="CASH">Cash</option>
                    </select>
                  </div>
                </>
              )}

              {(showActionModal === 'approve' || showActionModal === 'complete') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={actionData.notes}
                    onChange={(e) => setActionData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Add any notes..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => { setShowActionModal(null); setSelectedPayout(null); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  showActionModal === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  showActionModal === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {processing ? 'Processing...' : (
                  showActionModal === 'approve' ? 'Approve' :
                  showActionModal === 'reject' ? 'Reject' :
                  'Mark Complete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {selectedPayout && !showActionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Payout Details</h3>
              <button
                onClick={() => setSelectedPayout(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Partner</p>
                  <p className="font-medium">{selectedPayout.partner.name}</p>
                  <p className="text-sm text-gray-500">{selectedPayout.partner.partnerCode}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="text-xl font-bold text-primary-600">{formatCurrency(selectedPayout.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[selectedPayout.status].bg} ${statusColors[selectedPayout.status].text}`}>
                    {selectedPayout.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Requested On</p>
                  <p className="font-medium">{formatDate(selectedPayout.createdAt)}</p>
                </div>
              </div>

              {selectedPayout.bankDetails && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium mb-2">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Bank:</span> {selectedPayout.bankDetails.bankName}
                    </div>
                    <div>
                      <span className="text-gray-500">Account:</span> {selectedPayout.bankDetails.accountNumber}
                    </div>
                    <div>
                      <span className="text-gray-500">IFSC:</span> {selectedPayout.bankDetails.ifscCode}
                    </div>
                    <div>
                      <span className="text-gray-500">Name:</span> {selectedPayout.bankDetails.accountHolderName}
                    </div>
                  </div>
                </div>
              )}

              {selectedPayout.transactionId && (
                <div>
                  <p className="text-sm text-gray-500">Transaction ID</p>
                  <p className="font-medium font-mono">{selectedPayout.transactionId}</p>
                </div>
              )}

              {selectedPayout.rejectionReason && (
                <div className="bg-red-50 rounded-lg p-4">
                  <p className="text-sm text-red-600 font-medium">Rejection Reason</p>
                  <p className="text-red-700">{selectedPayout.rejectionReason}</p>
                </div>
              )}

              {selectedPayout.notes && (
                <div>
                  <p className="text-sm text-gray-500">Notes</p>
                  <p className="text-gray-700">{selectedPayout.notes}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-4 border-t">
              <button
                onClick={() => setSelectedPayout(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              {selectedPayout.status === 'PENDING' && (
                <>
                  <button
                    onClick={() => setShowActionModal('approve')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => setShowActionModal('complete')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Complete
                  </button>
                </>
              )}
              {selectedPayout.status === 'APPROVED' && (
                <button
                  onClick={() => setShowActionModal('complete')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Mark Complete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayoutManagementPage;
