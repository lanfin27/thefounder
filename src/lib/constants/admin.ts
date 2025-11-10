/**
 * Admin password for sensitive operations
 * Required for:
 * - Changing user roles to/from admin
 * - Deleting admin users
 */
export const ADMIN_PASSWORD = 'rlawogjs15'

/**
 * Validate admin password
 */
export function validateAdminPassword(password: string): boolean {
  return password === ADMIN_PASSWORD
}
