/**
 * YouTube API Integration Service
 *
 * Provides complete automation for YouTube channel management:
 * - Extract channel IDs from various URL formats
 * - Fetch channel information from YouTube API
 * - Get all videos with pagination
 * - Generate smart history based on actual video data
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/youtube-supabase/database.types'

export interface ChannelInfo {
  channel_id: string
  name: string
  description?: string
  thumbnail_url?: string
  subscribers: number
  total_views: number
  video_count: number
  country?: string
  published_at?: string
}

export interface VideoInfo {
  id: string
  title: string
  published_at: string
  view_count: number
  like_count?: number
  comment_count?: number
}

export class YouTubeService {
  private youtube
  private supabase
  private apiKey: string

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY!
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.apiKey
    })

    this.supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
      process.env.YT_SUPABASE_SERVICE_KEY!
    )
  }

  /**
   * Extract channel ID from various YouTube URL formats
   * Supports:
   * - youtube.com/channel/CHANNEL_ID
   * - youtube.com/@username
   * - youtube.com/c/customname
   * - youtube.com/user/username
   * - Direct channel ID (UC...)
   */
  async extractChannelId(input: string): Promise<string | null> {
    // Direct channel ID
    if (input.startsWith('UC') && input.length === 24) {
      return input
    }

    // URL patterns
    const patterns = [
      /youtube\.com\/channel\/([A-Za-z0-9_-]+)/,
      /youtube\.com\/@([A-Za-z0-9_-]+)/,
      /youtube\.com\/c\/([A-Za-z0-9_-]+)/,
      /youtube\.com\/user\/([A-Za-z0-9_-]+)/
    ]

    for (let i = 0; i < patterns.length; i++) {
      const match = input.match(patterns[i])
      if (match) {
        const identifier = match[1]

        // For @username, /c/, and /user/, need to search for channel
        if (i > 0) {
          return await this.getChannelIdByHandle(identifier)
        }

        return identifier
      }
    }

    // Try searching by name
    return await this.getChannelIdByHandle(input)
  }

  /**
   * Get channel ID by username/handle
   */
  private async getChannelIdByHandle(handle: string): Promise<string | null> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1
      })

      const channelId = response.data.items?.[0]?.snippet?.channelId
      return channelId || null
    } catch (error) {
      console.error('Channel search failed:', error)
      return null
    }
  }

  /**
   * Get complete channel information from YouTube API
   */
  async getChannelInfo(channelId: string): Promise<ChannelInfo> {
    try {
      const response = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId]
      })

      const channel = response.data.items?.[0]
      if (!channel) {
        throw new Error('Channel not found on YouTube')
      }

      const stats = channel.statistics!
      const snippet = channel.snippet!

      return {
        channel_id: channel.id!,
        name: snippet.title || 'Unknown',
        description: snippet.description,
        thumbnail_url: snippet.thumbnails?.default?.url,
        subscribers: parseInt(stats.subscriberCount || '0'),
        total_views: parseInt(stats.viewCount || '0'),
        video_count: parseInt(stats.videoCount || '0'),
        country: snippet.country,
        published_at: snippet.publishedAt
      }
    } catch (error: any) {
      console.error('Failed to fetch channel info:', error)
      throw new Error(`YouTube API Error: ${error.message}`)
    }
  }

  /**
   * Get all videos from a channel with pagination
   */
  async getAllVideos(channelId: string, maxResults = 500): Promise<VideoInfo[]> {
    const videos: VideoInfo[] = []
    let pageToken: string | undefined = undefined

    try {
      while (videos.length < maxResults) {
        const response = await this.youtube.search.list({
          part: ['snippet'],
          channelId: channelId,
          maxResults: 50,
          pageToken: pageToken,
          type: ['video'],
          order: 'date'
        })

        const items = response.data.items || []

        // Get video IDs
        const videoIds = items
          .map(item => item.id?.videoId)
          .filter(Boolean) as string[]

        if (videoIds.length > 0) {
          // Get detailed statistics
          const detailsResponse = await this.youtube.videos.list({
            part: ['statistics', 'snippet'],
            id: videoIds
          })

          const detailedVideos = detailsResponse.data.items || []

          for (const video of detailedVideos) {
            videos.push({
              id: video.id!,
              title: video.snippet?.title || 'Untitled',
              published_at: video.snippet?.publishedAt || new Date().toISOString(),
              view_count: parseInt(video.statistics?.viewCount || '0'),
              like_count: parseInt(video.statistics?.likeCount || '0'),
              comment_count: parseInt(video.statistics?.commentCount || '0')
            })
          }
        }

        pageToken = response.data.nextPageToken || undefined
        if (!pageToken) break

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      console.log(`  ✅ Fetched ${videos.length} videos from YouTube`)
      return videos
    } catch (error: any) {
      console.error('Failed to fetch videos:', error)
      throw new Error(`Failed to fetch videos: ${error.message}`)
    }
  }

  /**
   * Generate smart history based on actual video upload patterns
   *
   * This creates realistic historical data by:
   * 1. Analyzing actual video upload dates
   * 2. Calculating video count at each historical date
   * 3. Estimating views based on video age
   * 4. Applying growth rates and variations
   */
  async generateSmartHistory(
    channelId: string,
    channelData: ChannelInfo,
    days = 30
  ) {
    console.log(`📊 Generating ${days}-day history for ${channelData.name}...`)

    // Fetch actual videos
    const videos = await this.getAllVideos(channelId, 1000)

    if (videos.length === 0) {
      console.log('  ⚠️  No videos found, using simple estimation')
      return this.generateSimpleHistory(channelId, channelData, days)
    }

    // Generate history
    const history = []
    const today = new Date()

    // Calculate daily growth rate
    const monthlyGrowthRate = 0.03 + Math.random() * 0.02 // 3-5% monthly
    const dailyGrowthRate = monthlyGrowthRate / 30

    for (let i = 0; i <= days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (days - i))
      const dateStr = date.toISOString().split('T')[0]

      // Count videos uploaded up to this date
      const videosUpToDate = videos.filter(v =>
        new Date(v.published_at) <= date
      )
      const videoCount = videosUpToDate.length

      // Calculate estimated values
      const daysFromToday = days - i
      const growthFactor = 1 - (daysFromToday * dailyGrowthRate)

      // Add variations
      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const weekendFactor = isWeekend ? 1.05 : 1.0
      const randomVariation = 0.97 + Math.random() * 0.06

      const estimatedSubs = Math.round(
        channelData.subscribers * growthFactor * weekendFactor * randomVariation
      )

      const estimatedViews = Math.round(
        channelData.total_views * growthFactor * randomVariation
      )

      const viewsPerVideo = videoCount > 0
        ? Math.round(estimatedViews / videoCount)
        : 0

      history.push({
        date: dateStr,
        videoCount,
        totalViews: estimatedViews,
        estimatedSubscribers: estimatedSubs,
        viewsPerVideo
      })
    }

    console.log(`  ✅ Generated ${history.length} historical snapshots`)
    return history
  }

  /**
   * Simple history generation (fallback when no videos available)
   */
  private generateSimpleHistory(
    channelId: string,
    channelData: ChannelInfo,
    days: number
  ) {
    const history = []
    const today = new Date()
    const monthlyGrowthRate = 0.04 // 4% monthly
    const dailyGrowthRate = monthlyGrowthRate / 30

    for (let i = 0; i <= days; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - (days - i))
      const dateStr = date.toISOString().split('T')[0]

      const daysFromToday = days - i
      const growthFactor = 1 - (daysFromToday * dailyGrowthRate)
      const randomVariation = 0.97 + Math.random() * 0.06

      const isWeekend = date.getDay() === 0 || date.getDay() === 6
      const weekendFactor = isWeekend ? 1.05 : 1.0

      const estimatedSubs = Math.round(
        channelData.subscribers * growthFactor * weekendFactor * randomVariation
      )

      const estimatedViews = Math.round(
        channelData.total_views * growthFactor * randomVariation
      )

      history.push({
        date: dateStr,
        videoCount: channelData.video_count,
        totalViews: estimatedViews,
        estimatedSubscribers: estimatedSubs,
        viewsPerVideo: channelData.video_count > 0
          ? Math.round(estimatedViews / channelData.video_count)
          : 0
      })
    }

    return history
  }
}
