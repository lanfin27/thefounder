/**
 * Batch Processor for YouTube API
 *
 * Efficiently processes multiple channels in batches while respecting quota limits
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { QuotaManager } from './quota-manager'

const youtube = google.youtube('v3')

interface ChannelData {
  channel_id: string
  name: string
  subscribers: number
  total_views: number
  video_count: number
  thumbnail_url?: string
  description?: string
  custom_url?: string
}

interface VideoData {
  video_id: string
  title: string
  published_at: string
  view_count: number
  like_count: number
  comment_count: number
  duration: string
}

export class BatchProcessor {
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
   * Validate YouTube channel ID format
   */
  private isValidChannelId(channelId: string): boolean {
    return channelId && channelId.startsWith('UC') && channelId.length === 24
  }

  /**
   * Update multiple channels in batches of 50 (API limit)
   */
  async updateChannelsBatch(channelIds: string[]): Promise<ChannelData[]> {
    // Validate and filter channel IDs
    const validChannelIds = channelIds.filter(id => this.isValidChannelId(id))
    const invalidCount = channelIds.length - validChannelIds.length

    if (invalidCount > 0) {
      console.warn(`[BatchProcessor] Filtered out ${invalidCount} invalid channel IDs`)
    }

    if (validChannelIds.length === 0) {
      console.warn('[BatchProcessor] No valid channel IDs to update')
      return []
    }

    const batchSize = 50 // YouTube API supports up to 50 IDs per request
    const results: ChannelData[] = []

    console.log(`[BatchProcessor] Updating ${validChannelIds.length} valid channels in batches of ${batchSize}`)

    for (let i = 0; i < validChannelIds.length; i += batchSize) {
      const batch = validChannelIds.slice(i, i + batchSize)

      // Check quota before each batch
      const quotaCost = batch.length // 1 unit per channel
      if (!this.quotaManager.canUseQuota(quotaCost)) {
        console.warn(`[BatchProcessor] Quota limit reached. Processed ${i} channels.`)
        break
      }

      try {
        const response = await youtube.channels.list({
          key: process.env.YOUTUBE_API_KEY,
          part: ['statistics', 'snippet', 'contentDetails'],
          id: batch,
          maxResults: 50
        })

        // Record quota usage
        await this.quotaManager.useQuota('channels_list', batch.length)

        if (response.data.items) {
          const channelData = response.data.items.map(item => ({
            channel_id: item.id!,
            name: item.snippet?.title || '',
            subscribers: parseInt(item.statistics?.subscriberCount || '0'),
            total_views: parseInt(item.statistics?.viewCount || '0'),
            video_count: parseInt(item.statistics?.videoCount || '0'),
            thumbnail_url: item.snippet?.thumbnails?.default?.url,
            description: item.snippet?.description,
            custom_url: item.snippet?.customUrl
          }))

          results.push(...channelData)

          // Check for missing channels
          if (response.data.items.length < batch.length) {
            const foundIds = new Set(response.data.items.map(item => item.id))
            const missingIds = batch.filter(id => !foundIds.has(id))
            if (missingIds.length > 0) {
              console.warn(`[BatchProcessor] ${missingIds.length} channel(s) not found: ${missingIds.join(', ')}`)
            }
          }
        }

        console.log(`[BatchProcessor] Batch ${Math.floor(i / batchSize) + 1}: ${response.data.items?.length || 0}/${batch.length} channels found`)

        // Rate limiting: wait 100ms between batches
        if (i + batchSize < validChannelIds.length) {
          await this.sleep(100)
        }
      } catch (error: any) {
        console.error(`[BatchProcessor] Batch ${i}-${i + batch.length} failed:`, error.message)
        // Continue with next batch
      }
    }

    console.log(`[BatchProcessor] Total channels updated: ${results.length}`)
    return results
  }

  /**
   * Get recent videos from a channel (for Shorts ratio calculation)
   * Optimized to use minimal quota (2 units per channel)
   */
  async getRecentVideos(channelId: string, limit: number = 5): Promise<VideoData[]> {
    // Check quota (2 units: 1 for channel, 1 for playlist items)
    if (!this.quotaManager.canUseQuota(2)) {
      console.warn('[BatchProcessor] Insufficient quota for video fetch')
      return []
    }

    try {
      // 1. Get uploads playlist ID (1 unit)
      const channelResponse = await youtube.channels.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ['contentDetails'],
        id: [channelId]
      })

      await this.quotaManager.useQuota('channels_list', 1)

      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

      if (!uploadsPlaylistId) {
        console.warn(`[BatchProcessor] No uploads playlist for channel ${channelId}`)
        return []
      }

      // 2. Get recent videos from uploads playlist (1 unit)
      const videosResponse = await youtube.playlistItems.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ['contentDetails', 'snippet'],
        playlistId: uploadsPlaylistId,
        maxResults: limit
      })

      await this.quotaManager.useQuota('playlistItems_list', 1)

      if (!videosResponse.data.items) {
        return []
      }

      // 3. Get video statistics (1 unit per 50 videos)
      const videoIds = videosResponse.data.items
        .map(item => item.contentDetails?.videoId)
        .filter(Boolean) as string[]

      if (videoIds.length === 0) return []

      const statsResponse = await youtube.videos.list({
        key: process.env.YOUTUBE_API_KEY,
        part: ['statistics', 'contentDetails', 'snippet'],
        id: videoIds
      })

      await this.quotaManager.useQuota('videos_list', Math.ceil(videoIds.length / 50))

      const videos: VideoData[] = statsResponse.data.items?.map(item => ({
        video_id: item.id!,
        title: item.snippet?.title || '',
        published_at: item.snippet?.publishedAt || '',
        view_count: parseInt(item.statistics?.viewCount || '0'),
        like_count: parseInt(item.statistics?.likeCount || '0'),
        comment_count: parseInt(item.statistics?.commentCount || '0'),
        duration: item.contentDetails?.duration || ''
      })) || []

      return videos
    } catch (error: any) {
      console.error(`[BatchProcessor] Failed to get videos for ${channelId}:`, error.message)
      return []
    }
  }

  /**
   * Save updated channel data to Supabase
   */
  async saveChannelData(channelData: ChannelData[]): Promise<void> {
    if (channelData.length === 0) return

    try {
      const updates = channelData.map(channel => ({
        channel_id: channel.channel_id,
        name: channel.name,
        subscribers: channel.subscribers,
        total_views: channel.total_views,
        video_count: channel.video_count,
        views_per_video: channel.video_count > 0
          ? Math.round(channel.total_views / channel.video_count)
          : 0,
        last_updated: new Date().toISOString()
      }))

      const supabase = this.getSupabaseClient()
      const { error } = await supabase
        .from('youtube_channels')
        .upsert(updates, { onConflict: 'channel_id' })

      if (error) {
        console.error('[BatchProcessor] Failed to save channel data:', error)
      } else {
        console.log(`[BatchProcessor] Saved ${updates.length} channels to database`)
      }
    } catch (error) {
      console.error('[BatchProcessor] Error saving to database:', error)
    }
  }

  /**
   * Calculate and update category averages
   */
  async updateCategoryAverages(): Promise<void> {
    console.log('[BatchProcessor] Calculating category averages...')
    const supabase = this.getSupabaseClient()

    try {
      const { data: categories } = await supabase
        .from('youtube_categories')
        .select('code')

      if (!categories) return

      for (const category of categories) {
        const { data: channels } = await supabase
          .from('youtube_channels')
          .select('*')
          .eq('category_code', category.code)

        if (!channels || channels.length === 0) continue

        const totalViews = channels.reduce((sum, ch) => sum + (ch.total_views || 0), 0)
        const totalVideos = channels.reduce((sum, ch) => sum + (ch.video_count || 0), 0)
        const avgViewsPerVideo = totalVideos > 0 ? totalViews / totalVideos : 0

        await supabase
          .from('youtube_categories')
          .update({
            avg_views_per_video: Math.round(avgViewsPerVideo),
            total_channels: channels.length
          })
          .eq('code', category.code)

        console.log(
          `[BatchProcessor] Category ${category.code}: ${channels.length} channels, ${Math.round(avgViewsPerVideo).toLocaleString()} avg views/video`
        )
      }
    } catch (error) {
      console.error('[BatchProcessor] Failed to update category averages:', error)
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
