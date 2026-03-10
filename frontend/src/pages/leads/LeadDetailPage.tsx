import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../store';
import { fetchLeadById, updateLead, assignLead } from '../../store/slices/leadSlice';
import { fetchCounselors } from '../../store/slices/userSlice';
import {
  ArrowLeftIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  VideoCameraIcon,
  QrCodeIcon,
  PencilSquareIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  DocumentIcon,
  ChatBubbleOvalLeftIcon,
  ClipboardDocumentListIcon,
  PaperClipIcon,
  QuestionMarkCircleIcon,
  DocumentTextIcon,
  PlayIcon,
  XMarkIcon,
  TrashIcon,
  CheckIcon,
  PencilIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Custom WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

import leadDetailsService, {
  LeadNote,
  LeadTask,
  FollowUp,
  LeadAttachment,
  LeadQuery,
  LeadApplication,
  LeadActivity,
  Interest,
  CallLog,
  WhatsAppLog,
  SmsLog,
} from '../../services/leadDetails.service';

const statusOptions = [
  { value: 'NEW', label: 'New Lead', color: 'bg-blue-100 text-blue-700' },
  { value: 'CONTACTED', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'QUALIFIED', label: 'Qualified', color: 'bg-green-100 text-green-700' },
  { value: 'NEGOTIATION', label: 'Negotiation', color: 'bg-purple-100 text-purple-700' },
  { value: 'WON', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'LOST', label: 'Lost', color: 'bg-red-100 text-red-700' },
  { value: 'FOLLOW_UP', label: 'Follow Up', color: 'bg-orange-100 text-orange-700' },
  { value: 'NOT_CONNECTED', label: 'Not Yet Connected', color: 'bg-gray-100 text-gray-700' },
];

const tabs = [
  { id: 'overview', label: 'Overview', icon: DocumentIcon },
  { id: 'interests', label: 'Interests', icon: ClipboardDocumentListIcon },
  { id: 'timelines', label: 'Timelines', icon: ClockIcon },
  { id: 'notes', label: 'Notes', icon: ChatBubbleOvalLeftIcon },
  { id: 'calls', label: 'Calls', icon: PhoneIcon },
  { id: 'followups', label: 'Follow-ups', icon: CalendarIcon },
  { id: 'tasks', label: 'Tasks', icon: ClipboardDocumentListIcon },
  { id: 'attachments', label: 'Attachments', icon: PaperClipIcon },
  { id: 'queries', label: 'Queries', icon: QuestionMarkCircleIcon },
  { id: 'applications', label: 'Applications', icon: DocumentTextIcon },
];

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const taskStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const followUpStatusColors: Record<string, string> = {
  UPCOMING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  MISSED: 'bg-red-100 text-red-700',
  RESCHEDULED: 'bg-yellow-100 text-yellow-700',
};

const queryStatusColors: Record<string, string> = {
  OPEN: 'bg-yellow-100 text-yellow-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

const applicationStatusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
  ENROLLED: 'bg-emerald-100 text-emerald-700',
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { currentLead, isLoading } = useSelector((state: RootState) => state.leads);
  const { counselors } = useSelector((state: RootState) => state.users);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('overview');
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);

  // Data states
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [tasks, setTasks] = useState<LeadTask[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [attachments, setAttachments] = useState<LeadAttachment[]>([]);
  const [queries, setQueries] = useState<LeadQuery[]>([]);
  const [applications, setApplications] = useState<LeadApplication[]>([]);
  const [activities, setActivities] = useState<LeadActivity[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);

  // Loading states
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFollowUps, setLoadingFollowUps] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [loadingInterests, setLoadingInterests] = useState(false);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [loadingSms, setLoadingSms] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [showQueryModal, setShowQueryModal] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [showCallLogModal, setShowCallLogModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);

  // Edit states
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [editingQuery, setEditingQuery] = useState<LeadQuery | null>(null);

  // Task form
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    assigneeId: '',
  });

  // Follow-up form
  const [followUpForm, setFollowUpForm] = useState({
    scheduledAt: '',
    message: '',
    notes: '',
    assigneeId: '',
  });

  // Query form
  const [queryForm, setQueryForm] = useState({ query: '' });

  // Application form
  const [applicationForm, setApplicationForm] = useState({ programName: '' });

  // Interest form
  const [interestForm, setInterestForm] = useState({ name: '', category: '', notes: '' });

  // Call log form
  const [callLogForm, setCallLogForm] = useState({
    phoneNumber: '',
    direction: 'OUTBOUND' as 'INBOUND' | 'OUTBOUND',
    status: 'COMPLETED',
    duration: 0,
    notes: '',
  });

  // WhatsApp form
  const [whatsappForm, setWhatsappForm] = useState({ message: '', mediaUrl: '' });

  // SMS form
  const [smsForm, setSmsForm] = useState({ message: '' });

  useEffect(() => {
    if (id) {
      dispatch(fetchLeadById(id));
      dispatch(fetchCounselors());
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (currentLead) {
      setSelectedStatus(currentLead.status || 'NEW');
      setCallLogForm(prev => ({ ...prev, phoneNumber: currentLead.phone || '' }));
    }
  }, [currentLead]);

  // Load data when tab changes
  useEffect(() => {
    if (!id) return;

    const loadData = async () => {
      try {
        switch (activeTab) {
          case 'notes':
            setLoadingNotes(true);
            const notesData = await leadDetailsService.getNotes(id);
            setNotes(notesData);
            setLoadingNotes(false);
            break;
          case 'tasks':
            setLoadingTasks(true);
            const tasksData = await leadDetailsService.getTasks(id);
            setTasks(tasksData);
            setLoadingTasks(false);
            break;
          case 'followups':
            setLoadingFollowUps(true);
            const followUpsData = await leadDetailsService.getFollowUps(id);
            setFollowUps(followUpsData);
            setLoadingFollowUps(false);
            break;
          case 'attachments':
            setLoadingAttachments(true);
            const attachmentsData = await leadDetailsService.getAttachments(id);
            setAttachments(attachmentsData);
            setLoadingAttachments(false);
            break;
          case 'queries':
            setLoadingQueries(true);
            const queriesData = await leadDetailsService.getQueries(id);
            setQueries(queriesData);
            setLoadingQueries(false);
            break;
          case 'applications':
            setLoadingApplications(true);
            const applicationsData = await leadDetailsService.getApplications(id);
            setApplications(applicationsData);
            setLoadingApplications(false);
            break;
          case 'timelines':
            setLoadingActivities(true);
            const activitiesResult = await leadDetailsService.getActivities(id);
            setActivities(activitiesResult.data);
            setLoadingActivities(false);
            break;
          case 'interests':
            setLoadingInterests(true);
            const interestsData = await leadDetailsService.getInterests(id);
            setInterests(interestsData || []);
            setLoadingInterests(false);
            break;
          case 'calls':
            setLoadingCalls(true);
            const callsData = await leadDetailsService.getCallLogs(id);
            setCallLogs(callsData);
            setLoadingCalls(false);
            break;
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [id, activeTab]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await dispatch(updateLead({ id, data: { status: newStatus } })).unwrap();
      setSelectedStatus(newStatus);
      setIsEditingStatus(false);
      toast.success('Status updated successfully');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAssign = async (counselorId: string) => {
    if (!id) return;
    try {
      await dispatch(assignLead({ leadId: id, assignedToId: counselorId })).unwrap();
      dispatch(fetchLeadById(id));
      setShowAgentDropdown(false);
      toast.success('Lead assigned successfully');
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  // Note handlers
  const handleAddNote = async () => {
    if (!id || !newNote.trim()) return;
    try {
      const note = await leadDetailsService.createNote(id, { content: newNote });
      setNotes([note, ...notes]);
      setNewNote('');
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  const handleUpdateNote = async (noteId: string) => {
    if (!id || !editNoteContent.trim()) return;
    try {
      const updated = await leadDetailsService.updateNote(id, noteId, { content: editNoteContent });
      setNotes(notes.map(n => n.id === noteId ? updated : n));
      setEditingNote(null);
      toast.success('Note updated');
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteNote(id, noteId);
      setNotes(notes.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  };

  const handleTogglePinNote = async (note: LeadNote) => {
    if (!id) return;
    try {
      const updated = await leadDetailsService.updateNote(id, note.id, { isPinned: !note.isPinned });
      setNotes(notes.map(n => n.id === note.id ? updated : n));
    } catch (error) {
      toast.error('Failed to update note');
    }
  };

  // Task handlers
  const handleAddTask = async () => {
    if (!id || !taskForm.title.trim()) return;
    try {
      const task = await leadDetailsService.createTask(id, {
        ...taskForm,
        dueDate: taskForm.dueDate || undefined,
        assigneeId: taskForm.assigneeId || undefined,
      });
      setTasks([task, ...tasks]);
      setShowTaskModal(false);
      setTaskForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' });
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    if (!id) return;
    try {
      const updated = await leadDetailsService.updateTask(id, taskId, { status });
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteTask(id, taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  // Follow-up handlers
  const handleAddFollowUp = async () => {
    if (!id || !followUpForm.scheduledAt) return;
    try {
      const followUp = await leadDetailsService.createFollowUp(id, {
        ...followUpForm,
        assigneeId: followUpForm.assigneeId || undefined,
      });
      setFollowUps([...followUps, followUp].sort((a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ));
      setShowFollowUpModal(false);
      setFollowUpForm({ scheduledAt: '', message: '', notes: '', assigneeId: '' });
      toast.success('Follow-up scheduled');
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  };

  const handleUpdateFollowUpStatus = async (followUpId: string, status: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED') => {
    if (!id) return;
    try {
      const updated = await leadDetailsService.updateFollowUp(id, followUpId, { status });
      setFollowUps(followUps.map(f => f.id === followUpId ? updated : f));
      toast.success('Follow-up updated');
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  };

  const handleDeleteFollowUp = async (followUpId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteFollowUp(id, followUpId);
      setFollowUps(followUps.filter(f => f.id !== followUpId));
      toast.success('Follow-up deleted');
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  };

  // Attachment handlers
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!id || !e.target.files?.[0]) return;
    try {
      const attachment = await leadDetailsService.uploadAttachment(id, e.target.files[0]);
      setAttachments([attachment, ...attachments]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteAttachment(id, attachmentId);
      setAttachments(attachments.filter(a => a.id !== attachmentId));
      toast.success('Attachment deleted');
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  };

  // Query handlers
  const handleAddQuery = async () => {
    if (!id || !queryForm.query.trim()) return;
    try {
      const query = await leadDetailsService.createQuery(id, queryForm);
      setQueries([query, ...queries]);
      setShowQueryModal(false);
      setQueryForm({ query: '' });
      toast.success('Query added');
    } catch (error) {
      toast.error('Failed to add query');
    }
  };

  const handleUpdateQuery = async (queryId: string, data: { response?: string; status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' }) => {
    if (!id) return;
    try {
      const updated = await leadDetailsService.updateQuery(id, queryId, data);
      setQueries(queries.map(q => q.id === queryId ? updated : q));
      setEditingQuery(null);
      toast.success('Query updated');
    } catch (error) {
      toast.error('Failed to update query');
    }
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteQuery(id, queryId);
      setQueries(queries.filter(q => q.id !== queryId));
      toast.success('Query deleted');
    } catch (error) {
      toast.error('Failed to delete query');
    }
  };

  // Application handlers
  const handleAddApplication = async () => {
    if (!id) return;
    try {
      const application = await leadDetailsService.createApplication(id, applicationForm);
      setApplications([application, ...applications]);
      setShowApplicationModal(false);
      setApplicationForm({ programName: '' });
      toast.success('Application created');
    } catch (error) {
      toast.error('Failed to create application');
    }
  };

  const handleUpdateApplicationStatus = async (appId: string, status: LeadApplication['status']) => {
    if (!id) return;
    try {
      const updated = await leadDetailsService.updateApplication(id, appId, { status });
      setApplications(applications.map(a => a.id === appId ? updated : a));
      toast.success('Application updated');
    } catch (error) {
      toast.error('Failed to update application');
    }
  };

  const handleDeleteApplication = async (appId: string) => {
    if (!id) return;
    try {
      await leadDetailsService.deleteApplication(id, appId);
      setApplications(applications.filter(a => a.id !== appId));
      toast.success('Application deleted');
    } catch (error) {
      toast.error('Failed to delete application');
    }
  };

  // Interest handlers
  const handleAddInterest = async () => {
    if (!id || !interestForm.name.trim()) return;
    try {
      const newInterests = [...interests, { ...interestForm }];
      await leadDetailsService.updateInterests(id, newInterests);
      setInterests(newInterests);
      setShowInterestModal(false);
      setInterestForm({ name: '', category: '', notes: '' });
      toast.success('Interest added');
    } catch (error) {
      toast.error('Failed to add interest');
    }
  };

  const handleDeleteInterest = async (index: number) => {
    if (!id) return;
    try {
      const newInterests = interests.filter((_, i) => i !== index);
      await leadDetailsService.updateInterests(id, newInterests);
      setInterests(newInterests);
      toast.success('Interest removed');
    } catch (error) {
      toast.error('Failed to remove interest');
    }
  };

  // Call log handlers
  const handleAddCallLog = async () => {
    if (!id || !callLogForm.phoneNumber) return;
    try {
      const call = await leadDetailsService.createCallLog(id, callLogForm);
      setCallLogs([call, ...callLogs]);
      setShowCallLogModal(false);
      setCallLogForm({
        phoneNumber: currentLead?.phone || '',
        direction: 'OUTBOUND',
        status: 'COMPLETED',
        duration: 0,
        notes: '',
      });
      toast.success('Call logged');
    } catch (error) {
      toast.error('Failed to log call');
    }
  };

  // WhatsApp handlers
  const handleSendWhatsApp = async () => {
    if (!id || !whatsappForm.message.trim()) return;
    try {
      const result = await leadDetailsService.sendWhatsApp(id, {
        message: whatsappForm.message,
        mediaUrl: whatsappForm.mediaUrl || undefined,
      });
      setWhatsappLogs([result, ...whatsappLogs]);
      setShowWhatsappModal(false);
      setWhatsappForm({ message: '', mediaUrl: '' });
      toast.success('WhatsApp message sent');
    } catch (error) {
      toast.error('Failed to send WhatsApp message');
    }
  };

  // SMS handlers
  const handleSendSms = async () => {
    if (!id || !smsForm.message.trim()) return;
    try {
      const result = await leadDetailsService.sendSms(id, { message: smsForm.message });
      setSmsLogs([result, ...smsLogs]);
      setShowSmsModal(false);
      setSmsForm({ message: '' });
      toast.success('SMS sent');
    } catch (error) {
      toast.error('Failed to send SMS');
    }
  };

  const getStatusInfo = (status: string) => {
    return statusOptions.find(s => s.value === status) || statusOptions[0];
  };

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '--';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (date: string | Date | null | undefined) => {
    if (!date) return '--';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getCustomField = (key: string) => {
    if (!currentLead?.customFields) return '--';
    const value = (currentLead.customFields as Record<string, any>)[key];
    return value !== undefined && value !== null && value !== '' ? String(value) : '--';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'NOTE_ADDED': return ChatBubbleOvalLeftIcon;
      case 'CALL_MADE': return PhoneIcon;
      case 'TASK_CREATED':
      case 'TASK_COMPLETED': return ClipboardDocumentListIcon;
      case 'FOLLOWUP_SCHEDULED':
      case 'FOLLOWUP_COMPLETED': return CalendarIcon;
      case 'DOCUMENT_UPLOADED': return PaperClipIcon;
      case 'APPLICATION_SUBMITTED': return DocumentTextIcon;
      default: return DocumentIcon;
    }
  };

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
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-primary-600">Personal Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div><label className="block text-sm text-slate-500 mb-1">Gender</label><p className="text-sm text-slate-900">{getCustomField('gender')}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Date of Birth</label><p className="text-sm text-slate-900">{formatDate(getCustomField('dateOfBirth'))}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Alternate Email</label><p className="text-sm text-slate-900">{currentLead.alternateEmail || '--'}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Alternate Phone</label><p className="text-sm text-slate-900">{currentLead.alternatePhone || '--'}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">City</label><p className="text-sm text-slate-900">{currentLead.city || '--'}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">State</label><p className="text-sm text-slate-900">{currentLead.state || '--'}</p></div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200">
              <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-primary-600">Additional Information</h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div><label className="block text-sm text-slate-500 mb-1">Walkin Date</label><p className="text-sm text-slate-900">{formatDate(currentLead.walkinDate)}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Lineup Date</label><p className="text-sm text-slate-900">{formatDate(currentLead.lineupDate)}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Preferred Location</label><p className="text-sm text-slate-900">{currentLead.preferredLocation || '--'}</p></div>
                  <div><label className="block text-sm text-slate-500 mb-1">Total Fees</label><p className="text-sm text-slate-900">{currentLead.totalFees ? `₹${currentLead.totalFees}` : '--'}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interests Tab */}
        {activeTab === 'interests' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Interests</h3>
              <button onClick={() => setShowInterestModal(true)} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Add Interest
              </button>
            </div>
            <div className="p-6">
              {loadingInterests ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : interests.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No interests recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interests.map((interest, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{interest.name}</p>
                        {interest.category && <p className="text-sm text-slate-500">{interest.category}</p>}
                        {interest.notes && <p className="text-sm text-slate-600 mt-1">{interest.notes}</p>}
                      </div>
                      <button onClick={() => handleDeleteInterest(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timelines Tab */}
        {activeTab === 'timelines' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            {loadingActivities ? (
              <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{activity.title}</p>
                        <p className="text-xs text-slate-500">{formatDateTime(activity.createdAt)}</p>
                        {activity.description && <p className="text-sm text-slate-600 mt-1">{activity.description}</p>}
                        {activity.user && (
                          <p className="text-xs text-slate-400 mt-1">by {activity.user.firstName} {activity.user.lastName}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {activities.length === 0 && (
                  <div className="text-center py-8 text-slate-500">No activity recorded yet</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100">
              <div className="flex gap-3">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="flex-1 p-3 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={3}
                />
                <button onClick={handleAddNote} disabled={!newNote.trim()} className="btn btn-primary self-end disabled:opacity-50">
                  Add Note
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingNotes ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : notes.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ChatBubbleOvalLeftIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No notes yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {notes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).map((note) => (
                    <div key={note.id} className={`p-4 rounded-lg ${note.isPinned ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
                      {editingNote === note.id ? (
                        <div className="flex gap-2">
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="flex-1 p-2 border border-slate-200 rounded-lg resize-none"
                            rows={2}
                          />
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleUpdateNote(note.id)} className="p-2 text-green-600 hover:bg-green-50 rounded">
                              <CheckIcon className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingNote(null)} className="p-2 text-slate-500 hover:bg-slate-100 rounded">
                              <XMarkIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-slate-700">{note.content}</p>
                          <div className="flex items-center justify-between mt-3">
                            <div className="text-xs text-slate-400">
                              {note.user?.firstName} {note.user?.lastName} • {formatDateTime(note.createdAt)}
                            </div>
                            <div className="flex items-center gap-1">
                              <button onClick={() => handleTogglePinNote(note)} className={`p-1.5 rounded ${note.isPinned ? 'text-yellow-600' : 'text-slate-400 hover:text-slate-600'}`}>
                                📌
                              </button>
                              <button onClick={() => { setEditingNote(note.id); setEditNoteContent(note.content); }} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button onClick={() => handleDeleteNote(note.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded">
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Call History</h3>
              <div className="flex gap-2">
                <a href={`tel:${currentLead.phone}`} className="btn btn-primary btn-sm">
                  <PhoneIcon className="h-4 w-4 mr-1" /> Make Call
                </a>
                <button onClick={() => setShowCallLogModal(true)} className="btn btn-secondary btn-sm">
                  <PlusIcon className="h-4 w-4 mr-1" /> Log Call
                </button>
              </div>
            </div>
            <div className="p-6">
              {loadingCalls ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : callLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <PhoneIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No calls recorded yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {callLogs.map((call) => (
                    <div key={call.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        call.status === 'COMPLETED' ? 'bg-green-100' :
                        call.status === 'MISSED' || call.status === 'NO_ANSWER' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        <PhoneIcon className={`h-5 w-5 ${
                          call.status === 'COMPLETED' ? 'text-green-600' :
                          call.status === 'MISSED' || call.status === 'NO_ANSWER' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {call.direction} Call - {call.status}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(call.createdAt)} • Duration: {call.duration || 0}s
                        </p>
                        {call.notes && <p className="text-sm text-slate-600 mt-1">{call.notes}</p>}
                      </div>
                      {call.recordingUrl && (
                        <button className="p-2 hover:bg-slate-200 rounded-lg">
                          <PlayIcon className="h-5 w-5 text-slate-600" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Follow-ups Tab */}
        {activeTab === 'followups' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Follow-ups</h3>
              <button onClick={() => setShowFollowUpModal(true)} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Schedule Follow-up
              </button>
            </div>
            <div className="p-6">
              {loadingFollowUps ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : followUps.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No follow-ups scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {followUps.map((followUp) => (
                    <div key={followUp.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${followUpStatusColors[followUp.status]}`}>
                              {followUp.status}
                            </span>
                            <span className="text-sm text-slate-600">{formatDateTime(followUp.scheduledAt)}</span>
                          </div>
                          {followUp.message && <p className="text-sm text-slate-700">{followUp.message}</p>}
                          {followUp.notes && <p className="text-sm text-slate-500 mt-1">{followUp.notes}</p>}
                          <p className="text-xs text-slate-400 mt-2">
                            Assigned to: {followUp.assignee?.firstName} {followUp.assignee?.lastName}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {followUp.status === 'UPCOMING' && (
                            <button onClick={() => handleUpdateFollowUpStatus(followUp.id, 'COMPLETED')}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Mark Complete">
                              <CheckIcon className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => handleDeleteFollowUp(followUp.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Tasks</h3>
              <button onClick={() => setShowTaskModal(true)} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Add Task
              </button>
            </div>
            <div className="p-6">
              {loadingTasks ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <ClipboardDocumentListIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No tasks assigned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        onChange={(e) => handleUpdateTaskStatus(task.id, e.target.checked ? 'COMPLETED' : 'PENDING')}
                        className="h-5 w-5 rounded border-slate-300 mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskStatusColors[task.status]}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        {task.description && <p className="text-sm text-slate-600 mt-1">{task.description}</p>}
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                          {task.dueDate && <span>Due: {formatDate(task.dueDate)}</span>}
                          <span>Assigned to: {task.assignee?.firstName} {task.assignee?.lastName}</span>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Attachments Tab */}
        {activeTab === 'attachments' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Attachments</h3>
              <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Upload File
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} />
            </div>
            <div className="p-6">
              {loadingAttachments ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : attachments.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <PaperClipIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No attachments uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                        <PaperClipIcon className="h-5 w-5 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-900 hover:text-primary-600">
                          {attachment.fileName}
                        </a>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(attachment.fileSize)} • {formatDateTime(attachment.uploadedAt)}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteAttachment(attachment.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Queries Tab */}
        {activeTab === 'queries' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Queries</h3>
              <button onClick={() => setShowQueryModal(true)} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> Add Query
              </button>
            </div>
            <div className="p-6">
              {loadingQueries ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : queries.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <QuestionMarkCircleIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No queries recorded</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {queries.map((query) => (
                    <div key={query.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${queryStatusColors[query.status]}`}>
                              {query.status}
                            </span>
                            <span className="text-xs text-slate-400">{formatDateTime(query.createdAt)}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mb-2">Q: {query.query}</p>
                          {query.response ? (
                            <p className="text-sm text-slate-600">A: {query.response}</p>
                          ) : (
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Add response..."
                                className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleUpdateQuery(query.id, { response: e.currentTarget.value, status: 'RESOLVED' });
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {query.status !== 'CLOSED' && (
                            <select
                              value={query.status}
                              onChange={(e) => handleUpdateQuery(query.id, { status: e.target.value as LeadQuery['status'] })}
                              className="text-xs border border-slate-200 rounded px-2 py-1"
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                          )}
                          <button onClick={() => handleDeleteQuery(query.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-medium text-slate-900">Applications</h3>
              <button onClick={() => setShowApplicationModal(true)} className="btn btn-primary btn-sm">
                <PlusIcon className="h-4 w-4 mr-1" /> New Application
              </button>
            </div>
            <div className="p-6">
              {loadingApplications ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div></div>
              ) : applications.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <DocumentTextIcon className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No applications submitted</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-900">{app.applicationNo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${applicationStatusColors[app.status]}`}>
                              {app.status.replace('_', ' ')}
                            </span>
                          </div>
                          {app.programName && <p className="text-sm text-slate-600">{app.programName}</p>}
                          <p className="text-xs text-slate-400 mt-2">Created: {formatDateTime(app.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <select
                            value={app.status}
                            onChange={(e) => handleUpdateApplicationStatus(app.id, e.target.value as LeadApplication['status'])}
                            className="text-xs border border-slate-200 rounded px-2 py-1"
                          >
                            <option value="DRAFT">Draft</option>
                            <option value="SUBMITTED">Submitted</option>
                            <option value="UNDER_REVIEW">Under Review</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="ENROLLED">Enrolled</option>
                          </select>
                          <button onClick={() => handleDeleteApplication(app.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Task</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Task title"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <textarea
                placeholder="Description (optional)"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
              <input
                type="datetime-local"
                value={taskForm.dueDate}
                onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <select
                value={taskForm.priority}
                onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              >
                <option value="LOW">Low Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent</option>
              </select>
              <select
                value={taskForm.assigneeId}
                onChange={(e) => setTaskForm({ ...taskForm, assigneeId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">Assign to me</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowTaskModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddTask} disabled={!taskForm.title.trim()} className="btn btn-primary">Create Task</button>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Schedule Follow-up</h3>
            <div className="space-y-4">
              <input
                type="datetime-local"
                value={followUpForm.scheduledAt}
                onChange={(e) => setFollowUpForm({ ...followUpForm, scheduledAt: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="Message (optional)"
                value={followUpForm.message}
                onChange={(e) => setFollowUpForm({ ...followUpForm, message: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <textarea
                placeholder="Notes (optional)"
                value={followUpForm.notes}
                onChange={(e) => setFollowUpForm({ ...followUpForm, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
              <select
                value={followUpForm.assigneeId}
                onChange={(e) => setFollowUpForm({ ...followUpForm, assigneeId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              >
                <option value="">Assign to me</option>
                {counselors.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowFollowUpModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddFollowUp} disabled={!followUpForm.scheduledAt} className="btn btn-primary">Schedule</button>
            </div>
          </div>
        </div>
      )}

      {/* Query Modal */}
      {showQueryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Query</h3>
            <textarea
              placeholder="Enter query..."
              value={queryForm.query}
              onChange={(e) => setQueryForm({ query: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              rows={4}
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowQueryModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddQuery} disabled={!queryForm.query.trim()} className="btn btn-primary">Add Query</button>
            </div>
          </div>
        </div>
      )}

      {/* Application Modal */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">New Application</h3>
            <input
              type="text"
              placeholder="Program Name (optional)"
              value={applicationForm.programName}
              onChange={(e) => setApplicationForm({ programName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowApplicationModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddApplication} className="btn btn-primary">Create Application</button>
            </div>
          </div>
        </div>
      )}

      {/* Interest Modal */}
      {showInterestModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Interest</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Interest name"
                value={interestForm.name}
                onChange={(e) => setInterestForm({ ...interestForm, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <input
                type="text"
                placeholder="Category (optional)"
                value={interestForm.category}
                onChange={(e) => setInterestForm({ ...interestForm, category: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <textarea
                placeholder="Notes (optional)"
                value={interestForm.notes}
                onChange={(e) => setInterestForm({ ...interestForm, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowInterestModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddInterest} disabled={!interestForm.name.trim()} className="btn btn-primary">Add Interest</button>
            </div>
          </div>
        </div>
      )}

      {/* Call Log Modal */}
      {showCallLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Log Call</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Phone number"
                value={callLogForm.phoneNumber}
                onChange={(e) => setCallLogForm({ ...callLogForm, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <select
                value={callLogForm.direction}
                onChange={(e) => setCallLogForm({ ...callLogForm, direction: e.target.value as any })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              >
                <option value="OUTBOUND">Outbound</option>
                <option value="INBOUND">Inbound</option>
              </select>
              <select
                value={callLogForm.status}
                onChange={(e) => setCallLogForm({ ...callLogForm, status: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              >
                <option value="COMPLETED">Completed</option>
                <option value="MISSED">Missed</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="BUSY">Busy</option>
              </select>
              <input
                type="number"
                placeholder="Duration (seconds)"
                value={callLogForm.duration}
                onChange={(e) => setCallLogForm({ ...callLogForm, duration: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
              <textarea
                placeholder="Notes (optional)"
                value={callLogForm.notes}
                onChange={(e) => setCallLogForm({ ...callLogForm, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowCallLogModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleAddCallLog} disabled={!callLogForm.phoneNumber} className="btn btn-primary">Log Call</button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsappModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send WhatsApp Message</h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">To: {currentLead?.phone}</p>
              </div>
              <textarea
                placeholder="Type your message..."
                value={whatsappForm.message}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, message: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={4}
              />
              <input
                type="url"
                placeholder="Media URL (optional)"
                value={whatsappForm.mediaUrl}
                onChange={(e) => setWhatsappForm({ ...whatsappForm, mediaUrl: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowWhatsappModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSendWhatsApp} disabled={!whatsappForm.message.trim()} className="btn btn-primary">Send WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Send SMS</h3>
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-600">To: {currentLead?.phone}</p>
              </div>
              <textarea
                placeholder="Type your message..."
                value={smsForm.message}
                onChange={(e) => setSmsForm({ message: e.target.value })}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg"
                rows={4}
              />
              <p className="text-xs text-slate-400">Character count: {smsForm.message.length}/160</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowSmsModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSendSms} disabled={!smsForm.message.trim()} className="btn btn-primary">Send SMS</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
