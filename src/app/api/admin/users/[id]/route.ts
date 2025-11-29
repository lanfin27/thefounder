/**
 * Admin User Management API
 * 관리자 유저 삭제 API
 */

import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/userService'
import { validateAdminPassword } from '@/lib/constants/admin'

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
  try {
    // Check if current user is admin
    const isAdmin = await UserService.isAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Get current user to prevent self-deletion
    const currentUser = await UserService.getCurrentUser()
    if (currentUser?.id === params.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Get the target user
    const targetUser = await UserService.getUserById(params.id)
    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Parse request body for admin password
    const body = await request.json()
    const { adminPassword } = body as { adminPassword?: string }

    // Require admin password when deleting admin users
    if (targetUser.role === 'admin') {
      if (!adminPassword || !validateAdminPassword(adminPassword)) {
        return NextResponse.json(
          { error: 'Admin password required to delete admin users' },
          { status: 403 }
        )
      }
    }

    // Delete user
    await UserService.deleteUser(params.id)

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been deleted`
    })
  } catch (error) {
    console.error('[API] Failed to delete user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
