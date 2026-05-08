import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  DocumentArrowUpIcon,
  CurrencyRupeeIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  applicationNumber: string;
  studentName: string;
  studentPhone: string;
  status: string;
  paymentStatus: string;
  documentsStatus: string;
  totalFee: number;
  paidAmount: number;
  createdAt: string;
  university?: { name: string };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  LINK_SENT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  APPLICATION_SUBMITTED: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  DOCUMENT_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  DOCUMENT_VERIFICATION: { bg: 'bg-orange-100', text: 'text-orange-700' },
  DOCUMENT_VERIFIED: { bg: 'bg-green-100', text: 'text-green-700' },
  PAYMENT_PENDING: { bg: 'bg-amber-100', text: 'text-amber-700' },
  PAYMENT_VERIFIED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  ADMISSION_CONFIRMED: { bg: 'bg-green-100', text: 'text-green-800' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

const paymentStatusColors: Record<string, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-gray-100', text: 'text-gray-700' },
  PARTIAL: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PAID: { bg: 'bg-green-100', text: 'text-green-700' },
};

export const AdmissionPartnerApplicationsPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [pagination.page, statusFilter]);

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('admission_partner_token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
      });

      const response = await fetch(`/api/partner-portal/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch applications');

      const data = await response.json();
      setApplications(data.data);
      setPagination(data.pagination);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination({ ...pagination, page: 1 });
    fetchApplications();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
          <p className="text-gray-600">Manage student admission applications</p>
        </div>
        <button
          onClick={() => navigate('/admission-partner/applications/new')}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5" />
          New Application
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone, or application number..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </form>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination({ ...pagination, page: 1 });
              }}
              className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="APPLICATION_SUBMITTED">Submitted</option>
              <option value="DOCUMENT_PENDING">Document Pending</option>
              <option value="DOCUMENT_VERIFIED">Document Verified</option>
              <option value="PAYMENT_PENDING">Payment Pending</option>
              <option value="PAYMENT_VERIFIED">Payment Verified</option>
              <option value="ADMISSION_CONFIRMED">Confirmed</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <FunnelIcon className="h-5 w-5" />
              Filters
            </button>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-12">
            <DocumentArrowUpIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No applications found</p>
            <button
              onClick={() => navigate('/admission-partner/applications/new')}
              className="mt-4 text-primary-600 hover:text-primary-700"
            >
              Create your first application
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr className="text-left text-sm text-gray-500">
                    <th className="px-4 py-3 font-medium">Application #</th>
                    <th className="px-4 py-3 font-medium">Student</th>
                    <th className="px-4 py-3 font-medium">University</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Payment</th>
                    <th className="px-4 py-3 font-medium">Fee</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {applications.map((app) => {
                    const statusStyle = statusColors[app.status] || statusColors.DRAFT;
                    const paymentStyle = paymentStatusColors[app.paymentStatus] || paymentStatusColors.PENDING;

                    return (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-medium text-primary-600">{app.applicationNumber}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{app.studentName}</p>
                            <p className="text-sm text-gray-500">{app.studentPhone}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {app.university?.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {formatStatus(app.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${paymentStyle.bg} ${paymentStyle.text}`}>
                            {app.paymentStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium">{formatCurrency(app.totalFee)}</p>
                            {app.paidAmount > 0 && (
                              <p className="text-xs text-green-600">
                                Paid: {formatCurrency(app.paidAmount)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(app.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/admission-partner/applications/${app.id}`)}
                              className="p-1.5 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded"
                              title="View"
                            >
                              <EyeIcon className="h-5 w-5" />
                            </button>
                            {app.paymentStatus !== 'PAID' && (
                              <button
                                onClick={() => navigate(`/admission-partner/applications/${app.id}/payment`)}
                                className="p-1.5 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded"
                                title="Record Payment"
                              >
                                <CurrencyRupeeIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdmissionPartnerApplicationsPage;
