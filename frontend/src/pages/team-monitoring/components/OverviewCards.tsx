/**
 * Overview Cards Component
 * Displays key metrics in a card grid layout
 */

import React from 'react';
import {
  Phone,
  PhoneCall,
  Clock,
  TrendingUp,
  AlertCircle,
  Users,
  Target,
  CheckCircle,
} from 'lucide-react';
import { TeamOverview } from '../team-monitoring.types';

interface OverviewCardsProps {
  data: TeamOverview | null;
  loading: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBgColor: string;
  trend?: { value: number; isPositive: boolean };
  loading?: boolean;
}

function MetricCard({ title, value, subtitle, icon, iconBgColor, trend, loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-24 mb-3"></div>
          <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
          <div className="h-3 bg-slate-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
          {trend && (
            <p className={`text-xs mt-2 ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}% from last period
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  }
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

export function OverviewCards({ data, loading }: OverviewCardsProps) {
  const cards: MetricCardProps[] = [
    {
      title: 'Total Calls',
      value: data?.totalCalls?.toLocaleString() || '0',
      subtitle: `${data?.answeredCalls?.toLocaleString() || 0} answered`,
      icon: <Phone className="w-5 h-5 text-blue-600" />,
      iconBgColor: 'bg-blue-50',
      loading,
    },
    {
      title: 'Conversion Rate',
      value: `${data?.conversionRate?.toFixed(1) || 0}%`,
      subtitle: `${data?.convertedLeads || 0} of ${data?.totalLeads || 0} leads`,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
      iconBgColor: 'bg-emerald-50',
      loading,
    },
    {
      title: 'Avg Response Time',
      value: formatDuration(data?.avgResponseTime || 0),
      subtitle: 'Time to first contact',
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      iconBgColor: 'bg-amber-50',
      loading,
    },
    {
      title: 'Pending Follow-ups',
      value: data?.pendingFollowUps?.toLocaleString() || '0',
      subtitle: `${data?.overdueFollowUps || 0} overdue`,
      icon: <AlertCircle className="w-5 h-5 text-orange-600" />,
      iconBgColor: 'bg-orange-50',
      loading,
    },
    {
      title: 'Team Members',
      value: data?.totalTeamMembers?.toString() || '0',
      subtitle: `${data?.activeTeamMembers || 0} active this period`,
      icon: <Users className="w-5 h-5 text-purple-600" />,
      iconBgColor: 'bg-purple-50',
      loading,
    },
    {
      title: 'Total Leads',
      value: data?.totalLeads?.toLocaleString() || '0',
      subtitle: 'In the selected period',
      icon: <Target className="w-5 h-5 text-indigo-600" />,
      iconBgColor: 'bg-indigo-50',
      loading,
    },
    {
      title: 'Answered Calls',
      value: data?.answeredCalls?.toLocaleString() || '0',
      subtitle: data?.totalCalls ? `${((data.answeredCalls / data.totalCalls) * 100).toFixed(1)}% answer rate` : 'No calls',
      icon: <PhoneCall className="w-5 h-5 text-teal-600" />,
      iconBgColor: 'bg-teal-50',
      loading,
    },
    {
      title: 'Converted Leads',
      value: data?.convertedLeads?.toLocaleString() || '0',
      subtitle: 'Successfully converted',
      icon: <CheckCircle className="w-5 h-5 text-green-600" />,
      iconBgColor: 'bg-green-50',
      loading,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <MetricCard key={index} {...card} />
      ))}
    </div>
  );
}
