'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'

interface SignupPromptModalProps {
  isOpen: boolean
  onClose?: () => void // Optional close handler
  canClose?: boolean // Whether modal can be closed
}

export default function SignupPromptModal({
  isOpen,
  onClose,
  canClose = false // Default: cannot be closed
}: SignupPromptModalProps) {
  const pathname = usePathname()
  const router = useRouter()

  // Prevent ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !canClose) {
        e.preventDefault()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, canClose])

  // Prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if canClose is true
    if (canClose && onClose) {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop - cannot be clicked to close when canClose is false */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9998] transition-opacity animate-in fade-in-0 duration-200"
        onClick={handleBackdropClick}
      />

      {/* Modal - cannot be closed */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-2xl shadow-2xl z-[9999] p-8 md:p-10 animate-in zoom-in-95 duration-200">

        {/* Close button - only show when canClose is true */}
        {canClose && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}

        {/* Content */}
        <div className="text-center">
          {/* Logo/Icon */}
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            계속 읽으시려면 가입하세요
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-gray-600 mb-8">
            The Founder의 모든 인사이트를<br />
            <span className="font-semibold text-green-600">완전 무료</span>로 읽을 수 있습니다
          </p>

          {/* Benefits box */}
          <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
            <div className="space-y-3">
              {[
                '🔓 모든 콘텐츠 무제한 열람',
                '📧 주간 뉴스레터 구독',
                '🔔 맞춤 콘텐츠 추천',
                '📚 북마크 및 읽기 기록',
                '💬 커뮤니티 참여'
              ].map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-lg">{benefit.split(' ')[0]}</span>
                  <span className="text-gray-700">{benefit.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA buttons */}
          <div className="space-y-4">
            {/* Start for free */}
            <button
              onClick={() => router.push(`/auth/signup?redirect=${encodeURIComponent(pathname)}`)}
              className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              무료로 시작하기
            </button>

            {/* Google signup */}
            <button
              onClick={() => router.push(`/auth/signup?provider=google&redirect=${encodeURIComponent(pathname)}`)}
              className="w-full py-4 px-6 bg-white border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-medium rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 계속하기
            </button>

            {/* Login link */}
            <div className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button
                onClick={() => router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`)}
                className="text-green-600 hover:text-green-700 font-semibold underline"
              >
                로그인
              </button>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              신용카드 불필요 • 언제든 탈퇴 가능 • 10만+ 독자
            </p>
          </div>
        </div>
      </div>
    </>
  )
}