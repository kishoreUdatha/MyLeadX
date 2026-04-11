import { prisma } from '../config/database';

// Industry-neutral permission definitions
export const PERMISSION_DEFINITIONS = {
  // RECORD Module - Generic records (leads, contacts, patients, students)
  RECORD: {
    CREATE: { name: 'Create Records', description: 'Create new records', category: 'Record Management' },
    READ: { name: 'View Records', description: 'View record details', category: 'Record Management' },
    UPDATE: { name: 'Update Records', description: 'Edit record information', category: 'Record Management' },
    DELETE: { name: 'Delete Records', description: 'Delete records permanently', category: 'Record Management' },
    ASSIGN: { name: 'Assign Records', description: 'Assign records to users', category: 'Record Management' },
    TRANSFER: { name: 'Transfer Records', description: 'Transfer records between users', category: 'Record Management' },
    EXPORT: { name: 'Export Records', description: 'Export record data', category: 'Record Management' },
    IMPORT: { name: 'Import Records', description: 'Import record data', category: 'Record Management' },
    ARCHIVE: { name: 'Archive Records', description: 'Archive inactive records', category: 'Record Management' },
    RESTORE: { name: 'Restore Records', description: 'Restore archived records', category: 'Record Management' },
  },

  // TRANSACTION Module - Payments, invoices, deals
  TRANSACTION: {
    CREATE: { name: 'Create Transactions', description: 'Create new payments/invoices', category: 'Financial' },
    READ: { name: 'View Transactions', description: 'View transaction details', category: 'Financial' },
    UPDATE: { name: 'Update Transactions', description: 'Edit transaction information', category: 'Financial' },
    DELETE: { name: 'Delete Transactions', description: 'Delete transactions', category: 'Financial' },
    APPROVE: { name: 'Approve Transactions', description: 'Approve pending transactions', category: 'Financial' },
    REJECT: { name: 'Reject Transactions', description: 'Reject pending transactions', category: 'Financial' },
    EXPORT: { name: 'Export Transactions', description: 'Export financial data', category: 'Financial' },
  },

  // ACTIVITY Module - Calls, emails, meetings, notes
  ACTIVITY: {
    CREATE: { name: 'Log Activities', description: 'Log calls, emails, meetings', category: 'Activity Tracking' },
    READ: { name: 'View Activities', description: 'View activity history', category: 'Activity Tracking' },
    UPDATE: { name: 'Update Activities', description: 'Edit activity records', category: 'Activity Tracking' },
    DELETE: { name: 'Delete Activities', description: 'Delete activity records', category: 'Activity Tracking' },
  },

  // TASK Module - Tasks, follow-ups, reminders
  TASK: {
    CREATE: { name: 'Create Tasks', description: 'Create tasks and follow-ups', category: 'Task Management' },
    READ: { name: 'View Tasks', description: 'View task details', category: 'Task Management' },
    UPDATE: { name: 'Update Tasks', description: 'Edit task information', category: 'Task Management' },
    DELETE: { name: 'Delete Tasks', description: 'Delete tasks', category: 'Task Management' },
    ASSIGN: { name: 'Assign Tasks', description: 'Assign tasks to team members', category: 'Task Management' },
  },

  // REPORT Module - Analytics, dashboards, exports
  REPORT: {
    READ: { name: 'View Reports', description: 'Access analytics and reports', category: 'Analytics' },
    CREATE: { name: 'Create Reports', description: 'Create custom reports', category: 'Analytics' },
    EXPORT: { name: 'Export Reports', description: 'Export report data', category: 'Analytics' },
  },

  // SETTINGS Module - Configuration
  SETTINGS: {
    READ: { name: 'View Settings', description: 'View system settings', category: 'Administration' },
    UPDATE: { name: 'Manage Settings', description: 'Modify system settings', category: 'Administration' },
  },

  // USER Module - User management
  USER: {
    CREATE: { name: 'Create Users', description: 'Add new users', category: 'User Management' },
    READ: { name: 'View Users', description: 'View user profiles', category: 'User Management' },
    UPDATE: { name: 'Update Users', description: 'Edit user information', category: 'User Management' },
    DELETE: { name: 'Delete Users', description: 'Remove users', category: 'User Management' },
  },

  // ROLE Module - Role management
  ROLE: {
    CREATE: { name: 'Create Roles', description: 'Create new roles', category: 'User Management' },
    READ: { name: 'View Roles', description: 'View role definitions', category: 'User Management' },
    UPDATE: { name: 'Update Roles', description: 'Edit role permissions', category: 'User Management' },
    DELETE: { name: 'Delete Roles', description: 'Remove roles', category: 'User Management' },
  },

  // WORKFLOW Module - Automation
  WORKFLOW: {
    CREATE: { name: 'Create Workflows', description: 'Create automation workflows', category: 'Automation' },
    READ: { name: 'View Workflows', description: 'View workflow definitions', category: 'Automation' },
    UPDATE: { name: 'Update Workflows', description: 'Edit workflows', category: 'Automation' },
    DELETE: { name: 'Delete Workflows', description: 'Remove workflows', category: 'Automation' },
  },

  // PIPELINE Module - Pipeline management
  PIPELINE: {
    CREATE: { name: 'Create Pipelines', description: 'Create new pipelines', category: 'Pipeline Management' },
    READ: { name: 'View Pipelines', description: 'View pipeline stages', category: 'Pipeline Management' },
    UPDATE: { name: 'Update Pipelines', description: 'Edit pipeline configuration', category: 'Pipeline Management' },
    DELETE: { name: 'Delete Pipelines', description: 'Remove pipelines', category: 'Pipeline Management' },
  },

  // FIELD Module - Custom field management
  FIELD: {
    CREATE: { name: 'Create Fields', description: 'Add custom fields', category: 'Customization' },
    READ: { name: 'View Fields', description: 'View field definitions', category: 'Customization' },
    UPDATE: { name: 'Update Fields', description: 'Edit custom fields', category: 'Customization' },
    DELETE: { name: 'Delete Fields', description: 'Remove custom fields', category: 'Customization' },
  },

  // IMPORT Module
  IMPORT: {
    CREATE: { name: 'Import Data', description: 'Import data from files', category: 'Data Management' },
    READ: { name: 'View Imports', description: 'View import history', category: 'Data Management' },
  },

  // EXPORT Module
  EXPORT: {
    CREATE: { name: 'Export Data', description: 'Export data to files', category: 'Data Management' },
    READ: { name: 'View Exports', description: 'View export history', category: 'Data Management' },
  },

  // AUDIT Module
  AUDIT: {
    READ: { name: 'View Audit Logs', description: 'Access audit trail', category: 'Security' },
    EXPORT: { name: 'Export Audit Logs', description: 'Export audit data', category: 'Security' },
  },

  // BILLING Module
  BILLING: {
    READ: { name: 'View Billing', description: 'View billing information', category: 'Billing' },
    UPDATE: { name: 'Manage Billing', description: 'Update billing settings', category: 'Billing' },
  },
};

