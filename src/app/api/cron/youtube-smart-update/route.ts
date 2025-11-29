/**
 * Smart Update Cron Job
 *
 * Daily cron job that updates high-priority channels while staying within quota limits
 * Runs at 3 AM UTC daily via Vercel Cron
 */

import { NextRequest, NextResponse } from 'next/server'
import { getQuotaManager } from '@/lib/youtube-api/quota-manager'
import { PriorityUpdater } from '@/lib/youtube-api/priority-updater'
import { BatchProcessor } from '@/lib/youtube-api/batch-processor'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  console.log('='.repeat(60))
  console.log('YouTube Smart Update - Starting')
  console.log('='.repeat(60))

  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.YT_CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    console.error('[Cron] Unauthorized access attempt')
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    // Initialize managers
    const quotaManager = getQuotaManager()
    await quotaManager.loadQuotaUsage()

    const priorityUpdater = new PriorityUpdater(quotaManager)
    const batchProcessor = new BatchProcessor(quotaManager)

    // Check current quota status
    const initialQuota = quotaManager.getQuotaStatus()
    console.log(`[Cron] Initial quota: ${initialQuota.used}/${initialQuota.limit} (${initialQuota.percentage.toFixed(1)}%)`)

    if (initialQuota.percentage > 80) {
      console.warn('[Cron] Quota usage already high (>80%). Skipping update.')
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'Quota usage too high',
        quota: initialQuota
      })
    }

    // Get priority channels to update (max 30)
    console.log('[Cron] Calculating priority channels...')
    const channelsToUpdate = await priorityUpdater.getDailyUpdateList(30)

    if (channelsToUpdate.length === 0) {
      console.log('[Cron] No channels to update')
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'No channels found'
      })
    }

    console.log(`[Cron] Updating ${channelsToUpdate.length} priority channels`)

    // Update channels in batches
    const channelIds = channelsToUpdate.map(c => c.channel_id)
    const updatedChannels = await batchProcessor.updateChannelsBatch(channelIds)

    // Save to database
    await batchProcessor.saveChannelData(updatedChannels)

    // Update category averages
    await batchProcessor.updateCategoryAverages()

    // Save priority scores
    await priorityUpdater.savePriorityScores(channelsToUpdate)

    // Final quota status
    const finalQuota = quotaManager.getQuotaStatus()
    console.log(`[Cron] Final quota: ${finalQuota.used}/${finalQuota.limit} (${finalQuota.percentage.toFixed(1)}%)`)
    console.log(`[Cron] Quota used in this run: ${finalQuota.used - initialQuota.used}`)

    console.log('='.repeat(60))
    console.log('YouTube Smart Update - Completed')
    console.log('='.repeat(60))

    return NextResponse.json({
      success: true,
      updated: updatedChannels.length,
      channels_attempted: channelsToUpdate.length,
      quota: {
        initial: initialQuota.used,
        final: finalQuota.used,
        used_in_run: finalQuota.used - initialQuota.used,
        remaining: finalQuota.remaining,
        percentage: finalQuota.percentage
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('='.repeat(60))
    console.error('[Cron] Update failed:', error.message)
    console.error('='.repeat(60))
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

// Allow POST as well (Vercel Cron can use either)
export async function POST(request: NextRequest) {
  return GET(request)
}

// Set max duration for Vercel (60 seconds)
export const maxDuration = 60
