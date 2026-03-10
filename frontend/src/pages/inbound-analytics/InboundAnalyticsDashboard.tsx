import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneIncoming,
  PhoneMissed,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from 'lucide-react';

interface CallVolumeData {
  date: string;
  total: number;
  answered: number;
  missed: number;
  voicemail: number;
}

interface HourlyDistribution {
  hour: number;
  calls: number;
}

interface QueueMetrics {
  queueId: string;
  queueName: string;
  totalCalls: number;
  avgWaitTime: number;
  avgHandleTime: number;
  abandonmentRate: number;
  serviceLevelPercent: number;
}

interface AgentPerformance {
  userId: string;
  userName: string;
  callsHandled: number;
  avgHandleTime: number;
  avgWrapUpTime: number;
  utilizationPercent: number;
}

interface LiveDashboardData {
  activeCalls: number;
  callsInQueue: number;
  availableAgents: number;
  avgWaitTime: number;
  longestWaitTime: number;
  callsToday: number;
  answeredToday: number;
  abandonedToday: number;
}

interface AnalyticsSummary {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  voicemails: number;
  avgWaitTime: number;
  avgHandleTime: number;
  serviceLevelPercent: number;
  abandonmentRate: number;
  callsChange: number;
  answeredChange: number;
  waitTimeChange: number;
  handleTimeChange: number;
}

