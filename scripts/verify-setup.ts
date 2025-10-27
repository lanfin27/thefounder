/**
 * Verification Script for YouTube Historical Data Setup
 * Checks if all components are ready for historical data generation
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables first
dotenv.config({ path: '.env.local' })

async function verifySetup() {
  // Import YouTubeAPI dynamically after dotenv is loaded
  const { YouTubeAPI } = await import('../lib/youtube-api.js')

  // Create Supabase client after env is loaded
  const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL!
  const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY!
  const ytSupabase = createClient(supabaseUrl, supabaseKey)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  YouTube Historical Data Setup Verification')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let allChecks = true

  // 1. Check environment variables
  console.log('📋 Step 1: Environment Variables')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  const ytSupabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
  const ytSupabaseKey = process.env.YT_SUPABASE_SERVICE_KEY
  const youtubeApiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY

  if (ytSupabaseUrl) {
    console.log('✅ NEXT_PUBLIC_YT_SUPABASE_URL: ' + ytSupabaseUrl.substring(0, 30) + '...')
  } else {
    console.log('❌ NEXT_PUBLIC_YT_SUPABASE_URL: Missing')
    allChecks = false
  }

  if (ytSupabaseKey) {
    console.log('✅ YT_SUPABASE_SERVICE_KEY: ' + ytSupabaseKey.substring(0, 20) + '...')
  } else {
    console.log('❌ YT_SUPABASE_SERVICE_KEY: Missing')
    allChecks = false
  }

  if (youtubeApiKey) {
    console.log('✅ YOUTUBE_API_KEY: ' + youtubeApiKey.substring(0, 20) + '...')
  } else {
    console.log('❌ YOUTUBE_API_KEY: Missing')
    allChecks = false
  }

  // 2. Check YouTube API connection
  console.log('\n📋 Step 2: YouTube API Connection')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const youtubeAPI = new YouTubeAPI(youtubeApiKey)
    console.log('✅ YouTube API initialized successfully')
  } catch (error: any) {
    console.log('❌ YouTube API initialization failed:', error.message)
    allChecks = false
  }

  // 3. Check database table
  console.log('\n📋 Step 3: Database Table')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const { data, error } = await ytSupabase
      .from('youtube_channel_history')
      .select('*')
      .limit(1)

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log('❌ Table youtube_channel_history does not exist')
        console.log('   Action: Run the SQL script in Supabase SQL Editor')
        console.log('   File: database/create-channel-history-table.sql')
        allChecks = false
      } else {
        console.log('❌ Database error:', error.message)
        allChecks = false
      }
    } else {
      console.log('✅ Table youtube_channel_history exists')
      console.log(`   Current records: ${data?.length || 0} (in this query)`)

      // Check total records
      const { count, error: countError } = await ytSupabase
        .from('youtube_channel_history')
        .select('*', { count: 'exact', head: true })

      if (!countError) {
        console.log(`   Total records in table: ${count || 0}`)
        if (count === 0) {
          console.log('   ⚠️  No historical data yet. Run: npm run yt:generate-historical')
        }
      }
    }
  } catch (error: any) {
    console.log('❌ Database connection failed:', error.message)
    allChecks = false
  }

  // 4. Check active channels
  console.log('\n📋 Step 4: Active Channels')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const { data: channels, error } = await ytSupabase
      .from('youtube_channels')
      .select('channel_id, name, category_code')
      .eq('is_active', true)
      .neq('status', 'deleted')

    if (error) {
      console.log('❌ Could not fetch channels:', error.message)
      allChecks = false
    } else {
      console.log(`✅ Found ${channels?.length || 0} active channels`)

      if (channels && channels.length > 0) {
        // Group by category
        const categoryCounts = channels.reduce((acc: any, ch: any) => {
          acc[ch.category_code] = (acc[ch.category_code] || 0) + 1
          return acc
        }, {})

        console.log('   By category:')
        Object.entries(categoryCounts)
          .sort(([, a]: any, [, b]: any) => b - a)
          .forEach(([code, count]) => {
            console.log(`     ${code}: ${count} channels`)
          })
      }
    }
  } catch (error: any) {
    console.log('❌ Error fetching channels:', error.message)
    allChecks = false
  }

  // Final summary
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Summary')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  if (allChecks) {
    console.log('✅ All checks passed!')
    console.log('\n📊 Next Steps:')
    console.log('1. If youtube_channel_history table has no data:')
    console.log('   npm run yt:generate-historical')
    console.log('   (This will take 10-20 minutes)')
    console.log('')
    console.log('2. Set up daily data collection (optional):')
    console.log('   npm run yt:collect-history')
    console.log('   (Add to cron for automation)')
    console.log('')
    console.log('3. View results:')
    console.log('   http://localhost:3000/youtube-industry')
  } else {
    console.log('❌ Some checks failed. Please review the issues above.')
    console.log('')
    console.log('📚 Documentation:')
    console.log('   docs/youtube-historical-data-guide.md')
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  process.exit(allChecks ? 0 : 1)
}

verifySetup()
