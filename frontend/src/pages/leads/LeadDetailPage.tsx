/**
 * Lead Detail Page
 * Displays comprehensive lead information with multiple tabs
 * Refactored to use extracted hooks and components (SOLID principles)
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadById, updateLead, assignLead } from '../../store/slices/leadSlice';
import { fetchCounselors } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  VideoCameraIcon,
  QrCodeIcon,
  PencilSquareIcon,
  XMarkIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Custom WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Local imports - extracted components and hooks
import { useLeadDetailData } from './hooks';
import { statusOptions, tabs, getStatusInfo } from './lead-detail.constants';
import {
  OverviewTab,
  NotesTab,
  TasksTab,
  FollowUpsTab,
  CallsTab,
  InterestsTab,
  TimelineTab,
  AttachmentsTab,
  QueriesTab,
  ApplicationsTab,
  TaskModal,
  FollowUpModal,
  QueryModal,
  ApplicationModal,
  InterestModal,
  CallLogModal,
  WhatsAppModal,
  SmsModal,
} from './components';
import leadDetailsService from '../../services/leadDetails.service';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentLead, isLoading } = useSelector((state: RootState) => state.leads);
  const { counselors } = useSelector((state: RootState) => state.users);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Modal states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  // Use the extracted data hook
  const leadData = useLeadDetailData(id);

  // Load lead data on mount
  useEffect(() => {
    if (id) {
      dispatch(fetchLeadById(id));
      dispatch(fetchCounselors());
    }
  }, [dispatch, id]);

  // Sync status with lead data
  useEffect(() => {
    if (currentLead) {
      setSelectedStatus(currentLead.status || 'NEW');
    }
  }, [currentLead]);

  // Load tab data when tab changes
  useEffect(() => {
    leadData.loadTabData(activeTab);
  }, [activeTab, leadData.loadTabData]);

  // Status change handler
  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await dispatch(updateLead({ id, data: { status: newStatus } })).unwrap();
      setSelectedStatus(newStatus);
      setIsEditingStatus(false);
      toast.success('Status updated successfully');
    } catch {
      toast.error('Failed to update status');
    }
  };

  // Assignment handler
  const handleAssign = async (counselorId: string) => {
    if (!id) return;
    try {
      await dispatch(assignLead({ leadId: id, assignedToId: counselorId })).unwrap();
      dispatch(fetchLeadById(id));
      setShowAgentDropdown(false);
      toast.success('Lead assigned successfully');
    } catch {
      toast.error('Failed to assign lead');
    }
  };

  // WhatsApp handler
  const handleSendWhatsApp = async (data: { message: string; mediaUrl: string }) => {
    if (!id) return;
    try {
      await leadDetailsService.sendWhatsApp(id, {
        message: data.message,
        mediaUrl: data.mediaUrl || undefined,
      });
      toast.success('WhatsApp message sent');
    } catch {
      toast.error('Failed to send WhatsApp message');
    }
  };

  // SMS handler
  const handleSendSms = async (message: string) => {
    if (!id) return;
    try {
      await leadDetailsService.sendSms(id, { message });
      toast.success('SMS sent');
    } catch {
      toast.error('Failed to send SMS');
    }
  };

  // Loading state
  if (isLoading || !currentLead) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(selectedStatus);
  const assignedUser = currentLead.assignments?.[0]?.assignedTo;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/leads')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-5 w-5 text-slate-600" />
          </button>
          <h1 className="text-xl font-semibold text-slate-900">Lead Detail</h1>
        </div>
      </div>

      {/* Lead Info Card */}
      <div className="bg-white border-b border-slate-200 px-6 py-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-2xl font-bold text-slate-900">
                {currentLead.firstName} {currentLead.lastName}
              </h2>
              <span className="text-slate-400 text-sm">(#{currentLead.id?.slice(0, 7)})</span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              {isEditingStatus ? (
                <div className="flex items-center gap-2">
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button onClick={() => setIsEditingStatus(false)} className="p-1 hover:bg-slate-100 rounded">
                    <XMarkIcon className="h-4 w-4 text-slate-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingStatus(true)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusInfo.color}`}
                >
                  <span className="w-2 h-2 rounded-full bg-current"></span>
                  {statusInfo.label}
                  <PencilSquareIcon className="h-3.5 w-3.5 ml-1 opacity-60" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-sm">
              <div>
                <span className="text-slate-500">Assigned to</span>
                <span className="mx-2 text-slate-300">:</span>
                <div className="relative inline-block">
                  <button
                    onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                    className="text-slate-900 hover:text-primary-600"
                  >
                    {assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned'}
                    <span className="ml-1 text-slate-400">▼</span>
                  </button>
                  {showAgentDropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]">
                      {counselors.map((counselor) => (
                        <button
                          key={counselor.id}
                          onClick={() => handleAssign(counselor.id)}
                          className="block w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                        >
                          {counselor.firstName} {counselor.lastName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Email</span>
                <span className="mx-2 text-slate-300">:</span>
                <span className="text-slate-900">{currentLead.email || '--'}</span>
              </div>
              <div>
                <span className="text-slate-500">Phone</span>
                <span className="mx-2 text-slate-300">:</span>
                <span className="text-slate-900">{currentLead.phone}</span>
              </div>
              <div>
                <span className="text-slate-500">Source</span>
                <span className="mx-2 text-slate-300">:</span>
                <span className="text-slate-900">{(currentLead.source || 'Unknown').replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a href={`mailto:${currentLead.email}`} className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600" title="Email">
              <EnvelopeIcon className="h-5 w-5" />
            </a>
            <button
              onClick={() => setShowWhatsappModal(true)}
              className="p-2.5 rounded-full bg-green-100 hover:bg-green-200 text-green-600"
              title="Send WhatsApp"
            >
              <WhatsAppIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowSmsModal(true)}
              className="p-2.5 rounded-full bg-yellow-100 hover:bg-yellow-200 text-yellow-600"
              title="Send SMS"
            >
              <ChatBubbleBottomCenterTextIcon className="h-5 w-5" />
            </button>
            <a href={`tel:${currentLead.phone}`} className="p-2.5 rounded-full bg-blue-100 hover:bg-blue-200 text-blue-600" title="Call">
              <PhoneIcon className="h-5 w-5" />
            </a>
            <button className="p-2.5 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-600" title="Video Call">
              <VideoCameraIcon className="h-5 w-5" />
            </button>
            <button className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600" title="QR Code">
              <QrCodeIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6">
          <nav className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && <OverviewTab lead={currentLead} />}

        {activeTab === 'notes' && (
          <NotesTab
            notes={leadData.notes}
            loading={leadData.loadingNotes}
            onAdd={leadData.addNote}
            onUpdate={leadData.updateNote}
            onDelete={leadData.deleteNote}
            onTogglePin={leadData.togglePinNote}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksTab
            tasks={leadData.tasks}
            loading={leadData.loadingTasks}
            onAddClick={() => setShowTaskModal(true)}
            onUpdateStatus={leadData.updateTaskStatus}
            onDelete={leadData.deleteTask}
          />
        )}

        {activeTab === 'followups' && (
          <FollowUpsTab
            followUps={leadData.followUps}
            loading={leadData.loadingFollowUps}
            onAddClick={() => setShowFollowUpModal(true)}
            onUpdateStatus={leadData.updateFollowUpStatus}
            onDelete={leadData.deleteFollowUp}
          />
        )}

        {activeTab === 'calls' && (
          <CallsTab
            callLogs={leadData.callLogs}
            loading={leadData.loadingCalls}
            phone={currentLead.phone}
            onLogCallClick={() => setShowCallLogModal(true)}
          />
        )}

        {activeTab === 'interests' && (
          <InterestsTab
            interests={leadData.interests}
            loading={leadData.loadingInterests}
            onAddClick={() => setShowInterestModal(true)}
            onDelete={leadData.deleteInterest}
          />
        )}

        {activeTab === 'timelines' && (
          <TimelineTab
            activities={leadData.activities}
            loading={leadData.loadingActivities}
          />
        )}

        {activeTab === 'attachments' && (
          <AttachmentsTab
            attachments={leadData.attachments}
            loading={leadData.loadingAttachments}
            onUpload={leadData.uploadAttachment}
            onDelete={leadData.deleteAttachment}
          />
        )}

        {activeTab === 'queries' && (
          <QueriesTab
            queries={leadData.queries}
            loading={leadData.loadingQueries}
            onAddClick={() => setShowQueryModal(true)}
            onUpdate={leadData.updateQuery}
            onDelete={leadData.deleteQuery}
          />
        )}

        {activeTab === 'applications' && (
          <ApplicationsTab
            applications={leadData.applications}
            loading={leadData.loadingApplications}
            onAddClick={() => setShowApplicationModal(true)}
            onUpdateStatus={leadData.updateApplicationStatus}
            onDelete={leadData.deleteApplication}
          />
        )}
      </div>

      {/* Modals */}
      <TaskModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onSubmit={(task) => leadData.addTask(task)}
        counselors={counselors}
      />

      <FollowUpModal
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onSubmit={(followUp) => leadData.addFollowUp(followUp)}
        counselors={counselors}
      />

      <QueryModal
        isOpen={showQueryModal}
        onClose={() => setShowQueryModal(false)}
        onSubmit={(query) => leadData.addQuery(query)}
      />

      <ApplicationModal
        isOpen={showApplicationModal}
        onClose={() => setShowApplicationModal(false)}
        onSubmit={(programName) => leadData.addApplication(programName)}
      />

      <InterestModal
        isOpen={showInterestModal}
        onClose={() => setShowInterestModal(false)}
        onSubmit={(interest) => leadData.addInterest(interest)}
      />

      <CallLogModal
        isOpen={showCallLogModal}
        onClose={() => setShowCallLogModal(false)}
        onSubmit={(callLog) => leadData.addCallLog(callLog)}
        defaultPhone={currentLead.phone}
      />

      <WhatsAppModal
        isOpen={showWhatsappModal}
        onClose={() => setShowWhatsappModal(false)}
        onSubmit={handleSendWhatsApp}
        phone={currentLead.phone || ''}
      />

      <SmsModal
        isOpen={showSmsModal}
        onClose={() => setShowSmsModal(false)}
        onSubmit={handleSendSms}
        phone={currentLead.phone || ''}
      />
    </div>
  );
}
