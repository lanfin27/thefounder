/**
 * YouTube Industry Index - Data Update Script
 *
 * YouTube API를 사용하여 실제 채널 데이터를 수집하고 Supabase를 업데이트합니다.
 *
 * 사용법: npm run yt:update
 */

// 파일 최상단에서 환경변수 로드
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// 환경변수 확인
console.log('\n🔍 Environment Check:')
console.log('NEXT_PUBLIC_YT_SUPABASE_URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? '✓ Set' : '✗ Missing')
if (process.env.NEXT_PUBLIC_YT_SUPABASE_URL) {
  console.log('  -> URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL.substring(0, 40) + '...')
}
console.log('NEXT_PUBLIC_YT_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing')
if (process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY) {
  console.log('  -> Key length:', process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY.length)
}
console.log('YT_SUPABASE_SERVICE_KEY:', process.env.YT_SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing')
if (process.env.YT_SUPABASE_SERVICE_KEY) {
  console.log('  -> Key length:', process.env.YT_SUPABASE_SERVICE_KEY.length)
}
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? '✓ Set' : '✗ Missing')
if (process.env.YOUTUBE_API_KEY) {
  console.log('  -> Key length:', process.env.YOUTUBE_API_KEY.length)
}
console.log('')

// 환경변수가 없으면 종료
if (!process.env.NEXT_PUBLIC_YT_SUPABASE_URL || !process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Required Supabase environment variables are missing!\n')
  console.error('Please check your .env.local file contains:')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_URL')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_ANON_KEY')
  console.error('  - YT_SUPABASE_SERVICE_KEY\n')
  process.exit(1)
}

if (!process.env.YOUTUBE_API_KEY) {
  console.error('❌ Error: YOUTUBE_API_KEY is missing in .env.local\n')
  console.error('This script requires YouTube Data API v3 key to fetch channel data.\n')
  process.exit(1)
}

// URL 검증
const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL!
const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!

console.log('🔍 Validating Supabase URL format...')

// URL 형식 검증
if (!supabaseUrl.startsWith('https://')) {
  console.error('❌ Error: Supabase URL must start with https://')
  console.error('Current URL:', supabaseUrl)
  process.exit(1)
}

// .supabase.co로 끝나는지 확인
if (!supabaseUrl.endsWith('.supabase.co')) {
  console.error('❌ Error: Invalid Supabase URL format')
  console.error('Expected format: https://[project-id].supabase.co')
  console.error('Current URL:', supabaseUrl)
  process.exit(1)
}

console.log('✅ URL format is valid\n')

// 이제 나머지 import
import { createClient } from '@supabase/supabase-js'
import {
  getChannelStats,
  getRecentVideos,
  calculateViewsPerVideo,
  calculateEngagementRate,
  calculateUploadsPerWeek,
  filterShorts,
  estimateQuotaCost
} from '../src/lib/youtube-api'

// 연결 테스트 함수
async function testSupabaseConnection() {
  console.log('📡 Testing Supabase connection...')
  console.log('   URL:', supabaseUrl)

  try {
    const testResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    })

    console.log('   HTTP Status:', testResponse.status, testResponse.statusText)

    if (!testResponse.ok) {
      console.error('❌ Supabase connection test failed')
      const errorText = await testResponse.text()
      console.error('   Response body:', errorText)

      if (testResponse.status === 404) {
        console.error('\n💡 Tip: The Supabase project might not exist or the URL is incorrect')
      } else if (testResponse.status === 401 || testResponse.status === 403) {
        console.error('\n💡 Tip: The API key might be invalid or expired')
      }

      return false
    } else {
      console.log('✅ Supabase connection successful\n')
      return true
    }
  } catch (error: any) {
    console.error('❌ Failed to connect to Supabase:')
    console.error('   Error type:', error.constructor.name)
    console.error('   Error message:', error.message)

    if (error.cause) {
      console.error('   Cause:', error.cause)
    }

    console.error('\n💡 Possible issues:')
    console.error('   - Network connectivity problem')
    console.error('   - Firewall blocking the connection')
    console.error('   - Supabase service is down')
    console.error('   - Invalid project URL\n')

    return false
  }
}

