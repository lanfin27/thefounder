'use client'

/**
 * Channel Manager Component
 * 채널 관리 컴포넌트
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { RefreshCw, Search, AlertCircle, WifiOff, Plus, Trash2, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { fetchWithRetry, getErrorMessage, logError, LogLevel } from '@/lib/utils/network'
import { AddChannelModal } from './AddChannelModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { CategorySelector } from './CategorySelector'

interface Channel {
  id: string
  channel_id: string
  name: string
  title: string
  description?: string
  thumbnail_url?: string
  category_code: string
  subscribers: number
  total_views: number
  video_count: number
  views_per_video: number
  updated_at: string
  last_updated?: string
  is_active?: boolean
  status?: 'active' | 'inactive' | 'error' | 'deleted'
  error_message?: string
  last_error_at?: string
}

interface Category {
  code: string
  name: string
}

interface ChannelManagerProps {
  initialChannels?: Channel[]
  initialCategories?: Category[]
}

export function ChannelManager({
  initialChannels,
  initialCategories,
}: ChannelManagerProps = {}) {
  const [channels, setChannels] = useState<Channel[]>(initialChannels || [])
  const [categories, setCategories] = useState<Category[]>(initialCategories || [])
  const [loading, setLoading] = useState(!initialChannels)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [channelToRemove, setChannelToRemove] = useState<Channel | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  // Bulk selection states
  const [selectedChannels, setSelectedChannels] = useState<Set<string>>(new Set())
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fix histories state
  const [isFixingHistories, setIsFixingHistories] = useState(false)
  const [fixHistoriesResult, setFixHistoriesResult] = useState<string | null>(null)

  // Category update handler
  const handleCategoryUpdate = (channelId: string, newCategory: string) => {
    setChannels(prev =>
      prev.map(ch =>
        ch.channel_id === channelId
          ? { ...ch, category_code: newCategory }
          : ch
      )
    )
  }

  useEffect(() => {
    // Only fetch if data wasn't provided via props
    if (!initialChannels) {
      fetchChannels()
    }
    if (!initialCategories) {
      fetchCategories()
    }
  }, [])

  const fetchChannels = async () => {
    setLoading(true)
    setError(null)

    try {
      logError(LogLevel.INFO, 'ChannelManager', 'Fetching channels')

      const res = await fetchWithRetry('/api/admin/youtube/channels', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 3, 1000)

      if (!res.ok) {
        const errorData = await res.json()
        logError(LogLevel.ERROR, 'ChannelManager', 'Failed to fetch channels', errorData)
        throw new Error(errorData.error || 'Failed to fetch channels')
      }

      const response = await res.json()

      // 🔥 API 응답 형식 처리: { success: true, data: [...] } 또는 직접 배열
      const channelsData = response.data || response
      const channelsArray = Array.isArray(channelsData) ? channelsData : []

      logError(LogLevel.INFO, 'ChannelManager', `Fetched ${channelsArray.length} channels`, {
        responseType: typeof response,
        hasData: 'data' in response,
        isArray: Array.isArray(channelsArray),
        count: channelsArray.length
      })

      setChannels(channelsArray)
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      logError(LogLevel.ERROR, 'ChannelManager', 'Failed to fetch channels', err)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      console.log('[ChannelManager] === FETCHING CATEGORIES ===')
      console.log('[ChannelManager] URL: /api/youtube-industry/categories')

      const res = await fetchWithRetry('/api/youtube-industry/categories', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 3, 1000)

      console.log('[ChannelManager] Response status:', res.status)
      console.log('[ChannelManager] Response ok:', res.ok)

      if (res.ok) {
        const responseData = await res.json()
        console.log('[ChannelManager] Raw response:', responseData)
        console.log('[ChannelManager] Response type:', typeof responseData)
        console.log('[ChannelManager] Response is Array?:', Array.isArray(responseData))
        console.log('[ChannelManager] Response has .data?:', 'data' in responseData)
        console.log('[ChannelManager] Response has .success?:', 'success' in responseData)

        // API 응답 구조: { success: true, data: [...], ... }
        const categoriesArray = responseData.data || responseData
        console.log('[ChannelManager] Categories array:', categoriesArray)
        console.log('[ChannelManager] Is array?:', Array.isArray(categoriesArray))
        console.log('[ChannelManager] Length:', categoriesArray?.length || 0)

        if (!Array.isArray(categoriesArray)) {
          console.error('[ChannelManager] ✗ Categories is not an array!', categoriesArray)
          setCategories([])
          return
        }

        if (categoriesArray.length === 0) {
          console.warn('[ChannelManager] ⚠️ Categories array is empty')
          setCategories([])
          return
        }

        console.log('[ChannelManager] First category (raw):', categoriesArray[0])

        const mappedCategories = categoriesArray.map((cat: any) => {
          console.log('[ChannelManager] Mapping category:', cat)
          return {
            code: cat.code,
            name: cat.name
          }
        })

        console.log('[ChannelManager] Mapped categories:', mappedCategories)
        console.log('[ChannelManager] Mapped count:', mappedCategories.length)
        console.log('[ChannelManager] First mapped category:', mappedCategories[0])

        setCategories(mappedCategories)
        console.log('[ChannelManager] ✓ Categories state set successfully!')
        console.log('[ChannelManager] ✓ Total:', mappedCategories.length, 'categories')
      } else {
        console.error('[ChannelManager] ✗ API request failed')
        console.error('[ChannelManager] Status:', res.status)
        console.error('[ChannelManager] StatusText:', res.statusText)
        const errorText = await res.text()
        console.error('[ChannelManager] Error response:', errorText)
        setCategories([])
      }
    } catch (err) {
      console.error('[ChannelManager] ✗ Exception while fetching categories:', err)
      console.error('[ChannelManager] Error type:', typeof err)
      console.error('[ChannelManager] Error:', err)
      logError(LogLevel.ERROR, 'ChannelManager', 'Failed to fetch categories', err)
      setCategories([])
    }
  }

  const updateChannel = async (channelId: string) => {
    setUpdating(channelId)
    setError(null)

    try {
      logError(LogLevel.INFO, 'ChannelManager', `Updating channel ${channelId}`)

      const res = await fetchWithRetry(`/api/admin/youtube/channels/${channelId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, 3, 1000)

      const data = await res.json()

      if (data.success) {
        logError(LogLevel.INFO, 'ChannelManager', `Successfully updated ${data.channel}`)
        fetchChannels()
      } else {
        logError(LogLevel.WARN, 'ChannelManager', 'Update failed', data)
        throw new Error(data.details || '업데이트 실패')
      }
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      logError(LogLevel.ERROR, 'ChannelManager', `Failed to update channel ${channelId}`, err)
      setError(`업데이트 실패: ${errorMessage}`)
    } finally {
      setUpdating(null)
    }
  }

  const handleRemoveChannel = async () => {
    if (!channelToRemove) return

    setIsRemoving(true)
    setError(null)

    try {
      const res = await fetchWithRetry(
        `/api/admin/youtube/channels/${channelToRemove.channel_id}/remove`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deletedBy: 'admin', // TODO: Get from auth context
            reason: 'Manually removed from Channel Manager',
            hardDelete: false // Soft delete by default
          })
        },
        3,
        1000
      )

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || '채널 제거 실패')
      }

      logError(LogLevel.INFO, 'ChannelManager', `Channel removed: ${channelToRemove.channel_id}`)
      setChannelToRemove(null)
      fetchChannels()
    } catch (err) {
      const errorMessage = getErrorMessage(err)
      logError(LogLevel.ERROR, 'ChannelManager', 'Failed to remove channel', err)
      setError(`채널 제거 실패: ${errorMessage}`)
    } finally {
      setIsRemoving(false)
    }
  }

  // Bulk delete handler
  const handleBulkDelete = async () => {
    console.log('[ChannelManager] === BULK DELETE START ===')
    console.log('[ChannelManager] Selected channels:', selectedChannels.size)

    setIsDeleting(true)

    try {
      // Get delete type from radio button
      const deleteType = (document.querySelector('input[name="deleteType"]:checked') as HTMLInputElement)?.value || 'soft'
      console.log('[ChannelManager] Delete type:', deleteType)

      const channelIds = Array.from(selectedChannels)
      let successCount = 0
      let failCount = 0
      const errors: string[] = []

      // Delete each channel sequentially
      for (const channelId of channelIds) {
        try {
          console.log(`[ChannelManager] Deleting channel ${successCount + 1}/${channelIds.length}:`, channelId)

          const channel = channels.find(c => c.id === channelId)
          const response = await fetch(`/api/admin/youtube/channels/${channel?.channel_id}/remove`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deletedBy: 'admin',
              reason: 'Bulk delete from Channel Manager',
              hardDelete: deleteType === 'hard'
            }),
          })

          if (response.ok) {
            successCount++
            console.log(`[ChannelManager] ✓ Deleted successfully: ${channelId}`)
          } else {
            failCount++
            const errorData = await response.json()
            const errorMsg = `${channel?.name || channelId}: ${errorData.error || 'Unknown error'}`
            errors.push(errorMsg)
            console.error(`[ChannelManager] ✗ Delete failed: ${errorMsg}`)
          }
        } catch (error) {
          failCount++
          const errorMsg = `${channelId}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`[ChannelManager] ✗ Delete error:`, error)
        }
      }

      console.log('[ChannelManager] === BULK DELETE COMPLETE ===')
      console.log('[ChannelManager] Success:', successCount)
      console.log('[ChannelManager] Failed:', failCount)

      // Show result
      if (failCount === 0) {
        alert(`✅ ${successCount}개 채널이 성공적으로 삭제되었습니다.`)
      } else {
        alert(
          `삭제 완료\n\n` +
          `✅ 성공: ${successCount}개\n` +
          `❌ 실패: ${failCount}개\n\n` +
          (errors.length > 0 ? `에러:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}` : '')
        )
      }

      // Reset state and refresh
      setSelectedChannels(new Set())
      setShowBulkDeleteDialog(false)

      // Switch to 'all' filter to show updated list
      setStatusFilter('all')

      // Refresh channel list
      await fetchChannels()

    } catch (error) {
      console.error('[ChannelManager] ✗ Bulk delete failed:', error)
      alert('일괄 삭제 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setIsDeleting(false)
    }
  }

  // Retry individual channel
  const handleRetryChannel = async (channelId: string) => {
    console.log('[ChannelManager] Retrying channel:', channelId)

    const channel = channels.find(c => c.channel_id === channelId)
    if (!channel) {
      alert('채널을 찾을 수 없습니다.')
      return
    }

    setUpdating(channelId)

    try {
      // Call channel update API
      const response = await fetch(`/api/admin/youtube/channels/${channelId}/update`, {
        method: 'POST',
      })

      if (response.ok) {
        console.log('[ChannelManager] ✓ Retry successful')
        alert(`✅ "${channel.name || channel.title}" 채널이 성공적으로 업데이트되었습니다.`)
        await fetchChannels()
      } else {
        const errorData = await response.json()
        console.error('[ChannelManager] ✗ Retry failed:', errorData)
        alert(`❌ 업데이트 실패: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('[ChannelManager] ✗ Retry error:', error)
      alert('채널 업데이트 중 오류가 발생했습니다.')
    } finally {
      setUpdating(null)
    }
  }

  /**
   * Fix all flat-line histories
   * Detects and regenerates realistic history data for channels with flat graphs
   */
  const handleFixAllHistories = async () => {
    if (!confirm(
      '모든 채널의 히스토리를 검사하여 직선 패턴을 수정하시겠습니까?\n\n' +
      '이 작업은 다음을 수행합니다:\n' +
      '• 직선 그래프 패턴 자동 감지\n' +
      '• 현실적인 성장 곡선으로 재생성\n' +
      '• 채널 규모별 맞춤 성장률 적용\n\n' +
      '예상 소요 시간: 2-5분'
    )) {
      return
    }

    setIsFixingHistories(true)
    setFixHistoriesResult(null)

    try {
      console.log('[ChannelManager] Fixing all flat-line histories...')

      const response = await fetch('/api/admin/youtube-industry/fix-histories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (result.success) {
        const message = `✅ 히스토리 수정 완료!\n\n` +
          `수정됨: ${result.stats.fixed}개\n` +
          `건너뜀: ${result.stats.skipped}개\n` +
          `실패: ${result.stats.failed}개\n\n` +
          `그래프 페이지를 새로고침하여 변경사항을 확인하세요.`

        setFixHistoriesResult(message)
        alert(message)

        // Refresh channel list
        await fetchChannels()
      } else {
        const errorMsg = `❌ 히스토리 수정 실패\n\n${result.error || '알 수 없는 오류'}`
        setFixHistoriesResult(errorMsg)
        alert(errorMsg)
      }
    } catch (error: any) {
      console.error('[ChannelManager] Fix histories error:', error)
      const errorMsg = `❌ 오류 발생\n\n${error.message || '네트워크 오류'}`
      setFixHistoriesResult(errorMsg)
      alert(errorMsg)
    } finally {
      setIsFixingHistories(false)
    }
  }

  // 🔥 배열 보장
  const safeChannels = Array.isArray(channels) ? channels : []

  // Compute filter counts
  const filterCounts = useMemo(() => {
    return {
      all: safeChannels.filter(c => c.status !== 'deleted').length,
      active: safeChannels.filter(c => c.status === 'active' && c.is_active !== false).length,
      inactive: safeChannels.filter(c => !c.is_active && c.status !== 'deleted' && c.status !== 'error').length,
      error: safeChannels.filter(c => c.status === 'error').length,
      deleted: safeChannels.filter(c => c.status === 'deleted').length,
    }
  }, [safeChannels])

  // Filtered channels
  const filteredChannels = useMemo(() => {
    return safeChannels.filter(ch => {
      // Search filter
      const matchesSearch = ch.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ch.category_code?.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = (statusFilter === 'all' && ch.status !== 'deleted') ||
        (statusFilter === 'active' && ch.is_active !== false && ch.status === 'active') ||
        (statusFilter === 'inactive' && ch.is_active === false && ch.status !== 'deleted' && ch.status !== 'error') ||
        (statusFilter === 'error' && ch.status === 'error') ||
        (statusFilter === 'deleted' && ch.status === 'deleted')

      return matchesSearch && matchesStatus
    })
  }, [safeChannels, statusFilter, searchQuery])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`
    return num.toString()
  }

  const getStatusBadge = (channel: Channel) => {
    if (channel.status === 'deleted' || channel.is_active === false) {
      return (
        <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs flex items-center gap-1">
          <XCircle className="w-3 h-3" />
          비활성
        </span>
      )
    }
    if (channel.status === 'error') {
      return (
        <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded text-xs flex items-center gap-1" title={channel.error_message || '에러 발생'}>
          <AlertCircle className="w-3 h-3" />
          에러
        </span>
      )
    }
    return (
      <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded text-xs flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        활성
      </span>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">채널 관리</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            채널 추가
          </Button>
          <Button onClick={fetchChannels} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
          <Button
            onClick={handleFixAllHistories}
            disabled={isFixingHistories || loading}
            variant="destructive"
            title="직선 그래프 패턴을 감지하여 현실적인 성장 곡선으로 수정합니다"
          >
            {isFixingHistories ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                수정 중...
              </>
            ) : (
              <>
                <AlertTriangle className="h-4 w-4 mr-2" />
                직선 히스토리 수정
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-medium">오류 발생</div>
            <div className="text-sm">{error}</div>
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {loading && !error && (
        <div className="bg-gray-50 border border-gray-200 text-gray-700 px-4 py-3 rounded flex items-center gap-2">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <span>채널 목록을 불러오는 중...</span>
        </div>
      )}

      {/* 에러 채널 통계 카드 */}
      {filterCounts.error > 0 && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-2xl">
                ⚠️
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-red-700">
                업데이트 실패 채널: {filterCounts.error}개
              </h3>
              <p className="text-sm text-red-600 mt-1">
                일부 채널의 업데이트가 실패했습니다. 아래에서 에러 채널만 필터링하여 확인하고 관리할 수 있습니다.
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setStatusFilter('error')}
                >
                  에러 채널 보기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 검색 및 필터 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 검색 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="채널명 또는 카테고리로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 상태 필터 버튼 */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('all')}
              className="gap-2"
            >
              전체
              <span className="text-xs opacity-70">({filterCounts.all})</span>
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('active')}
              className="gap-2"
            >
              활성
              <span className="text-xs opacity-70">({filterCounts.active})</span>
            </Button>
            <Button
              variant={statusFilter === 'inactive' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('inactive')}
              className="gap-2"
            >
              비활성
              <span className="text-xs opacity-70">({filterCounts.inactive})</span>
            </Button>
            <Button
              variant={statusFilter === 'error' ? 'destructive' : 'outline'}
              onClick={() => setStatusFilter('error')}
              className="gap-2"
            >
              ⚠️ 에러
              <span className="text-xs opacity-70">({filterCounts.error})</span>
            </Button>
            <Button
              variant={statusFilter === 'deleted' ? 'default' : 'outline'}
              onClick={() => setStatusFilter('deleted')}
              className="gap-2"
            >
              🗑️ 삭제
              <span className="text-xs opacity-70">({filterCounts.deleted})</span>
            </Button>
          </div>

          {/* 일괄 선택 및 삭제 영역 - 에러 필터일 때만 표시 */}
          {statusFilter === 'error' && filteredChannels.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 전체 선택 체크박스 */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChannels.size === filteredChannels.length && filteredChannels.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // 전체 선택
                          setSelectedChannels(new Set(filteredChannels.map(c => c.id)))
                        } else {
                          // 전체 해제
                          setSelectedChannels(new Set())
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="font-semibold">
                      전체 선택
                      {selectedChannels.size > 0 && ` (${selectedChannels.size}/${filteredChannels.length})`}
                    </span>
                  </label>

                  {/* 선택된 항목 정보 */}
                  {selectedChannels.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedChannels.size}개 채널 선택됨
                    </span>
                  )}
                </div>

                {/* 일괄 삭제 버튼 */}
                <div className="flex gap-2">
                  {selectedChannels.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setSelectedChannels(new Set())}
                      >
                        선택 해제
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? '삭제 중...' : `선택 항목 삭제 (${selectedChannels.size}개)`}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 채널 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>전체 채널 목록 ({filteredChannels.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">로딩 중...</div>
          ) : filteredChannels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">채널이 없습니다</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    {statusFilter === 'error' && (
                      <th className="text-center p-3 w-10">선택</th>
                    )}
                    <th className="text-left p-3">채널명</th>
                    <th className="text-left p-3">카테고리</th>
                    <th className="text-left p-3">상태</th>
                    <th className="text-right p-3">구독자</th>
                    <th className="text-right p-3">영상수</th>
                    <th className="text-right p-3">영상당 조회수</th>
                    <th className="text-right p-3">마지막 업데이트</th>
                    <th className="text-center p-3">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChannels.map((channel) => (
                    <React.Fragment key={channel.id}>
                      <tr
                        className={cn(
                          "border-b hover:bg-gray-50 dark:hover:bg-gray-800",
                          channel.status === 'error' && "bg-red-50 dark:bg-red-950",
                          selectedChannels.has(channel.id) && "ring-2 ring-blue-500"
                        )}
                      >
                        {statusFilter === 'error' && (
                          <td className="text-center p-3">
                            <input
                              type="checkbox"
                              checked={selectedChannels.has(channel.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedChannels)
                                if (e.target.checked) {
                                  newSelected.add(channel.id)
                                } else {
                                  newSelected.delete(channel.id)
                                }
                                setSelectedChannels(newSelected)
                              }}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-3">
                          <div className="font-medium">{channel.title || channel.name || '제목 없음'}</div>
                          {channel.status === 'error' && channel.error_message && (
                            <div className="text-xs text-red-600 mt-1 max-w-xs truncate" title={channel.error_message}>
                              {channel.error_message}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <CategorySelector
                            channelId={channel.channel_id}
                            currentCategory={channel.category_code}
                            categories={categories}
                            onUpdate={(newCategory) => handleCategoryUpdate(channel.channel_id, newCategory)}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            {getStatusBadge(channel)}
                            {channel.status === 'error' && channel.last_error_at && (
                              <span className="text-xs text-gray-500">
                                {new Date(channel.last_error_at).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-right p-3">
                          {formatNumber(channel.subscribers)}
                        </td>
                        <td className="text-right p-3">
                          {formatNumber(channel.video_count)}
                        </td>
                        <td className="text-right p-3">
                          {channel.views_per_video ?
                            formatNumber(channel.views_per_video) :
                            '-'
                          }
                        </td>
                        <td className="text-right p-3 text-sm text-gray-500">
                          {channel.updated_at || channel.last_updated ?
                            new Date(channel.updated_at || channel.last_updated || '').toLocaleDateString('ko-KR', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            }) :
                            '없음'
                          }
                        </td>
                        <td className="text-center p-3">
                          <div className="flex gap-1 justify-center">
                            {channel.status === 'error' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRetryChannel(channel.channel_id)}
                                disabled={updating === channel.channel_id}
                                title="채널 업데이트 재시도"
                              >
                                {updating === channel.channel_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <RefreshCw className="h-4 w-4 mr-1" />
                                    재시도
                                  </>
                                )}
                              </Button>
                            )}
                            {channel.status !== 'error' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateChannel(channel.channel_id)}
                                disabled={updating === channel.channel_id}
                                title="채널 정보 업데이트"
                              >
                                {updating === channel.channel_id ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {channel.is_active !== false && channel.status !== 'deleted' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setChannelToRemove(channel)}
                                title="채널 제거"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Channel Modal */}
      {(() => {
        console.log('[ChannelManager] === RENDERING AddChannelModal ===')
        console.log('[ChannelManager] Passing categories to modal:')
        console.log('[ChannelManager] - categories:', categories)
        console.log('[ChannelManager] - categories.length:', categories.length)
        console.log('[ChannelManager] - First 3 categories:', categories.slice(0, 3))
        console.log('[ChannelManager] - isOpen:', isAddModalOpen)
        console.log('=============================================')
        return null
      })()}
      <AddChannelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchChannels()
          setIsAddModalOpen(false)
        }}
        categories={categories}
      />

      {/* Remove Channel Confirmation Dialog */}
      <AlertDialog open={!!channelToRemove} onOpenChange={(open) => !open && setChannelToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>채널을 제거하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-2">
                <p>다음 채널이 비활성화됩니다:</p>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded">
                  <div className="font-medium">{channelToRemove?.title}</div>
                  <div className="text-sm text-muted-foreground">
                    ID: {channelToRemove?.channel_id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    카테고리: {channelToRemove?.category_code}
                  </div>
                </div>
                <p className="text-sm">
                  이 작업은 채널을 소프트 삭제합니다. 데이터는 보존되며 나중에 다시 활성화할 수 있습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveChannel}
              disabled={isRemoving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isRemoving ? '제거 중...' : '제거'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              ⚠️ 채널 일괄 삭제 확인
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3">
                <p className="font-semibold text-red-600">
                  {selectedChannels.size}개의 채널을 삭제하시겠습니까?
                </p>

                <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded max-h-60 overflow-y-auto">
                  <p className="text-sm font-semibold mb-2">삭제될 채널 목록:</p>
                  <ul className="text-sm space-y-1">
                    {Array.from(selectedChannels).slice(0, 10).map(channelId => {
                      const channel = channels.find(c => c.id === channelId)
                      return (
                        <li key={channelId} className="flex items-center gap-2">
                          <span className="text-red-500">•</span>
                          {channel?.name || channel?.title || '(이름 없음)'}
                          {channel?.status === 'error' && (
                            <span className="text-xs text-red-500">(에러)</span>
                          )}
                        </li>
                      )
                    })}
                    {selectedChannels.size > 10 && (
                      <li className="text-gray-500">... 외 {selectedChannels.size - 10}개</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold">삭제 유형 선택:</p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="soft"
                      defaultChecked
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium">비활성화 (Soft Delete)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        채널 데이터는 유지되며 업데이트만 중단됩니다. 나중에 재활성화 가능합니다.
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="deleteType"
                      value="hard"
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-red-600">완전 삭제 (Hard Delete)</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        채널 데이터가 완전히 삭제됩니다. 복구할 수 없습니다.
                      </p>
                    </div>
                  </label>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  이 작업은 실행 후 취소할 수 없습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  삭제 중...
                </>
              ) : (
                `${selectedChannels.size}개 채널 삭제`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