// Default role templates with scope-based permissions
export const DEFAULT_ROLE_PERMISSIONS = {
  super_admin: {
    // Super admin has ALL scope for everything
    permissions: Object.keys(PERMISSION_DEFINITIONS).flatMap(module =>
      Object.keys((PERMISSION_DEFINITIONS as any)[module]).map(action => ({
        code: `${module}_${action}`,
        scope: 'ALL' as const,
      }))
    ),
  },
  tenant_admin: {
    // Tenant admin has TENANT scope for everything
    permissions: Object.keys(PERMISSION_DEFINITIONS).flatMap(module =>
      Object.keys((PERMISSION_DEFINITIONS as any)[module]).map(action => ({
        code: `${module}_${action}`,
        scope: 'TENANT' as const,
      }))
    ),
  },
  manager: {
    // Manager has TEAM scope for operational modules
    permissions: [
      { code: 'RECORD_CREATE', scope: 'TEAM' as const },
      { code: 'RECORD_READ', scope: 'TEAM' as const },
      { code: 'RECORD_UPDATE', scope: 'TEAM' as const },
      { code: 'RECORD_ASSIGN', scope: 'TEAM' as const },
      { code: 'RECORD_TRANSFER', scope: 'TEAM' as const },
      { code: 'RECORD_EXPORT', scope: 'TEAM' as const },
      { code: 'TRANSACTION_CREATE', scope: 'TEAM' as const },
      { code: 'TRANSACTION_READ', scope: 'TEAM' as const },
      { code: 'TRANSACTION_UPDATE', scope: 'TEAM' as const },
      { code: 'TRANSACTION_APPROVE', scope: 'TEAM' as const },
      { code: 'ACTIVITY_CREATE', scope: 'TEAM' as const },
      { code: 'ACTIVITY_READ', scope: 'TEAM' as const },
      { code: 'ACTIVITY_UPDATE', scope: 'TEAM' as const },
      { code: 'TASK_CREATE', scope: 'TEAM' as const },
      { code: 'TASK_READ', scope: 'TEAM' as const },
      { code: 'TASK_UPDATE', scope: 'TEAM' as const },
      { code: 'TASK_ASSIGN', scope: 'TEAM' as const },
      { code: 'REPORT_READ', scope: 'TEAM' as const },
      { code: 'REPORT_EXPORT', scope: 'TEAM' as const },
      { code: 'USER_READ', scope: 'TEAM' as const },
      { code: 'PIPELINE_READ', scope: 'TENANT' as const },
    ],
  },
  agent: {
    // Agent has OWN scope for their records
    permissions: [
      { code: 'RECORD_CREATE', scope: 'OWN' as const },
      { code: 'RECORD_READ', scope: 'OWN' as const },
      { code: 'RECORD_UPDATE', scope: 'OWN' as const },
      { code: 'TRANSACTION_CREATE', scope: 'OWN' as const },
      { code: 'TRANSACTION_READ', scope: 'OWN' as const },
      { code: 'ACTIVITY_CREATE', scope: 'OWN' as const },
      { code: 'ACTIVITY_READ', scope: 'OWN' as const },
      { code: 'ACTIVITY_UPDATE', scope: 'OWN' as const },
      { code: 'TASK_CREATE', scope: 'OWN' as const },
      { code: 'TASK_READ', scope: 'OWN' as const },
      { code: 'TASK_UPDATE', scope: 'OWN' as const },
      { code: 'REPORT_READ', scope: 'OWN' as const },
      { code: 'PIPELINE_READ', scope: 'TENANT' as const },
    ],
  },
  finance: {
    // Finance role focused on transactions
    permissions: [
      { code: 'RECORD_READ', scope: 'TENANT' as const },
      { code: 'TRANSACTION_CREATE', scope: 'TENANT' as const },
      { code: 'TRANSACTION_READ', scope: 'TENANT' as const },
      { code: 'TRANSACTION_UPDATE', scope: 'TENANT' as const },
      { code: 'TRANSACTION_APPROVE', scope: 'TENANT' as const },
      { code: 'TRANSACTION_REJECT', scope: 'TENANT' as const },
      { code: 'TRANSACTION_EXPORT', scope: 'TENANT' as const },
      { code: 'REPORT_READ', scope: 'TENANT' as const },
      { code: 'REPORT_EXPORT', scope: 'TENANT' as const },
      { code: 'BILLING_READ', scope: 'TENANT' as const },
    ],
  },
  viewer: {
    // Read-only access
    permissions: [
      { code: 'RECORD_READ', scope: 'TENANT' as const },
      { code: 'TRANSACTION_READ', scope: 'TENANT' as const },
      { code: 'ACTIVITY_READ', scope: 'TENANT' as const },
      { code: 'TASK_READ', scope: 'TENANT' as const },
      { code: 'REPORT_READ', scope: 'TENANT' as const },
      { code: 'PIPELINE_READ', scope: 'TENANT' as const },
    ],
  },
};

