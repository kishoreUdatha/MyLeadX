/**
 * Task Reports Service
 * Tenant-scoped task reporting for tracking lead tasks
 */

import { prisma } from '../config/database';
import { Prisma } from '@prisma/client';

interface ReportFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  assigneeId?: string;
  userRole?: string;
  userId?: string;
}

interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  overdue: number;
  dueToday: number;
  highPriority: number;
}

interface TaskRow {
  id: string;
  taskName: string;
  taskType: string;
  assigneeName: string;
  reportingManager: string;
  leadName: string;
  leadMobile: string;
  createdDate: string;
  dueDate: string;
  dueTime: string;
  completedDate: string;
  priority: string;
  status: string;
  remarks: string;
}

class TaskReportsService {
  /**
   * Build where clause with role-based filtering
   */
  private async buildWhereClause(filters: ReportFilters): Promise<Prisma.LeadTaskWhereInput> {
    const { organizationId, startDate, endDate, assigneeId, userRole, userId } = filters;

    const where: Prisma.LeadTaskWhereInput = {
      lead: { organizationId },
    };

    // Date range filter on created date
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate + 'T23:59:59.999Z'),
      };
    }

    // Assignee filter
    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    // Role-based filtering
    const normalizedRole = userRole?.toLowerCase().replace('_', '');

    if (normalizedRole === 'telecaller' || normalizedRole === 'counselor') {
      if (userId) {
        where.assigneeId = userId;
      }
    } else if (normalizedRole === 'teamlead' && userId) {
      const teamMembers = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamMembers.map(m => m.id)];
      where.assigneeId = { in: allMemberIds };
    } else if (normalizedRole === 'manager' && userId) {
      const teamLeads = await prisma.user.findMany({
        where: { organizationId, managerId: userId, isActive: true },
        select: { id: true },
      });
      const teamLeadIds = teamLeads.map(tl => tl.id);

      const allTeamMembers = await prisma.user.findMany({
        where: {
          organizationId,
          OR: [{ managerId: { in: teamLeadIds } }, { managerId: userId }],
          isActive: true,
        },
        select: { id: true },
      });
      const allMemberIds = [userId, ...teamLeadIds, ...allTeamMembers.map(m => m.id)];
      where.assigneeId = { in: allMemberIds };
    }

    return where;
  }

  /**
   * Get task summary statistics
   */
  async getSummary(filters: ReportFilters): Promise<TaskSummary> {
    const where = await this.buildWhereClause(filters);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const [total, completed, pending, inProgress, overdue, dueToday, highPriority] = await Promise.all([
      prisma.leadTask.count({ where }),
      prisma.leadTask.count({ where: { ...where, status: 'COMPLETED' } }),
      prisma.leadTask.count({ where: { ...where, status: 'PENDING' } }),
      prisma.leadTask.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.leadTask.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }),
      prisma.leadTask.count({
        where: {
          ...where,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          dueDate: { gte: todayStart, lt: todayEnd },
        },
      }),
      prisma.leadTask.count({ where: { ...where, priority: 'HIGH' } }),
    ]);

    return {
      total,
      completed,
      pending,
      inProgress,
      overdue,
      dueToday,
      highPriority,
    };
  }

  /**
   * Get all tasks with details
   */
  async getTasks(filters: ReportFilters, limit = 100): Promise<TaskRow[]> {
    const where = await this.buildWhereClause(filters);
    const now = new Date();

    const tasks = await prisma.leadTask.findMany({
      where,
      include: {
        lead: {
          select: {
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        assignee: {
          select: {
            firstName: true,
            lastName: true,
            manager: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }],
      take: limit,
    });

    return tasks.map((task, index) => {
      const dueDate = task.dueDate ? new Date(task.dueDate) : null;
      const isOverdue = dueDate && dueDate < now && task.status !== 'COMPLETED' && task.status !== 'CANCELLED';

      // Determine task type based on title keywords
      let taskType = 'Other';
      const titleLower = task.title.toLowerCase();
      if (titleLower.includes('call')) taskType = 'Call';
      else if (titleLower.includes('follow') || titleLower.includes('followup')) taskType = 'Follow-Up';
      else if (titleLower.includes('meet') || titleLower.includes('visit')) taskType = 'Meeting';
      else if (titleLower.includes('email') || titleLower.includes('mail')) taskType = 'Email';
      else if (titleLower.includes('document') || titleLower.includes('doc')) taskType = 'Document';
      else if (titleLower.includes('visit')) taskType = 'Visit';

      // Map status
      let status = task.status;
      if (isOverdue && status !== 'COMPLETED') {
        status = 'Overdue';
      } else if (status === 'PENDING') {
        status = 'Pending';
      } else if (status === 'IN_PROGRESS') {
        status = 'In Progress';
      } else if (status === 'COMPLETED') {
        status = 'Completed';
      }

      return {
        id: task.id,
        taskName: task.title,
        taskType,
        assigneeName: `${task.assignee.firstName} ${task.assignee.lastName}`.trim(),
        reportingManager: task.assignee.manager
          ? `${task.assignee.manager.firstName} ${task.assignee.manager.lastName}`.trim()
          : '-',
        leadName: `${task.lead.firstName || ''} ${task.lead.lastName || ''}`.trim() || 'Unknown',
        leadMobile: task.lead.phone || '-',
        createdDate: task.createdAt.toISOString().split('T')[0],
        dueDate: dueDate ? dueDate.toISOString().split('T')[0] : '-',
        dueTime: dueDate ? dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-',
        completedDate: task.completedAt ? task.completedAt.toISOString().split('T')[0] : '-',
        priority: task.priority.charAt(0) + task.priority.slice(1).toLowerCase(),
        status,
        remarks: task.description || '-',
      };
    });
  }

  /**
   * Get comprehensive task report
   */
  async getComprehensiveReport(filters: ReportFilters): Promise<{
    summary: TaskSummary;
    tasks: TaskRow[];
  }> {
    const [summary, tasks] = await Promise.all([
      this.getSummary(filters),
      this.getTasks(filters),
    ]);

    return { summary, tasks };
  }
}

export const taskReportsService = new TaskReportsService();
