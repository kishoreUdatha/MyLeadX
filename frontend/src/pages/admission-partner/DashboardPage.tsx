import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentTextIcon,
  CurrencyRupeeIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  ArrowRightIcon,
  AcademicCapIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  confirmedAdmissions: number;
  totalCommission: number;
  pendingCommission: number;
  thisMonthApplications: number;
}

interface RecentApplication {
  id: string;
  applicationNumber: string;
  studentName: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  APPLICATION_SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  DOCUMENT_PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  DOCUMENT_VERIFIED: { bg: 'bg-green-100', text: 'text-green-700' },
  PAYMENT_PENDING: { bg: 'bg-orange-100', text: 'text-orange-700' },
  PAYMENT_VERIFIED: { bg: 'bg-green-100', text: 'text-green-700' },
  ADMISSION_CONFIRMED: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export const AdmissionPartnerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('admission_partner_token');
      const response = await fetch('/api/partner-portal/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch dashboard');

      const data = await response.json();
      setStats(data.data.stats);
      setRecentApplications(data.data.recentApplications || []);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/admission-partner/links/new')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <LinkIcon className="h-5 w-5" />
            Create Link
          </button>
          <button
            onClick={() => navigate('/admission-partner/applications/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <PlusIcon className="h-5 w-5" />
            New Application
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Applications</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalApplications || 0}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <DocumentTextIcon className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-blue-600 mt-3">
            +{stats?.thisMonthApplications || 0} this month
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.pendingApplications || 0}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-3">Awaiting action</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Confirmed Admissions</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.confirmedAdmissions || 0}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <AcademicCapIcon className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <p className="text-sm text-green-600 mt-3">Successfully enrolled</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Commission</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats?.totalCommission || 0)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <CurrencyRupeeIcon className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          {stats?.pendingCommission ? (
            <p className="text-sm text-orange-600 mt-3">
              {formatCurrency(stats.pendingCommission)} pending
            </p>
          ) : (
            <p className="text-sm text-gray-500 mt-3">Earnings</p>
          )}
        </div>
      </div>

      {/* Quick Actions & Recent Applications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admission-partner/applications/new')}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <PlusIcon className="h-5 w-5 text-primary-600" />
                </div>
                <span className="font-medium">New Application</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/admission-partner/links/new')}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <LinkIcon className="h-5 w-5 text-blue-600" />
                </div>
                <span className="font-medium">Generate Application Link</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </button>

            <button
              onClick={() => navigate('/admission-partner/wallet')}
              className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CurrencyRupeeIcon className="h-5 w-5 text-green-600" />
                </div>
                <span className="font-medium">View Wallet</span>
              </div>
              <ArrowRightIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Applications</h2>
            <button
              onClick={() => navigate('/admission-partner/applications')}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              View All
            </button>
          </div>

          {recentApplications.length === 0 ? (
            <div className="text-center py-8">
              <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No applications yet</p>
              <button
                onClick={() => navigate('/admission-partner/applications/new')}
                className="mt-3 text-primary-600 hover:text-primary-700"
              >
                Create your first application
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 border-b">
                    <th className="pb-3 font-medium">Application #</th>
                    <th className="pb-3 font-medium">Student</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentApplications.map((app) => {
                    const statusStyle = statusColors[app.status] || statusColors.DRAFT;
                    return (
                      <tr
                        key={app.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/admission-partner/applications/${app.id}`)}
                      >
                        <td className="py-3 font-medium text-primary-600">
                          {app.applicationNumber}
                        </td>
                        <td className="py-3">{app.studentName}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
                            {formatStatus(app.status)}
                          </span>
                        </td>
                        <td className="py-3 text-gray-500 text-sm">
                          {new Date(app.createdAt).toLocaleDateString('en-IN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Tips Banner */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <CheckCircleIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Boost Your Commissions</h3>
            <p className="text-sm opacity-90">
              Complete more admissions to unlock higher commission tiers.
              Share application links with students for faster processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdmissionPartnerDashboardPage;
