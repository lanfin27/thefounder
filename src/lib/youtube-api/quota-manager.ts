/**
 * YouTube API Quota Manager
 *
 * Manages daily YouTube API quota usage to stay within free tier limits
 */

import { createClient } from '@supabase/supabase-js'

// YouTube API v3 quota costs
const QUOTA_COSTS = {
  channels_list: 1,      // Channel info lookup
  videos_list: 1,        // Video info lookup
  search_list: 100,      // Search (expensive - avoid)
  playlists_list: 1,     // Playlist lookup
  playlistItems_list: 1, // Playlist items lookup
} as const

const DAILY_QUOTA_LIMIT = 10000
const SAFETY_BUFFER = 1000 // Safety buffer
const USABLE_QUOTA = DAILY_QUOTA_LIMIT - SAFETY_BUFFER // 9000

interface QuotaOperation {
  type: string
  count: number
  cost: number
  timestamp: string
}

interface QuotaUsage {
  date: string
  used: number
  remaining: number
  operations: QuotaOperation[]
}

export class QuotaManager {
  private quotaUsage: QuotaUsage
  private isLoaded: boolean = false

  constructor() {
    const today = new Date().toISOString().split('T')[0]
    this.quotaUsage = {
      date: today,
      used: 0,
      remaining: USABLE_QUOTA,
      operations: []
    }
  }

  private getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_YT_SUPABASE_URL
    const supabaseKey = process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not found in environment variables')
    }

    return createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  }

  async loadQuotaUsage(): Promise<void> {
    if (this.isLoaded) return

    const today = new Date().toISOString().split('T')[0]
    const supabase = this.getSupabaseClient()

    try {
      const { data, error } = await supabase
        .from('quota_usage')
        .select('*')
        .eq('date', today)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No record for today, create one
          await this.initializeTodayQuota()
        } else {
          console.error('Error loading quota usage:', error)
        }
      } else if (data) {
        this.quotaUsage = {
          date: data.date,
          used: data.used || 0,
          remaining: USABLE_QUOTA - (data.used || 0),
          operations: (data.operations as QuotaOperation[]) || []
        }
      }

      this.isLoaded = true
    } catch (error) {
      console.error('Failed to load quota usage:', error)
      // Continue with default values
      this.isLoaded = true
    }
  }

  private async initializeTodayQuota(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]
    const supabase = this.getSupabaseClient()

    try {
      await supabase
        .from('quota_usage')
        .insert({
          date: today,
          used: 0,
          operations: []
        })

      console.log('[QuotaManager] Initialized quota for', today)
    } catch (error) {
      console.error('[QuotaManager] Failed to initialize quota:', error)
    }
  }

  canUseQuota(cost: number): boolean {
    return this.quotaUsage.remaining >= cost
  }

  async useQuota(operationType: keyof typeof QUOTA_COSTS, units: number = 1): Promise<void> {
    const cost = QUOTA_COSTS[operationType] * units

    if (!this.canUseQuota(cost)) {
      throw new Error(
        `Insufficient quota. Required: ${cost}, Remaining: ${this.quotaUsage.remaining}`
      )
    }

    this.quotaUsage.used += cost
    this.quotaUsage.remaining -= cost
    this.quotaUsage.operations.push({
      type: operationType,
      count: units,
      cost,
      timestamp: new Date().toISOString()
    })

    // Save to Supabase
    await this.saveQuotaUsage()
  }

  getQuotaStatus() {
    return {
      ...this.quotaUsage,
      percentage: (this.quotaUsage.used / USABLE_QUOTA) * 100,
      limit: USABLE_QUOTA,
      dailyLimit: DAILY_QUOTA_LIMIT
    }
  }

  private async saveQuotaUsage(): Promise<void> {
    const supabase = this.getSupabaseClient()

    try {
      const { error } = await supabase
        .from('quota_usage')
        .update({
          used: this.quotaUsage.used,
          operations: this.quotaUsage.operations as any,
          updated_at: new Date().toISOString()
        })
        .eq('date', this.quotaUsage.date)

      if (error) {
        console.error('[QuotaManager] Failed to save quota usage:', error)
      }
    } catch (error) {
      console.error('[QuotaManager] Error saving quota:', error)
    }
  }

  getEstimatedCost(operation: {
    channelStats?: number
    videosList?: number
    playlistItems?: number
  }): number {
    let total = 0

    if (operation.channelStats) {
      total += QUOTA_COSTS.channels_list * operation.channelStats
    }
    if (operation.videosList) {
      total += QUOTA_COSTS.videos_list * operation.videosList
    }
    if (operation.playlistItems) {
      total += QUOTA_COSTS.playlistItems_list * operation.playlistItems
    }

    return total
  }
}

// Singleton instance
let quotaManagerInstance: QuotaManager | null = null

export function getQuotaManager(): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager()
  }
  return quotaManagerInstance
}