/**
 * Seed all industry-neutral permissions
 */
export const seedPermissions = async () => {
  console.log('Seeding permissions...');

  const permissionsToCreate: Array<{
    code: string;
    module: string;
    action: string;
    name: string;
    description: string;
    category: string;
  }> = [];

  // Build permission list
  for (const [module, actions] of Object.entries(PERMISSION_DEFINITIONS)) {
    for (const [action, meta] of Object.entries(actions)) {
      permissionsToCreate.push({
        code: `${module}_${action}`,
        module,
        action,
        name: meta.name,
        description: meta.description,
        category: meta.category,
      });
    }
  }

  // Upsert all permissions
  for (const perm of permissionsToCreate) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        description: perm.description,
        category: perm.category,
      },
      create: {
        code: perm.code,
        module: perm.module as any,
        action: perm.action as any,
        name: perm.name,
        description: perm.description,
        category: perm.category,
        isSystem: true,
      },
    });
  }

  console.log(`Seeded ${permissionsToCreate.length} permissions`);
  return permissionsToCreate.length;
};

/**
 * Get all permissions
 */
export const getAllPermissions = async () => {
  return prisma.permission.findMany({
    orderBy: [{ category: 'asc' }, { module: 'asc' }, { action: 'asc' }],
  });
};

/**
 * Get permissions by module
 */
