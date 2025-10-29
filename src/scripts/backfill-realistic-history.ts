/**
 * Backfill Realistic History Data
 *
 * Creates natural-looking historical data with:
 * - Gradual growth trends
 * - Weekend effects
 * - Random variations
 * - Realistic daily fluctuations
 */

import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

interface ChannelData {
  channel_id: string
  name: string
  subscribers: number
  total_views: number
  video_count: number
}

async function backfillRealisticHistory() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📊 [Backfill] Creating realistic history data')
  console.log(`⏰ [Backfill] ${new Date().toISOString()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  try {
    // Get target channels (빠니보틀 and 홍민영)
    const { data: channels, error: fetchError } = await ytSupabaseAdmin
      .from('youtube_channels')
      .select('channel_id, name, subscribers, total_views, video_count')
      .or('name.ilike.%빠니보틀%,name.ilike.%홍민영%')

    if (fetchError) {
      throw fetchError
    }

    if (!channels || channels.length === 0) {
      console.error('❌ No channels found!')
      return
    }

    console.log(`✅ Found ${channels.length} channels to backfill:`)
    channels.forEach(c => console.log(`   - ${c.name}`))
    console.log()

    // Process each channel
    for (const channel of channels) {
      await backfillChannelHistory(channel as ChannelData)
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [Backfill] Complete!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  } catch (error) {
    console.error('\n❌ [Backfill] Error:', error)
    throw error
  }
}

async function backfillChannelHistory(channel: ChannelData) {
  console.log(`\n🔄 [Backfill] Processing: ${channel.name}`)
  console.log(`   Current subscribers: ${channel.subscribers?.toLocaleString() || 0}`)
  console.log(`   Current total views: ${channel.total_views?.toLocaleString() || 0}`)
  console.log(`   Current video count: ${channel.video_count || 0}`)

  // Current values
  const currentSubscribers = channel.subscribers || 1000000
  const currentTotalViews = channel.total_views || 100000000
  const currentVideoCount = channel.video_count || 100

  // Generate data for the past 30 days (excluding today)
  const daysToBackfill = 30
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Estimate starting values (30 days ago)
  // Assumption: 3-5% monthly growth
  const monthlyGrowthRate = 0.03 + Math.random() * 0.02 // 3-5%
  const startSubscribers = Math.round(currentSubscribers / (1 + monthlyGrowthRate))
  const startTotalViews = Math.round(currentTotalViews / (1 + monthlyGrowthRate))

  console.log(`   Estimated 30 days ago:`)
  console.log(`   - Subscribers: ${startSubscribers.toLocaleString()}`)
  console.log(`   - Total views: ${startTotalViews.toLocaleString()}`)
  console.log()

  // Daily growth amounts
  const subscribersGrowthPerDay = (currentSubscribers - startSubscribers) / daysToBackfill
  const viewsGrowthPerDay = (currentTotalViews - startTotalViews) / daysToBackfill

  // Track previous day's total views for calculating daily increase
  let prevTotalViews = startTotalViews

  // Generate historical data
  const historyRecords = []

  for (let daysAgo = daysToBackfill; daysAgo >= 1; daysAgo--) {
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)

    // Progress through the month (0 to 1)
    const progress = (daysToBackfill - daysAgo) / daysToBackfill

    // Random variation: ±5%
    const randomVariation = 1 + (Math.random() - 0.5) * 0.1

    // Weekend effect: Saturday/Sunday get +10% views
    const dayOfWeek = date.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    const weekendBoost = isWeekend ? 1.1 : 1.0

    // Calculate values with growth + variation + weekend effect
    const subscribers = Math.round(
      startSubscribers + (subscribersGrowthPerDay * progress * daysToBackfill * randomVariation)
    )

    const totalViews = Math.round(
      startTotalViews + (viewsGrowthPerDay * progress * daysToBackfill * randomVariation * weekendBoost)
    )

    const avgViewsPerVideo = Math.round(totalViews / currentVideoCount)

    // Calculate daily views increase
    const dailyViewsIncrease = Math.max(0, totalViews - prevTotalViews)
    const dailyViewsPerVideo = Math.round(dailyViewsIncrease / currentVideoCount)

    prevTotalViews = totalViews

    historyRecords.push({
      channel_id: channel.channel_id,
      date: date.toISOString(),
      subscribers: subscribers,
      total_views: totalViews,
      video_count: currentVideoCount,
      avg_views_per_video: avgViewsPerVideo,
      daily_views_per_video: dailyViewsPerVideo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // Log progress every 5 days
    if ((daysToBackfill - daysAgo + 1) % 5 === 0 || daysAgo === 1) {
      console.log(
        `   ✅ ${date.toISOString().split('T')[0]}: ` +
        `${subscribers.toLocaleString()} subs, ` +
        `${dailyViewsPerVideo.toLocaleString()} daily views/video`
      )
    }
  }

  // Insert all records in batch
  console.log(`\n💾 [Backfill] Inserting ${historyRecords.length} records...`)

  const { error: insertError } = await ytSupabaseAdmin
    .from('youtube_channel_history')
    .insert(historyRecords)

  if (insertError) {
    console.error(`❌ [Backfill] Insert error:`, insertError)
    throw insertError
  }

  console.log(`✅ [Backfill] Completed backfill for ${channel.name}`)
  console.log(`   Created ${historyRecords.length} history records`)
}

// Run the script
backfillRealisticHistory()
  .then(() => {
    console.log('\n🎉 Backfill successful!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Backfill failed:', error)
    process.exit(1)
  })
