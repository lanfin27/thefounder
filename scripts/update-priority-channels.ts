/**
 * Update Priority Channels Script
 *
 * Calculate and display priority channels without updating them
 * Useful for previewing what will be updated
 * Usage: npm run yt:update-priority
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
import { getQuotaManager } from '../src/lib/youtube-api/quota-manager'
import { PriorityUpdater } from '../src/lib/youtube-api/priority-updater'

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube Priority Channels Calculator')
  console.log('='.repeat(60))
  console.log('')

  try {
    const quotaManager = getQuotaManager()
    await quotaManager.loadQuotaUsage()

    const priorityUpdater = new PriorityUpdater(quotaManager)

    console.log('[Priority] Calculating priority scores...')
    const priorityChannels = await priorityUpdater.getDailyUpdateList(30)

    if (priorityChannels.length === 0) {
      console.log('[Priority] No channels found in database.')
      console.log('💡 Run: npm run yt:import-data first')
      return
    }

    console.log(`[Priority] Found ${priorityChannels.length} high-priority channels\n`)

    // Display priority list
    console.log('Priority | Channel ID           | Score | Subscribers  | Change% | Frequency | Days')
    console.log('-'.repeat(90))

    priorityChannels.forEach((channel, index) => {
      const priority = (index + 1).toString().padStart(2)
      const channelId = channel.channel_id.substring(0, 20).padEnd(20)
      const score = channel.priority_score.toString().padStart(5)
      const subscribers = channel.subscribers.toLocaleString().padStart(12)
      const changeRate = (channel.daily_change_rate || 0).toFixed(1).padStart(7)
      const frequency = channel.update_frequency.padEnd(9)

      const daysSinceUpdate = getDaysSinceUpdate(channel.last_updated)
      const days = daysSinceUpdate.toString().padStart(4)

      console.log(`   ${priority}    ${channelId}  ${score}  ${subscribers}   ${changeRate}%  ${frequency}  ${days}`)
    })

    console.log('')

    // Statistics
    console.log('📊 Statistics:')
    const byFrequency = {
      daily: priorityChannels.filter(c => c.update_frequency === 'daily').length,
      weekly: priorityChannels.filter(c => c.update_frequency === 'weekly').length,
      monthly: priorityChannels.filter(c => c.update_frequency === 'monthly').length
    }

    console.log(`   Daily update frequency: ${byFrequency.daily}`)
    console.log(`   Weekly update frequency: ${byFrequency.weekly}`)
    console.log(`   Monthly update frequency: ${byFrequency.monthly}`)
    console.log('')

    const trending = priorityChannels.filter(c => c.is_trending).length
    console.log(`   Trending channels (>10% change): ${trending}`)

    const stale = priorityChannels.filter(c => getDaysSinceUpdate(c.last_updated) >= 7).length
    console.log(`   Stale channels (7+ days): ${stale}`)
    console.log('')

    // Estimated quota cost
    const estimatedCost = priorityChannels.length * 2 // Assume 2 units per channel
    console.log(`💰 Estimated quota cost: ${estimatedCost} units (${priorityChannels.length} channels × ~2 units)`)

    const currentQuota = quotaManager.getQuotaStatus()
    console.log(`   Current quota remaining: ${currentQuota.remaining} units`)

    if (estimatedCost > currentQuota.remaining) {
      console.log(`   ⚠️  WARNING: Not enough quota remaining!`)
      console.log(`   💡 Tip: Reduce number of channels or wait until tomorrow`)
    } else {
      console.log(`   ✓ Sufficient quota available`)
    }

    console.log('')

    // Save priority scores
    console.log('[Priority] Saving priority scores to database...')
    await priorityUpdater.savePriorityScores(priorityChannels)
    console.log('[Priority] ✓ Priority scores saved')

    console.log('')
    console.log('='.repeat(60))
    console.log('To update these channels, run: npm run yt:smart-update')
    console.log('='.repeat(60))
    console.log('')

  } catch (error: any) {
    console.error('\n❌ Error:', error.message)
    console.error('')
    if (error.stack) {
      console.error(error.stack)
    }
    process.exit(1)
  }
}

function getDaysSinceUpdate(lastUpdated: string | Date | null): number {
  if (!lastUpdated) return 999

  const last = new Date(lastUpdated)
  const now = new Date()
  const diff = now.getTime() - last.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

main()
