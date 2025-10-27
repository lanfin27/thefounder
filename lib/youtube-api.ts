/**
 * YouTube Data API v3 Utility
 *
 * This utility provides methods to interact with YouTube Data API
 * to collect channel statistics and historical data.
 *
 * API Documentation: https://developers.google.com/youtube/v3/docs
 */

import axios from 'axios'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

interface VideoItem {
  id: string
  snippet: {
    publishedAt: string
    title: string
  }
  statistics: {
    viewCount: string
    likeCount: string
    commentCount: string
  }
}

interface ChannelStats {
  subscribers: number
  totalViews: number
  videoCount: number
}

interface DailyStat {
  date: string
  total_views: number
  video_count: number
  views_per_video: number
  videos_uploaded: number
}

export class YouTubeAPI {
  private apiKey: string

  constructor(apiKey?: string) {
    // Support both YOUTUBE_API_KEY (existing) and YOUTUBE_DATA_API_KEY (new)
    // Priority: parameter > YOUTUBE_API_KEY > YOUTUBE_DATA_API_KEY
    this.apiKey =
      apiKey ||
      process.env.YOUTUBE_API_KEY ||
      process.env.YOUTUBE_DATA_API_KEY ||
      ''

    if (!this.apiKey) {
      throw new Error('YouTube API Key is required. Please set YOUTUBE_API_KEY in .env.local')
    }

    console.log('[YouTube API] ✅ API Key loaded successfully')
  }

