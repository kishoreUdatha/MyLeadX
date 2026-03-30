/**
 * Campaign Analytics Page
 * Displays comprehensive analytics for outbound call campaigns
 */

import React from 'react';
import { useCampaignAnalytics } from './hooks';
import {
  AnalyticsLoadingState,
  ErrorState,
  AnalyticsHeader,
  SummaryCards,
  OutcomeChart,
  ConversionFunnelChart,
  HourlyChart,
  DurationChart,
  SentimentChart,
  DailyTrendChart,
  StatisticsTable,
} from './components';

export const CampaignAnalytics: React.FC = () => {
  const {
    campaign,
    analytics,
    loading,
    error,
    outcomeData,
    hourlyData,
    durationData,
    sentimentData,
    funnelData,
    dailyTrendData,
    fetchData,
    goBack,
    exportToCSV,
  } = useCampaignAnalytics();

  if (loading) {
    return <AnalyticsLoadingState />;
  }

  if (error || !analytics) {
    return <ErrorState error={error || 'Failed to load analytics'} onBack={goBack} />;
  }

  return (
    <div className="p-6">
      <AnalyticsHeader
        campaign={campaign}
        onBack={goBack}
        onRefresh={fetchData}
        onExport={exportToCSV}
      />

      <SummaryCards analytics={analytics} />

      {/* Charts Row 1 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <OutcomeChart data={outcomeData} />
        <ConversionFunnelChart data={funnelData} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <HourlyChart data={hourlyData} />
        <DurationChart data={durationData} />
      </div>

      {/* Charts Row 3 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <SentimentChart data={sentimentData} analytics={analytics} />
        <DailyTrendChart data={dailyTrendData} />
      </div>

      <StatisticsTable analytics={analytics} />
    </div>
  );
};

export default CampaignAnalytics;
