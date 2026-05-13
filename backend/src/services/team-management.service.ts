/**
 * Team Management Service
 * Provides team analytics, workload distribution, and capacity planning
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TeamMemberStats {
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  activeLeads: number;
  completedLeads: number;
  conversionRate: number;
  avgResponseTime: number; // in minutes
  callsMade: number;
  callsAnswered: number;
  lastActivityAt: Date | null;
  workloadScore: number; // 0-100
  capacityUsed: number; // percentage
}

export interface TeamOverview {
  totalMembers: number;
  activeMembers: number;
  totalLeads: number;
  activeLeads: number;
  completedLeads: number;
  avgConversionRate: number;
  avgResponseTime: number;
  totalCalls: number;
  workloadDistribution: {
    underloaded: number;
    optimal: number;
    overloaded: number;
  };
}

export interface TeamHierarchy {
  id: string;
  name: string;
  email: string;
  role: string;
  teamMembers: TeamHierarchy[];
  stats?: {
    totalLeads: number;
    conversionRate: number;
  };
}

class TeamManagementService {
  /**
   * Helper to get team member IDs based on user's role
   * - Admin/Owner/Director: sees all users in org
   * - Manager: sees direct reports + themselves
   * - Others: sees just themselves
   */
  private async getTeamMemberIds(userId: string, organizationId: string): Promise<string[]> {
    // Get current user with role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) return [userId];

    const roleSlug = currentUser.role?.slug?.toLowerCase() || '';
    const roleName = currentUser.role?.name?.toLowerCase() || '';

    // Check both slug and name for admin-like roles
    const adminSlugs = ['admin', 'owner', 'super_admin', 'director', 'superadmin'];
    const adminNames = ['admin', 'owner', 'director', 'super admin', 'administrator', 'ceo', 'founder'];

    const isAdmin = adminSlugs.includes(roleSlug) || adminNames.some(name => roleName.includes(name));

    if (isAdmin) {
      // Admin sees all users in the organization
      const allUsers = await prisma.user.findMany({
        where: { organizationId, isActive: true },
        select: { id: true },
      });
      return allUsers.map(u => u.id);
    }

    // Check if user has any direct reports
    const directReports = await prisma.user.findMany({
      where: { organizationId, managerId: userId, isActive: true },
      select: { id: true },
    });

    if (directReports.length > 0) {
      // Manager with direct reports - include self + all reports recursively
      const allTeamIds = new Set<string>([userId]);

      // Get all users under this manager (recursive)
      const getAllReports = async (managerIds: string[]): Promise<void> => {
        const reports = await prisma.user.findMany({
          where: { organizationId, managerId: { in: managerIds }, isActive: true },
          select: { id: true },
        });

        for (const report of reports) {
          if (!allTeamIds.has(report.id)) {
            allTeamIds.add(report.id);
          }
        }

        // Get next level reports
        const newManagerIds = reports.map(r => r.id).filter(id => !managerIds.includes(id));
        if (newManagerIds.length > 0) {
          await getAllReports(newManagerIds);
        }
      };

      await getAllReports([userId]);
      return Array.from(allTeamIds);
    }

    // No direct reports - just show themselves
    return [userId];
  }

  /**
   * Get team overview for a manager
   */
  async getTeamOverview(managerId: string, organizationId: string): Promise<TeamOverview> {
    // Get team members based on user's role and permissions
    const memberIds = await this.getTeamMemberIds(managerId, organizationId);

    // Get lead statistics
    const [totalLeads, completedLeads] = await Promise.all([
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        },
      }),
      prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
          isConverted: true,
        },
      }),
    ]);

    const activeLeads = totalLeads - completedLeads;

    // Get call statistics (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const callStats = await prisma.callLog.aggregate({
      where: {
        organizationId,
        callerId: { in: memberIds },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: true,
    });

    // Calculate workload distribution
    const memberStats = await this.getTeamMemberStats(managerId, organizationId);
    const workloadDistribution = {
      underloaded: memberStats.filter(m => m.workloadScore < 40).length,
      optimal: memberStats.filter(m => m.workloadScore >= 40 && m.workloadScore <= 80).length,
      overloaded: memberStats.filter(m => m.workloadScore > 80).length,
    };

    const avgConversionRate = totalLeads > 0 ? (completedLeads / totalLeads) * 100 : 0;

    return {
      totalMembers: memberIds.length,
      activeMembers: memberIds.length,
      totalLeads,
      activeLeads,
      completedLeads,
      avgConversionRate: Math.round(avgConversionRate * 10) / 10,
      avgResponseTime: 45, // TODO: Calculate from actual data
      totalCalls: callStats._count || 0,
      workloadDistribution,
    };
  }

  /**
   * Get detailed stats for each team member
   */
  async getTeamMemberStats(managerId: string, organizationId: string): Promise<TeamMemberStats[]> {
    // Get team member IDs based on user's role
    const memberIds = await this.getTeamMemberIds(managerId, organizationId);

    // Get team members with details
    const teamMembers = await prisma.user.findMany({
      where: {
        organizationId,
        id: { in: memberIds },
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const stats: TeamMemberStats[] = [];

    for (const member of teamMembers) {
      // Get lead counts
      const [totalLeads, completedLeads] = await Promise.all([
        prisma.lead.count({
          where: {
            organizationId,
            assignments: { some: { assignedToId: member.id, isActive: true } },
          },
        }),
        prisma.lead.count({
          where: {
            organizationId,
            assignments: { some: { assignedToId: member.id, isActive: true } },
            isConverted: true,
          },
        }),
      ]);

      const activeLeads = totalLeads - completedLeads;

      // Get call counts
      const callCounts = await prisma.callLog.aggregate({
        where: {
          organizationId,
          callerId: member.id,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: true,
      });

      const answeredCalls = await prisma.callLog.count({
        where: {
          organizationId,
          callerId: member.id,
          createdAt: { gte: thirtyDaysAgo },
          status: 'COMPLETED',
        },
      });

      // Calculate workload score based on active leads and recent activity
      const maxLeadsPerPerson = 50; // Configurable threshold
      const workloadScore = Math.min(100, (activeLeads / maxLeadsPerPerson) * 100);

      stats.push({
        userId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        role: member.role.name,
        activeLeads,
        completedLeads,
        conversionRate: totalLeads > 0 ? Math.round((completedLeads / totalLeads) * 1000) / 10 : 0,
        avgResponseTime: 30, // TODO: Calculate from actual data
        callsMade: callCounts._count || 0,
        callsAnswered: answeredCalls,
        lastActivityAt: member.lastLoginAt,
        workloadScore: Math.round(workloadScore),
        capacityUsed: Math.round(workloadScore),
      });
    }

    return stats;
  }

  /**
   * Get organizational hierarchy tree
   */
  async getOrganizationHierarchy(organizationId: string): Promise<TeamHierarchy[]> {
    // Get all users with their managers
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      include: {
        role: true,
      },
    });

    // Build hierarchy map
    const userMap = new Map<string, TeamHierarchy>();

    for (const user of users) {
      // Get quick stats for each user
      const leadCount = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: user.id, isActive: true } },
        },
      });

      const convertedCount = await prisma.lead.count({
        where: {
          organizationId,
          assignments: { some: { assignedToId: user.id, isActive: true } },
          isConverted: true,
        },
      });

      userMap.set(user.id, {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role.name,
        teamMembers: [],
        stats: {
          totalLeads: leadCount,
          conversionRate: leadCount > 0 ? Math.round((convertedCount / leadCount) * 100) : 0,
        },
      });
    }

    // Link team members to managers
    for (const user of users) {
      if (user.managerId && userMap.has(user.managerId)) {
        const manager = userMap.get(user.managerId)!;
        const member = userMap.get(user.id)!;
        manager.teamMembers.push(member);
      }
    }

    // Return top-level users (those without managers or whose manager doesn't exist)
    const topLevel: TeamHierarchy[] = [];
    for (const user of users) {
      if (!user.managerId || !userMap.has(user.managerId)) {
        const node = userMap.get(user.id);
        if (node) topLevel.push(node);
      }
    }

    return topLevel;
  }

  /**
   * Get team goals and KPIs
   */
  async getTeamGoals(managerId: string, organizationId: string) {
    // Get team member IDs based on user's role
    const memberIds = await this.getTeamMemberIds(managerId, organizationId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get this month's stats
    const leadsThisMonth = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        createdAt: { gte: startOfMonth },
      },
    });

    const conversionsThisMonth = await prisma.lead.count({
      where: {
        organizationId,
        assignments: { some: { assignedToId: { in: memberIds }, isActive: true } },
        isConverted: true,
        updatedAt: { gte: startOfMonth },
      },
    });

    const callsThisMonth = await prisma.callLog.count({
      where: {
        organizationId,
        callerId: { in: memberIds },
        createdAt: { gte: startOfMonth },
      },
    });

    // Define goals (these could be stored in DB and made configurable)
    return {
      goals: [
        {
          id: 'leads',
          name: 'New Leads',
          target: memberIds.length * 100, // 100 leads per person
          current: leadsThisMonth,
          unit: 'leads',
        },
        {
          id: 'conversions',
          name: 'Conversions',
          target: memberIds.length * 20, // 20 conversions per person
          current: conversionsThisMonth,
          unit: 'conversions',
        },
        {
          id: 'calls',
          name: 'Calls Made',
          target: memberIds.length * 500, // 500 calls per person
          current: callsThisMonth,
          unit: 'calls',
        },
        {
          id: 'response-time',
          name: 'Avg Response Time',
          target: 30, // 30 minutes target
          current: 45, // TODO: Calculate actual
          unit: 'minutes',
          lowerIsBetter: true,
        },
      ],
    };
  }

  /**
   * Get capacity planning data - shows team members' individual capacities
   * - Admin/Owner/Director: sees all team members in org
   * - Manager: sees their team members' capacities
   */
  async getCapacityPlanning(userId: string, organizationId: string) {
    // Get current user with role
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!currentUser) return [];

    const roleSlug = currentUser.role?.slug?.toLowerCase() || '';
    const roleName = currentUser.role?.name?.toLowerCase() || '';

    // Check if user is admin-level (can see all users)
    const adminRoles = ['admin', 'owner', 'super_admin', 'director'];
    const isAdmin = adminRoles.some(r => roleSlug.includes(r) || roleName.includes(r));

    // Helper to get all team members recursively
    const getAllTeamMemberIds = async (managerId: string): Promise<string[]> => {
      const allIds: string[] = [];
      const visited = new Set<string>();

      const collectIds = async (id: string) => {
        if (visited.has(id)) return;
        visited.add(id);

        const directReports = await prisma.user.findMany({
          where: { managerId: id, organizationId, isActive: true },
          select: { id: true },
        });

        for (const report of directReports) {
          allIds.push(report.id);
          await collectIds(report.id);
        }
      };

      await collectIds(managerId);
      return allIds;
    };

    // Get team member IDs to show capacity for
    let teamMemberIds: string[] = [];

    if (isAdmin) {
      // Admin sees all users in org (except themselves)
      const allUsers = await prisma.user.findMany({
        where: { organizationId, isActive: true, id: { not: userId } },
        select: { id: true },
      });
      teamMemberIds = allUsers.map(u => u.id);
    } else {
      // Manager sees their team members
      teamMemberIds = await getAllTeamMemberIds(userId);
    }

    if (teamMemberIds.length === 0) return [];

    // Get all team members with their details
    const teamMembers = await prisma.user.findMany({
      where: {
        id: { in: teamMemberIds },
        isActive: true,
      },
      include: { role: true },
    });

    const capacityData = [];

    for (const member of teamMembers) {
      // Get leads assigned to this member
      const activeLeads = await prisma.lead.count({
        where: {
          organizationId,
          assignments: {
            some: {
              assignedToId: member.id,
              isActive: true,
            },
          },
          isConverted: false,
        },
      });

      const maxCapacity = 50; // 50 leads per person max
      const optimalCapacity = 30; // 30 leads per person optimal

      capacityData.push({
        managerId: member.id,
        managerName: `${member.firstName} ${member.lastName}`,
        teamSize: 1,
        activeLeads,
        maxCapacity,
        optimalCapacity,
        capacityUsed: maxCapacity > 0 ? Math.round((activeLeads / maxCapacity) * 100) : 0,
        status: activeLeads > maxCapacity ? 'overloaded' :
                activeLeads > optimalCapacity ? 'high' :
                activeLeads < optimalCapacity * 0.5 ? 'underutilized' : 'optimal',
      });
    }

    // Sort by activeLeads descending
    capacityData.sort((a, b) => b.activeLeads - a.activeLeads);

    return capacityData;
  }

  /**
   * Reassign leads between team members
   */
  async reassignLeads(
    fromUserId: string,
    toUserId: string,
    leadIds: string[],
    organizationId: string
  ) {
    // Deactivate old assignments
    await prisma.leadAssignment.updateMany({
      where: {
        leadId: { in: leadIds },
        isActive: true,
      },
      data: {
        isActive: false,
        unassignedAt: new Date(),
      },
    });

    // Create new assignments
    const newAssignments = leadIds.map(leadId => ({
      leadId,
      assignedToId: toUserId,
      assignedById: fromUserId,
      isActive: true,
      assignedAt: new Date(),
    }));

    const result = await prisma.leadAssignment.createMany({
      data: newAssignments,
    });

    // Log the reassignment
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorType: 'user',
        actorId: fromUserId,
        action: 'LEAD_REASSIGNMENT',
        targetType: 'Lead',
        targetId: leadIds.join(','),
        changes: {
          fromUserId,
          toUserId,
          leadCount: leadIds.length,
        },
      },
    });

    return { count: result.count };
  }
}

export const teamManagementService = new TeamManagementService();
