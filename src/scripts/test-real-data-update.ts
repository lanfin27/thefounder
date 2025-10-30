/**
 * Test Script: Update Channel with Real YouTube Data
 *
 * Tests the YouTubeDataService with real channel IDs we found.
 * Uses ONLY real YouTube API data - NO random generation.
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { YouTubeDataService } from '../services/youtube-data.service'

const TEST_CHANNELS = [
  {
    name: '빠니보틀 Pani Bottle',
    channelId: 'UCNhofiqfw5nl-NeDJkXtPvw',
    category: 'Y05'
  },
  // Uncomment to test other channels:
  // {
  //   name: '홍민영',
  //   channelId: 'UCgKdb5HA7O1cxwsWdciA0nA',
  //   category: 'Y05'
  // }
]

async function testRealDataUpdate() {
  console.log('🧪 Testing Real YouTube Data Update\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const dataService = new YouTubeDataService()

  for (const channel of TEST_CHANNELS) {
    console.log(`\n📺 Testing: ${channel.name}`)
    console.log(`   Channel ID: ${channel.channelId}`)
    console.log(`   Category: ${channel.category}\n`)

    try {
      // Test 1: Fetch channel stats
      console.log('Test 1: Fetching channel stats from YouTube API...')
      const stats = await dataService.fetchChannelStats(channel.channelId)

      if (!stats) {
        console.error('  ❌ Failed to fetch channel stats')
        continue
      }

      console.log('  ✅ Successfully fetched real data:')
      console.log(`     Name: ${stats.name}`)
      console.log(`     Subscribers: ${stats.subscribers.toLocaleString()}`)
      console.log(`     Total Views: ${stats.totalViews.toLocaleString()}`)
      console.log(`     Videos: ${stats.videoCount}`)

      // Test 2: Update channel in database with real data
      console.log('\nTest 2: Updating database with real YouTube data...')
      const updateSuccess = await dataService.updateChannelWithRealData(
        channel.channelId,
        channel.category
      )

      if (!updateSuccess) {
        console.error('  ❌ Failed to update database')
        continue
      }

      console.log('  ✅ Database updated successfully!')

      // Test 3: Fetch videos (first 50 only for testing)
      console.log('\nTest 3: Fetching real video data...')
      const videos = await dataService.fetchAllVideos(channel.channelId, 50)

      console.log(`  ✅ Fetched ${videos.length} real videos`)
      if (videos.length > 0) {
        console.log('\n  Sample videos:')
        videos.slice(0, 3).forEach((video, i) => {
          console.log(`    ${i + 1}. ${video.title}`)
          console.log(`       Views: ${video.viewCount.toLocaleString()}`)
          console.log(`       Published: ${video.publishedAt.split('T')[0]}`)
        })
      }

      console.log('\n✅ All tests passed for this channel!')

    } catch (error: any) {
      console.error(`\n❌ Test failed for ${channel.name}:`, error.message)
    }

    console.log('\n' + '━'.repeat(50))
  }

  console.log('\n✅ Testing complete!')
  console.log('\n💡 Next steps:')
  console.log('   1. Check database to verify data was saved correctly')
  console.log('   2. Check graphs to see if flat-line issue is resolved')
  console.log('   3. Test update-channel API endpoint')
}

testRealDataUpdate().catch(console.error)
