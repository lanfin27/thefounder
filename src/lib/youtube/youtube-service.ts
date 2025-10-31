/**
 * YouTube Service
 * YouTube Data API v3 통합 서비스
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { YouTubeAPIQuotaTracker } from './api-quota-tracker'

// Validate API key at module load
if (!process.env.YOUTUBE_API_KEY) {
  console.error('[YouTubeService] CRITICAL: YOUTUBE_API_KEY is not configured in environment variables!')
}

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
  process.env.YT_SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!
)

// Error types for better classification
export enum YouTubeErrorType {
  API_KEY_MISSING = 'API_KEY_MISSING',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  API_ERROR = 'API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNKNOWN = 'UNKNOWN'
}

export interface YouTubeServiceError {
  type: YouTubeErrorType
  message: string
  channelId?: string
  originalError?: any
}

interface VideoData {
  videoId: string
  title: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
}

interface HistoryEntry {
  channel_id: string
  date: string
  subscribers: number
  total_views: number
  video_count: number
  views_per_video: number
  daily_views_per_video: number
  category_code: string
  created_at: string
}

export class YouTubeService {
  private quotaUsed = 0

  /**
   * Fetch real videos from a channel with pagination
   * Returns actual upload dates and view counts
   */
  async fetchChannelVideos(channelId: string, maxVideos: number = 200): Promise<VideoData[]> {
    console.log(`[YouTubeService] 📹 Fetching videos for channel ${channelId}...`)

    const videos: VideoData[] = []
    let pageToken: string | undefined = undefined
    let pageCount = 0

    try {
      // Get video IDs from search (ordered by date)
      while (videos.length < maxVideos && pageCount < 5) {
        pageCount++

        // 🔍 search.list API call (100 units)
        const searchStartTime = Date.now()
        let searchResponse
        try {
          searchResponse = await youtube.search.list({
            part: ['id', 'snippet'],
            channelId,
            maxResults: 50,
            order: 'date',
            type: ['video'],
            pageToken
          })

          // Log successful search.list call
          await this.logAPICall(
            'search.list',
            { channelId, maxResults: 50, order: 'date', pageToken },
            200,
            Date.now() - searchStartTime,
            channelId
          )
        } catch (error: any) {
          // Log failed search.list call
          await this.logAPICall(
            'search.list',
            { channelId, maxResults: 50, order: 'date', pageToken },
            error.code || 500,
            Date.now() - searchStartTime,
            channelId,
            undefined,
            error.message
          )
          throw error
        }

        if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
          break
        }

        const videoIds = searchResponse.data.items
          .filter(item => item.id?.videoId)
          .map(item => item.id!.videoId!)

        // Get detailed statistics for these videos
        if (videoIds.length > 0) {
          // 📊 videos.list API call (1 unit)
          const videosStartTime = Date.now()
          let videosResponse
          try {
            videosResponse = await youtube.videos.list({
              part: ['snippet', 'statistics'],
              id: videoIds
            })

            // Log successful videos.list call
            await this.logAPICall(
              'videos.list',
              { id: videoIds, part: ['snippet', 'statistics'] },
              200,
              Date.now() - videosStartTime,
              channelId
            )
          } catch (error: any) {
            // Log failed videos.list call
            await this.logAPICall(
              'videos.list',
              { id: videoIds, part: ['snippet', 'statistics'] },
              error.code || 500,
              Date.now() - videosStartTime,
              channelId,
              undefined,
              error.message
            )
            throw error
          }

          if (videosResponse.data.items) {
            for (const video of videosResponse.data.items) {
              videos.push({
                videoId: video.id!,
                title: video.snippet?.title || '',
                publishedAt: video.snippet?.publishedAt || '',
                viewCount: parseInt(video.statistics?.viewCount || '0'),
                likeCount: parseInt(video.statistics?.likeCount || '0'),
                commentCount: parseInt(video.statistics?.commentCount || '0')
              })
            }
          }
        }

        pageToken = searchResponse.data.nextPageToken || undefined
        if (!pageToken) break

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      console.log(`[YouTubeService] ✅ Fetched ${videos.length} real videos`)
      return videos

    } catch (error: any) {
      console.error(`[YouTubeService] ❌ Failed to fetch videos:`, error.message)
      return videos
    }
  }

  /**
   * Generate multi-year history based on real video upload patterns
   * NO Math.random(), uses actual video data with proper date filtering
   *
   * Key improvements:
   * - Generates up to 7 years (2555 days) of history data
   * - Filters videos by upload date within analysis period
   * - Calculates daily_views_per_video based on video age and long-term growth curve
   * - Ensures video_count increases realistically over time
   * - Adapts to channel age (won't generate data before channel creation)
   */
  async generateHistoryFromVideos(
    channelId: string,
    currentStats: {
      subscribers: number
      totalViews: number
      videoCount: number
    },
    videos: VideoData[],
    categoryCode: string,
    daysToGenerate: number = 2555 // 7 years default
  ): Promise<HistoryEntry[]> {
    const yearsToGenerate = Math.floor(daysToGenerate / 365)
    console.log(`[YouTubeService] 📊 Generating ${daysToGenerate}-day history (${yearsToGenerate} years) from ${videos.length} videos...`)

    const history: HistoryEntry[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Sort videos by publish date (oldest first) for proper processing
    const sortedVideos = [...videos].sort((a, b) => {
      return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
    })

    // Determine actual generation range based on channel age
    if (sortedVideos.length === 0) {
      console.error('[YouTubeService] ⚠️  No videos found, cannot generate history')
      return []
    }

    const oldestVideoDate = new Date(sortedVideos[0].publishedAt)
    oldestVideoDate.setHours(0, 0, 0, 0)

    const channelAgeInDays = Math.floor(
      (today.getTime() - oldestVideoDate.getTime()) / 86400000
    )

    // Actual days to generate (min of requested days and channel age)
    const actualDaysToGenerate = Math.min(daysToGenerate, channelAgeInDays)

    // Log video date range and channel info
    const oldestVideo = sortedVideos[0]
    const newestVideo = sortedVideos[sortedVideos.length - 1]
    console.log(`[YouTubeService] 📅 Channel age: ${channelAgeInDays} days (${Math.floor(channelAgeInDays/365)} years)`)
    console.log(`[YouTubeService] 📊 Generating: ${actualDaysToGenerate} days of history`)
    console.log(`[YouTubeService] 📹 Video range:`)
    console.log(`   Oldest: ${oldestVideo.publishedAt.split('T')[0]} - "${oldestVideo.title.substring(0, 40)}..."`)
    console.log(`   Newest: ${newestVideo.publishedAt.split('T')[0]} - "${newestVideo.title.substring(0, 40)}..."`)

    // Calculate history for the specified period
    for (let i = actualDaysToGenerate - 1; i >= 0; i--) {
      const currentDate = new Date(today)
      currentDate.setDate(currentDate.getDate() - i)
      currentDate.setHours(0, 0, 0, 0)

      // Filter videos uploaded UP TO this date (using sorted array)
      const videosUntilThisDate = sortedVideos.filter(video => {
        const publishedDate = new Date(video.publishedAt)
        publishedDate.setHours(0, 0, 0, 0)
        return publishedDate <= currentDate
      })

      const videoCount = videosUntilThisDate.length

      // Calculate total views at this date based on video age and growth curve
      const totalViewsAtDate = videosUntilThisDate.reduce((sum, video) => {
        const publishedDate = new Date(video.publishedAt)
        publishedDate.setHours(0, 0, 0, 0)

        // How old is this video today?
        const videoAgeToday = Math.floor(
          (today.getTime() - publishedDate.getTime()) / 86400000
        )

        // How many days ago was currentDate from today?
        const daysAgoFromToday = i

        // How old was this video on currentDate?
        const videoAgeAtDate = videoAgeToday - daysAgoFromToday

        // If video not uploaded yet, skip
        if (videoAgeAtDate < 0) {
          return sum
        }

        // Long-term view growth curve (optimized for multi-year data)
        // Upload day: 10%
        // First week (1-7 days): 10% → 50% (rapid growth)
        // First month (8-30 days): 50% → 75% (medium growth)
        // First quarter (31-90 days): 75% → 90% (gradual growth)
        // First year (91-365 days): 90% → 97% (slow growth)
        // After 1 year: 97% → 100% (very slow, 3-year plateau)
        let viewsAtDate: number
        if (videoAgeAtDate <= 0) {
          // Upload day
          viewsAtDate = video.viewCount * 0.1
        } else if (videoAgeAtDate <= 7) {
          // First week: rapid growth 10% → 50%
          viewsAtDate = video.viewCount * (0.1 + (videoAgeAtDate / 7) * 0.4)
        } else if (videoAgeAtDate <= 30) {
          // First month: medium growth 50% → 75%
          viewsAtDate = video.viewCount * (0.5 + ((videoAgeAtDate - 7) / 23) * 0.25)
        } else if (videoAgeAtDate <= 90) {
          // First quarter: gradual growth 75% → 90%
          viewsAtDate = video.viewCount * (0.75 + ((videoAgeAtDate - 30) / 60) * 0.15)
        } else if (videoAgeAtDate <= 365) {
          // First year: slow growth 90% → 97%
          viewsAtDate = video.viewCount * (0.9 + ((videoAgeAtDate - 90) / 275) * 0.07)
        } else {
          // After 1 year: very slow growth 97% → 100% (3-year plateau)
          const additionalYears = Math.min((videoAgeAtDate - 365) / 365, 3)
          viewsAtDate = video.viewCount * (0.97 + (additionalYears / 3) * 0.03)
        }

        return sum + viewsAtDate
      }, 0)

      // Calculate views per video
      const viewsPerVideo = videoCount > 0
        ? Math.floor(totalViewsAtDate / videoCount)
        : 0

      // Calculate daily views per video
      // This is an estimate of daily view accumulation rate
      const oldestVideoInSet = videosUntilThisDate.length > 0
        ? new Date(videosUntilThisDate[videosUntilThisDate.length - 1].publishedAt)
        : currentDate

      oldestVideoInSet.setHours(0, 0, 0, 0)

      const daysSinceOldestVideo = Math.max(1, Math.floor(
        (currentDate.getTime() - oldestVideoInSet.getTime()) / 86400000
      ))

      const dailyViewsPerVideo = videoCount > 0
        ? Math.floor(viewsPerVideo / daysSinceOldestVideo)
        : 0

      // Estimate subscribers (linear growth over the entire period)
      // 7 years ago: 30% of current, Today: 100% of current
      const growthProgress = (actualDaysToGenerate - 1 - i) / (actualDaysToGenerate - 1)
      const estimatedSubscribers = Math.floor(
        currentStats.subscribers * (0.3 + 0.7 * growthProgress)
      )

      history.push({
        channel_id: channelId,
        date: currentDate.toISOString().split('T')[0],
        subscribers: estimatedSubscribers,
        total_views: Math.floor(totalViewsAtDate),
        video_count: videoCount,
        views_per_video: viewsPerVideo,
        daily_views_per_video: dailyViewsPerVideo,
        category_code: categoryCode,
        created_at: new Date().toISOString()
      })
    }

    console.log(`[YouTubeService] ✅ Generated ${history.length} history entries`)
    if (history.length > 0) {
      const first = history[0]
      const last = history[history.length - 1]

      console.log(`[YouTubeService]    Date range: ${first.date} → ${last.date}`)
      console.log(`[YouTubeService]    First: ${first.subscribers.toLocaleString()} subs, ${first.video_count} videos, ${first.daily_views_per_video.toLocaleString()} daily views/video`)
      console.log(`[YouTubeService]    Last:  ${last.subscribers.toLocaleString()} subs, ${last.video_count} videos, ${last.daily_views_per_video.toLocaleString()} daily views/video`)

      // Critical check: Video count should vary for realistic data
      if (first.video_count === last.video_count) {
        console.warn(`[YouTubeService] ⚠️  WARNING: Video count did not change over ${actualDaysToGenerate} days! (${first.video_count})`)
        console.warn(`[YouTubeService] ⚠️  This might indicate all ${videos.length} fetched videos were uploaded before the analysis window.`)
        console.warn(`[YouTubeService] ⚠️  Consider fetching more videos or this may be normal for inactive channels.`)
      } else {
        console.log(`[YouTubeService] ✅ Video count changed: ${first.video_count} → ${last.video_count} (+${last.video_count - first.video_count})`)
      }
    }

    return history
  }

  /**
   * Save channel history to database
   * Replaces old flat-line data with real video-based history
   */
  async saveChannelHistory(
    channelId: string,
    history: HistoryEntry[]
  ): Promise<void> {
    try {
      console.log(`[YouTubeService] 💾 Saving ${history.length} history records...`)

      // 1. Delete old history
      console.log(`[YouTubeService]    Deleting old history for channel...`)
      const { error: deleteError } = await supabase
        .from('youtube_channel_history')
        .delete()
        .eq('channel_id', channelId)

      if (deleteError) {
        console.error(`[YouTubeService] ❌ Delete error:`, deleteError)
        throw deleteError
      }
      console.log(`[YouTubeService]    ✓ Old history deleted`)

      // 2. Insert new history in batches (optimized for large datasets)
      const batchSize = 100  // Increased from 10 for better performance with 7-year data
      const totalBatches = Math.ceil(history.length / batchSize)

      for (let i = 0; i < history.length; i += batchSize) {
        const batch = history.slice(i, i + batchSize)
        const batchNum = Math.floor(i / batchSize) + 1

        const { error: insertError } = await supabase
          .from('youtube_channel_history')
          .insert(batch)

        if (insertError) {
          console.error(`[YouTubeService] ❌ Insert error (batch ${batchNum}/${totalBatches}):`, insertError)
          throw insertError
        }

        console.log(`[YouTubeService]    ✓ Inserted batch ${batchNum}/${totalBatches} (${batch.length} records)`)
      }

      console.log(`[YouTubeService] ✅ History saved successfully`)

    } catch (error: any) {
      console.error(`[YouTubeService] ❌ Failed to save history:`, error)

      // Check for specific Supabase connection errors
      if (error.code === 'ENOTFOUND' || error.message?.includes('ENOTFOUND')) {
        console.error(`[YouTubeService] ❌ CRITICAL: Cannot connect to Supabase!`)
        console.error(`[YouTubeService] Please check:`)
        console.error(`  1. Internet connection`)
        console.error(`  2. NEXT_PUBLIC_YT_SUPABASE_URL in .env.local`)
        console.error(`  3. Supabase project status at https://app.supabase.com`)
      }

      throw error
    }
  }

  /**
   * 단일 채널 데이터 업데이트
   * NOW INCLUDES: History generation from real videos
   */
  async updateChannelData(channelId: string) {
    const startTime = Date.now()
    let channelName = 'Unknown'

    try {
      // 1️⃣ API 키 검증
      if (!process.env.YOUTUBE_API_KEY) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.API_KEY_MISSING,
          message: 'YouTube API key is not configured. Please set YOUTUBE_API_KEY in .env.local',
          channelId
        }
        console.error(`[YouTubeService] ${error.message}`, { channelId })
        throw error
      }

      // 2️⃣ 할당량 사전 체크
      console.log('[YouTubeService] 🔍 Checking API quota...')
      const { canUpdate, remaining } = await YouTubeAPIQuotaTracker.canUpdate(1)

      if (!canUpdate) {
        console.error('[YouTubeService] ❌ API quota exhausted')
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.QUOTA_EXCEEDED,
          message: `YouTube API quota exceeded. Remaining: ${remaining} units`,
          channelId
        }

        // Track failed attempt (0 units)
        await YouTubeAPIQuotaTracker.trackUsage({
          operationType: 'channel_update',
          channelId,
          channelName: 'Unknown',
          unitsUsed: 0,
          success: false,
          errorMessage: 'QUOTA_EXCEEDED_BEFORE_API_CALL'
        })

        throw error
      }

      console.log(`[YouTubeService] ✅ Quota check passed. Remaining: ${remaining} units`)
      console.log(`[YouTubeService] Updating channel: ${channelId}`)

      // 📡 channels.list API call (1 unit)
      const channelsStartTime = Date.now()
      let response
      try {
        response = await youtube.channels.list({
          part: ['snippet', 'statistics', 'contentDetails'],
          id: [channelId]
        })

        // Log successful channels.list call
        await this.logAPICall(
          'channels.list',
          { id: channelId, part: ['snippet', 'statistics', 'contentDetails'] },
          200,
          Date.now() - channelsStartTime,
          channelId
        )
      } catch (error: any) {
        // Log failed channels.list call
        await this.logAPICall(
          'channels.list',
          { id: channelId, part: ['snippet', 'statistics', 'contentDetails'] },
          error.code || 500,
          Date.now() - channelsStartTime,
          channelId,
          undefined,
          error.message
        )
        throw error
      }

      // Channel not found 체크
      if (!response.data.items || response.data.items.length === 0) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.CHANNEL_NOT_FOUND,
          message: `Channel not found on YouTube: ${channelId}`,
          channelId
        }

        console.warn(`[YouTubeService] ${error.message}`)

        // Note: API call already logged above with 200 status
        // YouTube returns 200 even for "not found" cases

        throw error
      }

      const channel = response.data.items[0]
      const stats = channel.statistics
      channelName = channel.snippet?.title || 'Unknown'

      // 영상당 조회수 계산
      const viewsPerVideo = stats?.viewCount && stats?.videoCount
        ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount))
        : 0

      console.log(`[YouTubeService] Fetched data for "${channelName}":`, {
        subscribers: stats?.subscriberCount,
        videoCount: stats?.videoCount,
        viewsPerVideo
      })

      // 데이터베이스 업데이트
      const { error: dbError } = await supabase
        .from('youtube_channels')
        .update({
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnail_url: channel.snippet?.thumbnails?.default?.url,
          subscribers: parseInt(stats?.subscriberCount || '0'),
          total_views: parseInt(stats?.viewCount || '0'),
          video_count: parseInt(stats?.videoCount || '0'),
          views_per_video: viewsPerVideo,
          updated_at: new Date().toISOString(),
          // ✅ 성공 시 에러 상태 초기화
          status: 'active',
          error_message: null,
          last_error_at: null
        })
        .eq('channel_id', channelId)

      if (dbError) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.DATABASE_ERROR,
          message: `Database update failed: ${dbError.message}`,
          channelId,
          originalError: dbError
        }

        console.error(`[YouTubeService] ${error.message}`, dbError)

        // API 로그 저장 (성공적으로 가져왔지만 DB 저장 실패)
        await supabase.from('youtube_api_logs').insert({
          endpoint: 'channels.list',
          parameters: { id: channelId },
          response_status: 200,
          units_used: 1,
          duration_ms: Date.now() - startTime,
          error_message: `DB Error: ${dbError.message}`,
          channel_id: channelId
        })

        throw error
      }

      // 성공 로그 저장
      await supabase.from('youtube_api_logs').insert({
        endpoint: 'channels.list',
        parameters: { id: channelId },
        response_status: 200,
        units_used: 1,
        duration_ms: Date.now() - startTime,
        channel_id: channelId
      })

      // API 사용량 업데이트
      await this.updateQuotaUsage(1)

      console.log(`[YouTubeService] ✓ Successfully updated: ${channel.snippet?.title}`)

      // ✅ NEW: Generate history from real videos
      try {
        console.log(`[YouTubeService] 📊 Generating history for ${channel.snippet?.title}...`)

        // Get channel's category code
        const { data: channelData } = await supabase
          .from('youtube_channels')
          .select('category_code')
          .eq('channel_id', channelId)
          .single()

        const categoryCode = channelData?.category_code || 'Y05'

        // Fetch real videos
        // Fetch up to 500 videos for better 7-year history coverage
        const videos = await this.fetchChannelVideos(channelId, 500)

        if (videos.length > 0) {
          // Generate 7-year history from real video data (2555 days)
          const history = await this.generateHistoryFromVideos(
            channelId,
            {
              subscribers: parseInt(stats?.subscriberCount || '0'),
              totalViews: parseInt(stats?.viewCount || '0'),
              videoCount: parseInt(stats?.videoCount || '0')
            },
            videos,
            categoryCode,
            2555 // Generate 7 years (2555 days) of history
          )

          // Save history to database
          await this.saveChannelHistory(channelId, history)

          console.log(`[YouTubeService] ✅ History generated and saved!`)
        } else {
          console.log(`[YouTubeService] ⚠️  No videos found, skipping history generation`)
        }
      } catch (historyError: any) {
        // Don't fail the whole update if history generation fails
        console.error(`[YouTubeService] ⚠️  History generation failed:`, historyError.message)
        console.error(`[YouTubeService] Channel update succeeded, but history update failed`)
      }

      // 3️⃣ 성공 시 API 사용량 기록
      const unitsUsed = YouTubeAPIQuotaTracker.calculateChannelUpdateCost()
      const duration = Date.now() - startTime

      await YouTubeAPIQuotaTracker.trackUsage({
        operationType: 'channel_update',
        channelId,
        channelName,
        unitsUsed,
        success: true
      })

      console.log(`[YouTubeService] ✓ Successfully updated: ${channelName}`)
      console.log(`[QuotaTracker] 📊 Tracked ${unitsUsed} units (Duration: ${duration}ms)`)

      return {
        success: true,
        channel: channelName,
        channelId,
        stats: {
          subscribers: parseInt(stats?.subscriberCount || '0'),
          views: parseInt(stats?.viewCount || '0'),
          videos: parseInt(stats?.videoCount || '0')
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime

      // 이미 YouTubeServiceError인 경우 그대로 throw (이미 추적됨)
      if (error.type && Object.values(YouTubeErrorType).includes(error.type)) {
        throw error
      }

      // YouTube API 에러 분류
      let errorType = YouTubeErrorType.UNKNOWN
      let errorMessage = 'Unknown error'

      // 4️⃣ 할당량 초과 에러 특별 처리
      if (error.code === 403 || error.status === 403) {
        const isQuotaError = error.message?.includes('quota') ||
                            error.message?.includes('exceeded') ||
                            error.errors?.[0]?.reason === 'quotaExceeded'

        if (isQuotaError) {
          errorType = YouTubeErrorType.QUOTA_EXCEEDED
          errorMessage = 'YouTube API 일일 할당량 초과 (10,000 units)'

          console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          console.error(`🚫 YouTube API 할당량 초과!`)
          console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
          console.error(`📌 채널: ${channelId}`)
          console.error(`⏱️  소요 시간: ${duration}ms`)
          console.error(``)
          console.error(`💡 해결 방법:`)
          console.error(`   1. 내일 자정(PST)까지 대기`)
          console.error(`   2. Google Cloud Console에서 새 프로젝트 생성`)
          console.error(`   3. 새 YouTube Data API v3 키 발급`)
          console.error(`   4. .env.local의 YOUTUBE_API_KEY 업데이트`)
          console.error(`   5. 서버 재시작 (npm run dev)`)
          console.error(``)
          console.error(`🔗 Google Cloud Console:`)
          console.error(`   https://console.cloud.google.com/apis/credentials`)
          console.error(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

          // 실패도 기록 (0 units, 이미 사용된 것으로 간주)
          await YouTubeAPIQuotaTracker.trackUsage({
            operationType: 'channel_update',
            channelId,
            channelName,
            unitsUsed: 0,
            success: false,
            errorMessage: 'QUOTA_EXCEEDED_403'
          })

          const serviceError: YouTubeServiceError = {
            type: errorType,
            message: errorMessage,
            channelId,
            originalError: error
          }

          throw serviceError
        }
      }

      // 5️⃣ 기타 에러 처리
      if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
        errorType = YouTubeErrorType.NETWORK_ERROR
        errorMessage = 'Network error connecting to YouTube API'
      } else if (error.response?.data?.error) {
        errorType = YouTubeErrorType.API_ERROR
        errorMessage = `YouTube API error: ${error.response.data.error.message || error.message}`
      } else {
        errorMessage = error.message || 'Unknown error occurred'
      }

      console.error(`[YouTubeService] Channel update failed (${errorType}):`, {
        channelId,
        error: errorMessage,
        duration: `${duration}ms`
      })

      // 실패도 기록
      await YouTubeAPIQuotaTracker.trackUsage({
        operationType: 'channel_update',
        channelId,
        channelName,
        unitsUsed: 0,
        success: false,
        errorMessage: errorMessage
      })

      // 에러 로그 저장 (기존)
      await supabase.from('youtube_api_logs').insert({
        endpoint: 'channels.list',
        parameters: { id: channelId },
        response_status: error.code || 500,
        error_message: errorMessage,
        units_used: 0,
        duration_ms: duration,
        channel_id: channelId
      })

      const serviceError: YouTubeServiceError = {
        type: errorType,
        message: errorMessage,
        channelId,
        originalError: error
      }

      throw serviceError
    }
  }

  /**
   * 전체 채널 업데이트
   */
  async updateAllChannels(categories?: string[]) {
    console.log('[YouTubeService] Starting bulk channel update...', { categories })

    // 채널 목록 가져오기
    let query = supabase.from('youtube_channels').select('*')
    if (categories?.length) {
      query = query.in('category_code', categories)
    }

    const { data: channels, error } = await query

    if (error) {
      console.error('[YouTubeService] Failed to fetch channels from database:', error)
      throw error
    }

    if (!channels || channels.length === 0) {
      console.warn('[YouTubeService] No channels found to update')
      return {
        updated: 0,
        failed: 0,
        total: 0,
        errors: {}
      }
    }

    console.log(`[YouTubeService] Found ${channels.length} channels to update`)

    let updated = 0
    const errors: {
      notFound: string[]
      apiError: string[]
      databaseError: string[]
      quotaExceeded: string[]
      other: string[]
    } = {
      notFound: [],
      apiError: [],
      databaseError: [],
      quotaExceeded: [],
      other: []
    }

    for (const channel of channels) {
      try {
        await this.updateChannelData(channel.channel_id)
        updated++

        const progress = ((updated + Object.values(errors).flat().length) / channels.length * 100).toFixed(1)
        console.log(`[YouTubeService] Progress: ${updated} updated, ${Object.values(errors).flat().length} failed (${progress}%)`)

        // Rate limiting - YouTube API는 초당 요청 제한이 있음
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error: any) {
        const errorMessage = error.message || 'Unknown error'

        // 에러 분류
        if (error.type === YouTubeErrorType.CHANNEL_NOT_FOUND) {
          errors.notFound.push(channel.channel_id)
          console.warn(`[YouTubeService] Channel not found: ${channel.title || channel.channel_id}`)
        } else if (error.type === YouTubeErrorType.DATABASE_ERROR) {
          errors.databaseError.push(channel.channel_id)
          console.error(`[YouTubeService] Database error for ${channel.title || channel.channel_id}:`, error.message)
        } else if (error.type === YouTubeErrorType.QUOTA_EXCEEDED) {
          errors.quotaExceeded.push(channel.channel_id)
          console.error(`[YouTubeService] Quota exceeded at channel: ${channel.title || channel.channel_id}`)
          // 할당량 초과 시 즉시 중단
          console.error('[YouTubeService] Stopping bulk update due to quota limit')
          break
        } else if (error.type === YouTubeErrorType.API_ERROR) {
          errors.apiError.push(channel.channel_id)
          console.error(`[YouTubeService] API error for ${channel.title || channel.channel_id}:`, error.message)
        } else {
          errors.other.push(channel.channel_id)
          console.error(`[YouTubeService] Unknown error for ${channel.title || channel.channel_id}:`, error)
        }

        // 🔥 핵심 추가: 실패한 채널의 상태를 에러로 설정
        try {
          console.log(`[YouTubeService] Setting error status for channel: ${channel.id}`)

          const { error: statusUpdateError } = await supabase
            .from('youtube_channels')
            .update({
              status: 'error',
              error_message: errorMessage.substring(0, 500), // 길이 제한
              last_error_at: new Date().toISOString(),
              updated_at: new Date().toISOString(), // 업데이트 시도는 했으니 기록
            })
            .eq('id', channel.id)

          if (statusUpdateError) {
            console.error(`[YouTubeService] ✗ Failed to set error status:`, statusUpdateError)
          } else {
            console.log(`[YouTubeService] ✓ Error status set for: ${channel.title || channel.channel_id}`)
          }
        } catch (statusError) {
          console.error(`[YouTubeService] ✗ Exception setting error status:`, statusError)
        }

        // API 에러나 할당량 문제가 아닌 경우에만 계속 진행
        if (error.type !== YouTubeErrorType.QUOTA_EXCEEDED) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    const totalFailed = Object.values(errors).flat().length

    console.log(`[YouTubeService] ✓ Bulk update complete:`, {
      total: channels.length,
      updated,
      failed: totalFailed,
      breakdown: {
        notFound: errors.notFound.length,
        apiError: errors.apiError.length,
        databaseError: errors.databaseError.length,
        quotaExceeded: errors.quotaExceeded.length,
        other: errors.other.length
      }
    })

    return {
      updated,
      failed: totalFailed,
      total: channels.length,
      errors: {
        notFound: errors.notFound.length,
        apiError: errors.apiError.length,
        databaseError: errors.databaseError.length,
        quotaExceeded: errors.quotaExceeded.length,
        other: errors.other.length
      },
      errorDetails: errors
    }
  }

  /**
   * API 사용량 업데이트
   */
  private async updateQuotaUsage(units: number) {
    try {
      const { data: config } = await supabase
        .from('youtube_api_config')
        .select('*')
        .eq('is_primary', true)
        .single()

      if (config) {
        await supabase
          .from('youtube_api_config')
          .update({
            used_today: (config.used_today || 0) + units
          })
          .eq('id', config.id)
      }
    } catch (error) {
      console.warn('Failed to update quota usage:', error)
    }
  }

  /**
   * 오늘의 API 사용량 조회
   */
  async getQuotaUsage() {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: logs } = await supabase
        .from('youtube_api_logs')
        .select('units_used')
        .gte('timestamp', today.toISOString())

      const used = logs?.reduce((sum, log) => sum + (log.units_used || 0), 0) || 0

      return {
        used,
        limit: 10000,
        percentage: (used / 10000) * 100
      }
    } catch (error) {
      console.error('Failed to get quota usage:', error)
      return { used: 0, limit: 10000, percentage: 0 }
    }
  }

  /**
   * 채널 존재 여부 및 기본 정보 확인
   */
  async verifyChannelExists(channelId: string): Promise<{
    exists: boolean
    title?: string
    description?: string
    thumbnailUrl?: string
    subscriberCount?: number
    videoCount?: number
    viewCount?: number
    error?: string
  }> {
    try {
      console.log(`[YouTubeService] === VERIFY CHANNEL START ===`)
      console.log(`[YouTubeService] Channel ID: ${channelId}`)
      console.log(`[YouTubeService] API Key present: ${!!process.env.YOUTUBE_API_KEY}`)
      console.log(`[YouTubeService] API Key value: ${process.env.YOUTUBE_API_KEY}`)

      console.log(`[YouTubeService] Calling YouTube Data API...`)
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: [channelId]
      })

      console.log(`[YouTubeService] YouTube API Response received`)
      console.log(`[YouTubeService] Response status: ${response.status}`)
      console.log(`[YouTubeService] Items count: ${response.data.items?.length || 0}`)

      if (!response.data.items || response.data.items.length === 0) {
        console.log(`[YouTubeService] ✗ Channel not found on YouTube`)
        return {
          exists: false,
          error: 'Channel not found on YouTube'
        }
      }

      const channel = response.data.items[0]
      const stats = channel.statistics

      console.log(`[YouTubeService] ✓ Channel found:`, {
        title: channel.snippet?.title,
        subscribers: stats?.subscriberCount,
        videos: stats?.videoCount
      })

      return {
        exists: true,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        thumbnailUrl: channel.snippet?.thumbnails?.default?.url,
        subscriberCount: parseInt(stats?.subscriberCount || '0'),
        videoCount: parseInt(stats?.videoCount || '0'),
        viewCount: parseInt(stats?.viewCount || '0')
      }

    } catch (error: any) {
      console.error(`[YouTubeService] ✗ Error verifying channel:`, {
        message: error.message,
        code: error.code,
        status: error.status,
        errors: error.errors,
        response: error.response?.data
      })

      return {
        exists: false,
        error: error.message || 'Failed to verify channel'
      }
    }
  }

  /**
   * 채널 중복 확인
   */
  async checkChannelDuplicate(channelId: string, categoryCode?: string): Promise<{
    isDuplicate: boolean
    existingChannel?: any
  }> {
    try {
      let query = supabase
        .from('youtube_channels')
        .select('*')
        .eq('channel_id', channelId)

      // 삭제된 채널 제외 (재활성화 가능)
      query = query.neq('status', 'deleted')

      const { data, error } = await query.single()

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = no rows found (정상)
        throw error
      }

      return {
        isDuplicate: !!data,
        existingChannel: data || undefined
      }

    } catch (error) {
      console.error(`[YouTubeService] Error checking duplicate:`, error)
      throw error
    }
  }

  /**
   * 채널 추가 (검증 + DB 저장)
   */
  async addChannel(params: {
    channelId: string
    categoryCode: string
    addedBy: string
    notes?: string
  }): Promise<{
    success: boolean
    channel?: any
    error?: string
  }> {
    try {
      const { channelId, categoryCode, addedBy, notes } = params

      console.log(`[YouTubeService] Adding channel: ${channelId} to category ${categoryCode}`)

      // 1. 중복 확인
      const duplicate = await this.checkChannelDuplicate(channelId)
      if (duplicate.isDuplicate) {
        return {
          success: false,
          error: `Channel already exists: ${duplicate.existingChannel.title || channelId}`
        }
      }

      // 2. YouTube에서 채널 정보 가져오기
      const verification = await this.verifyChannelExists(channelId)
      if (!verification.exists) {
        return {
          success: false,
          error: verification.error || 'Channel not found on YouTube'
        }
      }

      // 3. 카테고리 존재 확인
      const { data: category } = await supabase
        .from('youtube_categories')
        .select('id')
        .eq('code', categoryCode)
        .single()

      if (!category) {
        return {
          success: false,
          error: `Category not found: ${categoryCode}`
        }
      }

      // 4. DB에 채널 추가
      console.log('[YouTubeService] === PREPARING DB INSERT ===')
      console.log('[YouTubeService] Channel ID:', channelId)
      console.log('[YouTubeService] Category:', categoryCode)
      console.log('[YouTubeService] Title (will be used for name):', verification.title)
      console.log('[YouTubeService] Subscribers:', verification.subscriberCount)
      console.log('[YouTubeService] Videos:', verification.videoCount)

      const insertData = {
        channel_id: channelId,
        category_code: categoryCode,
        name: verification.title,  // 🔥 핵심 수정: name 필드 추가!
        title: verification.title,
        description: verification.description,
        thumbnail_url: verification.thumbnailUrl,
        subscribers: verification.subscriberCount || 0,
        total_views: verification.viewCount || 0,
        video_count: verification.videoCount || 0,
        views_per_video: verification.videoCount
          ? Math.round((verification.viewCount || 0) / verification.videoCount)
          : 0,
        is_active: true,
        status: 'active',
        added_by: addedBy,
        added_at: new Date().toISOString(),
        notes: notes || null,
        updated_at: new Date().toISOString()
      }

      console.log('[YouTubeService] Insert data prepared:')
      console.log('[YouTubeService] - name:', insertData.name)
      console.log('[YouTubeService] - name type:', typeof insertData.name)
      console.log('[YouTubeService] - name is null?:', insertData.name === null)
      console.log('[YouTubeService] - name is undefined?:', insertData.name === undefined)
      console.log('[YouTubeService] - title:', insertData.title)

      const { data: channel, error: insertError } = await supabase
        .from('youtube_channels')
        .insert(insertData)
        .select()
        .single()

      if (insertError) {
        console.error('[YouTubeService] ✗ Error inserting channel:', insertError)
        console.error('[YouTubeService] Error code:', insertError.code)
        console.error('[YouTubeService] Error message:', insertError.message)
        console.error('[YouTubeService] Error details:', insertError.details)
        console.error('[YouTubeService] Attempted insert data:', insertData)
        return {
          success: false,
          error: `Database error: ${insertError.message}`
        }
      }

      console.log(`[YouTubeService] ✓ Channel added successfully: ${verification.title}`)

      return {
        success: true,
        channel
      }

    } catch (error: any) {
      console.error(`[YouTubeService] Error adding channel:`, error)
      return {
        success: false,
        error: error.message || 'Failed to add channel'
      }
    }
  }

  /**
   * 채널 제거 (soft delete)
   */
  async removeChannel(
    channelId: string,
    deletedBy: string,
    reason?: string,
    hardDelete: boolean = false
  ): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`[YouTubeService] Removing channel: ${channelId} (hard: ${hardDelete})`)

      if (hardDelete) {
        // 완전 삭제
        const { error } = await supabase
          .from('youtube_channels')
          .delete()
          .eq('channel_id', channelId)

        if (error) {
          return {
            success: false,
            error: `Failed to delete channel: ${error.message}`
          }
        }

        console.log(`[YouTubeService] ✓ Channel permanently deleted: ${channelId}`)

      } else {
        // Soft delete (비활성화)
        const { error } = await supabase
          .from('youtube_channels')
          .update({
            is_active: false,
            status: 'deleted',
            deleted_by: deletedBy,
            deleted_at: new Date().toISOString(),
            deletion_reason: reason || null
          })
          .eq('channel_id', channelId)

        if (error) {
          return {
            success: false,
            error: `Failed to deactivate channel: ${error.message}`
          }
        }

        console.log(`[YouTubeService] ✓ Channel deactivated: ${channelId}`)
      }

      return { success: true }

    } catch (error: any) {
      console.error(`[YouTubeService] Error removing channel:`, error)
      return {
        success: false,
        error: error.message || 'Failed to remove channel'
      }
    }
  }

  /**
   * 채널 재활성화
   */
  async reactivateChannel(channelId: string): Promise<{
    success: boolean
    error?: string
  }> {
    try {
      console.log(`[YouTubeService] Reactivating channel: ${channelId}`)

      // 채널이 여전히 YouTube에 존재하는지 확인
      const verification = await this.verifyChannelExists(channelId)
      if (!verification.exists) {
        return {
          success: false,
          error: 'Channel no longer exists on YouTube'
        }
      }

      // 재활성화
      const { error } = await supabase
        .from('youtube_channels')
        .update({
          is_active: true,
          status: 'active',
          deleted_by: null,
          deleted_at: null,
          deletion_reason: null,
          error_message: null,
          last_error_at: null
        })
        .eq('channel_id', channelId)

      if (error) {
        return {
          success: false,
          error: `Failed to reactivate channel: ${error.message}`
        }
      }

      console.log(`[YouTubeService] ✓ Channel reactivated: ${channelId}`)

      return { success: true }

    } catch (error: any) {
      console.error(`[YouTubeService] Error reactivating channel:`, error)
      return {
        success: false,
        error: error.message || 'Failed to reactivate channel'
      }
    }
  }

  /**
   * Fetch only new videos since last update
   * Reduces API cost by only fetching recent content
   *
   * @param channelId Channel ID
   * @param publishedAfter ISO date string to fetch videos after this date
   * @param maxResults Maximum number of videos to fetch (default: 50)
   * @returns Array of new videos
   */
  async fetchNewVideos(
    channelId: string,
    publishedAfter?: string,
    maxResults: number = 50
  ): Promise<VideoData[]> {
    console.log(`[YouTubeService] 📹 Fetching new videos for ${channelId}...`)

    // If no publishedAfter provided, get from last update
    if (!publishedAfter) {
      const { data: lastHistory } = await supabase
        .from('youtube_channel_history')
        .select('created_at')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (lastHistory) {
        publishedAfter = new Date(lastHistory.created_at).toISOString()
      } else {
        // No history, fetch from 7 days ago
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
        publishedAfter = sevenDaysAgo.toISOString()
      }
    }

    console.log(`[YouTubeService] Looking for videos published after ${publishedAfter}`)

    const videos: VideoData[] = []

    try {
      // Fetch recent videos using search API
      const searchResponse = await youtube.search.list({
        part: ['id', 'snippet'],
        channelId,
        maxResults,
        order: 'date',
        type: ['video'],
        publishedAfter
      })

      if (!searchResponse.data.items || searchResponse.data.items.length === 0) {
        console.log(`[YouTubeService] No new videos found`)
        return videos
      }

      const videoIds = searchResponse.data.items
        .filter(item => item.id?.videoId)
        .map(item => item.id!.videoId!)

      // Get detailed statistics for these videos
      if (videoIds.length > 0) {
        const videosResponse = await youtube.videos.list({
          part: ['snippet', 'statistics'],
          id: videoIds
        })

        if (videosResponse.data.items) {
          for (const video of videosResponse.data.items) {
            videos.push({
              videoId: video.id!,
              title: video.snippet?.title || '',
              publishedAt: video.snippet?.publishedAt || '',
              viewCount: parseInt(video.statistics?.viewCount || '0'),
              likeCount: parseInt(video.statistics?.likeCount || '0'),
              commentCount: parseInt(video.statistics?.commentCount || '0')
            })
          }
        }
      }

      console.log(`[YouTubeService] ✅ Fetched ${videos.length} new videos`)
      return videos

    } catch (error: any) {
      console.error(`[YouTubeService] ❌ Failed to fetch new videos:`, error.message)
      return videos
    }
  }

  /**
   * Incremental channel update
   * Only fetches new content since last update, reducing API cost by ~80%
   *
   * Cost breakdown:
   * - channels.list: 1 unit
   * - search.list: 100 units (1 page for recent videos)
   * - videos.list: 1 unit
   * Total: ~102 units (vs 506 for full update)
   *
   * @param channelId Channel ID to update
   * @returns Update result
   */
  async incrementalUpdateChannel(channelId: string) {
    const startTime = Date.now()
    let channelName = 'Unknown'

    try {
      // 1️⃣ API 키 검증
      if (!process.env.YOUTUBE_API_KEY) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.API_KEY_MISSING,
          message: 'YouTube API key is not configured',
          channelId
        }
        console.error(`[YouTubeService] ${error.message}`)
        throw error
      }

      // 2️⃣ 할당량 사전 체크 (incremental cost)
      console.log('[YouTubeService] 🔍 Checking API quota for incremental update...')
      const incrementalCost = YouTubeAPIQuotaTracker.calculateIncrementalUpdateCost()
      const remaining = await YouTubeAPIQuotaTracker.getRemainingQuota()

      if (incrementalCost > remaining) {
        console.error('[YouTubeService] ❌ Insufficient quota for incremental update')
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.QUOTA_EXCEEDED,
          message: `Insufficient quota. Need ${incrementalCost}, have ${remaining}`,
          channelId
        }

        await YouTubeAPIQuotaTracker.trackUsage({
          operationType: 'incremental_update',
          channelId,
          channelName: 'Unknown',
          unitsUsed: 0,
          success: false,
          errorMessage: 'QUOTA_CHECK_FAILED',
          updateType: 'bulk_incremental'
        })

        throw error
      }

      console.log(`[YouTubeService] ✅ Quota check passed (incremental)`)
      console.log(`[YouTubeService] Incremental update for: ${channelId}`)

      // 3️⃣ Fetch channel basic info
      const channelResponse = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId]
      })

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        throw {
          type: YouTubeErrorType.CHANNEL_NOT_FOUND,
          message: `Channel not found: ${channelId}`,
          channelId
        }
      }

      const channel = channelResponse.data.items[0]
      const stats = channel.statistics
      channelName = channel.snippet?.title || 'Unknown'

      // 4️⃣ Fetch only new videos
      const newVideos = await this.fetchNewVideos(channelId, undefined, 50)

      console.log(`[YouTubeService] 📊 Incremental update for "${channelName}":`, {
        subscribers: stats?.subscriberCount,
        videoCount: stats?.videoCount,
        newVideos: newVideos.length
      })

      // 5️⃣ Update database with current stats
      const viewsPerVideo = stats?.viewCount && stats?.videoCount
        ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount))
        : 0

      const { error: dbError } = await supabase
        .from('youtube_channels')
        .update({
          title: channel.snippet?.title,
          description: channel.snippet?.description,
          thumbnail_url: channel.snippet?.thumbnails?.default?.url,
          subscribers: parseInt(stats?.subscriberCount || '0'),
          total_views: parseInt(stats?.viewCount || '0'),
          video_count: parseInt(stats?.videoCount || '0'),
          views_per_video: viewsPerVideo,
          updated_at: new Date().toISOString(),
          status: 'active',
          error_message: null,
          last_error_at: null
        })
        .eq('channel_id', channelId)

      if (dbError) {
        throw {
          type: YouTubeErrorType.DATABASE_ERROR,
          message: `Database update failed: ${dbError.message}`,
          channelId
        }
      }

      // 6️⃣ If there are new videos, append to history
      if (newVideos.length > 0) {
        console.log(`[YouTubeService] 📊 Appending ${newVideos.length} new videos to history...`)

        // Get channel category
        const { data: channelData } = await supabase
          .from('youtube_channels')
          .select('category_code')
          .eq('channel_id', channelId)
          .single()

        const categoryCode = channelData?.category_code || 'Y05'

        // Create history entry for today
        const historyEntry: HistoryEntry = {
          channel_id: channelId,
          date: new Date().toISOString().split('T')[0],
          subscribers: parseInt(stats?.subscriberCount || '0'),
          total_views: parseInt(stats?.viewCount || '0'),
          video_count: parseInt(stats?.videoCount || '0'),
          views_per_video: viewsPerVideo,
          daily_views_per_video: 0, // Will be calculated if needed
          category_code: categoryCode,
          created_at: new Date().toISOString()
        }

        await this.saveChannelHistory(channelId, [historyEntry])
        console.log(`[YouTubeService] ✅ History updated with new data`)
      }

      // 7️⃣ Track API usage
      const duration = Date.now() - startTime
      const actualCost = 1 + 100 + 1 // channels.list + search.list + videos.list

      await YouTubeAPIQuotaTracker.trackUsage({
        operationType: 'incremental_update',
        channelId,
        channelName,
        unitsUsed: actualCost,
        success: true,
        updateType: 'bulk_incremental',
        durationMs: duration,
        videosProcessed: parseInt(stats?.videoCount || '0'),
        newVideos: newVideos.length,
        apiCallsMade: 3 // channels + search + videos
      })

      console.log(`[YouTubeService] ✓ Incremental update completed: ${channelName}`)
      console.log(`[YouTubeService] 💰 API cost: ${actualCost} units (saved ${506 - actualCost} units!)`)

      return {
        success: true,
        channel: channelName,
        channelId,
        stats: {
          subscribers: parseInt(stats?.subscriberCount || '0'),
          views: parseInt(stats?.viewCount || '0'),
          videos: parseInt(stats?.videoCount || '0')
        },
        newVideos: newVideos.length,
        apiCost: actualCost,
        savings: 506 - actualCost
      }

    } catch (error: any) {
      const duration = Date.now() - startTime

      console.error(`[YouTubeService] ❌ Incremental update failed:`, {
        channelId,
        error: error.message || error,
        duration: `${duration}ms`
      })

      // Track failed attempt
      await YouTubeAPIQuotaTracker.trackUsage({
        operationType: 'incremental_update',
        channelId,
        channelName,
        unitsUsed: 0,
        success: false,
        errorMessage: error.message || 'Unknown error',
        updateType: 'bulk_incremental',
        durationMs: duration
      })

      throw error
    }
  }

  /**
   * Calculate quota cost for a specific YouTube API endpoint
   * @param endpoint - YouTube API endpoint (e.g., 'channels.list', 'search.list')
   * @returns Quota cost in units
   */
  private calculateQuotaCost(endpoint: string): number {
    const costs: Record<string, number> = {
      // Read operations (1 unit each)
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

      // Search operations (EXPENSIVE!)
      'search.list': 100,

      // Write operations
      'videos.insert': 1600,
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
      'watermarks.unset': 50
    }

    return costs[endpoint] || 1  // Default to 1 unit if endpoint not found
  }

  /**
   * Log YouTube API call to youtube_api_logs table
   * Tracks all API calls for quota monitoring and synchronization with Google Cloud Console
   *
   * @param endpoint - YouTube API endpoint (e.g., 'channels.list', 'search.list')
   * @param parameters - API call parameters (e.g., { channelId: 'UC...' })
   * @param responseStatus - HTTP response status code (200, 403, 404, etc.)
   * @param duration - API call duration in milliseconds
   * @param channelId - Optional channel ID for tracking
   * @param categoryCode - Optional category code for tracking
   * @param errorMessage - Optional error message if call failed
   */
  private async logAPICall(
    endpoint: string,
    parameters: any,
    responseStatus: number,
    duration: number,
    channelId?: string,
    categoryCode?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const unitsUsed = this.calculateQuotaCost(endpoint)

      await supabase.from('youtube_api_logs').insert({
        endpoint,
        parameters,
        response_status: responseStatus,
        units_used: unitsUsed,
        duration_ms: duration,
        channel_id: channelId,
        category_code: categoryCode,
        error_message: errorMessage
      })

      console.log(`[YouTubeService] 📝 API call logged: ${endpoint} (${unitsUsed} units, ${responseStatus})`)
    } catch (error) {
      console.error('[YouTubeService] ❌ Failed to log API call:', error)
      // Don't throw - logging failure shouldn't break the main flow
    }
  }
}
