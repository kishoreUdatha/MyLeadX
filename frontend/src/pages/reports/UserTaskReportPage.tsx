/**
 * User Task Report - Detailed task tracking with task names
 */
import { useState, useEffect } from 'react';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import ReportTemplate, { DateRange } from './components/ReportTemplate';
import api from '../../services/api';
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
    try {
      const response = await api.get('/task-reports/comprehensive', {
        params: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        },
      });

      const report = response.data.data.report;

      // Map tasks with row numbers
      const tasks: TaskRow[] = report.tasks.map((task: any, index: number) => ({
        no: index + 1,
        taskName: task.taskName,
        taskType: task.taskType,
        assignedTo: task.assigneeName,
        reportingManager: task.reportingManager,
        leadName: task.leadName,
        leadMobile: task.leadMobile,
        createdDate: task.createdDate,
        dueDate: task.dueDate,
        dueTime: task.dueTime,
        completedDate: task.completedDate,
        priority: task.priority,
        status: task.status,
        remarks: task.remarks,
      }));

      setData({
        tasks,
        summary: report.summary,
      });
    } catch (error: any) {
      console.error('Failed to load task report:', error);
      toast.error(error.response?.data?.message || 'Failed to load report data');
      setData({
        tasks: [],
        summary: {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          overdue: 0,
          dueToday: 0,
          highPriority: 0,
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
        <div className="space-y-4">
          {/* Compact Summary Stats */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">Total</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.total}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-xs text-green-600">Completed</span>
              <span className="text-sm font-bold text-green-700">{data.summary.completed}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
              <span className="text-xs text-yellow-600">Pending</span>
              <span className="text-sm font-bold text-yellow-700">{data.summary.pending}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs text-blue-600">In Progress</span>
              <span className="text-sm font-bold text-blue-700">{data.summary.inProgress}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-xs text-red-600">Overdue</span>
              <span className="text-sm font-bold text-red-700">{data.summary.overdue}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-xs text-orange-600">Due Today</span>
              <span className="text-sm font-bold text-orange-700">{data.summary.dueToday}</span>
            </div>
          </div>

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
