/**
 * Magic Link Email Authentication Signup Page
 *
 * Simple flow: Email → Send Magic Link → Redirect to verify-email page
 * Profile setup happens after Magic Link verification via /auth/setup-profile
 *
 * Error handling: Shows user-friendly messages while logging detailed info for developers
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowRight } from 'lucide-react'
import { OAuthButtons } from '@/components/auth/OAuthButtons'
import { analyzeAuthError, logAuthError } from '@/lib/errors/auth-errors'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showOAuthFallback, setShowOAuthFallback] = useState(false)

  const router = useRouter()

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setShowOAuthFallback(false)
    setLoading(true)

    console.log('[Signup] Sending Magic Link to:', email)

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Create error object with response data for analysis
        const errorObj = {
          message: data.error || 'Email send failed',
          status: response.status,
          code: data.code,
        }

        // Log detailed error for developers
        logAuthError(errorObj, 'Signup - Magic Link')

        // Analyze and show user-friendly message
        const errorInfo = analyzeAuthError(errorObj)
        setError(errorInfo.userMessage)
        setShowOAuthFallback(errorInfo.shouldShowOAuthFallback)
        setLoading(false)
        return
      }

      console.log('[Signup] Magic Link sent successfully')

      // Redirect to verify-email page with email parameter
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)

    } catch (err: any) {
      // Log detailed error for developers
      logAuthError(err, 'Signup - Unexpected Error')

      // Analyze and show user-friendly message
      const errorInfo = analyzeAuthError(err)
      setError(errorInfo.userMessage)
      setShowOAuthFallback(errorInfo.shouldShowOAuthFallback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-serif font-bold text-medium-black">
            The Founder
          </Link>
          <h2 className="mt-6 text-heading-2 font-serif text-medium-black">
            회원가입
          </h2>
          <p className="mt-2 text-body-small text-medium-black-secondary">
            이미 계정이 있으신가요?{' '}
            <Link href="/auth/login" className="font-medium text-medium-green hover:underline">
              로그인하기
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-body-small text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* OAuth Fallback Message - shown when email fails */}
        {showOAuthFallback && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <strong>빠르고 안전한 가입:</strong><br />
              Google 또는 Kakao 계정으로 간편하게 가입할 수 있습니다.
            </p>
          </div>
        )}

        {/* OAuth Buttons */}
        <div className="space-y-6">
          <OAuthButtons redirectTo="/" />

          {/* Only show email form section if not in OAuth fallback mode */}
          {!showOAuthFallback && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-medium-gray-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-medium-black-tertiary">또는 이메일로</span>
              </div>
            </div>
          )}

          {/* Email Form - hidden when OAuth fallback is active */}
          {!showOAuthFallback && (
            <form onSubmit={handleSendMagicLink} className="space-y-6">
              <div>
                <label htmlFor="email" className="sr-only">
                  이메일
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
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
                    className="input-field pl-12 text-body-large"
                    placeholder="이메일 주소"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full btn-primary text-body-small flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>인증 메일 받기</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              {/* Info Text */}
              <div className="text-xs text-medium-black-tertiary text-center space-y-2">
                <p>
                  이메일로 인증 링크가 발송됩니다.
                  <br />
                  링크를 클릭하면 자동으로 회원가입이 진행됩니다.
                </p>
                <p>
                  회원가입을 하면 The Founder의{' '}
                  <Link href="/terms" className="text-medium-green hover:underline">
                    이용약관
                  </Link>
                  과{' '}
                  <Link href="/privacy" className="text-medium-green hover:underline">
                    개인정보처리방침
                  </Link>
                  에 동의하는 것으로 간주합니다.
                </p>
              </div>
            </form>
          )}

          {/* Terms for OAuth fallback mode */}
          {showOAuthFallback && (
            <p className="text-xs text-medium-black-tertiary text-center">
              회원가입을 하면 The Founder의{' '}
              <Link href="/terms" className="text-medium-green hover:underline">
                이용약관
              </Link>
              과{' '}
              <Link href="/privacy" className="text-medium-green hover:underline">
                개인정보처리방침
              </Link>
              에 동의하는 것으로 간주합니다.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
