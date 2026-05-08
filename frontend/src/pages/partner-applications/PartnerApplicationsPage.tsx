import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, Search, Filter, Download, Eye, CheckCircle, XCircle, Clock,
  User, Building, Calendar, Phone, Mail, ChevronDown, MoreHorizontal,
  FileCheck, CreditCard, AlertTriangle, ArrowUpDown, Plus, RefreshCw, Link
} from 'lucide-react';
import { partnerApplicationService } from '../../services/partner-application.service';
import toast from 'react-hot-toast';

interface Application {
  id: string;
  applicationNumber: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  university?: { name: string };
  course?: { name: string };
  partner?: { name: string; type: string };
  status: string;
  documentsStatus: string;
  paymentStatus: string;
  totalFee: number;
  paidAmount: number;
  counsellor?: { firstName: string; lastName: string };
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-700', icon: <FileText className="w-3 h-3" /> },
  LINK_SENT: { label: 'Link Sent', color: 'bg-blue-100 text-blue-700', icon: <Link className="w-3 h-3" /> },
  APPLICATION_SUBMITTED: { label: 'Submitted', color: 'bg-blue-100 text-blue-700', icon: <FileText className="w-3 h-3" /> },
  DOCUMENT_PENDING: { label: 'Doc Pending', color: 'bg-yellow-100 text-yellow-700', icon: <FileCheck className="w-3 h-3" /> },
  DOCUMENT_VERIFICATION: { label: 'Doc Verification', color: 'bg-yellow-100 text-yellow-700', icon: <FileCheck className="w-3 h-3" /> },
  DOCUMENT_VERIFIED: { label: 'Doc Verified', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  PAYMENT_PENDING: { label: 'Payment Pending', color: 'bg-orange-100 text-orange-700', icon: <CreditCard className="w-3 h-3" /> },
  PAYMENT_LINK_SENT: { label: 'Pay Link Sent', color: 'bg-orange-100 text-orange-700', icon: <Link className="w-3 h-3" /> },
  PAYMENT_VERIFIED: { label: 'Payment Verified', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  ADMISSION_PROCESSING: { label: 'Processing', color: 'bg-purple-100 text-purple-700', icon: <Clock className="w-3 h-3" /> },
  ADMISSION_CONFIRMED: { label: 'Confirmed', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  ADMISSION_REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
};

const docStatusConfig: Record<string, { color: string }> = {
  PENDING: { color: 'text-slate-500' },
  PARTIAL: { color: 'text-yellow-600' },
  COMPLETE: { color: 'text-blue-600' },
  VERIFIED: { color: 'text-green-600' },
  REJECTED: { color: 'text-red-600' },
};

export function PartnerApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total: 0, pending: 0, paymentPending: 0, confirmed: 0 });

  // Fetch applications
  const fetchApplications = async () => {
    try {
      setLoading(true);
      const response = await partnerApplicationService.listApplications({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      if (response.success) {
        setApplications(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await partnerApplicationService.getApplicationStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchApplications();
    fetchStats();
  }, [pagination.page, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchApplications();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleViewApplication = (id: string) => {
    navigate(`/partner-applications/${id}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partner Applications</h1>
          <p className="text-slate-600">Manage applications submitted through admission partners</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchApplications(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total || applications.length}</p>
              <p className="text-sm text-slate-600">Total Applications</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.pending || 0}</p>
              <p className="text-sm text-slate-600">Pending Review</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.paymentPending || 0}</p>
              <p className="text-sm text-slate-600">Payment Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.confirmed || 0}</p>
              <p className="text-sm text-slate-600">Confirmed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, application number, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
            <span className="ml-2 text-slate-600">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No applications found</p>
            <p className="text-slate-500 text-sm">Applications from partners will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Application</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Student</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">University / Course</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Partner</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Documents</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Payment</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Counsellor</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {applications.map((app) => (
                  <tr
                    key={app.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleViewApplication(app.id)}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{app.applicationNumber}</p>
                        <p className="text-xs text-slate-500">{formatDate(app.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{app.studentName}</p>
                          <p className="text-xs text-slate-500">{app.studentPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{app.university?.name || '-'}</p>
                        <p className="text-xs text-slate-500">{app.course?.name || '-'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{app.partner?.name || '-'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          app.partner?.type === 'SUPER_PARTNER' ? 'bg-purple-100 text-purple-700' :
                          app.partner?.type === 'SUB_PARTNER' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {app.partner?.type?.replace('_', ' ') || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[app.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                        {statusConfig[app.status]?.icon}
                        {statusConfig[app.status]?.label || app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${docStatusConfig[app.documentsStatus]?.color || 'text-slate-500'}`}>
                        {app.documentsStatus || 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {formatCurrency(app.paidAmount)} / {formatCurrency(app.totalFee)}
                        </p>
                        <div className="w-24 h-1.5 bg-slate-200 rounded-full mt-1">
                          <div
                            className={`h-full rounded-full ${
                              app.paidAmount >= app.totalFee ? 'bg-green-500' :
                              app.paidAmount > 0 ? 'bg-yellow-500' : 'bg-slate-300'
                            }`}
                            style={{ width: `${Math.min((app.paidAmount / app.totalFee) * 100, 100) || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {app.counsellor ? (
                        <span className="text-sm text-slate-700">
                          {app.counsellor.firstName} {app.counsellor.lastName}
                        </span>
                      ) : (
                        <button
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                          onClick={(e) => { e.stopPropagation(); /* TODO: Open assign modal */ }}
                        >
                          + Assign
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleViewApplication(app.id); }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          onClick={(e) => { e.stopPropagation(); /* TODO: Show dropdown menu */ }}
                          title="More Actions"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {applications.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {applications.length} of {pagination.total || applications.length} applications
            </p>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                disabled={pagination.page <= 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <span className="px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg">
                {pagination.page}
              </span>
              <button
                className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
