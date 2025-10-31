/**
 * YouTube API Quota Usage Endpoint - Hybrid Mode
 *
 * Provides dual-source quota tracking:
 * - Local DB: Real-time from youtube_api_logs (30s refresh)
 * - Google Cloud: Actual usage from Service Usage API (5min cache)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getGoogleCloudService, GoogleCloudQuotaUsage } from '@/lib/google-cloud/service-usage-client'

// ✅ Google Cloud 캐시 (5분 유지)
let googleCloudCache: GoogleCloudQuotaUsage | null = null
let lastGoogleCloudFetch: number = 0
const GOOGLE_CLOUD_CACHE_TTL = 5 * 60 * 1000 // 5분

interface APILog {
  units_used: number
  endpoint: string
  response_status: number
  timestamp: string
  channel_id?: string
  category_code?: string
  error_message?: string
}

interface QuotaUsageResponse {
  date: string

  // 로컬 DB 사용량
  localUsage: {
    totalUsed: number
    remaining: number
    limit: number
    percentage: number
  }

  // Google Cloud 실제 사용량 (캐시됨)
  googleCloudUsage: {
    totalUsed: number
    remaining: number
    limit: number
    percentage: number
    resetTime: string
    lastFetched: string
    isCached: boolean
  } | null

  // 차이 분석
  discrepancy: {
    difference: number
    percentage: number
    isSignificant: boolean
    warning?: string
  } | null

  stats: {
    totalCalls: number
    successCalls: number
    failedCalls: number
    quotaExceededCalls: number
  }

  byEndpoint: Record<string, { calls: number; units: number }>
  recentCalls: Array<{
    endpoint: string
    units: number
    status: number
    time: string
    channel?: string
    error?: string
  }>

  lastUpdated: string
  googleCloudConsoleUrl: string
}

/**
 * Google Cloud 사용량 조회 (캐싱 적용)
 */
