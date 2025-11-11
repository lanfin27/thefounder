/**
 * YouTube API Quota Usage Widget - Hybrid Mode
 *
 * Displays both local DB usage (30s refresh) and Google Cloud usage (5min cache)
 * with discrepancy analysis
 */

'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/progress'
import { AlertCircle, CheckCircle, XCircle, RefreshCw, ExternalLink, Cloud } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface QuotaUsage {
  date: string

  localUsage: {
    totalUsed: number
    remaining: number
    limit: number
    percentage: number
  }

  googleCloudUsage: {
    totalUsed: number
    remaining: number
    limit: number
    percentage: number
    resetTime: string
    lastFetched: string
    isCached: boolean
  } | null

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

export function QuotaUsageWidget() {
  const [usage, setUsage] = useState<QuotaUsage | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshingCloud, setRefreshingCloud] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true)
      if (forceRefresh) {
        setRefreshingCloud(true)
      }

      const url = `/api/admin/youtube/quota-usage${forceRefresh ? '?forceRefresh=true' : ''}`
      const response = await fetch(url, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Failed to fetch quota usage')
      }

      const data = await response.json()
      setUsage(data)
      setError(null)

    } catch (err: any) {
      console.error('[QuotaWidget] Error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshingCloud(false)
    }
  }

  // 로컬 사용량: 30초마다 자동 갱신
  useEffect(() => {
    fetchUsage(false)
    const interval = setInterval(() => fetchUsage(false), 30000) // 30초
    return () => clearInterval(interval)
  }, [])

  // Google Cloud: 5분마다 자동 갱신
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('[QuotaWidget] 🔄 Auto-refreshing Google Cloud data...')
      fetchUsage(true)
    }, 300000) // 5분
    return () => clearInterval(interval)
  }, [])

  if (loading && !usage) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            YouTube API 사용량
            <RefreshCw className="h-4 w-4 animate-spin" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="h-5 w-5" />
            API 사용량 오류
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive mb-4">{error}</p>
          <Button onClick={() => fetchUsage(false)} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            다시 시도
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!usage) return null

  // 로컬 사용량 기준으로 경고 레벨 결정
  const isExceeded = usage.localUsage.percentage >= 100
  const isWarning = usage.localUsage.percentage >= 80
  const hasNoData = usage.stats.totalCalls === 0

  // 진행률 바 색상
  const getProgressColor = () => {
    if (isExceeded) return '[&>div]:bg-red-500'
    if (usage.localUsage.percentage >= 90) return '[&>div]:bg-orange-500'
    if (isWarning) return '[&>div]:bg-yellow-500'
    return '[&>div]:bg-green-500'
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            YouTube API 사용량
            {isExceeded && <AlertCircle className="h-5 w-5 text-red-500" />}
            {isWarning && !isExceeded && <AlertCircle className="h-5 w-5 text-yellow-500" />}
            {!isWarning && <CheckCircle className="h-5 w-5 text-green-500" />}
          </div>
          <Button
            onClick={() => fetchUsage(false)}
            variant="ghost"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ⚠️ 데이터 없음 경고 */}
        {hasNoData && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              API 호출 기록이 없습니다
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              YouTube API를 사용하면 자동으로 로그가 기록됩니다.
            </p>
          </div>
        )}

        {/* ⚠️ 차이 경고 */}
        {usage.discrepancy?.isSignificant && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              로컬 로그와 Google Cloud 사용량 불일치
            </p>
            <p className="text-xs text-red-600 mt-1">{usage.discrepancy.warning}</p>
          </div>
        )}

        {/* 로컬 사용량 */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-semibold">로컬 DB 사용량 (실시간)</h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">30초 갱신</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">
              {usage.localUsage.totalUsed.toLocaleString()} / {usage.localUsage.limit.toLocaleString()} units
            </span>
            <span className={`font-bold ${isExceeded ? 'text-red-500' : isWarning ? 'text-yellow-600' : 'text-green-600'}`}>
              {usage.localUsage.percentage}%
            </span>
          </div>

          <Progress value={usage.localUsage.percentage} className={`h-3 ${getProgressColor()}`} />

          <p className="text-sm text-muted-foreground">
            남은 할당량: <strong>{usage.localUsage.remaining.toLocaleString()}</strong> units
          </p>
        </div>

        {/* Google Cloud 사용량 */}
        {usage.googleCloudUsage && (
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-muted">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Google Cloud 실제 사용량
              </h4>
              <div className="flex items-center gap-2">
                {usage.googleCloudUsage.isCached && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">캐시됨</span>
                )}
                <Button
                  onClick={() => fetchUsage(true)}
                  variant="ghost"
                  size="sm"
                  disabled={refreshingCloud}
                >
                  {refreshingCloud ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">
                {usage.googleCloudUsage.totalUsed.toLocaleString()} / {usage.googleCloudUsage.limit.toLocaleString()} units
              </span>
              <span className="font-bold text-primary">
                {usage.googleCloudUsage.percentage}%
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              마지막 확인: {new Date(usage.googleCloudUsage.lastFetched).toLocaleString('ko-KR')}
            </p>

            <p className="text-xs text-muted-foreground">
              리셋: {new Date(usage.googleCloudUsage.resetTime).toLocaleString('ko-KR')}
            </p>
          </div>
        )}

        {/* Google Cloud 연동 안 됨 */}
        {!usage.googleCloudUsage && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Google Cloud 연동이 비활성화되었습니다
            </p>
            <p className="text-xs text-blue-600 mt-1">
              <code>.env.local</code>에서 <code>ENABLE_GOOGLE_CLOUD_SYNC=true</code>로 설정하고 Service Account를 구성하세요.
            </p>
          </div>
        )}

        {/* 차이 통계 */}
        {usage.discrepancy && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">차이 분석</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">차이:</span>
                <span className={`font-medium ${usage.discrepancy.isSignificant ? 'text-orange-600' : 'text-green-600'}`}>
                  {usage.discrepancy.difference} units ({usage.discrepancy.percentage}%)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">상태:</span>
                <span className={`text-xs px-2 py-1 rounded ${usage.discrepancy.isSignificant ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                  {usage.discrepancy.isSignificant ? '주의 필요' : '정상'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 할당량 초과 경고 */}
        {isExceeded && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              ⚠️ 일일 할당량 초과!
            </p>
            <p className="text-xs text-red-600 mt-1">
              내일 자정(PST)에 리셋됩니다. 새 API 키가 필요한 경우{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                여기를 클릭
              </a>
            </p>
          </div>
        )}

        {/* Google Cloud Console 링크 */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="text-sm">
            <p className="font-medium">Google Cloud Console</p>
            <p className="text-xs text-muted-foreground">
              실제 사용량을 직접 확인하세요
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href={usage.googleCloudConsoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              확인하기
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-muted-foreground">총 호출</p>
            <p className="text-2xl font-bold">{usage.stats.totalCalls}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">성공</p>
            <p className="text-2xl font-bold text-green-600">{usage.stats.successCalls}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">실패</p>
            <p className="text-2xl font-bold text-red-600">{usage.stats.failedCalls}</p>
          </div>
        </div>

        {/* 엔드포인트별 사용량 */}
        {Object.keys(usage.byEndpoint).length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">엔드포인트별 사용량 (상위 5)</h4>
            <div className="space-y-2">
              {Object.entries(usage.byEndpoint)
                .sort(([, a], [, b]) => b.units - a.units)
                .slice(0, 5)
                .map(([endpoint, stats]) => (
                  <div key={endpoint} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
                    <span className="font-mono text-xs">{endpoint}</span>
                    <span className="text-muted-foreground">
                      {stats.calls}회 / {stats.units.toLocaleString()} units
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* 최근 호출 목록 */}
        {usage.recentCalls.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">최근 API 호출 (최대 5개)</h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {usage.recentCalls.slice(0, 5).map((call, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-xs p-2 rounded bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {call.status === 200 ? (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500" />
                    )}
                    <span className="font-mono">{call.endpoint}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span>{call.units} units</span>
                    <span>·</span>
                    <span>{call.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 마지막 업데이트 */}
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            마지막 업데이트: {new Date(usage.lastUpdated).toLocaleTimeString('ko-KR')}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
