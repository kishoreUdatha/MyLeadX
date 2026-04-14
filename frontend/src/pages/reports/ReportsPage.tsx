import { useEffect, useState } from 'react';
import api from '../../services/api';
import {
  UserGroupIcon,
  PhoneIcon,
  CurrencyRupeeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface AdmissionSummary {
  totalAdmissions: number;
  activeAdmissions: number;
  completedAdmissions: number;
  droppedAdmissions: number;
  totalFeeValue: number;
  collectedAmount: number;
  pendingAmount: number;
  collectionRate: string;
  avgFeePerAdmission: number;
}

interface AdmissionByStatus {
  status: string;
  count: number;
  percentage: string;
}

interface AdmissionByCourse {
  courseName: string;
  admissions: number;
  totalFee: number;
  avgFee: number;
  percentage: string;
}

interface CounselorPerformance {
  userId: string;
  userName: string;
  admissions: number;
  totalFeeGenerated: number;
  commissionEarned: number;
  conversionRate: string;
}

interface AdmissionTrend {
  period: string;
  admissions: number;
  feeCollected: number;
  cumulative: number;
}

interface ReportData {
  summary: AdmissionSummary;
  byStatus: AdmissionByStatus[];
  byCourse: AdmissionByCourse[];
  counselorPerformance: CounselorPerformance[];
  trends: AdmissionTrend[];
}

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('thisYear');

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const getDateParams = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (dateRange) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'thisWeek':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        break;
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'thisYear':
      default:
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const loadReports = async () => {
    try {
      setIsLoading(true);
      const params = getDateParams();
      console.log('[ReportsPage] Fetching with params:', params);

      // Fetch comprehensive admission report
      const response = await api.get('/admission-reports/comprehensive', { params });
      console.log('[ReportsPage] API Response:', response.data);

      if (response.data?.success && response.data?.data?.report) {
        console.log('[ReportsPage] Setting data:', response.data.data.report);
        setData(response.data.data.report);
      } else {
        console.log('[ReportsPage] No report data, trying fallback');
        // Fallback to individual endpoints if comprehensive fails
        const [summaryRes, statusRes, courseRes, counselorRes, trendsRes] = await Promise.all([
          api.get('/admission-reports/summary', { params }).catch(() => null),
          api.get('/admission-reports/by-status', { params }).catch(() => null),
          api.get('/admission-reports/by-course', { params }).catch(() => null),
          api.get('/admission-reports/counselor-performance', { params }).catch(() => null),
          api.get('/admission-reports/trends', { params }).catch(() => null),
        ]);

        setData({
          summary: summaryRes?.data?.data?.summary || {
            totalAdmissions: 0,
            activeAdmissions: 0,
            completedAdmissions: 0,
            droppedAdmissions: 0,
            totalFeeValue: 0,
            collectedAmount: 0,
            pendingAmount: 0,
            collectionRate: '0',
            avgFeePerAdmission: 0,
          },
          byStatus: statusRes?.data?.data?.byStatus || [],
          byCourse: courseRes?.data?.data?.byCourse || [],
          counselorPerformance: counselorRes?.data?.data?.counselorPerformance || [],
          trends: trendsRes?.data?.data?.trends || [],
        });
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="spinner spinner-lg"></span>
      </div>
    );
  }

  if (!data) return null;

  const { summary, byStatus, byCourse, counselorPerformance, trends } = data;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-slate-500 text-xs">Track admissions, performance and insights</p>
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="input text-sm py-1.5 px-3"
        >
          <option value="today">Today</option>
          <option value="thisWeek">This Week</option>
          <option value="thisMonth">This Month</option>
          <option value="lastMonth">Last Month</option>
          <option value="thisYear">This Year</option>
        </select>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total Admissions</p>
              <p className="text-xl font-bold text-slate-900">{summary.totalAdmissions}</p>
              <p className="text-xs text-slate-500 mt-1">
                {summary.completedAdmissions} enrolled
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary-100 flex-shrink-0">
              <AcademicCapIcon className="w-4 h-4 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Total Fee Value</p>
              <p className="text-xl font-bold text-slate-900">{formatCurrency(summary.totalFeeValue)}</p>
              <p className="text-xs text-slate-500 mt-1">
                Avg: {formatCurrency(summary.avgFeePerAdmission)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-success-100 flex-shrink-0">
              <BanknotesIcon className="w-4 h-4 text-success-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Collected</p>
              <p className="text-xl font-bold text-success-600">{formatCurrency(summary.collectedAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">{summary.collectionRate}% collected</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card p-3">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Pending</p>
              <p className="text-xl font-bold text-warning-600">{formatCurrency(summary.pendingAmount)}</p>
              <p className="text-xs text-slate-500 mt-1">
                {summary.activeAdmissions} in progress
              </p>
            </div>
            <div className="p-2 rounded-lg bg-warning-100 flex-shrink-0">
              <ClockIcon className="w-4 h-4 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Admission Pipeline */}
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              <FunnelIcon className="w-4 h-4 inline mr-1.5" />
              Admission Pipeline
            </h3>
          </div>
          <div className="p-3">
            {byStatus.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No admission data</p>
            ) : (
              <div className="space-y-2">
                {byStatus.map((item, index) => {
                  const colors = [
                    'bg-blue-500',
                    'bg-cyan-500',
                    'bg-teal-500',
                    'bg-yellow-500',
                    'bg-orange-500',
                    'bg-purple-500',
                    'bg-pink-500',
                    'bg-green-600',
                    'bg-emerald-600',
                    'bg-red-500',
                  ];
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-28 text-xs text-slate-600 truncate" title={item.status}>
                        {item.status.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                        <div
                          className={`${colors[index % colors.length]} h-5 rounded-full flex items-center justify-end pr-2 transition-all`}
                          style={{ width: `${Math.max(parseFloat(item.percentage), 5)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Admissions by Course */}
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Admissions by Course</h3>
          </div>
          <div className="p-3">
            {byCourse.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No course data</p>
            ) : (
              <div className="space-y-2">
                {byCourse.slice(0, 6).map((item, index) => {
                  const maxCount = Math.max(...byCourse.map((c) => c.admissions));
                  const percentage = maxCount > 0 ? (item.admissions / maxCount) * 100 : 0;
                  return (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">
                          {item.courseName}
                        </span>
                        <span className="text-xs text-slate-500">{item.admissions} ({item.percentage}%)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className="bg-primary-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Counselor Performance */}
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Top Counselors</h3>
          </div>
          <div className="p-3">
            {counselorPerformance.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No counselor data</p>
            ) : (
              <div className="space-y-2">
                {counselorPerformance.slice(0, 5).map((counselor, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{counselor.userName}</p>
                      <p className="text-[10px] text-slate-500">
                        {formatCurrency(counselor.totalFeeGenerated)} | {counselor.conversionRate}% conv.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-success-600">{counselor.admissions}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Admission Trends */}
        <div className="card">
          <div className="px-3 py-2 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">
              <CalendarIcon className="w-4 h-4 inline mr-1.5" />
              Monthly Trends
            </h3>
          </div>
          <div className="p-3">
            {trends.length === 0 ? (
              <p className="text-center text-slate-500 py-4">No trend data</p>
            ) : (
              <div className="space-y-2">
                {trends.slice(-6).map((trend, index) => {
                  const maxAdmissions = Math.max(...trends.map((t) => t.admissions));
                  const percentage = maxAdmissions > 0 ? (trend.admissions / maxAdmissions) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-16 text-xs text-slate-600">{trend.period}</div>
                      <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                        <div
                          className="bg-primary-500 h-5 rounded-full flex items-center justify-end pr-2 transition-all"
                          style={{ width: `${Math.max(percentage, 10)}%` }}
                        >
                          <span className="text-[10px] text-white font-medium">{trend.admissions}</span>
                        </div>
                      </div>
                      <div className="w-20 text-right text-xs text-slate-500">
                        {formatCurrency(trend.feeCollected)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
