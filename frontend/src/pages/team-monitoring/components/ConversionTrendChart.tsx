/**
 * Conversion Trend Chart Component
 * Displays conversion trend over time as a line chart
 */

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ConversionTrendData } from '../team-monitoring.types';

interface ConversionTrendChartProps {
  data: ConversionTrendData[];
  loading: boolean;
}

export function ConversionTrendChart({ data, loading }: ConversionTrendChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="h-48 bg-slate-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Conversion Trend</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No conversion data available</p>
        </div>
      </div>
    );
  }

  // Calculate chart dimensions
  const chartWidth = 100; // percentage
  const chartHeight = 180;
  const padding = { top: 20, right: 10, bottom: 30, left: 40 };
  const innerWidth = chartWidth;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // Calculate scales
  const maxConversions = Math.max(...data.map((d) => d.conversions), 1);
  const maxCalls = Math.max(...data.map((d) => d.totalCalls), 1);
  const maxRate = Math.max(...data.map((d) => d.conversionRate), 10);

  // Generate path for conversions line
  const getConversionsPath = () => {
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = padding.top + innerHeight - (d.conversions / maxConversions) * innerHeight;
      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
    });
    return points.join(' ');
  };

  // Generate path for conversion rate line
  const getRatePath = () => {
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = padding.top + innerHeight - (d.conversionRate / maxRate) * innerHeight;
      return `${i === 0 ? 'M' : 'L'} ${x}% ${y}`;
    });
    return points.join(' ');
  };

  // Total stats
  const totalConversions = data.reduce((sum, d) => sum + d.conversions, 0);
  const totalCalls = data.reduce((sum, d) => sum + d.totalCalls, 0);
  const avgRate = totalCalls > 0 ? (totalConversions / totalCalls) * 100 : 0;

  // Format date label
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Conversion Trend</h3>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500 rounded"></div>
            <span className="text-slate-500">Conversions</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500 rounded"></div>
            <span className="text-slate-500">Rate %</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-800">{totalConversions}</p>
          <p className="text-xs text-slate-500">Total Conversions</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-slate-800">{totalCalls}</p>
          <p className="text-xs text-slate-500">Total Calls</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-lg font-bold text-emerald-600">{avgRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-500">Avg Rate</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative" style={{ height: chartHeight }}>
        <svg width="100%" height={chartHeight} className="overflow-visible">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((pct) => (
            <line
              key={pct}
              x1="0%"
              x2="100%"
              y1={padding.top + innerHeight * (1 - pct / 100)}
              y2={padding.top + innerHeight * (1 - pct / 100)}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Conversions line */}
          <path
            d={getConversionsPath()}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Conversion rate line */}
          <path
            d={getRatePath()}
            fill="none"
            stroke="#3B82F6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 2"
          />

          {/* Data points for conversions */}
          {data.map((d, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = padding.top + innerHeight - (d.conversions / maxConversions) * innerHeight;
            return (
              <g key={i}>
                <circle
                  cx={`${x}%`}
                  cy={y}
                  r="4"
                  fill="#10B981"
                  className="hover:r-6 transition-all"
                >
                  <title>{`${formatDate(d.date)}: ${d.conversions} conversions (${d.conversionRate}%)`}</title>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-1">
          {data.length <= 10 ? (
            data.map((d, i) => (
              <span key={i} className="text-xs text-slate-400">
                {formatDate(d.date)}
              </span>
            ))
          ) : (
            <>
              <span className="text-xs text-slate-400">{formatDate(data[0].date)}</span>
              <span className="text-xs text-slate-400">{formatDate(data[Math.floor(data.length / 2)].date)}</span>
              <span className="text-xs text-slate-400">{formatDate(data[data.length - 1].date)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