// Supabase 클라이언트 직접 생성 (환경변수 로드 후)
const ytSupabaseAdmin = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
)

interface ChannelUpdate {
  channel_id: string
  name: string
  name_en: string | null
  subscribers: number
  total_views: number
  video_count: number
  views_per_video: number
  daily_change_rate: number
  weekly_change_rate: number
  monthly_change_rate: number
  engagement_rate: number
  shorts_ratio: number
  last_updated: string
}

async function updateChannelData(channelId: string): Promise<ChannelUpdate | null> {
  try {
    console.log(`[Update] Fetching data for channel: ${channelId}`)

    // 1. Get channel stats
    const stats = await getChannelStats(channelId)
    if (!stats) {
      console.warn(`[Update] Channel not found: ${channelId}`)
      return null
    }

    // 2. Get recent videos
    const videos = await getRecentVideos(channelId, 50)

    // 3. Calculate metrics
    const viewsPerVideo = calculateViewsPerVideo(stats.viewCount, stats.videoCount)

    const { shorts, regular } = filterShorts(videos)
    const shortsCount = shorts.length
    const regularCount = regular.length
    const shortsRatio = videos.length > 0 ? (shortsCount / videos.length) * 100 : 0

    let totalLikes = 0
    let totalComments = 0
    let totalViews = 0

    for (const video of videos) {
      totalLikes += video.likeCount
      totalComments += video.commentCount
      totalViews += video.viewCount
    }

    const avgLikesPerVideo = videos.length > 0 ? Math.round(totalLikes / videos.length) : 0
    const avgCommentsPerVideo = videos.length > 0 ? Math.round(totalComments / videos.length) : 0
    const engagementRate = calculateEngagementRate(totalLikes, totalComments, totalViews)
    const uploadsPerWeek = calculateUploadsPerWeek(videos)

    const lastUploadDate = videos.length > 0 ? videos[0].publishedAt : null

    return {
      channel_id: channelId,
      name: stats.title,
      name_en: stats.customUrl || null, // Use customUrl as English name for now
      subscribers: stats.subscriberCount,
      total_views: stats.viewCount,
      video_count: stats.videoCount,
      views_per_video: viewsPerVideo,
      daily_change_rate: 0, // TODO: Calculate based on historical data
      weekly_change_rate: 0, // TODO: Calculate based on historical data
      monthly_change_rate: 0, // TODO: Calculate based on historical data
      engagement_rate: parseFloat(engagementRate.toFixed(2)),
      shorts_ratio: parseFloat(shortsRatio.toFixed(2)),
      last_updated: new Date().toISOString()
    }
  } catch (error: any) {
    console.error(`[Update] Error updating channel ${channelId}:`, error.message)
    return null
  }
}

