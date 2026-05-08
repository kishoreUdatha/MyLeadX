import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building, Phone, Mail, MapPin, Edit, MoreHorizontal,
  CheckCircle, XCircle, Clock, Users, FileText, Wallet, TrendingUp,
  Award, RefreshCw, Calendar, CreditCard, Shield, AlertTriangle,
  ChevronRight, ExternalLink, Copy, Ban, PlayCircle
} from 'lucide-react';
import { admissionPartnerService, AdmissionPartner } from '../../services/admission-partner.service';
import toast from 'react-hot-toast';

const typeConfig: Record<string, { label: string; color: string }> = {
  SUPER_PARTNER: { label: 'Super Partner', color: 'bg-purple-100 text-purple-700' },
  SUB_PARTNER: { label: 'Sub Partner', color: 'bg-blue-100 text-blue-700' },
  AGENT: { label: 'Agent', color: 'bg-slate-100 text-slate-700' },
  REFERRER: { label: 'Referrer', color: 'bg-teal-100 text-teal-700' },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  ACTIVE: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100', icon: <CheckCircle className="w-4 h-4" /> },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: <Clock className="w-4 h-4" /> },
  PENDING: { label: 'Pending', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: <Clock className="w-4 h-4" /> },
  SUSPENDED: { label: 'Suspended', color: 'text-red-700', bgColor: 'bg-red-100', icon: <XCircle className="w-4 h-4" /> },
  BLOCKED: { label: 'Blocked', color: 'text-red-700', bgColor: 'bg-red-100', icon: <Ban className="w-4 h-4" /> },
  INACTIVE: { label: 'Inactive', color: 'text-slate-600', bgColor: 'bg-slate-100', icon: <Clock className="w-4 h-4" /> },
};

