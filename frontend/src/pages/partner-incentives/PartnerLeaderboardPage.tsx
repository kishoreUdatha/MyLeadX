import React, { useState } from 'react';
import {
  Trophy, Medal, Award, TrendingUp, Users, Target, Star, Crown,
  Calendar, Filter, ChevronDown, ArrowUp, ArrowDown, Flame,
  Gift, Zap, DollarSign
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  partnerId: string;
  partnerName: string;
  partnerType: 'SUPER_PARTNER' | 'SUB_PARTNER' | 'AGENT';
  city: string;
  totalApplications: number;
  confirmedAdmissions: number;
  conversionRate: number;
  totalEarnings: number;
  points: number;
  streak: number;
  badges: string[];
  trend: 'up' | 'down' | 'same';
  previousRank: number;
}

const mockLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    partnerId: '1',
    partnerName: 'Premier Education Partners',
    partnerType: 'SUPER_PARTNER',
    city: 'Mumbai',
    totalApplications: 156,
    confirmedAdmissions: 89,
    conversionRate: 57.1,
    totalEarnings: 890000,
    points: 8900,
    streak: 12,
    badges: ['Top Performer', 'Consistency Champion', '100 Admissions'],
    trend: 'same',
    previousRank: 1,
  },
  {
    rank: 2,
    partnerId: '4',
    partnerName: 'South India Consultants',
    partnerType: 'SUPER_PARTNER',
    city: 'Chennai',
    totalApplications: 98,
    confirmedAdmissions: 62,
    conversionRate: 63.3,
    totalEarnings: 620000,
    points: 6200,
    streak: 8,
    badges: ['Rising Star', 'High Converter'],
    trend: 'up',
    previousRank: 3,
  },
  {
    rank: 3,
    partnerId: '2',
    partnerName: 'Delhi Education Hub',
    partnerType: 'SUB_PARTNER',
    city: 'New Delhi',
    totalApplications: 45,
    confirmedAdmissions: 28,
    conversionRate: 62.2,
    totalEarnings: 280000,
    points: 2800,
    streak: 5,
    badges: ['Quality Leader'],
    trend: 'down',
    previousRank: 2,
  },
  {
    rank: 4,
    partnerId: '6',
    partnerName: 'Rajasthan Career Solutions',
    partnerType: 'SUPER_PARTNER',
    city: 'Jaipur',
    totalApplications: 67,
    confirmedAdmissions: 38,
    conversionRate: 56.7,
    totalEarnings: 380000,
    points: 3800,
    streak: 3,
    badges: ['Fast Starter'],
    trend: 'up',
    previousRank: 6,
  },
  {
    rank: 5,
    partnerId: '7',
    partnerName: 'Bengal Academic Partners',
    partnerType: 'SUB_PARTNER',
    city: 'Kolkata',
    totalApplications: 52,
    confirmedAdmissions: 32,
    conversionRate: 61.5,
    totalEarnings: 320000,
    points: 3200,
    streak: 7,
    badges: ['Steady Performer'],
    trend: 'same',
    previousRank: 5,
  },
];

const incentiveSchemes = [
  {
    id: '1',
    name: 'Monthly Top 3 Bonus',
    description: 'Extra 2% commission for top 3 performers each month',
    reward: '2% extra commission',
    status: 'active',
    endsIn: '12 days',
  },
  {
    id: '2',
    name: 'Streak Bonus',
    description: 'Maintain 5+ admissions/week for 4 consecutive weeks',
    reward: '₹25,000 bonus',
    status: 'active',
    endsIn: '26 days',
  },
  {
    id: '3',
    name: 'Quality Champion',
    description: 'Maintain 60%+ conversion rate for the quarter',
    reward: '₹50,000 bonus',
    status: 'active',
    endsIn: '45 days',
  },
];

