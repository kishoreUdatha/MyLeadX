/**
 * Inbound Analytics Dashboard
 * Monitor call performance and agent metrics
 */

import React from 'react';
import { useInboundAnalytics } from './hooks';
import {
  LoadingState,
  Header,
  LiveStats,
  SummaryCards,
  CallVolumeChart,
  HourlyChart,
  QueueTable,
  AgentTable,
} from './components';

export const InboundAnalyticsDashboard: React.FC = () => {
  const {
    dateRange,
    startDate,
    endDate,
    isLoading,
    isRefreshing,
    liveData,
    summary,
    callVolume,
    hourlyDistribution,
    queueMetrics,
    agentPerformance,
    maxVolume,
    maxHourly,
    setDateRange,
    setStartDate,
    setEndDate,
    handleRefresh,
    exportReport,
  } = useInboundAnalytics();

  if (isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="p-6 space-y-6">
      <Header
        dateRange={dateRange}
        startDate={startDate}
        endDate={endDate}
        isRefreshing={isRefreshing}
        onDateRangeChange={setDateRange}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onRefresh={handleRefresh}
        onExport={exportReport}
      />

      <LiveStats data={liveData} />

      <SummaryCards summary={summary} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CallVolumeChart data={callVolume} maxVolume={maxVolume} />
        <HourlyChart data={hourlyDistribution} maxHourly={maxHourly} />
      </div>

      <QueueTable data={queueMetrics} />

      <AgentTable data={agentPerformance} />
    </div>
  );
};
