/**
 * Admin User Management API
 * 관리자 유저 삭제 API
 */

import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/userService'
import { validateAdminPassword } from '@/lib/constants/admin'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * DELETE /api/admin/users/[id]
 * Delete user (requires admin password for admin users)
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[Delete User API] Request received');
  console.log('User ID to delete:', params.id);

  try {
    // Check if current user is admin
    const isAdmin = await UserService.isAdmin()
    console.log('[Delete User API] Is admin:', isAdmin);

    if (!isAdmin) {
      console.log('[Delete User API] Unauthorized - not admin');
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Get current user to prevent self-deletion
    const currentUser = await UserService.getCurrentUser()
    if (currentUser?.id === params.id) {
      console.log('[Delete User API] Cannot delete self');
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get the target user
    console.log('[Delete User API] Fetching target user...');
    const targetUser = await UserService.getUserById(params.id)

    if (!targetUser) {
      console.log('[Delete User API] User not found in user_profiles');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[Delete User API] Target user found:', targetUser.email);

    // Parse request body for admin password (handle empty body)
    let adminPassword: string | undefined
    try {
      const body = await request.json()
      adminPassword = body?.adminPassword
    } catch {
      // No body or invalid JSON - ok for non-admin users
      adminPassword = undefined
    }

    // Require admin password when deleting admin users
    if (targetUser.role === 'admin') {
      if (!adminPassword || !validateAdminPassword(adminPassword)) {
        console.log('[Delete User API] Admin password required but not provided/invalid');
        return NextResponse.json(
          { error: 'Admin password required to delete admin users' },
          { status: 403 }
        )
      }
    }

    // Step 1: Delete from user_profiles
    console.log('[Delete User API] Step 1: Deleting from user_profiles...');
    await UserService.deleteUser(params.id)
    console.log('[Delete User API] Successfully deleted from user_profiles');

    // Step 2: Try to delete from auth.users (requires Service Role)
    let authDeleteSuccess = false
    let authDeleteWarning = ''

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('[Delete User API] Step 2: Deleting from auth.users...');

      try {
        const supabaseAdmin = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(params.id)

        if (authError) {
          console.error('[Delete User API] Failed to delete from auth.users:', authError);
          authDeleteWarning = `프로필은 삭제되었으나 인증 데이터 삭제 실패: ${authError.message}`
        } else {
          console.log('[Delete User API] Successfully deleted from auth.users');
          authDeleteSuccess = true
        }
      } catch (err: any) {
        console.error('[Delete User API] Error deleting from auth.users:', err);
        authDeleteWarning = `프로필은 삭제되었으나 인증 데이터 삭제 중 오류: ${err.message}`
      }
    } else {
      console.warn('[Delete User API] No SUPABASE_SERVICE_ROLE_KEY - auth.users not deleted');
      authDeleteWarning = 'Service Role Key가 없어 auth.users에서 삭제되지 않았습니다'
    }

    console.log('[Delete User API] Deletion completed');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been deleted`,
      authDeleted: authDeleteSuccess,
      warning: authDeleteWarning || undefined
    })

  } catch (error: any) {
    console.error('[Delete User API] Failed to delete user:', error);
    console.error('[Delete User API] Error message:', error.message);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    )
  }
}
