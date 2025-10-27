'use client'

/**
 * Error Boundary Component
 *
 * React 에러를 캐치하고 사용자 친화적인 에러 화면을 표시합니다.
 */

import { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: any
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('[ErrorBoundary] Error caught:', error)
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('[ErrorBoundary] Component error:', error)
    console.error('[ErrorBoundary] Error info:', errorInfo)

    // 에러 상세 정보 로깅
    console.error('[ErrorBoundary] Stack trace:', error.stack)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      // 사용자 정의 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback
      }

      // 기본 에러 화면
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="text-center max-w-md px-4">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              앗! 문제가 발생했습니다
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {this.state.error?.message || '알 수 없는 오류가 발생했습니다'}
            </p>

            {/* 개발 환경에서만 상세 에러 표시 */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-left">
                <p className="text-xs font-mono text-red-800 dark:text-red-200 mb-2">
                  <strong>Error:</strong> {this.state.error.name}
                </p>
                <p className="text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                  {this.state.error.stack}
                </p>
              </div>
            )}

            <div className="mt-6 space-y-2">
              <button
                onClick={this.handleReload}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                새로고침
              </button>
              <button
                onClick={this.handleReset}
                className="w-full px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-medium transition-colors"
              >
                다시 시도
              </button>
            </div>

            <p className="mt-6 text-xs text-gray-500 dark:text-gray-400">
              문제가 계속되면 페이지를 새로고침하거나 잠시 후 다시 시도해주세요.
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
