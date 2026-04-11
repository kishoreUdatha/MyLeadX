import { useState, useEffect } from 'react';
import {
  UsersIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  ServerIcon,
  ArrowPathIcon,
  SignalIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface RealtimeOverview {
  activeUsers: number;
  ongoingCalls: number;
  messagesLastHour: number;
  apiRequestsPerMinute: number;
  systemHealth: {
    api: string;
    database: string;
    redis: string;
    queues: string;
  };
}

export default function RealtimePage() {
  const [overview, setOverview] = useState<RealtimeOverview | null>(null);
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchData();

    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchData = async () => {
    try {
      const [overviewRes, usersRes, feedRes] = await Promise.all([
        api.get('/super-admin/realtime/overview'),
        api.get('/super-admin/realtime/active-users?minutes=15'),
        api.get('/super-admin/realtime/activity-feed?limit=20'),
      ]);

      setOverview(overviewRes.data.data);
      setActiveUsers(usersRes.data.data || []);
      setActivityFeed(feedRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch realtime data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const healthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-amber-600 bg-amber-100';
      case 'down': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Real-time Monitoring</h1>
          <p className="text-slate-500">Live platform activity and system health</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
            />
            Auto-refresh
          </label>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Active Users</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.activeUsers || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <PhoneIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Ongoing Calls</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.ongoingCalls || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ChatBubbleLeftIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Messages (1h)</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.messagesLastHour || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-100 rounded-lg">
              <SignalIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">API Req/min</p>
              <p className="text-2xl font-bold text-slate-900">{overview?.apiRequestsPerMinute || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">System Health</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {overview?.systemHealth && Object.entries(overview.systemHealth).map(([service, status]) => (
            <div key={service} className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
              <ServerIcon className="w-5 h-5 text-slate-400" />
              <div>
                <p className="text-sm font-medium text-slate-900 capitalize">{service}</p>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${healthStatusColor(status)}`}>
                  {status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Users */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Users (Last 15 min)</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activeUsers.length === 0 ? (
              <p className="text-slate-500 text-sm">No active users</p>
            ) : (
              activeUsers.slice(0, 10).map((user, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-sm font-medium text-purple-600">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-slate-500">{user.organizationName}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Online
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Feed</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activityFeed.length === 0 ? (
              <p className="text-slate-500 text-sm">No recent activity</p>
            ) : (
              activityFeed.map((activity, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <ClockIcon className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-900">{activity.action}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {activity.userEmail} - {activity.organizationName}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(activity.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
