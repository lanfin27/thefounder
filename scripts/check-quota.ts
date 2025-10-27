/**
 * Check Quota Script
 *
 * Check current YouTube API quota usage and get recommendations
 * Usage: npm run yt:quota-check
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
  console.error('❌ Error: Required Supabase environment variables are missing!')
  console.error('Please check your .env.local file contains:')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_URL')
  console.error('  - NEXT_PUBLIC_YT_SUPABASE_ANON_KEY')
  console.error('  - YT_SUPABASE_SERVICE_KEY\n')
  process.exit(1)
}

// Now import after environment variables are loaded
import { getQuotaManager } from '../src/lib/youtube-api/quota-manager'

async function main() {
  console.log('='.repeat(60))
  console.log('YouTube API Quota Status')
  console.log('='.repeat(60))
  console.log('')

  try {
    const quotaManager = getQuotaManager()
    await quotaManager.loadQuotaUsage()

    const status = quotaManager.getQuotaStatus()

    // Display quota info
    console.log('📊 Quota Usage:')
    console.log(`   Used: ${status.used} units`)
    console.log(`   Remaining: ${status.remaining} units`)
    console.log(`   Limit: ${status.limit} units (usable)`)
    console.log(`   Daily Limit: ${status.dailyLimit} units (total)`)
    console.log(`   Percentage: ${status.percentage.toFixed(2)}%`)
    console.log('')

    // Status indicator
    const statusEmoji = status.percentage < 60 ? '✅' : status.percentage < 80 ? '⚠️' : '🚨'
    const statusText = status.percentage < 60 ? 'SAFE' : status.percentage < 80 ? 'WARNING' : 'CRITICAL'
    console.log(`${statusEmoji} Status: ${statusText}`)
    console.log('')

    // Recommendations
    console.log('💡 Recommendations:')
    if (status.percentage < 40) {
      console.log('   ✓ Quota usage is low. Can safely perform bulk updates.')
      console.log('   ✓ Consider updating trending channels.')
    } else if (status.percentage < 60) {
      console.log('   → Normal quota usage. Continue with priority-based updates.')
    } else if (status.percentage < 80) {
      console.log('   ⚠ Moderate quota usage. Limit to high-priority channels only.')
      console.log('   ⚠ Avoid unnecessary API calls.')
    } else if (status.percentage < 90) {
      console.log('   🚨 High quota usage. Stop all non-critical updates.')
      console.log('   🚨 Emergency updates only.')
    } else {
      console.log('   🛑 CRITICAL: Quota nearly exhausted!')
      console.log('   🛑 STOP ALL UPDATES immediately.')
    }
    console.log('')

    // Recent operations
    if (status.operations.length > 0) {
      console.log(`📋 Recent Operations (${status.operations.length} total):`)

      // Group by type
      const operationCounts: Record<string, { count: number, cost: number }> = {}
      for (const op of status.operations) {
        if (!operationCounts[op.type]) {
          operationCounts[op.type] = { count: 0, cost: 0 }
        }
        operationCounts[op.type].count += op.count
        operationCounts[op.type].cost += op.cost
      }

      console.log('')
      console.log('   Type                 Count    Cost')
      console.log('   ' + '-'.repeat(40))
      for (const [type, data] of Object.entries(operationCounts)) {
        console.log(`   ${type.padEnd(20)} ${data.count.toString().padStart(5)}    ${data.cost.toString().padStart(4)}`)
      }
      console.log('')

      // Last 5 operations
      console.log('   Last 5 operations:')
      const recent = status.operations.slice(-5)
      for (const op of recent) {
        const time = new Date(op.timestamp).toLocaleTimeString()
        console.log(`   - ${time} | ${op.type} x${op.count} (${op.cost} units)`)
      }
    } else {
      console.log('📋 No operations recorded today')
    }

    console.log('')
    console.log('='.repeat(60))

    // Estimate remaining capacity
    const estimatedChannels = Math.floor(status.remaining / 2) // Assume 2 units per channel avg
    console.log(`📈 Estimated capacity: ~${estimatedChannels} more channels can be updated today`)
    console.log('='.repeat(60))
    console.log('')

  } catch (error: any) {
    console.error('❌ Error checking quota:', error.message)
    console.error('')
    process.exit(1)
  }
}

main()
