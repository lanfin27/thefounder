/**
 * Daily Channel History Collection Script
 *
 * This script collects current channel statistics from YouTube API
 * and saves them to the history table.
 *
 * Usage:
 *   npx tsx scripts/collect-channel-history.ts
 *
 * Cron Setup (daily at 3 AM):
 *   0 3 * * * cd /path/to/project && npx tsx scripts/collect-channel-history.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_YT_SUPABASE_URL in .env.local
 *   - YT_SUPABASE_SERVICE_KEY in .env.local
 *   - YOUTUBE_DATA_API_KEY in .env.local
 */

import { createClient } from '@supabase/supabase-js'
import { YouTubeAPI } from '../lib/youtube-api'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY
// Support both YOUTUBE_API_KEY (existing) and YOUTUBE_DATA_API_KEY (new)
const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

if (!youtubeApiKey) {
  console.error('❌ Missing YOUTUBE_API_KEY or YOUTUBE_DATA_API_KEY')
  console.error('   Please add YOUTUBE_API_KEY to .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const youtubeAPI = new YouTubeAPI(youtubeApiKey)

interface Channel {
  channel_id: string
  category_code: string
  name: string
}

async function collectTodayData() {
  console.log('═══════════════════════════════════════')
  console.log('  YouTube Daily Data Collector')
  console.log('═══════════════════════════════════════')
  console.log(`📅 Date: ${new Date().toISOString().split('T')[0]}\n`)

  try {
    // 1. Fetch active channels
    console.log('📊 Step 1: Fetching active channels...')
    const { data: channels, error } = await supabase
      .from('youtube_channels')
      .select('channel_id, category_code, name')
      .eq('is_active', true)
      .neq('status', 'deleted')

    if (error) throw error
    if (!channels || channels.length === 0) {
      console.log('❌ No active channels found')
      return
    }

    console.log(`✅ Found ${channels.length} active channels\n`)

    const today = new Date().toISOString().split('T')[0]
    const historyRecords = []

    // 2. Collect current stats from YouTube API
    console.log('📊 Step 2: Collecting current statistics...')
    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i]

      process.stdout.write(`\r[${i + 1}/${channels.length}] ${channel.name}...`)

      try {
        const stats = await youtubeAPI.getChannelStats(channel.channel_id)

        if (!stats) {
          console.log(`\n  ⚠️  Could not fetch stats for ${channel.name}`)
          continue
        }

        const viewsPerVideo = stats.videoCount > 0
          ? Math.round(stats.totalViews / stats.videoCount)
          : 0

        historyRecords.push({
          channel_id: channel.channel_id,
          category_code: channel.category_code,
          date: today,
          total_views: stats.totalViews,
          video_count: stats.videoCount,
          views_per_video: viewsPerVideo,
          subscribers: stats.subscribers,
        })

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error: any) {
        console.log(`\n  ❌ Error: ${error.message}`)
      }
    }

    console.log(`\n✅ Collected ${historyRecords.length} channel statistics\n`)

    // 3. Save to database
    if (historyRecords.length > 0) {
      console.log('📊 Step 3: Saving to database...')

      const { error: insertError } = await supabase
        .from('youtube_channel_history')
        .upsert(historyRecords, {
          onConflict: 'channel_id,date',
          ignoreDuplicates: false,
        })

      if (insertError) throw insertError

      console.log('✅ Data saved successfully!')

      // 4. Summary
      console.log('\n📊 Summary:')
      console.log('═══════════════════════════════════════')

      const categoryCounts = historyRecords.reduce((acc: any, record: any) => {
        acc[record.category_code] = (acc[record.category_code] || 0) + 1
        return acc
      }, {})

      console.log('By Category:')
      Object.entries(categoryCounts)
        .sort(([, a]: any, [, b]: any) => b - a)
        .forEach(([code, count]) => {
          console.log(`  ${code}: ${count} channels`)
        })

      console.log('')
      console.log(`Total channels: ${historyRecords.length}`)
      console.log(`Date: ${today}`)
      console.log(`Status: Success ✅`)

      // 5. Validation
      console.log('\n📊 Data Validation:')
      const { data: todayData, error: validationError } = await supabase
        .from('youtube_channel_history')
        .select('channel_id')
        .eq('date', today)

      if (validationError) {
        console.error('⚠️  Validation error:', validationError)
      } else {
        console.log(`✅ Confirmed ${todayData?.length || 0} records in database for ${today}`)
      }
    } else {
      console.log('⚠️  No data to save')
    }

    console.log('\n✨ Daily collection completed!')
    console.log('═══════════════════════════════════════\n')
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run script
collectTodayData()
  .then(() => {
    console.log('🎉 Script execution completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
