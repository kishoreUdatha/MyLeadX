import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';

interface ScrapeJob {
  id: string;
  apifyRunId: string;
  actorId: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  totalItems: number;
  importedItems: number;
  duplicateItems: number;
  failedItems: number;
  bulkImportId: string | null;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  config: {
    id: string;
    name: string;
    scraperType: string;
  } | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
  RUNNING: { bg: 'bg-blue-100', text: 'text-blue-800', icon: ArrowPathIcon },
  SUCCEEDED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
  FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', icon: ExclamationTriangleIcon },
};

const SCRAPER_TYPE_LABELS: Record<string, string> = {
  GOOGLE_MAPS: 'Google Maps',
  LINKEDIN_COMPANY: 'LinkedIn Companies',
  LINKEDIN_PEOPLE: 'LinkedIn People',
  YELLOW_PAGES: 'Yellow Pages',
  CUSTOM: 'Custom',
};

export default function ApifyJobsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const configIdFilter = searchParams.get('configId') || '';

  const limit = 20;
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    loadJobs();
  }, [statusFilter, configIdFilter, offset]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string | number> = { limit, offset };
      if (statusFilter) params.status = statusFilter;
      if (configIdFilter) params.configId = configIdFilter;

      const response = await api.get('/apify/jobs', { params });
      const jobsData = response.data.data?.jobs || response.data.data || [];
      const totalData = response.data.data?.total || (Array.isArray(response.data.data) ? response.data.data.length : 0);

      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setTotal(totalData);
    } catch (error: any) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleString();
  };

  const formatDuration = (start: string | null, end: string | null) => {
    if (!start || !end) return '-';
    const durationMs = new Date(end).getTime() - new Date(start).getTime();
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setOffset(0);
    const newParams = new URLSearchParams(searchParams);
    if (status) {
      newParams.set('status', status);
    } else {
      newParams.delete('status');
    }
    setSearchParams(newParams);
  };

  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/apify')}
            className="flex items-center text-xs text-gray-500 hover:text-gray-700 mb-1"
          >
            <ArrowLeftIcon className="h-3 w-3 mr-1" />
            Back
          </button>
          <h1 className="text-base font-semibold text-gray-900">Scrape Jobs</h1>
          <p className="text-[10px] text-gray-500">
            {total} total job{total !== 1 ? 's' : ''}
            {configIdFilter && ' for this scraper'}
          </p>
        </div>

        <button
          onClick={loadJobs}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 bg-white border rounded hover:bg-gray-50"
        >
          <ArrowPathIcon className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <FunnelIcon className="h-3 w-3 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="text-xs rounded border-gray-300 py-1 px-2 focus:border-purple-500 focus:ring-purple-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RUNNING">Running</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {configIdFilter && (
          <button
            onClick={() => {
              const newParams = new URLSearchParams(searchParams);
              newParams.delete('configId');
              setSearchParams(newParams);
            }}
            className="text-[10px] text-purple-600 hover:text-purple-700"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-gray-500 mb-1">No jobs found</p>
            {configIdFilter && (
              <button
                onClick={() => {
                  const newParams = new URLSearchParams();
                  setSearchParams(newParams);
                }}
                className="text-[10px] text-purple-600 hover:text-purple-700"
              >
                View all jobs
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 text-left text-[10px] font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-3 py-2">Job</th>
                    <th className="px-3 py-2">Scraper</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Results</th>
                    <th className="px-3 py-2">Duration</th>
                    <th className="px-3 py-2">Started</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-xs">
                  {jobs.map((job) => {
                    const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.PENDING;
                    const StatusIcon = statusStyle.icon;

                    return (
                      <tr key={job.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-mono text-[10px] text-gray-500">
                            {job.apifyRunId.slice(0, 10)}...
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          {job.config ? (
                            <div>
                              <div className="font-medium text-gray-900 text-xs">
                                {job.config.name.length > 25 ? job.config.name.slice(0, 25) + '...' : job.config.name}
                              </div>
                              <div className="text-[10px] text-gray-500">
                                {SCRAPER_TYPE_LABELS[job.config.scraperType] || job.config.scraperType}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <StatusIcon
                              className={`h-3 w-3 ${statusStyle.text} ${
                                job.status === 'RUNNING' ? 'animate-spin' : ''
                              }`}
                            />
                            <span
                              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusStyle.bg} ${statusStyle.text}`}
                            >
                              {job.status}
                            </span>
                          </div>
                          {job.errorMessage && (
                            <div className="text-[10px] text-red-600 mt-0.5 max-w-[150px] truncate">
                              {job.errorMessage}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {job.status === 'SUCCEEDED' ? (
                            <div className="text-xs">
                              <span className="text-green-600 font-medium">{job.importedItems}</span>
                              <span className="text-gray-500"> imported</span>
                              {job.duplicateItems > 0 && (
                                <span className="text-gray-400 text-[10px] ml-1">
                                  ({job.duplicateItems} dup)
                                </span>
                              )}
                            </div>
                          ) : job.status === 'RUNNING' ? (
                            <span className="text-[10px] text-gray-500">In progress...</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-500">
                          {formatDuration(job.startedAt, job.completedAt)}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-gray-500">
                          {formatDate(job.startedAt || job.createdAt)}
                        </td>
                        <td className="px-3 py-2">
                          {job.status === 'SUCCEEDED' && job.bulkImportId && (
                            <button
                              onClick={() => navigate(`/apify-records/${job.id}?bulkImportId=${job.bulkImportId}`)}
                              className="flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-purple-600 hover:bg-purple-50 rounded"
                            >
                              <EyeIcon className="h-3 w-3" />
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-3 py-2 border-t flex items-center justify-between">
                <p className="text-[10px] text-gray-500">
                  {offset + 1}-{Math.min(offset + limit, total)} of {total}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0}
                    className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50"
                  >
                    Prev
                  </button>
                  <span className="px-2 py-0.5 text-[10px] text-gray-500">
                    {currentPage}/{totalPages}
                  </span>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={currentPage >= totalPages}
                    className="px-2 py-0.5 text-[10px] border rounded disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