const tierConfig: Record<string, { label: string; color: string }> = {
  BRONZE: { label: 'Bronze', color: 'bg-amber-100 text-amber-700' },
  SILVER: { label: 'Silver', color: 'bg-slate-200 text-slate-700' },
  GOLD: { label: 'Gold', color: 'bg-yellow-100 text-yellow-700' },
  PLATINUM: { label: 'Platinum', color: 'bg-purple-100 text-purple-700' },
};

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPartnerDetails();
    }
  }, [id]);

  const fetchPartnerDetails = async () => {
    try {
      setLoading(true);
      const response = await admissionPartnerService.getPartnerById(id!);
      if (response.success) {
        setPartner(response.data);
        // Fetch team if super partner
        if (response.data.type === 'SUPER_PARTNER') {
          fetchTeamMembers();
        }
      } else {
        toast.error('Partner not found');
        navigate('/admission-partners');
      }
    } catch (error) {
      console.error('Error fetching partner:', error);
      toast.error('Failed to load partner details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await admissionPartnerService.getPartnerHierarchy(id!);
      if (response.success) {
        setTeamMembers([
          ...(response.data.subPartners || []).map((p: any) => ({ ...p, type: 'SUB_PARTNER' })),
          ...(response.data.agents || []).map((p: any) => ({ ...p, type: 'AGENT' })),
        ]);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoadingApplications(true);
      // Fetch applications for this partner
      const response = await fetch(`/api/partner-applications?partnerId=${id}&limit=10`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        setApplications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoadingApplications(false);
    }
  };

  const fetchEarnings = async () => {
    try {
      setLoadingEarnings(true);
      const response = await admissionPartnerService.getPartnerEarnings(id!);
      if (response.success) {
        setEarnings(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setLoadingEarnings(false);
    }
  };

  // Load tab data when switching tabs
  useEffect(() => {
    if (activeTab === 'applications' && applications.length === 0) {
      fetchApplications();
    } else if (activeTab === 'earnings' && earnings.length === 0) {
      fetchEarnings();
    }
  }, [activeTab]);

  const handleStatusUpdate = async () => {
    if (!selectedStatus) return;

    try {
      setUpdatingStatus(true);
      await admissionPartnerService.updatePartnerStatus(id!, selectedStatus);
      toast.success(`Partner status updated to ${selectedStatus}`);
      setShowStatusModal(false);
      fetchPartnerDetails();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-2 text-slate-600">Loading partner details...</span>
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <AlertTriangle className="w-12 h-12 text-slate-300 mb-4" />
        <p className="text-slate-600">Partner not found</p>
        <button
          onClick={() => navigate('/admission-partners')}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          Back to Partners
        </button>
      </div>
    );
  }

  const status = statusConfig[partner.status] || statusConfig.PENDING;
  const tier = tierConfig[partner.tier] || tierConfig.BRONZE;
  const type = typeConfig[partner.type || partner.partnerType] || typeConfig.AGENT;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admission-partners')}
            className="p-2 hover:bg-slate-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center">
              <Building className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{partner.name}</h1>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${type.color}`}>
                  {type.label}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}>
                  {tier.label}
                </span>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-600">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {partner.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {partner.phone}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${status.bgColor} ${status.color}`}>
            {status.icon}
            <span className="text-sm font-medium">{status.label}</span>
          </div>
          <button
            onClick={() => navigate(`/admission-partners/${id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Shield className="w-4 h-4" />
            Change Status
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{partner.totalApplications || 0}</p>
              <p className="text-sm text-slate-600">Applications</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{partner.confirmedAdmissions || 0}</p>
              <p className="text-sm text-slate-600">Confirmed</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(partner.totalEarnings || 0)}</p>
              <p className="text-sm text-slate-600">Total Earned</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(partner.pendingCommission || 0)}</p>
              <p className="text-sm text-slate-600">Pending</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{partner.defaultCommissionPercent || partner.commissionRate || 0}%</p>
              <p className="text-sm text-slate-600">Commission Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="border-b border-slate-200">
          <nav className="flex gap-1 p-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'team', label: 'Team Members', show: partner.type === 'SUPER_PARTNER' },
              { id: 'applications', label: 'Applications' },
              { id: 'earnings', label: 'Earnings' },
              { id: 'bank', label: 'Bank Details' },
            ].filter(tab => tab.show !== false).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Basic Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Partner ID</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 font-mono text-sm">{partner.id.slice(0, 8)}...</span>
                      <button onClick={() => copyToClipboard(partner.id)} className="text-slate-400 hover:text-slate-600">
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Company Name</span>
                    <span className="font-medium text-slate-900">{partner.companyName || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Partner Type</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.color}`}>{type.label}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Tier</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tier.color}`}>{tier.label}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Status</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Joined</span>
                    <span className="font-medium text-slate-900">{formatDate(partner.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Email</span>
                    <a href={`mailto:${partner.email}`} className="font-medium text-primary-600 hover:underline">{partner.email}</a>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Phone</span>
                    <a href={`tel:${partner.phone}`} className="font-medium text-primary-600 hover:underline">{partner.phone}</a>
                  </div>
                  {partner.altPhone && (
                    <div className="flex justify-between py-2 border-b border-slate-100">
                      <span className="text-slate-600">Alt Phone</span>
                      <a href={`tel:${partner.altPhone}`} className="font-medium text-primary-600 hover:underline">{partner.altPhone}</a>
                    </div>
                  )}
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Address</span>
                    <span className="font-medium text-slate-900 text-right max-w-[200px]">{partner.address || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">City</span>
                    <span className="font-medium text-slate-900">{partner.city || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">State</span>
                    <span className="font-medium text-slate-900">{partner.state || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">Pincode</span>
                    <span className="font-medium text-slate-900">{partner.pincode || '-'}</span>
                  </div>
                </div>
              </div>

              {/* KYC Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">KYC Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">PAN Number</span>
                    <span className="font-medium text-slate-900 font-mono">{partner.panNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">GST Number</span>
                    <span className="font-medium text-slate-900 font-mono">{partner.gstNumber || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Parent Partner (for sub-partners/agents) */}
              {partner.parentPartner && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">Parent Partner</h3>
                  <div
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                    onClick={() => navigate(`/admission-partners/${partner.parentPartner.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{partner.parentPartner.name}</p>
                        <p className="text-sm text-slate-600">{partner.parentPartner.email}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Team Members Tab */}
          {activeTab === 'team' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Team Members ({teamMembers.length})</h3>
                <button
                  onClick={() => navigate('/admission-partners/new', { state: { parentPartnerId: id } })}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Users className="w-4 h-4" />
                  Add Team Member
                </button>
              </div>
              {teamMembers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No team members yet
                </div>
              ) : (
                <div className="space-y-3">
                  {teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => navigate(`/admission-partners/${member.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <Users className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{member.name}</p>
                          <p className="text-sm text-slate-600">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConfig[member.type]?.color}`}>
                          {typeConfig[member.type]?.label}
                        </span>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Recent Applications</h3>
                <button
                  onClick={() => navigate(`/partner-applications?partnerId=${id}`)}
                  className="text-sm text-primary-600 hover:underline"
                >
                  View All
                </button>
              </div>
              {loadingApplications ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <FileText className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>No applications submitted yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app: any) => (
                    <div
                      key={app.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-lg cursor-pointer hover:bg-slate-100"
                      onClick={() => navigate(`/partner-applications/${app.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{app.studentName || 'Student'}</p>
                          <p className="text-sm text-slate-600">{app.courseName || app.course?.name || 'Course'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          app.status === 'ADMISSION_CONFIRMED' ? 'bg-green-100 text-green-700' :
                          app.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          app.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {app.status?.replace(/_/g, ' ') || 'Pending'}
                        </span>
                        <span className="text-sm text-slate-500">{formatDate(app.createdAt)}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === 'earnings' && (
            <div>
              {/* Earnings Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 mb-1">Total Earned</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(partner?.totalEarnings || 0)}</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-600 mb-1">Pending Commission</p>
                  <p className="text-2xl font-bold text-orange-700">{formatCurrency(partner?.pendingCommission || 0)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600 mb-1">Available Balance</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrency(partner?.walletBalance || 0)}</p>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 mb-4">Commission History</h3>
              {loadingEarnings ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 text-primary-600 animate-spin" />
                </div>
              ) : earnings.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <Wallet className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>No earnings recorded yet</p>
                  <p className="text-sm mt-1">Commissions will appear here when applications are confirmed</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Date</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Application</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Student</th>
                        <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Amount</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {earnings.map((earning: any) => (
                        <tr key={earning.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatDate(earning.createdAt)}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {earning.application?.id?.slice(0, 8) || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-900">
                            {earning.application?.studentName || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                            {formatCurrency(earning.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              earning.status === 'PAID' ? 'bg-green-100 text-green-700' :
                              earning.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                              earning.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {earning.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bank Details Tab */}
          {activeTab === 'bank' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-slate-900">Bank Details</h3>
              {partner.bankDetails && partner.bankDetails.length > 0 ? (
                <div className="space-y-4">
                  {partner.bankDetails.map((bank: any, index: number) => (
                    <div key={index} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-5 h-5 text-primary-600" />
                          <span className="font-medium text-slate-900">{bank.bankName}</span>
                        </div>
                        {bank.isPrimary && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Primary</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Account Holder</p>
                          <p className="font-medium">{bank.accountHolderName}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Account Number</p>
                          <p className="font-medium font-mono">{bank.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">IFSC Code</p>
                          <p className="font-medium font-mono">{bank.ifscCode}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Account Type</p>
                          <p className="font-medium">{bank.accountType}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <CreditCard className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p>No bank details added yet</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Change Partner Status</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select status...</option>
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="SUSPENDED">Suspended</option>
                  <option value="BLOCKED">Blocked</option>
                </select>
              </div>
              {(selectedStatus === 'SUSPENDED' || selectedStatus === 'BLOCKED') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                  <textarea
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Enter reason for status change..."
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusUpdate}
                disabled={!selectedStatus || updatingStatus}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {updatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
