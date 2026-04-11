/**
 * User Activity Report - Session tracking with breaks and calling metrics
 */

import { useState, useEffect } from 'react';
import { ClockIcon, PhoneIcon, PauseCircleIcon, PlayCircleIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, ReportTable } from './components/ReportTemplate';
import { workSessionService, SessionSummary, OrgStats } from '../../services/work-session.service';
import toast from 'react-hot-toast';

// Format seconds to readable time
const formatTime = (seconds: number): string => {
  if (!seconds || seconds === 0) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

// Format ISO date to time string
const formatTimeString = (isoString: string): string => {
  if (!isoString || isoString === '-') return '-';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '-';
  }
};

interface ReportData {
  summary: OrgStats & { avgActiveTime: string; avgBreakTime: string };
  users: Array<{
    name: string;
    loginTime: string;
    logoutTime: string;
    activeTime: string;
    breakTime: string;
    idleTime: string;
    calls: number;
    avgCallDuration: string;
  }>;
}

export default function UserActivityReportPage() {
  const [data, setData] = useState<ReportData>({
    summary: {
      totalSessions: 0,
      totalActiveTime: 0,
      totalBreakTime: 0,
      totalIdleTime: 0,
      totalDuration: 0,
      activeUsersCount: 0,
      avgActiveTime: '-',
      avgBreakTime: '-',
    },
    users: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    loadData();
  }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Fetch session summary and org stats in parallel
      const [sessionSummary, orgStats] = await Promise.all([
        workSessionService.getSessionSummary(dateRange),
        workSessionService.getOrgStats(dateRange),
      ]);

      // Transform session data for table
      const tableData = sessionSummary.map((user: SessionSummary) => ({
        name: user.userName || 'Unknown User',
        loginTime: formatTimeString(user.loginTime),
        logoutTime: user.logoutTime !== '-' ? formatTimeString(user.logoutTime) : 'Active',
        activeTime: formatTime(user.activeTime),
        breakTime: formatTime(user.breakTime),
        idleTime: formatTime(user.idleTime),
        calls: user.totalCalls,
        avgCallDuration: user.avgCallDuration > 0 ? `${user.avgCallDuration}s` : '-',
      }));

      // Calculate averages
      const userCount = sessionSummary.length || 1;
      const avgActiveTime = formatTime(Math.round(orgStats.totalActiveTime / userCount));
      const avgBreakTime = formatTime(Math.round(orgStats.totalBreakTime / userCount));

      setData({
        summary: {
          ...orgStats,
          avgActiveTime,
          avgBreakTime,
        },
        users: tableData,
      });
    } catch (err: any) {
      console.error('Failed to load user activity:', err);
      toast.error('Failed to load activity data');
      setData({
        summary: {
          totalSessions: 0,
          totalActiveTime: 0,
          totalBreakTime: 0,
          totalIdleTime: 0,
          totalDuration: 0,
          activeUsersCount: 0,
          avgActiveTime: '-',
          avgBreakTime: '-',
        },
        users: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  const columns = [
    { key: 'name', label: 'User' },
    { key: 'loginTime', label: 'Login Time', align: 'center' as const },
    { key: 'logoutTime', label: 'Logout Time', align: 'center' as const,
      render: (val: string) => (
        <span className={val === 'Active' ? 'text-green-600 font-medium' : ''}>{val}</span>
      )
    },
    { key: 'activeTime', label: 'Active Time', align: 'center' as const,
      render: (val: string) => <span className="text-green-600 font-medium">{val}</span>
    },
    { key: 'breakTime', label: 'Break Time', align: 'center' as const,
      render: (val: string) => <span className="text-orange-600">{val}</span>
    },
    { key: 'idleTime', label: 'Idle Time', align: 'center' as const,
      render: (val: string) => <span className="text-red-500">{val}</span>
    },
    { key: 'calls', label: 'Calls', align: 'center' as const },
    { key: 'avgCallDuration', label: 'Avg Call Duration', align: 'center' as const },
  ];

  return (
    <ReportTemplate
      title="User Activity Report"
      description="Session tracking with login/logout times, breaks, and calling metrics"
      icon={ClockIcon}
      iconColor="bg-indigo-500"
      isLoading={isLoading}
      onRefresh={loadData}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
    >
      <div className="space-y-6">
        <ReportStatsGrid>
          <ReportStatCard
            label="Active Users"
            value={data.summary.activeUsersCount}
            icon={UserGroupIcon}
            iconColor="bg-blue-500"
          />
          <ReportStatCard
            label="Total Active Time"
            value={formatTime(data.summary.totalActiveTime)}
            icon={PlayCircleIcon}
            iconColor="bg-green-500"
          />
          <ReportStatCard
            label="Total Break Time"
            value={formatTime(data.summary.totalBreakTime)}
            icon={PauseCircleIcon}
            iconColor="bg-orange-500"
          />
          <ReportStatCard
            label="Total Idle Time"
            value={formatTime(data.summary.totalIdleTime)}
            icon={ClockIcon}
            iconColor="bg-red-500"
          />
        </ReportStatsGrid>

        {data.users.length > 0 ? (
          <ReportTable columns={columns} data={data.users} />
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No session data</h3>
            <p className="mt-1 text-sm text-gray-500">
              User sessions will appear here once users start logging in and out.
            </p>
          </div>
        )}
      </div>
    </ReportTemplate>
  );
}
