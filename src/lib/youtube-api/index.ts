/**
 * YouTube Data API v3 Integration
 *
 * YouTube API를 사용한 실시간 채널 데이터 수집
 */

import { google, youtube_v3 } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

export interface YouTubeChannelStats {
  channelId: string
  title: string
  description: string
  customUrl?: string
  thumbnailUrl: string
  subscriberCount: number
  videoCount: number
  viewCount: number
  publishedAt: string
}

export interface YouTubeVideoStats {
  videoId: string
  title: string
  publishedAt: string
  viewCount: number
  likeCount: number
  commentCount: number
  duration: string
}

/**
 * 채널 통계 정보 가져오기
 */
export async function getChannelStats(channelId: string): Promise<YouTubeChannelStats | null> {
  try {
    console.log(`[YouTube API] Fetching stats for channel: ${channelId}`)

    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: [channelId]
    })

    if (!response.data.items || response.data.items.length === 0) {
      console.warn(`[YouTube API] Channel not found: ${channelId}`)
      return null
    }

    const channel = response.data.items[0]
    const snippet = channel.snippet!
    const statistics = channel.statistics!

    return {
      channelId,
      title: snippet.title || '',
      description: snippet.description || '',
      customUrl: snippet.customUrl,
      thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(statistics.subscriberCount || '0'),
      videoCount: parseInt(statistics.videoCount || '0'),
      viewCount: parseInt(statistics.viewCount || '0'),
      publishedAt: snippet.publishedAt || new Date().toISOString()
    }
  } catch (error: any) {
    console.error(`[YouTube API] Error fetching channel ${channelId}:`, error.message)

    // API quota exceeded
    if (error.code === 403) {
      throw new Error('YouTube API quota exceeded')
    }

    return null
  }
}

/**
 * 채널의 최근 영상 목록 가져오기
 */
export async function getRecentVideos(
  channelId: string,
  maxResults: number = 50
): Promise<YouTubeVideoStats[]> {
  try {
    // 1. Get uploads playlist ID
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails'],
      id: [channelId]
    })

    if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
      return []
    }

    const uploadsPlaylistId = channelResponse.data.items[0].contentDetails?.relatedPlaylists?.uploads

    if (!uploadsPlaylistId) {
      return []
    }

    // 2. Get videos from uploads playlist
    const playlistResponse = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults
    })

    if (!playlistResponse.data.items) {
      return []
    }

    // 3. Get video statistics
    const videoIds = playlistResponse.data.items
      .map(item => item.contentDetails?.videoId)
      .filter((id): id is string => !!id)

    if (videoIds.length === 0) {
      return []
    }

    const videosResponse = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: videoIds
    })

    if (!videosResponse.data.items) {
      return []
    }

    return videosResponse.data.items.map(video => ({
      videoId: video.id || '',
      title: video.snippet?.title || '',
      publishedAt: video.snippet?.publishedAt || '',
      viewCount: parseInt(video.statistics?.viewCount || '0'),
      likeCount: parseInt(video.statistics?.likeCount || '0'),
      commentCount: parseInt(video.statistics?.commentCount || '0'),
      duration: video.contentDetails?.duration || ''
    }))
  } catch (error: any) {
    console.error(`[YouTube API] Error fetching videos for ${channelId}:`, error.message)
    return []
  }
}

/**
 * 영상당 평균 조회수 계산
 */
export function calculateViewsPerVideo(totalViews: number, videoCount: number): number {
  if (videoCount === 0) return 0
  return Math.round(totalViews / videoCount)
}

/**
 * Shorts 영상 필터링 (duration < 60s)
 */
export function filterShorts(videos: YouTubeVideoStats[]): {
  shorts: YouTubeVideoStats[]
  regular: YouTubeVideoStats[]
} {
  const shorts: YouTubeVideoStats[] = []
  const regular: YouTubeVideoStats[] = []

  for (const video of videos) {
    const duration = parseDuration(video.duration)
    if (duration <= 60) {
      shorts.push(video)
    } else {
      regular.push(video)
    }
  }

  return { shorts, regular }
}

/**
 * ISO 8601 duration을 초로 변환
 * Example: PT1M30S = 90 seconds
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * 참여율 계산
 */
export function calculateEngagementRate(
  likes: number,
  comments: number,
  views: number
): number {
  if (views === 0) return 0
  return ((likes + comments) / views) * 100
}

/**
 * 업로드 빈도 계산 (주당)
 */
export function calculateUploadsPerWeek(videos: YouTubeVideoStats[]): number {
  if (videos.length === 0) return 0

  // Get date range
  const dates = videos.map(v => new Date(v.publishedAt).getTime())
  const oldest = Math.min(...dates)
  const newest = Math.max(...dates)

  const daysDiff = (newest - oldest) / (1000 * 60 * 60 * 24)
  if (daysDiff === 0) return videos.length

  const weeks = daysDiff / 7
  return parseFloat((videos.length / weeks).toFixed(1))
}

/**
 * 여러 채널의 통계를 한 번에 가져오기 (배치 처리)
 */
export async function batchGetChannelStats(
  channelIds: string[]
): Promise<Map<string, YouTubeChannelStats>> {
  const results = new Map<string, YouTubeChannelStats>()

  // YouTube API는 최대 50개까지 한 번에 요청 가능
  const batchSize = 50

  for (let i = 0; i < channelIds.length; i += batchSize) {
    const batch = channelIds.slice(i, i + batchSize)

    try {
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics'],
        id: batch
      })

      if (response.data.items) {
        for (const channel of response.data.items) {
          const channelId = channel.id!
          const snippet = channel.snippet!
          const statistics = channel.statistics!

          results.set(channelId, {
            channelId,
            title: snippet.title || '',
            description: snippet.description || '',
            customUrl: snippet.customUrl,
            thumbnailUrl: snippet.thumbnails?.high?.url || '',
            subscriberCount: parseInt(statistics.subscriberCount || '0'),
            videoCount: parseInt(statistics.videoCount || '0'),
            viewCount: parseInt(statistics.viewCount || '0'),
            publishedAt: snippet.publishedAt || ''
          })
        }
      }
    } catch (error: any) {
      console.error(`[YouTube API] Batch request failed:`, error.message)
    }

    // Rate limiting - wait between batches
    if (i + batchSize < channelIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * API 쿼터 사용량 추정
 */
export function estimateQuotaCost(operations: {
  channelStats?: number
  videosList?: number
  playlistItems?: number
}): number {
  let cost = 0

  // channels.list = 1 unit per request
  if (operations.channelStats) {
    cost += Math.ceil(operations.channelStats / 50) * 1
  }

  // videos.list = 1 unit per request
  if (operations.videosList) {
    cost += Math.ceil(operations.videosList / 50) * 1
  }

  // playlistItems.list = 1 unit per request
  if (operations.playlistItems) {
    cost += operations.playlistItems * 1
  }

  return cost
}

export default youtube
