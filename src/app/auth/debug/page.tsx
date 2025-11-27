'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'

export default function AuthDebugPage() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [envCheck, setEnvCheck] = useState({
    supabaseUrl: '',
    hasAnonKey: false,
    siteUrl: '',
  })

  useEffect(() => {
    checkAuth()
    checkEnv()
  }, [])

  const checkAuth = async () => {
    const supabase = createClient()

    // Get current session
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    setSession(currentSession)

    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    setUser(currentUser)

    setLoading(false)
  }

  const checkEnv = () => {
    setEnvCheck({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || window.location.origin,
    })
  }

  const testKakaoLogin = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/auth/debug`
      }
    })

    if (error) {
      console.error('Kakao login test error:', error)
      alert(`에러: ${error.message}`)
    } else {
      console.log('Kakao login test initiated:', data)
    }
  }

  const testGoogleLogin = async () => {
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback?next=/auth/debug`
      }
    })

    if (error) {
      console.error('Google login test error:', error)
      alert(`에러: ${error.message}`)
    } else {
      console.log('Google login test initiated:', data)
    }
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-medium-black"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-medium-black hover:underline">
            ← 홈으로
          </Link>
          <h1 className="mt-4 text-heading-1 font-serif text-medium-black">
            인증 디버그 페이지
          </h1>
          <p className="mt-2 text-body text-medium-black-secondary">
            현재 인증 상태와 환경 변수를 확인할 수 있습니다.
          </p>
        </div>

        {/* Environment Check */}
        <div className="mb-8 p-6 bg-medium-gray rounded-lg">
          <h2 className="text-heading-3 font-serif text-medium-black mb-4">
            환경 변수 체크
          </h2>
          <div className="space-y-2">
            <StatusItem
              label="NEXT_PUBLIC_SUPABASE_URL"
              status={!!envCheck.supabaseUrl}
              value={envCheck.supabaseUrl}
            />
            <StatusItem
              label="NEXT_PUBLIC_SUPABASE_ANON_KEY"
              status={envCheck.hasAnonKey}
              value={envCheck.hasAnonKey ? '설정됨 ✓' : '설정 안 됨 ✗'}
            />
            <StatusItem
              label="NEXT_PUBLIC_SITE_URL"
              status={!!envCheck.siteUrl}
              value={envCheck.siteUrl}
            />
          </div>
        </div>

        {/* Authentication Status */}
        <div className="mb-8 p-6 bg-medium-gray rounded-lg">
          <h2 className="text-heading-3 font-serif text-medium-black mb-4">
            인증 상태
          </h2>

          {user ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">로그인됨</span>
              </div>

              <div className="bg-white p-4 rounded border border-medium-gray-border">
                <h3 className="font-semibold text-medium-black mb-2">사용자 정보:</h3>
                <pre className="text-xs overflow-auto bg-medium-gray p-2 rounded">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>

              {session && (
                <div className="bg-white p-4 rounded border border-medium-gray-border">
                  <h3 className="font-semibold text-medium-black mb-2">세션 정보:</h3>
                  <div className="text-sm space-y-1">
                    <p><strong>Provider:</strong> {user.app_metadata?.provider || 'N/A'}</p>
                    <p><strong>이메일:</strong> {user.email || 'N/A'}</p>
                    <p><strong>생성일:</strong> {new Date(user.created_at).toLocaleString('ko-KR')}</p>
                    <p><strong>마지막 로그인:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString('ko-KR') : 'N/A'}</p>
                  </div>
                </div>
              )}

              <button
                onClick={signOut}
                className="btn-primary"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">로그인되지 않음</span>
              </div>

              <p className="text-body-small text-medium-black-secondary">
                아래 버튼으로 OAuth 로그인을 테스트할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Test OAuth */}
        {!user && (
          <div className="mb-8 p-6 bg-medium-gray rounded-lg">
            <h2 className="text-heading-3 font-serif text-medium-black mb-4">
              OAuth 테스트
            </h2>

            <div className="space-y-3">
              <button
                onClick={testKakaoLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#FEE500] hover:bg-[#FDD835] rounded-lg font-medium transition-all"
              >
                카카오 로그인 테스트
              </button>

              <button
                onClick={testGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-medium-gray-border hover:border-medium-black bg-white hover:bg-medium-gray rounded-lg font-medium transition-all"
              >
                구글 로그인 테스트
              </button>
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
              <p className="text-xs text-blue-800">
                <strong>참고:</strong> 로그인 버튼을 클릭하면 브라우저 콘솔(F12)에 상세한 로그가 출력됩니다.
                문제가 발생하면 콘솔을 확인하세요.
              </p>
            </div>
          </div>
        )}

        {/* Callback URL Info */}
        <div className="p-6 bg-medium-gray rounded-lg">
          <h2 className="text-heading-3 font-serif text-medium-black mb-4">
            Callback URL 정보
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <p className="font-semibold text-medium-black mb-1">애플리케이션 Callback:</p>
              <code className="block bg-white p-2 rounded border border-medium-gray-border break-all">
                {window.location.origin}/api/auth/callback
              </code>
            </div>

            <div>
              <p className="font-semibold text-medium-black mb-1">Supabase Callback (카카오 개발자 콘솔에 등록):</p>
              <code className="block bg-white p-2 rounded border border-medium-gray-border break-all">
                {envCheck.supabaseUrl}/auth/v1/callback
              </code>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-800">
                <strong>중요:</strong> 카카오 개발자 콘솔의 Redirect URI에 위의 "Supabase Callback" URL을 정확히 등록해야 합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Documentation Link */}
        <div className="mt-8 text-center">
          <Link
            href="/KAKAO-LOGIN-SETUP.md"
            className="text-medium-green hover:underline"
          >
            📚 설정 가이드 보기
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatusItem({ label, status, value }: { label: string; status: boolean; value: string }) {
  return (
    <div className="flex items-start gap-2">
      {status ? (
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-medium-black">{label}</p>
        <p className="text-sm text-medium-black-secondary break-all">{value}</p>
      </div>
    </div>
  )
}
