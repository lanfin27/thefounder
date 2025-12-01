'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { OAuthButtons } from './OAuthButtons'
import { Mail, Lock } from 'lucide-react'
import { analyzeAuthError, logAuthError } from '@/lib/errors/auth-errors'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOAuthFallback, setShowOAuthFallback] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // Get redirect destination from URL params (default to '/')
  const redirectTo = searchParams.get('redirectTo') || '/'

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowOAuthFallback(false)
    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginError) {
      // Log detailed error for developers
      logAuthError(loginError, 'Login - Password')

      // Handle specific login errors with user-friendly messages
      if (loginError.message === 'Invalid login credentials') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        setShowOAuthFallback(false)
      } else {
        // For other errors, use the error analyzer
        const errorInfo = analyzeAuthError(loginError)
        setError(errorInfo.userMessage)
        setShowOAuthFallback(errorInfo.shouldShowOAuthFallback)
      }
      setLoading(false)
    } else {
      console.log('[LoginForm] Login successful, redirecting to:', redirectTo)
      router.push(redirectTo)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="p-3 text-body-small text-red-600 bg-red-50 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {/* OAuth Fallback Message */}
      {showOAuthFallback && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>빠르고 안전한 로그인:</strong><br />
            Google 또는 Kakao 계정으로 간편하게 로그인할 수 있습니다.
          </p>
        </div>
      )}

      <OAuthButtons
        redirectTo={redirectTo}
        onError={(error) => {
          logAuthError(error, 'Login - OAuth')
          const errorInfo = analyzeAuthError(error)
          setError(errorInfo.userMessage)
        }}
      />

      {/* Email/password form - hidden when OAuth fallback is active */}
      {!showOAuthFallback && (
        <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-medium-gray-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-medium-black-tertiary">또는 이메일로</span>
            </div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                이메일
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-medium-black-tertiary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="이메일 주소"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="sr-only">
                비밀번호
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-medium-black-tertiary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="비밀번호"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-body-small disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}