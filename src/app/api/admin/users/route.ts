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
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 [Admin Users API] Fetching users...');

  try {
    // Check if current user is admin
    const isAdmin = await UserService.isAdmin()
    console.log('[Admin Users API] Is admin:', isAdmin);

    if (!isAdmin) {
      console.log('[Admin Users API] Unauthorized - not admin');
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Get users and stats
    console.log('[Admin Users API] Fetching all users from user_profiles...');
    const users = await UserService.getAllUsers()
    const stats = await UserService.getUserStats()

    console.log('[Admin Users API] Results:');
    console.log('  Total users:', users.length);
    console.log('  Stats:', stats);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({
      success: true,
      users,
      stats
    })
  } catch (error) {
    console.error('[Admin Users API] Failed to fetch users:', error)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
