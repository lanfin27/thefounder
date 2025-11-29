/**
 * Admin User Role Update API
 * 관리자 유저 역할 변경 API
 */

import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/userService'
import { validateAdminPassword } from '@/lib/constants/admin'
import type { UserRole } from '@/types/user'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * PATCH /api/admin/users/[id]/role
 * Update user role (requires admin password)
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json()
    const { role, adminPassword } = body as { role: UserRole; adminPassword: string }

    // Validate inputs
    if (!role || !['user', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be "user" or "admin"' },
        { status: 400 }
      )
    }

    // Validate admin password (required for role changes)
    if (!adminPassword || !validateAdminPassword(adminPassword)) {
      return NextResponse.json(
        { error: 'Invalid admin password' },
        { status: 403 }
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

    // Update user role
    await UserService.updateUserRole(params.id, role)

    // Get updated user
    const updatedUser = await UserService.getUserById(params.id)

    return NextResponse.json({
      success: true,
      message: `User role updated to ${role}`,
      user: updatedUser
    })
  } catch (error) {
    console.error('[API] Failed to update user role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}
