/**
 * Update Real YouTube Channels Script
 *
 * Updates the database with actual Korean YouTube channel IDs
 * Usage: npm run yt:update-real-channels
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Validate environment variables
console.log('🔍 Environment Check:')
console.log('NEXT_PUBLIC_YT_SUPABASE_URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? '✓ Set' : '✗ Missing')
console.log('NEXT_PUBLIC_YT_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY ? '✓ Set' : '✗ Missing')
console.log('YT_SUPABASE_SERVICE_KEY:', process.env.YT_SUPABASE_SERVICE_KEY ? '✓ Set' : '✗ Missing')
console.log('')

if (!process.env.NEXT_PUBLIC_YT_SUPABASE_URL || !process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY) {
  console.error('❌ Error: Required environment variables are missing')
  console.error('Please check your .env.local file\n')
  process.exit(1)
}

// Now import after environment variables are loaded
import { createClient } from '@supabase/supabase-js'
import { REAL_YOUTUBE_CHANNELS, getTotalChannelCount, isValidChannelId } from '../src/data/real-youtube-channels'

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube Industry Index - Update Real Channels')
  console.log('='.repeat(60))
  console.log('')

  const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL!
  const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  console.log(`📊 Total channels to process: ${getTotalChannelCount()}`)
  console.log('')

  let totalInserted = 0
  let totalUpdated = 0
  let totalFailed = 0
  let totalSkipped = 0

  for (const [categoryCode, channels] of Object.entries(REAL_YOUTUBE_CHANNELS)) {
    console.log(`\n📁 Category ${categoryCode}:`)

    for (const channelData of channels) {
      try {
        // Validate channel ID
        if (!isValidChannelId(channelData.channel_id)) {
          console.log(`  ⚠️  Invalid ID: ${channelData.name} (${channelData.channel_id})`)
          totalSkipped++
          continue
        }

        // Check if channel already exists by channel_id
        const { data: existing, error: selectError } = await supabase
          .from('youtube_channels')
          .select('id, channel_id')
          .eq('channel_id', channelData.channel_id)
          .maybeSingle()

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError
        }

        if (existing) {
          // Channel exists - update it
          const { error: updateError } = await supabase
            .from('youtube_channels')
            .update({
              name: channelData.name,
              category_code: categoryCode,
              subscribers: channelData.subscribers,
              last_updated: new Date().toISOString()
            })
            .eq('channel_id', channelData.channel_id)

          if (updateError) {
            throw updateError
          }

          console.log(`  ✅ Updated: ${channelData.name} → ${channelData.channel_id}`)
          totalUpdated++
        } else {
          // Channel doesn't exist - insert it
          const { error: insertError } = await supabase
            .from('youtube_channels')
            .insert({
              channel_id: channelData.channel_id,
              name: channelData.name,
              category_code: categoryCode,
              subscribers: channelData.subscribers,
              total_views: 0,
              video_count: 0,
              views_per_video: 0,
              daily_change_rate: 0,
              weekly_change_rate: 0,
              monthly_change_rate: 0,
              engagement_rate: 0,
              shorts_ratio: 0,
              last_updated: new Date().toISOString()
            })

          if (insertError) {
            throw insertError
          }

          console.log(`  ✅ Inserted: ${channelData.name} → ${channelData.channel_id}`)
          totalInserted++
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (error: any) {
        console.error(`  ❌ Failed: ${channelData.name}`, error.message)
        totalFailed++
      }
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✓ Channel Update Complete')
  console.log('='.repeat(60))
  console.log(`Inserted: ${totalInserted}`)
  console.log(`Updated: ${totalUpdated}`)
  console.log(`Failed: ${totalFailed}`)
  console.log(`Skipped: ${totalSkipped}`)
  console.log(`Total processed: ${totalInserted + totalUpdated + totalFailed + totalSkipped}`)
  console.log('')

  if (totalInserted + totalUpdated > 0) {
    console.log('Next steps:')
    console.log('  1. Run: npm run yt:smart-update')
    console.log('  2. Check quota: npm run yt:quota-check')
    console.log('  3. View dashboard: http://localhost:3000/youtube-industry')
  }

  console.log('')
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  console.error('')
  process.exit(1)
})