const badges = [
  { id: '1', name: 'Top Performer', icon: <Crown className="w-5 h-5" />, color: 'bg-yellow-100 text-yellow-700', description: 'Ranked #1 in any month' },
  { id: '2', name: 'Rising Star', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-blue-100 text-blue-700', description: 'Moved up 3+ ranks in a week' },
  { id: '3', name: 'High Converter', icon: <Target className="w-5 h-5" />, color: 'bg-green-100 text-green-700', description: '60%+ conversion rate' },
  { id: '4', name: 'Consistency Champion', icon: <Flame className="w-5 h-5" />, color: 'bg-orange-100 text-orange-700', description: '10+ week streak' },
  { id: '5', name: '100 Admissions', icon: <Award className="w-5 h-5" />, color: 'bg-purple-100 text-purple-700', description: 'Reached 100 confirmed admissions' },
  { id: '6', name: 'Quality Leader', icon: <Star className="w-5 h-5" />, color: 'bg-pink-100 text-pink-700', description: 'Highest quality score in region' },
];

export function PartnerLeaderboardPage() {
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [metricFilter, setMetricFilter] = useState<'points' | 'admissions' | 'earnings' | 'conversion'>('points');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-slate-400" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600" />;
    return <span className="w-6 h-6 flex items-center justify-center text-lg font-bold text-slate-600">#{rank}</span>;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'same', previous: number, current: number) => {
    if (trend === 'up') {
      return (
        <span className="flex items-center gap-1 text-green-600 text-sm">
          <ArrowUp className="w-3 h-3" />
          {previous - current}
        </span>
      );
    }
    if (trend === 'down') {
      return (
        <span className="flex items-center gap-1 text-red-600 text-sm">
          <ArrowDown className="w-3 h-3" />
          {current - previous}
        </span>
      );
    }
    return <span className="text-slate-500 text-sm">-</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Partner Leaderboard</h1>
          <p className="text-slate-600">Track partner performance and incentive progress</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value as any)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Second Place */}
        <div className="md:order-1 bg-gradient-to-br from-slate-100 to-slate-50 rounded-xl p-6 border border-slate-200 md:mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
              <Medal className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-slate-400">2nd</p>
            <p className="font-semibold text-slate-900 mt-2">{mockLeaderboard[1].partnerName}</p>
            <p className="text-sm text-slate-500">{mockLeaderboard[1].city}</p>
            <div className="mt-4 space-y-1">
              <p className="text-lg font-bold text-slate-900">{mockLeaderboard[1].points.toLocaleString()} pts</p>
              <p className="text-sm text-green-600">{mockLeaderboard[1].confirmedAdmissions} admissions</p>
            </div>
          </div>
        </div>

        {/* First Place */}
        <div className="md:order-2 bg-gradient-to-br from-yellow-100 to-amber-50 rounded-xl p-6 border-2 border-yellow-300 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
            CHAMPION
          </div>
          <div className="text-center pt-2">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <p className="text-3xl font-bold text-yellow-600">1st</p>
            <p className="font-bold text-slate-900 text-lg mt-2">{mockLeaderboard[0].partnerName}</p>
            <p className="text-sm text-slate-500">{mockLeaderboard[0].city}</p>
            <div className="mt-4 space-y-1">
              <p className="text-2xl font-bold text-slate-900">{mockLeaderboard[0].points.toLocaleString()} pts</p>
              <p className="text-sm text-green-600 font-medium">{mockLeaderboard[0].confirmedAdmissions} admissions</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-600 font-medium">{mockLeaderboard[0].streak} week streak</span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-1 mt-4">
              {mockLeaderboard[0].badges.map((badge, i) => (
                <span key={i} className="px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Third Place */}
        <div className="md:order-3 bg-gradient-to-br from-amber-100 to-orange-50 rounded-xl p-6 border border-amber-200 md:mt-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <Medal className="w-8 h-8 text-white" />
            </div>
            <p className="text-2xl font-bold text-amber-600">3rd</p>
            <p className="font-semibold text-slate-900 mt-2">{mockLeaderboard[2].partnerName}</p>
            <p className="text-sm text-slate-500">{mockLeaderboard[2].city}</p>
            <div className="mt-4 space-y-1">
              <p className="text-lg font-bold text-slate-900">{mockLeaderboard[2].points.toLocaleString()} pts</p>
              <p className="text-sm text-green-600">{mockLeaderboard[2].confirmedAdmissions} admissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Incentive Schemes */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gift className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900">Active Incentive Schemes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {incentiveSchemes.map((scheme) => (
            <div key={scheme.id} className="bg-gradient-to-br from-primary-50 to-white rounded-lg p-4 border border-primary-100">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-slate-900">{scheme.name}</h3>
                  <p className="text-sm text-slate-600 mt-1">{scheme.description}</p>
                </div>
                <Zap className="w-5 h-5 text-primary-600" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm font-medium text-green-600">{scheme.reward}</span>
                <span className="text-xs text-slate-500">Ends in {scheme.endsIn}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Badges */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-slate-900">Achievement Badges</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          {badges.map((badge) => (
            <div key={badge.id} className="text-center">
              <div className={`w-12 h-12 ${badge.color} rounded-full flex items-center justify-center mx-auto mb-2`}>
                {badge.icon}
              </div>
              <p className="text-sm font-medium text-slate-900">{badge.name}</p>
              <p className="text-xs text-slate-500 mt-1">{badge.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Full Rankings</h2>
          <div className="flex items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
            >
              <option value="all">All Types</option>
              <option value="SUPER_PARTNER">Super Partners</option>
              <option value="SUB_PARTNER">Sub Partners</option>
              <option value="AGENT">Agents</option>
            </select>
            <select
              value={metricFilter}
              onChange={(e) => setMetricFilter(e.target.value as any)}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
            >
              <option value="points">By Points</option>
              <option value="admissions">By Admissions</option>
              <option value="earnings">By Earnings</option>
              <option value="conversion">By Conversion Rate</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-700 w-16">Rank</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Partner</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Type</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Applications</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Admissions</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Conversion</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Earnings</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-700">Points</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Streak</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-slate-700">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {mockLeaderboard.map((entry) => (
                <tr key={entry.partnerId} className={`hover:bg-slate-50 ${entry.rank <= 3 ? 'bg-yellow-50/30' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      {getRankBadge(entry.rank)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{entry.partnerName}</p>
                      <p className="text-xs text-slate-500">{entry.city}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.partnerType === 'SUPER_PARTNER' ? 'bg-purple-100 text-purple-700' :
                      entry.partnerType === 'SUB_PARTNER' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {entry.partnerType.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-900">
                    {entry.totalApplications}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-bold text-green-600">{entry.confirmedAdmissions}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`font-medium ${entry.conversionRate >= 60 ? 'text-green-600' : 'text-slate-900'}`}>
                      {entry.conversionRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(entry.totalEarnings)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-primary-600">{entry.points.toLocaleString()}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className={`w-4 h-4 ${entry.streak >= 5 ? 'text-orange-500' : 'text-slate-300'}`} />
                      <span className={`font-medium ${entry.streak >= 5 ? 'text-orange-600' : 'text-slate-600'}`}>
                        {entry.streak}w
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getTrendIcon(entry.trend, entry.previousRank, entry.rank)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
