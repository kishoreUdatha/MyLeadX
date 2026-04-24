import api from './index';

// ==================== NOTES ====================

export interface LeadNote {
  id: string;
  leadId: string;
  userId: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getNotes = async (leadId: string): Promise<LeadNote[]> => {
  const response = await api.get(`/lead-details/${leadId}/notes`);
  return response.data.data || [];
};

export const createNote = async (leadId: string, data: { content: string; isPinned?: boolean }): Promise<LeadNote> => {
  const response = await api.post(`/lead-details/${leadId}/notes`, data);
  return response.data.data;
};

export const updateNote = async (leadId: string, noteId: string, data: { content?: string; isPinned?: boolean }): Promise<LeadNote> => {
  const response = await api.put(`/lead-details/${leadId}/notes/${noteId}`, data);
  return response.data.data;
};

export const deleteNote = async (leadId: string, noteId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/notes/${noteId}`);
};

// ==================== TASKS ====================

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface LeadTask {
  id: string;
  leadId: string;
  assigneeId: string;
  createdById: string;
  title: string;
  description?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getTasks = async (leadId: string): Promise<LeadTask[]> => {
  const response = await api.get(`/lead-details/${leadId}/tasks`);
  return response.data.data || [];
};

export const createTask = async (leadId: string, data: {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  assigneeId?: string;
}): Promise<LeadTask> => {
  const response = await api.post(`/lead-details/${leadId}/tasks`, data);
  return response.data.data;
};

export const updateTask = async (leadId: string, taskId: string, data: {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  assigneeId?: string;
}): Promise<LeadTask> => {
  const response = await api.put(`/lead-details/${leadId}/tasks/${taskId}`, data);
  return response.data.data;
};

export const deleteTask = async (leadId: string, taskId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/tasks/${taskId}`);
};

// ==================== FOLLOW-UPS ====================

export type FollowUpStatus = 'UPCOMING' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED';

export interface FollowUp {
  id: string;
  leadId: string;
  assigneeId: string;
  createdById: string;
  scheduledAt: string;
  message?: string;
  notes?: string;
  status: FollowUpStatus;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getFollowUps = async (leadId: string): Promise<FollowUp[]> => {
  const response = await api.get(`/lead-details/${leadId}/follow-ups`);
  return response.data.data || [];
};

export const createFollowUp = async (leadId: string, data: {
  scheduledAt: string;
  message?: string;
  notes?: string;
  assigneeId?: string;
}): Promise<FollowUp> => {
  const response = await api.post(`/lead-details/${leadId}/follow-ups`, data);
  return response.data.data;
};

export const updateFollowUp = async (leadId: string, followUpId: string, data: {
  scheduledAt?: string;
  message?: string;
  notes?: string;
  status?: FollowUpStatus;
  assigneeId?: string;
}): Promise<FollowUp> => {
  const response = await api.put(`/lead-details/${leadId}/follow-ups/${followUpId}`, data);
  return response.data.data;
};

export const deleteFollowUp = async (leadId: string, followUpId: string): Promise<void> => {
  await api.delete(`/lead-details/${leadId}/follow-ups/${followUpId}`);
};

// ==================== ACTIVITIES (Timeline) ====================

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  type: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getActivities = async (leadId: string, limit?: number): Promise<LeadActivity[]> => {
  const params = limit ? `?limit=${limit}` : '';
  const response = await api.get(`/lead-details/${leadId}/activities${params}`);
  return response.data.data || [];
};

// ==================== CALL LOGS ====================

export interface CallLog {
  id: string;
  leadId?: string;
  callerId: string;
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  callType: 'MANUAL' | 'AI' | 'IVRS' | 'PERSONAL';
  status: string;
  duration?: number;
  recordingUrl?: string;
  transcript?: string;
  notes?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  caller?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export const getCallLogs = async (leadId: string): Promise<CallLog[]> => {
  const response = await api.get(`/lead-details/${leadId}/calls`);
  return response.data.data || [];
};

export const createCallLog = async (leadId: string, data: {
  phoneNumber: string;
  direction: 'INBOUND' | 'OUTBOUND';
  callType?: 'MANUAL' | 'AI' | 'IVRS' | 'PERSONAL';
  status?: string;
  duration?: number;
  notes?: string;
  recordingUrl?: string;
}): Promise<CallLog> => {
  const response = await api.post(`/lead-details/${leadId}/calls`, data);
  return response.data.data;
};

export default {
  // Notes
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  // Tasks
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  // Follow-ups
  getFollowUps,
  createFollowUp,
  updateFollowUp,
  deleteFollowUp,
  // Activities
  getActivities,
  // Call logs
  getCallLogs,
  createCallLog,
};
