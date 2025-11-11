'use client'

import { useState } from 'react'
import { X, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { BulkValidationResponse } from '@/types/bulk-upload'

interface Props {
  result: BulkValidationResponse
  onClose: () => void
  onConfirmInsert: (successfulChannels: Array<{
    youtubeUrl: string
    categoryName: string
    memo?: string
  }>) => Promise<void>
}

export function BulkUploadResultModal({ result, onClose, onConfirmInsert }: Props) {
  const [activeTab, setActiveTab] = useState<'success' | 'error'>('success')
  const [isInserting, setIsInserting] = useState(false)

  const successResults = result.results.filter(r => r.status === 'success')
  const errorResults = result.results.filter(r => r.status === 'error')

  const handleInsert = async () => {
    if (successResults.length === 0) {
      alert('추가할 채널이 없습니다.')
      return
    }

    const confirmed = confirm(
      `${successResults.length}개의 채널을 추가하시겠습니까?\n\n` +
      `(실패한 ${errorResults.length}개 채널은 제외됩니다)`
    )

    if (!confirmed) return

    setIsInserting(true)

    const channelsToInsert = successResults.map(r => ({
      youtubeUrl: r.youtubeUrl,
      categoryName: r.categoryName,
      memo: ''
    }))

    await onConfirmInsert(channelsToInsert)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">일괄 업로드 검증 결과</h2>
            <p className="text-sm text-gray-500 mt-1">
              총 {result.total}개 | 성공 {result.successCount}개 | 실패 {result.errorCount}개
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('success')}
            className={`flex-1 px-6 py-3 font-medium transition ${
              activeTab === 'success'
                ? 'border-b-2 border-green-500 text-green-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <CheckCircle2 className="inline h-4 w-4 mr-2" />
            성공 ({successResults.length})
          </button>
          <button
            onClick={() => setActiveTab('error')}
            className={`flex-1 px-6 py-3 font-medium transition ${
              activeTab === 'error'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <XCircle className="inline h-4 w-4 mr-2" />
            실패 ({errorResults.length})
          </button>
        </div>

        {/* 결과 목록 */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'success' && (
            <div className="space-y-3">
              {successResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-amber-500" />
                  <p>검증에 성공한 채널이 없습니다.</p>
                </div>
              ) : (
                successResults.map((item) => (
                  <div
                    key={item.rowIndex}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-green-50 transition"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">행 {item.rowIndex}</span>
                        <span className="text-sm font-medium truncate">
                          {item.channelData?.title || item.channelName}
                        </span>
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                          {item.categoryName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {item.youtubeUrl}
                      </p>
                      {item.channelData && (
                        <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                          <span>구독자 {item.channelData.subscriberCount.toLocaleString()}명</span>
                          <span>영상 {item.channelData.videoCount.toLocaleString()}개</span>
                          <span>조회수 {item.channelData.viewCount.toLocaleString()}회</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'error' && (
            <div className="space-y-3">
              {errorResults.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500" />
                  <p>모든 채널이 검증에 성공했습니다!</p>
                </div>
              ) : (
                errorResults.map((item) => (
                  <div
                    key={item.rowIndex}
                    className="flex items-start gap-4 p-4 border border-red-200 rounded-lg bg-red-50"
                  >
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">행 {item.rowIndex}</span>
                        <span className="text-sm font-medium truncate">
                          {item.channelName || '(채널명 없음)'}
                        </span>
                        <span className="text-xs px-2 py-1 bg-red-200 text-red-700 rounded">
                          {item.categoryName || '(카테고리 없음)'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {item.youtubeUrl || '(URL 없음)'}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-red-600">
                          {getErrorTypeLabel(item.errorType)}
                        </span>
                        <span className="text-xs text-red-500">
                          {item.errorMessage}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {successResults.length > 0 ? (
              <span className="text-green-600 font-medium">
                ✓ {successResults.length}개 채널을 추가할 수 있습니다
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                ⚠ 추가할 수 있는 채널이 없습니다
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isInserting}
            >
              취소
            </Button>
            <Button
              onClick={handleInsert}
              disabled={successResults.length === 0 || isInserting}
            >
              {isInserting ? '추가 중...' : `성공한 채널 ${successResults.length}개 추가`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function getErrorTypeLabel(errorType?: string): string {
  switch (errorType) {
    case 'invalid-url':
      return '❌ 잘못된 URL'
    case 'api-error':
      return '🔌 API 오류'
    case 'duplicate':
      return '🔁 중복'
    case 'invalid-category':
      return '📂 잘못된 카테고리'
    case 'missing-field':
      return '📝 필수 항목 누락'
    default:
      return '❓ 알 수 없는 오류'
  }
}
