/**
 * Team Monitoring Page
 * Main dashboard for team performance monitoring
 */

import React from 'react';
import { Users, AlertCircle } from 'lucide-react';
import { useTeamMonitoring } from './useTeamMonitoring';
import {
  OverviewCards,
  TelecallerTable,
  LeadAgingChart,
  CallOutcomesChart,
  ConversionTrendChart,
  FollowUpsList,
  ResponseTimeCard,
  FilterBar,
  LiveTeamStatusCard,
} from './components';

export function TeamMonitoringPage() {
  const {
    overview,
    telecallers,
    leadAging,
    callOutcomes,
    conversionTrend,
    responseTime,
    followUps,
    liveStatus,
    loading,
    overviewLoading,
    telecallersLoading,
    filters,
    setFilters,
    refresh,
    exportData,
    error,
  } = useTeamMonitoring();

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-primary-600" />
            Team Monitoring
          </h1>
          <p className="text-slate-500 mt-1">
            Track team performance, call metrics, and follow-up status
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-800">Error loading data</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
          <button
            onClick={refresh}
            className="ml-auto px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        onExport={exportData}
        onRefresh={refresh}
        loading={loading}
      />

      {/* Live Team Status + Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <OverviewCards data={overview} loading={overviewLoading} />
        </div>
        <LiveTeamStatusCard data={liveStatus} loading={loading} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionTrendChart data={conversionTrend} loading={loading} />
        <CallOutcomesChart data={callOutcomes} loading={loading} />
      </div>

      {/* Telecaller Performance Table */}
      <TelecallerTable data={telecallers} loading={telecallersLoading} />

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <LeadAgingChart data={leadAging} loading={loading} />
        <ResponseTimeCard data={responseTime} loading={loading} />
        <FollowUpsList data={followUps} loading={loading} />
      </div>
    </div>
  );
}

export default TeamMonitoringPage;
