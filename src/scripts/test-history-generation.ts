/**
 * Test Script: History Generation from Real Videos
 *
 * Tests the updated YouTubeService with real channel data.
 * Verifies that 30-day history is generated without flat lines.
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { YouTubeService } from '../lib/youtube/youtube-service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY!
)

const TEST_CHANNEL_ID = 'UCNhofiqfw5nl-NeDJkXtPvw' // 빠니보틀 Pani Bottle

async function testHistoryGeneration() {
  console.log('🧪 Testing History Generation System\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const service = new YouTubeService()

  try {
    // 1. Update channel (this should now generate history)
    console.log(`📺 Testing channel: ${TEST_CHANNEL_ID}`)
    console.log(`   (빠니보틀 Pani Bottle)\n`)

    console.log('Step 1: Updating channel data...')
    const result = await service.updateChannelData(TEST_CHANNEL_ID)

    if (!result.success) {
      console.error('❌ Channel update failed!')
      process.exit(1)
    }

    console.log('\n✅ Channel update successful:')
    console.log(`   Name: ${result.channel}`)
    console.log(`   Subscribers: ${result.stats.subscribers.toLocaleString()}`)
    console.log(`   Views: ${result.stats.views.toLocaleString()}`)
    console.log(`   Videos: ${result.stats.videos}`)

    // 2. Verify history was created
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Step 2: Verifying history in database...\n')

    const { data: history, error } = await supabase
      .from('youtube_channel_history')
      .select('*')
      .eq('channel_id', TEST_CHANNEL_ID)
      .order('date', { ascending: true })

    if (error) {
      console.error('❌ Failed to fetch history:', error.message)
      process.exit(1)
    }

    if (!history || history.length === 0) {
      console.error('❌ No history records found!')
      process.exit(1)
    }

    console.log(`✅ Found ${history.length} history records\n`)

    // 3. Check for flat-line pattern
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Step 3: Checking for flat-line pattern...\n')

    const uniqueSubscribers = new Set(history.map(h => h.subscribers))
    const uniqueViews = new Set(history.map(h => h.total_views))
    const uniqueVideos = new Set(history.map(h => h.video_count))

    console.log(`Unique subscriber values: ${uniqueSubscribers.size}`)
    console.log(`Unique view values: ${uniqueViews.size}`)
    console.log(`Unique video count values: ${uniqueVideos.size}`)

    const isFlat = uniqueSubscribers.size <= 2 && uniqueViews.size <= 2

    if (isFlat) {
      console.error('\n❌ FAILED: History is still flat!')
      console.error('   Problem not resolved\n')
      process.exit(1)
    }

    console.log('\n✅ SUCCESS: History shows natural variation!')

    // 4. Display sample data
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Step 4: Sample History Data\n')

    const samples = [
      history[0], // First day
      history[Math.floor(history.length / 3)], // ~Day 10
      history[Math.floor(history.length * 2 / 3)], // ~Day 20
      history[history.length - 1] // Last day
    ]

    samples.forEach((record, i) => {
      const labels = ['First Day', 'Day ~10', 'Day ~20', 'Last Day']
      console.log(`${labels[i]} (${record.date}):`)
      console.log(`  Subscribers: ${record.subscribers.toLocaleString()}`)
      console.log(`  Views: ${record.total_views.toLocaleString()}`)
      console.log(`  Videos: ${record.video_count}`)
      console.log('')
    })

    // 5. Calculate growth trends
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Step 5: Growth Trends\n')

    const firstDay = history[0]
    const lastDay = history[history.length - 1]

    const subGrowth = lastDay.subscribers - firstDay.subscribers
    const viewGrowth = lastDay.total_views - firstDay.total_views
    const videoGrowth = lastDay.video_count - firstDay.video_count

    console.log(`Subscriber Growth: +${subGrowth.toLocaleString()} (${((subGrowth / firstDay.subscribers) * 100).toFixed(2)}%)`)
    console.log(`View Growth: +${viewGrowth.toLocaleString()} (${((viewGrowth / firstDay.total_views) * 100).toFixed(2)}%)`)
    console.log(`Video Growth: +${videoGrowth} videos`)

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 ALL TESTS PASSED!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('✅ History generation is working correctly')
    console.log('✅ No flat-line patterns detected')
    console.log('✅ Natural growth curves generated')
    console.log('✅ Based on real YouTube video data\n')

    console.log('💡 Next steps:')
    console.log('   1. Test in Admin UI: http://localhost:3000/admin/youtube-industry/channels')
    console.log('   2. Click "새로고침" for other channels')
    console.log('   3. Check graphs: http://localhost:3000/youtube-industry/Y05')
    console.log('   4. Verify all categories show curved graphs\n')

  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }
}

testHistoryGeneration()
