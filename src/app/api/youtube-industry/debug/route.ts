/**
 * YouTube Industry Debug API
 * Comprehensive diagnostic endpoint
 */

import { NextResponse } from 'next/server'
import { ytSupabase } from '@/lib/youtube-supabase/client'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasYtUrl: !!process.env.NEXT_PUBLIC_YT_SUPABASE_URL,
      hasYtKey: !!process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY,
      ytUrl: process.env.NEXT_PUBLIC_YT_SUPABASE_URL?.substring(0, 30) + '...'
    },
    tests: {}
  }

  try {
    // Test 1: ytSupabase client exists
    diagnostics.tests.clientExists = {
      passed: !!ytSupabase,
      type: typeof ytSupabase
    }

    // Test 2: Query categories table
    const categoriesStart = Date.now()
    const { data: categories, error: categoriesError } = await ytSupabase
      .from('youtube_categories')
      .select('code, name, icon, description, avg_views_per_video')
      .order('code')
      .limit(5)

    diagnostics.tests.categoriesQuery = {
      passed: !categoriesError && !!categories,
      duration: Date.now() - categoriesStart,
      error: categoriesError?.message,
      dataType: Array.isArray(categories) ? 'array' : typeof categories,
      count: categories?.length || 0,
      sample: categories?.[0]
    }

    // Test 3: Query channels table
    const channelsStart = Date.now()
    const { data: channels, error: channelsError } = await ytSupabase
      .from('youtube_channels')
      .select('id, name, category_code, subscribers')
      .neq('status', 'deleted')
      .order('subscribers', { ascending: false })
      .limit(5)

    diagnostics.tests.channelsQuery = {
      passed: !channelsError && !!channels,
      duration: Date.now() - channelsStart,
      error: channelsError?.message,
      dataType: Array.isArray(channels) ? 'array' : typeof channels,
      count: channels?.length || 0,
      sample: channels?.[0]
    }

    // Test 4: Count records
    const { count: categoriesCount } = await ytSupabase
      .from('youtube_categories')
      .select('*', { count: 'exact', head: true })

    const { count: channelsCount } = await ytSupabase
      .from('youtube_channels')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'deleted')

    diagnostics.tests.recordCounts = {
      passed: true,
      categoriesTotal: categoriesCount,
      channelsTotal: channelsCount
    }

    diagnostics.overallStatus = Object.values(diagnostics.tests).every((t: any) => t.passed)
      ? 'HEALTHY'
      : 'UNHEALTHY'

  } catch (error) {
    diagnostics.fatalError = {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }
    diagnostics.overallStatus = 'FAILED'
  }

  return NextResponse.json(diagnostics, {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  })
}
