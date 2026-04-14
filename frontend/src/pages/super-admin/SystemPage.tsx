import { useState, useEffect } from 'react';
import {
  ServerIcon,
  CpuChipIcon,
  CircleStackIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  ArrowPathIcon,
  WrenchIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

export default function SystemPage() {
  const [overview, setOverview] = useState<any>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [database, setDatabase] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [overviewRes, metricsRes, dbRes, queuesRes, jobsRes, maintRes] = await Promise.all([
        api.get('/super-admin/system/overview'),
        api.get('/super-admin/system/metrics'),
        api.get('/super-admin/system/database'),
        api.get('/super-admin/system/queues'),
        api.get('/super-admin/system/jobs'),
        api.get('/super-admin/system/maintenance'),
      ]);

      setOverview(overviewRes.data.data);
      setMetrics(metricsRes.data.data);
      setDatabase(dbRes.data.data);
      setQueues(queuesRes.data.data || []);
      setJobs(jobsRes.data.data || []);
      setMaintenance(maintRes.data.data);
    } catch (error) {
      console.error('Failed to fetch system data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'operational':
      case 'running': return 'text-green-600 bg-green-100';
      case 'degraded':
      case 'paused': return 'text-amber-600 bg-amber-100';
      case 'down':
      case 'outage':
      case 'stopped': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const handleToggleMaintenance = async () => {
    try {
      await api.post('/super-admin/system/maintenance', {
        enabled: !maintenance?.active,
        message: 'System maintenance in progress. Please try again later.',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Administration</h1>
          <p className="text-slate-500">Health monitoring, jobs, and maintenance</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleToggleMaintenance}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              maintenance?.active
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-amber-600 text-white hover:bg-amber-700'
            }`}
          >
            <WrenchIcon className="w-4 h-4" />
            {maintenance?.active ? 'Exit Maintenance' : 'Enter Maintenance'}
          </button>
        </div>
      </div>

      {/* Maintenance Banner */}
      {maintenance?.active && (
        <div className="bg-amber-100 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800">Maintenance Mode Active</p>
              <p className="text-sm text-amber-700">{maintenance.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overall Status</p>
              <p className={`text-xl font-bold capitalize ${
                overview?.status === 'operational' ? 'text-green-600' :
                overview?.status === 'degraded' ? 'text-amber-600' : 'text-red-600'
              }`}>
                {overview?.status}
              </p>
            </div>
            <div className={`w-4 h-4 rounded-full ${
              overview?.status === 'operational' ? 'bg-green-500' :
              overview?.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'
            } animate-pulse`} />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ClockIcon className="w-8 h-8 text-blue-500" />
            <div>
              <p className="text-sm text-slate-500">Uptime</p>
              <p className="text-xl font-bold text-slate-900">{overview?.uptime}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <CpuChipIcon className="w-8 h-8 text-purple-500" />
            <div>
              <p className="text-sm text-slate-500">CPU Usage</p>
              <p className="text-xl font-bold text-slate-900">{metrics?.cpu?.usage?.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3">
            <ServerIcon className="w-8 h-8 text-green-500" />
            <div>
              <p className="text-sm text-slate-500">Memory Usage</p>
              <p className="text-xl font-bold text-slate-900">{metrics?.memory?.usagePercent?.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* System Health Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['database', 'queues', 'api'].map((service) => (
          <div key={service} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700 capitalize">{service}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(overview?.[service])}`}>
                {overview?.[service]}
              </span>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Node.js</span>
            <span className="text-xs text-slate-500">{metrics?.nodeVersion}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database Health */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <CircleStackIcon className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-900">Database Health</h2>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Response Time</span>
              <span className="font-medium text-slate-900">{database?.responseTime}ms</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Database Size</span>
              <span className="font-medium text-slate-900">{database?.databaseSize}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
              <span className="text-sm text-slate-600">Connections</span>
              <span className="font-medium text-slate-900">
                {database?.activeConnections} / {database?.maxConnections}
              </span>
            </div>
          </div>

          {database?.tableStats?.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Top Tables by Size</p>
              <div className="space-y-2">
                {database.tableStats.slice(0, 5).map((table: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="text-slate-600">{table.tableName}</span>
                    <span className="text-slate-900">{formatBytes(table.sizeBytes)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Queues */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Queue Status</h2>
          <div className="space-y-3">
            {queues.map((queue, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{queue.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    queue.paused ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {queue.paused ? 'Paused' : 'Active'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  <div className="text-center">
                    <p className="text-slate-500">Pending</p>
                    <p className="font-medium text-slate-900">{queue.pending}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Active</p>
                    <p className="font-medium text-blue-600">{queue.active}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Completed</p>
                    <p className="font-medium text-green-600">{queue.completed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Failed</p>
                    <p className="font-medium text-red-600">{queue.failed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500">Delayed</p>
                    <p className="font-medium text-amber-600">{queue.delayed}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scheduled Jobs */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Scheduled Jobs</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Job</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Last Run</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Next Run</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Success</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-slate-500">Failed</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="text-sm font-medium text-slate-900">{job.name}</p>
                    <p className="text-xs text-slate-500">{job.id}</p>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(job.status)}`}>
                      {job.status === 'running' ? <PlayIcon className="w-3 h-3" /> : <PauseIcon className="w-3 h-3" />}
                      {job.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {job.lastRun ? new Date(job.lastRun).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-slate-600">
                    {job.nextRun ? new Date(job.nextRun).toLocaleString() : '-'}
                  </td>
                  <td className="py-3 px-4 text-sm text-green-600">{job.successCount}</td>
                  <td className="py-3 px-4 text-sm text-red-600">{job.failureCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Memory */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Process Memory</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-500">Heap Used</p>
            <p className="text-lg font-bold text-slate-900">{formatBytes(metrics?.processMemory?.heapUsed || 0)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-500">Heap Total</p>
            <p className="text-lg font-bold text-slate-900">{formatBytes(metrics?.processMemory?.heapTotal || 0)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-500">External</p>
            <p className="text-lg font-bold text-slate-900">{formatBytes(metrics?.processMemory?.external || 0)}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg text-center">
            <p className="text-sm text-slate-500">RSS</p>
            <p className="text-lg font-bold text-slate-900">{formatBytes(metrics?.processMemory?.rss || 0)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
