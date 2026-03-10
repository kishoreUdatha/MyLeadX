import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchBulkImports, fetchStats } from '../../store/slices/rawImportSlice';
import {
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

export default function RawImportsPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { imports, total, stats, isLoading } = useSelector(
    (state: RootState) => state.rawImports
  );

  useEffect(() => {
    dispatch(fetchBulkImports({ page: 1, limit: 20 }));
    dispatch(fetchStats());
  }, [dispatch]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="h-3 w-3 mr-1" />
            Completed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="h-3 w-3 mr-1" />
            Processing
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationCircleIcon className="h-3 w-3 mr-1" />
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Raw Data Imports</h1>
          <p className="text-gray-600 mt-1">
            Manage uploaded data before converting to leads
          </p>
        </div>
        <button
          onClick={() => navigate('/leads/bulk-upload')}
          className="btn btn-primary flex items-center gap-2"
        >
          <DocumentArrowUpIcon className="h-5 w-5" />
          Upload New Data
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Imports</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalImports}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Total Records</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingRecords}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Interested</p>
            <p className="text-2xl font-bold text-green-600">{stats.interestedRecords}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Converted</p>
            <p className="text-2xl font-bold text-primary-600">{stats.convertedRecords}</p>
          </div>
          <div className="card p-4">
            <p className="text-sm text-gray-500">Not Interested</p>
            <p className="text-2xl font-bold text-red-600">{stats.notInterestedRecords}</p>
          </div>
        </div>
      )}

      {/* Imports Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-medium">Recent Uploads</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Uploaded By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Converted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : imports.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <DocumentArrowUpIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">No imports yet</p>
                    <p className="text-sm mt-1">Upload a CSV or Excel file to get started</p>
                    <button
                      onClick={() => navigate('/leads/bulk-upload')}
                      className="mt-4 btn btn-primary"
                    >
                      Upload Data
                    </button>
                  </td>
                </tr>
              ) : (
                imports.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/raw-imports/${item.id}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DocumentArrowUpIcon className="h-5 w-5 text-gray-400 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {item.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(item.fileSize)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.uploadedBy
                        ? `${item.uploadedBy.firstName} ${item.uploadedBy.lastName}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-gray-900">
                          {item.validRows}
                        </span>
                        <span className="text-gray-500"> valid</span>
                        {item.duplicateRows > 0 && (
                          <span className="text-yellow-600 ml-2">
                            ({item.duplicateRows} dups)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <span className="font-medium text-primary-600">
                          {item.convertedCount}
                        </span>
                        <span className="text-gray-500">
                          {' '}
                          / {item.validRows}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-primary-600 hover:text-primary-800 flex items-center gap-1">
                        View
                        <ArrowRightIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {imports.length} of {total} imports
            </p>
            {/* Add pagination controls here if needed */}
          </div>
        )}
      </div>
    </div>
  );
}
