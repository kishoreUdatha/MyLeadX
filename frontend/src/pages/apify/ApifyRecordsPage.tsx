import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';

interface ApifyRecord {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  customFields?: any;
  status: string;
  notes?: string;
  createdAt: string;
}

interface JobDetails {
  id: string;
  status: string;
  totalItems: number;
  importedItems: number;
  duplicateItems: number;
  failedItems: number;
  createdAt: string;
  completedAt: string | null;
  config: {
    name: string;
    scraperType: string;
  } | null;
}

const SCRAPER_TYPE_LABELS: Record<string, string> = {
  GOOGLE_MAPS: 'Google Maps',
  LINKEDIN_COMPANY: 'LinkedIn Companies',
  LINKEDIN_PEOPLE: 'LinkedIn People',
  YELLOW_PAGES: 'Yellow Pages',
  CUSTOM: 'Custom',
};

export default function ApifyRecordsPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [_searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [job, setJob] = useState<JobDetails | null>(null);
  const [records, setRecords] = useState<ApifyRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    loadData();
  }, [jobId, currentPage, statusFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);

      if (!jobId) {
        toast.error('No job ID provided');
        return;
      }

      // Use the dedicated Apify records endpoint
      const response = await api.get(`/apify/jobs/${jobId}/records`, {
        params: {
          page: currentPage,
          limit: pageSize,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          search: searchTerm || undefined,
        },
      });

      console.log('Apify records response:', response.data);

      const { job: jobData, records: recordsData, total } = response.data.data;

      setJob(jobData);
      setRecords(recordsData || []);
      setTotalRecords(total || 0);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Failed to load records');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    loadData();
  };

  const handleExportCSV = () => {
    if (records.length === 0) {
      toast.error('No records to export');
      return;
    }

    // Generate CSV from records
    const headers = ['Name', 'Phone', 'Email', 'Website', 'Address', 'City', 'Status', 'Created At'];
    const rows = records.map(record => [
      getDisplayValue(record, 'name'),
      getDisplayValue(record, 'phone'),
      getDisplayValue(record, 'email'),
      getDisplayValue(record, 'website'),
      getDisplayValue(record, 'address'),
      getDisplayValue(record, 'city'),
      record.status,
      formatDate(record.createdAt),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `apify-records-${job?.config?.name || 'export'}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    toast.success('Export downloaded');
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayValue = (record: ApifyRecord, field: string): string => {
    const custom = record.customFields || {};

    switch (field) {
      case 'name':
        // Build name from firstName + lastName, or check customFields
        const fullName = [record.firstName, record.lastName].filter(Boolean).join(' ');
        return fullName || custom.companyName || custom.title || custom.name || '-';
      case 'phone':
        return record.phone || record.alternatePhone || custom.phone || '-';
      case 'email':
        return record.email || custom.email || '-';
      case 'website':
        return custom.website || custom.url || '-';
      case 'address':
        return custom.address || custom.fullAddress || custom.street || '-';
      case 'city':
        return custom.city || custom.locality || '-';
      default:
        return custom[field] || '-';
    }
  };

  const totalPages = Math.ceil(totalRecords / pageSize);

  if (isLoading && records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <ArrowPathIcon className="h-6 w-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/apify-dashboard')}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {job?.config?.name || 'Scraped Records'}
            </h1>
            <p className="text-xs text-gray-500">
              {job?.config?.scraperType && SCRAPER_TYPE_LABELS[job.config.scraperType]}
              {job?.createdAt && ` • ${formatDate(job.createdAt)}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="btn btn-sm flex items-center gap-1 text-xs border border-gray-300 hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={loadData}
            className="btn btn-sm flex items-center gap-1 text-xs border border-gray-300 hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {job && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <div className="card p-2">
            <p className="text-[10px] text-gray-500 uppercase">Total Found</p>
            <p className="text-lg font-semibold text-gray-900">{job.totalItems}</p>
          </div>
          <div className="card p-2">
            <p className="text-[10px] text-gray-500 uppercase">Imported</p>
            <p className="text-lg font-semibold text-green-600">{job.importedItems}</p>
          </div>
          <div className="card p-2">
            <p className="text-[10px] text-gray-500 uppercase">Duplicates</p>
            <p className="text-lg font-semibold text-yellow-600">{job.duplicateItems}</p>
          </div>
          <div className="card p-2">
            <p className="text-[10px] text-gray-500 uppercase">Failed</p>
            <p className="text-lg font-semibold text-red-600">{job.failedItems}</p>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="card mb-4">
        <div className="p-3 flex items-center gap-3">
          <form onSubmit={handleSearch} className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search records..."
                className="input input-sm pl-8 w-full text-xs"
              />
            </div>
            <button type="submit" className="btn btn-sm btn-primary text-xs">
              Search
            </button>
          </form>

          <div className="flex items-center gap-2">
            <FunnelIcon className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="input input-sm text-xs"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSED">Processed</option>
              <option value="FAILED">Failed</option>
              <option value="DUPLICATE">Duplicate</option>
            </select>
          </div>
        </div>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Business/Name</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Email</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Location</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Website</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">Added</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1 bg-blue-50 rounded">
                          <BuildingOfficeIcon className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900 max-w-[180px] truncate">
                            {getDisplayValue(record, 'name')}
                          </p>
                          {record.customFields?.category && (
                            <p className="text-[10px] text-gray-400 truncate max-w-[180px]">
                              {record.customFields.category}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {getDisplayValue(record, 'phone') !== '-' ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <PhoneIcon className="h-3 w-3 text-gray-400" />
                          {getDisplayValue(record, 'phone')}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {getDisplayValue(record, 'email') !== '-' ? (
                        <div className="flex items-center gap-1 text-xs text-gray-600">
                          <EnvelopeIcon className="h-3 w-3 text-gray-400" />
                          <span className="truncate max-w-[150px]">{getDisplayValue(record, 'email')}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-xs text-gray-600">
                        <MapPinIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        <span className="truncate max-w-[180px]">
                          {getDisplayValue(record, 'address') !== '-'
                            ? getDisplayValue(record, 'address')
                            : getDisplayValue(record, 'city')}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {getDisplayValue(record, 'website') !== '-' ? (
                        <a
                          href={getDisplayValue(record, 'website')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <GlobeAltIcon className="h-3 w-3" />
                          <span className="truncate max-w-[120px]">
                            {getDisplayValue(record, 'website').replace(/^https?:\/\//, '')}
                          </span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
                        record.status === 'PROCESSED' ? 'bg-green-100 text-green-800' :
                        record.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        record.status === 'DUPLICATE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {record.status === 'PROCESSED' && <CheckCircleIcon className="h-2.5 w-2.5" />}
                        {record.status === 'FAILED' && <XCircleIcon className="h-2.5 w-2.5" />}
                        {record.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {formatDate(record.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2 text-xs text-gray-600">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-2 py-1 text-xs border rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
