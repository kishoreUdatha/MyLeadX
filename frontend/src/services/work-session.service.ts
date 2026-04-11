/**
 * Work Session Service
 * Handles user work sessions and break management
 */

import api from './api';

export interface WorkSession {
  id: string;
  userId: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  activeTime: number;
  idleTime: number;
  totalBreakTime: number;
  status: 'ACTIVE' | 'ON_BREAK' | 'ENDED' | 'EXPIRED';
  ipAddress?: string;
  userAgent?: string;
  device?: string;
  breaks?: UserBreak[]; // Active breaks (endedAt is null)
}

export interface UserBreak {
  id: string;
  userId: string;
  workSessionId: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  breakType: 'SHORT' | 'LUNCH' | 'MEETING' | 'PERSONAL' | 'OTHER';
  reason?: string;
}

export interface SessionSummary {
  userId: string;
  userName: string;
  loginTime: string;
  logoutTime: string;
  activeTime: number;
  breakTime: number;
  idleTime: number;
  totalCalls: number;
  avgCallDuration: number;
}

export interface OrgStats {
  totalSessions: number;
  totalActiveTime: number;
  totalBreakTime: number;
  totalIdleTime: number;
  totalDuration: number;
  activeUsersCount: number;
}

export interface TeamMemberStatus {
  id: string;
  name: string;
  since?: string;
  lastSeen?: string;
  breakType?: string;
}

export interface TeamWorkStatus {
  active: TeamMemberStatus[];
  onBreak: TeamMemberStatus[];
  offline: TeamMemberStatus[];
}

class WorkSessionService {
  /**
   * Start a new work session (called on login)
   */
  async startSession(device?: string): Promise<WorkSession> {
    const response = await api.post('/work-sessions/start', { device });
    return response.data.data;
  }

  /**
   * End current work session (called on logout)
   */
  async endSession(): Promise<WorkSession | null> {
    const response = await api.post('/work-sessions/end');
    return response.data.data;
  }

  /**
   * Get current active session
   */
  async getCurrentSession(): Promise<WorkSession | null> {
    // Add timestamp to prevent caching
    const response = await api.get(`/work-sessions/current?_t=${Date.now()}`);
    return response.data.data;
  }

  /**
   * Start a break
   */
  async startBreak(breakType: UserBreak['breakType'] = 'SHORT', reason?: string): Promise<UserBreak> {
    const response = await api.post('/work-sessions/break/start', { breakType, reason });
    return response.data.data;
  }

  /**
   * End current break
   */
  async endBreak(): Promise<UserBreak> {
    const response = await api.post('/work-sessions/break/end');
    return response.data.data;
  }

  /**
   * Get user's breaks for today or date range
   */
  async getBreaks(params?: { startDate?: string; endDate?: string }): Promise<UserBreak[]> {
    const response = await api.get('/work-sessions/breaks', { params });
    return response.data.data;
  }

  /**
   * Get session summary for reporting
   */
  async getSessionSummary(params?: { userId?: string; startDate?: string; endDate?: string }): Promise<SessionSummary[]> {
    const response = await api.get('/work-sessions/summary', { params });
    return response.data.data;
  }

  /**
   * Get organization-wide stats
   */
  async getOrgStats(params?: { startDate?: string; endDate?: string }): Promise<OrgStats> {
    const response = await api.get('/work-sessions/org-stats', { params });
    return response.data.data;
  }

  /**
   * Add active time after completing an activity
   */
  async addActiveTime(seconds: number): Promise<WorkSession> {
    const response = await api.post('/work-sessions/add-active-time', { seconds });
    return response.data.data;
  }

  /**
   * Get team work status (for admins/managers)
   * Shows who is active, on break, or offline
   */
  async getTeamWorkStatus(): Promise<TeamWorkStatus> {
    const response = await api.get(`/work-sessions/team-status?_t=${Date.now()}`);
    return response.data.data;
  }
}

export const workSessionService = new WorkSessionService();
