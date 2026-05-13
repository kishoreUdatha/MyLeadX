import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  PlusIcon,
  MegaphoneIcon,
  ChatBubbleLeftRightIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  StopIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { bulkMessagingApi, BulkMessageJob } from '../../services/messaging.service';

// WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CampaignsPage = () => {
  const [campaigns, setCampaigns] = useState<BulkMessageJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{ status: string; channel: string }>({ status: '', channel: '' });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    loadCampaigns();
  }, [pagination.page, filter]);

  const loadCampaigns = async () => {
    try {
      const response = await bulkMessagingApi.listJobs(
        pagination.page,
        pagination.limit,
        {
          status: (filter.status || undefined) as any,
          channel: (filter.channel || undefined) as any,
        }
      );
      setCampaigns(response.jobs);
      setPagination((prev) => ({ ...prev, total: response.pagination.total }));
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this campaign?')) return;
    try {
      await bulkMessagingApi.cancelJob(id);
      loadCampaigns();
    } catch (error) {
      console.error('Failed to cancel campaign:', error);
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel.toLowerCase()) {
      case 'sms':
        return <ChatBubbleLeftRightIcon className="h-5 w-5 text-blue-600" />;
      case 'whatsapp':
        return <WhatsAppIcon className="h-5 w-5 text-green-600" />;
      case 'rcs':
        return <DevicePhoneMobileIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <MegaphoneIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      DRAFT: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Draft' },
      SCHEDULED: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Scheduled' },
      PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' },
      CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Cancelled' },
    };
    const config = statusConfig[status] || statusConfig.DRAFT;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getProgressPercentage = (job: BulkMessageJob) => {
    if (job.totalCount === 0) return 0;
    return Math.round(((job.sentCount + job.failedCount) / job.totalCount) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-600">View and manage your messaging campaigns</p>
        </div>
        <Link
          to="/messaging-portal/campaigns/create"
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <FunnelIcon className="h-5 w-5 text-gray-400" />
          <select
            value={filter.channel}
            onChange={(e) => setFilter({ ...filter, channel: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Channels</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="rcs">RCS</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {campaigns.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-3 bg-gray-100 rounded-lg">
                      {getChannelIcon(campaign.channel)}
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <h3 className="text-sm font-semibold text-gray-900">
                          {campaign.name || `${campaign.channel.toUpperCase()} Campaign`}
                        </h3>
                        <span className="ml-2">{getStatusBadge(campaign.status)}</span>
                        {campaign.senderId && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
                            {campaign.senderId}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        Created {new Date(campaign.createdAt).toLocaleDateString()} at{' '}
                        {new Date(campaign.createdAt).toLocaleTimeString()}
                      </p>
                      {campaign.message && (
                        <p className="text-sm text-gray-600 mt-1 truncate max-w-md">
                          {campaign.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.sentCount} / {campaign.totalCount}
                      </div>
                      <div className="text-xs text-gray-500">
                        {campaign.failedCount > 0 && (
                          <span className="text-red-600">{campaign.failedCount} failed</span>
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {campaign.status === 'PROCESSING' && (
                      <div className="w-32">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-600 rounded-full transition-all"
                            style={{ width: `${getProgressPercentage(campaign)}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          {getProgressPercentage(campaign)}%
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/messaging-portal/campaigns/${campaign.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      {(campaign.status === 'SCHEDULED' || campaign.status === 'PROCESSING') && (
                        <button
                          onClick={() => handleCancelCampaign(campaign.id)}
                          className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                        >
                          <StopIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <MegaphoneIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No campaigns found</p>
            <Link
              to="/messaging-portal/campaigns/create"
              className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-700"
            >
              Create your first campaign <PlusIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} campaigns
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page * pagination.limit >= pagination.total}
                className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsPage;
