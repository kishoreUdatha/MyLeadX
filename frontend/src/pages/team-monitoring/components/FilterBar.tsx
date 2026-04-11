/**
 * Filter Bar Component
 * Date range and filter controls for team monitoring
 */

import React from 'react';
import { Calendar, Filter, Download, RefreshCw } from 'lucide-react';
import { TeamMonitoringFilters, ExportType } from '../team-monitoring.types';

interface FilterBarProps {
  filters: TeamMonitoringFilters;
  onFiltersChange: (filters: TeamMonitoringFilters) => void;
  onExport: (type: ExportType) => void;
  onRefresh: () => void;
  loading: boolean;
}

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7days', label: 'Last 7 Days' },
  { value: '30days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
] as const;

const EXPORT_OPTIONS: { value: ExportType; label: string }[] = [
  { value: 'telecallers', label: 'Telecaller Performance' },
  { value: 'outcomes', label: 'Call Outcomes' },
  { value: 'lead-aging', label: 'Lead Aging' },
  { value: 'follow-ups', label: 'Follow-ups' },
];

export function FilterBar({ filters, onFiltersChange, onExport, onRefresh, loading }: FilterBarProps) {
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  const handleDateRangeChange = (range: TeamMonitoringFilters['dateRange']) => {
    onFiltersChange({
      ...filters,
      dateRange: range,
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const handleCustomDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    onFiltersChange({
      ...filters,
      dateRange: 'custom',
      [field]: value ? new Date(value) : undefined,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {DATE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleDateRangeChange(option.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  filters.dateRange === option.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Inputs */}
        {filters.dateRange === 'custom' && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.dateFrom?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleCustomDateChange('dateFrom', e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={filters.dateTo?.toISOString().split('T')[0] || ''}
              onChange={(e) => handleCustomDateChange('dateTo', e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-100 z-20 py-1">
                  {EXPORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        onExport(option.value);
                        setShowExportMenu(false);
                      }}
                      className="w-full px-4 py-2 text-sm text-left text-slate-700 hover:bg-slate-50"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
