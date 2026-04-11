import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadStats } from '../../store/slices/leadSlice';
import { fetchStats } from '../../store/slices/rawImportSlice';
import subscriptionService, { Subscription } from '../../services/subscription.service';
import api from '../../services/api';
import { teamMonitoringService, LiveTeamStatus } from '../../services/team-monitoring.service';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
} from 'recharts';
import {
  UsersIcon,
  DocumentArrowUpIcon,
  ArrowPathIcon,
  ArrowUpRightIcon,
  SparklesIcon,
  RocketLaunchIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
  BoltIcon,
  EyeIcon,
  PhoneIcon,
} from '@heroicons/react/24/outline';

const STAGE_COLORS: Record<string, string> = {
  // Common Pipeline Stages
  'New': '#3B82F6',           // Blue
  'NEW': '#3B82F6',
  'Contacted': '#8B5CF6',     // Purple
  'CONTACTED': '#8B5CF6',
  'Qualified': '#F59E0B',     // Amber
  'QUALIFIED': '#F59E0B',
  'Negotiation': '#EC4899',   // Pink
  'NEGOTIATION': '#EC4899',
  'Proposal': '#6366F1',      // Indigo
  'PROPOSAL': '#6366F1',
  'Won': '#22C55E',           // Green
  'WON': '#22C55E',
  'Lost': '#EF4444',          // Red
  'LOST': '#EF4444',
  'Follow Up': '#F97316',     // Orange
  'Follow-Up': '#F97316',
  'FOLLOW_UP': '#F97316',
  // Education Pipeline Stages
  'Admitted': '#10B981',      // Emerald
  'ADMITTED': '#10B981',
  'Enrolled': '#059669',      // Green
  'ENROLLED': '#059669',
  'Application': '#0EA5E9',   // Sky
  'APPLICATION': '#0EA5E9',
  'Document Verification': '#14B8A6', // Teal
  'DOCUMENT_VERIFICATION': '#14B8A6',
  'Counseling': '#A855F7',    // Violet
  'COUNSELING': '#A855F7',
  'Fee Payment': '#F472B6',   // Pink
  'FEE_PAYMENT': '#F472B6',
  // Other common stages
  'Unassigned': '#6B7280',    // Gray
  'UNASSIGNED': '#6B7280',
  'Pending': '#FBBF24',       // Yellow
  'PENDING': '#FBBF24',
  'In Progress': '#3B82F6',   // Blue
  'IN_PROGRESS': '#3B82F6',
  'Closed': '#64748B',        // Slate
  'CLOSED': '#64748B',
};

const PIE_COLORS = ['#6366F1', '#EC4899', '#14B8A6', '#F59E0B', '#8B5CF6', '#EF4444', '#10B981', '#3B82F6'];
const SOURCE_COLORS: Record<string, string> = {
  'FACEBOOK': '#1877F2',
  'INSTAGRAM': '#E4405F',
  'GOOGLE': '#4285F4',
  'WEBSITE': '#10B981',
  'REFERRAL': '#8B5CF6',
  'WALK_IN': '#F59E0B',
  'PHONE': '#06B6D4',
  'EMAIL': '#EF4444',
  'LINKEDIN': '#0A66C2',
  'TWITTER': '#1DA1F2',
  'OTHER': '#6B7280',
};

// Telecaller Dashboard Stats
interface DashboardStats {
  today: {
    calls: number;
    followUpsCompleted: number;
    pendingFollowUps: number;
    target: { calls: number; followUps: number };
  };
  assignedData: {
    leads: number;
    rawRecords: number;
    totalRawRecords: number;
    queueItems: number;
    total: number;
  };
  weeklyActivity: Array<{ day: string; date: string; calls: number; target: number }>;
  thisWeek: { totalCalls: number; followUpsCompleted: number; target: number };
  leads: {
    total: number;
    byStage: Record<string, number>;
    converted: number;
    won: number;
    conversionRate: number;
    winRate: number;
  };
  outcomes: Record<string, number>;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    leadName: string | null;
    leadId: string | null;
    createdAt: string;
  }>;
  pendingFollowUpsList?: Array<{
    id: string;
    leadId: string;
    leadName: string;
    phone: string | null;
    scheduledAt: string | null;
    notes: string | null;
    type: 'scheduled' | 'needs_attention';
  }>;
}

// Team member stats for Team Lead
interface TeamMemberStats {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalAssigned: number;
  callsToday: number;
  pending: number;
  interested: number;
  converted: number;
  conversionRate: number;
}

// Team Lead Dashboard Stats
interface TeamLeadDashboardStats {
  teamSize: number;
  totalAssigned: number;
  totalPending: number;
  totalInterested: number;
  totalConverted: number;
  callsToday: number;
  avgConversionRate: number;
  teamMembers: TeamMemberStats[];
}

// Admin/Manager Dashboard Stats
interface OrgDashboardStats {
  totalUsers: number;
  totalTelecallers: number;
  totalTeamLeads: number;
  totalLeads: number;
  totalImports: number;
  pendingRecords: number;
  assignedRecords: number;
  interestedRecords: number;
  convertedRecords: number;
  callsToday: number;
  activeVoiceAgents: number;
  activeCampaigns: number;
}

