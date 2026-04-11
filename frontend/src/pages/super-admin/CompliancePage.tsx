import { useState, useEffect } from 'react';
import {
  ShieldCheckIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  ClipboardDocumentListIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function CompliancePage() {
  const [summary, setSummary] = useState<any>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [summaryRes, exportsRes, incidentsRes, logsRes] = await Promise.all([
        api.get('/super-admin/compliance/summary'),
        api.get('/super-admin/compliance/gdpr/exports'),
        api.get('/super-admin/compliance/incidents'),
        api.get('/super-admin/compliance/access-logs?limit=20'),
      ]);

      setSummary(summaryRes.data.data);
      setExports(exportsRes.data.data || []);
      setIncidents(incidentsRes.data.data || []);
      setAccessLogs(logsRes.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700';
      case 'high': return 'bg-orange-100 text-orange-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'low': return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance & Security</h1>
        <p className="text-slate-500">GDPR, security incidents, and access logs</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <DocumentArrowDownIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">Export Requests</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.pendingExportRequests || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-slate-500">Open Incidents</p>
              <p className="text-2xl font-bold text-red-600">{summary?.openIncidents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-8 h-8 text-orange-500" />
            <div>
              <p className="text-sm text-slate-500">Critical</p>
              <p className="text-2xl font-bold text-orange-600">{summary?.criticalIncidents || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">IP Whitelists</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.tenantsWithIPWhitelist || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ClipboardDocumentListIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">Delete Requests</p>
              <p className="text-2xl font-bold text-slate-900">{summary?.pendingDeleteRequests || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Security Incidents */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Security Incidents</h2>
          {incidents.length === 0 ? (
            <div className="text-center py-8">
              <ShieldCheckIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-slate-500">No security incidents</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {incidents.map((incident, idx) => (
                <div key={idx} className="p-4 bg-slate-50 rounded-lg border-l-4 border-l-red-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{incident.title}</p>
                      <p className="text-sm text-slate-500 mt-1">{incident.type.replace(/_/g, ' ')}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${getSeverityColor(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(incident.reportedAt).toLocaleString()} | {incident.affectedUsers} user(s) affected
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* GDPR Export Requests */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">GDPR Export Requests</h2>
          {exports.length === 0 ? (
            <p className="text-slate-500 text-sm">No export requests</p>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {exports.map((exp, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{exp.organizationName}</p>
                    <p className="text-sm text-slate-500">Requested by: {exp.requestedBy}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(exp.requestedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      exp.status === 'completed' ? 'bg-green-100 text-green-700' :
                      exp.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                      exp.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {exp.status}
                    </span>
                    {exp.downloadUrl && (
                      <a
                        href={exp.downloadUrl}
                        className="block mt-2 text-xs text-blue-600 hover:underline"
                      >
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Access Logs */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Access Logs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Time</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">User</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Organization</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Action</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Resource</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">IP</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {accessLogs.map((log, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm text-slate-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-900">{log.userEmail}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{log.organizationName}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{log.action}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{log.resource}</td>
                  <td className="py-3 px-4 text-sm text-slate-500 font-mono">{log.ipAddress}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      log.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
