/**
 * YouTube Channel Verification and Auto-Fix Script
 *
 * Automatically verifies all channels in the database and fixes incorrect channel IDs
 *
 * Process:
 * 1. Load all channels from database
 * 2. Verify each channel ID using YouTube API
 * 3. If invalid, try to resolve using channel mappings
 * 4. If still not found, use search API
 * 5. Auto-fix incorrect channel IDs in database
 * 6. Log channels that need manual review
 *
 * Usage:
 *   npm run yt:verify-channels        # Full verification with auto-fix
 *   npm run yt:verify-quick           # Quick mode (verify only, no auto-fix)
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables FIRST
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Validate environment variables
console.log('🔍 Environment Check:')
console.log('NEXT_PUBLIC_YT_SUPABASE_URL:', process.env.NEXT_PUBLIC_YT_SUPABASE_URL ? '✓ Set' : '✗ Missing')
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? '✓ Set' : '✗ Missing')
console.log('')

if (!process.env.NEXT_PUBLIC_YT_SUPABASE_URL || !process.env.YOUTUBE_API_KEY) {
  console.error('❌ Error: Required environment variables are missing')
  process.exit(1)
}

// Now import after environment variables are loaded
import { createClient } from '@supabase/supabase-js'
import { QuotaManager } from '../src/lib/youtube-api/quota-manager'
import { ChannelResolver } from '../src/lib/youtube-api/channel-resolver'
import { findMapping, getPreferredQuery } from '../src/data/channel-mappings'

interface VerificationResult {
  channel_id: string
  name: string
  category_code: string
  status: 'valid' | 'fixed' | 'not_found' | 'skipped'
  old_channel_id?: string
  new_channel_id?: string
  method?: string
  error?: string
}

async function main() {
  const isQuickMode = process.argv.includes('--quick')

  console.log('='.repeat(70))
  console.log('YouTube Channel Verification System')
  console.log('='.repeat(70))
  console.log(`Mode: ${isQuickMode ? '⚡ Quick (verify only)' : '🔧 Full (verify + auto-fix)'}`)
  console.log('')

  // Initialize Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL!
  const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  })

  // Initialize quota manager and resolver
  const quotaManager = new QuotaManager()
  await quotaManager.loadQuotaUsage()

  const quotaStatus = quotaManager.getQuotaStatus()
  console.log('📊 Initial Quota Status:')
  console.log(`   Used: ${quotaStatus.used} units`)
  console.log(`   Remaining: ${quotaStatus.remaining} units`)
  console.log(`   Percentage: ${quotaStatus.percentage.toFixed(2)}%`)
  console.log('')

  if (quotaStatus.remaining < 100) {
    console.error('❌ Error: Insufficient quota for verification')
    console.error('   Need at least 100 units remaining')
    process.exit(1)
  }

  const resolver = new ChannelResolver(quotaManager)

  // Load all channels from database
  console.log('📥 Loading channels from database...')
  const { data: channels, error } = await supabase
    .from('youtube_channels')
    .select('channel_id, name, category_code')
    .order('category_code', { ascending: true })

  if (error) {
    console.error('❌ Database error:', error.message)
    process.exit(1)
  }

  if (!channels || channels.length === 0) {
    console.log('⚠️  No channels found in database')
    process.exit(0)
  }

  console.log(`✅ Loaded ${channels.length} channels`)
  console.log('')

  // Verification results
  const results: VerificationResult[] = []
  let validCount = 0
  let fixedCount = 0
  let notFoundCount = 0
  let skippedCount = 0

  console.log('🔍 Starting verification...')
  console.log('-'.repeat(70))

  for (let i = 0; i < channels.length; i++) {
    const channel = channels[i]
    const progress = `[${i + 1}/${channels.length}]`

    console.log(`\n${progress} ${channel.name} (${channel.category_code})`)
    console.log(`   Current ID: ${channel.channel_id}`)

    // Step 1: Verify current channel ID
    const currentResult = await resolver.resolveChannel(channel.channel_id)

    if (currentResult.found) {
      console.log(`   ✅ Valid - ${currentResult.name}`)
      results.push({
        channel_id: channel.channel_id,
        name: channel.name,
        category_code: channel.category_code,
        status: 'valid'
      })
      validCount++
      continue
    }

    console.log(`   ⚠️  Current ID not found`)

    // Step 2: Try to resolve using channel mappings
    console.log(`   🔍 Checking mappings...`)
    const mapping = findMapping(channel.name)

    if (mapping) {
      const preferredQuery = getPreferredQuery(channel.name)
      console.log(`   📋 Found mapping: ${preferredQuery}`)

      const mappedResult = await resolver.resolveChannel(preferredQuery)

      if (mappedResult.found) {
        console.log(`   ✅ Resolved - ${mappedResult.name}`)

        if (!isQuickMode) {
          // Auto-fix in database
          const { error: updateError } = await supabase
            .from('youtube_channels')
            .update({
              channel_id: mappedResult.channel_id,
              name: mappedResult.name,
              subscribers: mappedResult.subscribers,
              last_updated: new Date().toISOString()
            })
            .eq('channel_id', channel.channel_id)

          if (updateError) {
            console.log(`   ❌ Failed to update: ${updateError.message}`)
          } else {
            console.log(`   🔧 Fixed: ${channel.channel_id} → ${mappedResult.channel_id}`)
          }
        }

        results.push({
          channel_id: channel.channel_id,
          name: channel.name,
          category_code: channel.category_code,
          status: 'fixed',
          old_channel_id: channel.channel_id,
          new_channel_id: mappedResult.channel_id,
          method: mappedResult.method
        })
        fixedCount++
        continue
      }
    }

    // Step 3: Last resort - search by name (expensive!)
    if (quotaManager.canUseQuota(100)) {
      console.log(`   🔍 Searching by name (100 quota units)...`)
      const searchResult = await resolver.resolveChannel(channel.name)

      if (searchResult.found) {
        console.log(`   ✅ Found - ${searchResult.name}`)

        if (!isQuickMode) {
          // Auto-fix in database
          const { error: updateError } = await supabase
            .from('youtube_channels')
            .update({
              channel_id: searchResult.channel_id,
              name: searchResult.name,
              subscribers: searchResult.subscribers,
              last_updated: new Date().toISOString()
            })
            .eq('channel_id', channel.channel_id)

          if (updateError) {
            console.log(`   ❌ Failed to update: ${updateError.message}`)
          } else {
            console.log(`   🔧 Fixed: ${channel.channel_id} → ${searchResult.channel_id}`)
          }
        }

        results.push({
          channel_id: channel.channel_id,
          name: channel.name,
          category_code: channel.category_code,
          status: 'fixed',
          old_channel_id: channel.channel_id,
          new_channel_id: searchResult.channel_id,
          method: 'search'
        })
        fixedCount++
        continue
      }
    } else {
      console.log(`   ⚠️  Insufficient quota for search (need 100 units)`)
      results.push({
        channel_id: channel.channel_id,
        name: channel.name,
        category_code: channel.category_code,
        status: 'skipped',
        error: 'Insufficient quota for search'
      })
      skippedCount++
      continue
    }

    // Not found
    console.log(`   ❌ Not found - needs manual review`)
    results.push({
      channel_id: channel.channel_id,
      name: channel.name,
      category_code: channel.category_code,
      status: 'not_found',
      error: 'Channel not found via API or mappings'
    })
    notFoundCount++

    // Small delay to avoid rate limits
    await sleep(200)
  }

  console.log('')
  console.log('='.repeat(70))
  console.log('✅ Verification Complete')
  console.log('='.repeat(70))
  console.log(`Total Channels: ${channels.length}`)
  console.log(`✅ Valid: ${validCount}`)
  console.log(`🔧 Fixed: ${fixedCount}`)
  console.log(`❌ Not Found: ${notFoundCount}`)
  console.log(`⚠️  Skipped: ${skippedCount}`)
  console.log('')

  // Final quota status
  const finalQuota = quotaManager.getQuotaStatus()
  console.log('📊 Final Quota Status:')
  console.log(`   Used: ${finalQuota.used} units (+${finalQuota.used - quotaStatus.used})`)
  console.log(`   Remaining: ${finalQuota.remaining} units`)
  console.log(`   Percentage: ${finalQuota.percentage.toFixed(2)}%`)
  console.log('')

  // Save results to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const logDir = path.join(process.cwd(), 'logs')

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, `channel-verification-${timestamp}.json`)
  fs.writeFileSync(logFile, JSON.stringify(results, null, 2))
  console.log(`📄 Results saved to: ${logFile}`)

  // Show channels needing manual review
  const needsReview = results.filter(r => r.status === 'not_found' || r.status === 'skipped')

  if (needsReview.length > 0) {
    console.log('')
    console.log('⚠️  Channels Needing Manual Review:')
    console.log('-'.repeat(70))

    for (const result of needsReview) {
      console.log(`   ${result.name} (${result.category_code})`)
      console.log(`   ID: ${result.channel_id}`)
      console.log(`   Error: ${result.error}`)
      console.log(`   URL: https://www.youtube.com/channel/${result.channel_id}`)
      console.log('')
    }

    console.log('💡 Next Steps:')
    console.log('   1. Manually verify these channels on YouTube')
    console.log('   2. Update channel mappings in src/data/channel-mappings.ts')
    console.log('   3. Or use the admin UI to fix manually')
  }

  console.log('')
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(error => {
  console.error('\n❌ Error:', error.message)
  console.error('')
  process.exit(1)
})
