import { useState, useEffect } from 'react';
import {
  LockClosedIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  UserIcon,
  ClockIcon,
  ComputerDesktopIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface SecurityOverview {
  totalLogins24h: number;
  failedLogins24h: number;
  failedLoginRate: string;
  activeSessions: number;
  auditLogs7d: number;
}

interface LoginHistory {
  id: string;
  userId: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organization?: { name: string };
  };
}

interface Session {
  id: string;
  userId: string;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  lastActivityAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    organization?: { name: string };
  };
}

export default function SecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'logins' | 'sessions'>('overview');
  const [loginFilter, setLoginFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'logins') {
      fetchLoginHistory();
    } else if (activeTab === 'sessions') {
      fetchSessions();
    }
  }, [activeTab, loginFilter, page]);

  const fetchData = async () => {
    try {
      const res = await api.get('/super-admin/security/overview');
      setOverview(res.data.data);
    } catch (error) {
      console.error('Failed to fetch security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLoginHistory = async () => {
    try {
      const params: any = { page, limit: 20 };
      if (loginFilter !== 'all') {
        params.success = loginFilter === 'success';
      }
      const res = await api.get('/super-admin/security/login-history', { params });
      setLoginHistory(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch login history:', error);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/super-admin/security/sessions', {
        params: { page, limit: 20 },
      });
      setSessions(res.data.data || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      await api.delete(`/super-admin/security/sessions/${sessionId}`);
      fetchSessions();
    } catch (error) {
      console.error('Failed to terminate session:', error);
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
        <h1 className="text-2xl font-bold text-slate-900">Security</h1>
        <p className="text-slate-500">Security settings, audit logs, and access controls</p>
      </div>

      {/* Overview Stats */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-slate-500">Logins (24h)</p>
                <p className="text-xl font-bold text-slate-900">{overview.totalLogins24h}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-slate-500">Failed (24h)</p>
                <p className="text-xl font-bold text-red-600">{overview.failedLogins24h}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-500" />
              <div>
                <p className="text-sm text-slate-500">Failure Rate</p>
                <p className="text-xl font-bold text-slate-900">{overview.failedLoginRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ComputerDesktopIcon className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-slate-500">Active Sessions</p>
                <p className="text-xl font-bold text-slate-900">{overview.activeSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <ClockIcon className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-slate-500">Audit Logs (7d)</p>
                <p className="text-xl font-bold text-slate-900">{overview.auditLogs7d}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="border-b border-slate-200">
          <div className="flex">
            {(['overview', 'logins', 'sessions'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setPage(1); }}
                className={`px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab === 'overview' ? 'Security Tips' : tab === 'logins' ? 'Login History' : 'Active Sessions'}
              </button>
            ))}
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="p-6">
            <div className="space-y-4">
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                  <div>
                    <h4 className="font-medium text-green-800">All systems operational</h4>
                    <p className="text-sm text-green-700">No security incidents detected in the past 7 days</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Security Recommendations</h4>
                  <ul className="space-y-2 text-sm text-slate-600">
                    <li className="flex items-center gap-2">
                      <LockClosedIcon className="w-4 h-4 text-green-500" />
                      Enforce 2FA for all super admins
                    </li>
                    <li className="flex items-center gap-2">
                      <LockClosedIcon className="w-4 h-4 text-green-500" />
                      Regular password rotation policy
                    </li>
                    <li className="flex items-center gap-2">
                      <LockClosedIcon className="w-4 h-4 text-green-500" />
                      Monitor for suspicious login patterns
                    </li>
                    <li className="flex items-center gap-2">
                      <LockClosedIcon className="w-4 h-4 text-green-500" />
                      Review audit logs weekly
                    </li>
                  </ul>
                </div>

                <div className="p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-900 mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                      View audit logs
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                      Export security report
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg">
                      Configure IP restrictions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Login History Tab */}
        {activeTab === 'logins' && (
          <div>
            <div className="p-4 border-b border-slate-200 flex items-center gap-4">
              <select
                value={loginFilter}
                onChange={(e) => { setLoginFilter(e.target.value as any); setPage(1); }}
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Logins</option>
                <option value="success">Successful</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">IP Address</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((login) => (
                    <tr key={login.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <UserIcon className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="font-medium text-slate-900">
                              {login.user?.firstName} {login.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{login.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {login.user?.organization?.name || '-'}
                      </td>
                      <td className="py-3 px-4">
                        {login.success ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Success</span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Failed</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                        {login.ipAddress || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(login.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === 'sessions' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">User</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Organization</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">IP Address</th>
                    <th className="text-left py-3 px-4 text-slate-500 font-medium">Last Activity</th>
                    <th className="text-right py-3 px-4 text-slate-500 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-700 text-xs font-semibold">
                              {session.user?.firstName?.[0]}{session.user?.lastName?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {session.user?.firstName} {session.user?.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{session.user?.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {session.user?.organization?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-xs">
                        {session.ipAddress || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(session.lastActivityAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => terminateSession(session.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Terminate session"
                        >
                          <XMarkIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
