/**
 * Reports Listing Page
 * Shows all 15 reports organized in two category boxes side by side
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserGroupIcon,
  PhoneIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon,
  MegaphoneIcon,
  FunnelIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface ReportItem {
  id: string;
  name: string;
  description: string;
  category: 'User Reports' | 'Campaign Reports';
  icon: React.ElementType;
  path: string;
  color: string;
}

const reports: ReportItem[] = [
  // User Reports
  {
    id: 'user-report',
    name: 'User Report',
    description: 'All in one user report with comprehensive metrics',
    category: 'User Reports',
    icon: UserGroupIcon,
    path: '/reports/user',
    color: 'bg-blue-500',
  },
  {
    id: 'user-activity',
    name: 'User Activity Report',
    description: 'Insights into breaks information and calling metrics',
    category: 'User Reports',
    icon: ClockIcon,
    path: '/reports/user-activity',
    color: 'bg-indigo-500',
  },
  {
    id: 'lead-disposition',
    name: 'Lead Disposition Report',
    description: 'Analysis of calls connected, not connected along with status wise count',
    category: 'User Reports',
    icon: FunnelIcon,
    path: '/reports/lead-disposition',
    color: 'bg-purple-500',
  },
  {
    id: 'user-stage',
    name: 'User Stage Report',
    description: 'Shows lead stage distribution by user across campaigns',
    category: 'User Reports',
    icon: ChartBarIcon,
    path: '/reports/user-stage',
    color: 'bg-pink-500',
  },
  {
    id: 'user-call',
    name: 'User Call Report',
    description: 'Insights into call related activities of the users',
    category: 'User Reports',
    icon: PhoneIcon,
    path: '/reports/user-call',
    color: 'bg-green-500',
  },
  {
    id: 'followup',
    name: 'Follow-Up Report',
    description: 'Details like missed and due follow ups by the user',
    category: 'User Reports',
    icon: CalendarDaysIcon,
    path: '/reports/followup',
    color: 'bg-orange-500',
  },
  {
    id: 'login',
    name: 'Login Report',
    description: 'Hourly report and other login activities of the users',
    category: 'User Reports',
    icon: ArrowPathIcon,
    path: '/reports/login',
    color: 'bg-cyan-500',
  },
  {
    id: 'message-activity',
    name: 'Message Activity Report',
    description: 'Details of messaging activities across WhatsApp, SMS, and email',
    category: 'User Reports',
    icon: ChatBubbleLeftRightIcon,
    path: '/reports/message-activity',
    color: 'bg-teal-500',
  },
  {
    id: 'user-deal',
    name: 'User Deal Report',
    description: 'Track deals in-progress, won, and lost by each user',
    category: 'User Reports',
    icon: CurrencyDollarIcon,
    path: '/reports/user-deal',
    color: 'bg-emerald-500',
  },
  {
    id: 'user-task',
    name: 'User Task Report',
    description: 'Tracks user task completion, pending, and overdue tasks',
    category: 'User Reports',
    icon: ClipboardDocumentListIcon,
    path: '/reports/user-task',
    color: 'bg-amber-500',
  },
  // Campaign Reports
  {
    id: 'campaign',
    name: 'Campaign Report',
    description: 'Calls related data along with lost and converted count of leads',
    category: 'Campaign Reports',
    icon: MegaphoneIcon,
    path: '/reports/campaign',
    color: 'bg-red-500',
  },
  {
    id: 'campaign-lead',
    name: 'Campaign Lead Report',
    description: 'Tracks campaign lead progress through statuses',
    category: 'Campaign Reports',
    icon: DocumentTextIcon,
    path: '/reports/campaign-lead',
    color: 'bg-rose-500',
  },
  {
    id: 'campaign-stage',
    name: 'Campaign Stage Report',
    description: 'Tracks campaign lead progress through stages',
    category: 'Campaign Reports',
    icon: ChartBarIcon,
    path: '/reports/campaign-stage',
    color: 'bg-fuchsia-500',
  },
  {
    id: 'campaign-deal',
    name: 'Campaign Deal Report',
    description: 'Tracks deals in-progress, won, and lost for each campaign',
    category: 'Campaign Reports',
    icon: CurrencyDollarIcon,
    path: '/reports/campaign-deal',
    color: 'bg-violet-500',
  },
  {
    id: 'campaign-source',
    name: 'Campaign Source Report',
    description: 'Shows lead count by campaign and their respective sources',
    category: 'Campaign Reports',
    icon: FunnelIcon,
    path: '/reports/campaign-source',
    color: 'bg-sky-500',
  },
];

export default function ReportsListingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const userReports = filteredReports.filter(r => r.category === 'User Reports');
  const campaignReports = filteredReports.filter(r => r.category === 'Campaign Reports');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="text-slate-500 text-sm">Access all your reports and analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-9 pr-4 py-2 text-sm w-64 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Two Column Layout - User Reports & Campaign Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Reports Box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Box Header */}
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <UserGroupIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">User Reports</h2>
                <p className="text-blue-100 text-sm">{userReports.length} reports available</p>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="divide-y divide-slate-100">
            {userReports.length > 0 ? (
              userReports.map((report, index) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  index={index + 1}
                  onClick={() => navigate(report.path)}
                />
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No user reports match your search
              </div>
            )}
          </div>
        </div>

        {/* Campaign Reports Box */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Box Header */}
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <MegaphoneIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Campaign Reports</h2>
                <p className="text-red-100 text-sm">{campaignReports.length} reports available</p>
              </div>
            </div>
          </div>

          {/* Reports List */}
          <div className="divide-y divide-slate-100">
            {campaignReports.length > 0 ? (
              campaignReports.map((report, index) => (
                <ReportListItem
                  key={report.id}
                  report={report}
                  index={index + 1}
                  onClick={() => navigate(report.path)}
                />
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">
                No campaign reports match your search
              </div>
            )}
          </div>
        </div>
      </div>

      {/* No Results */}
      {filteredReports.length === 0 && (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No reports found</h3>
          <p className="text-sm text-slate-500">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}

interface ReportListItemProps {
  report: ReportItem;
  index: number;
  onClick: () => void;
}

function ReportListItem({ report, index, onClick }: ReportListItemProps) {
  const Icon = report.icon;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
    >
      {/* Index Number */}
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-semibold text-slate-600 flex-shrink-0">
        {index}
      </div>

      {/* Icon */}
      <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
        <Icon className="w-5 h-5 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-slate-900 group-hover:text-primary-600 transition-colors">
          {report.name}
        </h3>
        <p className="text-xs text-slate-500 truncate">
          {report.description}
        </p>
      </div>

      {/* Arrow */}
      <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </div>
  );
}
