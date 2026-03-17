/**
 * Conversion Funnel Page
 * Track lead progression through sales pipeline
 */

import React from 'react';
import { useConversionFunnel } from './hooks';
import {
  ConversionFunnelLoadingSkeleton,
  ConversionFunnelHeader,
  ConversionFunnelSummaryCards,
  ConversionFunnelInsights,
  FunnelVisual,
  FunnelTable,
  StageComparisonChart,
} from './components';

const ConversionFunnelPage: React.FC = () => {
  const {
    funnelData,
    loading,
    funnelName,
    dateRange,
    viewMode,
    insights,
    setFunnelName,
    setDateRange,
    setViewMode,
    fetchFunnelData,
  } = useConversionFunnel();

  // Show skeleton on initial load
  if (loading && !funnelData) {
    return <ConversionFunnelLoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-slate-100">
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 py-8">
        <ConversionFunnelHeader
          funnelName={funnelName}
          dateRange={dateRange}
          viewMode={viewMode}
          loading={loading}
          onFunnelChange={setFunnelName}
          onDateRangeChange={setDateRange}
          onViewModeChange={setViewMode}
          onRefresh={fetchFunnelData}
        />

        <ConversionFunnelSummaryCards data={funnelData} />

        <ConversionFunnelInsights insights={insights} />

        {/* Main Content */}
        {viewMode === 'visual' ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Funnel Visualization</h2>
                <p className="text-sm text-gray-500 mt-1">Visual representation of lead progression</p>
              </div>
            </div>
            <FunnelVisual stages={funnelData?.stages || []} />
          </div>
        ) : (
          <FunnelTable stages={funnelData?.stages || []} />
        )}

        <StageComparisonChart stages={funnelData?.stages || []} />
      </div>
    </div>
  );
};

export default ConversionFunnelPage;
