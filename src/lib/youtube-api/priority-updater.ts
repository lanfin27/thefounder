/**
 * Priority-based Channel Updater
 *
 * Determines which channels should be updated daily based on priority scoring
 */

import { createClient } from '@supabase/supabase-js'
import { QuotaManager } from './quota-manager'

interface ChannelPriority {
  channel_id: string
  priority_score: number
  last_updated: Date | string
  update_frequency: 'daily' | 'weekly' | 'monthly'
  is_trending: boolean
  category_code: string
  subscribers: number
  daily_change_rate: number
}

export class PriorityUpdater {
  private quotaManager: QuotaManager

  constructor(quotaManager: QuotaManager) {
    this.quotaManager = quotaManager
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

  /**
   * Get list of channels to update today based on priority
   * Strategy: Update max 30 channels per day to stay within quota
   */
  async getDailyUpdateList(maxChannels: number = 30): Promise<ChannelPriority[]> {
    console.log('[PriorityUpdater] Calculating daily update list...')

    const channels = await this.getChannelsByPriority()

    // Priority distribution:
    // 1. Top subscriber channel per category (15 channels)
    // 2. Top trending channels by daily change rate (5 channels)
    // 3. Channels not updated in 7+ days (10 channels)

    const topPerCategory = this.getTopChannelPerCategory(channels)
    const trending = this.getTrendingChannels(channels, 5)
    const stale = this.getStaleChannels(channels, 10)

    // Combine and deduplicate
    const updateList = this.deduplicateChannels([
      ...topPerCategory,
      ...trending,
      ...stale
    ])

    console.log(`[PriorityUpdater] Selected ${updateList.length} channels for update`)
    console.log(`  - Top per category: ${topPerCategory.length}`)
    console.log(`  - Trending: ${trending.length}`)
    console.log(`  - Stale (7+ days): ${stale.length}`)

    return updateList.slice(0, maxChannels)
  }

  private async getChannelsByPriority(): Promise<ChannelPriority[]> {
    const supabase = this.getSupabaseClient()
    const { data, error } = await supabase
      .from('youtube_channels')
      .select('*')
      .order('subscribers', { ascending: false })

    if (error) {
      console.error('[PriorityUpdater] Error fetching channels:', error)
      return []
    }

    if (!data || data.length === 0) {
      console.warn('[PriorityUpdater] No channels found in database')
      return []
    }

    return data.map(channel => {
      const daysSinceUpdate = this.getDaysSinceUpdate(channel.last_updated)
      const priorityScore = this.calculatePriority(channel, daysSinceUpdate)

      return {
        channel_id: channel.channel_id,
        priority_score: priorityScore,
        last_updated: channel.last_updated || new Date().toISOString(),
        update_frequency: this.getUpdateFrequency(channel),
        is_trending: Math.abs(channel.daily_change_rate || 0) > 10,
        category_code: channel.category_code,
        subscribers: channel.subscribers || 0,
        daily_change_rate: channel.daily_change_rate || 0
      }
    }).sort((a, b) => b.priority_score - a.priority_score)
  }

  private calculatePriority(channel: any, daysSinceUpdate: number): number {
    let score = 0

    // Subscriber count weight (0-40 points)
    if (channel.subscribers > 10000000) score += 40
    else if (channel.subscribers > 5000000) score += 30
    else if (channel.subscribers > 1000000) score += 20
    else if (channel.subscribers > 500000) score += 10

    // Days since last update weight (0-30 points)
    score += Math.min(daysSinceUpdate * 3, 30)

    // Change rate weight (0-30 points)
    const changeRate = Math.abs(channel.daily_change_rate || 0)
    score += Math.min(changeRate * 2, 30)

    return score
  }

  private getUpdateFrequency(channel: any): 'daily' | 'weekly' | 'monthly' {
    if (channel.subscribers > 10000000) return 'daily'
    if (channel.subscribers > 1000000) return 'weekly'
    return 'monthly'
  }

  private getDaysSinceUpdate(lastUpdated: string | Date | null): number {
    if (!lastUpdated) return 999 // Never updated

    const last = new Date(lastUpdated)
    const now = new Date()
    const diff = now.getTime() - last.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  private getTopChannelPerCategory(channels: ChannelPriority[]): ChannelPriority[] {
    const categoryMap = new Map<string, ChannelPriority>()

    for (const channel of channels) {
      const existing = categoryMap.get(channel.category_code)

      if (!existing || channel.subscribers > existing.subscribers) {
        categoryMap.set(channel.category_code, channel)
      }
    }

    return Array.from(categoryMap.values())
  }

  private getTrendingChannels(channels: ChannelPriority[], limit: number): ChannelPriority[] {
    return channels
      .filter(c => Math.abs(c.daily_change_rate) > 5)
      .sort((a, b) => Math.abs(b.daily_change_rate) - Math.abs(a.daily_change_rate))
      .slice(0, limit)
  }

  private getStaleChannels(channels: ChannelPriority[], limit: number): ChannelPriority[] {
    return channels
      .filter(c => this.getDaysSinceUpdate(c.last_updated) >= 7)
      .sort((a, b) => {
        const daysA = this.getDaysSinceUpdate(a.last_updated)
        const daysB = this.getDaysSinceUpdate(b.last_updated)
        return daysB - daysA
      })
      .slice(0, limit)
  }

  private deduplicateChannels(channels: ChannelPriority[]): ChannelPriority[] {
    const seen = new Set<string>()
    const result: ChannelPriority[] = []

    for (const channel of channels) {
      if (!seen.has(channel.channel_id)) {
        seen.add(channel.channel_id)
        result.push(channel)
      }
    }

    return result
  }

  /**
   * Save priority scores to database for tracking
   */
  async savePriorityScores(channels: ChannelPriority[]): Promise<void> {
    try {
      const updates = channels.map(channel => ({
        channel_id: channel.channel_id,
        priority_score: channel.priority_score,
        update_frequency: channel.update_frequency,
        last_calculated: new Date().toISOString()
      }))

      const supabase = this.getSupabaseClient()
      const { error } = await supabase
        .from('channel_priorities')
        .upsert(updates, { onConflict: 'channel_id' })

      if (error) {
        console.error('[PriorityUpdater] Failed to save priorities:', error)
      } else {
        console.log(`[PriorityUpdater] Saved ${updates.length} priority scores`)
      }
    } catch (error) {
      console.error('[PriorityUpdater] Error saving priorities:', error)
    }
  }
}
