/**
 * Follow-Up Report - Detailed follow-up tracking with lead information
 */
import { useState, useEffect } from 'react';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface FollowUpRow {
  no: number;
  username: string;
  reportingManager: string;
  leadName: string;
  leadMobile: string;
  leadSource: string;
  followUpDate: string;
  followUpTime: string;
  followUpType: string;
  status: string;
  priority: string;
  remarks: string;
  lastContactDate: string;
  nextAction: string;
  daysOverdue: number;
}

export default function FollowUpReportPage() {
  const [data, setData] = useState<{ followUps: FollowUpRow[]; summary: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [searchValue, setSearchValue] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0],
    };
  });

  useEffect(() => { loadData(); }, [dateRange]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Call the comprehensive follow-up report API
      const response = await api.get('/followup-reports/comprehensive', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      const report = response.data.data.report;
      const now = new Date();

      // Combine all follow-ups from schedule and overdue
      const allFollowUps: any[] = [];

      // Add today's follow-ups
      if (report.schedule?.today) {
        report.schedule.today.forEach((f: any) => allFollowUps.push({ ...f, status: 'Pending' }));
      }

      // Add tomorrow's follow-ups
      if (report.schedule?.tomorrow) {
        report.schedule.tomorrow.forEach((f: any) => allFollowUps.push({ ...f, status: 'Pending' }));
      }

      // Add this week's follow-ups
      if (report.schedule?.thisWeek) {
        report.schedule.thisWeek.forEach((f: any) => allFollowUps.push({ ...f, status: 'Pending' }));
      }

      // Add overdue follow-ups
      if (report.overdue) {
        report.overdue.forEach((f: any) => allFollowUps.push({ ...f, status: 'Missed' }));
      }

      // Map to table format with all columns preserved
      const followUps: FollowUpRow[] = allFollowUps.map((f: any, index: number) => {
        const scheduledDate = new Date(f.scheduledAt);

        // Calculate days overdue from follow-up date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const followUpDay = new Date(scheduledDate);
        followUpDay.setHours(0, 0, 0, 0);
        const diffTime = today.getTime() - followUpDay.getTime();
        const daysOverdue = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        // Format last contact date from lead
        const lastContact = f.lastContactedAt ? new Date(f.lastContactedAt).toISOString().split('T')[0] : '-';

        // Combine message and notes for remarks
        const remarks = f.notes || f.message || '-';

        // Next action based on attempt count
        const nextAction = f.attemptCount >= 2 ? 'Final attempt' : f.attemptCount === 1 ? 'Follow up again' : 'Initial call';

        return {
          no: index + 1,
          username: f.assigneeName || '-',
          reportingManager: f.reportingManager || '-',
          leadName: f.leadName || '-',
          leadMobile: f.leadPhone || '-',
          leadSource: f.leadSource || '-',
          followUpDate: scheduledDate.toISOString().split('T')[0],
          followUpTime: scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          followUpType: f.followUpType || 'Call',
          status: daysOverdue > 0 ? 'Missed' : 'Pending',
          priority: f.attemptCount > 2 ? 'High' : f.attemptCount > 1 ? 'Medium' : 'Low',
          remarks: remarks,
          lastContactDate: lastContact,
          nextAction: nextAction,
          daysOverdue: daysOverdue > 0 ? daysOverdue : 0,
        };
      });

      // Calculate due today from schedule
      const dueToday = report.schedule?.today?.length || 0;

      setData({
        followUps,
        summary: {
          totalFollowUps: report.summary.total || 0,
          completed: report.summary.completed || 0,
          pending: report.summary.pending || 0,
          missed: report.summary.missed || 0,
          rescheduled: report.summary.rescheduled || 0,
          dueToday: dueToday,
          overdue: report.summary.overdue || 0,
        },
      });
    } catch (error: any) {
      console.error('Failed to load follow-up report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      // Set empty data on error
      setData({
        followUps: [],
        summary: {
          totalFollowUps: 0,
          completed: 0,
          pending: 0,
          missed: 0,
          rescheduled: 0,
          dueToday: 0,
          overdue: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-green-100 text-green-700',
      'Missed': 'bg-red-100 text-red-700',
      'Rescheduled': 'bg-blue-100 text-blue-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-orange-100 text-orange-700',
      'Low': 'bg-green-100 text-green-700',
    };
    return styles[priority] || 'bg-gray-100 text-gray-700';
  };

  const getTypeBadge = (type: string) => {
    const styles: Record<string, string> = {
      'Call': 'bg-blue-100 text-blue-700',
      'WhatsApp': 'bg-green-100 text-green-700',
      'Email': 'bg-purple-100 text-purple-700',
      'Visit': 'bg-orange-100 text-orange-700',
      'SMS': 'bg-cyan-100 text-cyan-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  const filters = [
    {
      name: 'Status',
      value: selectedStatus,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Missed', label: 'Missed' },
        { value: 'Rescheduled', label: 'Rescheduled' },
      ],
      onChange: setSelectedStatus,
    },
    {
      name: 'Priority',
      value: selectedPriority,
      options: [
        { value: 'all', label: 'All Priority' },
        { value: 'High', label: 'High' },
        { value: 'Medium', label: 'Medium' },
        { value: 'Low', label: 'Low' },
      ],
      onChange: setSelectedPriority,
    },
  ];

  const filteredFollowUps = data?.followUps.filter(f => {
    const matchesStatus = selectedStatus === 'all' || f.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || f.priority === selectedPriority;
    const matchesSearch = !searchValue.trim() ||
      f.username.toLowerCase().includes(searchValue.toLowerCase()) ||
      f.leadName.toLowerCase().includes(searchValue.toLowerCase()) ||
      f.leadMobile.includes(searchValue);
    return matchesStatus && matchesPriority && matchesSearch;
  }) || [];

  const handleExport = () => {
    if (!filteredFollowUps.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['No', 'Username', 'Reporting Manager', 'Lead Name', 'Lead Mobile', 'Lead Source', 'Follow-Up Date', 'Follow-Up Time', 'Type', 'Status', 'Priority', 'Remarks', 'Last Contact', 'Next Action', 'Days Overdue'];
    const csvRows = [headers.join(',')];
    filteredFollowUps.forEach((row) => {
      csvRows.push([
        row.no, `"${row.username}"`, `"${row.reportingManager}"`, `"${row.leadName}"`, row.leadMobile, `"${row.leadSource}"`,
        row.followUpDate, row.followUpTime, row.followUpType, row.status, row.priority,
        `"${row.remarks}"`, row.lastContactDate, `"${row.nextAction}"`, row.daysOverdue
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `follow-up-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="Follow-Up Report"
      description="Detailed follow-up tracking with lead information and status"
      icon={CalendarDaysIcon}
      iconColor="bg-orange-500"
      isLoading={isLoading}
      filters={filters}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search user, lead, or mobile..."
    >
      {data && (
        <div className="space-y-4">
          {/* Compact Summary Stats */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">Total</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.totalFollowUps}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">Completed</span>
              <span className="text-sm font-bold text-green-700">{data.summary.completed}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-xs text-yellow-600">Pending</span>
              <span className="text-sm font-bold text-yellow-700">{data.summary.pending}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-600">Missed</span>
              <span className="text-sm font-bold text-red-700">{data.summary.missed}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-xs text-orange-600">Due Today</span>
              <span className="text-sm font-bold text-orange-700">{data.summary.dueToday}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg">
              <span className="text-xs text-red-700">Overdue</span>
              <span className="text-sm font-bold text-red-800">{data.summary.overdue}</span>
            </div>
          </div>

          {/* Wide Table with Horizontal Scroll */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-10">No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-10 bg-slate-50 z-10">Username</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reporting Manager</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Lead Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Lead Mobile</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Lead Source</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Follow-Up Date</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Follow-Up Time</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Type</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Status</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Priority</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Last Contact</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-indigo-50">Next Action</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-100">Days Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFollowUps.map((row) => (
                    <tr key={row.no} className={`hover:bg-slate-50 ${row.status === 'Missed' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10">{row.no}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-10 bg-white z-10">{row.username}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600">{row.reportingManager}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 bg-blue-50/30">{row.leadName}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 font-mono bg-blue-50/30">{row.leadMobile}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 bg-blue-50/30">{row.leadSource}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-900 bg-orange-50/30">{row.followUpDate}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-orange-50/30">{row.followUpTime}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-purple-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(row.followUpType)}`}>
                          {row.followUpType}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-green-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-red-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(row.priority)}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={row.remarks}>{row.remarks}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-cyan-50/30">{row.lastContactDate}</td>
                      <td className="px-3 py-3 text-sm text-slate-600 bg-indigo-50/30 max-w-[150px] truncate" title={row.nextAction}>{row.nextAction}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-red-100/30">
                        {row.daysOverdue > 0 ? (
                          <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-bold">{row.daysOverdue}</span>
                        ) : (
                          <span className="text-green-600">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