async function updateAllChannels(limit?: number) {
  console.log('[Update] Fetching all channels from database...')

  let query = ytSupabaseAdmin
    .from('youtube_channels')
    .select('channel_id, category_code')
    .order('category_code', { ascending: true })

  if (limit) {
    query = query.limit(limit)
  }

  const { data: channels, error } = await query

  if (error) {
    console.error('[Update] Error fetching channels:', error)
    throw error
  }

  if (!channels || channels.length === 0) {
    console.log('[Update] No channels found in database')
    console.log('[Update] Please run: npm run yt:import-data first')
    return
  }

  console.log(`[Update] Found ${channels.length} channels to update`)

  // Estimate quota cost
  const quotaCost = estimateQuotaCost({
    channelStats: channels.length,
    playlistItems: channels.length,
    videosList: channels.length
  })

  console.log(`[Update] Estimated quota cost: ${quotaCost} units`)
  console.log(`[Update] Daily limit: 10,000 units\n`)

  const updates: ChannelUpdate[] = []
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]

    console.log(`[Update] Progress: ${i + 1}/${channels.length}`)

    const update = await updateChannelData(channel.channel_id)

    if (update) {
      updates.push(update)
      successCount++
    } else {
      failCount++
    }

    // Rate limiting: wait 200ms between requests
    if (i < channels.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Save in batches of 10
    if (updates.length >= 10 || i === channels.length - 1) {
      if (updates.length > 0) {
        const { error: updateError } = await ytSupabaseAdmin
          .from('youtube_channels')
          .upsert(updates, { onConflict: 'channel_id' })

        if (updateError) {
          console.error('[Update] Error saving batch:', updateError)
        } else {
          console.log(`[Update] Saved batch of ${updates.length} channels`)
        }

        updates.length = 0 // Clear array
      }
    }
  }

  console.log(`\n[Update] Update completed:`)
  console.log(`  - Success: ${successCount}`)
  console.log(`  - Failed: ${failCount}`)

  return { successCount, failCount }
}

async function calculateCategoryMetrics() {
  console.log('\n[Update] Calculating category metrics...')

  const { data: categories, error } = await ytSupabaseAdmin
    .from('youtube_categories')
    .select('code')

  if (error || !categories) {
    console.error('[Update] Error fetching categories:', error)
    return
  }

  for (const category of categories) {
    const { data: channels } = await ytSupabaseAdmin
      .from('youtube_channels')
      .select('*')
      .eq('category_code', category.code)

    if (!channels || channels.length === 0) {
      console.log(`[Update] Category ${category.code}: No channels found`)
      continue
    }

    const totalViews = channels.reduce((sum, ch) => sum + (ch.total_views || 0), 0)
    const totalVideos = channels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)
    const avgViewsPerVideo = totalVideos > 0 ? totalViews / totalVideos : 0

    // Update only the avg_views_per_video field
    const update = {
      avg_views_per_video: Math.round(avgViewsPerVideo)
    }

    const { error: updateError } = await ytSupabaseAdmin
      .from('youtube_categories')
      .update(update)
      .eq('code', category.code)

    if (updateError) {
      console.error(`[Update] Error updating category ${category.code}:`, updateError)
    } else {
      console.log(`[Update] Updated category ${category.code}: ${channels.length} channels, ${Math.round(avgViewsPerVideo).toLocaleString()} avg views/video`)
    }
  }
}

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube Industry Index - Data Update')
  console.log('='.repeat(60))
  console.log('')

  // Check if limit is specified
  const limitArg = process.argv.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

  if (limit) {
    console.log(`[Update] Limit set to ${limit} channels\n`)
  }

  try {
    // 0. Test Supabase connection first
    const connectionOk = await testSupabaseConnection()
    if (!connectionOk) {
      console.error('❌ Cannot proceed without valid Supabase connection')
      process.exit(1)
    }

    // 1. Update all channels
    await updateAllChannels(limit)

    // 2. Calculate category metrics
    await calculateCategoryMetrics()

    console.log('\n' + '='.repeat(60))
    console.log('✓ Update completed successfully!')
    console.log('='.repeat(60))
    console.log('\nData is now synced with YouTube API')
    console.log('Visit: http://localhost:3000/youtube-industry')
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('✗ Update failed:')
    console.error('='.repeat(60))

    if (error.message) {
      console.error('Error message:', error.message)
    }
    if (error.details) {
      console.error('Error details:', error.details)
    }
    if (error.hint) {
      console.error('Hint:', error.hint)
    }

    console.error('\nFull error object:')
    console.error(error)

    if (error.message === 'YouTube API quota exceeded') {
      console.error('\n💡 YouTube API quota exceeded. Please try again tomorrow.')
      console.error('Daily quota: 10,000 units')
    }

    process.exit(1)
  }
}

main()
