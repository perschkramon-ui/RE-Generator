import { useAuth } from '../context/AuthContext';
import { ROLE_PERMISSIONS, type Permission } from '../types';

/**
 * Returns whether the current user has a given permission.
 * Owners always have all permissions.
 */
export function usePermission(permission: Permission): boolean {
  const { isOwner, teamRole } = useAuth();
  if (isOwner) return true;
  if (!teamRole) return false;
  return ROLE_PERMISSIONS[teamRole].includes(permission);
}

/** Returns a can() checker for multiple permissions */
export function usePermissions() {
  const { isOwner, teamRole } = useAuth();

  function can(permission: Permission): boolean {
    if (isOwner) return true;
    if (!teamRole) return false;
    return ROLE_PERMISSIONS[teamRole].includes(permission);
  }

  return { can, isOwner, teamRole };
}
