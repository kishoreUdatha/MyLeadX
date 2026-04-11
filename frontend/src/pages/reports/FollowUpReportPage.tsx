/**
 * Follow-Up Report - Detailed follow-up tracking with lead information
 */
import { useState, useEffect } from 'react';
import { CalendarDaysIcon, ExclamationTriangleIcon, CheckCircleIcon, ClockIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard } from './components/ReportTemplate';

interface FollowUpRow {
  no: number;
  username: string;
  reportingManager: string;
  leadName: string;
  leadMobile: string;
  leadSource: string;
  followUpDate: string;
  followUpTime: string;
  followUpType: 'Call' | 'WhatsApp' | 'Email' | 'Visit' | 'SMS';
  status: 'Pending' | 'Completed' | 'Missed' | 'Rescheduled';
  priority: 'High' | 'Medium' | 'Low';
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

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      followUps: [
        {
          no: 1,
          username: 'John Smith',
          reportingManager: 'Michael Brown',
          leadName: 'Rahul Sharma',
          leadMobile: '9876543210',
          leadSource: 'Facebook Ads',
          followUpDate: '2024-01-15',
          followUpTime: '10:30 AM',
          followUpType: 'Call',
          status: 'Pending',
          priority: 'High',
          remarks: 'Interested in MBA program',
          lastContactDate: '2024-01-12',
          nextAction: 'Send brochure',
          daysOverdue: 0,
        },
        {
          no: 2,
          username: 'John Smith',
          reportingManager: 'Michael Brown',
          leadName: 'Priya Patel',
          leadMobile: '9876543211',
          leadSource: 'Google Ads',
          followUpDate: '2024-01-14',
          followUpTime: '02:00 PM',
          followUpType: 'WhatsApp',
          status: 'Missed',
          priority: 'High',
          remarks: 'Did not respond to calls',
          lastContactDate: '2024-01-10',
          nextAction: 'Try calling again',
          daysOverdue: 1,
        },
        {
          no: 3,
          username: 'Sarah Johnson',
          reportingManager: 'Michael Brown',
          leadName: 'Amit Kumar',
          leadMobile: '9876543212',
          leadSource: 'Website',
          followUpDate: '2024-01-15',
          followUpTime: '11:00 AM',
          followUpType: 'Call',
          status: 'Completed',
          priority: 'Medium',
          remarks: 'Scheduled campus visit',
          lastContactDate: '2024-01-15',
          nextAction: 'Confirm visit date',
          daysOverdue: 0,
        },
        {
          no: 4,
          username: 'Sarah Johnson',
          reportingManager: 'Michael Brown',
          leadName: 'Sneha Reddy',
          leadMobile: '9876543213',
          leadSource: 'Referral',
          followUpDate: '2024-01-13',
          followUpTime: '03:30 PM',
          followUpType: 'Email',
          status: 'Missed',
          priority: 'Medium',
          remarks: 'Waiting for fee structure',
          lastContactDate: '2024-01-08',
          nextAction: 'Send fee details',
          daysOverdue: 2,
        },
        {
          no: 5,
          username: 'Mike Wilson',
          reportingManager: 'Emily Davis',
          leadName: 'Vikram Singh',
          leadMobile: '9876543214',
          leadSource: 'Instagram',
          followUpDate: '2024-01-15',
          followUpTime: '04:00 PM',
          followUpType: 'Visit',
          status: 'Pending',
          priority: 'High',
          remarks: 'Campus visit scheduled',
          lastContactDate: '2024-01-14',
          nextAction: 'Confirm attendance',
          daysOverdue: 0,
        },
        {
          no: 6,
          username: 'Mike Wilson',
          reportingManager: 'Emily Davis',
          leadName: 'Ananya Gupta',
          leadMobile: '9876543215',
          leadSource: 'Facebook Ads',
          followUpDate: '2024-01-16',
          followUpTime: '10:00 AM',
          followUpType: 'Call',
          status: 'Pending',
          priority: 'Low',
          remarks: 'Initial enquiry',
          lastContactDate: '2024-01-14',
          nextAction: 'Introduction call',
          daysOverdue: 0,
        },
        {
          no: 7,
          username: 'Emily Brown',
          reportingManager: 'Emily Davis',
          leadName: 'Rohan Mehta',
          leadMobile: '9876543216',
          leadSource: 'Google Ads',
          followUpDate: '2024-01-15',
          followUpTime: '11:30 AM',
          followUpType: 'WhatsApp',
          status: 'Completed',
          priority: 'High',
          remarks: 'Payment link shared',
          lastContactDate: '2024-01-15',
          nextAction: 'Confirm payment',
          daysOverdue: 0,
        },
        {
          no: 8,
          username: 'Emily Brown',
          reportingManager: 'Emily Davis',
          leadName: 'Kavya Nair',
          leadMobile: '9876543217',
          leadSource: 'Website',
          followUpDate: '2024-01-12',
          followUpTime: '09:30 AM',
          followUpType: 'Call',
          status: 'Rescheduled',
          priority: 'Medium',
          remarks: 'Asked to call next week',
          lastContactDate: '2024-01-12',
          nextAction: 'Call on Monday',
          daysOverdue: 0,
        },
        {
          no: 9,
          username: 'David Lee',
          reportingManager: 'Michael Brown',
          leadName: 'Arjun Verma',
          leadMobile: '9876543218',
          leadSource: 'Referral',
          followUpDate: '2024-01-11',
          followUpTime: '02:30 PM',
          followUpType: 'SMS',
          status: 'Missed',
          priority: 'High',
          remarks: 'No response for 4 days',
          lastContactDate: '2024-01-07',
          nextAction: 'Final follow-up attempt',
          daysOverdue: 4,
        },
        {
          no: 10,
          username: 'David Lee',
          reportingManager: 'Michael Brown',
          leadName: 'Meera Iyer',
          leadMobile: '9876543219',
          leadSource: 'Instagram',
          followUpDate: '2024-01-15',
          followUpTime: '05:00 PM',
          followUpType: 'Call',
          status: 'Pending',
          priority: 'Medium',
          remarks: 'Interested in BBA course',
          lastContactDate: '2024-01-13',
          nextAction: 'Share course details',
          daysOverdue: 0,
        },
      ],
      summary: {
        totalFollowUps: 156,
        completed: 48,
        pending: 62,
        missed: 32,
        rescheduled: 14,
        dueToday: 28,
        overdue: 18,
      },
    });
    setIsLoading(false);
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

  const filteredFollowUps = data?.followUps.filter(f =>
    (selectedStatus === 'all' || f.status === selectedStatus) &&
    (selectedPriority === 'all' || f.priority === selectedPriority)
  ) || [];

  return (
    <ReportTemplate
      title="Follow-Up Report"
      description="Detailed follow-up tracking with lead information and status"
      icon={CalendarDaysIcon}
      iconColor="bg-orange-500"
      isLoading={isLoading}
      filters={filters}
      onRefresh={loadData}
    >
      {data && (
        <div className="space-y-6">
          {/* Summary Stats */}
          <ReportStatsGrid>
            <ReportStatCard label="Total Follow-Ups" value={data.summary.totalFollowUps} icon={CalendarDaysIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Completed" value={data.summary.completed} icon={CheckCircleIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Pending" value={data.summary.pending} icon={ClockIcon} iconColor="bg-yellow-500" />
            <ReportStatCard label="Missed" value={data.summary.missed} icon={ExclamationTriangleIcon} iconColor="bg-red-500" />
            <ReportStatCard label="Due Today" value={data.summary.dueToday} icon={CalendarDaysIcon} iconColor="bg-orange-500" />
            <ReportStatCard label="Overdue" value={data.summary.overdue} icon={ExclamationTriangleIcon} iconColor="bg-red-600" />
          </ReportStatsGrid>

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

          {/* Summary by Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-600 font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-700">{data.summary.pending}</p>
                </div>
                <ClockIcon className="w-10 h-10 text-yellow-400" />
              </div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">Completed</p>
                  <p className="text-2xl font-bold text-green-700">{data.summary.completed}</p>
                </div>
                <CheckCircleIcon className="w-10 h-10 text-green-400" />
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">Missed</p>
                  <p className="text-2xl font-bold text-red-700">{data.summary.missed}</p>
                </div>
                <ExclamationTriangleIcon className="w-10 h-10 text-red-400" />
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Rescheduled</p>
                  <p className="text-2xl font-bold text-blue-700">{data.summary.rescheduled}</p>
                </div>
                <CalendarDaysIcon className="w-10 h-10 text-blue-400" />
              </div>
            </div>
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