export default function DashboardPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { stats } = useSelector((state: RootState) => state.leads);
  const { stats: rawImportStats } = useSelector((state: RootState) => state.rawImports);
  const { user } = useSelector((state: RootState) => state.auth);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  // Get user role - Admin dashboard is the default fallback
  const userRole = (user?.role?.toLowerCase() || '').trim();
  const isManager = userRole === 'manager';
  const isTeamLead = userRole === 'team_lead' || userRole === 'teamlead';
  const isTelecaller = userRole === 'telecaller' || userRole === 'counselor';

  useEffect(() => {
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    setLastRefresh(new Date());

    subscriptionService.getCurrentSubscription()
      .then(setSubscription)
      .catch(console.error);

    const timeTimer = setInterval(() => setCurrentTime(new Date()), 60000);
    const dataTimer = setInterval(() => {
      dispatch(fetchLeadStats());
      dispatch(fetchStats());
      setLastRefresh(new Date());
    }, 30000);

    return () => {
      clearInterval(timeTimer);
      clearInterval(dataTimer);
    };
  }, [dispatch]);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Render based on role
  if (isTelecaller) {
    return <TelecallerDashboard user={user} getGreeting={getGreeting} currentTime={currentTime} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} />;
  }

  if (isTeamLead) {
    return <TeamLeadDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} />;
  }

  if (isManager) {
    return <ManagerDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} stats={stats} rawImportStats={rawImportStats} />;
  }

  // Admin Dashboard (default)
  return <AdminDashboard user={user} getGreeting={getGreeting} lastRefresh={lastRefresh} setLastRefresh={setLastRefresh} stats={stats} rawImportStats={rawImportStats} subscription={subscription} />;
}

