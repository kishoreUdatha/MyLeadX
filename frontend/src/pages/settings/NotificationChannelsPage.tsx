import React, { useState, useEffect } from 'react';
import {
  Bell,
  Plus,
  Trash2,
  X,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  Globe,
  ExternalLink,
  Power,
  Activity,
  Clock,
  ChevronRight,
  Shield,
  Zap,
  ArrowRight,
  Settings2,
  Link2,
  Check,
} from 'lucide-react';
import api from '../../services/api';

interface NotificationChannel {
  id: string;
  name: string;
  type: 'SLACK' | 'TEAMS' | 'DISCORD' | 'CUSTOM_WEBHOOK';
  webhookUrl: string;
  events: string[];
  isActive: boolean;
  includeDetails: boolean;
  successCount: number;
  failureCount: number;
  lastTriggeredAt: string | null;
  lastError: string | null;
}

const NOTIFICATION_EVENTS = [
  { id: 'lead.created', label: 'New Lead Created', description: 'When a new lead is added to the system', icon: '👤' },
  { id: 'lead.updated', label: 'Lead Updated', description: 'When lead information is modified', icon: '✏️' },
  { id: 'call.completed', label: 'Call Completed', description: 'When a voice call ends', icon: '📞' },
  { id: 'appointment.booked', label: 'Appointment Booked', description: 'When an appointment is scheduled', icon: '📅' },
  { id: 'voice.session.ended', label: 'AI Voice Session', description: 'When AI voice session completes', icon: '🤖' },
  { id: 'call.negative_sentiment', label: 'Negative Sentiment Alert', description: 'Alert for negative call sentiment', icon: '⚠️' },
];

const CHANNEL_CONFIGS = {
  SLACK: {
    name: 'Slack',
    logo: 'https://cdn.worldvectorlogo.com/logos/slack-new-logo.svg',
    color: '#4A154B',
    bgGradient: 'from-[#4A154B] to-[#611f69]',
    lightBg: 'bg-purple-50',
    lightText: 'text-purple-700',
    placeholder: 'https://hooks.slack.com/services/YOUR_WORKSPACE/YOUR_CHANNEL/YOUR_TOKEN',
    instructions: [
      'Go to your Slack workspace settings',
      'Navigate to Apps → Incoming Webhooks',
      'Click "Add New Webhook to Workspace"',
      'Select the channel and copy the webhook URL'
    ]
  },
  TEAMS: {
    name: 'Microsoft Teams',
    logo: 'https://cdn.worldvectorlogo.com/logos/microsoft-teams-1.svg',
    color: '#5059C9',
    bgGradient: 'from-[#5059C9] to-[#7B83EB]',
    lightBg: 'bg-blue-50',
    lightText: 'text-blue-700',
    placeholder: 'https://outlook.office.com/webhook/...',
    instructions: [
      'Open your Teams channel',
      'Click ••• → Connectors',
      'Find "Incoming Webhook" and click Configure',
      'Name it and copy the webhook URL'
    ]
  },
  DISCORD: {
    name: 'Discord',
    logo: 'https://cdn.worldvectorlogo.com/logos/discord-6.svg',
    color: '#5865F2',
    bgGradient: 'from-[#5865F2] to-[#7289DA]',
    lightBg: 'bg-indigo-50',
    lightText: 'text-indigo-700',
    placeholder: 'https://discord.com/api/webhooks/...',
    instructions: [
      'Open Discord Server Settings',
      'Go to Integrations → Webhooks',
      'Click "New Webhook"',
      'Name it and copy the webhook URL'
    ]
  },
  CUSTOM_WEBHOOK: {
    name: 'Custom Webhook',
    logo: null,
    color: '#374151',
    bgGradient: 'from-gray-600 to-gray-700',
    lightBg: 'bg-gray-50',
    lightText: 'text-gray-700',
    placeholder: 'https://your-api.com/webhooks/notifications',
    instructions: [
      'Set up an endpoint to receive POST requests',
      'The payload will include event type and data',
      'Ensure your endpoint returns 200 OK',
      'Use HTTPS for secure communication'
    ]
  }
};