async function getGoogleCloudUsageWithCache(forceRefresh: boolean = false): Promise<GoogleCloudQuotaUsage | null> {
  const now = Date.now()

  // 캐시 유효 기간 체크
  const cacheExpired = (now - lastGoogleCloudFetch) > GOOGLE_CLOUD_CACHE_TTL

  // 캐시가 유효하고 강제 갱신이 아니면 캐시 반환
  if (!forceRefresh && !cacheExpired && googleCloudCache) {
    console.log('[QuotaUsage API] ♻️ Using cached Google Cloud data')
    return googleCloudCache
  }

  // 새로 조회
  try {
    console.log('[QuotaUsage API] 🔄 Fetching fresh Google Cloud data...')
    const googleCloudService = getGoogleCloudService()
    const usage = await googleCloudService.getYouTubeQuotaUsage()

    if (usage) {
      googleCloudCache = usage
      lastGoogleCloudFetch = now
      console.log('[QuotaUsage API] ✅ Google Cloud data cached')
    }

    return usage

  } catch (error: any) {
    console.error('[QuotaUsage API] ❌ Error fetching Google Cloud data:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    // URL에서 forceRefresh 파라미터 확인
    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('forceRefresh') === 'true'

    // 1️⃣ Supabase 클라이언트 초기화
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_YT_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_YT_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )

    const today = new Date().toISOString().split('T')[0]
    console.log('[QuotaUsage API] 📊 Fetching usage for:', today)

    // 2️⃣ 로컬 DB에서 사용량 조회
    const { data: logs, error: logsError } = await supabase
      .from('youtube_api_logs')
      .select('units_used, endpoint, response_status, timestamp, channel_id, category_code, error_message')
      .gte('timestamp', `${today}T00:00:00Z`)
      .lte('timestamp', `${today}T23:59:59Z`)
      .order('timestamp', { ascending: false })

    if (logsError) {
      console.error('[QuotaUsage API] ❌ Error fetching logs:', logsError)
    }

    // 3️⃣ 로컬 사용량 계산
    const apiLogs = (logs as APILog[]) || []
    const localTotalUsed = apiLogs.reduce((sum, log) => sum + (log.units_used || 0), 0)

    console.log(`[QuotaUsage API] 📝 Local: ${apiLogs.length} calls, ${localTotalUsed} units`)

    // 4️⃣ 통계 계산
    const successCalls = apiLogs.filter(log => log.response_status === 200).length
    const failedCalls = apiLogs.filter(log => log.response_status !== 200).length
    const quotaExceededCalls = apiLogs.filter(log =>
      log.response_status === 403 &&
      log.error_message?.toLowerCase().includes('quota')
    ).length

    // 5️⃣ 엔드포인트별 사용량
    const byEndpoint = apiLogs.reduce((acc, log) => {
      const endpoint = log.endpoint || 'unknown'
      if (!acc[endpoint]) {
        acc[endpoint] = { calls: 0, units: 0 }
      }
      acc[endpoint].calls++
      acc[endpoint].units += log.units_used || 0
      return acc
    }, {} as Record<string, { calls: number; units: number }>)

    // 6️⃣ 최근 호출 목록
    const recentCalls = apiLogs.slice(0, 10).map(log => ({
      endpoint: log.endpoint,
      units: log.units_used || 0,
      status: log.response_status,
      time: new Date(log.timestamp).toLocaleTimeString('ko-KR'),
      channel: log.channel_id || undefined,
      error: log.error_message || undefined
    }))

    // 7️⃣ Google Cloud 사용량 조회 (캐싱 적용)
    const googleCloudUsage = await getGoogleCloudUsageWithCache(forceRefresh)

    // 8️⃣ 차이 분석
    let discrepancy = null
    if (googleCloudUsage && googleCloudUsage.currentUsage > 0) {
      const difference = Math.abs(localTotalUsed - googleCloudUsage.currentUsage)
      const percentageDiff = (difference / googleCloudUsage.currentUsage) * 100
      const isSignificant = difference > 100 // 100 units 이상 차이

      discrepancy = {
        difference,
        percentage: Math.round(percentageDiff * 10) / 10,
        isSignificant,
        warning: isSignificant
          ? `로컬 로그와 Google Cloud 사용량이 ${difference} units 차이납니다. 일부 API 호출이 기록되지 않았을 수 있습니다.`
          : undefined
      }

      console.log('[QuotaUsage API] 📊 Discrepancy:', discrepancy)
    }

    // 9️⃣ 응답 구성
    const result: QuotaUsageResponse = {
      date: today,

      localUsage: {
        totalUsed: localTotalUsed,
        remaining: Math.max(0, 10000 - localTotalUsed),
        limit: 10000,
        percentage: Math.min(100, Math.round((localTotalUsed / 10000) * 100))
      },

      googleCloudUsage: googleCloudUsage ? {
        totalUsed: googleCloudUsage.currentUsage,
        remaining: Math.max(0, googleCloudUsage.quotaLimit - googleCloudUsage.currentUsage),
        limit: googleCloudUsage.quotaLimit,
        percentage: googleCloudUsage.percentage,
        resetTime: googleCloudUsage.resetTime.toISOString(),
        lastFetched: googleCloudUsage.lastFetched.toISOString(),
        isCached: !forceRefresh && (Date.now() - lastGoogleCloudFetch) < GOOGLE_CLOUD_CACHE_TTL
      } : null,

      discrepancy,

      stats: {
        totalCalls: apiLogs.length,
        successCalls,
        failedCalls,
        quotaExceededCalls
      },

      byEndpoint,
      recentCalls,

      lastUpdated: new Date().toISOString(),
      googleCloudConsoleUrl: 'https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas'
    }

    console.log('[QuotaUsage API] ✅ Response ready:', {
      local: result.localUsage.totalUsed,
      googleCloud: result.googleCloudUsage?.totalUsed || 'N/A',
      discrepancy: result.discrepancy?.difference || 0
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[QuotaUsage API] ❌ Error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}
