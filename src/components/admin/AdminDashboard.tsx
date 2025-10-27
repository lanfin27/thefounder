'use client'

/**
 * Admin Dashboard Component
 * 관리자 대시보드 메인 컴포넌트 - 실시간 모니터링
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Database, Calendar, Activity, PlayCircle, AlertCircle, CheckCircle, Clock, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchWithRetry, getErrorMessage, logError, LogLevel } from '@/lib/utils/network'

interface AdminStats {
  totalChannels: number
  totalCategories: number
  apiUsage: {
    used: number
    limit: number
    percentage: number
  }
  activeSchedules: number
  recentJobs: any[]
  runningJobs: number
}

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats>({
    totalChannels: 0,
    totalCategories: 0,
    apiUsage: { used: 0, limit: 10000, percentage: 0 },
    activeSchedules: 0,
    recentJobs: [],
    runningJobs: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updateStatus, setUpdateStatus] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // 데이터 가져오기
  const fetchDashboard = async () => {
    try {
      setError(null)
      logError(LogLevel.INFO, 'AdminDashboard', 'Fetching dashboard data')

      const response = await fetchWithRetry('/api/admin/youtube/dashboard', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 3, 1000)

      if (!response.ok) {
        const errorData = await response.json()
        logError(LogLevel.ERROR, 'AdminDashboard', 'Dashboard fetch failed', errorData)
        throw new Error(errorData.error || 'Failed to fetch dashboard')
      }

      const data = await response.json()
      logError(LogLevel.INFO, 'AdminDashboard', 'Dashboard data received', {
        totalChannels: data.totalChannels,
        runningJobs: data.runningJobs
      })

      setStats(data)
      setLastUpdated(new Date())
      setIsLoading(false)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      logError(LogLevel.ERROR, 'AdminDashboard', 'Failed to fetch dashboard', err)
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  // 컴포넌트 마운트 시 데이터 가져오기
  useEffect(() => {
    fetchDashboard()
    // 30초마다 자동 새로고침 (최적화: 5초 -> 30초)
    const interval = setInterval(fetchDashboard, 30000)
    return () => clearInterval(interval)
  }, [])

  // 수동 업데이트 트리거
  const handleUpdate = async (scope: 'full' | 'incremental') => {
    setIsLoading(true)
    setUpdateStatus('시작 중...')
    setError(null)

    try {
      logError(LogLevel.INFO, 'AdminDashboard', `Triggering ${scope} update`)

      const response = await fetchWithRetry('/api/admin/youtube/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          categories: scope === 'full' ? ['Y01', 'Y02', 'Y03', 'Y04', 'Y05', 'Y06', 'Y07', 'Y08', 'Y09', 'Y10', 'Y11', 'Y12', 'Y13', 'Y14', 'Y15'] : []
        })
      }, 3, 1000)

      if (!response.ok) {
        const errorData = await response.json()
        logError(LogLevel.ERROR, 'AdminDashboard', 'Update failed', errorData)
        throw new Error(errorData.error || 'Update failed')
      }

      const data = await response.json()
      logError(LogLevel.INFO, 'AdminDashboard', 'Update started successfully', { jobId: data.jobId })
      setUpdateStatus(`업데이트 시작됨 (Job ID: ${data.jobId})`)

      // 3초 후 상태 메시지 제거
      setTimeout(() => setUpdateStatus(null), 3000)

      // 대시보드 새로고침
      fetchDashboard()
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      logError(LogLevel.ERROR, 'AdminDashboard', 'Update failed', err)
      setUpdateStatus('업데이트 실패: ' + errorMessage)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const apiUsagePercent = stats.apiUsage.percentage

  // 작업 상태 아이콘
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'running': return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed': return <AlertCircle className="w-4 h-4 text-red-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">YouTube Industry 관리자</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => fetchDashboard()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            새로고침
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <WifiOff className="h-5 w-5" />
          <div>
            <div className="font-medium">오류 발생</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* 상태 메시지 */}
      {updateStatus && !error && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
          {updateStatus}
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && !error && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>데이터를 불러오는 중...</span>
        </div>
      )}

      {/* 마지막 업데이트 시간 */}
      {lastUpdated && !error && (
        <div className="text-sm text-gray-500">
          마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
        </div>
      )}

      {/* 주요 메트릭 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              전체 채널
            </CardTitle>
            <Database className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.totalChannels.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.totalCategories}개 카테고리
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">API 사용량</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.apiUsage.used} / {stats.apiUsage.limit}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div
                className={`h-2 rounded-full ${
                  apiUsagePercent > 80 ? 'bg-red-500' :
                  apiUsagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(apiUsagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {apiUsagePercent.toFixed(1)}% 사용
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              활성 스케줄
            </CardTitle>
            <Calendar className="w-4 h-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.activeSchedules}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              자동 업데이트 활성화
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              실행 중인 작업
            </CardTitle>
            <PlayCircle className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {stats.runningJobs}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {stats.runningJobs > 0 ? '진행 중' : '대기 중'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 최근 작업 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 작업</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentJobs.length > 0 ? (
              stats.recentJobs.map((job: any) => {
                const progressDetails = job.progress_details || {}
                const errors = job.errors?.breakdown || {}
                const hasErrors = job.errors && Object.keys(errors).length > 0

                return (
                  <div key={job.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="text-sm font-medium capitalize">{job.update_scope}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(job.created_at).toLocaleString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <div className="text-sm font-medium">
                        {progressDetails.updated || job.processed_channels || 0}/{job.total_channels} 성공
                      </div>
                    </div>

                    {/* 상세 결과 (완료된 작업만) */}
                    {job.status === 'completed' && progressDetails && (
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600 dark:text-green-400">
                          ✓ {progressDetails.updated || 0}개 업데이트
                        </span>
                        {progressDetails.failed > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            ✗ {progressDetails.failed}개 실패
                          </span>
                        )}
                      </div>
                    )}

                    {/* 에러 분류 표시 */}
                    {hasErrors && job.status === 'completed' && (
                      <div className="text-xs space-y-1 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                        <div className="font-medium text-gray-600 dark:text-gray-300">실패 원인:</div>
                        {errors.notFound > 0 && (
                          <div className="text-yellow-600 dark:text-yellow-400">
                            • YouTube에 없는 채널: {errors.notFound}개
                          </div>
                        )}
                        {errors.databaseError > 0 && (
                          <div className="text-red-600 dark:text-red-400">
                            • 데이터베이스 에러: {errors.databaseError}개
                          </div>
                        )}
                        {errors.apiError > 0 && (
                          <div className="text-orange-600 dark:text-orange-400">
                            • API 에러: {errors.apiError}개
                          </div>
                        )}
                        {errors.quotaExceeded > 0 && (
                          <div className="text-purple-600 dark:text-purple-400">
                            • 할당량 초과: {errors.quotaExceeded}개
                          </div>
                        )}
                        {errors.other > 0 && (
                          <div className="text-gray-600 dark:text-gray-400">
                            • 기타 에러: {errors.other}개
                          </div>
                        )}
                      </div>
                    )}

                    {/* 실패한 작업 */}
                    {job.status === 'failed' && job.errors && (
                      <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                        ⚠ {job.errors.summary || job.errors.message || '작업 실패'}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">작업 내역이 없습니다</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 빠른 업데이트 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 업데이트</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => handleUpdate('incremental')}
              disabled={isLoading}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              증분 업데이트
            </Button>
            <Button
              onClick={() => handleUpdate('full')}
              variant="outline"
              disabled={isLoading}
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              전체 업데이트
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
