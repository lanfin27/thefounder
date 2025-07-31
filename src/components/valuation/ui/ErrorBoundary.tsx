'use client'

import React from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ValuationErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Valuation error:', error, errorInfo)
    // Here you could send error to monitoring service like Sentry
    // if (typeof window !== 'undefined' && (window as any).Sentry) {
    //   (window as any).Sentry.captureException(error, { extra: errorInfo })
    // }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="bg-white border border-medium-gray-border rounded-lg max-w-md w-full">
            <div className="text-center px-6 py-8">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-heading-3 font-serif text-medium-black mb-3">
                문제가 발생했습니다
              </h2>
              <p className="text-body text-medium-black-secondary leading-relaxed mb-6">
                밸류에이션 계산 중 오류가 발생했습니다. 
                잠시 후 다시 시도해 주세요.
              </p>
              {this.state.error && process.env.NODE_ENV === 'development' && (
                <details className="mb-6 text-left">
                  <summary className="text-caption text-medium-black-tertiary cursor-pointer hover:text-medium-black">
                    오류 상세 정보
                  </summary>
                  <pre className="mt-2 p-3 bg-medium-gray-light rounded text-caption overflow-x-auto">
                    {this.state.error.message}
                  </pre>
                </details>
              )}
              <div className="flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={() => this.setState({ hasError: false })}
                  className="flex-1 bg-medium-green hover:bg-green-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  다시 시도
                </button>
                <Link href="/dashboard" className="flex-1">
                  <button className="w-full bg-white hover:bg-medium-gray-light text-medium-black font-medium py-3 px-6 rounded-lg border border-medium-gray-border transition-colors duration-200 flex items-center justify-center">
                    <Home className="w-4 h-4 mr-2" />
                    대시보드로
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}