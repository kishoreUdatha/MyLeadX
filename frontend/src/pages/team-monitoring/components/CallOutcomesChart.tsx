/**
 * Call Outcomes Chart Component
 * Displays call outcome distribution as a donut chart
 */

import React from 'react';
import { PieChart } from 'lucide-react';
import { CallOutcomeData } from '../team-monitoring.types';

interface CallOutcomesChartProps {
  data: CallOutcomeData[];
  loading: boolean;
}

export function CallOutcomesChart({ data, loading }: CallOutcomesChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="flex items-center justify-center">
            <div className="w-40 h-40 bg-slate-100 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  const totalCalls = data.reduce((sum, outcome) => sum + outcome.count, 0);

  if (totalCalls === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <PieChart className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Call Outcomes</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No call outcome data available</p>
        </div>
      </div>
    );
  }

  // Calculate SVG donut chart segments
  let currentAngle = 0;
  const radius = 60;
  const centerX = 80;
  const centerY = 80;
  const strokeWidth = 30;

  const segments = data.map((outcome) => {
    const percentage = outcome.count / totalCalls;
    const angle = percentage * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    // Convert angles to radians
    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((startAngle + angle - 90) * Math.PI) / 180;

    // Calculate arc path
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      ...outcome,
      path: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      percentage,
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Call Outcomes</h3>
        </div>
        <span className="text-sm text-slate-500">{totalCalls} total calls</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <svg width="160" height="160" viewBox="0 0 160 160">
            {/* Background circle */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
            />
            {/* Segments */}
            {segments.map((segment, index) => (
              <path
                key={index}
                d={segment.path}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                className="transition-opacity hover:opacity-80"
              />
            ))}
            {/* Center text */}
            <text
              x={centerX}
              y={centerY - 5}
              textAnchor="middle"
              className="fill-slate-800 text-xl font-bold"
            >
              {totalCalls}
            </text>
            <text
              x={centerX}
              y={centerY + 12}
              textAnchor="middle"
              className="fill-slate-500 text-xs"
            >
              calls
            </text>
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2 max-h-40 overflow-y-auto">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="text-slate-600 truncate">{segment.outcome}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-800">{segment.count}</span>
                <span className="text-slate-400 text-xs">({segment.percentage.toFixed(0)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
