'use client'

/**
 * Channel Manager Component
 * 채널 관리 컴포넌트
 */

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { RefreshCw, Search, AlertCircle, WifiOff, Plus, Trash2, CheckCircle, XCircle, Loader2, ChevronRight, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
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

  // Bulk update states
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [updateProgress, setUpdateProgress] = useState({ current: 0, total: 0 })
  const [showBulkUpdateDialog, setShowBulkUpdateDialog] = useState(false)

  // Simulation states
  const [showSimulationDialog, setShowSimulationDialog] = useState(false)
  const [simulationResult, setSimulationResult] = useState<any>(null)
  const [simulating, setSimulating] = useState(false)
  const [updateType, setUpdateType] = useState<'bulk_full' | 'bulk_incremental'>('bulk_incremental')

  // Advanced filter states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [subscriberRange, setSubscriberRange] = useState<string>('all')
  const [videoCountRange, setVideoCountRange] = useState<string>('all')
  const [viewsRange, setViewsRange] = useState<string>('all')
  const [updateTimeRange, setUpdateTimeRange] = useState<string>('all')

  // Sorting states
  type SortField = 'name' | 'subscribers' | 'video_count' | 'views_per_video' | 'updated_at'
  type SortDirection = 'asc' | 'desc' | null
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

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

  // Bulk update handler with quota checking
  // Simulation function
  const handleSimulation = async (specificChannelIds?: string[]) => {
    // ✅ If specific channel IDs provided, use them; otherwise use ALL active channels
    let channelIds: string[]
    let totalChannels: number

    if (specificChannelIds && specificChannelIds.length > 0) {
      // ✅ Use only the selected channels
      channelIds = specificChannelIds
      totalChannels = channelIds.length
      console.log('[Simulation] Using selected channels:', {
        count: totalChannels,
        channelIds
      })
    } else {
      // Use all active channels (fallback for top-level button)
      const activeChannels = safeChannels.filter(ch => ch.status !== 'deleted' && ch.is_active !== false)
      totalChannels = activeChannels.length
      channelIds = activeChannels.map(ch => ch.channel_id)
      console.log('[Simulation] Using all active channels:', {
        count: totalChannels
      })
    }

    if (totalChannels === 0) {
      alert('시뮬레이션할 채널이 없습니다.')
      return
    }

    setSimulating(true)
    try {
      console.log('[Simulation] Sending API request with:', {
        channelIds,
        channelCount: channelIds.length,
        updateType
      })

      const response = await fetch('/api/admin/youtube/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelIds,
          updateType
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '시뮬레이션 실패')
      }

      const result = await response.json()

      console.log('[Simulation] Result received:', {
        targetChannels: result.simulation?.channelIds || result.channelIds?.length || 'unknown',
        estimatedCost: result.simulation?.estimatedTotalCost
      })

      setSimulationResult(result)
      setShowSimulationDialog(true)

      console.log('[ChannelManager] Simulation result:', result)
    } catch (error) {
      console.error('[ChannelManager] Simulation error:', error)
      alert('시뮬레이션 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSimulating(false)
    }
  }

  const handleBulkUpdate = async (specificChannelIds?: string[]) => {
    console.log('[ChannelManager] === BULK UPDATE START ===')

    if (bulkUpdating) {
      console.log('[ChannelManager] Already updating, skipping...')
      return
    }

    // ✅ If specific channel IDs provided, use them; otherwise use ALL active channels
    let activeChannels: Channel[]
    let totalChannels: number

    if (specificChannelIds && specificChannelIds.length > 0) {
      // ✅ Use only the selected channels
      activeChannels = safeChannels.filter(ch =>
        specificChannelIds.includes(ch.channel_id) &&
        ch.status !== 'deleted'
      )
      totalChannels = activeChannels.length
      console.log('[BulkUpdate] Using selected channels:', {
        count: totalChannels,
        channelIds: specificChannelIds
      })
    } else {
      // Use all active channels (fallback for top-level button)
      activeChannels = safeChannels.filter(ch => ch.status !== 'deleted' && ch.is_active !== false)
      totalChannels = activeChannels.length
      console.log('[BulkUpdate] Using all active channels:', {
        count: totalChannels
      })
    }

    if (totalChannels === 0) {
      alert('업데이트할 채널이 없습니다.')
      return
    }

    try {
      // 1️⃣ API 할당량 사전 체크
      console.log('[BulkUpdate] Checking API quota...')

      const quotaResponse = await fetch('/api/admin/youtube/quota-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channelsCount: totalChannels })
      })

      if (!quotaResponse.ok) {
        throw new Error('할당량 확인 중 오류가 발생했습니다.')
      }

      const quotaCheck = await quotaResponse.json()
      console.log('[BulkUpdate] Quota check result:', quotaCheck)

      // 2️⃣ 할당량 부족 시 경고
      if (!quotaCheck.canUpdate) {
        alert(
          `⚠️ API 할당량이 부족합니다!\n\n` +
          `오늘 업데이트 가능: 최대 ${quotaCheck.maxChannels}개 채널\n` +
          `현재 선택된 채널: ${totalChannels}개\n\n` +
          `사용 현황:\n` +
          `- 오늘 사용량: ${quotaCheck.usedToday.toLocaleString()} units\n` +
          `- 남은 할당량: ${quotaCheck.remaining.toLocaleString()} units\n` +
          `- 필요 할당량: ${quotaCheck.requiredUnits.toLocaleString()} units\n\n` +
          `💡 ${quotaCheck.maxChannels}개 채널만 선택하거나, 내일 다시 시도해주세요.`
        )
        return
      }

      // 3️⃣ 할당량 정보를 포함한 확인 메시지
      const estimatedMinutes = Math.ceil(totalChannels * 30 / 60)
      const quotaPercentage = ((quotaCheck.usedToday + quotaCheck.requiredUnits) / 10000 * 100).toFixed(1)

      const confirmed = window.confirm(
        `${totalChannels}개 채널을 일괄 업데이트하시겠습니까?\n\n` +
        `⏱️ 예상 소요 시간: 약 ${estimatedMinutes}분\n` +
        `📊 API 할당량 사용:\n` +
        `   - 현재 사용: ${quotaCheck.usedToday.toLocaleString()} / 10,000 units\n` +
        `   - 추가 사용: ${quotaCheck.requiredUnits.toLocaleString()} units\n` +
        `   - 사용 후: ${(quotaCheck.usedToday + quotaCheck.requiredUnits).toLocaleString()} units (${quotaPercentage}%)\n` +
        `   - 남은 할당량: ${(quotaCheck.remaining - quotaCheck.requiredUnits).toLocaleString()} units\n\n` +
        `각 채널당 2초 대기 시간이 추가됩니다.`
      )

      if (!confirmed) {
        console.log('[BulkUpdate] Bulk update cancelled by user')
        return
      }

      // 4️⃣ 업데이트 시작
      setBulkUpdating(true)
      setUpdateProgress({ current: 0, total: totalChannels })
      setShowBulkUpdateDialog(true)

      let successCount = 0
      let failCount = 0
      let quotaExceededCount = 0
      const errors: string[] = []
      let quotaExceeded = false

      for (let i = 0; i < activeChannels.length; i++) {
        const channel = activeChannels[i]
        const currentNum = i + 1

        console.log(`[BulkUpdate] Updating channel ${currentNum}/${totalChannels}:`, channel.name || channel.title)
        setUpdateProgress({ current: currentNum, total: totalChannels })

        try {
          const response = await fetch(`/api/admin/youtube/channels/${channel.channel_id}/update`, {
            method: 'POST',
          })

          const responseData = await response.json()

          if (response.ok && responseData.success) {
            successCount++
            console.log(`[BulkUpdate] ✓ Updated successfully: ${channel.name || channel.title}`)
          } else {
            // 5️⃣ 할당량 초과 감지
            const isQuotaError = response.status === 403 ||
                                responseData.error?.includes('quota') ||
                                responseData.error?.includes('QUOTA_EXCEEDED')

            if (isQuotaError) {
              quotaExceededCount++
              quotaExceeded = true
              console.error(`[BulkUpdate] ⚠️ QUOTA EXCEEDED at channel ${currentNum}`)

              alert(
                `🚫 YouTube API 할당량 초과!\n\n` +
                `${currentNum}/${totalChannels} 번째 채널에서 할당량이 초과되었습니다.\n\n` +
                `📊 업데이트 결과:\n` +
                `   ✅ 성공: ${successCount}개\n` +
                `   ❌ 실패: ${failCount}개\n` +
                `   🚫 할당량 초과: ${quotaExceededCount}개\n\n` +
                `💡 해결 방법:\n` +
                `   1. 내일 자정(PST)까지 대기\n` +
                `   2. Google Cloud Console에서 새 프로젝트 생성\n` +
                `   3. 새 YouTube Data API v3 키 발급\n` +
                `   4. .env.local의 YOUTUBE_API_KEY 업데이트\n` +
                `   5. 서버 재시작 (npm run dev)\n\n` +
                `업데이트를 중단합니다.`
              )
              break // 즉시 중단
            }

            failCount++
            const errorMsg = `${channel.name || channel.title}: ${responseData.error || 'Unknown error'}`
            errors.push(errorMsg)
            console.error(`[BulkUpdate] ✗ Update failed: ${errorMsg}`)
          }
        } catch (error) {
          failCount++
          const errorMsg = `${channel.name || channel.title}: ${error instanceof Error ? error.message : 'Unknown error'}`
          errors.push(errorMsg)
          console.error(`[BulkUpdate] ✗ Update error:`, error)
        }

        // 2초 대기 (API 보호)
        if (i < activeChannels.length - 1 && !quotaExceeded) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      console.log('[BulkUpdate] === BULK UPDATE COMPLETE ===')
      console.log('[BulkUpdate] Success:', successCount)
      console.log('[BulkUpdate] Failed:', failCount)
      console.log('[BulkUpdate] Quota Exceeded:', quotaExceededCount)

      // 6️⃣ 최종 결과 표시 (할당량 정보 포함)
      if (!quotaExceeded) {
        if (failCount === 0) {
          alert(
            `✅ 일괄 업데이트 완료!\n\n` +
            `${successCount}개 채널이 성공적으로 업데이트되었습니다.\n\n` +
            `📊 API 사용량: ${(successCount * 506).toLocaleString()} units`
          )
        } else {
          alert(
            `일괄 업데이트 완료\n\n` +
            `✅ 성공: ${successCount}개\n` +
            `❌ 실패: ${failCount}개\n\n` +
            `📊 API 사용량: ${(successCount * 506).toLocaleString()} units\n\n` +
            (errors.length > 0 ? `에러:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? '\n...' : ''}` : '')
          )
        }
      }

      // Refresh channel list
      await fetchChannels()

    } catch (error) {
      console.error('[BulkUpdate] ✗ Bulk update failed:', error)
      alert('일괄 업데이트 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setBulkUpdating(false)
      setShowBulkUpdateDialog(false)
      setUpdateProgress({ current: 0, total: 0 })
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

  // Handle sorting toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle through: asc → desc → null
      if (sortDirection === null) setSortDirection('asc')
      else if (sortDirection === 'asc') setSortDirection('desc')
      else {
        setSortField(null)
        setSortDirection(null)
      }
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  // Get sort icon for table header
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-50" />
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-3 w-3" />
    }
    if (sortDirection === 'desc') {
      return <ArrowDown className="h-3 w-3" />
    }
    return <ArrowUpDown className="h-3 w-3 opacity-50" />
  }

  // Reset advanced filters
  const resetAdvancedFilters = () => {
    setCategoryFilter('all')
    setSubscriberRange('all')
    setVideoCountRange('all')
    setViewsRange('all')
    setUpdateTimeRange('all')
  }

  // Check if any advanced filters are active
  const hasActiveAdvancedFilters = () => {
    return categoryFilter !== 'all' ||
           subscriberRange !== 'all' ||
           videoCountRange !== 'all' ||
           viewsRange !== 'all' ||
           updateTimeRange !== 'all'
  }

  // Filtered and sorted channels
  const filteredChannels = useMemo(() => {
    let filtered = safeChannels.filter(ch => {
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

      // Category filter
      const matchesCategory = categoryFilter === 'all' || ch.category_code === categoryFilter

      // Subscriber range filter
      let matchesSubscribers = true
      if (subscriberRange === '100m+') matchesSubscribers = ch.subscribers >= 100000000
      else if (subscriberRange === '50m+') matchesSubscribers = ch.subscribers >= 50000000
      else if (subscriberRange === '10m+') matchesSubscribers = ch.subscribers >= 10000000
      else if (subscriberRange === '1m+') matchesSubscribers = ch.subscribers >= 1000000
      else if (subscriberRange === '0-1m') matchesSubscribers = ch.subscribers < 1000000

      // Video count range filter
      let matchesVideoCount = true
      if (videoCountRange === '1000+') matchesVideoCount = ch.video_count >= 1000
      else if (videoCountRange === '500+') matchesVideoCount = ch.video_count >= 500
      else if (videoCountRange === '100+') matchesVideoCount = ch.video_count >= 100
      else if (videoCountRange === '0-100') matchesVideoCount = ch.video_count < 100

      // Views per video range filter
      let matchesViews = true
      if (viewsRange === '100m+') matchesViews = (ch.views_per_video || 0) >= 100000000
      else if (viewsRange === '10m+') matchesViews = (ch.views_per_video || 0) >= 10000000
      else if (viewsRange === '1m+') matchesViews = (ch.views_per_video || 0) >= 1000000
      else if (viewsRange === '0-1m') matchesViews = (ch.views_per_video || 0) < 1000000

      // Update time range filter
      let matchesUpdateTime = true
      if (updateTimeRange !== 'all' && ch.updated_at) {
        const now = new Date()
        const updateDate = new Date(ch.updated_at)
        const daysDiff = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60 * 60 * 24))

        if (updateTimeRange === '1d') matchesUpdateTime = daysDiff <= 1
        else if (updateTimeRange === '7d') matchesUpdateTime = daysDiff <= 7
        else if (updateTimeRange === '30d') matchesUpdateTime = daysDiff <= 30
        else if (updateTimeRange === '90d+') matchesUpdateTime = daysDiff > 90
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesSubscribers && matchesVideoCount && matchesViews && matchesUpdateTime
    })

    // Apply sorting
    if (sortField && sortDirection) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: any
        let bValue: any

        switch (sortField) {
          case 'name':
            aValue = (a.name || a.title || '').toLowerCase()
            bValue = (b.name || b.title || '').toLowerCase()
            break
          case 'subscribers':
            aValue = a.subscribers || 0
            bValue = b.subscribers || 0
            break
          case 'video_count':
            aValue = a.video_count || 0
            bValue = b.video_count || 0
            break
          case 'views_per_video':
            aValue = a.views_per_video || 0
            bValue = b.views_per_video || 0
            break
          case 'updated_at':
            aValue = new Date(a.updated_at || 0).getTime()
            bValue = new Date(b.updated_at || 0).getTime()
            break
          default:
            return 0
        }

        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [safeChannels, statusFilter, searchQuery, categoryFilter, subscriberRange, videoCountRange, viewsRange, updateTimeRange, sortField, sortDirection])

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
        <div className="flex gap-2 items-center">
          {/* Update Type Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">업데이트 유형:</span>
            <Select value={updateType} onValueChange={(value) => setUpdateType(value as 'bulk_full' | 'bulk_incremental')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk_full">
                  전체 업데이트 (506 units)
                </SelectItem>
                <SelectItem value="bulk_incremental">
                  증분 업데이트 (102 units) ✨
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={() => setIsAddModalOpen(true)} variant="default">
            <Plus className="h-4 w-4 mr-2" />
            채널 추가
          </Button>

          <Button
            onClick={handleSimulation}
            disabled={loading || bulkUpdating || simulating}
            variant="outline"
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            {simulating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                시뮬레이션 중...
              </>
            ) : (
              <>
                🎯 시뮬레이션
              </>
            )}
          </Button>

          <Button
            onClick={handleBulkUpdate}
            disabled={loading || bulkUpdating}
            variant="default"
            className="bg-green-600 hover:bg-green-700"
          >
            {bulkUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                업데이트 중... ({updateProgress.current}/{updateProgress.total})
              </>
            ) : (
              <>
                ⚡ 채널 정보 일괄 업데이트
              </>
            )}
          </Button>
          <Button onClick={fetchChannels} disabled={loading || bulkUpdating} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            새로고침
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

      {/* 고급 필터 섹션 */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* 고급 필터 토글 버튼 */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2"
            >
              🔍 고급 필터
              {hasActiveAdvancedFilters() && (
                <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                  활성
                </span>
              )}
              {showAdvancedFilters ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            {hasActiveAdvancedFilters() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAdvancedFilters}
                className="text-gray-500"
              >
                필터 초기화
              </Button>
            )}
          </div>

          {/* 활성 필터 뱃지 */}
          {hasActiveAdvancedFilters() && (
            <div className="flex flex-wrap gap-2">
              {categoryFilter !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  카테고리: {categories.find(c => c.code === categoryFilter)?.name || categoryFilter}
                  <button
                    onClick={() => setCategoryFilter('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {subscriberRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  구독자: {subscriberRange}
                  <button
                    onClick={() => setSubscriberRange('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {videoCountRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  영상수: {videoCountRange}
                  <button
                    onClick={() => setVideoCountRange('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {viewsRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  조회수: {viewsRange}
                  <button
                    onClick={() => setViewsRange('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
              {updateTimeRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                  업데이트: {updateTimeRange}
                  <button
                    onClick={() => setUpdateTimeRange('all')}
                    className="hover:bg-blue-200 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}

          {/* 고급 필터 옵션 - 접혔다 펼쳐지는 영역 */}
          {showAdvancedFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t">
              {/* 카테고리 필터 */}
              <div>
                <label className="text-sm font-medium mb-2 block">카테고리</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.code} value={cat.code}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 구독자 범위 */}
              <div>
                <label className="text-sm font-medium mb-2 block">구독자</label>
                <Select value={subscriberRange} onValueChange={setSubscriberRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="100m+">100M+</SelectItem>
                    <SelectItem value="50m+">50M+</SelectItem>
                    <SelectItem value="10m+">10M+</SelectItem>
                    <SelectItem value="1m+">1M+</SelectItem>
                    <SelectItem value="0-1m">1M 미만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 영상 수 범위 */}
              <div>
                <label className="text-sm font-medium mb-2 block">영상 수</label>
                <Select value={videoCountRange} onValueChange={setVideoCountRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="1000+">1000+</SelectItem>
                    <SelectItem value="500+">500+</SelectItem>
                    <SelectItem value="100+">100+</SelectItem>
                    <SelectItem value="0-100">100 미만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 영상당 조회수 범위 */}
              <div>
                <label className="text-sm font-medium mb-2 block">영상당 조회수</label>
                <Select value={viewsRange} onValueChange={setViewsRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="100m+">100M+</SelectItem>
                    <SelectItem value="10m+">10M+</SelectItem>
                    <SelectItem value="1m+">1M+</SelectItem>
                    <SelectItem value="0-1m">1M 미만</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 업데이트 시간 범위 */}
              <div>
                <label className="text-sm font-medium mb-2 block">마지막 업데이트</label>
                <Select value={updateTimeRange} onValueChange={setUpdateTimeRange}>
                  <SelectTrigger>
                    <SelectValue placeholder="전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="1d">1일 이내</SelectItem>
                    <SelectItem value="7d">7일 이내</SelectItem>
                    <SelectItem value="30d">30일 이내</SelectItem>
                    <SelectItem value="90d+">90일 이상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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

          {/* 일괄 선택 및 작업 영역 - 모든 필터에서 표시 */}
          {filteredChannels.length > 0 && (
            <div className={cn(
              "p-4 border rounded-lg",
              statusFilter === 'error' ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
            )}>
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
                      ✅ {selectedChannels.size}개 채널 선택됨
                    </span>
                  )}
                </div>

                {/* 일괄 작업 버튼 */}
                <div className="flex gap-2">
                  {selectedChannels.size > 0 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedChannels(new Set())}
                      >
                        선택 해제
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Simulate only selected channels
                          const selectedChannelIds = Array.from(selectedChannels)
                          const channelIds = channels
                            .filter(ch => selectedChannelIds.includes(ch.id))
                            .map(ch => ch.channel_id)
                          handleSimulation(channelIds)
                        }}
                        disabled={simulating}
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        🎯 선택 항목 시뮬레이션
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => {
                          // Update only selected channels
                          const selectedChannelIds = Array.from(selectedChannels)
                          const channelIds = channels
                            .filter(ch => selectedChannelIds.includes(ch.id))
                            .map(ch => ch.channel_id)
                          handleBulkUpdate(channelIds)
                        }}
                        disabled={bulkUpdating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        ⚡ 선택 항목 업데이트
                      </Button>
                      {statusFilter === 'error' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowBulkDeleteDialog(true)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? '삭제 중...' : `삭제 (${selectedChannels.size})`}
                        </Button>
                      )}
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
          <CardTitle className="flex items-center gap-2">
            전체 채널 목록
            <span className="text-gray-500 font-normal text-sm">
              필터 결과: {filteredChannels.length}개 채널
              {selectedChannels.size > 0 && (
                <> | <span className="text-blue-600 font-semibold">✅ {selectedChannels.size}개 선택됨</span></>
              )}
            </span>
          </CardTitle>
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
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="text-center p-3 w-10">선택</th>
                    <th
                      className="text-left p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-2">
                        채널명
                        {getSortIcon('name')}
                      </div>
                    </th>
                    <th className="text-left p-3">카테고리</th>
                    <th className="text-left p-3">상태</th>
                    <th
                      className="text-right p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('subscribers')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        구독자
                        {getSortIcon('subscribers')}
                      </div>
                    </th>
                    <th
                      className="text-right p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('video_count')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        영상수
                        {getSortIcon('video_count')}
                      </div>
                    </th>
                    <th
                      className="text-right p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('views_per_video')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        영상당 조회수
                        {getSortIcon('views_per_video')}
                      </div>
                    </th>
                    <th
                      className="text-right p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                      onClick={() => handleSort('updated_at')}
                    >
                      <div className="flex items-center justify-end gap-2">
                        마지막 업데이트
                        {getSortIcon('updated_at')}
                      </div>
                    </th>
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
                          selectedChannels.has(channel.id) && "bg-blue-50 dark:bg-blue-950 ring-2 ring-blue-500"
                        )}
                      >
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

      {/* Bulk Update Progress Dialog */}
      <AlertDialog open={showBulkUpdateDialog} onOpenChange={() => {}}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
              채널 일괄 업데이트 진행 중
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>진행률</span>
                    <span className="font-semibold">
                      {updateProgress.current} / {updateProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-600 h-3 transition-all duration-300 rounded-full"
                      style={{
                        width: `${updateProgress.total > 0 ? (updateProgress.current / updateProgress.total) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    {updateProgress.total > 0
                      ? `${Math.round((updateProgress.current / updateProgress.total) * 100)}% 완료`
                      : '준비 중...'}
                  </p>
                </div>

                <div className="text-sm text-gray-600 space-y-1">
                  <p>⏳ 각 채널마다 약 30초가 소요됩니다.</p>
                  <p>🔄 업데이트가 완료될 때까지 기다려주세요.</p>
                  <p className="text-xs text-gray-500">
                    (창을 닫지 마세요)
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>

      {/* Simulation Results Dialog */}
      {simulationResult && (
        <AlertDialog open={showSimulationDialog} onOpenChange={setShowSimulationDialog}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                🎯 API 사용량 시뮬레이션 결과
              </AlertDialogTitle>
              <AlertDialogDescription>
                <div className="space-y-4 py-4">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">업데이트 유형</p>
                      <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {simulationResult.simulation.updateType === 'bulk_full' ? '전체 업데이트' : '증분 업데이트'}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <p className="text-sm text-purple-600 dark:text-purple-400 mb-1">대상 채널</p>
                      <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                        {simulationResult.simulation.totalChannels}개
                      </p>
                    </div>
                  </div>

                  {/* Cost Breakdown */}
                  <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h4 className="font-semibold text-gray-900 dark:text-white">💰 비용 상세</h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">전체 업데이트 비용:</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {simulationResult.simulation.estimatedFullCost.toLocaleString()} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">증분 업데이트 비용:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {simulationResult.simulation.estimatedIncrementalCost.toLocaleString()} units
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">예상 사용 비용:</span>
                        <span className="font-bold text-lg text-blue-600 dark:text-blue-400">
                          {simulationResult.simulation.estimatedTotalCost.toLocaleString()} units
                        </span>
                      </div>
                      <div className="pt-2 border-t border-gray-300 dark:border-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">절약 가능:</span>
                          <div className="text-right">
                            <span className="font-bold text-lg text-green-600 dark:text-green-400">
                              {simulationResult.simulation.potentialSavings.toLocaleString()} units
                            </span>
                            <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                              ({simulationResult.simulation.potentialSavingsPercentage}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quota Status */}
                  <div className={`p-4 rounded-lg border ${
                    simulationResult.simulation.canExecute
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">
                        {simulationResult.simulation.canExecute ? '✅' : '❌'}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-1 ${
                          simulationResult.simulation.canExecute
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}>
                          {simulationResult.simulation.canExecute ? '실행 가능' : '할당량 부족'}
                        </h4>
                        <p className={`text-sm ${
                          simulationResult.simulation.canExecute
                            ? 'text-green-700 dark:text-green-300'
                            : 'text-red-700 dark:text-red-300'
                        }`}>
                          {simulationResult.recommendation.message}
                        </p>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          <p>현재 남은 할당량: {simulationResult.simulation.remainingQuota.toLocaleString()} units</p>
                          <p>할당량 사용률: {simulationResult.simulation.quotaUsagePercentage}%</p>
                          <p>예상 소요 시간: {simulationResult.estimatedDuration.formatted}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSimulationDialog(false)}>
                닫기
              </AlertDialogCancel>
              {simulationResult.simulation.canExecute && (
                <AlertDialogAction
                  onClick={() => {
                    setShowSimulationDialog(false)
                    handleBulkUpdate()
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  확인 및 실행
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
