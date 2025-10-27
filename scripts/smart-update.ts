/**
 * Smart Update Script
 *
 * Manually trigger a smart update of high-priority YouTube channels
 * Usage: npm run yt:smart-update
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
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? '✓ Set' : '✗ Missing')
console.log('')

const requiredEnvVars = [
  'NEXT_PUBLIC_YT_SUPABASE_URL',
  'NEXT_PUBLIC_YT_SUPABASE_ANON_KEY',
  'YOUTUBE_API_KEY'
]

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Error: ${envVar} is not set in .env.local`)
    console.error('Please check your .env.local file\n')
    process.exit(1)
  }
}

// Now import after environment variables are loaded
import { getQuotaManager } from '../src/lib/youtube-api/quota-manager'
import { PriorityUpdater } from '../src/lib/youtube-api/priority-updater'
import { BatchProcessor } from '../src/lib/youtube-api/batch-processor'

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube Smart Update - Manual Execution')
  console.log('='.repeat(60))
  console.log('')

  try {
    // Initialize managers
    const quotaManager = getQuotaManager()
    await quotaManager.loadQuotaUsage()

    const priorityUpdater = new PriorityUpdater(quotaManager)
    const batchProcessor = new BatchProcessor(quotaManager)

    // Check current quota
    const initialQuota = quotaManager.getQuotaStatus()
    console.log(`[SmartUpdate] Current quota: ${initialQuota.used}/${initialQuota.limit} (${initialQuota.percentage.toFixed(1)}%)`)
    console.log(`[SmartUpdate] Remaining: ${initialQuota.remaining} units\n`)

    if (initialQuota.percentage > 80) {
      console.error('❌ Quota usage too high (>80%). Aborting to prevent exceeding daily limit.')
      console.error('💡 Tip: Wait until tomorrow or use POST /api/youtube-industry/quota to reset (admin only)\n')
      process.exit(1)
    }

    // Get priority channels
    console.log('[SmartUpdate] Calculating priority channels...')
    const channelsToUpdate = await priorityUpdater.getDailyUpdateList(30)

    if (channelsToUpdate.length === 0) {
      console.log('[SmartUpdate] No channels found to update.')
      return
    }

    console.log(`[SmartUpdate] Found ${channelsToUpdate.length} channels to update\n`)

    // Show top 5 channels
    console.log('Top 5 priority channels:')
    channelsToUpdate.slice(0, 5).forEach((ch, i) => {
      console.log(`  ${i + 1}. ${ch.channel_id} - Score: ${ch.priority_score}, Subscribers: ${ch.subscribers.toLocaleString()}`)
    })
    console.log('')

    // Update channels
    console.log('[SmartUpdate] Starting batch update...')
    const channelIds = channelsToUpdate.map(c => c.channel_id)
    const updatedChannels = await batchProcessor.updateChannelsBatch(channelIds)

    // Save to database
    await batchProcessor.saveChannelData(updatedChannels)

    // Update category averages
    await batchProcessor.updateCategoryAverages()

    // Save priority scores
    await priorityUpdater.savePriorityScores(channelsToUpdate)

    // Final quota
    const finalQuota = quotaManager.getQuotaStatus()
    const quotaUsed = finalQuota.used - initialQuota.used

    console.log('\n' + '='.repeat(60))
    console.log('✓ Smart Update Completed')
    console.log('='.repeat(60))
    console.log(`Channels updated: ${updatedChannels.length}`)
    console.log(`Quota used: ${quotaUsed} units`)
    console.log(`Remaining quota: ${finalQuota.remaining} units (${finalQuota.percentage.toFixed(1)}%)`)
    console.log('')
  } catch (error: any) {
    console.error('\n' + '='.repeat(60))
    console.error('✗ Smart Update Failed')
    console.error('='.repeat(60))
    console.error('Error:', error.message)
    console.error('')
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

main()
