import React, { useState } from 'react';
import {
  Gift, Plus, Edit, Trash2, Eye, Calendar, Users, Target, Award,
  CheckCircle, XCircle, Clock, TrendingUp, DollarSign, Percent,
  AlertTriangle, MoreHorizontal, Zap, Star, Crown, Medal
} from 'lucide-react';

interface IncentiveScheme {
  id: string;
  name: string;
  description: string;
  type: 'MILESTONE' | 'STREAK' | 'RANKING' | 'QUALITY' | 'SEASONAL';
  status: 'ACTIVE' | 'DRAFT' | 'ENDED' | 'UPCOMING';
  rewardType: 'BONUS' | 'EXTRA_COMMISSION' | 'POINTS' | 'BADGE';
  rewardValue: string;
  criteria: string;
  startDate: string;
  endDate: string;
  participants: number;
  achieved: number;
  totalPayout: number;
}

const mockSchemes: IncentiveScheme[] = [
  {
    id: '1',
    name: 'Monthly Top 3 Bonus',
    description: 'Top 3 performing partners each month get extra 2% commission on all admissions',
    type: 'RANKING',
    status: 'ACTIVE',
    rewardType: 'EXTRA_COMMISSION',
    rewardValue: '2% extra commission',
    criteria: 'Rank in top 3 by confirmed admissions',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    participants: 45,
    achieved: 3,
    totalPayout: 125000,
  },
  {
    id: '2',
    name: 'Streak Champion',
    description: 'Maintain 5+ admissions per week for 4 consecutive weeks',
    type: 'STREAK',
    status: 'ACTIVE',
    rewardType: 'BONUS',
    rewardValue: '₹25,000 flat bonus',
    criteria: '5+ admissions/week for 4 weeks',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    participants: 28,
    achieved: 5,
    totalPayout: 125000,
  },
  {
    id: '3',
    name: 'Quality Excellence',
    description: 'Maintain 60%+ conversion rate for the entire quarter',
    type: 'QUALITY',
    status: 'ACTIVE',
    rewardType: 'BONUS',
    rewardValue: '₹50,000 bonus',
    criteria: '60%+ conversion rate for Q1',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    participants: 32,
    achieved: 8,
    totalPayout: 400000,
  },
  {
    id: '4',
    name: '100 Admissions Milestone',
    description: 'Reach 100 confirmed admissions milestone',
    type: 'MILESTONE',
    status: 'ACTIVE',
    rewardType: 'BADGE',
    rewardValue: 'Century Champion Badge + ₹10,000',
    criteria: 'Reach 100 total confirmed admissions',
    startDate: '2023-01-01',
    endDate: '2024-12-31',
    participants: 45,
    achieved: 12,
    totalPayout: 120000,
  },
  {
    id: '5',
    name: 'Summer Admission Rush',
    description: 'Special bonus for admissions during peak summer season',
    type: 'SEASONAL',
    status: 'UPCOMING',
    rewardType: 'EXTRA_COMMISSION',
    rewardValue: '3% extra commission',
    criteria: 'All admissions between May-July',
    startDate: '2024-05-01',
    endDate: '2024-07-31',
    participants: 0,
    achieved: 0,
    totalPayout: 0,
  },
  {
    id: '6',
    name: 'New Partner Kickstart',
    description: 'Bonus for new partners achieving 10 admissions in first 30 days',
    type: 'MILESTONE',
    status: 'DRAFT',
    rewardType: 'BONUS',
    rewardValue: '₹15,000 welcome bonus',
    criteria: '10 admissions in first 30 days',
    startDate: '2024-02-01',
    endDate: '2024-12-31',
    participants: 0,
    achieved: 0,
    totalPayout: 0,
  },
];

const typeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  MILESTONE: { label: 'Milestone', color: 'bg-purple-100 text-purple-700', icon: <Target className="w-3 h-3" /> },
  STREAK: { label: 'Streak', color: 'bg-orange-100 text-orange-700', icon: <Zap className="w-3 h-3" /> },
  RANKING: { label: 'Ranking', color: 'bg-yellow-100 text-yellow-700', icon: <Crown className="w-3 h-3" /> },
  QUALITY: { label: 'Quality', color: 'bg-green-100 text-green-700', icon: <Star className="w-3 h-3" /> },
  SEASONAL: { label: 'Seasonal', color: 'bg-blue-100 text-blue-700', icon: <Calendar className="w-3 h-3" /> },
};

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ACTIVE: { label: 'Active', color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: <Clock className="w-3 h-3" /> },
  ENDED: { label: 'Ended', color: 'bg-red-100 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  UPCOMING: { label: 'Upcoming', color: 'bg-blue-100 text-blue-700', icon: <Calendar className="w-3 h-3" /> },
};

