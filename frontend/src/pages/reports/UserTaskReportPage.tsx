/**
 * User Task Report - Detailed task tracking with task names
 */
import { useState, useEffect } from 'react';
import { ClipboardDocumentCheckIcon, CheckCircleIcon, ClockIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { ReportStatsGrid, ReportStatCard, DateRange } from './components/ReportTemplate';
import toast from 'react-hot-toast';

interface TaskRow {
  no: number;
  taskName: string;
  taskType: 'Call' | 'Follow-Up' | 'Meeting' | 'Email' | 'Document' | 'Visit' | 'Other';
  assignedTo: string;
  reportingManager: string;
  leadName: string;
  leadMobile: string;
  createdDate: string;
  dueDate: string;
  dueTime: string;
  completedDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Completed' | 'Overdue' | 'In Progress';
  remarks: string;
}

export default function UserTaskReportPage() {
  const [data, setData] = useState<{ tasks: TaskRow[]; summary: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState('all');
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
    await new Promise(resolve => setTimeout(resolve, 500));
    setData({
      tasks: [
        { no: 1, taskName: 'Call back for fee discussion', taskType: 'Call', assignedTo: 'John Smith', reportingManager: 'Michael Brown', leadName: 'Rahul Sharma', leadMobile: '9876543210', createdDate: '2024-01-12', dueDate: '2024-01-15', dueTime: '10:00 AM', completedDate: '-', priority: 'High', status: 'Pending', remarks: 'Interested in MBA' },
        { no: 2, taskName: 'Send brochure via WhatsApp', taskType: 'Follow-Up', assignedTo: 'John Smith', reportingManager: 'Michael Brown', leadName: 'Priya Patel', leadMobile: '9876543211', createdDate: '2024-01-13', dueDate: '2024-01-15', dueTime: '11:00 AM', completedDate: '2024-01-15', priority: 'Medium', status: 'Completed', remarks: 'Brochure sent' },
        { no: 3, taskName: 'Schedule campus visit', taskType: 'Meeting', assignedTo: 'Sarah Johnson', reportingManager: 'Michael Brown', leadName: 'Amit Kumar', leadMobile: '9876543212', createdDate: '2024-01-10', dueDate: '2024-01-14', dueTime: '02:00 PM', completedDate: '-', priority: 'High', status: 'Overdue', remarks: 'Waiting for confirmation' },
        { no: 4, taskName: 'Email course details', taskType: 'Email', assignedTo: 'Sarah Johnson', reportingManager: 'Michael Brown', leadName: 'Sneha Reddy', leadMobile: '9876543213', createdDate: '2024-01-14', dueDate: '2024-01-15', dueTime: '03:00 PM', completedDate: '-', priority: 'Low', status: 'In Progress', remarks: 'Preparing email' },
        { no: 5, taskName: 'Collect admission documents', taskType: 'Document', assignedTo: 'Mike Wilson', reportingManager: 'Emily Davis', leadName: 'Vikram Singh', leadMobile: '9876543214', createdDate: '2024-01-11', dueDate: '2024-01-15', dueTime: '04:00 PM', completedDate: '2024-01-14', priority: 'High', status: 'Completed', remarks: 'Documents received' },
        { no: 6, taskName: 'Follow up on payment', taskType: 'Call', assignedTo: 'Mike Wilson', reportingManager: 'Emily Davis', leadName: 'Ananya Gupta', leadMobile: '9876543215', createdDate: '2024-01-13', dueDate: '2024-01-16', dueTime: '10:30 AM', completedDate: '-', priority: 'High', status: 'Pending', remarks: 'Payment pending' },
        { no: 7, taskName: 'Home visit for counseling', taskType: 'Visit', assignedTo: 'Emily Brown', reportingManager: 'Emily Davis', leadName: 'Rohan Mehta', leadMobile: '9876543216', createdDate: '2024-01-12', dueDate: '2024-01-15', dueTime: '11:00 AM', completedDate: '2024-01-15', priority: 'Medium', status: 'Completed', remarks: 'Visit completed' },
        { no: 8, taskName: 'Share scholarship details', taskType: 'Email', assignedTo: 'Emily Brown', reportingManager: 'Emily Davis', leadName: 'Kavya Nair', leadMobile: '9876543217', createdDate: '2024-01-14', dueDate: '2024-01-15', dueTime: '12:00 PM', completedDate: '-', priority: 'Medium', status: 'In Progress', remarks: 'Checking eligibility' },
        { no: 9, taskName: 'Call for admission confirmation', taskType: 'Call', assignedTo: 'David Lee', reportingManager: 'Michael Brown', leadName: 'Arjun Verma', leadMobile: '9876543218', createdDate: '2024-01-09', dueDate: '2024-01-13', dueTime: '02:30 PM', completedDate: '-', priority: 'High', status: 'Overdue', remarks: 'Multiple attempts failed' },
        { no: 10, taskName: 'Send fee structure', taskType: 'Follow-Up', assignedTo: 'David Lee', reportingManager: 'Michael Brown', leadName: 'Meera Iyer', leadMobile: '9876543219', createdDate: '2024-01-14', dueDate: '2024-01-15', dueTime: '05:00 PM', completedDate: '-', priority: 'Low', status: 'Pending', remarks: 'Initial enquiry' },
        { no: 11, taskName: 'Arrange demo class', taskType: 'Meeting', assignedTo: 'John Smith', reportingManager: 'Michael Brown', leadName: 'Kiran Rao', leadMobile: '9876543220', createdDate: '2024-01-13', dueDate: '2024-01-16', dueTime: '09:00 AM', completedDate: '-', priority: 'Medium', status: 'Pending', remarks: 'Demo scheduled' },
        { no: 12, taskName: 'Verify documents submitted', taskType: 'Document', assignedTo: 'Sarah Johnson', reportingManager: 'Michael Brown', leadName: 'Deepak Joshi', leadMobile: '9876543221', createdDate: '2024-01-14', dueDate: '2024-01-15', dueTime: '01:00 PM', completedDate: '2024-01-15', priority: 'High', status: 'Completed', remarks: 'All documents verified' },
      ],
      summary: {
        totalTasks: 245,
        completed: 98,
        pending: 82,
        inProgress: 35,
        overdue: 30,
        dueToday: 18,
        highPriority: 45,
      },
    });
    setIsLoading(false);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Completed': 'bg-green-100 text-green-700',
      'Overdue': 'bg-red-100 text-red-700',
      'In Progress': 'bg-blue-100 text-blue-700',
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
      'Follow-Up': 'bg-purple-100 text-purple-700',
      'Meeting': 'bg-indigo-100 text-indigo-700',
      'Email': 'bg-cyan-100 text-cyan-700',
      'Document': 'bg-amber-100 text-amber-700',
      'Visit': 'bg-teal-100 text-teal-700',
      'Other': 'bg-gray-100 text-gray-700',
    };
    return styles[type] || 'bg-gray-100 text-gray-700';
  };

  // Get unique users for filter
  const uniqueUsers = [...new Set(data?.tasks.map(t => t.assignedTo) || [])];

  const filters = [
    {
      name: 'User',
      value: selectedUser,
      options: [
        { value: 'all', label: 'All Users' },
        ...uniqueUsers.map(user => ({ value: user, label: user })),
      ],
      onChange: setSelectedUser,
    },
    {
      name: 'Status',
      value: selectedStatus,
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'Pending', label: 'Pending' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Completed', label: 'Completed' },
        { value: 'Overdue', label: 'Overdue' },
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

  const filteredTasks = data?.tasks.filter(t => {
    const matchesUser = selectedUser === 'all' || t.assignedTo === selectedUser;
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesPriority = selectedPriority === 'all' || t.priority === selectedPriority;
    const matchesSearch = !searchValue.trim() ||
      t.taskName.toLowerCase().includes(searchValue.toLowerCase()) ||
      t.assignedTo.toLowerCase().includes(searchValue.toLowerCase()) ||
      t.leadName.toLowerCase().includes(searchValue.toLowerCase());
    return matchesUser && matchesStatus && matchesPriority && matchesSearch;
  }) || [];

  const handleExport = () => {
    if (!filteredTasks.length) {
      toast.error('No data to export');
      return;
    }
    const headers = ['No', 'Task Name', 'Task Type', 'Assigned To', 'Reporting Manager', 'Lead Name', 'Lead Mobile', 'Created Date', 'Due Date', 'Due Time', 'Completed Date', 'Priority', 'Status', 'Remarks'];
    const csvRows = [headers.join(',')];
    filteredTasks.forEach((row) => {
      csvRows.push([
        row.no, `"${row.taskName}"`, row.taskType, `"${row.assignedTo}"`, `"${row.reportingManager}"`,
        `"${row.leadName}"`, row.leadMobile, row.createdDate, row.dueDate, row.dueTime,
        row.completedDate, row.priority, row.status, `"${row.remarks}"`
      ].join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `user-task-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Report exported successfully!');
  };

  return (
    <ReportTemplate
      title="User Task Report"
      description="Detailed task tracking with task names, assignments and status"
      icon={ClipboardDocumentCheckIcon}
      iconColor="bg-violet-500"
      isLoading={isLoading}
      filters={filters}
      onRefresh={loadData}
      onExport={handleExport}
      dateRange={dateRange}
      onDateRangeChange={setDateRange}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search task, user, or lead..."
    >
      {data && (
        <div className="space-y-6">
          <ReportStatsGrid>
            <ReportStatCard label="Total Tasks" value={data.summary.totalTasks} icon={ClipboardDocumentCheckIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Completed" value={data.summary.completed} icon={CheckCircleIcon} iconColor="bg-green-500" />
            <ReportStatCard label="Pending" value={data.summary.pending} icon={ClockIcon} iconColor="bg-yellow-500" />
            <ReportStatCard label="In Progress" value={data.summary.inProgress} icon={ClockIcon} iconColor="bg-blue-500" />
            <ReportStatCard label="Overdue" value={data.summary.overdue} icon={ExclamationCircleIcon} iconColor="bg-red-500" />
            <ReportStatCard label="Due Today" value={data.summary.dueToday} icon={ClockIcon} iconColor="bg-orange-500" />
          </ReportStatsGrid>

          {/* Wide Table with Horizontal Scroll */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-0 bg-slate-50 z-10">No</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap sticky left-10 bg-slate-50 z-10 min-w-[200px]">Task Name</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-purple-50">Task Type</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-blue-50">Assigned To</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Reporting Manager</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Lead Name</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-cyan-50">Lead Mobile</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-gray-50">Created Date</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Due Date</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-orange-50">Due Time</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-green-50">Completed Date</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-red-50">Priority</th>
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap bg-yellow-50">Status</th>
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((row) => (
                    <tr key={row.no} className={`hover:bg-slate-50 ${row.status === 'Overdue' ? 'bg-red-50/30' : ''}`}>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 sticky left-0 bg-white z-10">{row.no}</td>
                      <td className="px-3 py-3 text-sm font-medium text-slate-900 sticky left-10 bg-white z-10 min-w-[200px]">{row.taskName}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-purple-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeBadge(row.taskType)}`}>
                          {row.taskType}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-slate-900 bg-blue-50/30">{row.assignedTo}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600">{row.reportingManager}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-900 bg-cyan-50/30">{row.leadName}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-slate-600 font-mono bg-cyan-50/30">{row.leadMobile}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-gray-50/30">{row.createdDate}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-900 bg-orange-50/30">{row.dueDate}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center text-slate-600 bg-orange-50/30">{row.dueTime}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-green-50/30">
                        {row.completedDate === '-' ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <span className="text-green-600 font-medium">{row.completedDate}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-red-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityBadge(row.priority)}`}>
                          {row.priority}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-center bg-yellow-50/30">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600 max-w-[200px] truncate" title={row.remarks}>{row.remarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary by User */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Task Summary by User</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {uniqueUsers.map(user => {
                const userTasks = data.tasks.filter(t => t.assignedTo === user);
                const completed = userTasks.filter(t => t.status === 'Completed').length;
                const overdue = userTasks.filter(t => t.status === 'Overdue').length;
                return (
                  <div key={user} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm font-medium text-slate-900 mb-2">{user}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Total: {userTasks.length}</span>
                      <span className="text-green-600">Done: {completed}</span>
                      {overdue > 0 && <span className="text-red-600">Overdue: {overdue}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </ReportTemplate>
  );
}
