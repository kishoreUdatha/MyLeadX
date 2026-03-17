/**
 * Custom hook for managing lead detail data
 * Handles loading and state management for all lead detail tabs
 */

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
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
} from '../../../services/leadDetails.service';

export interface UseLeadDetailDataReturn {
  // Data
  notes: LeadNote[];
  tasks: LeadTask[];
  followUps: FollowUp[];
  attachments: LeadAttachment[];
  queries: LeadQuery[];
  applications: LeadApplication[];
  activities: LeadActivity[];
  interests: Interest[];
  callLogs: CallLog[];

  // Loading states
  loadingNotes: boolean;
  loadingTasks: boolean;
  loadingFollowUps: boolean;
  loadingAttachments: boolean;
  loadingQueries: boolean;
  loadingApplications: boolean;
  loadingActivities: boolean;
  loadingInterests: boolean;
  loadingCalls: boolean;

  // Note handlers
  addNote: (content: string) => Promise<void>;
  updateNote: (noteId: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  togglePinNote: (note: LeadNote) => Promise<void>;

  // Task handlers
  addTask: (task: Omit<LeadTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>) => Promise<void>;
  updateTaskStatus: (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;

  // Follow-up handlers
  addFollowUp: (followUp: { scheduledAt: string; message?: string; notes?: string; assigneeId?: string }) => Promise<void>;
  updateFollowUpStatus: (followUpId: string, status: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED') => Promise<void>;
  deleteFollowUp: (followUpId: string) => Promise<void>;

  // Attachment handlers
  uploadAttachment: (file: File) => Promise<void>;
  deleteAttachment: (attachmentId: string) => Promise<void>;

  // Query handlers
  addQuery: (query: string) => Promise<void>;
  updateQuery: (queryId: string, data: { response?: string; status?: string }) => Promise<void>;
  deleteQuery: (queryId: string) => Promise<void>;

  // Application handlers
  addApplication: (programName: string) => Promise<void>;
  updateApplicationStatus: (appId: string, status: LeadApplication['status']) => Promise<void>;
  deleteApplication: (appId: string) => Promise<void>;

  // Interest handlers
  addInterest: (interest: Interest) => Promise<void>;
  deleteInterest: (index: number) => Promise<void>;

  // Call handlers
  addCallLog: (callLog: { phoneNumber: string; direction: string; status: string; duration: number; notes?: string }) => Promise<void>;

  // Load functions
  loadTabData: (tab: string) => Promise<void>;
}

export function useLeadDetailData(leadId: string | undefined): UseLeadDetailDataReturn {
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

  // Load tab data
  const loadTabData = useCallback(async (tab: string) => {
    if (!leadId) return;

    try {
      switch (tab) {
        case 'notes':
          setLoadingNotes(true);
          const notesData = await leadDetailsService.getNotes(leadId);
          setNotes(notesData);
          setLoadingNotes(false);
          break;
        case 'tasks':
          setLoadingTasks(true);
          const tasksData = await leadDetailsService.getTasks(leadId);
          setTasks(tasksData);
          setLoadingTasks(false);
          break;
        case 'followups':
          setLoadingFollowUps(true);
          const followUpsData = await leadDetailsService.getFollowUps(leadId);
          setFollowUps(followUpsData);
          setLoadingFollowUps(false);
          break;
        case 'attachments':
          setLoadingAttachments(true);
          const attachmentsData = await leadDetailsService.getAttachments(leadId);
          setAttachments(attachmentsData);
          setLoadingAttachments(false);
          break;
        case 'queries':
          setLoadingQueries(true);
          const queriesData = await leadDetailsService.getQueries(leadId);
          setQueries(queriesData);
          setLoadingQueries(false);
          break;
        case 'applications':
          setLoadingApplications(true);
          const applicationsData = await leadDetailsService.getApplications(leadId);
          setApplications(applicationsData);
          setLoadingApplications(false);
          break;
        case 'timelines':
          setLoadingActivities(true);
          const activitiesResult = await leadDetailsService.getActivities(leadId);
          setActivities(activitiesResult.data);
          setLoadingActivities(false);
          break;
        case 'interests':
          setLoadingInterests(true);
          const interestsData = await leadDetailsService.getInterests(leadId);
          setInterests(interestsData || []);
          setLoadingInterests(false);
          break;
        case 'calls':
          setLoadingCalls(true);
          const callsData = await leadDetailsService.getCallLogs(leadId);
          setCallLogs(callsData);
          setLoadingCalls(false);
          break;
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [leadId]);

  // Note handlers
  const addNote = useCallback(async (content: string) => {
    if (!leadId || !content.trim()) return;
    try {
      const note = await leadDetailsService.createNote(leadId, { content });
      setNotes(prev => [note, ...prev]);
      toast.success('Note added');
    } catch (error) {
      toast.error('Failed to add note');
    }
  }, [leadId]);

  const updateNote = useCallback(async (noteId: string, content: string) => {
    if (!leadId || !content.trim()) return;
    try {
      const updated = await leadDetailsService.updateNote(leadId, noteId, { content });
      setNotes(prev => prev.map(n => n.id === noteId ? updated : n));
      toast.success('Note updated');
    } catch (error) {
      toast.error('Failed to update note');
    }
  }, [leadId]);

  const deleteNote = useCallback(async (noteId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteNote(leadId, noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (error) {
      toast.error('Failed to delete note');
    }
  }, [leadId]);

  const togglePinNote = useCallback(async (note: LeadNote) => {
    if (!leadId) return;
    try {
      const updated = await leadDetailsService.updateNote(leadId, note.id, { isPinned: !note.isPinned });
      setNotes(prev => prev.map(n => n.id === note.id ? updated : n));
    } catch (error) {
      toast.error('Failed to update note');
    }
  }, [leadId]);

  // Task handlers
  const addTask = useCallback(async (taskData: any) => {
    if (!leadId || !taskData.title?.trim()) return;
    try {
      const task = await leadDetailsService.createTask(leadId, {
        ...taskData,
        dueDate: taskData.dueDate || undefined,
        assigneeId: taskData.assigneeId || undefined,
      });
      setTasks(prev => [task, ...prev]);
      toast.success('Task created');
    } catch (error) {
      toast.error('Failed to create task');
    }
  }, [leadId]);

  const updateTaskStatus = useCallback(async (taskId: string, status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') => {
    if (!leadId) return;
    try {
      const updated = await leadDetailsService.updateTask(leadId, taskId, { status });
      setTasks(prev => prev.map(t => t.id === taskId ? updated : t));
      toast.success('Task updated');
    } catch (error) {
      toast.error('Failed to update task');
    }
  }, [leadId]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteTask(leadId, taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  }, [leadId]);

  // Follow-up handlers
  const addFollowUp = useCallback(async (followUpData: { scheduledAt: string; message?: string; notes?: string; assigneeId?: string }) => {
    if (!leadId || !followUpData.scheduledAt) return;
    try {
      const followUp = await leadDetailsService.createFollowUp(leadId, {
        ...followUpData,
        assigneeId: followUpData.assigneeId || undefined,
      });
      setFollowUps(prev => [...prev, followUp].sort((a, b) =>
        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
      ));
      toast.success('Follow-up scheduled');
    } catch (error) {
      toast.error('Failed to schedule follow-up');
    }
  }, [leadId]);

  const updateFollowUpStatus = useCallback(async (followUpId: string, status: 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED') => {
    if (!leadId) return;
    try {
      const updated = await leadDetailsService.updateFollowUp(leadId, followUpId, { status });
      setFollowUps(prev => prev.map(f => f.id === followUpId ? updated : f));
      toast.success('Follow-up updated');
    } catch (error) {
      toast.error('Failed to update follow-up');
    }
  }, [leadId]);

  const deleteFollowUp = useCallback(async (followUpId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteFollowUp(leadId, followUpId);
      setFollowUps(prev => prev.filter(f => f.id !== followUpId));
      toast.success('Follow-up deleted');
    } catch (error) {
      toast.error('Failed to delete follow-up');
    }
  }, [leadId]);

  // Attachment handlers
  const uploadAttachment = useCallback(async (file: File) => {
    if (!leadId || !file) return;
    try {
      const attachment = await leadDetailsService.uploadAttachment(leadId, file);
      setAttachments(prev => [attachment, ...prev]);
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    }
  }, [leadId]);

  const deleteAttachment = useCallback(async (attachmentId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteAttachment(leadId, attachmentId);
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      toast.success('Attachment deleted');
    } catch (error) {
      toast.error('Failed to delete attachment');
    }
  }, [leadId]);

  // Query handlers
  const addQuery = useCallback(async (query: string) => {
    if (!leadId || !query.trim()) return;
    try {
      const newQuery = await leadDetailsService.createQuery(leadId, { query });
      setQueries(prev => [newQuery, ...prev]);
      toast.success('Query added');
    } catch (error) {
      toast.error('Failed to add query');
    }
  }, [leadId]);

  const updateQuery = useCallback(async (queryId: string, data: { response?: string; status?: string }) => {
    if (!leadId) return;
    try {
      const updated = await leadDetailsService.updateQuery(leadId, queryId, data);
      setQueries(prev => prev.map(q => q.id === queryId ? updated : q));
      toast.success('Query updated');
    } catch (error) {
      toast.error('Failed to update query');
    }
  }, [leadId]);

  const deleteQuery = useCallback(async (queryId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteQuery(leadId, queryId);
      setQueries(prev => prev.filter(q => q.id !== queryId));
      toast.success('Query deleted');
    } catch (error) {
      toast.error('Failed to delete query');
    }
  }, [leadId]);

  // Application handlers
  const addApplication = useCallback(async (programName: string) => {
    if (!leadId) return;
    try {
      const application = await leadDetailsService.createApplication(leadId, { programName });
      setApplications(prev => [application, ...prev]);
      toast.success('Application created');
    } catch (error) {
      toast.error('Failed to create application');
    }
  }, [leadId]);

  const updateApplicationStatus = useCallback(async (appId: string, status: LeadApplication['status']) => {
    if (!leadId) return;
    try {
      const updated = await leadDetailsService.updateApplication(leadId, appId, { status });
      setApplications(prev => prev.map(a => a.id === appId ? updated : a));
      toast.success('Application updated');
    } catch (error) {
      toast.error('Failed to update application');
    }
  }, [leadId]);

  const deleteApplication = useCallback(async (appId: string) => {
    if (!leadId) return;
    try {
      await leadDetailsService.deleteApplication(leadId, appId);
      setApplications(prev => prev.filter(a => a.id !== appId));
      toast.success('Application deleted');
    } catch (error) {
      toast.error('Failed to delete application');
    }
  }, [leadId]);

  // Interest handlers
  const addInterest = useCallback(async (interest: Interest) => {
    if (!leadId || !interest.name.trim()) return;
    try {
      const newInterests = [...interests, interest];
      await leadDetailsService.updateInterests(leadId, newInterests);
      setInterests(newInterests);
      toast.success('Interest added');
    } catch (error) {
      toast.error('Failed to add interest');
    }
  }, [leadId, interests]);

  const deleteInterest = useCallback(async (index: number) => {
    if (!leadId) return;
    try {
      const newInterests = interests.filter((_, i) => i !== index);
      await leadDetailsService.updateInterests(leadId, newInterests);
      setInterests(newInterests);
      toast.success('Interest removed');
    } catch (error) {
      toast.error('Failed to remove interest');
    }
  }, [leadId, interests]);

  // Call handlers
  const addCallLog = useCallback(async (callLogData: { phoneNumber: string; direction: string; status: string; duration: number; notes?: string }) => {
    if (!leadId || !callLogData.phoneNumber) return;
    try {
      const call = await leadDetailsService.createCallLog(leadId, callLogData);
      setCallLogs(prev => [call, ...prev]);
      toast.success('Call logged');
    } catch (error) {
      toast.error('Failed to log call');
    }
  }, [leadId]);

  return {
    // Data
    notes,
    tasks,
    followUps,
    attachments,
    queries,
    applications,
    activities,
    interests,
    callLogs,

    // Loading states
    loadingNotes,
    loadingTasks,
    loadingFollowUps,
    loadingAttachments,
    loadingQueries,
    loadingApplications,
    loadingActivities,
    loadingInterests,
    loadingCalls,

    // Handlers
    addNote,
    updateNote,
    deleteNote,
    togglePinNote,
    addTask,
    updateTaskStatus,
    deleteTask,
    addFollowUp,
    updateFollowUpStatus,
    deleteFollowUp,
    uploadAttachment,
    deleteAttachment,
    addQuery,
    updateQuery,
    deleteQuery,
    addApplication,
    updateApplicationStatus,
    deleteApplication,
    addInterest,
    deleteInterest,
    addCallLog,
    loadTabData,
  };
}

export default useLeadDetailData;
