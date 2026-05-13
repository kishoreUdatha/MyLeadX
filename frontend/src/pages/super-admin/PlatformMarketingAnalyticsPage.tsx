import { useState, useEffect, useCallback } from 'react';
import {
  platformAnalyticsService,
  ChannelMetric,
  FunnelStep,
  SalesRepMetric,
} from '../../services/platform-analytics.service';
import {
  PROSPECT_SOURCE_LABELS,
  PROSPECT_STAGE_LABELS,
} from '../../services/platform-prospect.service';

type Preset = '7d' | '30d' | '90d' | 'all';

function presetToRange(preset: Preset): { fromDate?: string; toDate?: string } {
  if (preset === 'all') return {};
  const days = preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date();
  from.setDate(from.getDate() - days);
  return { fromDate: from.toISOString() };
}

function formatINR(n: number | null): string {
  if (n === null || n === undefined) return '—';
  if (n === 0) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

function formatRoi(roi: number | null): string {
  if (roi === null) return '—';
  return `${(roi * 100).toFixed(0)}%`;
}

export default function PlatformMarketingAnalyticsPage() {
  const [preset, setPreset] = useState<Preset>('30d');
  const [channels, setChannels] = useState<ChannelMetric[]>([]);
  const [funnel, setFunnel] = useState<FunnelStep[]>([]);
  const [reps, setReps] = useState<SalesRepMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const range = presetToRange(preset);
      const [ch, fn, rep] = await Promise.all([
        platformAnalyticsService.channelBreakdown(range),
        platformAnalyticsService.conversionFunnel(undefined, range),
        platformAnalyticsService.salesRepLeaderboard(range),
      ]);
      setChannels(ch);
      setFunnel(fn);
      setReps(rep);
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  }, [preset]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const totals = channels.reduce(
    (acc, c) => ({
      prospects: acc.prospects + c.prospects,
      paid: acc.paid + c.paid,
      spend: acc.spend + c.spend,
      revenue: acc.revenue + c.totalRevenue,
    }),
    { prospects: 0, paid: 0, spend: 0, revenue: 0 },
  );
  const overallRoi = totals.spend > 0 ? (totals.revenue - totals.spend) / totals.spend : null;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketing Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            ROI by channel, conversion funnel, and sales rep performance
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', '90d', 'all'] as Preset[]).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                preset === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p === 'all' ? 'All time' : `Last ${p}`}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Prospects" value={totals.prospects.toString()} />
        <KpiCard label="Paid Conversions" value={totals.paid.toString()} />
        <KpiCard label="Total Spend" value={formatINR(totals.spend)} />
        <KpiCard
          label="Overall ROI"
          value={formatRoi(overallRoi)}
          tone={overallRoi !== null && overallRoi >= 1 ? 'good' : overallRoi !== null && overallRoi < 0 ? 'bad' : 'neutral'}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Channel Breakdown</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Spend is sourced from AdCampaign records; add manual entries to fill gaps
              </p>
            </div>
            {channels.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-12">
                No prospect data in this date range yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Channel</th>
                      <th className="px-4 py-3 text-right">Prospects</th>
                      <th className="px-4 py-3 text-right">MQL+</th>
                      <th className="px-4 py-3 text-right">Demos</th>
                      <th className="px-4 py-3 text-right">Trials</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Spend</th>
                      <th className="px-4 py-3 text-right">CPL</th>
                      <th className="px-4 py-3 text-right">CAC</th>
                      <th className="px-4 py-3 text-right">LTV</th>
                      <th className="px-4 py-3 text-right">Conv %</th>
                      <th className="px-4 py-3 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {channels.map((c) => (
                      <tr key={c.source} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {PROSPECT_SOURCE_LABELS[c.source]}
                        </td>
                        <td className="px-4 py-3 text-right">{c.prospects}</td>
                        <td className="px-4 py-3 text-right">{c.mqlPlus}</td>
                        <td className="px-4 py-3 text-right">{c.demos}</td>
                        <td className="px-4 py-3 text-right">{c.trials}</td>
                        <td className="px-4 py-3 text-right font-medium">{c.paid}</td>
                        <td className="px-4 py-3 text-right">{formatINR(c.spend)}</td>
                        <td className="px-4 py-3 text-right">{formatINR(c.cpl)}</td>
                        <td className="px-4 py-3 text-right">{formatINR(c.cac)}</td>
                        <td className="px-4 py-3 text-right">{formatINR(c.ltv)}</td>
                        <td className="px-4 py-3 text-right">{formatPct(c.conversionRate)}</td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          c.roi !== null && c.roi >= 1 ? 'text-green-600' : c.roi !== null && c.roi < 0 ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {formatRoi(c.roi)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Conversion Funnel</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Shows how prospects flow through stages
                </p>
              </div>
              <div className="p-6 space-y-3">
                {funnel.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No data</p>
                ) : (
                  funnel.map((step) => (
                    <div key={step.stage}>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {PROSPECT_STAGE_LABELS[step.stage]}
                        </span>
                        <span className="text-sm text-gray-600">
                          {step.count}
                          <span className="text-gray-400 ml-1">({formatPct(step.pctOfTop)})</span>
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-cyan-500 h-2 rounded-full"
                          style={{ width: `${step.pctOfTop * 100}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Sales Rep Leaderboard</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sorted by paid conversions
                </p>
              </div>
              {reps.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-12">
                  No assigned prospects in this range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Rep</th>
                        <th className="px-4 py-3 text-right">Prospects</th>
                        <th className="px-4 py-3 text-right">Calls</th>
                        <th className="px-4 py-3 text-right">Demos</th>
                        <th className="px-4 py-3 text-right">Trials</th>
                        <th className="px-4 py-3 text-right">Paid</th>
                        <th className="px-4 py-3 text-right">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {reps.map((r) => (
                        <tr key={r.userId} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {r.firstName} {r.lastName}
                            </div>
                            <div className="text-xs text-gray-500">{r.email}</div>
                          </td>
                          <td className="px-4 py-3 text-right">{r.prospectsAssigned}</td>
                          <td className="px-4 py-3 text-right">{r.callsMade}</td>
                          <td className="px-4 py-3 text-right">{r.demosScheduled}</td>
                          <td className="px-4 py-3 text-right">{r.trialsStarted}</td>
                          <td className="px-4 py-3 text-right font-medium">{r.paidConversions}</td>
                          <td className="px-4 py-3 text-right">{formatINR(r.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'good' | 'bad' | 'neutral';
}) {
  const toneClasses =
    tone === 'good'
      ? 'border-green-200 bg-green-50'
      : tone === 'bad'
        ? 'border-red-200 bg-red-50'
        : 'border-gray-200 bg-white';
  return (
    <div className={`rounded-lg shadow-sm border p-4 ${toneClasses}`}>
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
