import { useState, useEffect } from 'react';
import {
  UserIcon,
  WrenchScrewdriverIcon,
  ShieldExclamationIcon,
  ArrowPathIcon,
  EyeIcon,
  KeyIcon,
  LockOpenIcon,
  ArrowRightOnRectangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function SupportToolsPage() {
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [recoveryRequests, setRecoveryRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchUserId, setSearchUserId] = useState('');
  const [searchOrgId, setSearchOrgId] = useState('');
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsRes, historyRes, recoveryRes] = await Promise.all([
        api.get('/super-admin/support/impersonate/active'),
        api.get('/super-admin/support/impersonate/history?days=7'),
        api.get('/super-admin/support/recovery'),
      ]);

      setActiveSessions(sessionsRes.data.data || []);
      setHistory(historyRes.data.data || []);
      setRecoveryRequests(recoveryRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch support tools data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDebugTenant = async () => {
    if (!searchOrgId) return;
    try {
      const res = await api.get(`/super-admin/support/debug/${searchOrgId}`);
      setDebugInfo(res.data.data);
    } catch (error) {
      console.error('Failed to fetch debug info:', error);
    }
  };

  const handleRunDiagnostics = async (orgId: string) => {
    try {
      const res = await api.get(`/super-admin/support/debug/${orgId}/diagnostics`);
      alert(`Diagnostics Result: ${res.data.data.status}\n\n${res.data.data.checks.map((c: any) => `${c.name}: ${c.status} - ${c.message}`).join('\n')}`);
    } catch (error) {
      console.error('Failed to run diagnostics:', error);
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
        <h1 className="text-2xl font-bold text-slate-900">Support Tools</h1>
        <p className="text-slate-500">Impersonation, debugging, and recovery tools</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Debug Tenant */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <WrenchScrewdriverIcon className="w-5 h-5 text-purple-500" />
            Debug Tenant
          </h3>
          <div className="space-y-3">
            <input
              type="text"
              value={searchOrgId}
              onChange={(e) => setSearchOrgId(e.target.value)}
              placeholder="Enter Organization ID"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
            />
            <button
              onClick={handleDebugTenant}
              disabled={!searchOrgId}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              Get Debug Info
            </button>
          </div>
        </div>

        {/* Active Impersonations */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <EyeIcon className="w-5 h-5 text-amber-500" />
            Active Impersonations
          </h3>
          <p className="text-3xl font-bold text-slate-900">{activeSessions.length}</p>
          <p className="text-sm text-slate-500 mt-1">
            {activeSessions.length === 0 ? 'No active sessions' : 'Sessions in progress'}
          </p>
        </div>

        {/* Recovery Requests */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
            <ArrowPathIcon className="w-5 h-5 text-blue-500" />
            Recovery Requests
          </h3>
          <p className="text-3xl font-bold text-slate-900">
            {recoveryRequests.filter(r => r.status === 'pending').length}
          </p>
          <p className="text-sm text-slate-500 mt-1">Pending requests</p>
        </div>
      </div>

      {/* Debug Info Panel */}
      {debugInfo && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Debug: {debugInfo.organization?.name}
            </h2>
            <button
              onClick={() => handleRunDiagnostics(debugInfo.organization?.id)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
            >
              Run Diagnostics
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Users</p>
              <p className="text-xl font-bold text-slate-900">{debugInfo.users?.total || 0}</p>
              <p className="text-xs text-green-600">{debugInfo.users?.active || 0} active</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Leads</p>
              <p className="text-xl font-bold text-slate-900">{debugInfo.leads?.total || 0}</p>
              <p className="text-xs text-blue-600">{debugInfo.leads?.thisMonth || 0} this month</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Calls</p>
              <p className="text-xl font-bold text-slate-900">{debugInfo.calls?.total || 0}</p>
              <p className="text-xs text-blue-600">{debugInfo.calls?.thisMonth || 0} this month</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">Status</p>
              <p className="text-xl font-bold text-slate-900">{debugInfo.organization?.subscriptionStatus}</p>
              <p className="text-xs text-slate-500">{debugInfo.organization?.activePlanId}</p>
            </div>
          </div>

          {/* Recent Errors */}
          {debugInfo.recentErrors?.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Recent Errors</h4>
              <div className="space-y-2">
                {debugInfo.recentErrors.map((error: any, idx: number) => (
                  <div key={idx} className="p-2 bg-red-50 rounded text-sm">
                    <span className="text-red-700">{error.message}</span>
                    <span className="text-red-500 ml-2">({error.count}x)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Integrations */}
          {debugInfo.integrations?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-slate-700 mb-2">Integrations</h4>
              <div className="flex flex-wrap gap-2">
                {debugInfo.integrations.map((int: any, idx: number) => (
                  <span
                    key={idx}
                    className={`px-3 py-1 rounded-full text-xs ${
                      int.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : int.status === 'error'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {int.name}: {int.status}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Impersonation History */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Impersonation History</h2>
        {history.length === 0 ? (
          <p className="text-slate-500 text-sm">No impersonation history</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Admin</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Target User</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Organization</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Reason</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Duration</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Started</th>
                </tr>
              </thead>
              <tbody>
                {history.map((session, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 text-sm text-slate-900">{session.adminEmail}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{session.targetUserEmail}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">{session.organizationName}</td>
                    <td className="py-3 px-4 text-sm text-slate-600 max-w-[200px] truncate">{session.reason}</td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {session.duration ? `${Math.round(session.duration / 60)}m` : 'Active'}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-500">
                      {new Date(session.startedAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recovery Requests */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Data Recovery Requests</h2>
        {recoveryRequests.length === 0 ? (
          <p className="text-slate-500 text-sm">No recovery requests</p>
        ) : (
          <div className="space-y-3">
            {recoveryRequests.map((req, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium text-slate-900">{req.organizationName}</p>
                  <p className="text-sm text-slate-500">
                    Type: {req.requestType} | Target: {new Date(req.targetDate).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-slate-400">{req.reason}</p>
                </div>
                <div className="text-right">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    req.status === 'completed' ? 'bg-green-100 text-green-700' :
                    req.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {req.status}
                  </span>
                  {req.recoveredRecords > 0 && (
                    <p className="text-xs text-slate-500 mt-1">{req.recoveredRecords} records</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
