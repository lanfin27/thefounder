/**
 * Admin Users API
 * 관리자 유저 관리 API
 */

import { NextResponse } from 'next/server'
import { UserService } from '@/lib/services/userService'
import { validateAdminPassword } from '@/lib/constants/admin'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/admin/users
 * Get all users with optional statistics
 */
export async function GET(request: Request) {
  try {
    // Check if current user is admin
    const isAdmin = await UserService.isAdmin()
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Get users and stats
    const users = await UserService.getAllUsers()
    const stats = await UserService.getUserStats()

    return NextResponse.json({
      success: true,
      users,
      stats
    })
  } catch (error) {
    console.error('[API] Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
