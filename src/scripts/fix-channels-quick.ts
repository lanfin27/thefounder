/**
 * Quick Fix for Channel Data Issues
 *
 * Fixes:
 * 1. Remove duplicate 빠니보틀 Pani Bottle
 * 2. Update 홍민영 with real data
 * 3. Add missing 웨펀 channel
 * 4. Generate 30-day history for all
 */

import dotenv from 'dotenv'
import { resolve } from 'path'
dotenv.config({ path: resolve(process.cwd(), '.env.local') })

import { YouTubeService } from '../services/youtube.service'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY!
)

const CHANNELS_TO_FIX = [
  {
    name: '빠니보틀 Pani Bottle',
    channelId: 'UCsR_Sf_2GhaJRLt7izFSzvQ',
    category: 'Y05'
  },
  {
    name: '웨펀',
    channelId: 'UCAphKSC1eIuZ0NsLaffYf0w',
    category: 'Y05'
  },
  {
    name: '홍민영',
    channelId: 'UCgKqK5HA7DicwsaWdclAdnA',
    category: 'Y05'
  }
]

async function fixChannels() {
  console.log('🔧 Fixing Channel Data Issues\n')
  const youtube = new YouTubeService()

  for (const channelSpec of CHANNELS_TO_FIX) {
    console.log(`━━━ Processing: ${channelSpec.name} ━━━`)

    try {
      // 1. Delete all existing entries for this channel
      console.log('  🗑️  Removing any existing entries...')
      const { error: deleteError } = await supabase
        .from('youtube_channels')
        .delete()
        .or(`name.eq.${channelSpec.name},channel_id.eq.${channelSpec.channelId}`)

      if (deleteError) {
        console.warn('  ⚠️  Delete warning:', deleteError.message)
      }

      // 2. Get fresh data from YouTube
      console.log('  🔄 Fetching from YouTube API...')
      const channelInfo = await youtube.getChannelInfo(channelSpec.channelId)
      console.log(`  ✅ Found: ${channelInfo.name}`)
      console.log(`     Subscribers: ${channelInfo.subscribers.toLocaleString()}`)
      console.log(`     Videos: ${channelInfo.video_count}`)
      console.log(`     Views: ${channelInfo.total_views.toLocaleString()}`)

      // 3. Insert clean channel data
      console.log('  💾 Saving to database...')
      const { data: newChannel, error: insertError } = await supabase
        .from('youtube_channels')
        .insert({
          channel_id: channelSpec.channelId,
          name: channelInfo.name,
          title: channelInfo.name,
          category_code: channelSpec.category,
          description: channelInfo.description,
          thumbnail_url: channelInfo.thumbnail_url,
          subscribers: channelInfo.subscribers,
          total_views: channelInfo.total_views,
          video_count: channelInfo.video_count,
          views_per_video: channelInfo.video_count > 0
            ? Math.round(channelInfo.total_views / channelInfo.video_count)
            : 0,
          daily_change_rate: 0,
          weekly_change_rate: 0,
          monthly_change_rate: 0,
          engagement_rate: 0,
          status: 'active',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (insertError) {
        console.error('  ❌ Insert error:', insertError.message)
        continue
      }

      console.log('  ✅ Channel saved')

      // 4. Delete old history
      console.log('  🗑️  Removing old history...')
      await supabase
        .from('youtube_channel_history')
        .delete()
        .eq('channel_id', channelSpec.channelId)

      // 5. Generate 30-day history
      console.log('  📊 Generating 30-day history...')
      const history = await youtube.generateSmartHistory(
        channelSpec.channelId,
        channelInfo,
        30
      )

      // 6. Save history
      const historyRecords = []
      let previousViews = 0

      for (let i = 0; i < history.length; i++) {
        const snapshot = history[i]
        const dailyViews = i === 0
          ? 0
          : Math.max(0, snapshot.totalViews - previousViews)

        historyRecords.push({
          channel_id: channelSpec.channelId,
          date: snapshot.date,
          subscribers: snapshot.estimatedSubscribers,
          total_views: snapshot.totalViews,
          video_count: snapshot.videoCount,
          views_per_video: snapshot.viewsPerVideo,
          daily_views_per_video: snapshot.videoCount > 0
            ? Math.round(dailyViews / snapshot.videoCount)
            : 0,
          category_code: channelSpec.category,
          created_at: new Date().toISOString()
        })

        previousViews = snapshot.totalViews
      }

      const { error: historyError } = await supabase
        .from('youtube_channel_history')
        .insert(historyRecords)

      if (historyError) {
        console.error('  ❌ History error:', historyError.message)
      } else {
        console.log(`  ✅ ${historyRecords.length} history records saved\n`)
      }

    } catch (error: any) {
      console.error(`  ❌ Failed to process ${channelSpec.name}:`, error.message, '\n')
    }
  }

  console.log('✅ All channels processed!')
}

fixChannels().catch(console.error)
