import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { superAdminService, PlatformStats, RevenueData } from '../../services/super-admin.service';
import {
  BuildingOffice2Icon,
  UsersIcon,
  CurrencyDollarIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftIcon,
  ArrowTrendingUpIcon,
  ArrowDownTrayIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingOrgs, setExportingOrgs] = useState(false);
  const [exportingRevenue, setExportingRevenue] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, revenue] = await Promise.all([
        superAdminService.getStats(),
        superAdminService.getRevenueAnalytics(6),
      ]);
      setStats(statsData);
      setRevenueData(revenue);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportOrganizations = async () => {
    setExportingOrgs(true);
    try {
      const blob = await superAdminService.exportOrganizations();
      superAdminService.downloadBlob(blob, 'organizations.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingOrgs(false);
    }
  };

  const handleExportRevenue = async () => {
    setExportingRevenue(true);
    try {
      const blob = await superAdminService.exportRevenue(12);
      superAdminService.downloadBlob(blob, 'revenue-report.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingRevenue(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Organizations',
      value: stats?.overview.totalOrganizations || 0,
      subValue: `${stats?.overview.activeOrganizations || 0} active`,
      icon: BuildingOffice2Icon,
      color: 'purple',
    },
    {
      title: 'Total Users',
      value: stats?.overview.totalUsers || 0,
      subValue: `${stats?.overview.activeUsers || 0} active`,
      icon: UsersIcon,
      color: 'blue',
    },
    {
      title: 'Total Revenue',
      value: `${stats?.revenue.currency || 'INR'} ${(stats?.revenue.total || 0).toLocaleString()}`,
      subValue: `${(stats?.revenue.thisMonth || 0).toLocaleString()} this month`,
      icon: CurrencyDollarIcon,
      color: 'green',
    },
    {
      title: 'New This Month',
      value: stats?.overview.newOrganizationsThisMonth || 0,
      subValue: 'organizations',
      icon: ArrowTrendingUpIcon,
      color: 'amber',
    },
  ];

  const usageCards = [
    {
      title: 'AI Calls',
      value: stats?.usage.thisMonth.aiCalls || 0,
      icon: PhoneIcon,
    },
    {
      title: 'Leads',
      value: stats?.usage.thisMonth.leads || 0,
      icon: UsersIcon,
    },
    {
      title: 'SMS',
      value: stats?.usage.thisMonth.sms || 0,
      icon: ChatBubbleLeftIcon,
    },
    {
      title: 'Emails',
      value: stats?.usage.thisMonth.emails || 0,
      icon: EnvelopeIcon,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Platform Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of all organizations and platform metrics</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/super-admin/organizations"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Create Organization
          </Link>
          <button
            onClick={handleExportOrganizations}
            disabled={exportingOrgs}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            {exportingOrgs ? 'Exporting...' : 'Export All'}
          </button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.title}
            className="bg-white rounded-xl p-6 shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.title}</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{card.value}</p>
                <p className="text-xs text-slate-400 mt-1">{card.subValue}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-${card.color}-100 flex items-center justify-center`}>
                <card.icon className={`w-6 h-6 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage This Month */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Platform Usage This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {usageCards.map((card) => (
            <div key={card.title} className="text-center p-4 bg-slate-50 rounded-lg">
              <card.icon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-2xl font-bold text-slate-800">{card.value.toLocaleString()}</p>
              <p className="text-sm text-slate-500">{card.title}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Revenue Trend</h2>
            <button
              onClick={handleExportRevenue}
              disabled={exportingRevenue}
              className="text-sm text-purple-600 hover:text-purple-700 font-medium"
            >
              {exportingRevenue ? 'Exporting...' : 'Export Report'}
            </button>
          </div>
          <div className="space-y-3">
            {revenueData.map((item) => (
              <div key={`${item.month}-${item.year}`} className="flex items-center gap-4">
                <span className="text-sm text-slate-500 w-20">{item.month} {item.year}</span>
                <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                    style={{
                      width: `${Math.min(100, (item.revenue / Math.max(...revenueData.map(r => r.revenue || 1))) * 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-slate-700 w-24 text-right">
                  {stats?.revenue.currency || 'INR'} {item.revenue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">Plan Distribution</h2>
          <div className="space-y-4">
            {stats?.planDistribution.map((plan) => {
              const percentage = Math.round((plan.count / (stats?.overview.totalOrganizations || 1)) * 100);
              return (
                <div key={plan.plan}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{plan.plan}</span>
                    <span className="text-slate-500">{plan.count} orgs ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Organizations */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-800">Top Organizations by Usage</h2>
          <Link to="/super-admin/organizations" className="text-sm text-purple-600 hover:text-purple-700 font-medium">
            View All
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                <th className="pb-3">Organization</th>
                <th className="pb-3">Plan</th>
                <th className="pb-3 text-right">AI Calls</th>
                <th className="pb-3 text-right">Leads</th>
                <th className="pb-3 text-right">SMS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats?.topOrganizations.slice(0, 5).map((org) => (
                <tr key={org.organizationId} className="text-sm">
                  <td className="py-3">
                    <Link
                      to={`/super-admin/organizations/${org.organizationId}`}
                      className="font-medium text-slate-800 hover:text-purple-600"
                    >
                      {org.organization?.name || 'Unknown'}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded capitalize">
                      {org.organization?.activePlanId || 'starter'}
                    </span>
                  </td>
                  <td className="py-3 text-right text-slate-600">{org.aiCallsCount.toLocaleString()}</td>
                  <td className="py-3 text-right text-slate-600">{org.leadsCount.toLocaleString()}</td>
                  <td className="py-3 text-right text-slate-600">{org.smsCount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
