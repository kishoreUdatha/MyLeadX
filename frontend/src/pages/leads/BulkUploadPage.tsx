import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
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
  TableCellsIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ArrowPathIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
  LightBulbIcon,
  CheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { showToast } from '../../utils/toast';
import api from '../../services/api';
import {
  leadService,
  FilePreviewResult,
  ColumnMapping,
  BulkUploadResult,
} from '../../services/lead.service';
import ColumnMappingStep from './components/ColumnMappingStep';

interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

type UploadStep = 'upload' | 'mapping' | 'results';

export default function BulkUploadPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(['leads', 'common', 'notifications']);
  const { user } = useSelector((state: RootState) => state.auth);
  const organizationIndustry = user?.organizationIndustry || 'GENERAL';

  // Step management
  const [currentStep, setCurrentStep] = useState<UploadStep>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Preview & Mapping
  const [preview, setPreview] = useState<FilePreviewResult | null>(null);

  // Results
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(null);

  // Assignment
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [selectedCounselors, setSelectedCounselors] = useState<string[]>([]);
  const [voiceAgents, setVoiceAgents] = useState<VoiceAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [assignmentType, setAssignmentType] = useState<'assignableUsers' | 'ai-agent' | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    api.get('/users/assignable').then((res) => {
      setAssignableUsers(res.data.data || []);
    }).catch(() => {});

    api.get('/voice-ai/agents').then((res) => {
      setVoiceAgents(res.data.data?.agents || []);
    }).catch(() => {});
  }, []);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      const errorMsg = rejection.errors.map(e => e.message).join(', ');
      showToast.error(errorMsg || 'File rejected');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024,
  });

  const handlePreview = async () => {
    if (!file) {
      showToast.error('Please select a file first');
      return;
    }

    setIsLoading(true);
    try {
      const result = await leadService.bulkUploadPreview(file);
      setPreview(result);
      setCurrentStep('mapping');
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to preview file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async (mappings: ColumnMapping[]) => {
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await leadService.bulkUploadWithMappings(file, mappings);
      setUploadResult(result);
      setCurrentStep('results');

      const inserted = result.insertedRecords || 0;
      const duplicates = result.duplicateRows || 0;
      const invalid = result.invalidRows || 0;

      if (inserted === 0 && duplicates > 0) {
        showToast.error(`No records imported. All ${duplicates} records are duplicates.`);
      } else if (inserted === 0 && invalid > 0) {
        showToast.error(`No records imported. All ${invalid} records are invalid.`);
      } else if (inserted > 0) {
        showToast.success(`Successfully imported ${inserted} records!`);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || 'Failed to import file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (currentStep === 'mapping') {
      setCurrentStep('upload');
      setPreview(null);
      // Keep the file so user doesn't have to re-upload
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
      showToast.success('Leads assigned successfully');
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
    navigate(`/outbound-calls/create?source=BULK_UPLOAD&agentId=${selectedAgent}`);
  };

  const resetUpload = () => {
    setCurrentStep('upload');
    setFile(null);
    setPreview(null);
    setUploadResult(null);
    setAssignmentType(null);
    setSelectedCounselors([]);
    setSelectedAgent('');
  };

  const steps = [
    { key: 'upload', label: 'Upload', icon: CloudArrowUpIcon },
    { key: 'mapping', label: 'Map Columns', icon: TableCellsIcon },
    { key: 'results', label: 'Results', icon: CheckCircleIcon },
  ];

  const getStepIndex = (step: UploadStep) => steps.findIndex(s => s.key === step);
  const currentStepIndex = getStepIndex(currentStep);

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col bg-gray-50 overflow-hidden">
      {/* Compact Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (currentStep === 'upload') {
                  navigate('/leads');
                } else if (currentStep === 'mapping') {
                  setCurrentStep('upload');
                  setPreview(null);
                } else if (currentStep === 'results') {
                  // From results, go back to leads (can't go back to mapping after import)
                  navigate('/leads');
                }
              }}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Back</span>
            </button>
            <div className="h-5 w-px bg-gray-200" />
            <h1 className="text-lg font-bold text-gray-900">Bulk Import</h1>
          </div>

          {/* Compact Step Indicator */}
          <div className="flex items-center gap-2">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.key;
              const isCompleted = currentStepIndex > index;

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      isCompleted
                        ? 'bg-green-100 text-green-700'
                        : isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckIcon className="h-3.5 w-3.5" />
                    ) : (
                      <StepIcon className="h-3.5 w-3.5" />
                    )}
                    <span>{step.label}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-1 ${currentStepIndex > index ? 'bg-green-300' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content - Fills remaining space */}
      <div className="flex-1 overflow-hidden">
        {/* Step 1: Upload */}
        {currentStep === 'upload' && (
          <div className="h-full p-2">
            <div className="h-full grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Main Upload Area - Takes 3 columns */}
              <div className="lg:col-span-3 h-full flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Card Header */}
                <div className="flex-shrink-0 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600">
                  <div className="flex items-center gap-3">
                    <DocumentArrowUpIcon className="h-5 w-5 text-white/80" />
                    <div>
                      <h2 className="text-sm font-semibold text-white">Upload Your File</h2>
                      <p className="text-xs text-blue-100">Excel (.xlsx, .xls) or CSV supported</p>
                    </div>
                  </div>
                </div>

                {/* Upload Zone - Fills remaining space */}
                <div className="flex-1 p-4 flex flex-col min-h-0">
                  <div
                    {...getRootProps()}
                    className={`flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                      isDragActive
                        ? 'border-blue-500 bg-blue-50'
                        : file
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
                    }`}
                  >
                    <input {...getInputProps()} />

                    {file ? (
                      <div className="text-center">
                        <div className="w-14 h-14 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-3">
                          <DocumentTextIcon className="h-7 w-7 text-green-600" />
                        </div>
                        <p className="text-base font-semibold text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
                        >
                          <ArrowPathIcon className="h-3.5 w-3.5" />
                          Change File
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className={`w-16 h-16 mx-auto rounded-xl flex items-center justify-center mb-3 transition-all ${
                          isDragActive ? 'bg-blue-100 scale-110' : 'bg-gray-100'
                        }`}>
                          <CloudArrowUpIcon className={`h-8 w-8 ${isDragActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        </div>
                        <p className="text-base font-semibold text-gray-900">
                          {isDragActive ? 'Drop it here!' : 'Drag & drop your file'}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          or <span className="text-blue-600 font-medium">browse</span> to choose
                        </p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <div className="w-6 h-6 rounded bg-green-50 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-green-600">XLS</span>
                            </div>
                            <span>.xlsx</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center">
                              <span className="text-[8px] font-bold text-blue-600">CSV</span>
                            </div>
                            <span>.csv</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Smart Detection + Button Row */}
                  <div className="flex-shrink-0 mt-3 flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-100">
                      <SparklesIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <p className="text-xs text-blue-700">
                        <span className="font-medium">Smart Detection:</span> Columns are auto-mapped. Review before import.
                      </p>
                    </div>
                    <button
                      onClick={handlePreview}
                      disabled={!file || isLoading}
                      className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                        file && !isLoading
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>Analyzing...</span>
                        </>
                      ) : (
                        <>
                          <span>Continue</span>
                          <ArrowRightIcon className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Takes 1 column */}
              <div className="lg:col-span-1 h-full flex flex-col gap-3 overflow-hidden">
                {/* Quick Tips */}
                <div className="flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <LightBulbIcon className="h-4 w-4 text-amber-500" />
                    <h3 className="font-semibold text-sm text-gray-900">Quick Tips</h3>
                  </div>
                  <div className="space-y-2">
                    {[
                      { text: 'Include Name and Phone columns' },
                      { text: 'First row = column headers' },
                      { text: 'Duplicates auto-detected' },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircleIcon className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-gray-600">{tip.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Supported Fields */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 overflow-hidden flex flex-col min-h-0">
                  <div className="flex items-center gap-2 mb-3 flex-shrink-0">
                    <TableCellsIcon className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold text-sm text-gray-900">140+ Fields</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5 overflow-y-auto">
                    {['Basic', 'Education', 'Business', 'Healthcare', 'Real Estate', 'Finance', 'HR', 'Travel'].map((cat) => (
                      <span key={cat} className="px-2 py-1 text-[10px] font-medium bg-gray-100 text-gray-600 rounded-full">
                        {cat}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-2 flex-shrink-0">Works with any industry</p>
                </div>

                {/* Security */}
                <div className="flex-shrink-0 bg-green-50 rounded-xl p-3 border border-green-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-xs font-semibold text-gray-900">Secure Upload</p>
                      <p className="text-[10px] text-gray-500">Data encrypted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {currentStep === 'mapping' && preview && (
          <div className="h-full p-2 overflow-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 h-full overflow-hidden">
              <ColumnMappingStep
                preview={preview}
                onConfirm={handleImport}
                onBack={handleBack}
                isLoading={isLoading}
                industry={organizationIndustry}
              />
            </div>
          </div>
        )}

        {/* Step 3: Results */}
        {currentStep === 'results' && uploadResult && (
          <div className="h-full p-2 overflow-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-full flex flex-col">
              {/* Success Header */}
              <div className="flex-shrink-0 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-500">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="h-8 w-8 text-white" />
                  <div>
                    <h2 className="text-lg font-bold text-white">Import Complete!</h2>
                    <p className="text-sm text-green-100">Your file has been processed</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 p-6 overflow-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-3 mb-6">
                  <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                    <p className="text-2xl font-bold text-gray-900">{uploadResult.totalRows}</p>
                    <p className="text-xs text-gray-500 mt-1">Total</p>
                  </div>
                  <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-center">
                    <p className="text-2xl font-bold text-green-600">{uploadResult.insertedRecords || uploadResult.insertedLeads}</p>
                    <p className="text-xs text-green-600 mt-1">Imported</p>
                  </div>
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-center">
                    <p className="text-2xl font-bold text-amber-600">{uploadResult.duplicateRows}</p>
                    <p className="text-xs text-amber-600 mt-1">Duplicates</p>
                  </div>
                  <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center">
                    <p className="text-2xl font-bold text-red-600">{uploadResult.invalidRows}</p>
                    <p className="text-xs text-red-600 mt-1">Invalid</p>
                  </div>
                </div>

                {/* Assignment Options */}
                {(uploadResult.insertedRecords || 0) > 0 && !assignmentType && (
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      Assign {uploadResult.insertedRecords} records to:
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => setAssignmentType('assignableUsers')}
                        className="p-4 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all text-left group"
                      >
                        <UserGroupIcon className="h-8 w-8 text-blue-600 mb-2" />
                        <h4 className="font-semibold text-gray-900">Telecallers</h4>
                        <p className="text-xs text-gray-500 mt-1">Round-robin assignment</p>
                      </button>
                      <button
                        onClick={() => setAssignmentType('ai-agent')}
                        className="p-4 bg-purple-50 rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all text-left group"
                      >
                        <CpuChipIcon className="h-8 w-8 text-purple-600 mb-2" />
                        <h4 className="font-semibold text-gray-900">AI Agent</h4>
                        <p className="text-xs text-gray-500 mt-1">Automated calling</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Counselor Assignment */}
                {assignmentType === 'assignableUsers' && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Select Telecallers</h3>
                      <button onClick={() => setAssignmentType(null)} className="text-xs text-gray-500 hover:text-gray-700">
                        ← Back
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-3 max-h-32 overflow-y-auto">
                      {assignableUsers.map((user: any) => (
                        <label key={user.id} className={`flex items-center p-2 bg-white rounded-lg border cursor-pointer ${
                          selectedCounselors.includes(user.id) ? 'border-blue-500' : 'border-gray-200'
                        }`}>
                          <input
                            type="checkbox"
                            checked={selectedCounselors.includes(user.id)}
                            onChange={() => toggleCounselor(user.id)}
                            className="h-4 w-4 text-blue-600 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-900">{user.firstName} {user.lastName}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleAssignToCounselors}
                      disabled={selectedCounselors.length === 0 || isAssigning}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      {isAssigning ? 'Assigning...' : `Assign to ${selectedCounselors.length} Telecaller(s)`}
                    </button>
                  </div>
                )}

                {/* AI Agent Assignment */}
                {assignmentType === 'ai-agent' && (
                  <div className="mb-6 p-4 bg-purple-50 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">Select AI Agent</h3>
                      <button onClick={() => setAssignmentType(null)} className="text-xs text-gray-500 hover:text-gray-700">
                        ← Back
                      </button>
                    </div>
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                      {voiceAgents.filter(a => a.isActive).map((agent) => (
                        <label key={agent.id} className={`flex items-center p-2 bg-white rounded-lg border cursor-pointer ${
                          selectedAgent === agent.id ? 'border-purple-500' : 'border-gray-200'
                        }`}>
                          <input
                            type="radio"
                            name="agent"
                            checked={selectedAgent === agent.id}
                            onChange={() => setSelectedAgent(agent.id)}
                            className="h-4 w-4 text-purple-600"
                          />
                          <span className="ml-2 text-sm text-gray-900">{agent.name}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleStartAICampaign}
                      disabled={!selectedAgent}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      Start AI Campaign
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button onClick={resetUpload} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">
                    Upload Another
                  </button>
                  {uploadResult.bulkImportId && (
                    <button
                      onClick={() => navigate(`/raw-imports/${uploadResult.bulkImportId}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg"
                    >
                      View Details
                    </button>
                  )}
                  <button onClick={() => navigate('/leads')} className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg">
                    View Leads
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
