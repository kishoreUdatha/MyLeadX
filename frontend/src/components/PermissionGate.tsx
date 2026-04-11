import { ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';

interface PermissionGateProps {
  children: ReactNode;
  /** Single permission or array of permissions */
  permission?: string | string[];
  /** If true, requires ALL permissions. If false (default), requires ANY permission */
  requireAll?: boolean;
  /** Module name for quick checks (e.g., "leads" checks for leads_view) */
  module?: string;
  /** Action to check for module (view, create, edit, delete) */
  action?: 'view' | 'create' | 'edit' | 'delete' | 'assign' | 'bulk';
  /** Fallback content when permission denied */
  fallback?: ReactNode;
  /** If true, shows fallback instead of hiding */
  showFallback?: boolean;
}

/**
 * Component to conditionally render children based on permissions
 *
 * Usage:
 *
 * // Check specific permission
 * <PermissionGate permission="leads_create">
 *   <CreateLeadButton />
 * </PermissionGate>
 *
 * // Check multiple permissions (any)
 * <PermissionGate permission={['leads_create', 'leads_import']}>
 *   <AddLeadOptions />
 * </PermissionGate>
 *
 * // Check multiple permissions (all required)
 * <PermissionGate permission={['leads_view', 'leads_edit']} requireAll>
 *   <EditLeadForm />
 * </PermissionGate>
 *
 * // Quick module + action check
 * <PermissionGate module="leads" action="delete">
 *   <DeleteButton />
 * </PermissionGate>
 *
 * // With fallback content
 * <PermissionGate permission="reports_view" fallback={<UpgradePrompt />} showFallback>
 *   <ReportsSection />
 * </PermissionGate>
 */
export function PermissionGate({
  children,
  permission,
  requireAll = false,
  module,
  action = 'view',
  fallback = null,
  showFallback = false,
}: PermissionGateProps) {
  const {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAssign,
    canBulk,
  } = usePermission();

  let hasAccess = false;

  // Check module + action
  if (module) {
    switch (action) {
      case 'view':
        hasAccess = canView(module);
        break;
      case 'create':
        hasAccess = canCreate(module);
        break;
      case 'edit':
        hasAccess = canEdit(module);
        break;
      case 'delete':
        hasAccess = canDelete(module);
        break;
      case 'assign':
        hasAccess = canAssign(module);
        break;
      case 'bulk':
        hasAccess = canBulk(module);
        break;
      default:
        hasAccess = canView(module);
    }
  }
  // Check specific permission(s)
  else if (permission) {
    if (Array.isArray(permission)) {
      hasAccess = requireAll
        ? hasAllPermissions(permission)
        : hasAnyPermission(permission);
    } else {
      hasAccess = hasPermission(permission);
    }
  } else {
    // No permission specified, allow access
    hasAccess = true;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (showFallback) {
    return <>{fallback}</>;
  }

  return null;
}

/**
 * Hook-based permission check for use outside JSX
 * Returns true/false for permission check
 */
export function useCanAccess(
  permission?: string | string[],
  options?: { requireAll?: boolean; module?: string; action?: 'view' | 'create' | 'edit' | 'delete' }
): boolean {
  const {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    canView,
    canCreate,
    canEdit,
    canDelete,
  } = usePermission();

  if (options?.module) {
    switch (options.action || 'view') {
      case 'view':
        return canView(options.module);
      case 'create':
        return canCreate(options.module);
      case 'edit':
        return canEdit(options.module);
      case 'delete':
        return canDelete(options.module);
      default:
        return canView(options.module);
    }
  }

  if (!permission) return true;

  if (Array.isArray(permission)) {
    return options?.requireAll
      ? hasAllPermissions(permission)
      : hasAnyPermission(permission);
  }

  return hasPermission(permission);
}

export default PermissionGate;
