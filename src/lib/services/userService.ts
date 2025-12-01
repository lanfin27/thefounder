import { createClient } from '@/lib/supabase/server'
import type { UserProfile, UserRole } from '@/types/user'

export class UserService {
  /**
   * Get all user profiles
   */
  static async getAllUsers(): Promise<UserProfile[]> {
    const supabase = await createClient()

    console.log('[UserService] Executing query: SELECT * FROM user_profiles ORDER BY created_at DESC')

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[UserService] Error fetching users:', error)
      console.error('[UserService] Error code:', error.code)
      console.error('[UserService] Error details:', error.details)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    console.log('[UserService] Query successful, rows returned:', data?.length || 0)

    return data || []
  }

  /**
   * Get single user by ID
   */
  static async getUserById(userId: string): Promise<UserProfile | null> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('[UserService] Error fetching user:', error)
      return null
    }

    return data
  }

  /**
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[UserService] Error getting authenticated user:', authError)
      return null
    }

    // Get user profile
    return await this.getUserById(user.id)
  }

  /**
   * Check if current user is admin
   */
  static async isAdmin(): Promise<boolean> {
    const user = await this.getCurrentUser()
    return user?.role === 'admin'
  }

  /**
   * Update user role
   */
  static async updateUserRole(userId: string, newRole: UserRole): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      console.error('[UserService] Error updating user role:', error)
      throw new Error(`Failed to update user role: ${error.message}`)
    }

    return true
  }

  /**
   * Update user name
   */
  static async updateUserName(userId: string, name: string): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_profiles')
      .update({ name })
      .eq('id', userId)

    if (error) {
      console.error('[UserService] Error updating user name:', error)
      throw new Error(`Failed to update user name: ${error.message}`)
    }

    return true
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('[UserService] Error deleting user:', error)
      throw new Error(`Failed to delete user: ${error.message}`)
    }

    return true
  }

  /**
   * Get user statistics
   */
  static async getUserStats(): Promise<{
    total: number
    admins: number
    users: number
  }> {
    const supabase = await createClient()

    // Get total count
    const { count: total, error: totalError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })

    if (totalError) {
      console.error('[UserService] Error getting total count:', totalError)
      throw new Error(`Failed to get user stats: ${totalError.message}`)
    }

    // Get admin count
    const { count: admins, error: adminError } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    if (adminError) {
      console.error('[UserService] Error getting admin count:', adminError)
      throw new Error(`Failed to get admin stats: ${adminError.message}`)
    }

    return {
      total: total || 0,
      admins: admins || 0,
      users: (total || 0) - (admins || 0)
    }
  }
}
