'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, Database, AlertCircle, CheckCircle } from 'lucide-react'

interface ChartDataFallbackProps {
  onRetry: () => void
  isLoading: boolean
  error?: string | null
}

export function ChartDataFallback({ onRetry, isLoading, error }: ChartDataFallbackProps) {
  const [showDetails, setShowDetails] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    if (isLoading) {
      setRetryCount(prev => prev + 1)
    }
  }, [isLoading])

  return (
    <div className="w-full py-16 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border border-yellow-200">
      <div className="text-center px-6">
        <Database className={`w-12 h-12 mx-auto mb-4 ${isLoading ? 'animate-pulse' : ''} text-yellow-600`} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          차트 데이터 준비 중입니다
        </h3>
        <p className="text-gray-600 mb-6 leading-relaxed max-w-md mx-auto">
          {error 
            ? '데이터를 불러오는 중 일시적인 문제가 발생했습니다.'
            : '업종별 배수 데이터를 불러오는 중입니다. 잠시만 기다려 주세요.'
          }
        </p>
        
        {/* Status indicators */}
        <div className="mb-6">
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              {retryCount > 0 ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <div className="w-4 h-4 rounded-full bg-yellow-400 animate-pulse" />
              )}
              <span className="text-gray-600">API 연결</span>
            </div>
            <div className="flex items-center gap-2">
              {!error ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-orange-500" />
              )}
              <span className="text-gray-600">데이터 처리</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto mb-4">
          <button 
            onClick={onRetry}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? '로딩 중...' : '다시 시도'}
          </button>
          <button 
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showDetails ? '간단히 보기' : '자세히 보기'}
          </button>
        </div>
        
        {showDetails && (
          <div className="max-w-md mx-auto text-left bg-white p-4 rounded-lg border border-yellow-200">
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold text-gray-900 mb-2">개발자 정보:</h4>
              <div className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">
                  데이터베이스 연결 상태: {error ? '오류' : '정상'}
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">
                  재시도 횟수: {retryCount}회
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-gray-500">•</span>
                <span className="text-gray-600">
                  대체 데이터: 모의 데이터 사용 중
                </span>
              </div>
              {error && (
                <div className="mt-3 p-3 bg-red-50 rounded text-xs text-red-700 font-mono overflow-x-auto">
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Progress indicator */}
        {isLoading && (
          <div className="mt-6">
            <div className="w-48 h-1 bg-gray-200 rounded-full mx-auto overflow-hidden">
              <div className="h-full bg-green-500 rounded-full animate-progress-bar" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Add this to your global CSS or tailwind config
const progressBarAnimation = `
@keyframes progress-bar {
  0% {
    width: 0%;
  }
  50% {
    width: 70%;
  }
  100% {
    width: 100%;
  }
}

.animate-progress-bar {
  animation: progress-bar 2s ease-in-out infinite;
}
`