// ============================================
// TELECALLER DASHBOARD
// ============================================
function TelecallerDashboard({ user, getGreeting, currentTime, lastRefresh, setLastRefresh }: any) {
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telecaller/dashboard-stats');
      setDashboardStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const weeklyActivity = dashboardStats?.weeklyActivity || [];
  const dailyCallTarget = dashboardStats?.today?.target?.calls || dashboardStats?.assignedData?.total || 0;
  const callsProgress = dailyCallTarget > 0 ? Math.min(((dashboardStats?.today?.calls || 0) / dailyCallTarget) * 100, 100) : 0;

  // Dynamically generate pipeline data from all stages returned by API
  const waterfallData = dashboardStats?.leads?.byStage
    ? Object.entries(dashboardStats.leads.byStage)
        .map(([stageName, count], index) => ({
          name: stageName,
          value: count as number,
          fill: STAGE_COLORS[stageName] || STAGE_COLORS[stageName.toUpperCase()] || PIE_COLORS[index % PIE_COLORS.length],
        }))
        .filter(stage => stage.value > 0) // Only show stages with leads
        .sort((a, b) => b.value - a.value) // Sort by count descending
    : [];

  return (
    <div className="p-3 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white">{getGreeting()}, {user?.firstName}</h1>
          <span className="text-slate-400 text-xs hidden sm:inline">
            {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 rounded-full">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span className="text-emerald-400 text-[10px] font-medium">Live</span>
          </div>
        </div>
        <button onClick={() => { fetchData(); setLastRefresh(new Date()); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded transition-all">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* KPI Cards - All Clickable */}
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-2 mb-3">
        <Link to="/leads?assignedToMe=true" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-blue-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Leads</p>
          <p className="text-xl font-bold text-white">{dashboardStats?.leads?.total || 0}</p>
        </Link>
        <Link to="/call-logs" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-violet-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Calls Today</p>
          <div className="flex items-end justify-between">
            <p className="text-xl font-bold text-white">{dashboardStats?.today?.calls || 0}<span className="text-slate-500 text-sm font-normal">/{dailyCallTarget}</span></p>
            <span className={`text-[10px] font-medium ${callsProgress >= 100 ? 'text-emerald-400' : 'text-violet-400'}`}>{Math.round(callsProgress)}%</span>
          </div>
        </Link>
        <Link to="/leads?pendingFollowUp=true" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-amber-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Follow-ups</p>
          <p className="text-xl font-bold text-white">{dashboardStats?.today?.followUpsCompleted || 0}<span className="text-amber-400 text-sm ml-1">+{dashboardStats?.today?.pendingFollowUps || 0}</span></p>
        </Link>
        <Link to="/leads?converted=true" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-emerald-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Conversion</p>
          <p className="text-xl font-bold text-emerald-400">{dashboardStats?.leads?.conversionRate || 0}%</p>
        </Link>
        <Link to="/leads?stage=Admitted" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-cyan-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Win Rate</p>
          <p className="text-xl font-bold text-cyan-400">{dashboardStats?.leads?.winRate || 0}%</p>
        </Link>
        <Link to="/leads?stage=Admitted" className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 hover:border-green-500/50 hover:bg-slate-700/50 transition-all cursor-pointer">
          <p className="text-slate-400 text-[10px] uppercase tracking-wide">Won</p>
          <p className="text-xl font-bold text-green-400">{dashboardStats?.leads?.won || 0}</p>
        </Link>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-3">
          {/* Weekly Performance */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Weekly Performance</h3>
            <div className="h-36">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={weeklyActivity.length > 0 ? weeklyActivity : [
                  { day: 'Mon', date: '', calls: 0, target: 15 }, { day: 'Tue', date: '', calls: 0, target: 15 },
                  { day: 'Wed', date: '', calls: 0, target: 15 }, { day: 'Thu', date: '', calls: 0, target: 15 },
                  { day: 'Fri', date: '', calls: 0, target: 15 }, { day: 'Sat', date: '', calls: 0, target: 10 }, { day: 'Sun', date: '', calls: 0, target: 10 }
                ]} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#374151" />
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assigned Data & Pipeline */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Assigned Data</h3>
              <div className="space-y-2">
                <Link to="/assigned-data" className="flex justify-between items-center hover:bg-slate-700/30 p-1 -mx-1 rounded transition-colors cursor-pointer">
                  <span className="text-slate-400 text-xs">Total Assigned</span>
                  <span className="text-white font-bold">{dashboardStats?.assignedData?.totalRawRecords || 0}</span>
                </Link>
                <Link to="/assigned-data?status=pending" className="flex justify-between items-center hover:bg-slate-700/30 p-1 -mx-1 rounded transition-colors cursor-pointer">
                  <span className="text-slate-400 text-xs">Pending Calls</span>
                  <span className="text-amber-400 font-bold">{dashboardStats?.assignedData?.rawRecords || 0}</span>
                </Link>
                <Link to="/calling-queue" className="flex justify-between items-center hover:bg-slate-700/30 p-1 -mx-1 rounded transition-colors cursor-pointer">
                  <span className="text-slate-400 text-xs">In Queue</span>
                  <span className="text-blue-400 font-bold">{dashboardStats?.assignedData?.queueItems || 0}</span>
                </Link>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Lead Pipeline</h3>
              <div className="space-y-1">
                {waterfallData.length > 0 ? (
                  waterfallData.map((stage, idx) => (
                    <Link
                      key={idx}
                      to={`/leads?stage=${encodeURIComponent(stage.name)}`}
                      className="flex justify-between items-center hover:bg-slate-700/30 p-1 -mx-1 rounded transition-colors cursor-pointer"
                    >
                      <span className="text-xs" style={{ color: stage.fill }}>{stage.name}</span>
                      <span className="text-white text-xs font-bold">{stage.value}</span>
                    </Link>
                  ))
                ) : (
                  <p className="text-slate-400 text-xs text-center py-2">No leads assigned yet</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Call Outcomes */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Call Outcomes</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Connected', value: dashboardStats?.outcomes?.CONNECTED || 0, color: 'text-emerald-400', outcome: 'CONNECTED' },
                { label: 'No Answer', value: dashboardStats?.outcomes?.NO_ANSWER || 0, color: 'text-amber-400', outcome: 'NO_ANSWER' },
                { label: 'Busy', value: dashboardStats?.outcomes?.BUSY || 0, color: 'text-orange-400', outcome: 'BUSY' },
                { label: 'Failed', value: dashboardStats?.outcomes?.FAILED || 0, color: 'text-red-400', outcome: 'FAILED' },
              ].map((item, idx) => (
                <Link
                  key={idx}
                  to={`/call-logs?outcome=${item.outcome}`}
                  className="text-center p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded transition-colors cursor-pointer"
                >
                  <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] text-slate-400">{item.label}</p>
                </Link>
              ))}
            </div>
          </div>

          {/* Pending Follow-ups List */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Pending Follow-ups</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {dashboardStats?.pendingFollowUpsList && dashboardStats.pendingFollowUpsList.length > 0 ? (
                dashboardStats.pendingFollowUpsList.map((followUp) => (
                  <Link
                    key={followUp.id}
                    to={`/leads/${followUp.leadId}`}
                    className="block p-2 bg-slate-700/30 hover:bg-slate-700/50 rounded transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white text-xs font-medium">{followUp.leadName}</p>
                        {followUp.phone && (
                          <p className="text-slate-400 text-[10px]">{followUp.phone}</p>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        followUp.type === 'scheduled' ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {followUp.type === 'scheduled' ? 'Scheduled' : 'Needs Attention'}
                      </span>
                    </div>
                    {followUp.scheduledAt && (
                      <p className="text-emerald-400 text-[10px] mt-1">
                        {new Date(followUp.scheduledAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                    {followUp.notes && (
                      <p className="text-slate-500 text-[10px] mt-0.5 truncate">{followUp.notes}</p>
                    )}
                  </Link>
                ))
              ) : (
                <p className="text-slate-400 text-xs text-center py-2">No pending follow-ups</p>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wide mb-2">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/assigned-data" className="flex items-center gap-2 p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded text-blue-400 text-xs">
                <PhoneIcon className="w-4 h-4" /> Start Calling
              </Link>
              <Link to="/leads?pendingFollowUp=true" className="flex items-center gap-2 p-2 bg-amber-500/20 hover:bg-amber-500/30 rounded text-amber-400 text-xs">
                <ArrowPathIcon className="w-4 h-4" /> View All Follow-ups
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3">
        <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Real-time</span>
      </div>
    </div>
  );
}

// ============================================
// TEAM LEAD DASHBOARD
// ============================================
function TeamLeadDashboard({ user, getGreeting, lastRefresh, setLastRefresh }: any) {
  const [teamStats, setTeamStats] = useState<TeamLeadDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/telecaller/team-dashboard-stats');
      setTeamStats(res.data?.data || null);
    } catch (error) {
      console.error('Failed to fetch team stats:', error);
      setTeamStats({
        teamSize: 0,
        totalAssigned: 0,
        totalPending: 0,
        totalInterested: 0,
        totalConverted: 0,
        callsToday: 0,
        avgConversionRate: 0,
        teamMembers: []
      });
    } finally {
      setLoading(false);
    }
  };

  // Sort team members by performance
  const sortedByConversion = [...(teamStats?.teamMembers || [])].sort((a, b) => b.conversionRate - a.conversionRate);
  const topPerformers = sortedByConversion.slice(0, 3);
  const needsAttention = sortedByConversion.filter(m => m.conversionRate < 10 || m.callsToday === 0);

  // Team health indicator
  const teamHealth = teamStats?.avgConversionRate !== undefined
    ? teamStats.avgConversionRate >= 15 ? 'excellent' : teamStats.avgConversionRate >= 10 ? 'good' : teamStats.avgConversionRate >= 5 ? 'fair' : 'needs-improvement'
    : 'no-data';

  const healthColors = {
    'excellent': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    'good': { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
    'fair': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
    'needs-improvement': { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    'no-data': { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' },
  };

  // Chart data for team member comparison
  const teamChartData = (teamStats?.teamMembers || []).map(m => ({
    name: `${m.firstName} ${m.lastName?.charAt(0) || ''}`.trim(),
    calls: m.callsToday,
    converted: m.converted,
    conversion: m.conversionRate,
  }));

  return (
    <div className="space-y-4">
      {/* Header with Team Health */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{getGreeting()}, {user?.firstName}</h1>
            <p className="text-indigo-200 text-sm">Team Lead Dashboard - Your Team's Performance</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold">{teamStats?.teamSize || 0}</p>
              <p className="text-indigo-200 text-xs">Team Members</p>
            </div>
            <div className={`px-3 py-1.5 rounded-full ${healthColors[teamHealth].bg} flex items-center gap-2`}>
              <span className={`w-2 h-2 rounded-full ${healthColors[teamHealth].dot} animate-pulse`}></span>
              <span className={`text-xs font-medium ${healthColors[teamHealth].text} capitalize`}>
                {teamHealth === 'needs-improvement' ? 'Needs Attention' : teamHealth === 'no-data' ? 'No Data' : teamHealth}
              </span>
            </div>
            <button onClick={() => { fetchData(); setLastRefresh(new Date()); }} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Team KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total Assigned</p>
          <p className="text-2xl font-bold text-gray-900">{teamStats?.totalAssigned || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Across all members</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{teamStats?.totalPending || 0}</p>
          <p className="text-xs text-gray-400 mt-1">To be contacted</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Interested</p>
          <p className="text-2xl font-bold text-green-600">{teamStats?.totalInterested || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Warm leads</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Converted</p>
          <p className="text-2xl font-bold text-indigo-600">{teamStats?.totalConverted || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Success!</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Calls Today</p>
          <p className="text-2xl font-bold text-blue-600">{teamStats?.callsToday || 0}</p>
          <p className="text-xs text-gray-400 mt-1">Team total</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Avg Conversion</p>
          <p className={`text-2xl font-bold ${teamStats?.avgConversionRate && teamStats.avgConversionRate >= 15 ? 'text-emerald-600' : teamStats?.avgConversionRate && teamStats.avgConversionRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
            {teamStats?.avgConversionRate || 0}%
          </p>
          <p className="text-xs text-gray-400 mt-1">Team average</p>
        </div>
      </div>

      {/* Team Performance Chart + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Team Comparison Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Team Member Comparison</h2>
          {teamChartData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamChartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#6B7280' }} width={30} />
                  <Tooltip />
                  <Bar dataKey="calls" fill="#6366F1" name="Calls Today" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" fill="#10B981" name="Converted" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No team data available</div>
          )}
        </div>

        {/* Top Performers & Needs Attention */}
        <div className="space-y-4">
          {/* Top Performers */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                <ArrowUpRightIcon className="w-3 h-3 text-emerald-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Top Performers</h3>
            </div>
            {topPerformers.length > 0 ? (
              <div className="space-y-2">
                {topPerformers.map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-sm text-gray-900">{member.firstName} {member.lastName?.charAt(0)}.</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600">{member.conversionRate}%</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-2">No data yet</p>
            )}
          </div>

          {/* Needs Attention */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center">
                <EyeIcon className="w-3 h-3 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900">Needs Attention</h3>
            </div>
            {needsAttention.length > 0 ? (
              <div className="space-y-2">
                {needsAttention.slice(0, 3).map((member, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
                    <span className="text-sm text-gray-900">{member.firstName} {member.lastName?.charAt(0)}.</span>
                    <div className="flex items-center gap-2">
                      {member.callsToday === 0 && <span className="text-xs px-1.5 py-0.5 bg-red-100 text-red-600 rounded">No calls</span>}
                      <span className="text-sm font-semibold text-amber-600">{member.conversionRate}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-green-600 text-center py-2">All team members performing well!</p>
            )}
          </div>
        </div>
      </div>

      {/* Team Members Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Team Members Detail</h2>
          <Link to="/leads" className="text-xs text-indigo-600 hover:text-indigo-700">View All Leads →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Telecaller</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Assigned</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Calls Today</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Pending</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Interested</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Converted</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Conversion %</th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(teamStats?.teamMembers || []).length > 0 ? (
                teamStats?.teamMembers.map((member, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                          member.conversionRate >= 15 ? 'bg-emerald-500' : member.conversionRate >= 10 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>
                          {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{member.firstName} {member.lastName}</p>
                          <p className="text-xs text-gray-500">{member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-gray-900">{member.totalAssigned}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-medium ${member.callsToday > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {member.callsToday}
                      </span>
                    </td>
                    <td className="text-center px-4 py-3 text-sm text-amber-600">{member.pending}</td>
                    <td className="text-center px-4 py-3 text-sm text-green-600">{member.interested}</td>
                    <td className="text-center px-4 py-3 text-sm text-indigo-600 font-medium">{member.converted}</td>
                    <td className="text-center px-4 py-3">
                      <span className={`text-sm font-medium ${member.conversionRate >= 15 ? 'text-emerald-600' : member.conversionRate >= 10 ? 'text-amber-600' : 'text-red-600'}`}>
                        {member.conversionRate}%
                      </span>
                    </td>
                    <td className="text-center px-4 py-3">
                      {member.callsToday === 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Idle</span>
                      ) : member.conversionRate >= 15 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Excellent</span>
                      ) : member.conversionRate >= 10 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Active</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Monitor</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-sm">No team members assigned yet</p>
                    <p className="text-xs text-gray-400">Contact admin to assign telecallers to your team</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Link to="/assignments" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Assignments</p>
            <p className="text-xs text-gray-500">Manage team data</p>
          </div>
        </Link>
        <Link to="/call-monitoring" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Call Monitoring</p>
            <p className="text-xs text-gray-500">Monitor live calls</p>
          </div>
        </Link>
        <Link to="/analytics/telecaller-performance" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Performance</p>
            <p className="text-xs text-gray-500">Detailed analytics</p>
          </div>
        </Link>
        <Link to="/leads" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
            <DocumentArrowUpIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Team Leads</p>
            <p className="text-xs text-gray-500">View all team leads</p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastRefresh.toLocaleTimeString()} | Showing data for your team only
      </div>
    </div>
  );
}

// Leaderboard entry type
interface LeaderboardEntry {
  id: string;
  name: string;
  calls: number;
  connected: number;
  conversions: number;
  conversionRate: number;
}

// ============================================
// MANAGER DASHBOARD
// ============================================
function ManagerDashboard({ user, getGreeting, lastRefresh, setLastRefresh, stats, rawImportStats }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [teamOverview, setTeamOverview] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveTeamStatus | null>(null);

  useEffect(() => {
    fetchManagerData();
    fetchLiveStatus();

    const liveStatusInterval = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(liveStatusInterval);
  }, []);

  const fetchLiveStatus = async () => {
    try {
      const status = await teamMonitoringService.getLiveStatus();
      setLiveStatus(status);
    } catch (error) {
      console.error('Failed to fetch live status:', error);
    }
  };

  const fetchManagerData = async () => {
    try {
      // Fetch team overview and leaderboard in parallel
      const [usersRes, leaderboardRes] = await Promise.all([
        api.get('/users?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/telecaller-analytics/leaderboard?metric=calls&limit=10').catch(() => ({ data: { data: [] } })),
      ]);
      const users = usersRes.data?.data || [];

      // Build team overview
      const teamLeads = users.filter((u: any) => u.role?.slug?.toLowerCase() === 'team_lead');
      const telecallers = users.filter((u: any) => ['telecaller', 'counselor', 'sales'].includes(u.role?.slug?.toLowerCase()));

      // Group telecallers by manager
      const teamData = teamLeads.map((tl: any) => {
        const members = telecallers.filter((t: any) => t.managerId === tl.id);
        return {
          id: tl.id,
          name: `${tl.firstName} ${tl.lastName || ''}`.trim(),
          memberCount: members.length,
          members: members.map((m: any) => ({ id: m.id, name: `${m.firstName} ${m.lastName || ''}`.trim() })),
        };
      });
      setTeamOverview(teamData);

      // Set leaderboard data
      const leaderboardData = (leaderboardRes.data?.data || []).map((entry: any) => ({
        id: entry.telecallerId || entry.id,
        name: entry.telecallerName || entry.name || 'Unknown',
        calls: entry.totalCalls || entry.calls || 0,
        connected: entry.connectedCalls || entry.connected || 0,
        conversions: entry.conversions || 0,
        conversionRate: entry.conversionRate || 0,
      }));
      setLeaderboard(leaderboardData);
    } catch (error) {
      console.error('Failed to fetch manager data:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    fetchManagerData();
    fetchLiveStatus();
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  const statusPieData = stats?.byStatus
    ? Object.entries(stats.byStatus).map(([status, count], index) => ({
        name: status.replace('_', ' '),
        value: count as number,
        color: STAGE_COLORS[status] || PIE_COLORS[index % PIE_COLORS.length],
      }))
    : [];

  // Calculate conversion rate
  const totalRecords = rawImportStats?.totalRecords || 0;
  const convertedRecords = rawImportStats?.convertedRecords || 0;
  const overallConversionRate = totalRecords > 0 ? Math.round((convertedRecords / totalRecords) * 100 * 10) / 10 : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">{getGreeting()}, {user?.firstName}</h1>
            <p className="text-blue-200 text-sm">Manager Dashboard - Organization Overview</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4">
              <div className="text-center px-3 py-1 bg-white/10 rounded-lg">
                <p className="text-lg font-bold">{teamOverview.length}</p>
                <p className="text-[10px] text-blue-200">Teams</p>
              </div>
              <div className="text-center px-3 py-1 bg-white/10 rounded-lg">
                <p className="text-lg font-bold">{overallConversionRate}%</p>
                <p className="text-[10px] text-blue-200">Conversion</p>
              </div>
            </div>
            <button onClick={handleRefresh} className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all">
              <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Live Team Status */}
      {liveStatus && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <h2 className="text-sm font-semibold text-gray-900">Live Team Status</h2>
            </div>
            <Link to="/team-monitoring" className="text-xs text-indigo-600">View Details →</Link>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{liveStatus.summary.total}</p>
              <p className="text-xs text-gray-500">Total Team</p>
            </div>
            <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <p className="text-2xl font-bold text-emerald-600">{liveStatus.summary.active}</p>
              </div>
              <p className="text-xs text-emerald-700">Active Now</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <p className="text-2xl font-bold text-amber-600">{liveStatus.summary.onBreak}</p>
              </div>
              <p className="text-xs text-amber-700">On Break</p>
            </div>
            <div className="text-center p-3 bg-gray-100 rounded-lg">
              <div className="flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                <p className="text-2xl font-bold text-gray-500">{liveStatus.summary.offline}</p>
              </div>
              <p className="text-xs text-gray-500">Offline</p>
            </div>
          </div>
          {liveStatus.members.filter(m => m.status === 'active').length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 mb-2">Currently Active:</p>
              <div className="flex flex-wrap gap-2">
                {liveStatus.members.filter(m => m.status === 'active').slice(0, 10).map((member) => (
                  <div key={member.id} className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-xs text-emerald-700 font-medium">{member.name.split(' ')[0]}</span>
                  </div>
                ))}
                {liveStatus.members.filter(m => m.status === 'active').length > 10 && (
                  <span className="text-xs text-gray-400 px-2 py-1">+{liveStatus.members.filter(m => m.status === 'active').length - 10} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Link to="/leads" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Total Leads</p>
          <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
        </Link>
        <Link to="/leads?status=NEW" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">New Today</p>
          <p className="text-2xl font-bold text-green-600">{stats?.todayCount || 0}</p>
        </Link>
        <Link to="/raw-imports" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{rawImportStats?.pendingRecords || 0}</p>
        </Link>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Assigned</p>
          <p className="text-2xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Interested</p>
          <p className="text-2xl font-bold text-emerald-600">{rawImportStats?.interestedRecords || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs uppercase tracking-wide">Converted</p>
          <p className="text-2xl font-bold text-indigo-600">{rawImportStats?.convertedRecords || 0}</p>
        </div>
      </div>

      {/* Teams Overview + Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Teams Overview */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Teams Overview</h2>
            <Link to="/users" className="text-xs text-indigo-600">Manage →</Link>
          </div>
          {teamOverview.length > 0 ? (
            <div className="space-y-2">
              {teamOverview.map((team, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <UserGroupIcon className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{team.name}</p>
                        <p className="text-xs text-gray-500">{team.memberCount} members</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-indigo-600">{team.memberCount}</span>
                  </div>
                </div>
              ))}
              {teamOverview.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">No teams configured</div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <UserGroupIcon className="w-8 h-8 mx-auto text-gray-300 mb-2" />
              <p className="text-sm">No teams created yet</p>
              <Link to="/users" className="text-xs text-indigo-600 mt-1 inline-block">Add Team Leads →</Link>
            </div>
          )}
        </div>

        {/* Lead Status */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Lead Status</h2>
            <Link to="/leads" className="text-xs text-indigo-600">View All →</Link>
          </div>
          {statusPieData.length > 0 ? (
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                    {statusPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-gray-400">No data</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {statusPieData.slice(0, 4).map((entry, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-gray-600">{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Telecaller Leaderboard */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">Top Telecallers Today</h2>
            <Link to="/analytics/telecaller-performance" className="text-xs text-indigo-600">View All →</Link>
          </div>
          {leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, idx) => (
                <div key={entry.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                      idx === 1 ? 'bg-gray-200 text-gray-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900 truncate max-w-[100px]">{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="text-center">
                      <p className="font-bold text-blue-600">{entry.calls}</p>
                      <p className="text-gray-400">calls</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-emerald-600">{entry.conversions}</p>
                      <p className="text-gray-400">conv</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-44 flex flex-col items-center justify-center text-gray-400">
              <PhoneIcon className="w-8 h-8 text-gray-300 mb-2" />
              <p className="text-sm">No call data today</p>
              <p className="text-xs">Leaderboard updates as calls are made</p>
            </div>
          )}
        </div>
      </div>

      {/* Import Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Import Pipeline Overview</h2>
          <Link to="/raw-imports" className="text-xs text-indigo-600">Manage →</Link>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xl font-bold text-gray-900">{rawImportStats?.totalRecords || 0}</p>
            <p className="text-xs text-gray-500">Total Records</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-yellow-50 border border-yellow-100">
            <p className="text-xl font-bold text-yellow-600">{rawImportStats?.pendingRecords || 0}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xl font-bold text-blue-600">{rawImportStats?.assignedRecords || 0}</p>
            <p className="text-xs text-gray-500">Assigned</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xl font-bold text-green-600">{rawImportStats?.interestedRecords || 0}</p>
            <p className="text-xs text-gray-500">Interested</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-xl font-bold text-purple-600">{rawImportStats?.convertedRecords || 0}</p>
            <p className="text-xs text-gray-500">Converted</p>
          </div>
        </div>
        {(rawImportStats?.totalRecords || 0) > 0 && (
          <div className="mt-3">
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-100">
              <div className="bg-yellow-400 transition-all" style={{ width: `${((rawImportStats?.pendingRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-blue-500 transition-all" style={{ width: `${((rawImportStats?.assignedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-green-500 transition-all" style={{ width: `${((rawImportStats?.interestedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
              <div className="bg-purple-500 transition-all" style={{ width: `${((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1)) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link to="/leads/bulk-upload" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
            <DocumentArrowUpIcon className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Import Data</p>
            <p className="text-xs text-gray-500">CSV/Excel</p>
          </div>
        </Link>
        <Link to="/assignments" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <UserGroupIcon className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Assignments</p>
            <p className="text-xs text-gray-500">Distribute</p>
          </div>
        </Link>
        <Link to="/campaigns" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <RocketLaunchIcon className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Campaigns</p>
            <p className="text-xs text-gray-500">Manage</p>
          </div>
        </Link>
        <Link to="/call-monitoring" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-100 flex items-center justify-center">
            <EyeIcon className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Monitoring</p>
            <p className="text-xs text-gray-500">Live calls</p>
          </div>
        </Link>
        <Link to="/analytics" className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
            <ChartBarIcon className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">Analytics</p>
            <p className="text-xs text-gray-500">Reports</p>
          </div>
        </Link>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Last updated: {lastRefresh.toLocaleTimeString()} | Organization-wide view
      </div>
    </div>
  );
}

// ============================================
// ADMIN DASHBOARD
// ============================================
function AdminDashboard({ user, getGreeting, lastRefresh, setLastRefresh, stats, rawImportStats, subscription }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const [loading, setLoading] = useState(false);
  const [orgStats, setOrgStats] = useState<OrgDashboardStats | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveTeamStatus | null>(null);

  useEffect(() => {
    fetchOrgStats();
    fetchLiveStatus();
    const liveStatusInterval = setInterval(fetchLiveStatus, 30000);
    return () => clearInterval(liveStatusInterval);
  }, []);

  const fetchLiveStatus = async () => {
    try {
      const status = await teamMonitoringService.getLiveStatus();
      setLiveStatus(status);
    } catch (error) {
      console.error('Failed to fetch live status:', error);
    }
  };

  const fetchOrgStats = async () => {
    try {
      const usersRes = await api.get('/users?limit=1000').catch(() => ({ data: { data: [] } }));
      const users = usersRes.data?.data || [];
      setOrgStats({
        totalUsers: users.length,
        totalTelecallers: users.filter((u: any) => ['telecaller', 'counselor', 'sales'].includes(u.role?.slug?.toLowerCase())).length,
        totalTeamLeads: users.filter((u: any) => u.role?.slug?.toLowerCase() === 'team_lead').length,
        totalLeads: stats?.total || 0,
        totalImports: rawImportStats?.totalImports || 0,
        pendingRecords: rawImportStats?.pendingRecords || 0,
        assignedRecords: rawImportStats?.assignedRecords || 0,
        interestedRecords: rawImportStats?.interestedRecords || 0,
        convertedRecords: rawImportStats?.convertedRecords || 0,
        callsToday: 0,
        activeVoiceAgents: 0,
        activeCampaigns: 0,
      });
    } catch (error) {
      console.error('Failed to fetch org stats:', error);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    dispatch(fetchLeadStats());
    dispatch(fetchStats());
    fetchOrgStats();
    fetchLiveStatus();
    setLastRefresh(new Date());
    setTimeout(() => setLoading(false), 500);
  };

  // Pipeline stages data for chart
  const pipelineStages = stats?.byStatus
    ? Object.entries(stats.byStatus)
        .map(([stage, count], index) => ({
          name: stage.replace(/_/g, ' '),
          value: count as number,
          color: STAGE_COLORS[stage] || PIE_COLORS[index % PIE_COLORS.length],
        }))
        .sort((a, b) => b.value - a.value) // Sort by count descending
    : [];

  // Source data for bar chart - capitalize properly
  const sourceBarData = stats?.bySource
    ? Object.entries(stats.bySource).map(([source, count], index) => ({
        name: source.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' '),
        value: count as number,
        fill: SOURCE_COLORS[source] || PIE_COLORS[index % PIE_COLORS.length],
      })).sort((a, b) => b.value - a.value).slice(0, 6)
    : [];

  // Pipeline funnel data
  const funnelData = [
    { name: 'Total', value: rawImportStats?.totalRecords || 0, fill: '#6366F1', percent: 100 },
    { name: 'Assigned', value: rawImportStats?.assignedRecords || 0, fill: '#3B82F6', percent: rawImportStats?.totalRecords ? Math.round((rawImportStats.assignedRecords / rawImportStats.totalRecords) * 100) : 0 },
    { name: 'Interested', value: rawImportStats?.interestedRecords || 0, fill: '#10B981', percent: rawImportStats?.totalRecords ? Math.round((rawImportStats.interestedRecords / rawImportStats.totalRecords) * 100) : 0 },
    { name: 'Converted', value: rawImportStats?.convertedRecords || 0, fill: '#8B5CF6', percent: rawImportStats?.totalRecords ? Math.round((rawImportStats.convertedRecords / rawImportStats.totalRecords) * 100) : 0 },
  ];

  const conversionRate = (rawImportStats?.totalRecords || 0) > 0
    ? ((rawImportStats?.convertedRecords || 0) / (rawImportStats?.totalRecords || 1) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-5 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">{getGreeting()}, {user?.firstName}</h1>
          <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <button onClick={handleRefresh} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 shadow-sm">
          <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Row 1: Compact Key Metrics */}
      <div className="grid grid-cols-6 gap-3 mb-4">
        <Link to="/leads" className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <UserGroupIcon className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{stats?.total || 0}</p>
              <p className="text-[10px] text-gray-500">Leads</p>
            </div>
          </div>
        </Link>
        <Link to="/users" className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-800">{orgStats?.totalUsers || 0}</p>
              <p className="text-[10px] text-gray-500">Team</p>
            </div>
          </div>
        </Link>
        <Link to="/raw-imports" className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <DocumentArrowUpIcon className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-amber-600">{rawImportStats?.pendingRecords || 0}</p>
              <p className="text-[10px] text-gray-500">Pending</p>
            </div>
          </div>
        </Link>
        <Link to="/leads?converted=true" className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
              <ChartBarIcon className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{rawImportStats?.convertedRecords || 0}</p>
              <p className="text-[10px] text-gray-500">Converted</p>
            </div>
          </div>
        </Link>
        <Link to="/reports" className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center">
              <ArrowUpRightIcon className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-violet-600">{conversionRate}%</p>
              <p className="text-[10px] text-gray-500">Conv. Rate</p>
            </div>
          </div>
        </Link>
        <div className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-600">{liveStatus?.summary.active || 0}</p>
              <p className="text-[10px] text-gray-500">Active Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Lead Status (left) + Team & Today's Highlights (right) */}
      <div className="grid grid-cols-12 gap-4 mb-4">
        {/* Pipeline Stages - Donut Chart */}
        <div className="col-span-5 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">Pipeline Stages</h3>
            <Link to="/leads" className="text-[10px] text-indigo-600 hover:text-indigo-700">View All →</Link>
          </div>
          {pipelineStages.length > 0 ? (
            <div className="flex items-center gap-4">
              <div className="w-36 h-36 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pipelineStages.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pipelineStages.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 6, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}
                      formatter={(value: number, name: string) => [value, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {pipelineStages.slice(0, 6).map((stage, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }}></span>
                      <span className="text-[11px] text-gray-600">{stage.name}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-700">{stage.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">No data</div>
          )}
        </div>

        {/* Team Status */}
        <div className="col-span-3 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-gray-700">Team Status</h3>
            <span className="flex items-center gap-1 text-[10px] text-emerald-600">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Live
            </span>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-xs text-gray-700">Active</span>
              </div>
              <span className="text-lg font-bold text-emerald-600">{liveStatus?.summary.active || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                <span className="text-xs text-gray-700">On Break</span>
              </div>
              <span className="text-lg font-bold text-amber-600">{liveStatus?.summary.onBreak || 0}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-gray-400 rounded-full"></span>
                <span className="text-xs text-gray-700">Offline</span>
              </div>
              <span className="text-lg font-bold text-gray-500">{liveStatus?.summary.offline || 0}</span>
            </div>
          </div>
          <Link to="/team-monitoring" className="block text-center text-[10px] text-indigo-600 mt-3 hover:text-indigo-700">
            View Details →
          </Link>
        </div>

        {/* Today's Highlights */}
        <div className="col-span-4 bg-white rounded-xl p-3 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-700">Today's Highlights</h3>
            <span className="text-[10px] text-gray-400">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Link to="/leads?status=NEW" className="p-2.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <p className="text-lg font-bold text-blue-600">{stats?.todayCount || 0}</p>
              <p className="text-[10px] text-blue-700">New Leads</p>
            </Link>
            <Link to="/leads?pendingFollowUp=true" className="p-2.5 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
              <p className="text-lg font-bold text-amber-600">{stats?.followUpsDue || 0}</p>
              <p className="text-[10px] text-amber-700">Follow-ups Due</p>
            </Link>
            <div className="p-2.5 bg-emerald-50 rounded-lg">
              <p className="text-lg font-bold text-emerald-600">{conversionRate}%</p>
              <p className="text-[10px] text-emerald-700">Conversion Rate</p>
            </div>
            <div className="p-2.5 bg-violet-50 rounded-lg">
              <p className="text-lg font-bold text-violet-600">{rawImportStats?.assignedRecords || 0}</p>
              <p className="text-[10px] text-violet-700">Assigned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Charts */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Lead Sources Chart */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Lead Sources</h3>
            <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 hover:text-indigo-700">+ Import</Link>
          </div>
          {sourceBarData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sourceBarData} layout="vertical" barSize={18} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} stroke="#F1F5F9" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#374151', fontWeight: 500 }} width={80} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                    formatter={(value: number) => [value, 'Leads']}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} background={{ fill: '#F1F5F9', radius: 6 }}>
                    {sourceBarData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex flex-col items-center justify-center text-gray-400">
              <DocumentArrowUpIcon className="w-10 h-10 mb-2 text-gray-300" />
              <p className="text-sm">No lead sources yet</p>
              <Link to="/leads/bulk-upload" className="text-xs text-indigo-600 mt-2">Import leads</Link>
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Conversion Funnel</h3>
            <span className="text-sm font-bold text-emerald-600">{conversionRate}%</span>
          </div>
          <div className="space-y-4">
            {funnelData.map((item, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }}></span>
                    <span className="text-xs font-medium text-gray-700">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">{item.value.toLocaleString()}</span>
                    <span className="text-[10px] text-gray-400">({item.percent}%)</span>
                  </div>
                </div>
                <div className="h-5 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className="h-full rounded-lg transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(item.percent, 2)}%`, backgroundColor: item.fill }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Quick Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-6 gap-3">
          {[
            { to: '/leads/bulk-upload', icon: DocumentArrowUpIcon, label: 'Import', color: 'bg-gradient-to-r from-indigo-500 to-indigo-600' },
            { to: '/assignments', icon: UserGroupIcon, label: 'Assign', color: 'bg-gradient-to-r from-violet-500 to-violet-600' },
            { to: '/reports', icon: ChartBarIcon, label: 'Reports', color: 'bg-gradient-to-r from-emerald-500 to-emerald-600' },
            { to: '/users', icon: UsersIcon, label: 'Team', color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
            { to: '/campaigns', icon: RocketLaunchIcon, label: 'Campaigns', color: 'bg-gradient-to-r from-pink-500 to-pink-600' },
            { to: '/settings', icon: Cog6ToothIcon, label: 'Settings', color: 'bg-gradient-to-r from-gray-500 to-gray-600' },
          ].map((item, idx) => (
            <Link
              key={idx}
              to={item.to}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl text-white ${item.color} hover:shadow-lg transition-all hover:-translate-y-0.5`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-400 text-center mt-4">
        Last updated: {lastRefresh.toLocaleTimeString()}
      </div>
    </div>
  );
}
