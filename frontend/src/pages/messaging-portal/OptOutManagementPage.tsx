/**
 * Opt-Out Management Page
 * Manage contacts who have opted out from messaging channels
 */

import { useState, useEffect } from 'react';
import {
  NoSymbolIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XMarkIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';
import { messagingPortalApi, MessagingContact, PaginationMeta } from '../../services/messaging.service';

interface OptOutStats {
  totalContacts: number;
  smsOptOuts: number;
  whatsappOptOuts: number;
  rcsOptOuts: number;
}

const OptOutManagementPage = () => {
  const [contacts, setContacts] = useState<MessagingContact[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [stats, setStats] = useState<OptOutStats>({
    totalContacts: 0,
    smsOptOuts: 0,
    whatsappOptOuts: 0,
    rcsOptOuts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [channelFilter, setChannelFilter] = useState<'SMS' | 'WHATSAPP' | 'RCS' | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState('');
  const [importChannel, setImportChannel] = useState<'SMS' | 'WHATSAPP' | 'RCS'>('SMS');
  const [importing, setImporting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadOptOuts();
  }, [currentPage, channelFilter, search]);

  const loadOptOuts = async () => {
    try {
      setLoading(true);
      const result = await messagingPortalApi.getOptOuts(
        currentPage,
        50,
        channelFilter || undefined,
        search || undefined
      );
      setContacts(result.contacts);
      setPagination(result.pagination);
      setStats(result.stats);
    } catch (error) {
      console.error('Failed to load opt-outs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResubscribe = async (contactId: string, channel: 'sms' | 'whatsapp' | 'rcs') => {
    try {
      setActionLoading(`${contactId}-${channel}`);
      const updateData: Record<string, boolean> = {};
      if (channel === 'sms') updateData.smsOptOut = false;
      if (channel === 'whatsapp') updateData.whatsappOptOut = false;
      if (channel === 'rcs') updateData.rcsOptOut = false;

      await messagingPortalApi.updateOptOut(contactId, updateData);
      await loadOptOuts();
    } catch (error) {
      console.error('Failed to update opt-out status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkImport = async () => {
    try {
      setImporting(true);
      const phoneNumbers = importData
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (phoneNumbers.length === 0) {
        alert('Please enter at least one phone number');
        return;
      }

      const result = await messagingPortalApi.bulkOptOut(phoneNumbers, importChannel);
      alert(`Processed ${result.processed} numbers, ${result.optedOut} opted out`);
      setShowImportModal(false);
      setImportData('');
      await loadOptOuts();
    } catch (error) {
      console.error('Failed to import opt-outs:', error);
      alert('Failed to import opt-outs');
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await messagingPortalApi.exportOptOuts(channelFilter || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `opt-outs-${channelFilter || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export opt-outs:', error);
      alert('Failed to export opt-outs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opt-Out Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage contacts who have opted out from receiving messages
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowUpTrayIcon className="h-5 w-5 mr-2" />
            Import Opt-Outs
          </button>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <NoSymbolIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Contacts</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.totalContacts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <PhoneIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">SMS Opt-Outs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.smsOptOuts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChatBubbleLeftIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">WhatsApp Opt-Outs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.whatsappOptOuts}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChatBubbleLeftIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">RCS Opt-Outs</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.rcsOptOuts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={channelFilter}
              onChange={(e) => {
                setChannelFilter(e.target.value as 'SMS' | 'WHATSAPP' | 'RCS' | '');
                setCurrentPage(1);
              }}
              className="rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Channels</option>
              <option value="SMS">SMS</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="RCS">RCS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading opt-outs...</p>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center">
            <NoSymbolIcon className="h-12 w-12 text-gray-400 mx-auto" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No opt-outs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search || channelFilter
                ? 'Try adjusting your search or filter'
                : 'No contacts have opted out yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SMS
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      WhatsApp
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      RCS
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Opt-Out Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {contact.name || 'Unknown'}
                        </div>
                        {contact.email && (
                          <div className="text-sm text-gray-500">{contact.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {contact.smsOptOut ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <NoSymbolIcon className="h-3 w-3 mr-1" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Subscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {contact.whatsappOptOut ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <NoSymbolIcon className="h-3 w-3 mr-1" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Subscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        {contact.rcsOptOut ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <NoSymbolIcon className="h-3 w-3 mr-1" />
                            Opted Out
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                            Subscribed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {contact.optOutAt
                          ? new Date(contact.optOutAt).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          {contact.smsOptOut && (
                            <button
                              onClick={() => handleResubscribe(contact.id, 'sms')}
                              disabled={actionLoading === `${contact.id}-sms`}
                              className="text-blue-600 hover:text-blue-900 text-xs disabled:opacity-50"
                            >
                              {actionLoading === `${contact.id}-sms` ? 'Updating...' : 'Resubscribe SMS'}
                            </button>
                          )}
                          {contact.whatsappOptOut && (
                            <button
                              onClick={() => handleResubscribe(contact.id, 'whatsapp')}
                              disabled={actionLoading === `${contact.id}-whatsapp`}
                              className="text-green-600 hover:text-green-900 text-xs disabled:opacity-50"
                            >
                              {actionLoading === `${contact.id}-whatsapp` ? 'Updating...' : 'Resubscribe WhatsApp'}
                            </button>
                          )}
                          {contact.rcsOptOut && (
                            <button
                              onClick={() => handleResubscribe(contact.id, 'rcs')}
                              disabled={actionLoading === `${contact.id}-rcs`}
                              className="text-purple-600 hover:text-purple-900 text-xs disabled:opacity-50"
                            >
                              {actionLoading === `${contact.id}-rcs` ? 'Updating...' : 'Resubscribe RCS'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing page <span className="font-medium">{pagination.page}</span> of{' '}
                      <span className="font-medium">{pagination.totalPages}</span> (
                      <span className="font-medium">{pagination.total}</span> total)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={currentPage === pagination.totalPages}
                      className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={() => setShowImportModal(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Import Opt-Outs</h3>
                <button
                  onClick={() => setShowImportModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                  <select
                    value={importChannel}
                    onChange={(e) => setImportChannel(e.target.value as 'SMS' | 'WHATSAPP' | 'RCS')}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  >
                    <option value="SMS">SMS</option>
                    <option value="WHATSAPP">WhatsApp</option>
                    <option value="RCS">RCS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Numbers (one per line)
                  </label>
                  <textarea
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    placeholder={"+919876543210\n+918765432109\n+917654321098"}
                    rows={8}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter phone numbers with country code, one per line
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkImport}
                    disabled={importing || !importData.trim()}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : 'Import Opt-Outs'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptOutManagementPage;
