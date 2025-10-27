/**
 * Historical Data Generator
 *
 * This script uses YouTube Data API to generate historical data
 * for all active channels by analyzing their video upload history.
 *
 * Usage:
 *   npx tsx scripts/generate-historical-data.ts
 *
 * Requirements:
 *   - NEXT_PUBLIC_YT_SUPABASE_URL in .env.local
 *   - YT_SUPABASE_SERVICE_KEY in .env.local
 *   - YOUTUBE_DATA_API_KEY in .env.local
 *
 * API Quota Usage:
 *   - Approximately 50-100 quota units per channel
 *   - With 41 channels: ~2,000-4,000 quota units
 *   - Daily limit: 10,000 quota units
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
  id: string
  channel_id: string
  category_code: string
  name: string
  is_active: boolean
}

async function generateHistoricalData() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  YouTube Industry Historical Data Generator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log('⚠️  This script will use YouTube Data API quota')
  console.log('   Estimated: 50-100 quota units per channel')
  console.log('')

  try {
    // 1. Fetch active channels
    console.log('📊 Step 1: Fetching active channels...')
    const { data: channels, error: channelsError } = await supabase
      .from('youtube_channels')
      .select('id, channel_id, category_code, name, is_active')
      .eq('is_active', true)
      .neq('status', 'deleted')
      .order('category_code', { ascending: true })

    if (channelsError) throw channelsError
    if (!channels || channels.length === 0) {
      console.log('❌ No active channels found')
      return
    }

    console.log(`✅ Found ${channels.length} active channels\n`)

    // 2. Process each channel
    let successCount = 0
    let failCount = 0
    let totalRecords = 0
    const startTime = Date.now()

    for (let i = 0; i < channels.length; i++) {
      const channel = channels[i]

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`📺 [${i + 1}/${channels.length}] ${channel.name}`)
      console.log(`   Channel ID: ${channel.channel_id}`)
      console.log(`   Category: ${channel.category_code}`)
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

      try {
        // Generate history using YouTube API
        const dailyStats = await youtubeAPI.generateChannelHistory(
          channel.channel_id,
          500 // Max 500 videos (adjustable)
        )

        if (!dailyStats || dailyStats.length === 0) {
          console.log(`⚠️  No history data generated`)
          failCount++
          continue
        }

        console.log(`✅ Generated ${dailyStats.length} daily records`)

        // 3. Save to database
        const historyRecords = dailyStats.map(stat => ({
          channel_id: channel.channel_id,
          category_code: channel.category_code,
          date: stat.date,
          total_views: stat.total_views,
          video_count: stat.video_count,
          views_per_video: stat.views_per_video,
          subscribers: null, // Daily subscriber count not available from API
        }))

        // Batch insert (upsert)
        console.log(`💾 Saving to database...`)
        const { error: insertError } = await supabase
          .from('youtube_channel_history')
          .upsert(historyRecords, {
            onConflict: 'channel_id,date',
            ignoreDuplicates: false,
          })

        if (insertError) {
          console.error(`❌ Database error:`, insertError.message)
          failCount++
          continue
        }

        console.log(`✅ Saved ${historyRecords.length} records`)
        successCount++
        totalRecords += historyRecords.length

        // Rate limit protection (2 seconds between channels)
        if (i < channels.length - 1) {
          console.log(`⏳ Waiting 2 seconds before next channel...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      } catch (error: any) {
        console.error(`❌ Error processing channel:`, error.message)
        failCount++
      }
    }

    // 4. Final summary
    const elapsed = Math.round((Date.now() - startTime) / 1000)
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  Summary')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log(`✅ Successful: ${successCount} channels`)
    console.log(`❌ Failed: ${failCount} channels`)
    console.log(`📊 Total records: ${totalRecords.toLocaleString()}`)
    console.log(`📈 Average records per channel: ${Math.round(totalRecords / successCount)}`)
    console.log(`⏱️  Time elapsed: ${minutes}m ${seconds}s`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // 5. Category breakdown
    const categoryCounts = channels.reduce((acc: any, ch: Channel) => {
      acc[ch.category_code] = (acc[ch.category_code] || 0) + 1
      return acc
    }, {})

    console.log('\n📊 Channels by Category:')
    Object.entries(categoryCounts)
      .sort(([, a]: any, [, b]: any) => b - a)
      .forEach(([code, count]) => {
        console.log(`  ${code}: ${count} channels`)
      })

    console.log('\n✨ Historical data generation completed!')
    console.log(`   View charts at: http://localhost:3001/youtube-industry\n`)
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
console.log('')
generateHistoricalData()
  .then(() => {
    console.log('🎉 Script execution completed!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
