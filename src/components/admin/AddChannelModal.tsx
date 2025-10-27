'use client'

/**
 * Add Channel Modal Component
 * YouTube 채널 추가 모달 - URL/ID 입력 및 검증
 */

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, AlertCircle, Loader2, Youtube } from 'lucide-react'

interface AddChannelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  categories: Array<{ code: string; name: string }>
}

interface ChannelPreview {
  channelId: string
  title: string
  description?: string
  thumbnailUrl?: string
  subscriberCount?: number
  videoCount?: number
  viewCount?: number
}

export function AddChannelModal({
  isOpen,
  onClose,
  onSuccess,
  categories
}: AddChannelModalProps) {
  // Props 수신 로깅
  console.log('[AddChannelModal] === COMPONENT RENDER / PROPS RECEIVED ===')
  console.log('[AddChannelModal] isOpen:', isOpen)
  console.log('[AddChannelModal] categories (from props):', categories)
  console.log('[AddChannelModal] categories type:', typeof categories)
  console.log('[AddChannelModal] categories is Array?:', Array.isArray(categories))
  console.log('[AddChannelModal] categories.length:', categories?.length || 0)
  if (categories && categories.length > 0) {
    console.log('[AddChannelModal] First category:', categories[0])
    console.log('[AddChannelModal] First 3 categories:', categories.slice(0, 3))
  }
  console.log('=========================================================')

  const [input, setInput] = useState('')
  const [categoryCode, setCategoryCode] = useState('')
  const [notes, setNotes] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [channelPreview, setChannelPreview] = useState<ChannelPreview | null>(null)

  // 디버깅: 상태 변화 모니터링
  useEffect(() => {
    console.log('[AddChannelModal] === STATE DEBUG ===')
    console.log('[AddChannelModal] isOpen:', isOpen)
    console.log('[AddChannelModal] channelPreview:', channelPreview)
    console.log('[AddChannelModal] categories (props):', categories)
    console.log('[AddChannelModal] categories.length:', categories?.length || 0)
    console.log('[AddChannelModal] categoryCode:', categoryCode)
    console.log('[AddChannelModal] isAdding:', isAdding)
    console.log('[AddChannelModal] isVerifying:', isVerifying)
    console.log('[AddChannelModal] Category dropdown should be disabled?:', isAdding)
    console.log('[AddChannelModal] Add button should be disabled?:', !channelPreview || !categoryCode || isAdding)
    console.log('=====================================')
  }, [isOpen, channelPreview, categories, categoryCode, isAdding, isVerifying])

  // Reset state when modal closes
  const handleClose = () => {
    setInput('')
    setCategoryCode('')
    setNotes('')
    setChannelPreview(null)
    setError(null)
    onClose()
  }

  // 채널 검증
  const handleVerify = async () => {
    // 입력값 정리
    const trimmedInput = input.trim()

    // 빈 값 체크
    if (!trimmedInput) {
      setError('YouTube URL 또는 채널 ID를 입력해주세요')
      return
    }

    // 길이 체크 (최소 10자 - 채널 ID가 24자이므로)
    if (trimmedInput.length < 10) {
      setError('유효한 YouTube URL 또는 채널 ID를 입력해주세요')
      return
    }

    // YouTube 관련 문자열이 포함되어 있는지 확인
    const isYouTubeUrl =
      trimmedInput.includes('youtube.com') ||
      trimmedInput.includes('youtu.be') ||
      trimmedInput.startsWith('UC') ||
      trimmedInput.startsWith('@')

    if (!isYouTubeUrl) {
      setError('YouTube URL 또는 채널 ID 형식이 아닙니다')
      return
    }

    // localhost나 이상한 URL 필터링
    if (
      trimmedInput.includes('localhost') ||
      trimmedInput.includes('127.0.0.1') ||
      trimmedInput.includes('```') ||
      trimmedInput.includes('<') ||
      trimmedInput.includes('>')
    ) {
      setError('유효한 YouTube URL을 입력해주세요')
      return
    }

    console.log('[AddChannelModal] Verifying channel:', trimmedInput)

    setIsVerifying(true)
    setError(null)
    setChannelPreview(null)

    try {
      const response = await fetch('/api/admin/youtube/channels/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: trimmedInput,
          categoryCode: categoryCode || undefined
        })
      })

      const data = await response.json()

      console.log('[AddChannelModal] Verify response:', { ok: response.ok, data })

      if (!response.ok) {
        if (data.duplicate) {
          setError(
            `이미 등록된 채널입니다 (카테고리: ${data.existingChannel?.categoryCode}, 상태: ${data.existingChannel?.status})`
          )
        } else {
          setError(data.error || '채널 검증에 실패했습니다')
        }
        return
      }

      // 검증 성공 - 채널 미리보기 표시
      console.log('[AddChannelModal] ✓ Verification successful!')
      console.log('[AddChannelModal] Setting channelPreview with data:', data.channelData)

      const preview = {
        channelId: data.channelId,
        title: data.channelData.title,
        description: data.channelData.description,
        thumbnailUrl: data.channelData.thumbnailUrl,
        subscriberCount: data.channelData.subscriberCount,
        videoCount: data.channelData.videoCount,
        viewCount: data.channelData.viewCount
      }

      setChannelPreview(preview)
      console.log('[AddChannelModal] channelPreview set to:', preview)
      console.log('[AddChannelModal] After setting preview, Add button should be enabled (if category selected)')

    } catch (err) {
      console.error('[AddChannelModal] Verify error:', err)
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
    } finally {
      setIsVerifying(false)
    }
  }

  // 채널 추가
  const handleAdd = async () => {
    if (!channelPreview) {
      setError('먼저 채널을 검증해주세요')
      return
    }

    if (!categoryCode) {
      setError('카테고리를 선택해주세요')
      return
    }

    console.log('[AddChannelModal] Adding channel:', {
      channelId: channelPreview.channelId,
      categoryCode,
      title: channelPreview.title
    })

    setIsAdding(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/youtube/channels/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: channelPreview.channelId,
          categoryCode,
          addedBy: 'admin', // TODO: Get from auth context
          notes: notes.trim() || undefined
        })
      })

      const data = await response.json()

      console.log('[AddChannelModal] Add response:', { ok: response.ok, data })

      if (!response.ok) {
        setError(data.error || '채널 추가에 실패했습니다')
        return
      }

      // 성공
      console.log('[AddChannelModal] ✅ Channel added successfully:', data.channel)
      onSuccess?.()
      handleClose()

    } catch (err) {
      console.error('[AddChannelModal] Add error:', err)
      setError('네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-600" />
            새 채널 추가
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* YouTube URL/ID 입력 */}
          <div className="space-y-2">
            <Label htmlFor="channel-input">YouTube URL 또는 채널 ID</Label>
            <div className="flex gap-2">
              <Input
                id="channel-input"
                placeholder="https://www.youtube.com/@channelhandle 또는 UCxxxxx..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isVerifying || isAdding}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isVerifying) {
                    handleVerify()
                  }
                }}
              />
              <Button
                onClick={handleVerify}
                disabled={isVerifying || isAdding || !input.trim()}
                variant="outline"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    검증 중
                  </>
                ) : (
                  '검증'
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              지원 형식: @handle, /channel/UCxxxxx, /c/customname, /user/username, 또는 직접 채널 ID
            </p>
          </div>

          {/* 카테고리 선택 */}
          <div className="space-y-2">
            <Label htmlFor="category-select">
              카테고리 <span className="text-red-500">*</span>
              {channelPreview && (
                <span className="text-green-600 text-xs ml-2">✓ 채널 검증 완료</span>
              )}
            </Label>

            {/* === 항상 표시되는 디버깅 정보 === */}
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs space-y-2 font-mono">
              <div className="flex items-center gap-2">
                <span className="font-bold">channelPreview:</span>
                <span className={channelPreview ? 'text-green-600' : 'text-red-600'}>
                  {channelPreview ? '✅ 있음' : '❌ 없음'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">categories 개수:</span>
                <span className={categories?.length > 0 ? 'text-green-600' : 'text-red-600'}>
                  {categories?.length || 0}개
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">categoryCode:</span>
                <span className={categoryCode ? 'text-green-600' : 'text-gray-500'}>
                  {categoryCode || '(선택 안됨)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">Select disabled:</span>
                <span>
                  {isAdding ? '🔒 추가 중' : '🔓 사용 가능'}
                </span>
              </div>

              {/* 카테고리 목록 미리보기 */}
              {categories && categories.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                  <div className="font-bold mb-1">사용 가능한 카테고리:</div>
                  <ul className="ml-4 space-y-1 max-h-32 overflow-y-auto">
                    {categories.slice(0, 10).map((cat, idx) => (
                      <li key={idx} className="text-gray-700 dark:text-gray-300">
                        • {cat.name || '(이름 없음)'}
                        <span className="text-gray-500"> ({cat.code || '(코드 없음)'})</span>
                      </li>
                    ))}
                    {categories.length > 10 && (
                      <li className="text-gray-500">... 외 {categories.length - 10}개 더</li>
                    )}
                  </ul>
                </div>
              )}

              {/* 카테고리가 없을 때 경고 */}
              {(!categories || categories.length === 0) && (
                <div className="mt-2 pt-2 border-t border-red-300">
                  <div className="text-red-600 font-bold">⚠️ 카테고리 데이터 없음!</div>
                  <div className="text-gray-600 mt-1">
                    props 타입: {typeof categories}
                    {categories === undefined && ' (undefined)'}
                    {categories === null && ' (null)'}
                    {Array.isArray(categories) && ` (빈 배열 [])`}
                  </div>
                </div>
              )}
            </div>

            {/* === Select 컴포넌트 === */}
            {!categories || categories.length === 0 ? (
              // 카테고리가 없을 때 경고 표시
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-800 dark:text-yellow-200">
                      카테고리를 불러올 수 없습니다
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      데이터베이스에 카테고리가 없거나 로딩에 실패했습니다.
                    </div>
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 font-mono">
                      Debug: categories = {JSON.stringify(categories)}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // 카테고리가 있을 때 Select 표시
              <>
                <Select
                  value={categoryCode}
                  onValueChange={(value) => {
                    console.log('[AddChannelModal] === CATEGORY SELECTED ===')
                    console.log('[AddChannelModal] Selected value:', value)
                    const selected = categories.find(c => c.code === value)
                    console.log('[AddChannelModal] Selected category object:', selected)
                    console.log('[AddChannelModal] All categories:', categories)
                    setCategoryCode(value)
                  }}
                  disabled={isAdding}
                >
                  <SelectTrigger
                    id="category-select"
                    className="w-full"
                  >
                    <SelectValue placeholder="카테고리를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => {
                      console.log('[AddChannelModal] Rendering SelectItem:', {
                        code: category.code,
                        name: category.name,
                        full: category
                      })
                      return (
                        <SelectItem key={category.code} value={category.code}>
                          {category.name}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>

                {/* 비활성화 이유 표시 */}
                {isAdding && (
                  <p className="text-xs text-gray-500 mt-1">
                    ℹ️ 채널 추가 중에는 카테고리를 변경할 수 없습니다
                  </p>
                )}
              </>
            )}
          </div>

          {/* 메모 (선택사항) */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택사항)</Label>
            <Input
              id="notes"
              placeholder="채널에 대한 메모..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isAdding}
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 채널 미리보기 */}
          {channelPreview && (
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <div className="flex items-start gap-3 mt-2">
                  {channelPreview.thumbnailUrl && (
                    <img
                      src={channelPreview.thumbnailUrl}
                      alt={channelPreview.title}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {channelPreview.title}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      채널 ID: {channelPreview.channelId}
                    </div>
                    <div className="flex gap-4 text-xs text-gray-600 dark:text-gray-400 mt-2">
                      {channelPreview.subscriberCount !== undefined && (
                        <span>구독자 {channelPreview.subscriberCount.toLocaleString()}명</span>
                      )}
                      {channelPreview.videoCount !== undefined && (
                        <span>영상 {channelPreview.videoCount.toLocaleString()}개</span>
                      )}
                      {channelPreview.viewCount !== undefined && (
                        <span>조회수 {channelPreview.viewCount.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isAdding}>
            취소
          </Button>
          <div className="flex flex-col items-end gap-1">
            <Button
              onClick={handleAdd}
              disabled={!channelPreview || !categoryCode || isAdding}
            >
              {isAdding ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  추가 중
                </>
              ) : (
                '채널 추가'
              )}
            </Button>
            {/* 버튼 비활성화 이유 표시 (개발 환경에서만) */}
            {process.env.NODE_ENV === 'development' && !channelPreview && (
              <p className="text-xs text-red-500">
                ⚠️ 먼저 채널을 검증해주세요
              </p>
            )}
            {process.env.NODE_ENV === 'development' && channelPreview && !categoryCode && (
              <p className="text-xs text-red-500">
                ⚠️ 카테고리를 선택해주세요
              </p>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
