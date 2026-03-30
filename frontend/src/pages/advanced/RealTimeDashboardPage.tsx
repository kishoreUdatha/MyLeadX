import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useWebSocket } from '../../hooks/useWebSocket';
import api from '../../services/api';

interface LiveCall {
  id: string;
  phoneNumber: string;
  contactName?: string;
  status: string;
  duration: number;
  startedAt: string;
  agentName?: string;
}

interface DashboardStats {
  activeCalls: number;
  callsToday: number;
  avgDuration: number;
  leadsToday: number;
  appointmentsToday: number;
  conversionRate: number;
}

export default function RealTimeDashboardPage() {
  const {
    isConnected,
    activeUsers,
    activeCalls,
    recentLeads,
    notifications,
    dismissNotification,
  } = useWebSocket();

  const [stats, setStats] = useState<DashboardStats>({
    activeCalls: 0,
    callsToday: 0,
    avgDuration: 0,
    leadsToday: 0,
    appointmentsToday: 0,
    conversionRate: 0,
  });
  const [liveCalls, setLiveCalls] = useState<LiveCall[]>([]);
  const [_loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Update live calls from WebSocket
  useEffect(() => {
    setLiveCalls(activeCalls.map(call => ({
      id: call.callId,
      phoneNumber: call.phoneNumber,
      contactName: call.contactName,
      status: call.status,
      duration: call.duration || 0,
      startedAt: call.timestamp,
      agentName: call.agentId,
    })));
  }, [activeCalls]);

  const fetchDashboardData = async () => {
    try {
      const [analyticsRes, callsRes] = await Promise.all([
        api.get('/advanced/analytics?days=1'),
        api.get('/outbound-calls/calls?status=in-progress'),
      ]);

      const analytics = analyticsRes.data.data;
      setStats({
        activeCalls: callsRes.data.data?.length || 0,
        callsToday: analytics?.summary?.totalCalls || 0,
        avgDuration: analytics?.summary?.avgDuration || 0,
        leadsToday: analytics?.summary?.newLeads || 0,
        appointmentsToday: analytics?.summary?.appointments || 0,
        conversionRate: analytics?.summary?.conversionRate || 0,
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'ringing': 'bg-yellow-500',
      'in-progress': 'bg-green-500',
      'on-hold': 'bg-orange-500',
      'completed': 'bg-gray-500',
      'failed': 'bg-red-500',
    };
    return colors[status] || 'bg-blue-500';
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Link to="/advanced" className="text-blue-600 hover:underline text-sm">
            &larr; Back to Advanced Features
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Real-Time Call Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            {activeUsers} active user{activeUsers !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg shadow-lg flex justify-between items-center ${
                notification.type === 'success' ? 'bg-green-100 text-green-800' :
                notification.type === 'error' ? 'bg-red-100 text-red-800' :
                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800'
              }`}
            >
              <span className="text-sm">{notification.message}</span>
              <button
                onClick={() => dismissNotification(notification.id)}
                className="ml-2 text-lg leading-none opacity-70 hover:opacity-100"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-3xl font-bold text-green-600">
            {liveCalls.length || stats.activeCalls}
          </div>
          <div className="text-gray-500 text-sm">Active Calls</div>
          <div className="mt-2 flex items-center">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
            <span className="text-xs text-green-600">Live</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-blue-600">{stats.callsToday}</div>
          <div className="text-gray-500 text-sm">Calls Today</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-purple-600">
            {formatDuration(Math.round(stats.avgDuration))}
          </div>
          <div className="text-gray-500 text-sm">Avg Duration</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-cyan-600">{stats.leadsToday}</div>
          <div className="text-gray-500 text-sm">Leads Today</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-pink-600">{stats.appointmentsToday}</div>
          <div className="text-gray-500 text-sm">Appointments</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-3xl font-bold text-orange-600">
            {(stats.conversionRate * 100).toFixed(1)}%
          </div>
          <div className="text-gray-500 text-sm">Conversion</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Active Calls Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Active Calls</h2>
            <span className="text-sm text-gray-500">
              {liveCalls.length} in progress
            </span>
          </div>
          <div className="p-4">
            {liveCalls.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📞</div>
                <p>No active calls at the moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {liveCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${getStatusColor(call.status)} animate-pulse`}></div>
                      <div>
                        <div className="font-medium">
                          {call.contactName || call.phoneNumber}
                        </div>
                        <div className="text-sm text-gray-500">{call.phoneNumber}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg">{formatDuration(call.duration)}</div>
                      <div className="text-xs text-gray-500 capitalize">{call.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads Panel */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h2 className="text-lg font-semibold">Recent Leads</h2>
            <Link to="/leads" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="p-4">
            {recentLeads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">👤</div>
                <p>Waiting for new leads...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div
                    key={lead.id}
                    className="p-4 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium">
                        {lead.firstName} {lead.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{lead.email}</div>
                    </div>
                    <div className="text-right">
                      {lead.score !== undefined && (
                        <div className="text-lg font-bold text-blue-600">{lead.score}</div>
                      )}
                      <div className="text-xs text-gray-500">{lead.source}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Call Queue / Scheduled */}
      <div className="mt-6 bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
        </div>
        <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link
            to="/outbound-calls/single"
            className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📞</div>
            <div className="text-sm font-medium text-blue-800">Make Call</div>
          </Link>
          <Link
            to="/advanced/scheduled-calls"
            className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📅</div>
            <div className="text-sm font-medium text-green-800">Scheduled Calls</div>
          </Link>
          <Link
            to="/advanced/appointments"
            className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">📆</div>
            <div className="text-sm font-medium text-purple-800">Appointments</div>
          </Link>
          <Link
            to="/advanced/dnc-list"
            className="p-4 bg-red-50 hover:bg-red-100 rounded-lg text-center transition-colors"
          >
            <div className="text-2xl mb-2">🚫</div>
            <div className="text-sm font-medium text-red-800">DNC List</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
