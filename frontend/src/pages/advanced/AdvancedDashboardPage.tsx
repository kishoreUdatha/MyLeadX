import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface AnalyticsData {
  summary: {
    totalCalls: number;
    answeredCalls: number;
    avgDuration: number;
    conversionRate: number;
    newLeads: number;
    appointments: number;
  };
  dailyStats: Array<{
    date: string;
    totalCalls: number;
    answeredCalls: number;
    avgDuration: number;
    leadsGenerated: number;
    appointmentsBooked: number;
    conversionRate: number;
  }>;
}

interface TopLead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  score: {
    overallScore: number;
    grade: string;
    priority: number;
  };
}

export default function AdvancedDashboardPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [topLeads, setTopLeads] = useState<TopLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    fetchData();
  }, [days]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, leadsRes] = await Promise.all([
        api.get(`/advanced/analytics?days=${days}`),
        api.get('/advanced/lead-scores/top?limit=10'),
      ]);
      setAnalytics(analyticsRes.data.data);
      setTopLeads(leadsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const colors: Record<string, string> = {
      'A_PLUS': 'bg-green-500',
      'A': 'bg-green-400',
      'B': 'bg-blue-500',
      'C': 'bg-yellow-500',
      'D': 'bg-orange-500',
      'F': 'bg-red-500',
    };
    return colors[grade] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics Dashboard</h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded-lg px-4 py-2"
        >
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={60}>Last 60 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <Link
          to="/advanced/realtime"
          className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-center transition-colors border-2 border-green-200"
        >
          <div className="text-2xl mb-2">🔴</div>
          <div className="text-sm font-medium text-green-800">Live Dashboard</div>
        </Link>
        <Link
          to="/advanced/scheduled-calls"
          className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">📅</div>
          <div className="text-sm font-medium text-blue-800">Scheduled Calls</div>
        </Link>
        <Link
          to="/advanced/lead-scoring"
          className="bg-cyan-50 hover:bg-cyan-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium text-cyan-800">Lead Scoring</div>
        </Link>
        <Link
          to="/advanced/dnc-list"
          className="bg-red-50 hover:bg-red-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">🚫</div>
          <div className="text-sm font-medium text-red-800">DNC List</div>
        </Link>
        <Link
          to="/advanced/follow-up-rules"
          className="bg-green-50 hover:bg-green-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">🔄</div>
          <div className="text-sm font-medium text-green-800">Follow-up Rules</div>
        </Link>
        <Link
          to="/advanced/appointments"
          className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">📆</div>
          <div className="text-sm font-medium text-purple-800">Appointments</div>
        </Link>
        <Link
          to="/advanced/webhooks"
          className="bg-orange-50 hover:bg-orange-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">🔗</div>
          <div className="text-sm font-medium text-orange-800">Webhooks</div>
        </Link>
        <Link
          to="/outbound-calls"
          className="bg-indigo-50 hover:bg-indigo-100 p-4 rounded-lg text-center transition-colors"
        >
          <div className="text-2xl mb-2">📞</div>
          <div className="text-sm font-medium text-indigo-800">Outbound Calls</div>
        </Link>
      </div>

      {/* Summary Stats */}
      {analytics?.summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-blue-600">{analytics.summary.totalCalls}</div>
            <div className="text-gray-500 text-sm">Total Calls</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-green-600">{analytics.summary.answeredCalls}</div>
            <div className="text-gray-500 text-sm">Answered</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-purple-600">
              {Math.round(analytics.summary.avgDuration / 60)}m
            </div>
            <div className="text-gray-500 text-sm">Avg Duration</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-orange-600">
              {(analytics.summary.conversionRate * 100).toFixed(1)}%
            </div>
            <div className="text-gray-500 text-sm">Conversion Rate</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-cyan-600">{analytics.summary.newLeads}</div>
            <div className="text-gray-500 text-sm">New Leads</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-3xl font-bold text-pink-600">{analytics.summary.appointments}</div>
            <div className="text-gray-500 text-sm">Appointments</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Daily Stats Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Performance</h2>
          {analytics?.dailyStats && analytics.dailyStats.length > 0 ? (
            <div className="space-y-2">
              {analytics.dailyStats.slice(0, 7).map((stat) => (
                <div key={stat.date} className="flex items-center justify-between py-2 border-b">
                  <span className="text-sm text-gray-600">
                    {new Date(stat.date).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="text-blue-600">{stat.totalCalls} calls</span>
                    <span className="text-green-600">{stat.leadsGenerated} leads</span>
                    <span className="text-purple-600">{stat.appointmentsBooked} appts</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No data available</div>
          )}
        </div>

        {/* Top Leads */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold mb-4">Top Leads by Score</h2>
          {topLeads.length > 0 ? (
            <div className="space-y-3">
              {topLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      {lead.firstName} {lead.lastName}
                    </div>
                    <div className="text-sm text-gray-500">{lead.email}</div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span
                      className={`px-2 py-1 rounded text-white text-sm ${getGradeColor(
                        lead.score?.grade || 'C'
                      )}`}
                    >
                      {lead.score?.grade?.replace('_', '+') || 'C'}
                    </span>
                    <span className="text-lg font-bold text-blue-600">
                      {lead.score?.overallScore || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No scored leads yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
