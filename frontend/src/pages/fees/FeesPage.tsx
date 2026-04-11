import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BanknotesIcon,
  XMarkIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import {
  admissionService,
  Admission,
  AdmissionStats,
  RecordPaymentInput,
} from '../../services/admission.service';
import { universityService } from '../../services/university.service';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function FeesPage() {
  const [admissions, setAdmissions] = useState<Admission[]>([]);
  const [stats, setStats] = useState<AdmissionStats | null>(null);
  const [universities, setUniversities] = useState<Array<{ id: string; name: string; shortName?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [universityFilter, setUniversityFilter] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState<Admission | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState<RecordPaymentInput>({
    amount: 0,
    paymentType: 'FEE',
    paymentMode: 'CASH',
    referenceNumber: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [admissionsData, statsData] = await Promise.all([
        admissionService.getAll({
          paymentStatus: statusFilter || undefined,
          search: search || undefined,
          universityId: universityFilter || undefined,
        }),
        admissionService.getStats(),
      ]);
      setAdmissions(admissionsData.admissions || admissionsData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    universityService.getAll().then(data => {
      setUniversities(data.universities || data || []);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    fetchData();
  }, [statusFilter, universityFilter]);

  const handleSearch = () => {
    fetchData();
  };

  const handleRecordPayment = (admission: Admission) => {
    setSelectedAdmission(admission);
    setPaymentForm({
      amount: Number(admission.pendingAmount) || 0,
      paymentType: 'FEE',
      paymentMode: 'CASH',
      referenceNumber: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleViewDetails = async (admission: Admission) => {
    console.log('View clicked for admission:', admission.id, admission.admissionNumber);
    setSelectedAdmission(admission);
    setShowDetailModal(true);
    setDetailLoading(true);
    try {
      console.log('Fetching admission details...');
      const detailed = await admissionService.getById(admission.id);
      console.log('Fetched admission details:', detailed);
      console.log('Payments:', detailed.payments);
      setSelectedAdmission(detailed);
    } catch (error) {
      console.error('Failed to fetch admission details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const submitPayment = async () => {
    if (!selectedAdmission) return;
    if (paymentForm.amount <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }

    try {
      setPaymentLoading(true);
      await admissionService.recordPayment(selectedAdmission.id, paymentForm);
      toast.success('Payment recorded successfully');
      setShowPaymentModal(false);
      setSelectedAdmission(null);
      fetchData();
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">Paid</span>;
      case 'PARTIAL':
        return <span className="px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">Partial</span>;
      case 'PENDING':
        return <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded">Pending</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">{status}</span>;
    }
  };

  const collectionRate = stats?.financials
    ? ((stats.financials.totalPaid / (stats.financials.totalFee + stats.financials.totalDonation)) * 100).toFixed(1)
    : 0;

  const overdueCount = stats?.byPaymentStatus?.find(s => s.status === 'PENDING')?.count || 0;

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BanknotesIcon className="h-5 w-5 text-green-600" />
          Fee Collection
        </h1>
        <div className="flex items-center gap-4 text-sm">
          {stats && (
            <>
              <div className="flex items-center gap-1.5">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span className="text-gray-600">Collected: <span className="font-semibold text-green-600">{formatCurrency(stats.financials?.totalPaid || 0)}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4 text-yellow-500" />
                <span className="text-gray-600">Pending: <span className="font-semibold text-yellow-600">{formatCurrency(stats.financials?.totalPending || 0)}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-600">Rate: <span className="font-semibold">{collectionRate}%</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                <span className="text-gray-600">Overdue: <span className="font-semibold text-red-600">{overdueCount}</span></span>
              </div>
            </>
          )}
          <button
            onClick={fetchData}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student name, phone, admission number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="h-4 w-4 text-gray-400" />
          <select
            value={universityFilter}
            onChange={e => setUniversityFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Universities</option>
            {universities.map(u => (
              <option key={u.id} value={u.id}>{u.shortName || u.name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-green-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
            <option value="PAID">Paid</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Admission</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">University</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total Fee</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Paid</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Pending</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-gray-500 text-sm">
                    No admissions found
                  </td>
                </tr>
              ) : (
                admissions.map(admission => (
                  <tr key={admission.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {admission.lead?.firstName} {admission.lead?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{admission.lead?.phone}</p>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <p className="text-sm text-gray-900">{admission.admissionNumber}</p>
                      <p className="text-xs text-gray-500">{admission.courseName || admission.branch || '-'}</p>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {admission.university?.shortName || admission.university?.name || '-'}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-gray-900">
                      {formatCurrency(Number(admission.totalFee) + Number(admission.donationAmount || 0))}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">
                      {formatCurrency(Number(admission.paidAmount) || 0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-right text-red-600 font-medium">
                      {formatCurrency(Number(admission.pendingAmount) || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {getStatusBadge(admission.paymentStatus)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {admission.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => handleRecordPayment(admission)}
                          className="px-2 py-0.5 text-xs text-green-600 hover:bg-green-50 rounded"
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        onClick={() => handleViewDetails(admission)}
                        className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded ml-1"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && selectedAdmission && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">{selectedAdmission.lead?.firstName} {selectedAdmission.lead?.lastName}</p>
              <p className="text-xs text-gray-500">{selectedAdmission.admissionNumber} • {selectedAdmission.university?.name}</p>
              <p className="text-xs text-gray-500 mt-1">
                Pending: <span className="font-semibold text-red-600">{formatCurrency(Number(selectedAdmission.pendingAmount))}</span>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
                <input
                  type="number"
                  value={paymentForm.amount}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-green-500"
                  placeholder="Enter amount"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Type</label>
                  <select
                    value={paymentForm.paymentType}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="FEE">Fee</option>
                    <option value="DONATION">Donation</option>
                    <option value="MISCELLANEOUS">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={e => setPaymentForm({ ...paymentForm, paymentMode: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="ONLINE">Online</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={e => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  placeholder="Transaction ID / Cheque No."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-1 focus:ring-green-500"
                  rows={2}
                  placeholder="Any remarks..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={submitPayment}
                disabled={paymentLoading}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {paymentLoading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Detail Slide Panel */}
      {showDetailModal && selectedAdmission && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setShowDetailModal(false)}
          />
          <div className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Admission Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Student Info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Student Information</h3>
                <p className="text-base font-medium text-gray-900">
                  {selectedAdmission.lead?.firstName} {selectedAdmission.lead?.lastName}
                </p>
                <div className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span className="text-gray-900">{selectedAdmission.lead?.phone || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-900 truncate ml-2">{selectedAdmission.lead?.email || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Admission No</span>
                    <span className="text-gray-900 font-medium">{selectedAdmission.admissionNumber}</span>
                  </div>
                </div>
              </div>

              {/* Course Info */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Course Details</h3>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">University</span>
                    <span className="text-gray-900">{selectedAdmission.university?.shortName || selectedAdmission.university?.name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Course</span>
                    <span className="text-gray-900">{selectedAdmission.courseName || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Branch</span>
                    <span className="text-gray-900">{selectedAdmission.branch || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Academic Year</span>
                    <span className="text-gray-900">{selectedAdmission.academicYear || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="p-3 bg-green-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Fee Breakdown</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Fee</span>
                    <span className="text-gray-900">{formatCurrency(Number(selectedAdmission.totalFee) || 0)}</span>
                  </div>
                  {Number(selectedAdmission.donationAmount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Donation</span>
                      <span className="text-gray-900">{formatCurrency(Number(selectedAdmission.donationAmount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-green-200 pt-1.5">
                    <span className="text-gray-700 font-medium">Grand Total</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(Number(selectedAdmission.totalFee) + Number(selectedAdmission.donationAmount || 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Paid Amount</span>
                    <span className="text-green-600 font-medium">{formatCurrency(Number(selectedAdmission.paidAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pending Amount</span>
                    <span className="text-red-600 font-medium">{formatCurrency(Number(selectedAdmission.pendingAmount) || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-gray-500">Status</span>
                    {getStatusBadge(selectedAdmission.paymentStatus)}
                  </div>
                </div>
              </div>

              {/* Payment History */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-2">Payment History</h3>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <ArrowPathIcon className="h-4 w-4 text-gray-400 animate-spin" />
                  </div>
                ) : selectedAdmission.payments && selectedAdmission.payments.length > 0 ? (
                  <div className="space-y-2">
                    {selectedAdmission.payments.map((payment, index) => (
                      <div key={payment.id || index} className="bg-white p-2 rounded border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-sm font-medium text-green-600">
                              {formatCurrency(Number(payment.amount))}
                            </span>
                            <span className="text-xs text-gray-500 ml-2">
                              #{payment.paymentNumber || index + 1}
                            </span>
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            payment.paymentType === 'FEE'
                              ? 'bg-blue-100 text-blue-700'
                              : payment.paymentType === 'DONATION'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {payment.paymentType}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Mode: {payment.paymentMode || '-'}</span>
                            {(payment.paidAt || payment.createdAt) && (
                              <span>{new Date(payment.paidAt || payment.createdAt!).toLocaleDateString('en-IN')}</span>
                            )}
                          </div>
                          {payment.referenceNumber && (
                            <div>Ref: {payment.referenceNumber}</div>
                          )}
                          {payment.receivedBy && (
                            <div>Received by: {payment.receivedBy.firstName} {payment.receivedBy.lastName}</div>
                          )}
                          {payment.notes && (
                            <div className="text-gray-400 italic">{payment.notes}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic py-2">No payments recorded yet</p>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
              {selectedAdmission.paymentStatus !== 'PAID' && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    handleRecordPayment(selectedAdmission);
                  }}
                  className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Record Payment
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
