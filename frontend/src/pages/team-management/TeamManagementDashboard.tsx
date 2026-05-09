/**
 * Team Management Dashboard
 * Comprehensive view for managers to track team performance, workload, and capacity
 */

import { useState, useEffect } from 'react';
import {
  UsersIcon,
  ChartBarIcon,
  PhoneIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  UserGroupIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import toast from 'react-hot-toast';
import {
  teamManagementService,
  TeamOverview,
  TeamMemberStats,
  TeamHierarchy,
  TeamGoal,
  CapacityData,
} from '../../services/team-management.service';

type TabType = 'overview' | 'members' | 'hierarchy' | 'capacity';

export default function TeamManagementDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<TeamOverview | null>(null);
  const [members, setMembers] = useState<TeamMemberStats[]>([]);
  const [hierarchy, setHierarchy] = useState<TeamHierarchy[]>([]);
  const [goals, setGoals] = useState<TeamGoal[]>([]);
  const [capacity, setCapacity] = useState<CapacityData[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, membersData, hierarchyData, goalsData, capacityData] = await Promise.all([
        teamManagementService.getOverview(),
        teamManagementService.getTeamMembers(),
        teamManagementService.getHierarchy(),
        teamManagementService.getGoals(),
        teamManagementService.getCapacity(),
      ]);

      setOverview(overviewData);
      setMembers(membersData);
      setHierarchy(hierarchyData);
      setGoals(goalsData.goals);
      setCapacity(capacityData);
    } catch (error) {
      console.error('Failed to load team data:', error);
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  const workloadChartData = overview ? [
    { name: 'Underloaded', value: overview.workloadDistribution.underloaded, color: '#3B82F6' },
    { name: 'Optimal', value: overview.workloadDistribution.optimal, color: '#10B981' },
    { name: 'Overloaded', value: overview.workloadDistribution.overloaded, color: '#EF4444' },
  ].filter(d => d.value > 0) : [];

  const getWorkloadBadge = (score: number) => {
    if (score < 40) return { label: 'Underloaded', color: 'bg-blue-100 text-blue-700' };
    if (score <= 80) return { label: 'Optimal', color: 'bg-green-100 text-green-700' };
    return { label: 'Overloaded', color: 'bg-red-100 text-red-700' };
  };

  const getCapacityStatusBadge = (status: string) => {
    const config: Record<string, { color: string; icon: React.ReactNode }> = {
      underutilized: { color: 'bg-blue-100 text-blue-700', icon: <ChartBarIcon className="w-4 h-4" /> },
      optimal: { color: 'bg-green-100 text-green-700', icon: <CheckCircleIcon className="w-4 h-4" /> },
      high: { color: 'bg-yellow-100 text-yellow-700', icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
      overloaded: { color: 'bg-red-100 text-red-700', icon: <ExclamationTriangleIcon className="w-4 h-4" /> },
    };
    return config[status] || config.optimal;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <ArrowPathIcon className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Team Management</h1>
        <p className="text-slate-500 mt-1">Monitor team performance, workload distribution, and capacity planning</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-6">
        <nav className="flex gap-6">
          {[
            { key: 'overview', label: 'Overview', icon: ChartBarIcon },
            { key: 'members', label: 'Team Members', icon: UsersIcon },
            { key: 'hierarchy', label: 'Organization', icon: UserGroupIcon },
            { key: 'capacity', label: 'Capacity Planning', icon: ArrowTrendingUpIcon },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UsersIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Team Members</p>
                  <p className="text-xl font-bold text-slate-900">{overview.totalMembers}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ChartBarIcon className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Active Leads</p>
                  <p className="text-xl font-bold text-slate-900">{overview.activeLeads}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ArrowTrendingUpIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Conversion Rate</p>
                  <p className="text-xl font-bold text-slate-900">{overview.avgConversionRate}%</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <PhoneIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Total Calls (30d)</p>
                  <p className="text-xl font-bold text-slate-900">{overview.totalCalls}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Workload Distribution */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Workload Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={workloadChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {workloadChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                {workloadChartData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-sm text-slate-600">{entry.name}: {entry.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team Goals */}
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Goals (This Month)</h3>
              <div className="space-y-4">
                {goals.map(goal => {
                  const progress = goal.lowerIsBetter
                    ? Math.max(0, 100 - ((goal.current - goal.target) / goal.target) * 100)
                    : Math.min(100, (goal.current / goal.target) * 100);
                  const isOnTrack = goal.lowerIsBetter ? goal.current <= goal.target : goal.current >= goal.target * 0.7;

                  return (
                    <div key={goal.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{goal.name}</span>
                        <span className={isOnTrack ? 'text-green-600' : 'text-orange-600'}>
                          {goal.current} / {goal.target} {goal.unit}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isOnTrack ? 'bg-green-500' : 'bg-orange-500'}`}
                          style={{ width: `${Math.min(100, progress)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performers</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members
                .sort((a, b) => b.conversionRate - a.conversionRate)
                .slice(0, 3)
                .map((member, index) => (
                  <div key={member.userId} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : 'bg-amber-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{member.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{member.conversionRate}%</p>
                      <p className="text-xs text-slate-500">conversion</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Member</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Role</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Active Leads</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Conversion</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Calls (30d)</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Workload</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Last Active</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                      No team members found
                    </td>
                  </tr>
                ) : (
                  members.map(member => {
                    const workload = getWorkloadBadge(member.workloadScore);
                    return (
                      <tr key={member.userId} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {member.firstName[0]}{member.lastName[0]}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {member.firstName} {member.lastName}
                              </p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{member.role}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-900">{member.activeLeads}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-medium text-green-600">{member.conversionRate}%</span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{member.callsMade}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${workload.color}`}>
                            {workload.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                          {member.lastActivityAt
                            ? new Date(member.lastActivityAt).toLocaleDateString('en-IN')
                            : 'Never'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Hierarchy Tab - Microsoft Teams Style */}
      {activeTab === 'hierarchy' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-slate-900">Organization Structure</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-primary-600" />
                Top Level
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                Manager
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-slate-500" />
                Team Member
              </span>
            </div>
          </div>
          {hierarchy.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No hierarchy data available</p>
              <p className="text-xs text-slate-400 mt-1">Set up manager relationships in User Management</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hierarchy.map(node => (
                <OrgChartNode key={node.id} node={node} isRoot={true} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Capacity Planning Tab */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
          {/* Capacity Overview Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Team Capacity Overview</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={capacity} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="managerName" type="category" width={120} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value) || 0}%`, 'Capacity Used']}
                  />
                  <Bar
                    dataKey="capacityUsed"
                    fill="#6366F1"
                    radius={[0, 4, 4, 0]}
                    label={{ position: 'right', fill: '#64748B', fontSize: 12 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Capacity Details Table */}
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Team Lead</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Team Size</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Active Leads</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Optimal</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Max Capacity</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {capacity.map(team => {
                    const statusBadge = getCapacityStatusBadge(team.status);
                    return (
                      <tr key={team.managerId} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{team.managerName}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{team.teamSize}</td>
                        <td className="px-4 py-3 text-center text-sm font-medium text-slate-900">{team.activeLeads}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{team.optimalCapacity}</td>
                        <td className="px-4 py-3 text-center text-sm text-slate-600">{team.maxCapacity}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}>
                            {statusBadge.icon}
                            {team.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Microsoft Teams Style Org Chart Node
function OrgChartNode({ node, isRoot = false }: { node: TeamHierarchy; isRoot?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.teamMembers.length > 0;

  return (
    <div className="org-chart-node">
      {/* Person Card */}
      <div
        className={`
          relative flex items-center gap-3 p-4 bg-white border-2 rounded-xl shadow-sm
          hover:shadow-md hover:border-primary-300 transition-all cursor-pointer
          ${isRoot ? 'border-primary-400 bg-primary-50' : 'border-slate-200'}
        `}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Avatar */}
        <div className={`
          w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white
          ${isRoot ? 'bg-primary-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}
        `}>
          {node.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{node.name}</p>
          <p className="text-xs text-slate-500">{node.role}</p>
        </div>

        {/* Stats */}
        {node.stats && (
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-700">{node.stats.totalLeads} leads</p>
            <p className="text-xs text-emerald-600">{node.stats.conversionRate}% conv.</p>
          </div>
        )}

        {/* Expand/Collapse indicator */}
        {hasChildren && (
          <div className="ml-2">
            <ChevronRightIcon
              className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
        )}

        {/* Team count badge */}
        {hasChildren && (
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-600">
            {node.teamMembers.length} {node.teamMembers.length === 1 ? 'report' : 'reports'}
          </div>
        )}
      </div>

      {/* Children Container with Tree Lines */}
      {hasChildren && expanded && (
        <div className="mt-6 relative">
          {/* Vertical line from parent */}
          <div className="absolute left-6 -top-6 w-0.5 h-6 bg-slate-300" />

          {/* Children */}
          <div className="pl-8 space-y-3 relative">
            {/* Horizontal connector line */}
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

            {node.teamMembers.map((child, index) => (
              <div key={child.id} className="relative">
                {/* Horizontal line to child */}
                <div className="absolute -left-2 top-7 w-4 h-0.5 bg-slate-300" />

                {/* Hide vertical line after last child */}
                {index === node.teamMembers.length - 1 && (
                  <div className="absolute -left-2 top-7 bottom-0 w-0.5 bg-white" style={{ marginTop: '1px' }} />
                )}

                <OrgChartNode node={child} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact Tree View (Alternative)
function TreeViewNode({ node, level = 0 }: { node: TeamHierarchy; level?: number }) {
  const [expanded, setExpanded] = useState(level < 3);
  const hasChildren = node.teamMembers.length > 0;

  return (
    <div className="tree-view-node">
      <div
        className={`
          flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer
          ${level === 0 ? 'bg-slate-50' : ''}
        `}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Expand/Collapse */}
        <div className="w-5 flex-shrink-0">
          {hasChildren ? (
            <ChevronRightIcon
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>

        {/* Avatar */}
        <div className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0
          ${level === 0 ? 'bg-primary-600' : level === 1 ? 'bg-blue-500' : 'bg-slate-500'}
        `}>
          {node.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        {/* Name & Role */}
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium text-slate-900">{node.name}</span>
          <span className="text-xs text-slate-400 ml-2">• {node.role}</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>{node.stats?.totalLeads || 0} leads</span>
          <span className="text-emerald-600">{node.stats?.conversionRate || 0}%</span>
          {hasChildren && (
            <span className="bg-slate-100 px-2 py-0.5 rounded-full">
              {node.teamMembers.length}
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div className="ml-5 pl-4 border-l-2 border-slate-200">
          {node.teamMembers.map(child => (
            <TreeViewNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
