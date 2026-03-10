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
  clearCurrentImport,
} from '../../store/slices/rawImportSlice';
import { fetchCounselors } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  UserGroupIcon,
  CpuChipIcon,
  ArrowPathIcon,
  CheckIcon,
  XMarkIcon,
  PhoneIcon,
  ClockIcon,
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
  const { counselors } = useSelector((state: RootState) => state.users);

  const [activeTab, setActiveTab] = useState<RawImportRecordStatus | 'ALL'>('ALL');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentType, setAssignmentType] = useState<'telecallers' | 'ai-agent' | null>(null);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (id) {
      dispatch(fetchBulkImportById(id));
      dispatch(fetchCounselors());
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
      setVoiceAgents(res.data.data?.agents || []);
    } catch {
      // Voice agents not available
    }
  };

  const toggleCounselor = (counselorId: string) => {
    setSelectedCounselors((prev) =>
      prev.includes(counselorId)
        ? prev.filter((c) => c !== counselorId)
        : [...prev, counselorId]
    );
  };

  const handleAssignTelecallers = async () => {
    if (selectedCounselors.length === 0) {
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
          telecallerIds: selectedCounselors,
        })
      ).unwrap();
      showToast.success('Records assigned to telecallers successfully');
      setShowAssignModal(false);
      setAssignmentType(null);
      setSelectedCounselors([]);
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to assign records');
    }
  };

  const handleAssignAIAgent = async () => {
    if (!selectedAgent) {
      showToast.error('Please select an AI agent');
      return;
    }
    if (selectedRecords.length === 0) {
      showToast.error('Please select records to assign');
      return;
    }

    try {
      await dispatch(
        assignToAIAgent({
          recordIds: selectedRecords,
          agentId: selectedAgent,
        })
      ).unwrap();
      showToast.success('Records assigned to AI agent successfully');
      setShowAssignModal(false);
      setAssignmentType(null);
      setSelectedAgent('');
      loadRecords();
      dispatch(fetchBulkImportById(id!));
    } catch (error) {
      showToast.error('Failed to assign records');
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
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/raw-imports')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Raw Imports
        </button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentImport.fileName}</h1>
            <p className="text-gray-600 mt-1">
              Uploaded{' '}
              {currentImport.uploadedBy
                ? `by ${currentImport.uploadedBy.firstName} ${currentImport.uploadedBy.lastName}`
                : ''}{' '}
              on {formatDate(currentImport.createdAt)}
            </p>
          </div>
          <button onClick={loadRecords} className="btn btn-outline flex items-center gap-2">
            <ArrowPathIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{currentImport.validRows}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">
            {currentImport.statusBreakdown?.PENDING || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Assigned</p>
          <p className="text-2xl font-bold text-blue-600">
            {(currentImport.statusBreakdown?.ASSIGNED || 0) +
              (currentImport.statusBreakdown?.CALLING || 0)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Interested</p>
          <p className="text-2xl font-bold text-green-600">
            {currentImport.statusBreakdown?.INTERESTED || 0}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-500">Converted</p>
          <p className="text-2xl font-bold text-primary-600">{currentImport.convertedCount}</p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedRecords.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-primary-800 font-medium">
              {selectedRecords.length} record(s) selected
            </span>
            <button
              onClick={() => dispatch(clearSelectedRecords())}
              className="text-primary-600 hover:text-primary-800 text-sm"
            >
              Clear selection
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setAssignmentType('telecallers');
                setShowAssignModal(true);
              }}
              className="btn btn-outline flex items-center gap-2"
            >
              <UserGroupIcon className="h-4 w-4" />
              Assign to Telecallers
            </button>
            <button
              onClick={() => {
                setAssignmentType('ai-agent');
                setShowAssignModal(true);
              }}
              className="btn btn-outline flex items-center gap-2"
            >
              <CpuChipIcon className="h-4 w-4" />
              Start AI Campaign
            </button>
            {selectedRecords.some((id) =>
              records.find((r) => r.id === id && r.status === 'INTERESTED')
            ) && (
              <button onClick={handleBulkConvert} className="btn btn-primary flex items-center gap-2">
                <CheckIcon className="h-4 w-4" />
                Convert to Leads
              </button>
            )}
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
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
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
                <span
                  className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
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
                <th className="px-4 py-3 text-left">
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
                    className="h-4 w-4 text-primary-600 rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Call Attempts
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Call
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No records found
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedRecords.includes(record.id)}
                        onChange={() => dispatch(toggleRecordSelection(record.id))}
                        className="h-4 w-4 text-primary-600 rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-sm font-medium text-gray-900">
                        {record.firstName} {record.lastName}
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="text-sm text-gray-900">{record.phone}</p>
                      {record.email && (
                        <p className="text-xs text-gray-500">{record.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.assignedTo ? (
                        <span className="flex items-center gap-1">
                          <UserGroupIcon className="h-4 w-4" />
                          {record.assignedTo.firstName} {record.assignedTo.lastName}
                        </span>
                      ) : record.assignedAgent ? (
                        <span className="flex items-center gap-1 text-purple-600">
                          <CpuChipIcon className="h-4 w-4" />
                          {record.assignedAgent.name}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.callAttempts > 0 ? (
                        <span className="flex items-center gap-1">
                          <PhoneIcon className="h-4 w-4" />
                          {record.callAttempts}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.lastCallAt ? (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          {formatDate(record.lastCallAt)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {recordsTotal > 50 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {page} of {Math.ceil(recordsTotal / 50)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-outline btn-sm"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * 50 >= recordsTotal}
                className="btn btn-outline btn-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {assignmentType === 'telecallers'
                  ? 'Assign to Telecallers'
                  : 'Assign to AI Agent'}
              </h3>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignmentType(null);
                  setSelectedCounselors([]);
                  setSelectedAgent('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-4">
              <p className="text-sm text-gray-500 mb-4">
                {selectedRecords.length} record(s) will be assigned
              </p>

              {assignmentType === 'telecallers' ? (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Select Telecallers (round-robin distribution)
                  </p>
                  {counselors.length === 0 ? (
                    <p className="text-gray-500 text-sm">No telecallers available</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {counselors.map((counselor) => (
                        <label
                          key={counselor.id}
                          className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                            selectedCounselors.includes(counselor.id)
                              ? 'border-primary-500 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedCounselors.includes(counselor.id)}
                            onChange={() => toggleCounselor(counselor.id)}
                            className="h-4 w-4 text-primary-600 rounded border-gray-300"
                          />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900">
                              {counselor.firstName} {counselor.lastName}
                            </p>
                            <p className="text-xs text-gray-500">
                              {counselor.activeLeadCount || 0} active leads
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-700 mb-2">Select AI Agent</p>
                  {voiceAgents.filter((a) => a.isActive).length === 0 ? (
                    <div>
                      <p className="text-gray-500 text-sm mb-2">No AI agents available</p>
                      <button
                        onClick={() => navigate('/voice-ai/create')}
                        className="btn btn-outline btn-sm"
                      >
                        Create AI Agent
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {voiceAgents
                        .filter((a) => a.isActive)
                        .map((agent) => (
                          <label
                            key={agent.id}
                            className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                              selectedAgent === agent.id
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="agent"
                              checked={selectedAgent === agent.id}
                              onChange={() => setSelectedAgent(agent.id)}
                              className="h-4 w-4 text-purple-600 border-gray-300"
                            />
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">{agent.name}</p>
                              {agent.description && (
                                <p className="text-xs text-gray-500">{agent.description}</p>
                              )}
                            </div>
                          </label>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssignmentType(null);
                  setSelectedCounselors([]);
                  setSelectedAgent('');
                }}
                className="btn btn-outline"
              >
                Cancel
              </button>
              <button
                onClick={
                  assignmentType === 'telecallers'
                    ? handleAssignTelecallers
                    : handleAssignAIAgent
                }
                disabled={
                  assignmentType === 'telecallers'
                    ? selectedCounselors.length === 0
                    : !selectedAgent
                }
                className={`btn ${
                  assignmentType === 'ai-agent'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'btn-primary'
                }`}
              >
                {assignmentType === 'telecallers' ? 'Assign' : 'Start AI Campaign'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
