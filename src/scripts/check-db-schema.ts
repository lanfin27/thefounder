/**
 * Database Schema Verification Script
 *
 * Checks actual database schema to ensure our code matches reality
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY!
)

async function checkSchema() {
  console.log('🔍 Checking Database Schema...\n')

  // Check youtube_channels table
  console.log('━━━ youtube_channels table ━━━')
  const { data: channels, error: channelsError } = await supabase
    .from('youtube_channels')
    .select('*')
    .limit(1)

  if (channelsError) {
    console.error('❌ Error:', channelsError.message)
  } else if (channels && channels.length > 0) {
    console.log('✅ Columns found:', Object.keys(channels[0]).sort())
  } else {
    console.log('⚠️  Table exists but is empty')
  }

  console.log('\n━━━ youtube_channel_history table ━━━')
  const { data: history, error: historyError } = await supabase
    .from('youtube_channel_history')
    .select('*')
    .limit(1)

  if (historyError) {
    console.error('❌ Error:', historyError.message)
    console.log('⚠️  Table might not exist')
  } else if (history && history.length > 0) {
    console.log('✅ Columns found:', Object.keys(history[0]).sort())
  } else {
    console.log('⚠️  Table exists but is empty')
  }

  console.log('\n━━━ youtube_metrics_history table ━━━')
  const { data: metrics, error: metricsError } = await supabase
    .from('youtube_metrics_history')
    .select('*')
    .limit(1)

  if (metricsError) {
    console.error('❌ Error:', metricsError.message)
    console.log('⚠️  Table might not exist')
  } else if (metrics && metrics.length > 0) {
    console.log('✅ Columns found:', Object.keys(metrics[0]).sort())
  } else {
    console.log('⚠️  Table exists but is empty')
  }

  // Check specific channels
  console.log('\n━━━ Checking specific channels ━━━')
  const { data: specificChannels } = await supabase
    .from('youtube_channels')
    .select('name, channel_id, subscribers, total_views, video_count')
    .in('name', ['빠니보틀 Pani Bottle', '웨펀', '홍민영'])

  if (specificChannels) {
    console.log(`Found ${specificChannels.length} channels:`)
    specificChannels.forEach(ch => {
      console.log(`  - ${ch.name}: ${(ch.subscribers / 10000).toFixed(1)}만 subscribers, ${ch.video_count} videos`)
    })
  }

  console.log('\n✅ Schema check complete')
}

checkSchema().catch(console.error)
