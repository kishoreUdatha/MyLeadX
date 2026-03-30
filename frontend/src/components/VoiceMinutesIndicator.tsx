import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ChevronDown, Zap, AlertTriangle } from 'lucide-react';
import api from '../services/api';

interface UsageData {
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
}

export const VoiceMinutesIndicator: React.FC = () => {
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    fetchUsage();
    // Refresh every 5 minutes
    const interval = setInterval(fetchUsage, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await api.get('/voice-minutes/usage');
      setUsage(response.data.data);
    } catch (error) {
      console.error('Failed to fetch voice minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !usage) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 animate-pulse">
        <div className="w-4 h-4 bg-slate-200 rounded"></div>
        <div className="w-12 h-3 bg-slate-200 rounded"></div>
      </div>
    );
  }

  const usagePercentage = usage.limit > 0 ? (usage.used / usage.limit) * 100 : 0;
  const isLow = usagePercentage >= 80;
  const isExhausted = usagePercentage >= 100;

  const getStatusColor = () => {
    if (isExhausted) return 'text-red-600 bg-red-50 border-red-200';
    if (isLow) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  const getProgressColor = () => {
    if (isExhausted) return 'bg-red-500';
    if (isLow) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all ${getStatusColor()} hover:shadow-sm`}
      >
        {isExhausted ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Clock className="w-4 h-4" />
        )}
        <span className="text-xs font-medium">
          {usage.remaining.toFixed(0)} min
        </span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-slate-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">Voice Minutes</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  isExhausted ? 'bg-red-100 text-red-700' :
                  isLow ? 'bg-amber-100 text-amber-700' :
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {isExhausted ? 'Exhausted' : isLow ? 'Running Low' : 'Active'}
                </span>
              </div>
            </div>

            {/* Usage Stats */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-600">Used this month</span>
                <span className="text-sm font-semibold text-slate-900">
                  {usage.used.toFixed(1)} / {usage.limit} min
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor()}`}
                  style={{ width: `${Math.min(100, usagePercentage)}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{usagePercentage.toFixed(0)}% used</span>
                <span>Resets {new Date(usage.resetDate).toLocaleDateString()}</span>
              </div>

              {/* Warning Message */}
              {isLow && (
                <div className={`mt-3 p-2.5 rounded-lg ${
                  isExhausted ? 'bg-red-50 border border-red-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                  <p className={`text-xs ${isExhausted ? 'text-red-700' : 'text-amber-700'}`}>
                    {isExhausted
                      ? 'Voice minutes exhausted. Upgrade to continue making AI calls.'
                      : 'Voice minutes running low. Consider upgrading your plan.'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-slate-50 border-t flex gap-2">
              <button
                onClick={() => {
                  navigate('/settings/voice-minutes');
                  setShowDropdown(false);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                View Details
              </button>
              <button
                onClick={() => {
                  navigate('/subscription');
                  setShowDropdown(false);
                }}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-1"
              >
                <Zap className="w-3 h-3" />
                Upgrade
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VoiceMinutesIndicator;
