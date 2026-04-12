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
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronDownIcon,
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
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
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
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
}: ReportTemplateProps) {
  const navigate = useNavigate();
  const [showFilters, setShowFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('This Month');
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

  const handlePresetClick = (label: string, getValue: () => DateRange) => {
    setActivePreset(label);
    handleDateRangeChange(getValue());
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
    { label: 'Last 3 Months', getValue: () => {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { startDate: start.toISOString().split('T')[0], endDate: now.toISOString().split('T')[0] };
    }},
  ];

  const [showDateDropdown, setShowDateDropdown] = useState(false);

  // Format date for display
  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between py-1">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/reports')}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filter Bar - Clean horizontal layout */}
      <div className="flex items-center justify-between gap-4 py-3 px-4 bg-white rounded-xl border border-slate-200 shadow-sm">
        {/* Left: Search */}
        {onSearchChange && (
          <div className="relative w-64">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-slate-50 hover:bg-white transition-colors"
            />
            {searchValue && (
              <button onClick={() => onSearchChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-200 rounded">
                <XMarkIcon className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        )}

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Date Filter */}
          {showDateFilter && (
            <div className="flex items-center bg-slate-50 rounded-lg p-1">
              {/* Quick presets as pills */}
              <div className="flex items-center gap-1 mr-2">
                {datePresets.slice(0, 4).map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset.label, preset.getValue)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      activePreset === preset.label
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-slate-300 mx-2"></div>

              {/* Date inputs */}
              <div className="flex items-center gap-2 px-2">
                <input
                  type="date"
                  value={currentDateRange.startDate}
                  onChange={(e) => {
                    setActivePreset('Custom');
                    handleDateRangeChange({ ...currentDateRange, startDate: e.target.value });
                  }}
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input
                  type="date"
                  value={currentDateRange.endDate}
                  onChange={(e) => {
                    setActivePreset('Custom');
                    handleDateRangeChange({ ...currentDateRange, endDate: e.target.value });
                  }}
                  className="text-xs border border-slate-200 rounded px-2 py-1.5 bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* Additional Filters */}
          {filters.length > 0 && (
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span className="text-xs font-medium">More</span>
              {filters.some(f => f.value) && <span className="w-1.5 h-1.5 bg-primary-500 rounded-full"></span>}
            </button>
          )}
        </div>
      </div>

      {/* Expandable Filters */}
      {showFilters && filters.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 p-3 bg-white border border-slate-200 rounded-lg">
          {filters.map((filter) => (
            <div key={filter.name} className="flex items-center gap-2">
              <label className="text-sm text-slate-600">{filter.name}</label>
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className="text-sm py-1.5 px-3 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-primary-500"
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
          <button onClick={() => filters.forEach(f => f.onChange(''))} className="text-sm text-primary-600 hover:text-primary-700 ml-auto">
            Clear all
          </button>
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
    <div className="grid grid-cols-4 gap-3">
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
    <div className="bg-white rounded-lg border border-slate-200 p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 ${iconColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-slate-500 truncate">{label}</p>
          <p className="text-lg font-bold text-slate-900">{value}</p>
        </div>
        {trend && (
          <div className={`ml-auto text-xs font-medium ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {trend.isPositive ? '↑' : '↓'}{Math.abs(trend.value)}%
          </div>
        )}
      </div>
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
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[11px] font-semibold text-slate-600 uppercase tracking-wider text-${col.align || 'left'} border-b border-slate-200`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr
                key={idx}
                className={`hover:bg-primary-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-2.5 text-sm text-slate-700 text-${col.align || 'left'} border-b border-slate-100`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Table footer with count */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        Showing {data.length} {data.length === 1 ? 'record' : 'records'}
      </div>
    </div>
  );
}
