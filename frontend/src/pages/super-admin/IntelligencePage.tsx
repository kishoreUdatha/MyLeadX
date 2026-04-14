import { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  LightBulbIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface TenantHealth {
  organizationId: string;
  organizationName: string;
  healthScore: number;
  riskLevel: string;
  factors: {
    activityScore: number;
    usageScore: number;
    paymentScore: number;
    growthScore: number;
  };
  recommendations: string[];
}

export default function IntelligencePage() {
  const [healthScores, setHealthScores] = useState<TenantHealth[]>([]);
  const [atRiskTenants, setAtRiskTenants] = useState<any[]>([]);
  const [featureAdoption, setFeatureAdoption] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [healthRes, atRiskRes, adoptionRes, recsRes] = await Promise.all([
        api.get('/super-admin/intelligence/health-scores'),
        api.get('/super-admin/intelligence/at-risk?limit=10'),
        api.get('/super-admin/intelligence/feature-adoption'),
        api.get('/super-admin/intelligence/recommendations'),
      ]);

      setHealthScores(healthRes.data.data || []);
      setAtRiskTenants(atRiskRes.data.data || []);
      setFeatureAdoption(adoptionRes.data.data || []);
      setRecommendations(recsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch intelligence data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-amber-100 text-amber-700';
      case 'high': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
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
        <h1 className="text-2xl font-bold text-slate-900">Tenant Intelligence</h1>
        <p className="text-slate-500">Health scores, churn prediction, and insights</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Avg Health Score</p>
              <p className="text-2xl font-bold text-slate-900">
                {healthScores.length > 0
                  ? Math.round(healthScores.reduce((acc, t) => acc + t.healthScore, 0) / healthScores.length)
                  : 0}%
              </p>
            </div>
            <ChartBarIcon className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">At-Risk Tenants</p>
              <p className="text-2xl font-bold text-red-600">{atRiskTenants.length}</p>
            </div>
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Healthy Tenants</p>
              <p className="text-2xl font-bold text-green-600">
                {healthScores.filter(t => t.riskLevel === 'low').length}
              </p>
            </div>
            <ArrowTrendingUpIcon className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Recommendations</p>
              <p className="text-2xl font-bold text-slate-900">{recommendations.length}</p>
            </div>
            <LightBulbIcon className="w-8 h-8 text-amber-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* At-Risk Tenants */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900">At-Risk Tenants</h2>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {atRiskTenants.length === 0 ? (
              <p className="text-slate-500 text-sm">No at-risk tenants</p>
            ) : (
              atRiskTenants.map((tenant, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="font-medium text-slate-900">{tenant.organizationName}</p>
                    <p className="text-sm text-slate-500">
                      Churn Risk: {Math.round(tenant.churnRisk * 100)}%
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getHealthColor(tenant.healthScore)}`}>
                      {tenant.healthScore}%
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getRiskBadgeColor(tenant.riskLevel)}`}>
                      {tenant.riskLevel} risk
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feature Adoption */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Feature Adoption</h2>
          <div className="space-y-4">
            {featureAdoption.length === 0 ? (
              <p className="text-slate-500 text-sm">No data available</p>
            ) : (
              featureAdoption.map((feature, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700">{feature.feature}</span>
                    <span className="text-slate-500">{feature.adoptionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div
                      className="bg-purple-600 rounded-full h-2"
                      style={{ width: `${feature.adoptionRate}%` }}
                    ></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4">
          <LightBulbIcon className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-slate-900">Growth Recommendations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.length === 0 ? (
            <p className="text-slate-500 text-sm">No recommendations</p>
          ) : (
            recommendations.map((rec, idx) => (
              <div key={idx} className="p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="font-medium text-slate-900 mb-1">{rec.title}</p>
                <p className="text-sm text-slate-600">{rec.description}</p>
                <p className="text-xs text-amber-600 mt-2">Impact: {rec.impact}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* All Tenant Health Scores */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">All Tenant Health Scores</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Organization</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Health Score</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Activity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Usage</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Payment</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {healthScores.slice(0, 20).map((tenant, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-sm font-medium text-slate-900">{tenant.organizationName}</td>
                  <td className="py-3 px-4">
                    <span className={`text-sm font-bold ${getHealthColor(tenant.healthScore)}`}>
                      {tenant.healthScore}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">{tenant.factors.activityScore}%</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{tenant.factors.usageScore}%</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{tenant.factors.paymentScore}%</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${getRiskBadgeColor(tenant.riskLevel)}`}>
                      {tenant.riskLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
