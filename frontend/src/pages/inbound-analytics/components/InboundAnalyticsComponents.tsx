/**
 * Inbound Analytics Components
 */

import React from 'react';
import {
  Phone,
  PhoneIncoming,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  Download,
  RefreshCw,
} from 'lucide-react';
import {
  DateRangeType,
  CallVolumeData,
  HourlyDistribution,
  QueueMetrics,
  AgentPerformance,
  LiveDashboardData,
  AnalyticsSummary,
} from '../inbound-analytics.types';
import {
  formatDuration,
  formatPercent,
  getChangeIcon,
  getChangeColor,
} from '../inbound-analytics.constants';

// Loading State
export const LoadingState: React.FC = () => (
  <div className="flex items-center justify-center h-64">
    <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
  </div>
);

// Header with date range controls
interface HeaderProps {
  dateRange: DateRangeType;
  startDate: string;
  endDate: string;
  isRefreshing: boolean;
  onDateRangeChange: (range: DateRangeType) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onRefresh: () => void;
  onExport: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  dateRange,
  startDate,
  endDate,
  isRefreshing,
  onDateRangeChange,
  onStartDateChange,
  onEndDateChange,
  onRefresh,
  onExport,
}) => (
  <div className="flex items-center justify-between">
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Inbound Analytics</h1>
      <p className="text-gray-600">Monitor call performance and agent metrics</p>
    </div>
    <div className="flex items-center gap-3">
      <select
        value={dateRange}
        onChange={(e) => onDateRangeChange(e.target.value as DateRangeType)}
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
            onChange={(e) => onStartDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          />
        </>
      )}
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
      >
        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
      <button
        onClick={onExport}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        <Download className="w-4 h-4" />
        Export
      </button>
    </div>
  </div>
);

// Live Dashboard Stats
interface LiveStatsProps {
  data: LiveDashboardData;
}

export const LiveStats: React.FC<LiveStatsProps> = ({ data }) => (
  <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white">
    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      Live Dashboard
    </h2>
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
      <div className="text-center">
        <div className="text-3xl font-bold">{data.activeCalls}</div>
        <div className="text-blue-200 text-sm">Active Calls</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{data.callsInQueue}</div>
        <div className="text-blue-200 text-sm">In Queue</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{data.availableAgents}</div>
        <div className="text-blue-200 text-sm">Available Agents</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{formatDuration(data.avgWaitTime)}</div>
        <div className="text-blue-200 text-sm">Avg Wait</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{formatDuration(data.longestWaitTime)}</div>
        <div className="text-blue-200 text-sm">Longest Wait</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{data.callsToday}</div>
        <div className="text-blue-200 text-sm">Calls Today</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{data.answeredToday}</div>
        <div className="text-blue-200 text-sm">Answered</div>
      </div>
      <div className="text-center">
        <div className="text-3xl font-bold">{data.abandonedToday}</div>
        <div className="text-blue-200 text-sm">Abandoned</div>
      </div>
    </div>
  </div>
);

// Summary Cards
interface SummaryCardsProps {
  summary: AnalyticsSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => (
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
);

// Call Volume Chart
interface CallVolumeChartProps {
  data: CallVolumeData[];
  maxVolume: number;
}

export const CallVolumeChart: React.FC<CallVolumeChartProps> = ({ data, maxVolume }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <BarChart3 className="w-5 h-5" />
      Call Volume
    </h3>
    <div className="h-64 flex items-end gap-2">
      {data.map((day, index) => (
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
          <span className="text-xs text-gray-500">
            {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
          </span>
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
);

// Hourly Distribution Chart
interface HourlyChartProps {
  data: HourlyDistribution[];
  maxHourly: number;
}

export const HourlyChart: React.FC<HourlyChartProps> = ({ data, maxHourly }) => (
  <div className="bg-white rounded-xl p-6 border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
      <Calendar className="w-5 h-5" />
      Hourly Distribution
    </h3>
    <div className="h-64 flex items-end gap-1">
      {data.map((hour, index) => (
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
);

// Queue Metrics Table
interface QueueTableProps {
  data: QueueMetrics[];
}

export const QueueTable: React.FC<QueueTableProps> = ({ data }) => (
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
          {data.map((queue) => (
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
          {data.length === 0 && (
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
);

// Agent Performance Table
interface AgentTableProps {
  data: AgentPerformance[];
}

export const AgentTable: React.FC<AgentTableProps> = ({ data }) => (
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
          {data.map((agent) => (
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
          {data.length === 0 && (
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
);
