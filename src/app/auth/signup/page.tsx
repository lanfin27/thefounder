/**
 * Medium-Style Email Authentication Signup Page
 * 3-Step Flow: Email → OTP Code → Name & Password
 *
 * ⚠️ IMPORTANT: This replaces the old signup flow
 * ✅ Google OAuth is preserved in the login page
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, ArrowRight, Check } from 'lucide-react'
import { OAuthButtons } from '@/components/auth/OAuthButtons'

type Step = 'email' | 'verify' | 'details'

export default function SignupPage() {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [nickname, setNickname] = useState('')
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)

  const router = useRouter()
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendTimer])

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: Send OTP to Email
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    console.log('[Signup] 📧 Step 1 - Sending OTP')
    console.log('[Signup]   Email:', email)
    console.log('[Signup]   Email type:', typeof email)

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인증 코드 발송에 실패했습니다.')
      }

      console.log('[Signup] ✅ OTP sent successfully')
      console.log('[Signup]   Email stored:', email)
      console.log('[Signup]   Moving to verify step')

      setStep('verify')
      setResendTimer(60) // 60 seconds cooldown

      // Auto-focus first code input
      setTimeout(() => codeInputRefs.current[0]?.focus(), 100)

    } catch (err: any) {
      console.error('[Signup] ❌ Send OTP error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: Verify OTP Code
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    // Auto-focus next input
    if (value && index < 5) {
      codeInputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all 6 digits are entered
    if (value && index === 5 && newCode.every(digit => digit)) {
      handleVerifyOTP(newCode.join(''))
    }
  }

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      codeInputRefs.current[index - 1]?.focus()
    }
  }

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    if (pastedData.length === 6) {
      const newCode = pastedData.split('')
      setCode(newCode)
      codeInputRefs.current[5]?.focus()

      // Auto-submit
      handleVerifyOTP(pastedData)
    }
  }

  const handleVerifyOTP = async (otp?: string) => {
    const token = otp || code.join('')

    if (token.length !== 6) {
      setError('6자리 인증 코드를 모두 입력해주세요.')
      return
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DEBUG: Email 확인
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[Signup] 🔍 Verifying OTP...')
    console.log('[Signup]   Email:', email)
    console.log('[Signup]   Email type:', typeof email)
    console.log('[Signup]   Email length:', email?.length)
    console.log('[Signup]   Token:', token)

    if (!email || email.trim() === '') {
      console.error('[Signup] ❌ Email is undefined or empty!')
      setError('이메일 정보가 없습니다. 처음부터 다시 시도해주세요.')
      setStep('email')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const requestBody = { email, token }
      console.log('[Signup] 📤 Sending request:', requestBody)

      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      console.log('[Signup] 📡 Response status:', response.status)

      const data = await response.json()
      console.log('[Signup] 📦 Response data:', data)

      if (!response.ok) {
        throw new Error(data.error || '인증 코드가 올바르지 않습니다.')
      }

      console.log('[Signup] ✅ OTP verified successfully')
      console.log('[Signup]   Is new user?', data.user?.isNewUser)

      if (data.user.isNewUser) {
        // New user → Go to step 3 (set name + password)
        console.log('[Signup] → Moving to details step')
        setStep('details')
      } else {
        // Existing user → Redirect to home
        console.log('[Signup] ℹ️  Existing user, redirecting to home')
        router.push('/')
        router.refresh()
      }

    } catch (err: any) {
      console.error('[Signup] ❌ Verify OTP error:', err)
      setError(err.message)
      setCode(['', '', '', '', '', '']) // Clear code
      codeInputRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: Set Name & Password (New Users Only)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const handleCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          nickname,
          name,
          gender,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      console.log('[Signup] ✅ Signup completed:', data)

      // Redirect to home
      router.push('/')
      router.refresh()

    } catch (err: any) {
      console.error('[Signup] ❌ Complete signup error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (resendTimer > 0) return

    setError(null)
    setCode(['', '', '', '', '', ''])

    try {
      const response = await fetch('/api/auth/send-magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인증 코드 재발송에 실패했습니다.')
      }

      setResendTimer(60)
      codeInputRefs.current[0]?.focus()

    } catch (err: any) {
      setError(err.message)
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Render Different Steps
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <Link href="/" className="text-3xl font-serif font-bold text-medium-black">
            The Founder
          </Link>
          <h2 className="mt-6 text-heading-2 font-serif text-medium-black">
            {step === 'email' && '회원가입'}
            {step === 'verify' && '이메일 확인'}
            {step === 'details' && '프로필 설정'}
          </h2>
          <p className="mt-2 text-body-small text-medium-black-secondary">
            {step === 'email' && (
              <>
                이미 계정이 있으신가요?{' '}
                <Link href="/auth/login" className="font-medium text-medium-green hover:underline">
                  로그인하기
                </Link>
              </>
            )}
            {step === 'verify' && `${email}로 인증 코드를 발송했습니다`}
            {step === 'details' && '마지막 단계입니다'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 text-body-small text-red-600 bg-red-50 rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <div className="space-y-6">
            <OAuthButtons redirectTo="/" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-medium-gray-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-medium-black-tertiary">또는 이메일로</span>
              </div>
            </div>

            <form onSubmit={handleSendOTP} className="space-y-6">
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
                    <span>인증 코드 받기</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="text-xs text-medium-black-tertiary text-center">
                회원가입을 하면 The Founder의{' '}
                <Link href="/terms" className="text-medium-green hover:underline">
                  이용약관
                </Link>
                과{' '}
                <Link href="/privacy" className="text-medium-green hover:underline">
                  개인정보처리방침
                </Link>
                에 동의하는 것으로 간주합니다.
              </div>
            </form>
          </div>
        )}

        {/* Step 2: OTP Code Verification */}
        {step === 'verify' && (
          <div className="space-y-6">
            <div>
              <label className="block text-body-small text-medium-black-secondary text-center mb-6">
                6자리 인증 코드를 입력해주세요
              </label>
              <div className="flex gap-2 justify-center" onPaste={handleCodePaste}>
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { codeInputRefs.current[index] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(index, e)}
                    className="w-12 h-14 text-center text-2xl font-semibold border-2 border-medium-gray-border rounded-lg focus:border-medium-black focus:ring-2 focus:ring-medium-black/10 outline-none transition-all"
                    disabled={loading}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={() => handleVerifyOTP()}
              disabled={loading || code.some(d => !d)}
              className="w-full btn-primary text-body-small flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>확인</span>
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={handleResendOTP}
                disabled={resendTimer > 0}
                className="text-body-small text-medium-black-secondary hover:text-medium-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendTimer > 0 ? (
                  `${resendTimer}초 후 재전송 가능`
                ) : (
                  '인증 코드 재전송'
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('email')
                setCode(['', '', '', '', '', ''])
                setError(null)
              }}
              className="w-full text-body-small text-medium-black-secondary hover:text-medium-black"
            >
              이메일 변경
            </button>
          </div>
        )}

        {/* Step 3: Name & Password Setup */}
        {step === 'details' && (
          <form onSubmit={handleCompleteSignup} className="space-y-6">
            {/* Email (Read-only) */}
            <div>
              <label className="block text-body-small font-medium text-medium-black mb-2">
                이메일
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="input-field bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Nickname */}
            <div>
              <label htmlFor="nickname" className="block text-body-small font-medium text-medium-black mb-2">
                닉네임
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                required
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="input-field"
                placeholder="닉네임을 입력해주세요"
                autoFocus
                minLength={2}
              />
            </div>

            {/* Real Name */}
            <div>
              <label htmlFor="name" className="block text-body-small font-medium text-medium-black mb-2">
                이름
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="실명을 입력해주세요"
                minLength={2}
              />
            </div>

            {/* Gender */}
            <div>
              <label className="block text-body-small font-medium text-medium-black mb-2">
                성별
              </label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === 'male'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-medium-black border-gray-300 focus:ring-medium-black"
                  />
                  <span className="text-body-small text-medium-black">남성</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === 'female'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-medium-black border-gray-300 focus:ring-medium-black"
                  />
                  <span className="text-body-small text-medium-black">여성</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value="none"
                    checked={gender === 'none'}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-4 h-4 text-medium-black border-gray-300 focus:ring-medium-black"
                  />
                  <span className="text-body-small text-medium-black">선택 안함</span>
                </label>
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-body-small font-medium text-medium-black mb-2">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="8자 이상"
                minLength={8}
              />
              <p className="mt-2 text-xs text-medium-black-tertiary">
                비밀번호는 최소 8자 이상이어야 합니다
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-body-small font-medium text-medium-black mb-2">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="비밀번호를 다시 입력해주세요"
                minLength={8}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="mt-2 text-xs text-red-600">
                  비밀번호가 일치하지 않습니다
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !nickname.trim() || !name.trim() || !gender || password.length < 8 || password !== confirmPassword}
              className="w-full btn-primary text-body-small flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>회원가입 완료</span>
                  <Check className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
