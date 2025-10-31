/**
 * YouTube Data API v3 Quota Costs
 *
 * Reference: https://developers.google.com/youtube/v3/determine_quota_cost
 *
 * This module defines the quota cost for each YouTube API endpoint.
 * Understanding these costs is crucial for managing API usage and staying within limits.
 */

/**
 * YouTube API endpoint quota costs in units
 *
 * Key points:
 * - Daily quota: 10,000 units
 * - search.list is VERY expensive (100 units per call)
 * - Most read operations: 1 unit
 * - Write operations: 50-1600 units
 */
export const YOUTUBE_API_COSTS = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Read operations (1 unit each)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'channels.list': 1,
  'videos.list': 1,
  'playlists.list': 1,
  'playlistItems.list': 1,
  'commentThreads.list': 1,
  'comments.list': 1,
  'videoCategories.list': 1,
  'guideCategories.list': 1,
  'i18nLanguages.list': 1,
  'i18nRegions.list': 1,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Search operations (EXPENSIVE!)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'search.list': 100,  // ⚠️  매우 비쌈! 1회 호출 = 100 units

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Write operations
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'videos.insert': 1600,        // ⚠️  초고비용!
  'videos.update': 50,
  'videos.delete': 50,
  'videos.rate': 50,

  'playlists.insert': 50,
  'playlists.update': 50,
  'playlists.delete': 50,

  'playlistItems.insert': 50,
  'playlistItems.update': 50,
  'playlistItems.delete': 50,

  'subscriptions.insert': 50,
  'subscriptions.delete': 50,

  'commentThreads.insert': 50,
  'comments.insert': 50,
  'comments.update': 50,
  'comments.delete': 50,

  'captions.insert': 400,
  'captions.update': 450,
  'captions.delete': 50,

  'channelSections.insert': 50,
  'channelSections.update': 50,
  'channelSections.delete': 50,

  'watermarks.set': 50,
  'watermarks.unset': 50,

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Default fallback
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  'default': 1
} as const

/**
 * Get quota cost for a specific API endpoint
 *
 * @param endpoint - YouTube API endpoint (e.g., 'channels.list', 'search.list')
 * @returns Quota cost in units
 *
 * @example
 * ```typescript
 * const cost = getQuotaCost('channels.list')  // 1
 * const searchCost = getQuotaCost('search.list')  // 100
 * ```
 */
export function getQuotaCost(endpoint: string): number {
  return YOUTUBE_API_COSTS[endpoint as keyof typeof YOUTUBE_API_COSTS] || YOUTUBE_API_COSTS.default
}

/**
 * Calculate total quota cost for multiple API calls
 *
 * @param calls - Array of endpoint names
 * @returns Total quota cost in units
 *
 * @example
 * ```typescript
 * const total = calculateTotalCost([
 *   'channels.list',     // 1 unit
 *   'search.list',       // 100 units
 *   'videos.list'        // 1 unit
 * ])
 * // total = 102 units
 * ```
 */
export function calculateTotalCost(calls: string[]): number {
  return calls.reduce((sum, endpoint) => sum + getQuotaCost(endpoint), 0)
}

/**
 * Check if operation can be performed within quota
 *
 * @param endpoint - API endpoint to check
 * @param remainingQuota - Available quota units
 * @returns Whether operation can be performed
 */
export function canPerformOperation(endpoint: string, remainingQuota: number): boolean {
  const cost = getQuotaCost(endpoint)
  return cost <= remainingQuota
}

/**
 * Get quota cost breakdown for a typical channel update
 *
 * A full channel update typically includes:
 * - channels.list: 1 unit
 * - search.list (5 calls for 250 videos): 500 units
 * - videos.list (5 calls): 5 units
 *
 * Total: 506 units per channel
 */
export function getChannelUpdateCostBreakdown() {
  return {
    channelInfo: {
      endpoint: 'channels.list',
      calls: 1,
      units: getQuotaCost('channels.list')
    },
    videoSearch: {
      endpoint: 'search.list',
      calls: 5,  // 50 videos per page, 5 pages = 250 videos
      units: getQuotaCost('search.list') * 5
    },
    videoDetails: {
      endpoint: 'videos.list',
      calls: 5,
      units: getQuotaCost('videos.list') * 5
    },
    total: getQuotaCost('channels.list') + (getQuotaCost('search.list') * 5) + (getQuotaCost('videos.list') * 5)
  }
}

/**
 * Estimate quota usage for bulk channel updates
 *
 * @param channelCount - Number of channels to update
 * @param includeVideos - Whether to fetch videos (search.list calls)
 * @returns Estimated quota usage
 */
export function estimateBulkUpdateCost(channelCount: number, includeVideos: boolean = true): {
  perChannel: number
  total: number
  breakdown: string
} {
  if (includeVideos) {
    const breakdown = getChannelUpdateCostBreakdown()
    return {
      perChannel: breakdown.total,
      total: breakdown.total * channelCount,
      breakdown: `${channelCount} channels × ${breakdown.total} units = ${breakdown.total * channelCount} units`
    }
  } else {
    // Just channel info, no videos
    const perChannel = getQuotaCost('channels.list')
    return {
      perChannel,
      total: perChannel * channelCount,
      breakdown: `${channelCount} channels × ${perChannel} unit = ${perChannel * channelCount} units`
    }
  }
}
