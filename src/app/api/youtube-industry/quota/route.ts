/**
 * Quota Monitoring API
 *
 * Returns current YouTube API quota usage and recommendations
 */

import { NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const USABLE_QUOTA = 9000 // 10,000 - 1,000 safety buffer

interface QuotaRecommendation {
  level: 'safe' | 'warning' | 'critical'
  message: string
}

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]

    // Get today's quota usage
    const { data, error } = await ytSupabase
      .from('quota_usage')
      .select('*')
      .eq('date', today)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[Quota API] Error fetching quota:', error)
      return NextResponse.json(
        { error: 'Failed to fetch quota data' },
        { status: 500 }
      )
    }

    const used = data?.used || 0
    const remaining = USABLE_QUOTA - used
    const percentage = (used / USABLE_QUOTA) * 100
    const operations = (data?.operations as any[]) || []

    // Generate recommendations
    const recommendations = getRecommendations(percentage)

    // Calculate operation breakdown
    const operationBreakdown = getOperationBreakdown(operations)

    const quotaInfo = {
      date: today,
      used,
      remaining,
      limit: USABLE_QUOTA,
      daily_limit: 10000,
      percentage: parseFloat(percentage.toFixed(2)),
      status: getStatus(percentage),
      recommendations,
      operations: {
        total_count: operations.length,
        breakdown: operationBreakdown,
        recent: operations.slice(-5) // Last 5 operations
      },
      last_updated: data?.updated_at || null
    }

    return NextResponse.json(quotaInfo)
  } catch (error: any) {
    console.error('[Quota API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatus(percentage: number): 'safe' | 'warning' | 'critical' {
  if (percentage < 60) return 'safe'
  if (percentage < 80) return 'warning'
  return 'critical'
}

function getRecommendations(percentage: number): QuotaRecommendation[] {
  const recommendations: QuotaRecommendation[] = []

  if (percentage >= 90) {
    recommendations.push({
      level: 'critical',
      message: 'Quota usage >90%. All updates should be stopped immediately to avoid hitting daily limit.'
    })
  } else if (percentage >= 80) {
    recommendations.push({
      level: 'critical',
      message: 'Quota usage >80%. Only emergency updates recommended. Stop all scheduled updates.'
    })
  } else if (percentage >= 60) {
    recommendations.push({
      level: 'warning',
      message: 'Quota usage >60%. Limit updates to high-priority channels only.'
    })
  } else if (percentage >= 40) {
    recommendations.push({
      level: 'warning',
      message: 'Moderate quota usage. Continue with normal priority-based updates.'
    })
  } else {
    recommendations.push({
      level: 'safe',
      message: 'Quota usage is low. Can safely perform additional updates for trending channels if needed.'
    })
  }

  // Add time-based recommendation
  const hour = new Date().getUTCHours()
  if (hour < 6 && percentage < 50) {
    recommendations.push({
      level: 'safe',
      message: 'Early morning (UTC). Good time to perform bulk updates if needed.'
    })
  }

  return recommendations
}

function getOperationBreakdown(operations: any[]): Record<string, number> {
  const breakdown: Record<string, number> = {}

  for (const op of operations) {
    const type = op.type || 'unknown'
    breakdown[type] = (breakdown[type] || 0) + (op.cost || 0)
  }

  return breakdown
}

/**
 * POST endpoint to manually reset quota (admin only)
 */
export async function POST(request: Request) {
  try {
    // Verify admin token
    const authHeader = request.headers.get('authorization')
    const expectedAuth = `Bearer ${process.env.ADMIN_TOKEN}`

    if (authHeader !== expectedAuth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date().toISOString().split('T')[0]

    // Reset today's quota
    const { error } = await ytSupabase
      .from('quota_usage')
      .update({
        used: 0,
        operations: [],
        updated_at: new Date().toISOString()
      })
      .eq('date', today)

    if (error) {
      console.error('[Quota API] Reset failed:', error)
      return NextResponse.json(
        { error: 'Failed to reset quota' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Quota reset successfully',
      date: today
    })
  } catch (error: any) {
    console.error('[Quota API] Reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
