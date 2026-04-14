/**
 * Response Time Card Component
 * Displays response time metrics and SLA compliance
 */

import React from 'react';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { ResponseTimeMetrics } from '../team-monitoring.types';

interface ResponseTimeCardProps {
  data: ResponseTimeMetrics | null;
  loading: boolean;
}

function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function ResponseTimeCard({ data, loading }: ResponseTimeCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-40 mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.avgResponseTime === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Response Time Analytics</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No response time data available</p>
        </div>
      </div>
    );
  }

  const slaCompliance = 100 - data.slaBreachPercentage;
  const isGoodCompliance = slaCompliance >= 90;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Response Time Analytics</h3>
        </div>
        <div
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isGoodCompliance
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {isGoodCompliance ? (
            <CheckCircle className="w-3 h-3" />
          ) : (
            <AlertTriangle className="w-3 h-3" />
          )}
          {slaCompliance.toFixed(1)}% SLA
        </div>
      </div>

      {/* Main metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <p className="text-2xl font-bold text-blue-600">{formatDuration(data.avgResponseTime)}</p>
          <p className="text-xs text-slate-500 mt-1">Avg Response</p>
        </div>
        <div className="text-center p-3 bg-emerald-50 rounded-lg">
          <p className="text-2xl font-bold text-emerald-600">{formatDuration(data.minResponseTime)}</p>
          <p className="text-xs text-slate-500 mt-1">Fastest</p>
        </div>
        <div className="text-center p-3 bg-amber-50 rounded-lg">
          <p className="text-2xl font-bold text-amber-600">{formatDuration(data.maxResponseTime)}</p>
          <p className="text-xs text-slate-500 mt-1">Slowest</p>
        </div>
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <p className="text-2xl font-bold text-red-600">{data.slaBreachCount}</p>
          <p className="text-xs text-slate-500 mt-1">SLA Breaches</p>
        </div>
      </div>

      {/* Response time by hour */}
      {data.byHour.length > 0 && (
        <div>
          <p className="text-sm text-slate-600 mb-2">Response Time by Hour</p>
          <div className="flex items-end gap-1 h-20">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourData = data.byHour.find((h) => h.hour === hour);
              const value = hourData?.avgResponseTime || 0;
              const maxValue = Math.max(...data.byHour.map((h) => h.avgResponseTime), 1);
              const height = (value / maxValue) * 100;
              const isHighlighted = hourData && hourData.count > 0;

              return (
                <div
                  key={hour}
                  className="flex-1 group relative"
                  title={hourData ? `${hour}:00 - ${formatDuration(value)} (${hourData.count} leads)` : `${hour}:00 - No data`}
                >
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHighlighted
                        ? value > data.avgResponseTime
                          ? 'bg-amber-400 group-hover:bg-amber-500'
                          : 'bg-emerald-400 group-hover:bg-emerald-500'
                        : 'bg-slate-200'
                    }`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-xs text-slate-400 mt-1">
            <span>12am</span>
            <span>6am</span>
            <span>12pm</span>
            <span>6pm</span>
            <span>12am</span>
          </div>
        </div>
      )}

      {/* SLA threshold note */}
      <p className="text-xs text-slate-400 mt-4">
        SLA threshold: 5 minutes. Responses beyond this are marked as breaches.
      </p>
    </div>
  );
}