const NotificationChannelsPage: React.FC = () => {
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<'select' | 'configure'>('select');
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'SLACK' as keyof typeof CHANNEL_CONFIGS,
    webhookUrl: '',
    events: ['lead.created', 'call.completed'] as string[],
  });

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notification-channels');
      const data = response.data?.data || response.data || [];
      setChannels(Array.isArray(data) ? data : []);
    } catch (err) {
      setChannels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.webhookUrl) {
      setToast({ type: 'error', message: 'Please fill in all required fields' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/notification-channels', formData);
      setToast({ type: 'success', message: 'Channel created successfully' });
      closeModal();
      fetchChannels();
    } catch (err: any) {
      setToast({ type: 'error', message: err.response?.data?.message || 'Failed to create channel' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this notification channel?')) return;
    try {
      await api.delete(`/notification-channels/${id}`);
      setToast({ type: 'success', message: 'Channel deleted' });
      fetchChannels();
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to delete channel' });
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/notification-channels/${id}`, { isActive: !isActive });
      fetchChannels();
      setToast({ type: 'success', message: isActive ? 'Channel paused' : 'Channel activated' });
    } catch (err: any) {
      setToast({ type: 'error', message: 'Failed to update channel' });
    }
  };

  const handleTest = async (id: string) => {
    try {
      setTestingChannel(id);
      await api.post(`/notification-channels/${id}/test`);
      setToast({ type: 'success', message: 'Test notification sent!' });
    } catch (err: any) {
      setToast({ type: 'error', message: 'Test failed - check webhook URL' });
    } finally {
      setTestingChannel(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setModalStep('select');
    setFormData({
      name: '',
      type: 'SLACK',
      webhookUrl: '',
      events: ['lead.created', 'call.completed'],
    });
  };

  const selectPlatform = (type: keyof typeof CHANNEL_CONFIGS) => {
    setFormData({ ...formData, type });
    setModalStep('configure');
  };

  const toggleEvent = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter(e => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  const config = CHANNEL_CONFIGS[formData.type];

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-2">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
          } text-white`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 p-1 hover:bg-white/20 rounded">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/20">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900">Notification Channels</h1>
              </div>
              <p className="text-gray-500 ml-[52px]">
                Receive instant alerts when important events happen in your CRM
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm"
            >
              <Plus size={18} />
              Add Channel
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        {channels.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Activity className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {channels.reduce((acc, c) => acc + (c.successCount || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Notifications Sent</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {channels.filter(c => c.isActive).length}
                  </p>
                  <p className="text-sm text-gray-500">Active Channels</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-100 rounded-lg">
                  <Shield className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {channels.reduce((acc, c) => acc + (c.events?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500">Event Subscriptions</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading && channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
          </div>
        ) : channels.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Bell className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">No notification channels</h2>
              <p className="text-gray-500 max-w-sm mx-auto mb-8">
                Connect Slack, Teams, or Discord to get instant alerts for leads, calls, and appointments.
              </p>

              <div className="flex justify-center gap-4 mb-8">
                {(['SLACK', 'TEAMS', 'DISCORD'] as const).map(type => {
                  const cfg = CHANNEL_CONFIGS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => { setFormData(f => ({ ...f, type })); setShowModal(true); setModalStep('configure'); }}
                      className="group flex flex-col items-center p-6 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all w-36"
                    >
                      <img src={cfg.logo!} alt={cfg.name} className="w-10 h-10 mb-3 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-medium text-gray-700">{cfg.name}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
              >
                <Globe size={16} />
                Or use a custom webhook
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        ) : (
          /* Channels List */
          <div className="space-y-3">
            {channels.map(channel => {
              const cfg = CHANNEL_CONFIGS[channel.type as keyof typeof CHANNEL_CONFIGS];
              return (
                <div
                  key={channel.id}
                  className={`bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:shadow-md ${
                    !channel.isActive ? 'opacity-70' : ''
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Platform Icon */}
                        <div
                          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center shadow-sm`}
                        >
                          {cfg.logo ? (
                            <img src={cfg.logo} alt={cfg.name} className="w-6 h-6" />
                          ) : (
                            <Globe className="w-6 h-6 text-white" />
                          )}
                        </div>

                        {/* Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{channel.name}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                              channel.isActive
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {channel.isActive ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{cfg.name}</p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleTest(channel.id)}
                          disabled={testingChannel === channel.id || !channel.isActive}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                        >
                          {testingChannel === channel.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Send size={14} />
                          )}
                          Test
                        </button>
                        <button
                          onClick={() => handleToggle(channel.id, channel.isActive)}
                          className={`p-2 rounded-lg transition ${
                            channel.isActive
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={channel.isActive ? 'Pause' : 'Activate'}
                        >
                          <Power size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(channel.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Events */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {channel.events?.map(eventId => {
                        const event = NOTIFICATION_EVENTS.find(e => e.id === eventId);
                        return event ? (
                          <span
                            key={eventId}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${cfg.lightBg} ${cfg.lightText} text-xs font-medium rounded-lg`}
                          >
                            <span>{event.icon}</span>
                            {event.label}
                          </span>
                        ) : null;
                      })}
                    </div>

                    {/* Stats */}
                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-500" />
                        <span>{channel.successCount || 0} sent</span>
                      </div>
                      {(channel.failureCount || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <AlertCircle size={14} className="text-red-500" />
                          <span>{channel.failureCount} failed</span>
                        </div>
                      )}
                      {channel.lastTriggeredAt && (
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} />
                          <span>Last: {new Date(channel.lastTriggeredAt).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {modalStep === 'select' ? (
              /* Step 1: Select Platform */
              <>
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Add Notification Channel</h2>
                    <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg transition">
                      <X size={20} className="text-gray-500" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Choose where you want to receive notifications</p>
                </div>

                <div className="p-6 grid grid-cols-2 gap-3">
                  {(Object.keys(CHANNEL_CONFIGS) as Array<keyof typeof CHANNEL_CONFIGS>).map(type => {
                    const cfg = CHANNEL_CONFIGS[type];
                    return (
                      <button
                        key={type}
                        onClick={() => selectPlatform(type)}
                        className="group flex items-center gap-3 p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-left"
                      >
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center`}>
                          {cfg.logo ? (
                            <img src={cfg.logo} alt={cfg.name} className="w-5 h-5" />
                          ) : (
                            <Globe className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{cfg.name}</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-gray-600 transition" />
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              /* Step 2: Configure */
              <>
                <div className={`p-6 bg-gradient-to-r ${config.bgGradient}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                        {config.logo ? (
                          <img src={config.logo} alt={config.name} className="w-5 h-5" />
                        ) : (
                          <Globe className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white">Connect {config.name}</h2>
                        <p className="text-sm text-white/70">Configure your webhook settings</p>
                      </div>
                    </div>
                    <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-lg transition">
                      <X size={20} className="text-white" />
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Channel Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder={`My ${config.name} Channel`}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition"
                    />
                  </div>

                  {/* Webhook URL */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Webhook URL
                    </label>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="url"
                        value={formData.webhookUrl}
                        onChange={e => setFormData({ ...formData, webhookUrl: e.target.value })}
                        placeholder={config.placeholder}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition text-sm"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-medium text-gray-700 mb-2">How to get your webhook URL:</p>
                      <ol className="text-xs text-gray-500 space-y-1">
                        {config.instructions.map((step, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="flex-shrink-0 w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-medium">
                              {i + 1}
                            </span>
                            {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Events */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Subscribe to Events
                    </label>
                    <div className="space-y-2">
                      {NOTIFICATION_EVENTS.map(event => (
                        <label
                          key={event.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            formData.events.includes(event.id)
                              ? 'border-gray-900 bg-gray-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                            formData.events.includes(event.id)
                              ? 'bg-gray-900 border-gray-900'
                              : 'border-gray-300'
                          }`}>
                            {formData.events.includes(event.id) && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <input
                            type="checkbox"
                            checked={formData.events.includes(event.id)}
                            onChange={() => toggleEvent(event.id)}
                            className="sr-only"
                          />
                          <span className="text-lg">{event.icon}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{event.label}</p>
                            <p className="text-xs text-gray-500">{event.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
                  <button
                    onClick={() => setModalStep('select')}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={loading || !formData.name || !formData.webhookUrl || formData.events.length === 0}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition font-medium text-sm"
                  >
                    {loading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Zap size={16} />
                    )}
                    Create Channel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-in { animation: slide-in-from-top-2 0.2s ease-out; }
      `}</style>
    </div>
  );
};

export default NotificationChannelsPage;
