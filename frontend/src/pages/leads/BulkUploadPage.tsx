import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { AppDispatch, RootState } from '../../store';
import { bulkUploadLeads, clearBulkUploadResult } from '../../store/slices/leadSlice';
import { fetchAssignableUsers } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  PhoneIcon,
  UserGroupIcon,
  CpuChipIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '../../utils/toast';
import api from '../../services/api';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export default function BulkUploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { isLoading, bulkUploadResult } = useSelector((state: RootState) => state.leads);
  const { assignableUsers = [] } = useSelector((state: RootState) => state.users);

  // Check if uploading to raw imports (from /raw-imports page)
  const toRawImport = searchParams.get('toRawImport') === 'true';

  const [file, setFile] = useState<File | null>(null);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'assignableUsers' | 'ai-agent' | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchAssignableUsers());
    // Fetch voice agents
    api.get('/voice-ai/agents').then((res) => {
      setVoiceAgents(res.data.data?.agents || []);
    }).catch(() => {
      // Voice agents not available
    });
    // Fetch pipeline stages for template
    api.get('/pipelines').then((res) => {
      const pipelines = res.data.data || res.data || [];
      const stages: string[] = [];
      pipelines.forEach((p: { stages?: { name: string }[] }) => {
        p.stages?.forEach((s) => stages.push(s.name));
      });
      setPipelineStages(stages);
    }).catch(() => {
      // Pipeline stages not available
    });
    return () => {
      dispatch(clearBulkUploadResult());
    };
  }, [dispatch]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    console.log('Files dropped - accepted:', acceptedFiles.length, 'rejected:', rejectedFiles.length);
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      console.log('Accepted file:', f.name, f.type, f.size);
      setFile(f);
    }
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      console.log('Rejected file:', rejection.file.name, 'Errors:', rejection.errors);
      const errorMsg = rejection.errors.map(e => e.message).join(', ');
      showToast.error(errorMsg || 'File rejected');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    // Accept any file - backend will validate
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  });

  const handleUpload = async () => {
    console.log('handleUpload called, file:', file, 'toRawImport:', toRawImport);
    if (!file) {
      console.log('No file selected');
      showToast.error('Please select a file first');
      return;
    }

    console.log('Uploading file:', file.name, file.size, file.type);
    try {
      const result = await dispatch(
        bulkUploadLeads({
          file,
          toRawImport, // Pass flag to save to raw imports instead of leads
        })
      ).unwrap();
      console.log('Upload result:', result);

      // Show informative message based on results
      const inserted = result.insertedLeads || 0;
      const duplicates = result.duplicateRows || 0;
      const invalid = result.invalidRows || 0;
      const total = result.totalRows || 0;
      const recordType = toRawImport ? 'records' : 'leads';

      if (inserted === 0 && duplicates > 0) {
        showToast.error(`No ${recordType} imported. All ${duplicates} records are duplicates (phone/email already exists in the system).`);
      } else if (inserted === 0 && invalid > 0) {
        showToast.error(`No ${recordType} imported. All ${invalid} records are invalid (missing required fields).`);
      } else if (inserted === 0) {
        showToast.error(`No ${recordType} were imported. Please check the file format.`);
      } else if (duplicates > 0 || invalid > 0) {
        showToast.success(`Imported ${inserted} ${recordType} of ${total} records. ${duplicates} duplicates, ${invalid} invalid.`);
      } else {
        showToast.success(`Successfully imported ${inserted} ${recordType}!`);
      }

      // Redirect to raw-imports if uploading to raw imports
      if (toRawImport && inserted > 0) {
        navigate('/raw-imports');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showToast.error('Bulk upload failed. Check console for details.');
    }
  };

  const toggleCounselor = (id: string) => {
    setSelectedCounselors((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAssignToCounselors = async () => {
    if (selectedCounselors.length === 0) {
      showToast.error('Please select at least one counselor');
      return;
    }
    setIsAssigning(true);
    try {
      await api.post('/leads/assign-bulk', {
        source: 'BULK_UPLOAD',
        counselorIds: selectedCounselors,
      });
      showToast.success('Leads assigned to assignableUsers successfully');
      navigate('/leads');
    } catch (error) {
      showToast.error('Failed to assign leads');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleStartAICampaign = () => {
    if (!selectedAgent) {
      showToast.error('Please select an AI agent');
      return;
    }
    // Navigate to create campaign with pre-selected agent and source
    navigate(`/outbound-calls/create?source=BULK_UPLOAD&agentId=${selectedAgent}`);
  };

  const downloadSampleTemplate = () => {
    let sampleData: Record<string, string>[];
    let fileName: string;

    if (toRawImport) {
      // Raw Import Template - Simple contact data only
      sampleData = [
        {
          'Name': 'John Doe',
          'Phone': '9876543210',
          'Email': 'john@example.com',
          'Alternate Phone': '9876543211',
          'Notes': 'Interested in program',
        },
        {
          'Name': 'Jane Smith',
          'Phone': '8765432109',
          'Email': 'jane@example.com',
          'Alternate Phone': '',
          'Notes': 'Follow up next week',
        },
      ];
      fileName = 'raw_import_template.csv';
    } else {
      // Leads Import Template - Full fields
      const stages = pipelineStages.length > 0
        ? pipelineStages
        : ['New Enquiry', 'Contacted', 'Counseling Done', 'Enrolled'];
      const counselorNames = assignableUsers.slice(0, 2).map(u => `${u.firstName} ${u.lastName || ''}`);

      sampleData = [
        {
          'Name': 'John Doe',
          'Phone': '9876543210',
          'Email': 'john@example.com',
          'Location': 'Mumbai',
          'Status': stages[1] || 'Contacted',
          'Priority': 'Hot',
          'Assigned To': counselorNames[0] || 'Counselor Name',
          'Notes': 'Interested in program',
          'Gender': 'Male',
          'City': 'Mumbai',
          'State': 'Maharashtra',
        },
        {
          'Name': 'Jane Smith',
          'Phone': '8765432109',
          'Email': 'jane@example.com',
          'Location': 'Delhi',
          'Status': stages[0] || 'New Enquiry',
          'Priority': 'Warm',
          'Assigned To': counselorNames[1] || '',
          'Notes': 'Follow up next week',
          'Gender': 'Female',
          'City': 'Delhi',
          'State': 'Delhi',
        },
      ];
      fileName = 'lead_upload_template.csv';
    }

    // Convert to CSV
    const headers = Object.keys(sampleData[0]);
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
    showToast.success(`Template downloaded: ${fileName}`);
  };

  return (
    <div>
      <button
        onClick={() => navigate(toRawImport ? '/raw-imports' : '/leads')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        {toRawImport ? 'Back to Import Data' : t('leads:bulkUpload.backToLeads')}
      </button>

      {/* Mode Indicator Banner */}
      <div className={`mb-6 p-4 rounded-xl border-2 ${
        toRawImport
          ? 'bg-amber-50 border-amber-200'
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            toRawImport ? 'bg-amber-100' : 'bg-emerald-100'
          }`}>
            {toRawImport ? (
              <DocumentIcon className="h-5 w-5 text-amber-600" />
            ) : (
              <UserGroupIcon className="h-5 w-5 text-emerald-600" />
            )}
          </div>
          <div>
            <h1 className={`text-lg font-bold ${toRawImport ? 'text-amber-900' : 'text-emerald-900'}`}>
              {toRawImport ? 'Import to Raw Data' : 'Import to Leads'}
            </h1>
            <p className={`text-sm ${toRawImport ? 'text-amber-700' : 'text-emerald-700'}`}>
              {toRawImport
                ? 'Records go to staging area → Review → Assign to team → Convert to leads'
                : 'Records are added directly as leads in your CRM'}
            </p>
          </div>
        </div>
      </div>

      {!bulkUploadResult ? (
        <div>
          {/* Upload Area */}
          <div className="card">
            <div className="card-body">
              {/* Drop Zone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragActive
                    ? 'border-primary-500 bg-primary-50'
                    : file
                      ? 'border-green-400 bg-green-50'
                      : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div>
                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                      <DocumentIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {(file.size / 1024).toFixed(1)} KB • Click to change
                    </p>
                  </div>
                ) : (
                  <>
                    <CloudArrowUpIcon className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                    <p className="text-base font-medium text-gray-900">
                      Drop your file here, or <span className="text-primary-600">browse</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!file || isLoading}
                  className={`flex-1 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    toRawImport
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                  }`}
                >
                  {isLoading ? 'Uploading...' : toRawImport ? 'Upload to Raw Data' : 'Upload to Leads'}
                </button>
                <button
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Template
                </button>
              </div>

              {/* Simple Column Guide */}
              <div className="mt-5 pt-5 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Your file should have</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium">
                    Name *
                  </span>
                  <span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-md text-xs font-medium">
                    Phone *
                  </span>
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                    Email
                  </span>
                  {toRawImport ? (
                    // Raw Import - only basic fields
                    <>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Alternate Phone
                      </span>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Notes
                      </span>
                    </>
                  ) : (
                    // Leads Import - all fields
                    <>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Status
                      </span>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Priority
                      </span>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Assigned To
                      </span>
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        Notes
                      </span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  * Required columns. We auto-detect common column names.
                </p>
              </div>

              {/* Available Values - Only show for Leads Import */}
              {!toRawImport && (pipelineStages.length > 0 || assignableUsers.length > 0) && (
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs font-medium text-gray-500 mb-2">VALID VALUES FOR YOUR FILE</p>
                  <div className="space-y-2 text-xs">
                    {pipelineStages.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16 flex-shrink-0">Status:</span>
                        <span className="text-gray-700">{pipelineStages.join(' • ')}</span>
                      </div>
                    )}
                    <div className="flex items-start gap-2">
                      <span className="text-gray-500 w-16 flex-shrink-0">Priority:</span>
                      <span className="text-gray-700">Hot • Warm • Cold</span>
                    </div>
                    {assignableUsers.length > 0 && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16 flex-shrink-0">Assign To:</span>
                        <span className="text-gray-700">
                          {assignableUsers.slice(0, 4).map(u => `${u.firstName} ${u.lastName || ''}`).join(' • ')}
                          {assignableUsers.length > 4 && ` +${assignableUsers.length - 4} more`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Results */
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium flex items-center">
              <CheckCircleIcon className="h-6 w-6 text-green-500 mr-2" />
              {t('leads:bulkUpload.uploadComplete')}
            </h2>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">
                  {bulkUploadResult.totalRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.totalRows')}</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {bulkUploadResult.insertedLeads}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.inserted')}</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-2xl font-bold text-yellow-600">
                  {bulkUploadResult.duplicateRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.duplicates')}</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">
                  {bulkUploadResult.invalidRows}
                </p>
                <p className="text-sm text-gray-500">{t('leads:bulkUpload.invalid')}</p>
              </div>
            </div>

            {bulkUploadResult.duplicates && bulkUploadResult.duplicates.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                  {t('leads:bulkUpload.duplicateEntries')} ({bulkUploadResult.duplicates.length})
                </h3>
                <div className="max-h-40 overflow-y-auto bg-yellow-50 rounded-lg p-3">
                  {bulkUploadResult.duplicates.map((dup, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {dup.phone} - {dup.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkUploadResult.errors && bulkUploadResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                  <XCircleIcon className="h-5 w-5 text-red-500 mr-2" />
                  {t('leads:bulkUpload.validationErrors')} ({bulkUploadResult.errors.length})
                </h3>
                <div className="max-h-40 overflow-y-auto bg-red-50 rounded-lg p-3">
                  {bulkUploadResult.errors.map((err, index) => (
                    <div key={index} className="text-sm text-gray-700">
                      {t('leads:bulkUpload.row')} {err.row}: {err.errors.join(', ')}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignment Options */}
            {bulkUploadResult.insertedLeads > 0 && !assignmentType && (
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Assign {bulkUploadResult.insertedLeads} leads to:
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setAssignmentType('assignableUsers')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                  >
                    <UserGroupIcon className="h-10 w-10 text-primary-600 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900">Counselors</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Distribute leads to telecallers using round-robin assignment
                    </p>
                  </button>
                  <button
                    onClick={() => setAssignmentType('ai-agent')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all text-left"
                  >
                    <CpuChipIcon className="h-10 w-10 text-purple-600 mb-3" />
                    <h4 className="text-lg font-medium text-gray-900">AI Agent</h4>
                    <p className="text-sm text-gray-500 mt-1">
                      Start an AI calling campaign to call all leads automatically
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Counselor Assignment */}
            {assignmentType === 'assignableUsers' && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Counselors</h3>
                  <button
                    onClick={() => setAssignmentType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Leads will be distributed equally among selected assignableUsers using round-robin
                </p>
                {assignableUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No assignableUsers available</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    {assignableUsers.map((counselor) => (
                      <label
                        key={counselor.id}
                        className="flex items-center p-3 bg-white rounded-lg border hover:border-primary-300 cursor-pointer"
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
                <button
                  onClick={handleAssignToCounselors}
                  disabled={selectedCounselors.length === 0 || isAssigning}
                  className="btn btn-primary"
                >
                  {isAssigning ? 'Assigning...' : `Assign to ${selectedCounselors.length} Counselor(s)`}
                </button>
              </div>
            )}

            {/* AI Agent Assignment */}
            {assignmentType === 'ai-agent' && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select AI Agent</h3>
                  <button
                    onClick={() => setAssignmentType(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    ← Back
                  </button>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  The AI agent will call all {bulkUploadResult.insertedLeads} leads automatically
                </p>
                {voiceAgents.length === 0 ? (
                  <div>
                    <p className="text-sm text-gray-500 mb-2">No AI agents available</p>
                    <button
                      onClick={() => navigate('/voice-ai/create')}
                      className="btn btn-secondary"
                    >
                      Create AI Agent
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 gap-2 mb-4">
                      {voiceAgents.filter(a => a.isActive).map((agent) => (
                        <label
                          key={agent.id}
                          className={`flex items-center p-3 bg-white rounded-lg border cursor-pointer ${
                            selectedAgent === agent.id ? 'border-purple-500 bg-purple-50' : 'hover:border-purple-300'
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
                    <button
                      onClick={handleStartAICampaign}
                      disabled={!selectedAgent}
                      className="btn bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 rounded-xl"
                    >
                      <PhoneIcon className="h-5 w-5" />
                      Start AI Campaign
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => {
                  dispatch(clearBulkUploadResult());
                  setFile(null);
                  setAssignmentType(null);
                  setSelectedCounselors([]);
                  setSelectedAgent('');
                }}
                className="btn btn-secondary"
              >
                {t('leads:bulkUpload.uploadAnother')}
              </button>
              <button
                onClick={() => navigate('/leads')}
                className="btn btn-outline"
              >
                {t('leads:bulkUpload.viewLeads')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
