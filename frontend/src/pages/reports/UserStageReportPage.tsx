/**
 * User Stage Report - Lead stage distribution by user
 */
import { useState, useEffect } from 'react';
import { ChartBarIcon, UserGroupIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';
import { leadReportsService, UserStageReportData } from '../../services/lead-reports.service';

// Stage color mapping for visual consistency
const stageColors: Record<string, { bg: string; text: string; headerBg: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700', headerBg: 'bg-blue-50' },
  callback: { bg: 'bg-orange-100', text: 'text-orange-700', headerBg: 'bg-orange-50' },
  'follow-up': { bg: 'bg-yellow-100', text: 'text-yellow-700', headerBg: 'bg-yellow-50' },
  'follow_up': { bg: 'bg-yellow-100', text: 'text-yellow-700', headerBg: 'bg-yellow-50' },
  followup: { bg: 'bg-yellow-100', text: 'text-yellow-700', headerBg: 'bg-yellow-50' },
  qualified: { bg: 'bg-violet-100', text: 'text-violet-700', headerBg: 'bg-violet-50' },
  interested: { bg: 'bg-purple-100', text: 'text-purple-700', headerBg: 'bg-purple-50' },
  'site-visit': { bg: 'bg-indigo-100', text: 'text-indigo-700', headerBg: 'bg-indigo-50' },
  'site_visit': { bg: 'bg-indigo-100', text: 'text-indigo-700', headerBg: 'bg-indigo-50' },
  negotiation: { bg: 'bg-amber-100', text: 'text-amber-700', headerBg: 'bg-amber-50' },
  converted: { bg: 'bg-green-200', text: 'text-green-800', headerBg: 'bg-green-100' },
  won: { bg: 'bg-green-200', text: 'text-green-800', headerBg: 'bg-green-100' },
  enrolled: { bg: 'bg-green-200', text: 'text-green-800', headerBg: 'bg-green-100' },
  lost: { bg: 'bg-red-100', text: 'text-red-700', headerBg: 'bg-red-50' },
  closed: { bg: 'bg-slate-100', text: 'text-slate-700', headerBg: 'bg-slate-50' },
  default: { bg: 'bg-slate-100', text: 'text-slate-600', headerBg: 'bg-slate-50' },
};

function getStageColor(slug: string): { bg: string; text: string; headerBg: string } {
  const normalized = slug.toLowerCase().replace(/[^a-z_-]/g, '');
  return stageColors[normalized] || stageColors.default;
}

export default function UserStageReportPage() {
  const [data, setData] = useState<UserStageReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const reportData = await leadReportsService.getUserStageReport();
      setData(reportData);
    } catch (err: any) {
      console.error('Failed to load user stage report:', err);
      setError(err.response?.data?.message || 'Failed to load report data');
    } finally {
      setIsLoading(false);
    }
  };

  const users = data?.users || [];
  const stages = data?.stages || [];

  return (
    <ReportTemplate
      title="User Stage Report"
      description="Shows lead stage distribution by user with all stages"
      icon={ChartBarIcon}
      iconColor="bg-pink-500"
      isLoading={isLoading}
      onRefresh={loadData}
    >
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Assigned Leads" value={data.summary.totalLeads} icon={UserGroupIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Total Converted" value={data.summary.totalConverted} icon={CheckCircleIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Total In Progress" value={data.summary.totalInProgress} icon={ChartBarIcon} iconColor="bg-yellow-500" />
            <ReportStatCard label="Total Lost" value={data.summary.totalLost} icon={XCircleIcon} iconColor="bg-red-500" />
          </ReportStatsGrid>

          {users.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
              No user data available. Leads may not be assigned to any users yet.
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-10">No</th>
                      <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-10 bg-slate-50 z-10">Username</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Total</th>
                      {stages.map((stage) => {
                        const colors = getStageColor(stage.slug);
                        return (
                          <th
                            key={stage.id}
                            className={`px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap ${colors.headerBg}`}
                          >
                            {stage.name}
                          </th>
                        );
                      })}
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-amber-50">In Progress</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-100">Converted</th>
                      <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Lost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((row) => (
                      <tr key={row.userId} className="hover:bg-slate-50">
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10">{row.no}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-10 bg-white z-10">{row.username}</td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center font-semibold text-blue-700 bg-blue-50/50">{row.totalAssignedLeads}</td>
                        {stages.map((stage) => {
                          const count = row.stageBreakdown[stage.slug] || 0;
                          const colors = getStageColor(stage.slug);
                          return (
                            <td key={stage.id} className={`px-3 py-3 whitespace-nowrap text-sm text-center ${colors.headerBg}/50`}>
                              {count > 0 ? (
                                <span className={`px-2 py-1 ${colors.bg} ${colors.text} rounded-full text-xs font-medium`}>
                                  {count}
                                </span>
                              ) : (
                                <span className="text-slate-300">0</span>
                              )}
                            </td>
                          );
                        })}
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-amber-50/50">
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{row.inProgress}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-green-100/50">
                          <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-bold">{row.converted}</span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-red-50/50">
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">{row.lost}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-semibold">
                      <td className="px-3 py-3 text-sm sticky left-0 bg-slate-100 z-10"></td>
                      <td className="px-3 py-3 text-sm font-bold sticky left-10 bg-slate-100 z-10">TOTAL</td>
                      <td className="px-3 py-3 text-sm text-center font-bold text-blue-700">{users.reduce((sum, r) => sum + r.totalAssignedLeads, 0)}</td>
                      {stages.map((stage) => (
                        <td key={stage.id} className="px-3 py-3 text-sm text-center">
                          {users.reduce((sum, r) => sum + (r.stageBreakdown[stage.slug] || 0), 0)}
                        </td>
                      ))}
                      <td className="px-3 py-3 text-sm text-center text-amber-700">{users.reduce((sum, r) => sum + r.inProgress, 0)}</td>
                      <td className="px-3 py-3 text-sm text-center font-bold text-green-700">{users.reduce((sum, r) => sum + r.converted, 0)}</td>
                      <td className="px-3 py-3 text-sm text-center text-red-700">{users.reduce((sum, r) => sum + r.lost, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </ReportTemplate>
  );
}
