import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  CogIcon,
  PhoneIcon,
  ClockIcon,
  UserGroupIcon,
  BoltIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AutoAssignConfig {
  enableAICalling: boolean;
  aiAgentId?: string;
  assignToCounselorId?: string;
  callDelayMinutes: number;
  workingHoursOnly: boolean;
  workingHoursStart: number;
  workingHoursEnd: number;
  sourceTypes: string[];
}

interface Agent {
  id: string;
  name: string;
  industry: string;
}

interface Counselor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const allSourceTypes = [
  { value: 'AD_FACEBOOK', label: 'Facebook Ads' },
  { value: 'AD_INSTAGRAM', label: 'Instagram Ads' },
  { value: 'AD_LINKEDIN', label: 'LinkedIn Ads' },
  { value: 'AD_GOOGLE', label: 'Google Ads' },
  { value: 'FORM', label: 'Form Submissions' },
  { value: 'LANDING_PAGE', label: 'Landing Pages' },
  { value: 'CHATBOT', label: 'Chatbot' },
];

export default function AutoAssignSettingsPage() {
  const [config, setConfig] = useState<AutoAssignConfig | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [counselors, setCounselors] = useState<Counselor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [configRes, statsRes] = await Promise.all([
        api.get('/auto-assign/config'),
        api.get('/auto-assign/stats'),
      ]);
      setConfig(configRes.data.data.config);
      setAgents(configRes.data.data.availableAgents || []);
      setCounselors(configRes.data.data.availableCounselors || []);
      setStats(statsRes.data.data);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      await api.put('/auto-assign/config', config);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSourceType = (source: string) => {
    if (!config) return;
    const newSources = config.sourceTypes.includes(source)
      ? config.sourceTypes.filter((s) => s !== source)
      : [...config.sourceTypes, source];
    setConfig({ ...config, sourceTypes: newSources });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  if (!config) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Auto-Assign Settings</h1>
          <p className="text-slate-500 mt-1">
            Configure automatic lead assignment to AI agents
          </p>
        </div>
        <button onClick={handleSave} disabled={isSaving} className="btn btn-primary">
          {isSaving ? <span className="spinner"></span> : <CheckCircleIcon className="h-4 w-4" />}
          Save Settings
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-100">
                <UserGroupIcon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.totalLeadsToday}</p>
                <p className="text-xs text-slate-500">Social Leads Today</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success-100">
                <BoltIcon className="w-5 h-5 text-success-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.autoAssignedToday}</p>
                <p className="text-xs text-slate-500">Auto-Assigned</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning-100">
                <PhoneIcon className="w-5 h-5 text-warning-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.aiCallsToday}</p>
                <p className="text-xs text-slate-500">AI Calls Today</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100">
                <ClockIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.scheduledCallsToday}</p>
                <p className="text-xs text-slate-500">Scheduled Calls</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <CogIcon className="w-5 h-5 inline mr-2" />
              AI Calling Settings
            </h3>
          </div>
          <div className="card-body space-y-6">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Enable AI Calling</p>
                <p className="text-sm text-slate-500">
                  Automatically call new leads using AI agent
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, enableAICalling: !config.enableAICalling })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.enableAICalling ? 'bg-primary-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.enableAICalling ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* AI Agent Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                AI Agent for Calling
              </label>
              <select
                value={config.aiAgentId || ''}
                onChange={(e) => setConfig({ ...config, aiAgentId: e.target.value || undefined })}
                className="input w-full"
                disabled={!config.enableAICalling}
              >
                <option value="">Select AI Agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.industry})
                  </option>
                ))}
              </select>
              {agents.length === 0 && (
                <p className="text-sm text-warning-600 mt-1">
                  No AI agents found. Create one in Voice AI section.
                </p>
              )}
            </div>

            {/* Call Delay */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Call Delay (minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={config.callDelayMinutes}
                onChange={(e) =>
                  setConfig({ ...config, callDelayMinutes: parseInt(e.target.value) || 0 })
                }
                className="input w-full"
                disabled={!config.enableAICalling}
              />
              <p className="text-xs text-slate-500 mt-1">
                Wait this many minutes after lead creation before calling
              </p>
            </div>

            {/* Fallback Counselor */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fallback Counselor (if AI unavailable)
              </label>
              <select
                value={config.assignToCounselorId || ''}
                onChange={(e) =>
                  setConfig({ ...config, assignToCounselorId: e.target.value || undefined })
                }
                className="input w-full"
              >
                <option value="">No fallback (skip assignment)</option>
                {counselors.map((counselor) => (
                  <option key={counselor.id} value={counselor.id}>
                    {counselor.firstName} {counselor.lastName} ({counselor.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">
              <ClockIcon className="w-5 h-5 inline mr-2" />
              Working Hours
            </h3>
          </div>
          <div className="card-body space-y-6">
            {/* Working Hours Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Working Hours Only</p>
                <p className="text-sm text-slate-500">
                  Only make calls during business hours
                </p>
              </div>
              <button
                onClick={() => setConfig({ ...config, workingHoursOnly: !config.workingHoursOnly })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.workingHoursOnly ? 'bg-primary-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.workingHoursOnly ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Hours Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Start Hour
                </label>
                <select
                  value={config.workingHoursStart}
                  onChange={(e) =>
                    setConfig({ ...config, workingHoursStart: parseInt(e.target.value) })
                  }
                  className="input w-full"
                  disabled={!config.workingHoursOnly}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  End Hour
                </label>
                <select
                  value={config.workingHoursEnd}
                  onChange={(e) =>
                    setConfig({ ...config, workingHoursEnd: parseInt(e.target.value) })
                  }
                  className="input w-full"
                  disabled={!config.workingHoursOnly}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i.toString().padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {config.workingHoursOnly && (
              <div className="bg-slate-50 rounded-lg p-4">
                <p className="text-sm text-slate-600">
                  Calls will be made between{' '}
                  <span className="font-semibold">
                    {config.workingHoursStart.toString().padStart(2, '0')}:00
                  </span>{' '}
                  and{' '}
                  <span className="font-semibold">
                    {config.workingHoursEnd.toString().padStart(2, '0')}:00
                  </span>
                  . Leads outside these hours will be scheduled for the next day.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Source Types */}
        <div className="card lg:col-span-2">
          <div className="card-header">
            <h3 className="card-title">Lead Sources to Auto-Assign</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {allSourceTypes.map((source) => {
                const isSelected = config.sourceTypes.includes(source.value);
                return (
                  <button
                    key={source.value}
                    onClick={() => toggleSourceType(source.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-sm font-medium ${
                          isSelected ? 'text-primary-700' : 'text-slate-700'
                        }`}
                      >
                        {source.label}
                      </span>
                      {isSelected ? (
                        <CheckCircleIcon className="w-5 h-5 text-primary-500" />
                      ) : (
                        <XCircleIcon className="w-5 h-5 text-slate-300" />
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {isSelected ? 'Will be auto-assigned' : 'Manual assignment only'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
