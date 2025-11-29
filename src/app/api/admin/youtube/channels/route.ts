/**
 * YouTube Admin Channels API
 * 채널 목록 조회
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

export async function GET() {
  const startTime = Date.now()

  try {
    console.log('[Channels API] 🚀 Starting request...')
    console.log('[Channels API] 📡 Supabase client:', {
      exists: !!supabase,
      type: typeof supabase,
      url: process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? 'configured' : 'missing'
    })

    // 삭제된 채널 제외하고 조회
    console.log('[Channels API] 📺 Querying youtube_channels table...')
    const { data: channels, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .neq('status', 'deleted')
      .order('subscribers', { ascending: false })

    const queryTime = Date.now() - startTime
    console.log(`[Channels API] 📊 Query completed in ${queryTime}ms`)
    console.log('[Channels API] 📊 Result:', {
      hasError: !!error,
      hasData: !!channels,
      dataLength: channels?.length || 0,
      dataType: Array.isArray(channels) ? 'array' : typeof channels
    })

    if (error) {
      console.error('[Channels API] ❌ Error fetching channels:', error)
      throw error
    }

    if (!channels || channels.length === 0) {
      console.warn('[Channels API] ⚠️ No channels found in database')
      return NextResponse.json(
        {
          success: false,
          error: 'No channels found. Please add channels at /admin/youtube-channels',
          data: []
        },
        { status: 404 }
      )
    }

    console.log(`[Channels API] ✅ Found ${channels.length} channels`)

    // 🔥 Response format standardized to match categories API
    return NextResponse.json(
      {
        success: true,
        data: channels,
        totalChannels: channels.length
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    )
  } catch (error) {
    const queryTime = Date.now() - startTime
    console.error(`[Channels API] ❌ Fatal error after ${queryTime}ms:`, error)
    console.error('[Channels API] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      type: error instanceof Error ? error.constructor.name : typeof error,
      stack: error instanceof Error ? error.stack : undefined
    })

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch channels',
        details: error instanceof Error ? error.message : 'Unknown error',
        data: []
      },
      { status: 500 }
    )
  }
}
