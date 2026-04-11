import { useEffect, useState } from 'react';
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { auditReportsService, ComprehensiveAuditReport, ReportFilters } from '../../services/audit-reports.service';

type TabType = 'summary' | 'edits' | 'deletes' | 'logins' | 'security';

export default function AuditReportsPage() {
  const [report, setReport] = useState<ComprehensiveAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [datePreset, setDatePreset] = useState('thisMonth');

  useEffect(() => {
    applyDatePreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) loadReport();
  }, [filters]);

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = now;
    if (preset === 'lastMonth') {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (preset === 'thisWeek') {
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
    }
    setFilters({ startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] });
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await auditReportsService.getComprehensive(filters);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load audit reports');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  if (isLoading) return <div className="flex items-center justify-center h-64"><ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" /></div>;
  if (!report) return null;

  const { summary, leadEdits, paymentDeletes, dataExports, stageChanges, loginHistory, failedLogins, securityAlerts } = report;

  const severityColors = {
    LOW: 'bg-slate-100 text-slate-700',
    MEDIUM: 'bg-warning-100 text-warning-700',
    HIGH: 'bg-orange-100 text-orange-700',
    CRITICAL: 'bg-danger-100 text-danger-700',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Audit & Activity Reports</h1>
          <p className="text-slate-500 text-xs">Security monitoring and activity tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="input text-sm py-1.5 px-3">
            <option value="thisWeek">This Week</option>
            <option value="thisMonth">This Month</option>
            <option value="lastMonth">Last Month</option>
          </select>
          <button onClick={loadReport} className="btn btn-secondary py-1.5 px-3"><ArrowPathIcon className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <DocumentTextIcon className="w-5 h-5 mx-auto text-primary-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{summary.totalActions}</p>
          <p className="text-xs text-slate-500">Total Actions</p>
        </div>
        <div className="card p-3 text-center">
          <KeyIcon className="w-5 h-5 mx-auto text-success-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{loginHistory.length}</p>
          <p className="text-xs text-slate-500">Logins</p>
        </div>
        <div className="card p-3 text-center">
          <ExclamationTriangleIcon className="w-5 h-5 mx-auto text-warning-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{failedLogins.length}</p>
          <p className="text-xs text-slate-500">Failed Logins</p>
        </div>
        <div className="card p-3 text-center">
          <ShieldCheckIcon className="w-5 h-5 mx-auto text-danger-500 mb-1" />
          <p className="text-xl font-bold text-slate-900">{securityAlerts.length}</p>
          <p className="text-xs text-slate-500">Security Alerts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4 overflow-x-auto">
          {[
            { key: 'summary', label: 'Overview' },
            { key: 'edits', label: 'Lead Edits' },
            { key: 'deletes', label: 'Deletions' },
            { key: 'logins', label: 'Logins' },
            { key: 'security', label: 'Security', badge: securityAlerts.length },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as TabType)}
              className={`px-3 py-2 text-sm font-medium border-b-2 whitespace-nowrap flex items-center gap-1 ${activeTab === tab.key ? 'border-primary-500 text-primary-600' : 'border-transparent text-slate-500'}`}>
              {tab.label}
              {tab.badge && tab.badge > 0 && <span className="px-1.5 py-0.5 text-xs bg-danger-100 text-danger-700 rounded-full">{tab.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Top Actions */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Top Actions</h3>
            </div>
            <div className="p-3 space-y-2">
              {summary.topActions.slice(0, 6).map((action) => (
                <div key={action.action} className="flex justify-between text-sm">
                  <span className="text-slate-600">{action.action}</span>
                  <span className="font-medium">{action.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Most Active Users */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Most Active Users</h3>
            </div>
            <div className="p-3 space-y-2">
              {summary.topUsers.slice(0, 6).map((user, idx) => (
                <div key={user.userId} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-700 text-xs flex items-center justify-center font-medium">{idx + 1}</span>
                  <span className="text-sm text-slate-900 flex-1">{user.userName}</span>
                  <span className="text-sm font-medium">{user.count} actions</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Data Exports */}
          <div className="card lg:col-span-2">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Data Exports</h3>
            </div>
            <div className="p-3">
              {dataExports.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No exports in this period</p>
              ) : (
                <div className="space-y-2">
                  {dataExports.slice(0, 5).map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <div className="flex items-center gap-2">
                        <ArrowDownTrayIcon className="w-4 h-4 text-slate-400" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{exp.exportedBy}</p>
                          <p className="text-xs text-slate-500">{exp.exportType} • {exp.recordCount} records</p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">{formatDate(exp.exportedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'edits' && (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Lead</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Edited By</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Field</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Change</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leadEdits.length === 0 ? (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">No lead edits</td></tr>
              ) : (
                leadEdits.map((edit) => (
                  <tr key={edit.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-sm font-medium text-slate-900">{edit.leadName}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{edit.editedBy}</td>
                    <td className="px-3 py-2 text-sm text-slate-600">{edit.field}</td>
                    <td className="px-3 py-2 text-xs">
                      <span className="text-danger-600 line-through">{edit.oldValue || '-'}</span>
                      <span className="mx-1">→</span>
                      <span className="text-success-600">{edit.newValue || '-'}</span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">{formatDate(edit.editedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'deletes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Payment Deletions */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Payment Deletions</h3>
            </div>
            <div className="p-3">
              {paymentDeletes.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No payment deletions</p>
              ) : (
                <div className="space-y-2">
                  {paymentDeletes.map((del) => (
                    <div key={del.id} className="p-2 bg-danger-50 border border-danger-100 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-danger-700">{formatCurrency(del.amount)}</span>
                        <span className="text-xs text-slate-500">{formatDate(del.deletedAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">Deleted by {del.deletedBy}</p>
                      {del.reason && <p className="text-xs text-slate-500 mt-0.5">Reason: {del.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Stage Changes */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Stage Changes</h3>
            </div>
            <div className="p-3">
              {stageChanges.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No stage changes</p>
              ) : (
                <div className="space-y-2">
                  {stageChanges.slice(0, 8).map((change) => (
                    <div key={change.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{change.leadName}</p>
                        <p className="text-xs text-slate-500">{change.changedBy}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs">
                          <span className="text-slate-500">{change.fromStage}</span>
                          <span className="mx-1">→</span>
                          <span className="text-primary-600 font-medium">{change.toStage}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logins' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Login History */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Recent Logins</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">User</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loginHistory.slice(0, 10).map((login) => (
                    <tr key={login.id}>
                      <td className="px-3 py-2 text-sm text-slate-900">{login.userName}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">{formatDate(login.loginTime)}</td>
                      <td className="px-3 py-2 text-xs text-slate-500 font-mono">{login.ipAddress || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Failed Logins */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Failed Login Attempts</h3>
            </div>
            <div className="p-3">
              {failedLogins.length === 0 ? (
                <p className="text-center text-slate-500 py-4">No failed login attempts</p>
              ) : (
                <div className="space-y-2">
                  {failedLogins.map((attempt) => (
                    <div key={attempt.email} className={`p-2 rounded ${attempt.blocked ? 'bg-danger-50 border border-danger-200' : 'bg-warning-50'}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900">{attempt.email}</span>
                        {attempt.blocked && <span className="px-1.5 py-0.5 text-xs bg-danger-100 text-danger-700 rounded">BLOCKED</span>}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">{attempt.attemptCount} attempts</p>
                      <p className="text-xs text-slate-500">Last: {formatDate(attempt.lastAttempt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="space-y-2">
          {securityAlerts.length === 0 ? (
            <div className="card p-8 text-center">
              <ShieldCheckIcon className="w-12 h-12 mx-auto text-success-500 mb-2" />
              <p className="text-slate-600">No security alerts</p>
            </div>
          ) : (
            securityAlerts.map((alert, idx) => (
              <div key={idx} className="card p-3">
                <div className="flex items-start gap-3">
                  <ExclamationTriangleIcon className={`w-5 h-5 flex-shrink-0 ${alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'text-danger-500' : 'text-warning-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${severityColors[alert.severity]}`}>{alert.severity}</span>
                      <span className="text-xs text-slate-500">{alert.type}</span>
                    </div>
                    <p className="text-sm text-slate-900">{alert.message}</p>
                    {alert.userName && <p className="text-xs text-slate-500 mt-1">User: {alert.userName}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(alert.timestamp)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