export const InboundAnalyticsDashboard: React.FC = () => {
  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'custom'>('7days');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [liveData, setLiveData] = useState<LiveDashboardData>({
    activeCalls: 0,
    callsInQueue: 0,
    availableAgents: 0,
    avgWaitTime: 0,
    longestWaitTime: 0,
    callsToday: 0,
    answeredToday: 0,
    abandonedToday: 0,
  });

  const [summary, setSummary] = useState<AnalyticsSummary>({
    totalCalls: 0,
    answeredCalls: 0,
    missedCalls: 0,
    voicemails: 0,
    avgWaitTime: 0,
    avgHandleTime: 0,
    serviceLevelPercent: 0,
    abandonmentRate: 0,
    callsChange: 0,
    answeredChange: 0,
    waitTimeChange: 0,
    handleTimeChange: 0,
  });

  const [callVolume, setCallVolume] = useState<CallVolumeData[]>([]);
  const [hourlyDistribution, setHourlyDistribution] = useState<HourlyDistribution[]>([]);
  const [queueMetrics, setQueueMetrics] = useState<QueueMetrics[]>([]);
  const [agentPerformance, setAgentPerformance] = useState<AgentPerformance[]>([]);

  useEffect(() => {
    loadAnalytics();
    const liveInterval = setInterval(loadLiveData, 10000);
    return () => clearInterval(liveInterval);
  }, [dateRange, startDate, endDate]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadLiveData(),
        loadSummary(),
        loadCallVolume(),
        loadHourlyDistribution(),
        loadQueueMetrics(),
        loadAgentPerformance(),
      ]);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLiveData = async () => {
    try {
      const response = await fetch('/api/inbound-analytics/live');
      if (response.ok) {
        const data = await response.json();
        setLiveData(data.data);
      }
    } catch (error) {
      console.error('Failed to load live data:', error);
    }
  };

  const loadSummary = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/call-volume?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSummary(data.data?.summary || summary);
      }
    } catch (error) {
      console.error('Failed to load summary:', error);
    }
  };

  const loadCallVolume = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/call-volume?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCallVolume(data.data?.daily || []);
      }
    } catch (error) {
      console.error('Failed to load call volume:', error);
    }
  };

  const loadHourlyDistribution = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/hourly-distribution?${params}`);
      if (response.ok) {
        const data = await response.json();
        setHourlyDistribution(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load hourly distribution:', error);
    }
  };

  const loadQueueMetrics = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/queue-metrics?${params}`);
      if (response.ok) {
        const data = await response.json();
        setQueueMetrics(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load queue metrics:', error);
    }
  };

  const loadAgentPerformance = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/agent-performance?${params}`);
      if (response.ok) {
        const data = await response.json();
        setAgentPerformance(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load agent performance:', error);
    }
  };

  const getDateParams = () => {
    const params = new URLSearchParams();
    const now = new Date();

    if (dateRange === 'today') {
      params.set('startDate', now.toISOString().split('T')[0]);
      params.set('endDate', now.toISOString().split('T')[0]);
    } else if (dateRange === '7days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      params.set('startDate', start.toISOString().split('T')[0]);
      params.set('endDate', now.toISOString().split('T')[0]);
    } else if (dateRange === '30days') {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      params.set('startDate', start.toISOString().split('T')[0]);
      params.set('endDate', now.toISOString().split('T')[0]);
    } else if (dateRange === 'custom' && startDate && endDate) {
      params.set('startDate', startDate);
      params.set('endDate', endDate);
    }

    return params.toString();
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAnalytics();
    setIsRefreshing(false);
  };

  const exportReport = async () => {
    try {
      const params = getDateParams();
      const response = await fetch(`/api/inbound-analytics/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `inbound-analytics-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (change < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getChangeColor = (change: number, inverse = false) => {
    if (change === 0) return 'text-gray-500';
    const isPositive = inverse ? change < 0 : change > 0;
    return isPositive ? 'text-green-600' : 'text-red-600';
  };

  const maxVolume = Math.max(...callVolume.map(d => d.total), 1);
  const maxHourly = Math.max(...hourlyDistribution.map(d => d.calls), 1);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbound Analytics</h1>
          <p className="text-gray-600">Monitor call performance and agent metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Live Dashboard
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.activeCalls}</div>
            <div className="text-blue-200 text-sm">Active Calls</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.callsInQueue}</div>
            <div className="text-blue-200 text-sm">In Queue</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.availableAgents}</div>
            <div className="text-blue-200 text-sm">Available Agents</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{formatDuration(liveData.avgWaitTime)}</div>
            <div className="text-blue-200 text-sm">Avg Wait</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{formatDuration(liveData.longestWaitTime)}</div>
            <div className="text-blue-200 text-sm">Longest Wait</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.callsToday}</div>
            <div className="text-blue-200 text-sm">Calls Today</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.answeredToday}</div>
            <div className="text-blue-200 text-sm">Answered</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{liveData.abandonedToday}</div>
            <div className="text-blue-200 text-sm">Abandoned</div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Phone className="w-8 h-8 text-blue-600" />
            <div className={`flex items-center gap-1 text-sm ${getChangeColor(summary.callsChange)}`}>
              {getChangeIcon(summary.callsChange)}
              {Math.abs(summary.callsChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.totalCalls}</div>
          <div className="text-gray-600">Total Calls</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <PhoneIncoming className="w-8 h-8 text-green-600" />
            <div className={`flex items-center gap-1 text-sm ${getChangeColor(summary.answeredChange)}`}>
              {getChangeIcon(summary.answeredChange)}
              {Math.abs(summary.answeredChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{summary.answeredCalls}</div>
          <div className="text-gray-600">Answered</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <Clock className="w-8 h-8 text-orange-600" />
            <div className={`flex items-center gap-1 text-sm ${getChangeColor(summary.waitTimeChange, true)}`}>
              {getChangeIcon(summary.waitTimeChange)}
              {Math.abs(summary.waitTimeChange).toFixed(1)}%
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatDuration(summary.avgWaitTime)}</div>
          <div className="text-gray-600">Avg Wait Time</div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">{formatPercent(summary.serviceLevelPercent)}</div>
          <div className="text-gray-600">Service Level</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Call Volume Chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Call Volume
          </h3>
          <div className="h-64 flex items-end gap-2">
            {callVolume.map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col gap-0.5" style={{ height: '200px' }}>
                  <div
                    className="bg-red-400 w-full rounded-t"
                    style={{ height: `${(day.missed / maxVolume) * 100}%` }}
                    title={`Missed: ${day.missed}`}
                  />
                  <div
                    className="bg-yellow-400 w-full"
                    style={{ height: `${(day.voicemail / maxVolume) * 100}%` }}
                    title={`Voicemail: ${day.voicemail}`}
                  />
                  <div
                    className="bg-green-500 w-full rounded-b"
                    style={{ height: `${(day.answered / maxVolume) * 100}%` }}
                    title={`Answered: ${day.answered}`}
                  />
                </div>
                <span className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-600">Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-400 rounded" />
              <span className="text-sm text-gray-600">Voicemail</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded" />
              <span className="text-sm text-gray-600">Missed</span>
            </div>
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Hourly Distribution
          </h3>
          <div className="h-64 flex items-end gap-1">
            {hourlyDistribution.map((hour, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="bg-blue-500 w-full rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                  style={{ height: `${(hour.calls / maxHourly) * 200}px` }}
                  title={`${hour.hour}:00 - ${hour.calls} calls`}
                />
                {index % 3 === 0 && (
                  <span className="text-xs text-gray-500">{hour.hour}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Queue Metrics */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Queue Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="pb-3 font-medium">Queue</th>
                <th className="pb-3 font-medium text-right">Total Calls</th>
                <th className="pb-3 font-medium text-right">Avg Wait</th>
                <th className="pb-3 font-medium text-right">Avg Handle</th>
                <th className="pb-3 font-medium text-right">Abandonment</th>
                <th className="pb-3 font-medium text-right">Service Level</th>
              </tr>
            </thead>
            <tbody>
              {queueMetrics.map((queue) => (
                <tr key={queue.queueId} className="border-b last:border-0">
                  <td className="py-3 font-medium text-gray-900">{queue.queueName}</td>
                  <td className="py-3 text-right">{queue.totalCalls}</td>
                  <td className="py-3 text-right">{formatDuration(queue.avgWaitTime)}</td>
                  <td className="py-3 text-right">{formatDuration(queue.avgHandleTime)}</td>
                  <td className="py-3 text-right">
                    <span className={queue.abandonmentRate > 10 ? 'text-red-600' : 'text-green-600'}>
                      {formatPercent(queue.abandonmentRate)}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <span className={queue.serviceLevelPercent >= 80 ? 'text-green-600' : 'text-orange-600'}>
                      {formatPercent(queue.serviceLevelPercent)}
                    </span>
                  </td>
                </tr>
              ))}
              {queueMetrics.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No queue data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Agent Performance */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Agent Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b">
                <th className="pb-3 font-medium">Agent</th>
                <th className="pb-3 font-medium text-right">Calls Handled</th>
                <th className="pb-3 font-medium text-right">Avg Handle Time</th>
                <th className="pb-3 font-medium text-right">Avg Wrap Up</th>
                <th className="pb-3 font-medium text-right">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {agentPerformance.map((agent) => (
                <tr key={agent.userId} className="border-b last:border-0">
                  <td className="py-3 font-medium text-gray-900">{agent.userName}</td>
                  <td className="py-3 text-right">{agent.callsHandled}</td>
                  <td className="py-3 text-right">{formatDuration(agent.avgHandleTime)}</td>
                  <td className="py-3 text-right">{formatDuration(agent.avgWrapUpTime)}</td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            agent.utilizationPercent >= 80
                              ? 'bg-green-500'
                              : agent.utilizationPercent >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${agent.utilizationPercent}%` }}
                        />
                      </div>
                      <span className="text-sm">{formatPercent(agent.utilizationPercent)}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {agentPerformance.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No agent performance data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
