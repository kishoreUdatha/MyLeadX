/**
 * Lead Aging Chart Component
 * Displays lead aging distribution in a horizontal bar chart
 */

import React from 'react';
import { Clock } from 'lucide-react';
import { LeadAgingBucket } from '../team-monitoring.types';

interface LeadAgingChartProps {
  data: LeadAgingBucket[];
  loading: boolean;
}

const BUCKET_COLORS: Record<string, string> = {
  '0-1 days': 'bg-emerald-500',
  '1-3 days': 'bg-teal-500',
  '3-7 days': 'bg-amber-500',
  '7-14 days': 'bg-orange-500',
  '14-30 days': 'bg-red-400',
  '30+ days': 'bg-red-600',
};

export function LeadAgingChart({ data, loading }: LeadAgingChartProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-slate-200 rounded w-32 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 bg-slate-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalLeads = data.reduce((sum, bucket) => sum + bucket.count, 0);
  const maxCount = Math.max(...data.map((b) => b.count), 1);

  if (totalLeads === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Lead Aging</h3>
        </div>
        <div className="text-center py-8 text-slate-500">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p>No lead aging data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          <h3 className="font-semibold text-slate-800">Lead Aging</h3>
        </div>
        <span className="text-sm text-slate-500">{totalLeads} active leads</span>
      </div>

      <div className="space-y-3">
        {data.map((bucket) => (
          <div key={bucket.bucket} className="group">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-slate-600">{bucket.bucket}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-800">{bucket.count}</span>
                <span className="text-xs text-slate-400">({bucket.percentage}%)</span>
              </div>
            </div>
            <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
              <div
                className={`h-full ${BUCKET_COLORS[bucket.bucket] || 'bg-slate-400'} transition-all duration-300 group-hover:opacity-80`}
                style={{ width: `${(bucket.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Legend showing urgency */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-500">
          <span className="inline-block w-3 h-3 rounded bg-emerald-500 mr-1"></span> Fresh
          <span className="inline-block w-3 h-3 rounded bg-amber-500 mx-1 ml-3"></span> Needs attention
          <span className="inline-block w-3 h-3 rounded bg-red-500 mx-1 ml-3"></span> Urgent
        </p>
      </div>
    </div>
  );
}
