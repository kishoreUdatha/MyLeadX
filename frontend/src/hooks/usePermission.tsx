import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useMemo, useCallback } from 'react';

/**
 * Permission hook for checking user permissions
 *
 * Usage:
 * const { hasPermission, canView, canCreate, canEdit, canDelete } = usePermission();
 *
 * // Check specific permission
 * if (hasPermission('leads_create')) { ... }
 *
 * // Check module permissions
 * if (canView('leads')) { ... }
 * if (canCreate('leads')) { ... }
 * if (canEdit('leads')) { ... }
 * if (canDelete('leads')) { ... }
 *
 * // Check multiple permissions (all required)
 * if (hasAllPermissions(['leads_view', 'leads_edit'])) { ... }
 *
 * // Check multiple permissions (any required)
 * if (hasAnyPermission(['leads_create', 'leads_import'])) { ... }
 */

export function usePermission() {
  const user = useSelector((state: RootState) => state.auth.user);
  const permissions = useMemo(() => user?.permissions || [], [user?.permissions]);
  const role = user?.role || '';

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Super admin / org_admin has all permissions
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return permissions.includes(permission);
    },
    [permissions, role]
  );

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return requiredPermissions.every((p) => permissions.includes(p));
    },
    [permissions, role]
  );

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback(
    (requiredPermissions: string[]): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return requiredPermissions.some((p) => permissions.includes(p));
    },
    [permissions, role]
  );

  /**
   * Check if user can view a module
   * Looks for: {module}_view or {module}_view_all
   */
  const canView = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return (
        permissions.includes(`${module}_view`) ||
        permissions.includes(`${module}_view_all`)
      );
    },
    [permissions, role]
  );

  /**
   * Check if user can create in a module
   * Looks for: {module}_create
   */
  const canCreate = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return permissions.includes(`${module}_create`);
    },
    [permissions, role]
  );

  /**
   * Check if user can edit in a module
   * Looks for: {module}_edit or {module}_update
   */
  const canEdit = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return (
        permissions.includes(`${module}_edit`) ||
        permissions.includes(`${module}_update`)
      );
    },
    [permissions, role]
  );

  /**
   * Check if user can delete in a module
   * Looks for: {module}_delete
   */
  const canDelete = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return permissions.includes(`${module}_delete`);
    },
    [permissions, role]
  );

  /**
   * Check if user can perform bulk operations in a module
   * Looks for: {module}_bulk_update, {module}_import, {module}_export
   */
  const canBulk = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return (
        permissions.includes(`${module}_bulk_update`) ||
        permissions.includes(`${module}_import`) ||
        permissions.includes(`${module}_export`)
      );
    },
    [permissions, role]
  );

  /**
   * Check if user can assign in a module
   * Looks for: {module}_assign
   */
  const canAssign = useCallback(
    (module: string): boolean => {
      if (role === 'super_admin' || role === 'org_admin') {
        return true;
      }
      return permissions.includes(`${module}_assign`);
    },
    [permissions, role]
  );

  /**
   * Check if user has admin role
   */
  const isAdmin = useMemo(() => {
    return role === 'super_admin' || role === 'org_admin' || role === 'admin';
  }, [role]);

  /**
   * Check if user has manager role or higher
   */
  const isManager = useMemo(() => {
    return isAdmin || role === 'manager';
  }, [isAdmin, role]);

  /**
   * Check if user has team lead role or higher
   */
  const isTeamLead = useMemo(() => {
    return isManager || role === 'team_lead' || role === 'team_leader';
  }, [isManager, role]);

  return {
    // Permission checks
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,

    // Module-level checks
    canView,
    canCreate,
    canEdit,
    canDelete,
    canBulk,
    canAssign,

    // Role checks
    isAdmin,
    isManager,
    isTeamLead,

    // Raw data
    permissions,
    role,
  };
}

/**
 * Higher-order component to protect routes/components based on permissions
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: string | string[]
) {
  return function PermissionProtectedComponent(props: P) {
    const { hasPermission, hasAnyPermission } = usePermission();

    const hasAccess = Array.isArray(requiredPermission)
      ? hasAnyPermission(requiredPermission)
      : hasPermission(requiredPermission);

    if (!hasAccess) {
      return null; // Or return a "No Access" component
    }

    return <WrappedComponent {...props} />;
  };
}

export default usePermission;
