/**
 * YouTube Service
 * YouTube Data API v3 통합 서비스
 */

import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

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

export class YouTubeService {
  private quotaUsed = 0

  /**
   * 단일 채널 데이터 업데이트
   */
  async updateChannelData(channelId: string) {
    const startTime = Date.now()

    try {
      // API 키 검증
      if (!process.env.YOUTUBE_API_KEY) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.API_KEY_MISSING,
          message: 'YouTube API key is not configured. Please set YOUTUBE_API_KEY in .env.local',
          channelId
        }
        console.error(`[YouTubeService] ${error.message}`, { channelId })
        throw error
      }

      console.log(`[YouTubeService] Updating channel: ${channelId}`)

      // 채널 정보 가져오기
      const response = await youtube.channels.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [channelId]
      })

      const duration = Date.now() - startTime

      // Channel not found 체크
      if (!response.data.items || response.data.items.length === 0) {
        const error: YouTubeServiceError = {
          type: YouTubeErrorType.CHANNEL_NOT_FOUND,
          message: `Channel not found on YouTube: ${channelId}`,
          channelId
        }

        console.warn(`[YouTubeService] ${error.message}`)

        // API 로그 저장 (not found)
        await supabase.from('youtube_api_logs').insert({
          endpoint: 'channels.list',
          parameters: { id: channelId },
          response_status: 404,
          error_message: error.message,
          units_used: 1, // YouTube still charges for not found queries
          duration_ms: duration,
          channel_id: channelId
        })

        throw error
      }

      const channel = response.data.items[0]
      const stats = channel.statistics

      // 영상당 조회수 계산
      const viewsPerVideo = stats?.viewCount && stats?.videoCount
        ? Math.round(parseInt(stats.viewCount) / parseInt(stats.videoCount))
        : 0

      console.log(`[YouTubeService] Fetched data for "${channel.snippet?.title}":`, {
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
          duration_ms: duration,
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
        duration_ms: duration,
        channel_id: channelId
      })

      // API 사용량 업데이트
      await this.updateQuotaUsage(1)

      console.log(`[YouTubeService] ✓ Successfully updated: ${channel.snippet?.title}`)

      return {
        success: true,
        channel: channel.snippet?.title,
        channelId,
        stats: {
          subscribers: parseInt(stats?.subscriberCount || '0'),
          views: parseInt(stats?.viewCount || '0'),
          videos: parseInt(stats?.videoCount || '0')
        }
      }

    } catch (error: any) {
      const duration = Date.now() - startTime

      // 이미 YouTubeServiceError인 경우 그대로 throw
      if (error.type && Object.values(YouTubeErrorType).includes(error.type)) {
        throw error
      }

      // YouTube API 에러 분류
      let errorType = YouTubeErrorType.UNKNOWN
      let errorMessage = 'Unknown error'

      if (error.code === 403 || error.message?.includes('quota')) {
        errorType = YouTubeErrorType.QUOTA_EXCEEDED
        errorMessage = 'YouTube API quota exceeded'
      } else if (error.code === 'ENOTFOUND' || error.message?.includes('network')) {
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

      // 에러 로그 저장
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
}
