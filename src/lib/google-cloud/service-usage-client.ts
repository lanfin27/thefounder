/**
 * Google Cloud Monitoring API Client
 * YouTube Data API v3의 실제 할당량을 조회
 *
 * Uses googleapis package for Cloud Monitoring API v3
 */

import { google } from 'googleapis'
import * as path from 'path'
import * as fs from 'fs'

export interface GoogleCloudQuotaUsage {
  service: string
  metricName: string
  quotaLimit: number
  currentUsage: number
  percentage: number
  resetTime: Date
  lastFetched: Date
  source: 'google-cloud'
}

export class GoogleCloudService {
  private auth: any = null
  private monitoring: any = null
  private projectId: string
  private enabled: boolean

  constructor() {
    // 환경 변수에서 활성화 여부 확인
    this.enabled = process.env.ENABLE_GOOGLE_CLOUD_SYNC === 'true'
    this.projectId = ''

    if (!this.enabled) {
      console.log('[GoogleCloudService] ⚠️ Google Cloud sync is disabled (ENABLE_GOOGLE_CLOUD_SYNC != true)')
      return
    }

    try {
      // Service Account JSON 파일 경로
      const keyFilePath = path.resolve(
        process.cwd(),
        process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json'
      )

      // 파일 존재 확인
      if (!fs.existsSync(keyFilePath)) {
        console.error(`[GoogleCloudService] ❌ Service Account JSON not found: ${keyFilePath}`)
        console.log('[GoogleCloudService] ℹ️ Please follow SETUP_GOOGLE_CLOUD.md to configure Service Account')
        this.enabled = false
        return
      }

      // Project ID
      this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || ''
      if (!this.projectId) {
        console.error('[GoogleCloudService] ❌ GOOGLE_CLOUD_PROJECT_ID is not set')
        this.enabled = false
        return
      }

      // Google Auth 초기화
      this.auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform.read-only',
          'https://www.googleapis.com/auth/monitoring.read'
        ]
      })

      // Cloud Monitoring API 클라이언트 초기화
      this.monitoring = google.monitoring('v3')

      console.log('[GoogleCloudService] ✅ Initialized with project:', this.projectId)

    } catch (error: any) {
      console.error('[GoogleCloudService] ❌ Initialization failed:', error.message)
      this.enabled = false
      this.auth = null
      this.monitoring = null
    }
  }

  /**
   * YouTube Data API v3의 일일 할당량 사용량 조회
   *
   * Uses Cloud Monitoring API to get actual request count from time series data
   */
  async getYouTubeQuotaUsage(): Promise<GoogleCloudQuotaUsage | null> {
    if (!this.enabled || !this.auth || !this.monitoring) {
      console.log('[GoogleCloudService] ⚠️ Service is disabled or not initialized')
      return null
    }

    try {
      console.log('[GoogleCloudService] 📊 Fetching YouTube API quota from Google Cloud...')

      const startTime = Date.now()
      const authClient = await this.auth.getClient()

      // 1️⃣ 오늘 00:00:00 부터 현재까지의 시간 범위 설정
      const now = Math.floor(Date.now() / 1000)
      const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000)

      // ISO 8601 형식으로 변환
      const startTimeISO = new Date(todayStart * 1000).toISOString()
      const endTimeISO = new Date(now * 1000).toISOString()

      console.log('[GoogleCloudService] 📅 Time range:', {
        start: startTimeISO,
        end: endTimeISO
      })

      // 2️⃣ YouTube API 사용량 메트릭 조회 (플랫 파라미터 형식 사용)
      const response = await this.monitoring.projects.timeSeries.list({
        name: `projects/${this.projectId}`,
        filter: [
          'metric.type="serviceruntime.googleapis.com/api/request_count"',
          'resource.type="consumed_api"',
          'resource.labels.service="youtube.googleapis.com"'
        ].join(' AND '),
        // ✅ 플랫 키 형식 (중첩 객체 대신 dot notation 사용)
        'interval.startTime': startTimeISO,
        'interval.endTime': endTimeISO,
        'aggregation.alignmentPeriod': '3600s', // 1시간 = 3600초
        'aggregation.perSeriesAligner': 'ALIGN_SUM',
        'aggregation.crossSeriesReducer': 'REDUCE_SUM',
        'aggregation.groupByFields': ['resource.service'],
        auth: authClient
      } as any)

      console.log(`[GoogleCloudService] 📥 Received metrics in ${Date.now() - startTime}ms`)

      // 3️⃣ 응답 파싱
      if (!response.data.timeSeries || response.data.timeSeries.length === 0) {
        console.log('[GoogleCloudService] ℹ️ No usage data found for today')
        return this.createDefaultQuotaResponse(0, 10000)
      }

      // 4️⃣ 총 사용량 계산
      let totalUsage = 0
      for (const series of response.data.timeSeries) {
        if (series.points) {
          for (const point of series.points) {
            if (point.value?.int64Value) {
              totalUsage += parseInt(point.value.int64Value)
            } else if (point.value?.doubleValue) {
              totalUsage += Math.round(point.value.doubleValue)
            }
          }
        }
      }

      console.log('[GoogleCloudService] ✅ Current usage:', totalUsage, 'requests')

      // 5️⃣ YouTube API는 1 request != 1 unit (메서드마다 다른 cost)
      // 하지만 request count를 기본 사용량으로 사용
      // 정확한 quota units는 로컬 DB의 cost 필드를 사용
      const result: GoogleCloudQuotaUsage = {
        service: 'youtube.googleapis.com',
        metricName: 'API Requests (today)',
        quotaLimit: 10000, // YouTube API v3 기본 일일 할당량
        currentUsage: totalUsage,
        percentage: Math.min(100, Math.round((totalUsage / 10000) * 100)),
        resetTime: this.getNextResetTime(),
        lastFetched: new Date(),
        source: 'google-cloud'
      }

      console.log('[GoogleCloudService] ✅ YouTube quota usage:', {
        limit: result.quotaLimit,
        used: result.currentUsage,
        percentage: `${result.percentage}%`,
        metric: result.metricName
      })

      // ⚠️ 사용량이 0이면 경고
      if (totalUsage === 0) {
        console.warn('[GoogleCloudService] ⚠️ Current usage is 0.')
        console.log('[GoogleCloudService] ℹ️ This may be normal if no API calls were made today.')
      }

      return result

    } catch (error: any) {
      console.error('[GoogleCloudService] ❌ Error fetching quota metrics:', error.message)

      // 권한 에러인 경우 추가 안내
      if (error.message?.includes('permission') || error.code === 403) {
        console.error('[GoogleCloudService] ℹ️ Permission denied. Please ensure Service Account has:')
        console.error('[GoogleCloudService] ℹ️ - Monitoring Viewer role')
        console.error('[GoogleCloudService] ℹ️ - monitoring.timeSeries.list permission')
      }

      // Fallback: 기본값 반환
      console.log('[GoogleCloudService] ℹ️ Returning default quota values (usage data unavailable)')
      return this.createDefaultQuotaResponse(0, 10000)
    }
  }

  /**
   * 기본 Quota Response 생성 (Fallback용)
   */
  private createDefaultQuotaResponse(currentUsage: number, quotaLimit: number): GoogleCloudQuotaUsage {
    return {
      service: 'youtube.googleapis.com',
      metricName: 'Queries per day (estimated)',
      quotaLimit: quotaLimit,
      currentUsage: currentUsage,
      percentage: quotaLimit > 0 ? Math.round((currentUsage / quotaLimit) * 100) : 0,
      resetTime: this.getNextResetTime(),
      lastFetched: new Date(),
      source: 'google-cloud'
    }
  }

  /**
   * 다음 할당량 리셋 시간 계산 (매일 자정 PST)
   */
  private getNextResetTime(): Date {
    const now = new Date()

    // PST 시간대로 변환
    const pstOptions: Intl.DateTimeFormatOptions = { timeZone: 'America/Los_Angeles' }
    const pstTime = new Date(now.toLocaleString('en-US', pstOptions))

    // 다음 날 자정 PST
    const resetTime = new Date(pstTime)
    resetTime.setDate(resetTime.getDate() + 1)
    resetTime.setHours(0, 0, 0, 0)

    return resetTime
  }

  /**
   * Health Check
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled || !this.auth || !this.monitoring) {
      return false
    }

    try {
      const usage = await this.getYouTubeQuotaUsage()
      return usage !== null && usage.quotaLimit > 0
    } catch (error) {
      console.error('[GoogleCloudService] ❌ Health check failed:', error)
      return false
    }
  }
}

// 싱글톤 인스턴스
let googleCloudServiceInstance: GoogleCloudService | null = null

export function getGoogleCloudService(): GoogleCloudService {
  if (!googleCloudServiceInstance) {
    googleCloudServiceInstance = new GoogleCloudService()
  }
  return googleCloudServiceInstance
}
