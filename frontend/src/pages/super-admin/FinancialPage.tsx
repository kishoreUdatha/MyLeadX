import { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function FinancialPage() {
  const [mrr, setMrr] = useState<{ mrr: number; byPlan: any[] } | null>(null);
  const [pricing, setPricing] = useState<any[]>([]);
  const [failedPayments, setFailedPayments] = useState<any[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [mrrRes, pricingRes, failedRes, forecastRes] = await Promise.all([
        api.get('/super-admin/financial/mrr'),
        api.get('/super-admin/financial/pricing'),
        api.get('/super-admin/financial/failed-payments'),
        api.get('/super-admin/financial/forecast'),
      ]);

      setMrr(mrrRes.data.data);
      setPricing(pricingRes.data.data || []);
      setFailedPayments(failedRes.data.data || []);
      setForecast(forecastRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Management</h1>
        <p className="text-slate-500">Revenue, pricing, and payment analytics</p>
      </div>

      {/* MRR Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Monthly Recurring Revenue</p>
              <p className="text-3xl font-bold">{formatCurrency(mrr?.mrr || 0)}</p>
            </div>
            <CurrencyDollarIcon className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        {mrr?.byPlan?.slice(0, 3).map((plan, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <p className="text-slate-500 text-sm capitalize">{plan.plan} Plan</p>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(plan.mrr)}</p>
            <p className="text-sm text-slate-500">{plan.count} customers</p>
          </div>
        ))}
      </div>

      {/* Revenue Forecast */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="w-5 h-5 text-green-500" />
          <h2 className="text-lg font-semibold text-slate-900">Revenue Forecast</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {forecast.map((month, idx) => (
            <div key={idx} className="text-center p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-500">{month.month}</p>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(month.predictedMRR)}</p>
              <p className="text-xs text-green-600">+{formatCurrency(month.predictedNewRevenue)}</p>
              <p className="text-xs text-red-600">-{formatCurrency(month.predictedChurn)}</p>
              <div className="mt-2">
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                  {month.confidence}% confidence
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Failed Payments */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">Failed Payment Alerts</h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {failedPayments.length === 0 ? (
              <p className="text-slate-500 text-sm">No failed payments</p>
            ) : (
              failedPayments.map((payment, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-slate-900">{payment.organizationName}</p>
                    <p className="text-sm text-slate-500">{payment.email}</p>
                    <p className="text-xs text-red-600">{payment.failureReason}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600">{formatCurrency(payment.amount)}</p>
                    <p className="text-xs text-slate-500">Retries: {payment.retryCount}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Custom Pricing */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-slate-900">Custom Pricing</h2>
          </div>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {pricing.filter(p => p.customDiscount > 0).length === 0 ? (
              <p className="text-slate-500 text-sm">No custom pricing configured</p>
            ) : (
              pricing.filter(p => p.customDiscount > 0).map((org, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium text-slate-900">{org.organizationName}</p>
                    <p className="text-sm text-slate-500">Base: {formatCurrency(org.basePlanPrice)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(org.effectivePrice)}</p>
                    <p className="text-xs text-amber-600">
                      {org.discountType === 'percentage' ? `${org.customDiscount}% off` : `${formatCurrency(org.customDiscount)} off`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* All Pricing Table */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Tenant Pricing</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Organization</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Plan</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Base Price</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Discount</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Effective Price</th>
              </tr>
            </thead>
            <tbody>
              {pricing.slice(0, 20).map((org, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{org.organizationName}</td>
                  <td className="py-3 px-4 text-sm text-slate-600 capitalize">{org.basePlanId}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{formatCurrency(org.basePlanPrice)}</td>
                  <td className="py-3 px-4 text-sm">
                    {org.customDiscount > 0 ? (
                      <span className="text-green-600">
                        {org.discountType === 'percentage' ? `${org.customDiscount}%` : formatCurrency(org.customDiscount)}
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{formatCurrency(org.effectivePrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
