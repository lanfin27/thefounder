'use client'

import React, { Component, ReactNode, ErrorInfo } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

export class ChartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // 에러 발생 시 상태 업데이트
    return {
      hasError: true,
      error,
      errorInfo: null,
      retryCount: 0
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 로깅
    console.error('차트 에러 발생:', error, errorInfo)
    
    // Analytics에 에러 보고
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.toString(),
        fatal: false,
        error_type: 'chart_error',
        component_stack: errorInfo.componentStack
      })
    }

    this.setState({
      error,
      errorInfo
    })
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback이 제공된 경우
      if (this.props.fallback) {
        return <>{this.props.fallback}</>
      }

      // 기본 에러 UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="mb-6">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                차트를 불러오는 중 문제가 발생했습니다
              </h2>
              <p className="text-gray-600 mb-4">
                일시적인 오류일 수 있으니 잠시 후 다시 시도해주세요.
              </p>
            </div>

            {/* 에러 상세 정보 (개발 환경에서만) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  에러 상세 정보 보기
                </summary>
                <div className="mt-2 p-4 bg-gray-100 rounded-lg overflow-auto">
                  <pre className="text-xs text-red-600 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </pre>
                </div>
              </details>
            )}

            {/* 액션 버튼들 */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                disabled={this.state.retryCount > 2}
              >
                <RefreshCw className="w-4 h-4" />
                {this.state.retryCount > 0 
                  ? `다시 시도 (${this.state.retryCount}/3)`
                  : '다시 시도'
                }
              </button>
              
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                홈으로 가기
              </Link>
            </div>

            {/* 재시도 한계 도달 메시지 */}
            {this.state.retryCount > 2 && (
              <p className="mt-4 text-sm text-orange-600">
                여러 번 시도했지만 문제가 계속됩니다. 
                잠시 후에 다시 방문해주세요.
              </p>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Hook for using error boundary
export function useChartErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return setError
}

// Wrapper component with error boundary
export function WithChartErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <ChartErrorBoundary fallback={fallback}>
      {children}
    </ChartErrorBoundary>
  )
}