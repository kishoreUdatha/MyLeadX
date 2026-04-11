/**
 * Live Team Status Card
 * Shows real-time status of team members (Active, On Break, Offline)
 */

import React from 'react';
import { Users, Circle, Clock, Coffee, Wifi, WifiOff } from 'lucide-react';
import { LiveTeamStatus } from '../../../services/team-monitoring.service';

interface Props {
  data: LiveTeamStatus | null;
  loading?: boolean;
}

export function LiveTeamStatusCard({ data, loading }: Props) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const { summary, members } = data || { summary: { total: 0, active: 0, onBreak: 0, offline: 0 }, members: [] };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-500',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          icon: Wifi,
          label: 'Active',
        };
      case 'break':
        return {
          color: 'bg-amber-500',
          bgColor: 'bg-amber-50',
          textColor: 'text-amber-700',
          icon: Coffee,
          label: 'On Break',
        };
      case 'offline':
      default:
        return {
          color: 'bg-slate-400',
          bgColor: 'bg-slate-50',
          textColor: 'text-slate-600',
          icon: WifiOff,
          label: 'Offline',
        };
    }
  };

  const formatLastActivity = (lastActivity?: string) => {
    if (!lastActivity) return 'Never';
    const date = new Date(lastActivity);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Group members by status
  const activeMembers = members.filter(m => m.status === 'active');
  const breakMembers = members.filter(m => m.status === 'break');
  const offlineMembers = members.filter(m => m.status === 'offline');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-slate-800">Live Team Status</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
          Live
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-600">{summary.active}</p>
          <p className="text-xs text-emerald-700">Active</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">{summary.onBreak}</p>
          <p className="text-xs text-amber-700">On Break</p>
        </div>
        <div className="bg-slate-100 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-600">{summary.offline}</p>
          <p className="text-xs text-slate-600">Offline</p>
        </div>
      </div>

      {/* Members List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {/* Active Members */}
        {activeMembers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-emerald-600 mb-2 flex items-center gap-1">
              <Wifi className="w-3 h-3" /> Active ({activeMembers.length})
            </p>
            <div className="space-y-2">
              {activeMembers.map((member) => {
                const config = getStatusConfig(member.status);
                return (
                  <div key={member.id} className={`flex items-center justify-between p-2.5 ${config.bgColor} rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-xs font-semibold text-white">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${config.color} rounded-full border-2 border-white`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastActivity(member.lastActivity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* On Break Members */}
        {breakMembers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-amber-600 mb-2 flex items-center gap-1">
              <Coffee className="w-3 h-3" /> On Break ({breakMembers.length})
            </p>
            <div className="space-y-2">
              {breakMembers.map((member) => {
                const config = getStatusConfig(member.status);
                return (
                  <div key={member.id} className={`flex items-center justify-between p-2.5 ${config.bgColor} rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center text-xs font-semibold text-white">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${config.color} rounded-full border-2 border-white`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Offline Members */}
        {offlineMembers.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 flex items-center gap-1">
              <WifiOff className="w-3 h-3" /> Offline ({offlineMembers.length})
            </p>
            <div className="space-y-2">
              {offlineMembers.map((member) => {
                const config = getStatusConfig(member.status);
                return (
                  <div key={member.id} className={`flex items-center justify-between p-2.5 ${config.bgColor} rounded-lg`}>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs font-semibold text-slate-600">
                          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${config.color} rounded-full border-2 border-white`}></span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium ${config.textColor}`}>{config.label}</span>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatLastActivity(member.lastActivity)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {members.length === 0 && (
          <div className="text-center py-8 text-slate-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No team members found</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default LiveTeamStatusCard;