  /**
   * Get current channel statistics
   */
  async getChannelStats(channelId: string): Promise<ChannelStats | null> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'statistics',
          id: channelId,
          key: this.apiKey,
        },
      })

      if (!response.data.items || response.data.items.length === 0) {
        console.log(`[YouTube API] ⚠️  Channel not found: ${channelId}`)
        return null
      }

      const stats = response.data.items[0].statistics

      return {
        subscribers: parseInt(stats.subscriberCount || '0'),
        totalViews: parseInt(stats.viewCount || '0'),
        videoCount: parseInt(stats.videoCount || '0'),
      }
    } catch (error: any) {
      console.error(`[YouTube API] ❌ Error fetching channel stats:`, error.message)
      return null
    }
  }

  /**
   * Get uploads playlist ID from channel
   */
  async getUploadsPlaylistId(channelId: string): Promise<string | null> {
    try {
      const response = await axios.get(`${YOUTUBE_API_BASE}/channels`, {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: this.apiKey,
        },
      })

      if (!response.data.items || response.data.items.length === 0) {
        return null
      }

      return response.data.items[0].contentDetails.relatedPlaylists.uploads
    } catch (error: any) {
      console.error(`[YouTube API] ❌ Error fetching uploads playlist:`, error.message)
      return null
    }
  }

  /**
   * Get all video IDs from a playlist (with pagination)
   */
  async getAllVideosFromPlaylist(playlistId: string, maxResults: number = 500): Promise<string[]> {
    const videoIds: string[] = []
    let pageToken: string | undefined = undefined
    let fetchedCount = 0

    try {
      while (fetchedCount < maxResults) {
        const response = await axios.get(`${YOUTUBE_API_BASE}/playlistItems`, {
          params: {
            part: 'contentDetails',
            playlistId: playlistId,
            maxResults: Math.min(50, maxResults - fetchedCount),
            pageToken: pageToken,
            key: this.apiKey,
          },
        })

        const items = response.data.items || []
        const ids = items.map((item: any) => item.contentDetails.videoId)
        videoIds.push(...ids)

        fetchedCount += items.length
        pageToken = response.data.nextPageToken

        console.log(`[YouTube API] 📊 Fetched ${fetchedCount} video IDs...`)

        if (!pageToken || items.length === 0) break

        // Rate limit protection
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[YouTube API] ✅ Total video IDs: ${videoIds.length}`)
      return videoIds
    } catch (error: any) {
      console.error(`[YouTube API] ❌ Error fetching playlist videos:`, error.message)
      return videoIds
    }
  }

  /**
   * Get detailed information for videos (in batches)
   */
  async getVideosDetails(videoIds: string[]): Promise<VideoItem[]> {
    const videos: VideoItem[] = []

    // API allows max 50 videos per request
    const chunks = this.chunkArray(videoIds, 50)

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]

        const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
          params: {
            part: 'snippet,statistics',
            id: chunk.join(','),
            key: this.apiKey,
          },
        })

        videos.push(...(response.data.items || []))

        console.log(`[YouTube API] 📊 Fetched ${videos.length}/${videoIds.length} video details...`)

        // Rate limit protection
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      console.log(`[YouTube API] ✅ Total video details: ${videos.length}`)
      return videos
    } catch (error: any) {
      console.error(`[YouTube API] ❌ Error fetching video details:`, error.message)
      return videos
    }
  }

  /**
   * Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Generate channel history from video data
   */
  async generateChannelHistory(channelId: string, maxVideos: number = 500): Promise<DailyStat[] | null> {
    console.log(`\n[YouTube API] 🚀 Generating history for channel: ${channelId}`)
    console.log(`[YouTube API] 📹 Max videos to fetch: ${maxVideos}`)

    try {
      // 1. Get uploads playlist ID
      const uploadsPlaylistId = await this.getUploadsPlaylistId(channelId)
      if (!uploadsPlaylistId) {
        console.log(`[YouTube API] ❌ Could not find uploads playlist`)
        return null
      }

      console.log(`[YouTube API] ✅ Uploads playlist ID: ${uploadsPlaylistId}`)

      // 2. Get all video IDs
      const videoIds = await this.getAllVideosFromPlaylist(uploadsPlaylistId, maxVideos)
      if (videoIds.length === 0) {
        console.log(`[YouTube API] ⚠️  No videos found`)
        return null
      }

      console.log(`[YouTube API] ✅ Found ${videoIds.length} videos`)

      // 3. Get video details
      const videos = await this.getVideosDetails(videoIds)
      if (videos.length === 0) {
        console.log(`[YouTube API] ⚠️  No video details found`)
        return null
      }

      console.log(`[YouTube API] ✅ Fetched ${videos.length} video details`)

      // 4. Calculate daily statistics
      const dailyStats = this.calculateDailyStats(videos)

      console.log(`[YouTube API] ✅ Generated ${dailyStats.length} daily records`)

      return dailyStats
    } catch (error: any) {
      console.error(`[YouTube API] ❌ Error generating history:`, error.message)
      return null
    }
  }

  /**
   * Convert video data to daily statistics
   */
  private calculateDailyStats(videos: VideoItem[]): DailyStat[] {
    // Group videos by upload date
    const videosByDate: { [date: string]: VideoItem[] } = {}

    videos.forEach(video => {
      const uploadDate = video.snippet.publishedAt.split('T')[0]
      if (!videosByDate[uploadDate]) {
        videosByDate[uploadDate] = []
      }
      videosByDate[uploadDate].push(video)
    })

    // Sort dates
    const dates = Object.keys(videosByDate).sort()

    // Calculate cumulative statistics
    const dailyStats: DailyStat[] = []
    let cumulativeViews = 0
    let cumulativeVideos = 0

    dates.forEach(date => {
      const videosOnDate = videosByDate[date]

      // Sum views for videos uploaded on this date
      const viewsOnDate = videosOnDate.reduce((sum, video) => {
        return sum + parseInt(video.statistics.viewCount || '0')
      }, 0)

      cumulativeViews += viewsOnDate
      cumulativeVideos += videosOnDate.length

      const viewsPerVideo = cumulativeVideos > 0
        ? Math.round(cumulativeViews / cumulativeVideos)
        : 0

      dailyStats.push({
        date,
        total_views: cumulativeViews,
        video_count: cumulativeVideos,
        views_per_video: viewsPerVideo,
        videos_uploaded: videosOnDate.length,
      })
    })

    return dailyStats
  }
}

/**
 * Default YouTube API instance (lazy initialization)
 * Only created when API key is available
 */
export function createYouTubeAPI() {
  return new YouTubeAPI()
}

// Legacy export for backward compatibility (only if API key exists)
let _youtubeAPI: YouTubeAPI | null = null
export function getYouTubeAPI(): YouTubeAPI {
  if (!_youtubeAPI) {
    _youtubeAPI = new YouTubeAPI()
  }
  return _youtubeAPI
}
