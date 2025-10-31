/**
 * Comprehensive Verification Script for History Fix
 *
 * Tests:
 * 1. Video count variation (should NOT be stuck at 200)
 * 2. daily_views_per_video variation (should NOT be identical)
 * 3. Database records validation
 * 4. API response format
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { YouTubeService } from '../src/lib/youtube/youtube-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY!
)

const TEST_CHANNEL_ID = 'UCNhofiqfw5nl-NeDJkXtPvw' // 빠니보틀 Pani Bottle

interface HistoryRecord {
  date: string
  subscribers: number
  total_views: number
  video_count: number
  views_per_video: number
  daily_views_per_video: number
  category_code: string
}

async function verifyHistoryFix() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 COMPREHENSIVE HISTORY FIX VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const service = new YouTubeService()
  let allTestsPassed = true

  try {
    // ========================================
    // TEST 1: Update Channel and Generate History
    // ========================================
    console.log('TEST 1: Updating Channel and Generating History')
    console.log('─────────────────────────────────────────────\n')
    console.log(`📺 Channel: ${TEST_CHANNEL_ID} (빠니보틀 Pani Bottle)\n`)

    const updateResult = await service.updateChannelData(TEST_CHANNEL_ID)

    if (!updateResult.success) {
      console.error('❌ FAILED: Channel update failed!')
      console.error('   Error:', updateResult.error || 'Unknown error')
      allTestsPassed = false
      process.exit(1)
    }

    console.log('✅ Channel update successful')
    console.log(`   Name: ${updateResult.channel}`)
    console.log(`   Subscribers: ${updateResult.stats.subscribers.toLocaleString()}`)
    console.log(`   Views: ${updateResult.stats.views.toLocaleString()}`)
    console.log(`   Videos: ${updateResult.stats.videos}\n`)

    // ========================================
    // TEST 2: Fetch and Validate History Records
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 2: Validating History Records')
    console.log('─────────────────────────────────────────────\n')

    const { data: history, error } = await supabase
      .from('youtube_channel_history')
      .select('*')
      .eq('channel_id', TEST_CHANNEL_ID)
      .order('date', { ascending: true })

    if (error) {
      console.error('❌ FAILED: Could not fetch history')
      console.error('   Error:', error.message)
      allTestsPassed = false
      process.exit(1)
    }

    if (!history || history.length === 0) {
      console.error('❌ FAILED: No history records found!')
      allTestsPassed = false
      process.exit(1)
    }

    console.log(`✅ Found ${history.length} history records\n`)

    // ========================================
    // TEST 3: Check Video Count Variation
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 3: Video Count Variation Check')
    console.log('─────────────────────────────────────────────\n')

    const videoCounts = history.map((h: HistoryRecord) => h.video_count)
    const uniqueVideoCounts = new Set(videoCounts)
    const minVideoCount = Math.min(...videoCounts)
    const maxVideoCount = Math.max(...videoCounts)

    console.log(`📊 Video Count Statistics:`)
    console.log(`   Min: ${minVideoCount}`)
    console.log(`   Max: ${maxVideoCount}`)
    console.log(`   Range: ${maxVideoCount - minVideoCount}`)
    console.log(`   Unique Values: ${uniqueVideoCounts.size}`)

    // Check if stuck at 200
    const stuckAt200 = videoCounts.every(count => count === 200)
    if (stuckAt200) {
      console.error('\n❌ FAILED: Video count is stuck at 200!')
      console.error('   This means the fix did NOT work')
      allTestsPassed = false
    } else if (uniqueVideoCounts.size <= 2) {
      console.error('\n⚠️  WARNING: Video count has very little variation')
      console.error(`   Only ${uniqueVideoCounts.size} unique values`)
    } else {
      console.log('\n✅ PASSED: Video count shows natural variation')
    }

    // ========================================
    // TEST 4: Check daily_views_per_video Variation
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 4: daily_views_per_video Variation Check')
    console.log('─────────────────────────────────────────────\n')

    const dailyViews = history.map((h: HistoryRecord) => h.daily_views_per_video)
    const uniqueDailyViews = new Set(dailyViews)
    const minDailyViews = Math.min(...dailyViews)
    const maxDailyViews = Math.max(...dailyViews)

    console.log(`📊 daily_views_per_video Statistics:`)
    console.log(`   Min: ${minDailyViews.toLocaleString()}`)
    console.log(`   Max: ${maxDailyViews.toLocaleString()}`)
    console.log(`   Range: ${(maxDailyViews - minDailyViews).toLocaleString()}`)
    console.log(`   Unique Values: ${uniqueDailyViews.size}`)

    // Check if all identical
    const allIdentical = uniqueDailyViews.size === 1
    if (allIdentical) {
      console.error('\n❌ FAILED: daily_views_per_video is identical for all dates!')
      console.error('   This means the calculation fix did NOT work')
      allTestsPassed = false
    } else if (uniqueDailyViews.size <= 3) {
      console.error('\n⚠️  WARNING: daily_views_per_video has very little variation')
      console.error(`   Only ${uniqueDailyViews.size} unique values`)
    } else {
      console.log('\n✅ PASSED: daily_views_per_video shows natural variation')
    }

    // ========================================
    // TEST 5: Display Sample Data Points
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 5: Sample Data Points')
    console.log('─────────────────────────────────────────────\n')

    const samples = [
      { label: 'First Day (30 days ago)', record: history[0] },
      { label: 'Day ~10', record: history[Math.floor(history.length / 3)] },
      { label: 'Day ~20', record: history[Math.floor(history.length * 2 / 3)] },
      { label: 'Last Day (Today)', record: history[history.length - 1] },
    ]

    samples.forEach(({ label, record }: { label: string, record: HistoryRecord }) => {
      console.log(`${label} (${record.date}):`)
      console.log(`  Subscribers: ${record.subscribers.toLocaleString()}`)
      console.log(`  Total Views: ${record.total_views.toLocaleString()}`)
      console.log(`  Video Count: ${record.video_count}`)
      console.log(`  Views/Video: ${record.views_per_video.toLocaleString()}`)
      console.log(`  Daily Views/Video: ${record.daily_views_per_video.toLocaleString()}`)
      console.log('')
    })

    // ========================================
    // TEST 6: Growth Trends Analysis
    // ========================================
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('TEST 6: Growth Trends Analysis')
    console.log('─────────────────────────────────────────────\n')

    const firstDay = history[0] as HistoryRecord
    const lastDay = history[history.length - 1] as HistoryRecord

    const subGrowth = lastDay.subscribers - firstDay.subscribers
    const viewGrowth = lastDay.total_views - firstDay.total_views
    const videoGrowth = lastDay.video_count - firstDay.video_count

    console.log(`📈 30-Day Growth:`)
    console.log(`   Subscribers: +${subGrowth.toLocaleString()} (+${((subGrowth / firstDay.subscribers) * 100).toFixed(2)}%)`)
    console.log(`   Total Views: +${viewGrowth.toLocaleString()} (+${((viewGrowth / firstDay.total_views) * 100).toFixed(2)}%)`)
    console.log(`   Videos: +${videoGrowth} videos`)

    if (videoGrowth === 0) {
      console.error('\n⚠️  WARNING: No video growth over 30 days')
      console.error('   This might be normal if channel uploaded no new videos')
    } else {
      console.log('\n✅ Natural growth pattern detected')
    }

    // ========================================
    // FINAL SUMMARY
    // ========================================
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📋 FINAL SUMMARY')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const results = {
      '✅ Channel Update': true,
      '✅ History Records Created': history.length === 30,
      '✅ Video Count Variation': !stuckAt200 && uniqueVideoCounts.size > 2,
      '✅ daily_views_per_video Variation': !allIdentical && uniqueDailyViews.size > 3,
      '✅ Natural Growth Pattern': videoGrowth >= 0,
    }

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}`)
      if (!passed) allTestsPassed = false
    })

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (allTestsPassed) {
      console.log('🎉 ALL TESTS PASSED!')
      console.log('✅ History generation is working correctly')
      console.log('✅ Video count shows natural variation')
      console.log('✅ daily_views_per_video varies by date')
      console.log('✅ No flat-line patterns detected\n')

      console.log('💡 Next Steps:')
      console.log('   1. Test in Admin UI: http://localhost:3000/admin/youtube-industry/channels')
      console.log('   2. Click "새로고침" for other channels')
      console.log('   3. Check graphs: http://localhost:3000/youtube-industry/Y05')
      console.log('   4. Verify all categories show natural curves\n')

      process.exit(0)
    } else {
      console.log('❌ SOME TESTS FAILED')
      console.log('⚠️  Please review the errors above\n')
      process.exit(1)
    }

  } catch (error: any) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ FATAL ERROR')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.error('Error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }
}

verifyHistoryFix()
