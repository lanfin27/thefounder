/**
 * YouTube API Manager
 * YouTube Data API v3 호출 및 로깅 관리
 */

import { google } from 'googleapis'
import { createClient } from '@/lib/supabase/server'

const youtube = google.youtube('v3')

interface ChannelData {
  title: string
  subscribers: number
  total_views: number
  video_count: number
  description?: string
  thumbnail?: string
  custom_url?: string
}

interface VideoData {
  video_id: string
  title: string
  views: number
  likes: number
  comments: number
  published_at: string
}

export class YouTubeAPIManager {
  private apiKey: string | undefined

  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY
  }

  /**
   * 채널 데이터 가져오기
   */
  async getChannelData(channelId: string): Promise<ChannelData | null> {
    const startTime = Date.now()

    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      const response = await youtube.channels.list({
        key: this.apiKey,
        id: [channelId],
        part: ['snippet', 'statistics', 'brandingSettings']
      })

      const duration = Date.now() - startTime

      // API 호출 로그 기록
      await this.logAPICall(
        'channels.list',
        { channelId },
        200,
        1,
        duration,
        channelId
      )

      if (!response.data.items || response.data.items.length === 0) {
        return null
      }

      const channel = response.data.items[0]
      const statistics = channel.statistics

      return {
        title: channel.snippet?.title || '',
        subscribers: parseInt(statistics?.subscriberCount || '0'),
        total_views: parseInt(statistics?.viewCount || '0'),
        video_count: parseInt(statistics?.videoCount || '0'),
        description: channel.snippet?.description,
        thumbnail: channel.snippet?.thumbnails?.high?.url,
        custom_url: channel.snippet?.customUrl
      }
    } catch (error) {
      const duration = Date.now() - startTime

      // 에러 로그 기록
      await this.logAPICall(
        'channels.list',
        { channelId },
        500,
        1,
        duration,
        channelId,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }

  /**
   * 채널의 최근 동영상 가져오기
   */
  async getRecentVideos(channelId: string, maxResults: number = 10): Promise<VideoData[]> {
    const startTime = Date.now()

    try {
      if (!this.apiKey) {
        throw new Error('YouTube API key not configured')
      }

      // 업로드 플레이리스트 ID 가져오기
      const channelResponse = await youtube.channels.list({
        key: this.apiKey,
        id: [channelId],
        part: ['contentDetails']
      })

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        return []
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads

      if (!uploadsPlaylistId) {
        return []
      }

      // 플레이리스트에서 동영상 목록 가져오기
      const playlistResponse = await youtube.playlistItems.list({
        key: this.apiKey,
        playlistId: uploadsPlaylistId,
        part: ['contentDetails'],
        maxResults
      })

      const videoIds = playlistResponse.data.items?.map(
        item => item.contentDetails?.videoId
      ).filter(Boolean) as string[]

      if (videoIds.length === 0) {
        return []
      }

      // 동영상 상세 정보 가져오기
      const videosResponse = await youtube.videos.list({
        key: this.apiKey,
        id: videoIds,
        part: ['snippet', 'statistics']
      })

      const duration = Date.now() - startTime

      // API 호출 로그 기록 (3번의 API 호출)
      await this.logAPICall(
        'videos.list',
        { channelId, maxResults },
        200,
        3,
        duration,
        channelId
      )

      return videosResponse.data.items?.map(video => ({
        video_id: video.id || '',
        title: video.snippet?.title || '',
        views: parseInt(video.statistics?.viewCount || '0'),
        likes: parseInt(video.statistics?.likeCount || '0'),
        comments: parseInt(video.statistics?.commentCount || '0'),
        published_at: video.snippet?.publishedAt || ''
      })) || []
    } catch (error) {
      const duration = Date.now() - startTime

      // 에러 로그 기록
      await this.logAPICall(
        'videos.list',
        { channelId, maxResults },
        500,
        3,
        duration,
        channelId,
        error instanceof Error ? error.message : 'Unknown error'
      )

      throw error
    }
  }

  /**
   * API 호출 로그 기록
   */
  private async logAPICall(
    endpoint: string,
    parameters: any,
    responseStatus: number,
    unitsUsed: number,
    duration: number,
    channelId?: string,
    errorMessage?: string
  ) {
    try {
      const supabase = await createClient()

      await supabase.from('youtube_api_logs').insert({
        endpoint,
        parameters,
        response_status: responseStatus,
        units_used: unitsUsed,
        duration_ms: duration,
        channel_id: channelId,
        error_message: errorMessage
      })
    } catch (error) {
      console.error('Failed to log API call:', error)
    }
  }

  /**
   * 오늘의 API 사용량 확인
   */
  async getTodayUsage(): Promise<number> {
    try {
      const supabase = await createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('youtube_api_logs')
        .select('units_used')
        .gte('timestamp', today.toISOString())

      return data?.reduce((sum, log) => sum + (log.units_used || 0), 0) || 0
    } catch (error) {
      console.error('Failed to get today usage:', error)
      return 0
    }
  }

  /**
   * API 할당량 남아있는지 확인
   */
  async canMakeAPICall(unitsRequired: number = 1): Promise<boolean> {
    const todayUsage = await this.getTodayUsage()
    const dailyLimit = 10000 // YouTube API 기본 할당량

    return (todayUsage + unitsRequired) <= dailyLimit
  }
}
