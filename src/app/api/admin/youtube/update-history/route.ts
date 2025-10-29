/**
 * Manual YouTube History Update API
 *
 * Updates specific channels or all channels and creates history records
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQuotaManager } from '@/lib/youtube-api/quota-manager'
import { BatchProcessor } from '@/lib/youtube-api/batch-processor'
import { ytSupabaseAdmin } from '@/lib/youtube-supabase/client'

export async function POST(request: NextRequest) {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔄 [Manual History Update] Starting')
  console.log(`⏰ [Manual History Update] ${new Date().toISOString()}`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    // Parse request body
    const body = await request.json().catch(() => ({}))
    const { channelIds, channelNames } = body

    let targetChannelIds: string[] = []

    // Get channel IDs to update
    if (channelIds && Array.isArray(channelIds)) {
      // Use provided channel IDs
      targetChannelIds = channelIds
      console.log(`[Manual Update] Updating ${targetChannelIds.length} specified channels`)
    } else if (channelNames && Array.isArray(channelNames)) {
      // Look up channels by name
      console.log(`[Manual Update] Looking up channels by name...`)
      const { data: channels } = await ytSupabaseAdmin
        .from('youtube_channels')
        .select('channel_id, name')
        .in('name', channelNames)

      if (channels && channels.length > 0) {
        targetChannelIds = channels.map(ch => ch.channel_id)
        console.log(`[Manual Update] Found ${channels.length} channels:`)
        channels.forEach(ch => console.log(`   - ${ch.name}`))
      } else {
        throw new Error('No channels found with the provided names')
      }
    } else {
      // Update all active channels
      console.log(`[Manual Update] Fetching all active channels...`)
      const { data: channels } = await ytSupabaseAdmin
        .from('youtube_channels')
        .select('channel_id, name')
        .eq('is_active', true)
        .neq('status', 'deleted')

      if (channels && channels.length > 0) {
        targetChannelIds = channels.map(ch => ch.channel_id)
        console.log(`[Manual Update] Found ${channels.length} active channels`)
      } else {
        throw new Error('No active channels found')
      }
    }

    if (targetChannelIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No channels to update'
      }, { status: 400 })
    }

    // Initialize processors
    const quotaManager = getQuotaManager()
    await quotaManager.loadQuotaUsage()

    const batchProcessor = new BatchProcessor(quotaManager)

    const initialQuota = quotaManager.getQuotaStatus()
    console.log(`[Manual Update] Quota before update: ${initialQuota.used}/${initialQuota.limit} (${initialQuota.percentage.toFixed(1)}%)`)

    // Update channels
    console.log(`\n[Manual Update] 📡 Fetching data from YouTube API...`)
    const updatedChannels = await batchProcessor.updateChannelsBatch(targetChannelIds)
    console.log(`[Manual Update] ✅ Fetched data for ${updatedChannels.length} channels`)

    // Save to database (this now also creates history records)
    console.log(`\n[Manual Update] 💾 Saving to database...`)
    await batchProcessor.saveChannelData(updatedChannels)

    // Update category averages
    console.log(`\n[Manual Update] 📊 Updating category averages...`)
    await batchProcessor.updateCategoryAverages()

    const finalQuota = quotaManager.getQuotaStatus()
    const quotaUsed = finalQuota.used - initialQuota.used

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('✅ [Manual History Update] Complete')
    console.log(`📊 [Manual Update] Updated: ${updatedChannels.length} channels`)
    console.log(`📈 [Manual Update] Quota used: ${quotaUsed} units`)
    console.log(`📊 [Manual Update] Final quota: ${finalQuota.used}/${finalQuota.limit} (${finalQuota.percentage.toFixed(1)}%)`)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    return NextResponse.json({
      success: true,
      updated: updatedChannels.length,
      channels: updatedChannels.map(ch => ({
        channel_id: ch.channel_id,
        name: ch.name,
        subscribers: ch.subscribers,
        video_count: ch.video_count
      })),
      quota: {
        initial: initialQuota.used,
        final: finalQuota.used,
        used: quotaUsed,
        remaining: finalQuota.remaining,
        percentage: finalQuota.percentage
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [Manual History Update] Failed')
    console.error(`❌ [Manual Update] Error: ${error.message}`)
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * GET endpoint for documentation
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    name: 'Manual YouTube History Update API',
    description: 'Updates YouTube channel data and creates history records',
    method: 'POST',
    usage: {
      'Update all channels': {
        method: 'POST',
        body: {}
      },
      'Update specific channels by ID': {
        method: 'POST',
        body: {
          channelIds: ['UC...', 'UC...']
        }
      },
      'Update channels by name': {
        method: 'POST',
        body: {
          channelNames: ['빠니보틀 Pani Bottle', '제윤님']
        }
      }
    },
    examples: {
      'Update Pani Bottle channel': `curl -X POST http://localhost:3001/api/admin/youtube/update-history \\
  -H "Content-Type: application/json" \\
  -d '{"channelNames": ["빠니보틀 Pani Bottle"]}'`
    }
  })
}

// Set max duration for Vercel (60 seconds)
export const maxDuration = 60
