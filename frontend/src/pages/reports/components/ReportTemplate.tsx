/**
 * Reusable Report Template Component
 * Provides consistent layout for all reports
 */

import { useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ReportFilter {
  name: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

interface ReportTemplateProps {
  title: string;
  description: string;
  icon: React.ElementType;
  iconColor: string;
  children: ReactNode;
  isLoading?: boolean;
  filters?: ReportFilter[];
  onRefresh?: () => void;
  onExport?: () => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
  showDateFilter?: boolean;
}

export default function ReportTemplate({
  title,
  description,
  icon: Icon,
  iconColor,
  children,
  isLoading = false,
  filters = [],
  onRefresh,
  onExport,
  dateRange,
  onDateRangeChange,
  showDateFilter = true,
}: ReportTemplateProps) {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [localDateRange, setLocalDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  const currentDateRange = dateRange || localDateRange;
  const handleDateRangeChange = onDateRangeChange || setLocalDateRange;

  const handleExport = () => {
    if (onExport) {
      onExport();
    } else {
      toast.success('Export functionality coming soon!');
    }
  };

  const datePresets = [
    { label: 'Today', getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { startDate: today, endDate: today };
    }},
    { label: 'Yesterday', getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      return { startDate: dateStr, endDate: dateStr };
    }},
    { label: 'Last 7 Days', getValue: () => {
      const now = new Date();
      const start = new Date(now);
      start.setDate(now.getDate() - 6);
      return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }},
    { label: 'This Month', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }},
    { label: 'Last Month', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
    }},
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/reports/all')}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-600" />
          </button>
          <div className={`w-12 h-12 ${iconColor} rounded-xl flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date Presets */}
          {showDateFilter && (
            <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
              {datePresets.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handleDateRangeChange(preset.getValue())}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors hover:bg-white hover:shadow-sm"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          )}

          {/* Filter Toggle */}
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`btn btn-secondary py-2 px-3 ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span className="ml-1.5 text-sm">Filters</span>
            </button>
          )}

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="btn btn-secondary py-2 px-3"
            >
              <ArrowPathIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Export */}
          <button onClick={handleExport} className="btn btn-primary py-2 px-3">
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="ml-1.5 text-sm">Export</span>
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showDateFilter && (
        <div className="flex items-center gap-3 flex-wrap bg-slate-50 rounded-lg p-3">
          <span className="text-sm font-medium text-slate-600">Custom Range:</span>
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm">
            <CalendarDaysIcon className="w-4 h-4 text-primary-500" />
            <input
              type="date"
              value={currentDateRange.startDate}
              onChange={(e) => handleDateRangeChange({ ...currentDateRange, startDate: e.target.value })}
              className="text-sm border-0 p-0 focus:ring-0 bg-transparent cursor-pointer"
            />
            <span className="text-slate-400 font-medium">→</span>
            <input
              type="date"
              value={currentDateRange.endDate}
              onChange={(e) => handleDateRangeChange({ ...currentDateRange, endDate: e.target.value })}
              className="text-sm border-0 p-0 focus:ring-0 bg-transparent cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && filters.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {filters.map((filter) => (
              <div key={filter.name}>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {filter.name}
                </label>
                <select
                  value={filter.value}
                  onChange={(e) => filter.onChange(e.target.value)}
                  className="input text-sm py-1.5"
                >
                  {filter.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <ArrowPathIcon className="w-8 h-8 text-primary-500 animate-spin" />
            <p className="text-sm text-slate-500">Loading report data...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

// Helper components for report content
export function ReportStatsGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {children}
    </div>
  );
}

export function ReportStatCard({
  label,
  value,
  subValue,
  icon: Icon,
  iconColor,
  trend,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: { value: number; isPositive: boolean };
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-10 h-10 ${iconColor} rounded-lg flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
    </div>
  );
}

export function ReportTable({
  columns,
  data,
  emptyMessage = 'No data available',
}: {
  columns: { key: string; label: string; align?: 'left' | 'center' | 'right'; render?: (value: any, row: any) => ReactNode }[];
  data: any[];
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
        <p className="text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-${col.align || 'left'}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-sm text-slate-700 text-${col.align || 'left'}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
