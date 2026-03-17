import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import {
  fetchBulkImportById,
  fetchRecords,
  toggleRecordSelection,
  selectAllRecords,
  clearSelectedRecords,
  assignToTelecallers,
  assignToAIAgent,
  bulkConvertToLeads,
  bulkUpdateStatus,
  clearCurrentImport,
} from '../../store/slices/rawImportSlice';
import { fetchTelecallers } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  ClockIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import { RawImportRecordStatus } from '../../services/rawImport.service';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

const STATUS_TABS: { key: RawImportRecordStatus | 'ALL'; label: string; color: string }[] = [
  { key: 'ALL', label: 'All', color: 'gray' },
  { key: 'PENDING', label: 'Pending', color: 'yellow' },
  { key: 'ASSIGNED', label: 'Assigned', color: 'blue' },
  { key: 'CALLING', label: 'Calling', color: 'purple' },
  { key: 'INTERESTED', label: 'Interested', color: 'green' },
  { key: 'NOT_INTERESTED', label: 'Not Interested', color: 'red' },
  { key: 'CONVERTED', label: 'Converted', color: 'primary' },
];

export default function RawImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();

  const { currentImport, records, selectedRecords, recordsTotal, isLoading } = useSelector(
    (state: RootState) => state.rawImports
  );
  const { telecallers } = useSelector((state: RootState) => state.users);

  const [activeTab, setActiveTab] = useState<RawImportRecordStatus | 'ALL'>('ALL');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'telecallers' | 'ai-agent' | null>(null);
  const [selectedTelecallers, setSelectedTelecallers] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [page, setPage] = useState(1);

  // Campaign modal state
  const [campaignName, setCampaignName] = useState('');
  const [callingHoursStart, setCallingHoursStart] = useState('09:00');
  const [callingHoursEnd, setCallingHoursEnd] = useState('18:00');
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchBulkImportById(id));
      dispatch(fetchTelecallers());
      loadRecords();
      loadVoiceAgents();
    }

    return () => {
      dispatch(clearCurrentImport());
    };
  }, [dispatch, id]);

  useEffect(() => {
    loadRecords();
  }, [activeTab, page]);

  // Lock body scroll when side panel is open
  useEffect(() => {
    if (showCampaignModal || showAssignModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showCampaignModal, showAssignModal]);

  const loadRecords = () => {
    if (!id) return;
    dispatch(
      fetchRecords({
        bulkImportId: id,
        status: activeTab === 'ALL' ? undefined : activeTab,
        page,
        limit: 50,
      })
    );
  };

  const loadVoiceAgents = async () => {
    try {
      const res = await api.get('/voice-ai/agents');
      // API returns { success: true, data: [...agents] }
      setVoiceAgents(res.data.data || []);
    } catch {
      // Voice agents not available
    }
  };

  const toggleTelecaller = (telecallerId: string) => {
    setSelectedTelecallers((prev) =>
      prev.includes(telecallerId)
        ? prev.filter((c) => c !== telecallerId)
        : [...prev, telecallerId]
    );
  };

  const handleAssignTelecallers = async () => {
    if (selectedTelecallers.length === 0) {
      showToast.error('Please select at least one telecaller');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to assign');
      return;
    }

    try {
      await dispatch(
        assignToTelecallers({
          recordIds: selectedRecords,
          telecallerIds: selectedTelecallers,
        })
      ).unwrap();
      showToast.success('Records assigned to telecallers successfully');
      setShowAssignModal(false);
      setAssignmentType(null);
      setSelectedTelecallers([]);
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to assign records');
    }
  };

  const handleOpenCampaignModal = () => {
    // Generate default campaign name based on file name and date
    const sourceName = currentImport?.fileName?.replace(/\.[^/.]+$/, '') || 'Raw Import';
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    setCampaignName(`${sourceName} - ${dateStr}`);
    setShowCampaignModal(true);
  };

  const handleCreateAndStartCampaign = async () => {
    if (!selectedAgent) {
      showToast.error('Please select an AI agent');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to assign');
      return;
    }
    if (!campaignName.trim()) {
      showToast.error('Please enter a campaign name');
      return;
    }

    setIsCreatingCampaign(true);

    try {
      // Get selected records data for contacts
      const selectedRecordsData = records.filter(r => selectedRecords.includes(r.id));
      const contacts = selectedRecordsData.map(record => ({
        phone: record.phone,
        name: `${record.firstName} ${record.lastName || ''}`.trim(),
        email: record.email,
        customData: {
          rawImportRecordId: record.id,
          ...(record.customFields as object || {})
        }
      }));

      // Step 1: Create the campaign
      const campaignRes = await api.post('/outbound-calls/campaigns', {
        name: campaignName,
        agentId: selectedAgent,
        contacts,
        callingHours: {
          start: callingHoursStart,
          end: callingHoursEnd
        }
      });

      const campaignId = campaignRes.data.data?.id;

      if (!campaignId) {
        throw new Error('Failed to create campaign');
      }

      // Step 2: Update raw import records to ASSIGNED status
      await dispatch(
        assignToAIAgent({
          recordIds: selectedRecords,
          agentId: selectedAgent,
        })
      ).unwrap();

      // Step 3: Start the campaign
      await api.post(`/outbound-calls/campaigns/${campaignId}/start`);

      showToast.success(`Campaign "${campaignName}" started with ${contacts.length} contacts!`);

      // Reset modal state
      setShowCampaignModal(false);
      setSelectedAgent('');
      setCampaignName('');
      setCallingHoursStart('09:00');
      setCallingHoursEnd('18:00');

      // Refresh data
      loadRecords();
      dispatch(fetchBulkImportById(id!));
      dispatch(clearSelectedRecords());

    } catch (error: any) {
      console.error('Campaign creation error:', error);
      showToast.error(error.response?.data?.message || 'Failed to create campaign');
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  const handleBulkConvert = async () => {
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to convert');
      return;
    }

    try {
      const result = await dispatch(bulkConvertToLeads(selectedRecords)).unwrap();
      showToast.success(`${result.convertedCount} records converted to leads`);
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to convert records');
    }
  };

  const handleMarkAsInterested = async () => {
    if (selectedRecords.length === 0) {
      showToast.error('Please select records');
      return;
    }

    try {
      await dispatch(bulkUpdateStatus({ recordIds: selectedRecords, status: 'INTERESTED' })).unwrap();
      showToast.success(`${selectedRecords.length} record(s) marked as interested`);
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to update status');
    }
  };

  const handleMarkAsNotInterested = async () => {
    if (selectedRecords.length === 0) {
      showToast.error('Please select records');
      return;
    }

    try {
      await dispatch(bulkUpdateStatus({ recordIds: selectedRecords, status: 'NOT_INTERESTED' })).unwrap();
      showToast.success(`${selectedRecords.length} record(s) marked as not interested`);
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to update status');
    }
  };

  const getStatusBadge = (status: RawImportRecordStatus) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      ASSIGNED: 'bg-blue-100 text-blue-800',
      CALLING: 'bg-purple-100 text-purple-800',
      INTERESTED: 'bg-green-100 text-green-800',
      NOT_INTERESTED: 'bg-red-100 text-red-800',
      NO_ANSWER: 'bg-gray-100 text-gray-800',
      CALLBACK_REQUESTED: 'bg-orange-100 text-orange-800',
      CONVERTED: 'bg-primary-100 text-primary-800',
      REJECTED: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${
          styles[status] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!currentImport) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <button
          onClick={() => navigate('/raw-imports')}
          className="flex items-center text-xs text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5 mr-1" />
          Back to Raw Imports
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{currentImport.fileName}</h1>
            <p className="text-xs text-gray-500">
              Uploaded{' '}
              {currentImport.uploadedBy
                ? `by ${currentImport.uploadedBy.firstName} ${currentImport.uploadedBy.lastName}`
                : ''}{' '}
              on {formatDate(currentImport.createdAt)}
            </p>
          </div>
          <button onClick={loadRecords} className="btn btn-outline btn-sm flex items-center gap-1 text-xs">
            <ArrowPathIcon className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
        <div className="card p-2">
          <p className="text-xs text-gray-500">Total Records</p>
          <p className="text-lg font-semibold text-gray-900">{currentImport.validRows}</p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-lg font-semibold text-yellow-600">
            {currentImport.statusBreakdown?.PENDING || 0}
          </p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Assigned</p>
          <p className="text-lg font-semibold text-blue-600">
            {(currentImport.statusBreakdown?.ASSIGNED || 0) +
              (currentImport.statusBreakdown?.CALLING || 0)}
          </p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Interested</p>
          <p className="text-lg font-semibold text-green-600">
            {currentImport.statusBreakdown?.INTERESTED || 0}
          </p>
        </div>
        <div className="card p-2">
          <p className="text-xs text-gray-500">Converted</p>
          <p className="text-lg font-semibold text-primary-600">{currentImport.convertedCount}</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRecords.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-2 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-primary-800 font-medium text-xs">
              {selectedRecords.length} record(s) selected
            </span>
            <button
              onClick={() => dispatch(clearSelectedRecords())}
              className="text-primary-600 hover:text-primary-800 text-[10px]"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setAssignmentType('telecallers');
                setShowAssignModal(true);
              }}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs"
            >
              <UserGroupIcon className="h-3.5 w-3.5" />
              Telecallers
            </button>
            <button
              onClick={handleOpenCampaignModal}
              className="btn btn-outline btn-sm flex items-center gap-1 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
            >
              <CpuChipIcon className="h-3.5 w-3.5" />
              AI Campaign
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200 mb-3">
        <nav className="-mb-px flex space-x-4 overflow-x-auto">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.key === 'ALL'
                ? currentImport.validRows
                : currentImport.statusBreakdown?.[tab.key] || 0;

            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setPage(1);
                }}
                className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] ${
                    activeTab === tab.key
                      ? 'bg-primary-100 text-primary-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Records Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">
                  <input
                    type="checkbox"
                    checked={
                      records.length > 0 &&
                      records.every((r) => selectedRecords.includes(r.id))
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        dispatch(selectAllRecords());
                      } else {
                        dispatch(clearSelectedRecords());
                      }
                    }}
                    className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300"
                  />
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Source
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Assigned To
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Calls
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium text-gray-500 uppercase">
                  Last Call
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-xs text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record) => {
                  const customFields = record.customFields as Record<string, unknown> || {};
                  const source = (customFields.source as string) || 'BULK_UPLOAD';
                  const sourceDetails = customFields.sourceDetails as string;

                  const getSourceBadge = (src: string) => {
                    const sourceStyles: Record<string, { bg: string; text: string; label: string }> = {
                      'AD_FACEBOOK': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Facebook' },
                      'AD_INSTAGRAM': { bg: 'bg-pink-100', text: 'text-pink-800', label: 'Instagram' },
                      'AD_GOOGLE': { bg: 'bg-red-100', text: 'text-red-800', label: 'Google Ads' },
                      'AD_LINKEDIN': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'LinkedIn' },
                      'FORM': { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Form' },
                      'LANDING_PAGE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Landing Page' },
                      'WEBSITE': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Website' },
                      'BULK_UPLOAD': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'CSV Upload' },
                      'WHATSAPP': { bg: 'bg-green-100', text: 'text-green-800', label: 'WhatsApp' },
                      'API': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'API' },
                    };
                    const style = sourceStyles[src] || { bg: 'bg-gray-100', text: 'text-gray-800', label: src };
                    return (
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    );
                  };

                  return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={() => dispatch(toggleRecordSelection(record.id))}
                        className="h-3.5 w-3.5 text-primary-600 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="text-xs font-medium text-gray-900">
                        {record.firstName} {record.lastName}
                      </p>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <p className="text-xs text-gray-900">{record.phone}</p>
                      {record.email && (
                        <p className="text-[10px] text-gray-500">{record.email}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getSourceBadge(source)}
                      {sourceDetails && (
                        <p className="text-[10px] text-gray-500 mt-0.5">{sourceDetails}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {record.assignedTo ? (
                        <span className="flex items-center gap-0.5">
                          <UserGroupIcon className="h-3 w-3" />
                          {record.assignedTo.firstName} {record.assignedTo.lastName}
                        </span>
                      ) : record.assignedAgent ? (
                        <span className="flex items-center gap-0.5 text-purple-600">
                          <CpuChipIcon className="h-3 w-3" />
                          {record.assignedAgent.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {record.callAttempts > 0 ? (
                        <span className="flex items-center gap-0.5">
                          <PhoneIcon className="h-3 w-3" />
                          {record.callAttempts}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                      {record.lastCallAt ? (
                        <span className="flex items-center gap-0.5">
                          <ClockIcon className="h-3 w-3" />
                          {formatDate(record.lastCallAt)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {recordsTotal > 50 && (
          <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {Math.ceil(recordsTotal / 50)}
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline btn-sm text-xs"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 50 >= recordsTotal}
                className="btn btn-outline btn-sm text-xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Telecaller Assignment Side Panel */}
      {showAssignModal && (
        <>
          {/* Backdrop */}
          <div
            className="fixed top-11 left-0 right-0 bottom-0 lg:left-52 bg-black bg-opacity-30 z-40"
            onClick={() => {
              setShowAssignModal(false);
              setAssignmentType(null);
              setSelectedTelecallers([]);
            }}
          />

          {/* Side Panel */}
          <div className="fixed top-11 right-0 bottom-0 w-96 max-w-[calc(100vw-13rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-blue-50">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                <UserGroupIcon className="h-5 w-5 text-blue-600" />
                Assign to Telecallers
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignmentType(null);
                  setSelectedTelecallers([]);
                }}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-blue-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Selected Records Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <UserGroupIcon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900">{selectedRecords.length} Records Selected</p>
                    <p className="text-xs text-blue-600">Will be distributed round-robin</p>
                  </div>
                </div>
              </div>

              {/* Telecaller Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Select Telecallers
                </label>
                {telecallers.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <UserGroupIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs">No telecallers available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {telecallers.map((telecaller) => (
                      <label
                        key={telecaller.id}
                        className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedTelecallers.includes(telecaller.id)
                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTelecallers.includes(telecaller.id)}
                          onChange={() => toggleTelecaller(telecaller.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <div className="ml-3 flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {telecaller.firstName} {telecaller.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(telecaller as any).activeRecordCount || 0} active records
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Info about distribution */}
              {selectedTelecallers.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <p className="font-medium mb-1">Distribution Info:</p>
                  <p>Records will be evenly distributed among {selectedTelecallers.length} selected telecaller(s).</p>
                  <p className="mt-1">~{Math.ceil(selectedRecords.length / selectedTelecallers.length)} records per telecaller</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 space-y-3">
              <button
                onClick={handleAssignTelecallers}
                disabled={selectedTelecallers.length === 0}
                className="w-full btn text-sm bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <UserGroupIcon className="h-4 w-4" />
                Assign to {selectedTelecallers.length || 0} Telecaller(s)
              </button>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignmentType(null);
                  setSelectedTelecallers([]);
                }}
                className="w-full btn btn-outline text-sm py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

      {/* AI Campaign Side Panel */}
      {showCampaignModal && (
        <>
          {/* Backdrop - covers content area only (after sidebar, below header) */}
          <div
            className="fixed top-11 left-0 right-0 bottom-0 lg:left-52 bg-black bg-opacity-30 z-40"
            onClick={() => {
              setShowCampaignModal(false);
              setSelectedAgent('');
              setCampaignName('');
            }}
          />

          {/* Side Panel - fixed on right, within content area */}
          <div className="fixed top-11 right-0 bottom-0 w-96 max-w-[calc(100vw-13rem)] bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-purple-50">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-900">
                <CpuChipIcon className="h-5 w-5 text-purple-600" />
                AI Calling Campaign
              </h3>
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedAgent('');
                  setCampaignName('');
                }}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-purple-100"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {/* Selected Records Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <PhoneIcon className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-purple-900">{selectedRecords.length} Records Selected</p>
                    <p className="text-xs text-purple-600">Will be called by AI agent</p>
                  </div>
                </div>
              </div>

              {/* Campaign Name */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="Enter campaign name"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* AI Agent Selection */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  AI Voice Agent
                </label>
                {voiceAgents.filter((a) => a.isActive).length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <CpuChipIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 text-xs mb-3">No AI agents available</p>
                    <button
                      onClick={() => navigate('/voice-ai/create')}
                      className="btn btn-outline btn-sm text-xs"
                    >
                      Create AI Agent
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {voiceAgents
                      .filter((a) => a.isActive)
                      .map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedAgent === agent.id
                              ? 'border-purple-500 bg-purple-50 ring-2 ring-purple-200'
                              : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="agent"
                            value={agent.id}
                            checked={selectedAgent === agent.id}
                            onChange={(e) => setSelectedAgent(e.target.value)}
                            className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                            {agent.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{agent.description}</p>
                            )}
                          </div>
                        </label>
                      ))}
                  </div>
                )}
              </div>

              {/* Calling Hours */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">
                  Calling Hours
                </label>
                <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      value={callingHoursStart}
                      onChange={(e) => setCallingHoursStart(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <span className="text-gray-400 mt-4">→</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-gray-500 mb-1">End Time</label>
                    <input
                      type="time"
                      value={callingHoursEnd}
                      onChange={(e) => setCallingHoursEnd(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1">
                  <ClockIcon className="h-3 w-3" />
                  Calls will only be made during these hours
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-4 space-y-3">
              <button
                onClick={handleCreateAndStartCampaign}
                disabled={!selectedAgent || !campaignName.trim() || isCreatingCampaign}
                className="w-full btn text-sm bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50 disabled:cursor-not-allowed py-2.5 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                {isCreatingCampaign ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <PhoneIcon className="h-4 w-4" />
                    Start Campaign
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setShowCampaignModal(false);
                  setSelectedAgent('');
                  setCampaignName('');
                }}
                className="w-full btn btn-outline text-sm py-2 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
