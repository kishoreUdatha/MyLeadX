import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  InformationCircleIcon,
  ChartBarSquareIcon,
  TableCellsIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  StarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  userTrendsService,
  UserTrendsReport,
  UserOption,
  MetricWithComparison,
} from '../../services/user-trends.service';

// Date filter options
const DATE_OPTIONS = [
  { label: 'Last 7 Days', value: '7' },
  { label: 'Last 30 Days', value: '30' },
  { label: 'Last 90 Days', value: '90' },
];

function getDateRange(option: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - parseInt(option));

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
  };
}

// Empty State Component
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full py-6">
      <ChartBarIcon className="h-10 w-10 text-gray-300 mb-2" />
      <span className="text-gray-400 text-sm">No data available</span>
    </div>
  );
}

// Summary Card Component
interface SummaryCardProps {
  title: string;
  metric: MetricWithComparison;
  unit?: string;
}

function SummaryCard({ title, metric, unit = '' }: SummaryCardProps) {
  const isPositive = metric.percentChange >= 0;
  const changeColor = isPositive ? 'text-green-600' : 'text-red-500';
  const changeBg = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${changeBg} ${changeColor}`}>
          {isPositive ? <ArrowTrendingUpIcon className="h-3 w-3" /> : <ArrowTrendingDownIcon className="h-3 w-3" />}
          {Math.abs(metric.percentChange)}%
        </span>
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1">
        {metric.current.value} <span className="text-base font-normal text-gray-500">{unit}</span>
      </div>
      <div className="text-xs text-gray-400">
        {metric.current.startDate} - {metric.current.endDate}
      </div>
    </div>
  );
}

// Filter Dropdown Component
interface FilterDropdownProps {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedLabel = options.find(o => o.value === value)?.label || label;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
      >
        {selectedLabel}
        <ChevronDownIcon className="h-4 w-4" />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
          {options.map((option) => (
            <button
              key={option.value}
              onClick={() => { onChange(option.value); setIsOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 ${
                value === option.value ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Chart Card Component
interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  viewMode: 'chart' | 'table';
  onViewModeChange: (mode: 'chart' | 'table') => void;
  users: { label: string; value: string }[];
  selectedUsers: string[];
  onUserChange: (userIds: string[]) => void;
  selectedDate: string;
  onDateChange: (dateRange: string) => void;
}

function ChartCard({
  title,
  children,
  viewMode,
  onViewModeChange,
  users,
  selectedUsers,
  onUserChange,
  selectedDate,
  onDateChange,
}: ChartCardProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showUsersSubmenu, setShowUsersSubmenu] = useState(false);
  const [showDateSubmenu, setShowDateSubmenu] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setShowFilters(false);
        setShowUsersSubmenu(false);
        setShowDateSubmenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dateOptions = [
    { label: 'Last 7 days', value: '7' },
    { label: 'Last 30 days', value: '30' },
    { label: 'Last 90 days', value: '90' },
  ];

  const handleUserToggle = (userId: string) => {
    if (userId === 'all') {
      onUserChange(['all']);
    } else {
      let newSelection = selectedUsers.filter(id => id !== 'all');
      if (newSelection.includes(userId)) {
        newSelection = newSelection.filter(id => id !== userId);
        if (newSelection.length === 0) newSelection = ['all'];
      } else {
        newSelection.push(userId);
      }
      onUserChange(newSelection);
    }
  };

  const isUserSelected = (userId: string) => {
    if (userId === 'all') return selectedUsers.includes('all') || selectedUsers.length === 0;
    return selectedUsers.includes(userId);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <div className="flex items-center gap-1.5">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded p-0.5">
            <button
              onClick={() => onViewModeChange('chart')}
              className={`p-1 rounded transition-colors ${viewMode === 'chart' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ChartBarSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onViewModeChange('table')}
              className={`p-1 rounded transition-colors ${viewMode === 'table' ? 'bg-purple-500 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <TableCellsIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Filters */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => { setShowFilters(!showFilters); setShowUsersSubmenu(false); setShowDateSubmenu(false); }}
              className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 rounded text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Filters
              <ChevronDownIcon className="h-3 w-3" />
            </button>

            {showFilters && (
              <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-50 py-1">
                <div
                  className="relative"
                  onMouseEnter={() => { setShowUsersSubmenu(true); setShowDateSubmenu(false); }}
                >
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <ChevronLeftIcon className="h-3 w-3" />
                    Users
                  </button>
                  {showUsersSubmenu && (
                    <div className="absolute right-full top-0 mr-1 w-44 bg-white rounded-md shadow-lg border border-gray-200 py-1 max-h-48 overflow-y-auto">
                      {users.map((user) => (
                        <label key={user.value} className="flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isUserSelected(user.value)}
                            onChange={() => handleUserToggle(user.value)}
                            className="w-3.5 h-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="truncate">{user.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div
                  className="relative"
                  onMouseEnter={() => { setShowDateSubmenu(true); setShowUsersSubmenu(false); }}
                >
                  <button className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <ChevronLeftIcon className="h-3 w-3" />
                    Date
                  </button>
                  {showDateSubmenu && (
                    <div className="absolute right-full top-0 mr-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                      {dateOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => { onDateChange(option.value); setShowFilters(false); setShowDateSubmenu(false); }}
                          className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 ${
                            selectedDate === option.value ? 'bg-purple-50 text-purple-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="h-44">{children}</div>
    </div>
  );
}

// Data Table Component
interface DataTableProps {
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
  data: any[];
  renderCell?: (row: any, key: string) => React.ReactNode;
}

function DataTable({ columns, data, renderCell }: DataTableProps) {
  if (data.length === 0) return <EmptyState />;

  return (
    <div className="h-full overflow-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={`p-2 font-medium text-gray-600 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className={`p-2 text-gray-900 ${col.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {renderCell ? renderCell(row, col.key) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function UserTrendsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<UserTrendsReport | null>(null);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedRange, setSelectedRange] = useState('30');
  const [selectedUsers, setSelectedUsers] = useState<string[]>(['all']);

  // View modes
  const [callsViewMode, setCallsViewMode] = useState<'chart' | 'table'>('chart');
  const [durationViewMode, setDurationViewMode] = useState<'chart' | 'table'>('chart');
  const [leadsViewMode, setLeadsViewMode] = useState<'chart' | 'table'>('chart');
  const [lostLeadsViewMode, setLostLeadsViewMode] = useState<'chart' | 'table'>('chart');
  const [breakTimeViewMode, setBreakTimeViewMode] = useState<'chart' | 'table'>('chart');
  const [breakCountViewMode, setBreakCountViewMode] = useState<'chart' | 'table'>('chart');

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(selectedRange);
      const userIds = selectedUsers.filter(id => id !== 'all');
      const filters = {
        startDate,
        endDate,
        userId: userIds.length > 0 ? userIds.join(',') : undefined,
      };
      const [reportData, usersData] = await Promise.all([
        userTrendsService.getComprehensiveReport(filters),
        userTrendsService.getUsers(),
      ]);
      setReport(reportData);
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching user trends:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedRange, selectedUsers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="h-6 w-6 animate-spin text-purple-600" />
        <span className="ml-2 text-gray-600 text-sm">Loading...</span>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8 text-gray-500 text-sm">
        Failed to load data.
      </div>
    );
  }

  const userOptions = [
    { label: 'All Users', value: 'all' },
    ...users.map(u => ({ label: u.name, value: u.id })),
  ];

  const chartProps = {
    users: userOptions,
    selectedUsers,
    onUserChange: setSelectedUsers,
    selectedDate: selectedRange,
    onDateChange: setSelectedRange,
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">User Trends</h1>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <FilterDropdown label="Last 30 Days" value={selectedRange} options={DATE_OPTIONS} onChange={setSelectedRange} />
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <StarIcon className="h-4 w-4" />
          Request Graph
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Average Call Time" metric={report.summary.averageCallTime} unit="Mins" />
        <SummaryCard title="Total Break Time" metric={report.summary.totalBreakTime} unit="Mins" />
        <SummaryCard title="Total Call Time" metric={report.summary.totalCallTime} unit="Mins" />
        <SummaryCard title="Average Breaks" metric={report.summary.averageBreaks} />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Total Calls Vs Calls Connected" viewMode={callsViewMode} onViewModeChange={setCallsViewMode} {...chartProps}>
          {callsViewMode === 'chart' ? (
            report.callsPerUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.callsPerUser} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="totalCalls" name="Total Calls" fill="#4338CA" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="connectedCalls" name="Connected" fill="#84CC16" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[
                { key: 'userName', label: 'User' },
                { key: 'totalCalls', label: 'Total', align: 'right' },
                { key: 'connectedCalls', label: 'Connected', align: 'right' },
                { key: 'rate', label: 'Rate', align: 'right' },
              ]}
              data={report.callsPerUser}
              renderCell={(row, key) => key === 'rate' ? `${row.totalCalls > 0 ? Math.round((row.connectedCalls / row.totalCalls) * 100) : 0}%` : row[key]}
            />
          )}
        </ChartCard>

        <ChartCard title="Total Call Duration" viewMode={durationViewMode} onViewModeChange={setDurationViewMode} {...chartProps}>
          {durationViewMode === 'chart' ? (
            report.durationPerUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.durationPerUser} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v} Mins`, 'Duration']} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="duration" name="Duration (Mins)" fill="#4338CA" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[{ key: 'userName', label: 'User' }, { key: 'duration', label: 'Duration (Mins)', align: 'right' }]}
              data={report.durationPerUser}
            />
          )}
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Leads Closed vs Converted" viewMode={leadsViewMode} onViewModeChange={setLeadsViewMode} {...chartProps}>
          {leadsViewMode === 'chart' ? (
            report.leadsClosedConverted.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.leadsClosedConverted} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="closedLeads" name="Closed" fill="#4338CA" radius={[3, 3, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="convertedLeads" name="Converted" fill="#84CC16" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[{ key: 'userName', label: 'User' }, { key: 'closedLeads', label: 'Closed', align: 'right' }, { key: 'convertedLeads', label: 'Converted', align: 'right' }]}
              data={report.leadsClosedConverted}
            />
          )}
        </ChartCard>

        <ChartCard title="Lost Leads" viewMode={lostLeadsViewMode} onViewModeChange={setLostLeadsViewMode} {...chartProps}>
          {lostLeadsViewMode === 'chart' ? (
            report.lostLeads.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.lostLeads} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="lostLeads" name="Lost Leads" fill="#EF4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[{ key: 'userName', label: 'User' }, { key: 'lostLeads', label: 'Lost Leads', align: 'right' }]}
              data={report.lostLeads}
            />
          )}
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Break Time per User" viewMode={breakTimeViewMode} onViewModeChange={setBreakTimeViewMode} {...chartProps}>
          {breakTimeViewMode === 'chart' ? (
            report.breaksPerUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.breaksPerUser} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [`${v} Mins`, 'Break Time']} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="totalBreakTime" name="Break Time (Mins)" fill="#4338CA" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[{ key: 'userName', label: 'User' }, { key: 'totalBreakTime', label: 'Break Time (Mins)', align: 'right' }]}
              data={report.breaksPerUser}
            />
          )}
        </ChartCard>

        <ChartCard title="Breaks per User" viewMode={breakCountViewMode} onViewModeChange={setBreakCountViewMode} {...chartProps}>
          {breakCountViewMode === 'chart' ? (
            report.breaksPerUser.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report.breaksPerUser} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="userName" tick={{ fontSize: 10 }} tickFormatter={(v) => v.length > 10 ? v.slice(0, 10) + '..' : v} height={25} />
                  <YAxis tick={{ fontSize: 10 }} width={35} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, paddingTop: 0 }} />
                  <Bar dataKey="totalBreaks" name="Total Breaks" fill="#4338CA" radius={[3, 3, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState />
          ) : (
            <DataTable
              columns={[{ key: 'userName', label: 'User' }, { key: 'totalBreaks', label: 'Total Breaks', align: 'right' }]}
              data={report.breaksPerUser}
            />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
