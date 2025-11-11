'use client'

/**
 * Error Boundary for Admin Channels Page
 * Catches and displays errors that occur in the channels management page
 */

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error details to console for debugging
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error('❌ [Admin Channels Error Boundary]')
    console.error('Error:', error)
    console.error('Error Name:', error.name)
    console.error('Error Message:', error.message)
    console.error('Error Stack:', error.stack)
    console.error('Error Digest:', error.digest || 'none')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-red-200 dark:border-red-800 overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-red-900 dark:text-red-100">
                  페이지 오류 발생
                </h2>
                <p className="text-sm text-red-700 dark:text-red-300">
                  채널 관리 페이지를 로드하는 중 문제가 발생했습니다
                </p>
              </div>
            </div>
          </div>

          {/* Error Details */}
          <div className="px-6 py-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                오류 내용:
              </h3>
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm font-mono text-red-800 dark:text-red-200 break-words">
                  {error.message || '알 수 없는 오류가 발생했습니다'}
                </p>
              </div>
            </div>

            {error.digest && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  오류 ID:
                </h3>
                <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
                    {error.digest}
                  </p>
                </div>
              </div>
            )}

            {/* Troubleshooting Tips */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                💡 문제 해결 방법:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc list-inside">
                <li>브라우저 콘솔(F12)에서 상세 로그 확인</li>
                <li>페이지를 새로고침하거나 아래 '다시 시도' 버튼 클릭</li>
                <li>데이터베이스 연결 상태 확인 (.env.local 파일)</li>
                <li>서버 콘솔에서 오류 메시지 확인</li>
                <li>문제가 지속되면 <code className="bg-blue-100 dark:bg-blue-950 px-2 py-1 rounded">npm run dev</code>로 서버 재시작</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex gap-3 justify-end">
              <Button
                onClick={() => window.location.href = '/admin/youtube-industry'}
                variant="outline"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                대시보드로 이동
              </Button>
              <Button
                onClick={reset}
                variant="primary"
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                다시 시도
              </Button>
            </div>
          </div>
        </div>

        {/* Developer Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 bg-gray-800 text-gray-100 rounded-lg p-4 overflow-auto max-h-64">
            <h4 className="text-xs font-semibold mb-2 text-gray-400">개발자 정보 (Stack Trace):</h4>
            <pre className="text-xs font-mono whitespace-pre-wrap break-words">
              {error.stack || 'No stack trace available'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
