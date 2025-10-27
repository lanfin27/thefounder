/**
 * YouTube Channel Resolver
 *
 * Resolves channel names, @handles, or custom URLs to actual channel IDs
 * Uses YouTube Data API v3 with quota management
 */

import { google } from 'googleapis'
import { QuotaManager } from './quota-manager'

const youtube = google.youtube('v3')

interface ResolvedChannel {
  channel_id: string
  name: string
  custom_url?: string
  subscribers: number
  found: boolean
  method?: 'id' | 'handle' | 'search' | 'not_found'
}

export class ChannelResolver {
  private quotaManager: QuotaManager
  private apiKey: string

  constructor(quotaManager: QuotaManager) {
    this.quotaManager = quotaManager
    this.apiKey = process.env.YOUTUBE_API_KEY || ''

    if (!this.apiKey) {
      throw new Error('YOUTUBE_API_KEY environment variable is required')
    }
  }

  /**
   * Main method to resolve a channel by ID, @handle, or name
   */
  async resolveChannel(query: string): Promise<ResolvedChannel> {
    console.log(`[ChannelResolver] Resolving: ${query}`)

    // Step 1: Try as direct channel ID (UC + 24 chars)
    if (this.isValidChannelId(query)) {
      const result = await this.getChannelById(query)
      if (result.found) {
        console.log(`[ChannelResolver] ✅ Found by ID: ${result.name}`)
        return { ...result, method: 'id' }
      }
    }

    // Step 2: Try as @handle (starts with @)
    if (query.startsWith('@')) {
      const result = await this.getChannelByHandle(query)
      if (result.found) {
        console.log(`[ChannelResolver] ✅ Found by @handle: ${result.name}`)
        return { ...result, method: 'handle' }
      }
    }

    // Step 3: Try search by name (most expensive - uses 100 quota units)
    const result = await this.searchChannelByName(query)
    if (result.found) {
      console.log(`[ChannelResolver] ✅ Found by search: ${result.name}`)
      return { ...result, method: 'search' }
    }

    console.log(`[ChannelResolver] ❌ Not found: ${query}`)
    return {
      channel_id: '',
      name: query,
      found: false,
      subscribers: 0,
      method: 'not_found'
    }
  }

  /**
   * Get channel by direct channel ID
   * Cost: 1 quota unit
   */
  private async getChannelById(channelId: string): Promise<ResolvedChannel> {
    // Check quota (1 unit)
    if (!this.quotaManager.canUseQuota(1)) {
      console.warn('[ChannelResolver] Insufficient quota for channel lookup')
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }

    try {
      const response = await youtube.channels.list({
        key: this.apiKey,
        part: ['snippet', 'statistics'],
        id: [channelId]
      })

      await this.quotaManager.useQuota('channels_list', 1)

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0]
        return {
          channel_id: channel.id!,
          name: channel.snippet?.title || '',
          custom_url: channel.snippet?.customUrl,
          subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
          found: true
        }
      }

      return { channel_id: '', name: '', found: false, subscribers: 0 }
    } catch (error: any) {
      console.error(`[ChannelResolver] Error fetching by ID:`, error.message)
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }
  }

  /**
   * Get channel by @handle (e.g., @BLACKPINK)
   * Cost: 1 quota unit
   */
  private async getChannelByHandle(handle: string): Promise<ResolvedChannel> {
    // Check quota (1 unit)
    if (!this.quotaManager.canUseQuota(1)) {
      console.warn('[ChannelResolver] Insufficient quota for handle lookup')
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }

    try {
      const response = await youtube.channels.list({
        key: this.apiKey,
        part: ['snippet', 'statistics'],
        forHandle: handle.replace('@', '') // Remove @ prefix
      })

      await this.quotaManager.useQuota('channels_list', 1)

      if (response.data.items && response.data.items.length > 0) {
        const channel = response.data.items[0]
        return {
          channel_id: channel.id!,
          name: channel.snippet?.title || '',
          custom_url: channel.snippet?.customUrl,
          subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
          found: true
        }
      }

      return { channel_id: '', name: '', found: false, subscribers: 0 }
    } catch (error: any) {
      console.error(`[ChannelResolver] Error fetching by handle:`, error.message)
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }
  }

  /**
   * Search for channel by name
   * Cost: 100 quota units (expensive!)
   * Uses name similarity matching to find best match
   */
  private async searchChannelByName(name: string): Promise<ResolvedChannel> {
    // Check quota (100 units - expensive!)
    if (!this.quotaManager.canUseQuota(100)) {
      console.warn('[ChannelResolver] Insufficient quota for channel search')
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }

    try {
      const response = await youtube.search.list({
        key: this.apiKey,
        part: ['snippet'],
        q: name,
        type: ['channel'],
        maxResults: 5,
        regionCode: 'KR' // Prioritize Korean channels
      })

      await this.quotaManager.useQuota('search_list', 1) // 100 units

      if (response.data.items && response.data.items.length > 0) {
        // Find best matching channel by name similarity
        let bestMatch = response.data.items[0]
        let bestSimilarity = this.calculateSimilarity(name, bestMatch.snippet?.title || '')

        for (const item of response.data.items) {
          const similarity = this.calculateSimilarity(name, item.snippet?.title || '')
          if (similarity > bestSimilarity) {
            bestMatch = item
            bestSimilarity = similarity
          }
        }

        // Get full channel details (need statistics)
        const channelId = bestMatch.snippet?.channelId || ''
        if (channelId) {
          return await this.getChannelById(channelId)
        }
      }

      return { channel_id: '', name: '', found: false, subscribers: 0 }
    } catch (error: any) {
      console.error(`[ChannelResolver] Error searching by name:`, error.message)
      return { channel_id: '', name: '', found: false, subscribers: 0 }
    }
  }

  /**
   * Calculate name similarity (0-1 score)
   * Uses normalized string comparison
   */
  private calculateSimilarity(name1: string, name2: string): number {
    const normalize = (str: string) => {
      return str
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^\w\uAC00-\uD7A3]/g, '') // Keep alphanumeric and Korean
    }

    const n1 = normalize(name1)
    const n2 = normalize(name2)

    // Exact match
    if (n1 === n2) return 1.0

    // Contains check
    if (n2.includes(n1) || n1.includes(n2)) return 0.8

    // Levenshtein distance-based similarity
    const maxLen = Math.max(n1.length, n2.length)
    if (maxLen === 0) return 0

    const distance = this.levenshteinDistance(n1, n2)
    return 1 - (distance / maxLen)
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = []

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          )
        }
      }
    }

    return matrix[str2.length][str1.length]
  }

  /**
   * Validate channel ID format (UC + 24 characters)
   */
  private isValidChannelId(channelId: string): boolean {
    return channelId && channelId.startsWith('UC') && channelId.length === 24
  }

  /**
   * Batch resolve multiple channels
   * Returns array of resolved channels
   */
  async resolveMultiple(queries: string[]): Promise<ResolvedChannel[]> {
    const results: ResolvedChannel[] = []

    for (const query of queries) {
      const result = await this.resolveChannel(query)
      results.push(result)

      // Small delay to avoid rate limits
      await this.sleep(100)
    }

    return results
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