export const getPermissionsByModule = async (module: string) => {
  return prisma.permission.findMany({
    where: { module: module as any },
    orderBy: { action: 'asc' },
  });
};

/**
 * Get permissions by category
 */
export const getPermissionsByCategory = async (category: string) => {
  return prisma.permission.findMany({
    where: { category },
    orderBy: [{ module: 'asc' }, { action: 'asc' }],
  });
};

/**
 * Assign permissions to a role
 */
export const assignPermissionsToRole = async (
  roleId: string,
  permissions: Array<{ permissionCode: string; scope: 'OWN' | 'TEAM' | 'TENANT' | 'ALL' }>
) => {
  // Get permission IDs
  const permissionRecords = await prisma.permission.findMany({
    where: { code: { in: permissions.map(p => p.permissionCode) } },
  });

  const permissionMap = new Map(permissionRecords.map(p => [p.code, p.id]));

  // Create role permissions
  const rolePermissions = permissions
    .filter(p => permissionMap.has(p.permissionCode))
    .map(p => ({
      roleId,
      permissionId: permissionMap.get(p.permissionCode)!,
      scope: p.scope,
    }));

  // Delete existing and create new
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.rolePermission.createMany({ data: rolePermissions });

  return rolePermissions.length;
};

/**
 * Get role permissions with details
 */
export const getRolePermissions = async (roleId: string) => {
  return prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
    orderBy: { permission: { category: 'asc' } },
  });
};

/**
 * Check if user has permission with scope
 */
export const checkPermission = async (
  userId: string,
  permissionCode: string,
  requiredScope: 'OWN' | 'TEAM' | 'TENANT' | 'ALL' = 'OWN'
): Promise<boolean> => {
  const scopeHierarchy = { OWN: 0, TEAM: 1, TENANT: 2, ALL: 3 };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
            where: { permission: { code: permissionCode } },
          },
        },
      },
    },
  });

  if (!user || !user.role.rolePermissions.length) {
    return false;
  }

  const userPermission = user.role.rolePermissions[0];
  const userScopeLevel = scopeHierarchy[userPermission.scope];
  const requiredScopeLevel = scopeHierarchy[requiredScope];

  return userScopeLevel >= requiredScopeLevel;
};

/**
 * Setup default role permissions for a new organization
 */
export const setupDefaultRolePermissions = async (organizationId: string) => {
  // Get all permissions
  const permissions = await prisma.permission.findMany();
  const permissionMap = new Map(permissions.map(p => [p.code, p.id]));

  // Get organization roles
  const roles = await prisma.role.findMany({
    where: { organizationId },
  });

  for (const role of roles) {
    const roleSlug = role.slug.toLowerCase();
    const defaultPerms = (DEFAULT_ROLE_PERMISSIONS as any)[roleSlug];

    if (defaultPerms) {
      const rolePermissions = defaultPerms.permissions
        .filter((p: any) => permissionMap.has(p.code))
        .map((p: any) => ({
          roleId: role.id,
          permissionId: permissionMap.get(p.code)!,
          scope: p.scope,
        }));

      // Clear existing and create new
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (rolePermissions.length > 0) {
        await prisma.rolePermission.createMany({ data: rolePermissions });
      }
    }
  }
};

export default {
  seedPermissions,
  getAllPermissions,
  getPermissionsByModule,
  getPermissionsByCategory,
  assignPermissionsToRole,
  getRolePermissions,
  checkPermission,
  setupDefaultRolePermissions,
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLE_PERMISSIONS,
};