export function IncentiveSchemesPage() {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredSchemes = mockSchemes.filter(scheme => {
    const matchesStatus = statusFilter === 'all' || scheme.status === statusFilter;
    const matchesType = typeFilter === 'all' || scheme.type === typeFilter;
    return matchesStatus && matchesType;
  });

  const stats = {
    totalActive: mockSchemes.filter(s => s.status === 'ACTIVE').length,
    totalParticipants: mockSchemes.reduce((sum, s) => sum + s.participants, 0),
    totalAchieved: mockSchemes.reduce((sum, s) => sum + s.achieved, 0),
    totalPayout: mockSchemes.reduce((sum, s) => sum + s.totalPayout, 0),
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Incentive Schemes</h1>
          <p className="text-slate-600">Manage partner incentive programs and bonuses</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-4 h-4" />
          Create Scheme
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Gift className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalActive}</p>
              <p className="text-sm text-slate-600">Active Schemes</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalParticipants}</p>
              <p className="text-sm text-slate-600">Total Participants</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalAchieved}</p>
              <p className="text-sm text-slate-600">Goals Achieved</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-900">{formatCurrency(stats.totalPayout)}</p>
              <p className="text-sm text-slate-600">Total Payouts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="UPCOMING">Upcoming</option>
          <option value="DRAFT">Draft</option>
          <option value="ENDED">Ended</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Types</option>
          <option value="MILESTONE">Milestone</option>
          <option value="STREAK">Streak</option>
          <option value="RANKING">Ranking</option>
          <option value="QUALITY">Quality</option>
          <option value="SEASONAL">Seasonal</option>
        </select>
      </div>

      {/* Schemes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSchemes.map((scheme) => (
          <div key={scheme.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow">
            <div className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${typeConfig[scheme.type]?.color}`}>
                    {typeConfig[scheme.type]?.icon}
                    {typeConfig[scheme.type]?.label}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[scheme.status]?.color}`}>
                    {statusConfig[scheme.status]?.icon}
                    {statusConfig[scheme.status]?.label}
                  </span>
                </div>
                <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              <h3 className="font-semibold text-slate-900 mb-2">{scheme.name}</h3>
              <p className="text-sm text-slate-600 mb-4 line-clamp-2">{scheme.description}</p>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Reward</span>
                  <span className="font-medium text-green-600">{scheme.rewardValue}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Duration</span>
                  <span className="text-slate-700">{formatDate(scheme.startDate)} - {formatDate(scheme.endDate)}</span>
                </div>
              </div>

              {scheme.status === 'ACTIVE' && (
                <div className="bg-slate-50 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-slate-600">Progress</span>
                    <span className="font-medium text-slate-900">
                      {scheme.achieved} / {scheme.participants} achieved
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 rounded-full">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${scheme.participants > 0 ? (scheme.achieved / scheme.participants) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-1 text-slate-500">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{scheme.participants} participants</span>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-slate-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                  {scheme.status === 'DRAFT' && (
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Scheme Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create Incentive Scheme</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Monthly Top Performer Bonus"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
                <textarea
                  placeholder="Describe the scheme and how partners can qualify..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Scheme Type *</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select type</option>
                    <option value="MILESTONE">Milestone</option>
                    <option value="STREAK">Streak</option>
                    <option value="RANKING">Ranking</option>
                    <option value="QUALITY">Quality</option>
                    <option value="SEASONAL">Seasonal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reward Type *</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500">
                    <option value="">Select reward</option>
                    <option value="BONUS">Flat Bonus</option>
                    <option value="EXTRA_COMMISSION">Extra Commission %</option>
                    <option value="POINTS">Points</option>
                    <option value="BADGE">Badge + Bonus</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reward Value *</label>
                <input
                  type="text"
                  placeholder="e.g., ₹25,000 or 2% extra"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Criteria / Rules *</label>
                <textarea
                  placeholder="Define the criteria partners must meet..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Eligible Partner Types</label>
                <div className="flex items-center gap-4 mt-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">Super Partners</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">Sub Partners</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                    <span className="text-sm text-slate-700">Agents</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button className="px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50">
                Save as Draft
              </button>
              <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Create & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
