/**
 * Telecaller Performance Table Component
 * Displays individual telecaller metrics in a sortable table
 */

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Phone,
  Clock,
  AlertCircle,
  User,
} from 'lucide-react';
import { TelecallerMetrics } from '../team-monitoring.types';

interface TelecallerTableProps {
  data: TelecallerMetrics[];
  loading: boolean;
}

type SortField = 'name' | 'totalCalls' | 'answeredCalls' | 'conversionRate' | 'avgResponseTime' | 'pendingFollowUps';
type SortDirection = 'asc' | 'desc';

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
}

function formatResponseTime(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  return `${minutes}m`;
}

export function TelecallerTable({ data, loading }: TelecallerTableProps) {
  const [sortField, setSortField] = useState<SortField>('totalCalls');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
    });
  }, [data, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <div className="w-4 h-4" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Telecaller Performance</h3>
        </div>
        <div className="p-4">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Telecaller Performance</h3>
        </div>
        <div className="p-8 text-center text-slate-500">
          <User className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No telecaller data available for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="p-4 border-b border-slate-100">
        <h3 className="font-semibold text-slate-800">Telecaller Performance</h3>
        <p className="text-sm text-slate-500 mt-1">{data.length} team members</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('totalCalls')}
              >
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Calls
                  <SortIcon field="totalCalls" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('answeredCalls')}
              >
                <div className="flex items-center gap-1">
                  Answered
                  <SortIcon field="answeredCalls" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('conversionRate')}
              >
                <div className="flex items-center gap-1">
                  Conv. Rate
                  <SortIcon field="conversionRate" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Avg Duration
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('avgResponseTime')}
              >
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Resp. Time
                  <SortIcon field="avgResponseTime" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('pendingFollowUps')}
              >
                <div className="flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Follow-ups
                  <SortIcon field="pendingFollowUps" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                Sentiment
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedData.map((telecaller) => (
              <tr key={telecaller.userId} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {telecaller.avatar ? (
                      <img
                        src={telecaller.avatar}
                        alt={telecaller.name}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {telecaller.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-800 text-sm">{telecaller.name}</p>
                      <p className="text-xs text-slate-500">{telecaller.role}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-800">{telecaller.totalCalls}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-slate-600">{telecaller.answeredCalls}</span>
                  <span className="text-xs text-slate-400 ml-1">
                    ({telecaller.totalCalls > 0 ? ((telecaller.answeredCalls / telecaller.totalCalls) * 100).toFixed(0) : 0}%)
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      telecaller.conversionRate >= 10
                        ? 'bg-emerald-100 text-emerald-700'
                        : telecaller.conversionRate >= 5
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {telecaller.conversionRate.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm">
                  {formatDuration(telecaller.avgCallDuration)}
                </td>
                <td className="px-4 py-3 text-slate-600 text-sm">
                  {formatResponseTime(telecaller.avgResponseTime)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600">{telecaller.pendingFollowUps}</span>
                    {telecaller.overdueFollowUps > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-xs">
                        {telecaller.overdueFollowUps} overdue
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <div
                      className="h-2 rounded-l bg-emerald-400"
                      style={{ width: `${(telecaller.sentiment.positive / Math.max(telecaller.totalCalls, 1)) * 50}px` }}
                      title={`Positive: ${telecaller.sentiment.positive}`}
                    />
                    <div
                      className="h-2 bg-slate-300"
                      style={{ width: `${(telecaller.sentiment.neutral / Math.max(telecaller.totalCalls, 1)) * 50}px` }}
                      title={`Neutral: ${telecaller.sentiment.neutral}`}
                    />
                    <div
                      className="h-2 rounded-r bg-red-400"
                      style={{ width: `${(telecaller.sentiment.negative / Math.max(telecaller.totalCalls, 1)) * 50}px` }}
                      title={`Negative: ${telecaller.sentiment.negative}`}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
