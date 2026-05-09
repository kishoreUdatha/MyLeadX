/**
 * Message History Page
 * View bulk messaging campaigns and their delivery status
 */
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  PaperAirplaneIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  XMarkIcon,
  ArrowPathIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import {
  bulkMessagingApi,
  BulkMessageJob,
  BulkMessageJobStatus,
  MessageChannel,
  BulkMessageLog,
} from '../../services/messaging.service';

interface JobDetailModalProps {
  job: BulkMessageJob | null;
  onClose: () => void;
}

function JobDetailModal({ job, onClose }: JobDetailModalProps) {
  const [logs, setLogs] = useState<BulkMessageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (job) {
      fetchLogs();
    }
  }, [job, page]);

  const fetchLogs = async () => {
    if (!job) return;
    try {
      setLoading(true);
      const data = await bulkMessagingApi.getJobReport(job.id, page, 50);
      setLogs(data.logs);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!job) return null;

  const deliveryRate = job.sentCount > 0
    ? Math.round((job.deliveredCount / job.sentCount) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">{job.name || 'Campaign Details'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded">
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Stats */}
          <div className="px-6 py-4 border-b bg-slate-50 grid grid-cols-5 gap-4">
            <div>
              <p className="text-xs text-slate-500 uppercase">Total</p>
              <p className="text-xl font-semibold">{job.totalCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Sent</p>
              <p className="text-xl font-semibold text-blue-600">{job.sentCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Delivered</p>
              <p className="text-xl font-semibold text-green-600">{job.deliveredCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Failed</p>
              <p className="text-xl font-semibold text-red-600">{job.failedCount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Delivery Rate</p>
              <p className="text-xl font-semibold">{deliveryRate}%</p>
            </div>
          </div>

          {/* Message Preview */}
          <div className="px-6 py-4 border-b">
            <p className="text-sm font-medium text-slate-700 mb-2">Message</p>
            <div className="bg-slate-50 rounded p-3 text-sm whitespace-pre-wrap">
              {job.message || 'No message content'}
            </div>
          </div>

          {/* Delivery Logs */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: '300px' }}>
            <p className="text-sm font-medium text-slate-700 mb-3">Delivery Logs</p>
            {loading ? (
              <div className="text-center py-4">Loading...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-4 text-slate-500">No logs available</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Phone</th>
                    <th className="text-left py-2">Name</th>
                    <th className="text-center py-2">Status</th>
                    <th className="text-left py-2">Time</th>
                    <th className="text-left py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-2">{log.phone}</td>
                      <td className="py-2">{log.name || '-'}</td>
                      <td className="py-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          log.status === 'DELIVERED' ? 'bg-green-100 text-green-700' :
                          log.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                          log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2 text-slate-500">
                        {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '-'}
                      </td>
                      <td className="py-2 text-red-600 text-xs">{log.errorMessage || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="px-3 py-1">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const [jobs, setJobs] = useState<BulkMessageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedJob, setSelectedJob] = useState<BulkMessageJob | null>(null);
  const [filters, setFilters] = useState<{
    status?: BulkMessageJobStatus;
    channel?: MessageChannel;
  }>({});
  const [showFilters, setShowFilters] = useState(false);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bulkMessagingApi.listJobs(page, 20, filters);
      setJobs(data.jobs);
      setTotalPages(data.pagination.totalPages);
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleCancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    try {
      await bulkMessagingApi.cancelJob(jobId);
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel campaign');
    }
  };

  const getStatusIcon = (status: BulkMessageJobStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'PROCESSING':
        return <ArrowPathIcon className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'SCHEDULED':
        return <ClockIcon className="w-5 h-5 text-yellow-600" />;
      case 'FAILED':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      case 'CANCELLED':
        return <XMarkIcon className="w-5 h-5 text-slate-600" />;
      default:
        return <ExclamationTriangleIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status: BulkMessageJobStatus) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700';
      case 'PROCESSING': return 'bg-blue-100 text-blue-700';
      case 'SCHEDULED': return 'bg-yellow-100 text-yellow-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      case 'CANCELLED': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Message History</h1>
          <p className="text-slate-600">View and manage your bulk messaging campaigns</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 border rounded-lg flex items-center gap-2 ${
              showFilters ? 'bg-indigo-50 border-indigo-500' : ''
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
          </button>
          <Link
            to="/messaging/send"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
            New Campaign
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-6 flex gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => {
                setFilters({ ...filters, status: e.target.value as BulkMessageJobStatus || undefined });
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="PROCESSING">Processing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Channel</label>
            <select
              value={filters.channel || ''}
              onChange={(e) => {
                setFilters({ ...filters, channel: e.target.value as MessageChannel || undefined });
                setPage(1);
              }}
              className="px-3 py-2 border border-slate-300 rounded-lg"
            >
              <option value="">All Channels</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="RCS">RCS</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({});
                setPage(1);
              }}
              className="px-3 py-2 text-slate-600 hover:text-slate-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
          <button onClick={fetchJobs} className="mt-2 text-sm text-red-600 hover:text-red-800 underline">
            Try again
          </button>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-slate-500">Loading campaigns...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <PaperAirplaneIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No campaigns found</p>
            <Link
              to="/messaging/send"
              className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Your First Campaign
            </Link>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Campaign</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Channel</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Status</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Progress</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Delivered</th>
                <th className="text-left py-3 px-4 font-medium text-slate-700">Created</th>
                <th className="text-center py-3 px-4 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{job.name || 'Unnamed Campaign'}</p>
                    <p className="text-xs text-slate-500">{job.totalCount.toLocaleString()} recipients</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      job.channel === 'SMS' ? 'bg-blue-100 text-blue-700' :
                      job.channel === 'WHATSAPP' ? 'bg-green-100 text-green-700' :
                      'bg-purple-100 text-purple-700'
                    }`}>
                      {job.channel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(job.status)}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(job.status)}`}>
                        {job.status}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    {job.status === 'PROCESSING' ? (
                      <div className="w-24 mx-auto">
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${(job.sentCount / job.totalCount) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {Math.round((job.sentCount / job.totalCount) * 100)}%
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm">{job.sentCount}/{job.totalCount}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-sm text-green-600 font-medium">
                      {job.deliveredCount.toLocaleString()}
                    </span>
                    {job.failedCount > 0 && (
                      <span className="text-sm text-red-600 ml-2">
                        ({job.failedCount} failed)
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-sm">{new Date(job.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-slate-500">{new Date(job.createdAt).toLocaleTimeString()}</p>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => setSelectedJob(job)}
                        className="p-2 hover:bg-slate-100 rounded"
                        title="View Details"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {(job.status === 'SCHEDULED' || job.status === 'PROCESSING') && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="p-2 hover:bg-red-100 rounded text-red-600"
                          title="Cancel"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 py-4 border-t">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Job Detail Modal */}
      <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
