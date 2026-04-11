import { useState, useEffect } from 'react';
import {
  FlagIcon,
  CheckCircleIcon,
  XCircleIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  isEnabled: boolean;
  rolloutPercentage: number;
  defaultValue: boolean;
}

export default function FeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [stats, setStats] = useState<any[]>([]);
  const [overrides, setOverrides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [flagsRes, statsRes] = await Promise.all([
        api.get('/super-admin/feature-flags'),
        api.get('/super-admin/feature-flags/stats'),
      ]);

      setFlags(flagsRes.data.data || []);
      setStats(statsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch feature flags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFlag = async (key: string, isEnabled: boolean) => {
    setUpdating(key);
    try {
      await api.patch(`/super-admin/feature-flags/${key}`, { isEnabled: !isEnabled });
      setFlags(flags.map(f => f.key === key ? { ...f, isEnabled: !isEnabled } : f));
    } catch (error) {
      console.error('Failed to update flag:', error);
    } finally {
      setUpdating(null);
    }
  };

  const handleRolloutChange = async (key: string, percentage: number) => {
    setUpdating(key);
    try {
      await api.patch(`/super-admin/feature-flags/${key}`, { rolloutPercentage: percentage });
      setFlags(flags.map(f => f.key === key ? { ...f, rolloutPercentage: percentage } : f));
    } catch (error) {
      console.error('Failed to update rollout:', error);
    } finally {
      setUpdating(null);
    }
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
        <h1 className="text-2xl font-bold text-slate-900">Feature Flags</h1>
        <p className="text-slate-500">Control feature availability per tenant</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <FlagIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">Total Flags</p>
              <p className="text-2xl font-bold text-slate-900">{flags.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">Enabled</p>
              <p className="text-2xl font-bold text-green-600">{flags.filter(f => f.isEnabled).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <XCircleIcon className="w-8 h-8 text-red-500" />
            <div>
              <p className="text-sm text-slate-500">Disabled</p>
              <p className="text-2xl font-bold text-red-600">{flags.filter(f => !f.isEnabled).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <AdjustmentsHorizontalIcon className="w-8 h-8 text-amber-500" />
            <div>
              <p className="text-sm text-slate-500">Gradual Rollout</p>
              <p className="text-2xl font-bold text-amber-600">
                {flags.filter(f => f.rolloutPercentage < 100 && f.rolloutPercentage > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Flags List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Feature Flags</h2>
        </div>
        <div className="divide-y divide-slate-200">
          {flags.map((flag) => {
            const stat = stats.find(s => s.featureKey === flag.key);
            return (
              <div key={flag.key} className="p-6 hover:bg-slate-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-slate-900">{flag.name}</h3>
                      <code className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{flag.key}</code>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">{flag.description}</p>

                    {/* Stats */}
                    {stat && (
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-green-600">{stat.enabledCount} enabled</span>
                        <span className="text-red-600">{stat.disabledCount} disabled</span>
                        <span className="text-amber-600">{stat.customOverrides} overrides</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Rollout Percentage */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Rollout:</span>
                      <select
                        value={flag.rolloutPercentage}
                        onChange={(e) => handleRolloutChange(flag.key, parseInt(e.target.value))}
                        disabled={updating === flag.key}
                        className="text-sm border border-slate-200 rounded-lg px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                      >
                        <option value={0}>0%</option>
                        <option value={10}>10%</option>
                        <option value={25}>25%</option>
                        <option value={50}>50%</option>
                        <option value={75}>75%</option>
                        <option value={100}>100%</option>
                      </select>
                    </div>

                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleFlag(flag.key, flag.isEnabled)}
                      disabled={updating === flag.key}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        flag.isEnabled ? 'bg-green-500' : 'bg-slate-300'
                      } ${updating === flag.key ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          flag.isEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
