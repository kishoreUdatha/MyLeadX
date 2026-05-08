import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, Search, Filter, Download, Eye, Edit,
  CheckCircle, XCircle, Clock, Building, MapPin,
  Wallet, FileText, ChevronDown, UserPlus,
  TrendingUp, RefreshCw
} from 'lucide-react';
import { admissionPartnerService, AdmissionPartner } from '../../services/admission-partner.service';
import toast from 'react-hot-toast';

const typeConfig: Record<string, { label: string; color: string }> = {
  SUPER_PARTNER: { label: 'Super Partner', color: 'bg-purple-100 text-purple-700' },
  SUB_PARTNER: { label: 'Sub Partner', color: 'bg-blue-100 text-blue-700' },
  AGENT: { label: 'Agent', color: 'bg-slate-100 text-slate-700' },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  PENDING: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: <Clock className="w-3 h-3" /> },
  SUSPENDED: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  INACTIVE: { label: 'Inactive', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3 h-3" /> },
};

export function AdmissionPartnersPage() {
  const navigate = useNavigate();
  const [partners, setPartners] = useState<AdmissionPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalApplications: 0,
    totalEarnings: 0,
    pendingCommissions: 0,
  });

  // Fetch partners
  const fetchPartners = async () => {
    try {
      setLoading(true);
      const response = await admissionPartnerService.listPartners({
        page: pagination.page,
        limit: pagination.limit,
        search: searchQuery || undefined,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });

      if (response.success) {
        setPartners(response.data || []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error) {
      console.error('Error fetching partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await admissionPartnerService.getPartnerStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchPartners();
    fetchStats();
  }, [pagination.page, typeFilter, statusFilter]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (pagination.page === 1) {
        fetchPartners();
      } else {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleViewPartner = (id: string) => {
    navigate(`/admission-partners/${id}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admission Partners</h1>
          <p className="text-slate-600">Manage admission partners, sub-partners, and agents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchPartners(); fetchStats(); }}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={() => navigate('/admission-partners/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <UserPlus className="w-4 h-4" />
            Add Partner
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.total || partners.length}</p>
              <p className="text-sm text-slate-600">Total Partners</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.active || 0}</p>
              <p className="text-sm text-slate-600">Active</p>
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
              <p className="text-sm text-slate-600">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalApplications || 0}</p>
              <p className="text-sm text-slate-600">Applications</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalEarnings)}</p>
              <p className="text-sm text-slate-600">Total Paid</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.pendingCommissions)}</p>
              <p className="text-sm text-slate-600">Pending Payouts</p>
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
              placeholder="Search by name, email, or city..."
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
          <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Partner Type</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="SUPER_PARTNER">Super Partner</option>
                <option value="SUB_PARTNER">Sub Partner</option>
                <option value="AGENT">Agent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING">Pending</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Partners Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
            <span className="ml-2 text-slate-600">Loading partners...</span>
          </div>
        ) : partners.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-600 font-medium">No partners found</p>
            <p className="text-slate-500 text-sm mb-4">Create your first admission partner to get started</p>
            <button
              onClick={() => navigate('/admission-partners/new')}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <UserPlus className="w-4 h-4" />
              Add Partner
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Partner</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Type</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Location</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Hierarchy</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Applications</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Earnings</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {partners.map((partner) => (
                  <tr
                    key={partner.id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleViewPartner(partner.id)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{partner.name}</p>
                          <p className="text-xs text-slate-500">{partner.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[partner.type]?.color || 'bg-slate-100'}`}>
                        {typeConfig[partner.type]?.label || partner.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="w-3 h-3" />
                        {partner.city || '-'}, {partner.state || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {partner.type === 'SUPER_PARTNER' ? (
                        <span className="text-sm text-slate-600">
                          {partner.subPartners || 0} Sub • {partner.agents || 0} Agents
                        </span>
                      ) : partner.parentPartner ? (
                        <span className="text-sm text-slate-600">
                          Under: {partner.parentPartner.name}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{partner.totalApplications || 0}</p>
                        <p className="text-xs text-green-600">{partner.confirmedAdmissions || 0} confirmed</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{formatCurrency(partner.totalEarnings || 0)}</p>
                        <p className="text-xs text-orange-600">{formatCurrency(partner.pendingCommission || 0)} pending</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[partner.status]?.color || 'bg-slate-100'}`}>
                        {statusConfig[partner.status]?.icon}
                        {statusConfig[partner.status]?.label || partner.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="p-1.5 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleViewPartner(partner.id); }}
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admission-partners/${partner.id}/edit`); }}
                          title="Edit Partner"
                        >
                          <Edit className="w-4 h-4" />
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
        {partners.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Showing {partners.length} of {pagination.total || partners.length} partners
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
