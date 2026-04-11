import { useEffect, useState } from 'react';
import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  BuildingLibraryIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  FunnelIcon,
  DocumentArrowDownIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import {
  admissionReportsService,
  ComprehensiveAdmissionReport,
  ReportFilters,
} from '../../services/admission-reports.service';

type TabType = 'overview' | 'universities' | 'counselors' | 'commission';

export default function AdmissionReportsPage() {
  const [report, setReport] = useState<ComprehensiveAdmissionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [trendInterval, setTrendInterval] = useState<'day' | 'week' | 'month'>('month');
  const [filters, setFilters] = useState<ReportFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Date presets - Academic Year based
  const datePresets = [
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'This Quarter', value: 'thisQuarter' },
    { label: 'Academic Year', value: 'academicYear' },
    { label: 'Last Year', value: 'lastYear' },
    { label: 'Custom', value: 'custom' },
  ];
  const [datePreset, setDatePreset] = useState('academicYear');

  useEffect(() => {
    applyDatePreset(datePreset);
  }, [datePreset]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      loadReport();
    }
  }, [filters]);

  const applyDatePreset = (preset: string) => {
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (preset) {
      case 'thisMonth':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), quarter * 3, 1);
        break;
      case 'academicYear':
        // Academic year: April to March
        const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        start = new Date(year, 3, 1); // April 1st
        end = new Date(year + 1, 2, 31); // March 31st
        break;
      case 'lastYear':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }

    setFilters({
      ...filters,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    });
  };

  const loadReport = async () => {
    try {
      setIsLoading(true);
      const data = await admissionReportsService.getComprehensive(filters);
      setReport(data);
    } catch (error) {
      toast.error('Failed to load admission reports');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)} Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)} L`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthColor = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return 'text-success-600';
    if (value < 0) return 'text-danger-600';
    return 'text-slate-600';
  };

  const getGrowthIcon = (growth: string) => {
    const value = parseFloat(growth);
    if (value > 0) return <ArrowTrendingUpIcon className="w-3 h-3 text-success-500" />;
    if (value < 0) return <ArrowTrendingDownIcon className="w-3 h-3 text-danger-500" />;
    return null;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!report) return null;

  const { summary, byUniversity, byCourse, byType, byStatus, counselorPerformance, trends, commission, yearOverYear } = report;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Admission Reports</h1>
          <p className="text-slate-500 text-xs">Enrollment analytics and performance tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={datePreset}
            onChange={(e) => setDatePreset(e.target.value)}
            className="input text-sm py-1.5 px-3"
          >
            {datePresets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-secondary py-1.5 px-3 ${showFilters ? 'bg-primary-100' : ''}`}
          >
            <FunnelIcon className="w-4 h-4" />
          </button>
          <button onClick={loadReport} className="btn btn-secondary py-1.5 px-3">
            <ArrowPathIcon className="w-4 h-4" />
          </button>
          <button className="btn btn-secondary py-1.5 px-3">
            <DocumentArrowDownIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Custom Filters */}
      {showFilters && (
        <div className="card p-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, startDate: e.target.value });
                }}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => {
                  setDatePreset('custom');
                  setFilters({ ...filters, endDate: e.target.value });
                }}
                className="input text-sm py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">University</label>
              <select
                value={filters.universityId || ''}
                onChange={(e) => setFilters({ ...filters, universityId: e.target.value || undefined })}
                className="input text-sm py-1.5"
              >
                <option value="">All Universities</option>
                {byUniversity.map((u) => (
                  <option key={u.universityId} value={u.universityId}>
                    {u.universityName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
              <select
                value={filters.branchId || ''}
                onChange={(e) => setFilters({ ...filters, branchId: e.target.value || undefined })}
                className="input text-sm py-1.5"
              >
                <option value="">All Branches</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total Admissions</p>
              <p className="text-xl font-bold text-slate-900">{summary.totalAdmissions}</p>
              <div className="flex items-center gap-1 mt-1">
                {getGrowthIcon(yearOverYear.growth.admissions)}
                <span className={`text-xs font-medium ${getGrowthColor(yearOverYear.growth.admissions)}`}>
                  {yearOverYear.growth.admissions}% YoY
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-primary-100 flex-shrink-0">
              <AcademicCapIcon className="w-5 h-5 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total Fee Value</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalFeeValue)}</p>
              <div className="flex items-center gap-1 mt-1">
                {getGrowthIcon(yearOverYear.growth.fee)}
                <span className={`text-xs font-medium ${getGrowthColor(yearOverYear.growth.fee)}`}>
                  {yearOverYear.growth.fee}% YoY
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-success-100 flex-shrink-0">
              <CurrencyRupeeIcon className="w-5 h-5 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="text-xl font-bold text-success-600">{formatCurrency(summary.collectedAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.collectionRate}% collection rate</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Commission Earned</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(commission.totalCommission)}</p>
              <div className="flex items-center gap-1 mt-1">
                {getGrowthIcon(yearOverYear.growth.commission)}
                <span className={`text-xs font-medium ${getGrowthColor(yearOverYear.growth.commission)}`}>
                  {yearOverYear.growth.commission}% YoY
                </span>
              </div>
            </div>
            <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
              <ChartBarIcon className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex gap-4">
          {[
            { key: 'overview', label: 'Overview', icon: AcademicCapIcon },
            { key: 'universities', label: 'Universities', icon: BuildingLibraryIcon, badge: byUniversity.length },
            { key: 'counselors', label: 'Counselors', icon: UserGroupIcon },
            { key: 'commission', label: 'Commission', icon: CurrencyRupeeIcon },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as TabType)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Admission Trends */}
          <div className="card lg:col-span-2">
            <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Admission Trends</h3>
              <div className="flex gap-1">
                {(['day', 'week', 'month'] as const).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => setTrendInterval(interval)}
                    className={`px-2 py-1 text-xs rounded ${
                      trendInterval === interval
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {interval.charAt(0).toUpperCase() + interval.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3">
              {trends.length === 0 ? (
                <div className="text-center py-8 text-slate-500">No data for selected period</div>
              ) : (
                <div className="space-y-2">
                  {trends.slice(-12).map((trend, index) => {
                    const maxAdmissions = Math.max(...trends.map((t) => t.admissions));
                    const percent = maxAdmissions > 0 ? (trend.admissions / maxAdmissions) * 100 : 0;
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-16 text-xs text-slate-600 font-medium">
                          {trend.period.slice(-7)}
                        </div>
                        <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden">
                          <div
                            className="bg-primary-500 h-full rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${Math.max(percent, 10)}%` }}
                          >
                            <span className="text-[10px] text-white font-medium">{trend.admissions}</span>
                          </div>
                        </div>
                        <div className="w-20 text-right">
                          <span className="text-xs text-slate-500">{formatCurrency(trend.feeCollected)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Admission Pipeline (By Status) */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">
                <FunnelIcon className="w-4 h-4 inline mr-1.5" />
                Admission Pipeline
              </h3>
            </div>
            <div className="p-3">
              <div className="space-y-2">
                {byStatus.map((status, index) => {
                  const colors = [
                    'bg-slate-400', 'bg-blue-400', 'bg-cyan-400', 'bg-teal-400',
                    'bg-yellow-400', 'bg-orange-400', 'bg-amber-400',
                    'bg-green-500', 'bg-emerald-600', 'bg-red-500'
                  ];
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-28 text-xs text-slate-600 truncate" title={status.status}>
                        {status.status.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`${colors[index % colors.length]} h-5 rounded-full flex items-center justify-end pr-2 transition-all`}
                          style={{ width: `${Math.max(parseFloat(status.percentage), 5)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{status.count}</span>
                        </div>
                      </div>
                      <div className="w-12 text-right text-xs text-slate-500">{status.percentage}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* By Admission Type */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">By Admission Type</h3>
            </div>
            <div className="p-3">
              {byType.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">No data</div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {byType.map((type, index) => {
                    const colors = [
                      { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
                      { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
                      { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
                      { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
                    ];
                    const color = colors[index % colors.length];
                    return (
                      <div key={index} className={`${color.bg} border ${color.border} rounded-lg p-2`}>
                        <p className={`text-lg font-bold ${color.text}`}>{type.count}</p>
                        <p className="text-xs text-slate-600">{type.type}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Avg: {formatCurrency(type.avgFee)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* By Course */}
          <div className="card lg:col-span-2">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Top Courses</h3>
            </div>
            <div className="p-3">
              {byCourse.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm">No course data</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {byCourse.slice(0, 8).map((course, index) => (
                    <div key={index} className="p-2 bg-slate-50 rounded-lg">
                      <p className="text-xs font-medium text-slate-900 truncate" title={course.courseName}>
                        {course.courseName}
                      </p>
                      <p className="text-lg font-bold text-primary-600">{course.admissions}</p>
                      <p className="text-[10px] text-slate-500">
                        {formatCurrency(course.totalFee)} total
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'universities' && (
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">University-wise Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">University</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Admissions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Total Fee</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Collected</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Pending</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byUniversity.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-slate-500">
                      No university data
                    </td>
                  </tr>
                ) : (
                  byUniversity.map((uni) => (
                    <tr key={uni.universityId} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <BuildingLibraryIcon className="w-4 h-4 text-slate-400" />
                          <p className="text-sm font-medium text-slate-900">{uni.universityName}</p>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm font-bold text-slate-900 text-right">
                        {uni.admissions}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600 text-right">
                        {formatCurrency(uni.totalFee)}
                      </td>
                      <td className="px-3 py-2 text-sm text-success-600 font-medium text-right">
                        {formatCurrency(uni.collected)}
                      </td>
                      <td className="px-3 py-2 text-sm text-warning-600 text-right">
                        {formatCurrency(uni.pending)}
                      </td>
                      <td className="px-3 py-2 text-sm text-purple-600 font-medium text-right">
                        {formatCurrency(uni.commissionEarned)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {byUniversity.length > 0 && (
                <tfoot className="bg-slate-100">
                  <tr>
                    <td className="px-3 py-2 text-sm font-bold text-slate-900">Total</td>
                    <td className="px-3 py-2 text-sm font-bold text-slate-900 text-right">
                      {byUniversity.reduce((sum, u) => sum + u.admissions, 0)}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-slate-900 text-right">
                      {formatCurrency(byUniversity.reduce((sum, u) => sum + u.totalFee, 0))}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-success-600 text-right">
                      {formatCurrency(byUniversity.reduce((sum, u) => sum + u.collected, 0))}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-warning-600 text-right">
                      {formatCurrency(byUniversity.reduce((sum, u) => sum + u.pending, 0))}
                    </td>
                    <td className="px-3 py-2 text-sm font-bold text-purple-600 text-right">
                      {formatCurrency(byUniversity.reduce((sum, u) => sum + u.commissionEarned, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {activeTab === 'counselors' && (
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Counselor Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Counselor</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Admissions</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Fee Generated</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Avg Fee</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Commission</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {counselorPerformance.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                      No counselor data
                    </td>
                  </tr>
                ) : (
                  counselorPerformance.map((counselor, index) => (
                    <tr key={counselor.userId} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            index === 0
                              ? 'bg-yellow-500'
                              : index === 1
                              ? 'bg-slate-400'
                              : index === 2
                              ? 'bg-orange-400'
                              : 'bg-slate-300'
                          }`}
                        >
                          {index + 1}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-slate-900">{counselor.userName}</p>
                      </td>
                      <td className="px-3 py-2 text-sm font-bold text-primary-600 text-right">
                        {counselor.admissions}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600 text-right">
                        {formatCurrency(counselor.totalFeeGenerated)}
                      </td>
                      <td className="px-3 py-2 text-sm text-slate-600 text-right">
                        {formatCurrency(counselor.avgFeePerAdmission)}
                      </td>
                      <td className="px-3 py-2 text-sm text-purple-600 font-medium text-right">
                        {formatCurrency(counselor.commissionEarned)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className={`text-sm font-medium ${
                          parseFloat(counselor.conversionRate) >= 20 ? 'text-success-600' :
                          parseFloat(counselor.conversionRate) >= 10 ? 'text-warning-600' : 'text-slate-600'
                        }`}>
                          {counselor.conversionRate}%
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'commission' && (
        <div className="space-y-3">
          {/* Commission Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(commission.totalCommission)}</p>
              <p className="text-xs text-slate-500">Total Commission</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-success-600">{formatCurrency(commission.receivedCommission)}</p>
              <p className="text-xs text-slate-500">Received</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-warning-600">{formatCurrency(commission.pendingCommission)}</p>
              <p className="text-xs text-slate-500">Pending</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-2xl font-bold text-slate-900">{commission.avgCommissionPercent.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Avg Commission %</p>
            </div>
          </div>

          {/* Commission by University */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Commission by University</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">University</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-slate-500">Commission</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commission.byUniversity.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-3 py-8 text-center text-slate-500">
                        No commission data
                      </td>
                    </tr>
                  ) : (
                    commission.byUniversity.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm font-medium text-slate-900">{item.university}</td>
                        <td className="px-3 py-2 text-sm font-bold text-purple-600 text-right">
                          {formatCurrency(item.commission)}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            item.status === 'RECEIVED'
                              ? 'bg-success-100 text-success-700'
                              : 'bg-warning-100 text-warning-700'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Year-over-Year Comparison */}
          <div className="card">
            <div className="px-3 py-2 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-900">Year-over-Year Comparison</h3>
            </div>
            <div className="p-3">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Admissions</p>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{yearOverYear.currentYear.admissions}</p>
                      <p className="text-[10px] text-slate-500">This Year</p>
                    </div>
                    <div className="text-slate-300">vs</div>
                    <div>
                      <p className="text-lg font-bold text-slate-400">{yearOverYear.previousYear.admissions}</p>
                      <p className="text-[10px] text-slate-500">Last Year</p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-center gap-1 mt-2 ${getGrowthColor(yearOverYear.growth.admissions)}`}>
                    {getGrowthIcon(yearOverYear.growth.admissions)}
                    <span className="text-sm font-medium">{yearOverYear.growth.admissions}%</span>
                  </div>
                </div>

                <div className="text-center border-x border-slate-100">
                  <p className="text-xs text-slate-500 mb-2">Fee Revenue</p>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(yearOverYear.currentYear.fee)}</p>
                      <p className="text-[10px] text-slate-500">This Year</p>
                    </div>
                    <div className="text-slate-300">vs</div>
                    <div>
                      <p className="text-lg font-bold text-slate-400">{formatCurrency(yearOverYear.previousYear.fee)}</p>
                      <p className="text-[10px] text-slate-500">Last Year</p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-center gap-1 mt-2 ${getGrowthColor(yearOverYear.growth.fee)}`}>
                    {getGrowthIcon(yearOverYear.growth.fee)}
                    <span className="text-sm font-medium">{yearOverYear.growth.fee}%</span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-2">Commission</p>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(yearOverYear.currentYear.commission)}</p>
                      <p className="text-[10px] text-slate-500">This Year</p>
                    </div>
                    <div className="text-slate-300">vs</div>
                    <div>
                      <p className="text-lg font-bold text-slate-400">{formatCurrency(yearOverYear.previousYear.commission)}</p>
                      <p className="text-[10px] text-slate-500">Last Year</p>
                    </div>
                  </div>
                  <div className={`flex items-center justify-center gap-1 mt-2 ${getGrowthColor(yearOverYear.growth.commission)}`}>
                    {getGrowthIcon(yearOverYear.growth.commission)}
                    <span className="text-sm font-medium">{yearOverYear.growth.commission}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
