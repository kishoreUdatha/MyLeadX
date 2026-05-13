import { useState, useEffect } from 'react';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  PaperAirplaneIcon,
  EyeIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { messagingPortalApi } from '../../services/messaging.service';

interface Message {
  id: string;
  phone: string;
  name?: string;
  channel: 'SMS' | 'WHATSAPP' | 'RCS';
  content: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'READ';
  senderId?: string;
  templateId?: string;
  dltTemplateId?: string;
  externalId?: string;
  error?: string;
  source: 'quick-send' | 'campaign' | 'scheduled' | 'api';
  campaignName?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
}

const MessageHistoryPage = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    channel: '',
    status: '',
    search: '',
    startDate: '',
    endDate: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    loadMessages();
  }, [page, filters]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const response = await messagingPortalApi.getMessageHistory({
        page,
        limit: 20,
        ...filters,
      });
      setMessages(response.messages || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotal(response.pagination?.total || 0);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { bg: string; text: string; icon: any }> = {
      PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: ClockIcon },
      SENT: { bg: 'bg-blue-100', text: 'text-blue-800', icon: PaperAirplaneIcon },
      DELIVERED: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircleIcon },
      READ: { bg: 'bg-purple-100', text: 'text-purple-800', icon: EyeIcon },
      FAILED: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircleIcon },
    };
    const config = statusConfig[status] || statusConfig.PENDING;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </span>
    );
  };

  const getChannelBadge = (channel: string) => {
    const colors: Record<string, string> = {
      SMS: 'bg-blue-100 text-blue-800',
      WHATSAPP: 'bg-green-100 text-green-800',
      RCS: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[channel] || 'bg-gray-100 text-gray-800'}`}>
        {channel}
      </span>
    );
  };

  const getSourceBadge = (source: string) => {
    const labels: Record<string, { label: string; color: string }> = {
      'quick-send': { label: 'Quick Send', color: 'bg-indigo-100 text-indigo-800' },
      campaign: { label: 'Campaign', color: 'bg-orange-100 text-orange-800' },
      scheduled: { label: 'Scheduled', color: 'bg-cyan-100 text-cyan-800' },
      api: { label: 'API', color: 'bg-gray-100 text-gray-800' },
    };
    const config = labels[source] || labels.api;
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = () => {
    const headers = ['Phone', 'User Name', 'Sender ID', 'Channel', 'Status', 'Source', 'Content', 'Sent At', 'Error'];
    const rows = messages.map((m) => [
      m.phone,
      m.name || '',
      m.senderId || '',
      m.channel,
      m.status,
      m.source,
      `"${m.content.replace(/"/g, '""')}"`,
      m.sentAt || m.createdAt,
      m.error || '',
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Message History</h1>
          <p className="text-gray-500">View all SMS transactions and delivery status</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={loadMessages}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Messages</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Delivered</div>
          <div className="text-2xl font-bold text-green-600">
            {messages.filter((m) => m.status === 'DELIVERED').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Pending</div>
          <div className="text-2xl font-bold text-yellow-600">
            {messages.filter((m) => m.status === 'PENDING' || m.status === 'SENT').length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {messages.filter((m) => m.status === 'FAILED').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone number..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={filters.channel}
            onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Channels</option>
            <option value="SMS">SMS</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="RCS">RCS</option>
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="SENT">Sent</option>
            <option value="DELIVERED">Delivered</option>
            <option value="FAILED">Failed</option>
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FunnelIcon className="w-5 h-5" />
            More Filters
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t flex gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">End Date</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <button
              onClick={() => setFilters({ channel: '', status: '', search: '', startDate: '', endDate: '' })}
              className="self-end px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Messages Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sender ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Channel</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-primary-600" />
                  <p className="mt-2 text-gray-500">Loading messages...</p>
                </td>
              </tr>
            ) : messages.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center">
                  <PaperAirplaneIcon className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="mt-2 text-gray-500">No messages found</p>
                </td>
              </tr>
            ) : (
              messages.map((message) => (
                <tr key={message.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{message.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {message.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {message.senderId ? (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-mono rounded">
                        {message.senderId}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{getChannelBadge(message.channel)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(message.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{getSourceBadge(message.source)}</td>
                  <td className="px-6 py-4">
                    <div className="max-w-xs truncate text-gray-600" title={message.content}>
                      {message.content}
                    </div>
                    {message.error && (
                      <div className="text-xs text-red-500 mt-1">{message.error}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(message.sentAt || message.createdAt)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => setSelectedMessage(message)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      <EyeIcon className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing page {page} of {totalPages} ({total} messages)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Message Detail Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Message Details</h3>
                <button onClick={() => setSelectedMessage(null)} className="text-gray-400 hover:text-gray-600">
                  &times;
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Phone</label>
                    <div className="font-medium">{selectedMessage.phone}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">User Name</label>
                    <div className="font-medium">{selectedMessage.name || '-'}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Channel</label>
                    <div>{getChannelBadge(selectedMessage.channel)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Status</label>
                    <div>{getStatusBadge(selectedMessage.status)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Source</label>
                    <div>{getSourceBadge(selectedMessage.source)}</div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Sender ID</label>
                    <div className="font-mono">{selectedMessage.senderId || '-'}</div>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Message Content</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">{selectedMessage.content}</div>
                </div>

                {selectedMessage.dltTemplateId && (
                  <div>
                    <label className="text-sm text-gray-500">DLT Template ID</label>
                    <div className="font-mono text-sm">{selectedMessage.dltTemplateId}</div>
                  </div>
                )}

                {selectedMessage.externalId && (
                  <div>
                    <label className="text-sm text-gray-500">MSG91 Request ID</label>
                    <div className="font-mono text-sm">{selectedMessage.externalId}</div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Created At</label>
                    <div className="text-sm">{formatDate(selectedMessage.createdAt)}</div>
                  </div>
                  {selectedMessage.sentAt && (
                    <div>
                      <label className="text-sm text-gray-500">Sent At</label>
                      <div className="text-sm">{formatDate(selectedMessage.sentAt)}</div>
                    </div>
                  )}
                  {selectedMessage.deliveredAt && (
                    <div>
                      <label className="text-sm text-gray-500">Delivered At</label>
                      <div className="text-sm">{formatDate(selectedMessage.deliveredAt)}</div>
                    </div>
                  )}
                </div>

                {selectedMessage.error && (
                  <div>
                    <label className="text-sm text-gray-500">Error</label>
                    <div className="mt-1 p-3 bg-red-50 text-red-700 rounded-lg">{selectedMessage.error}</div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageHistoryPage;
