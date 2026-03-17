import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  PhoneXMarkIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface DashboardMetrics {
  activeConsents: number;
  revokedConsents: number;
  dncCount: number;
  disclosureEnabled: boolean;
  recentActivity: any[];
}

const ComplianceDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/compliance/dashboard');
      setMetrics(response.data.data);
    } catch (error) {
      console.error('Failed to fetch compliance metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheckIcon className="h-8 w-8 text-blue-600" />
          Compliance Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          Monitor consent, DNC lists, and compliance activities
        </p>
      </div>

      {/* Compliance Status Banner */}
      <div className={`mb-6 p-4 rounded-lg border ${
        metrics?.disclosureEnabled
          ? 'bg-green-50 border-green-200'
          : 'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-center gap-3">
          {metrics?.disclosureEnabled ? (
            <>
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Recording Disclosure Enabled</p>
                <p className="text-sm text-green-600">
                  Your organization complies with call recording disclosure requirements
                </p>
              </div>
            </>
          ) : (
            <>
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              <div>
                <p className="font-medium text-yellow-800">Recording Disclosure Disabled</p>
                <p className="text-sm text-yellow-600">
                  Consider enabling recording disclosure for compliance
                </p>
              </div>
            </>
          )}
          <Link
            to="/compliance/recording-disclosure"
            className="ml-auto text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Configure
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Link to="/compliance/consent" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Consents</p>
              <p className="text-3xl font-bold text-green-600">{metrics?.activeConsents || 0}</p>
            </div>
            <DocumentCheckIcon className="h-12 w-12 text-green-200" />
          </div>
        </Link>

        <Link to="/compliance/consent?includeRevoked=true" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revoked Consents</p>
              <p className="text-3xl font-bold text-red-600">{metrics?.revokedConsents || 0}</p>
            </div>
            <XCircleIcon className="h-12 w-12 text-red-200" />
          </div>
        </Link>

        <Link to="/advanced/dnc-list" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">DNC List Size</p>
              <p className="text-3xl font-bold text-gray-900">{metrics?.dncCount || 0}</p>
            </div>
            <PhoneXMarkIcon className="h-12 w-12 text-gray-200" />
          </div>
        </Link>

        <Link to="/compliance/audit-logs" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Audit Logs</p>
              <p className="text-3xl font-bold text-blue-600">View</p>
            </div>
            <ClipboardDocumentListIcon className="h-12 w-12 text-blue-200" />
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Recording Disclosure */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recording Disclosure</h3>
          <p className="text-gray-600 mb-4">
            Configure how your voice agents disclose call recording to customers.
          </p>
          <Link
            to="/compliance/recording-disclosure"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Configure Disclosure
          </Link>
        </div>

        {/* Generate Report */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Compliance Report</h3>
          <p className="text-gray-600 mb-4">
            Generate a compliance report for auditing and regulatory purposes.
          </p>
          <Link
            to="/compliance/report"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
          >
            Generate Report
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Compliance Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {metrics?.recentActivity && metrics.recentActivity.length > 0 ? (
            metrics.recentActivity.map((activity: any, index: number) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    activity.eventType.includes('CONSENT') ? 'bg-green-100' :
                    activity.eventType.includes('DNC') ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    <ShieldCheckIcon className={`h-5 w-5 ${
                      activity.eventType.includes('CONSENT') ? 'text-green-600' :
                      activity.eventType.includes('DNC') ? 'text-red-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{activity.eventType}</p>
                    <p className="text-xs text-gray-500">{activity.description || activity.action}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{formatDate(activity.createdAt)}</span>
              </div>
            ))
          ) : (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent compliance activity
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ComplianceDashboardPage;
