export type UserRole = 'user' | 'admin'

export interface UserProfile {
  id: string
  email: string
  name: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface UpdateUserRequest {
  name?: string
  role?: UserRole
  adminPassword?: string  // Required when changing role
}

export interface DeleteUserRequest {
  adminPassword?: string  // Required when deleting admin users
}
