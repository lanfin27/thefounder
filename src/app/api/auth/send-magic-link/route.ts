/**
 * Send Magic Link / OTP API
 * Medium-style email authentication - Step 1
 *
 * Sends a 6-digit OTP code to the user's email
 * DEV MODE: Outputs OTP to console instead of sending email
 *
 * Uses user-friendly error messages while logging detailed info for developers.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import devOTPStore from '@/lib/dev-otp-store'
import { analyzeAuthError, logAuthError } from '@/lib/errors/auth-errors'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Development mode flag
const DEV_MODE = process.env.NODE_ENV === 'development'

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: '이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    console.log('[Send Magic Link API] 📧 Sending OTP to:', email)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DEVELOPMENT MODE: Console OTP (No email required)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (DEV_MODE) {
      const otp = generateOTP()

      // ✅ Store OTP in shared storage (accessible across all API routes)
      devOTPStore.set(email, otp, 10) // 10 minutes expiry

      console.log('')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('🔑 [DEV MODE] OTP CODE FOR:', email)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('   CODE:', otp)
      console.log('   EXPIRES: 10 minutes')
      console.log('   (Copy and paste this code in the signup form)')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('')

      // Debug: Show OTP store state
      devOTPStore.debug()

      return NextResponse.json({
        success: true,
        message: '인증 코드가 생성되었습니다. (개발 모드: 터미널 콘솔 확인)',
        email,
        devMode: true,
        // NOTE: Only send OTP in response for development
        devOtp: otp,
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRODUCTION MODE: Real email via Supabase
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const supabase = await createClient()

    // Send OTP via Supabase Auth
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // Auto-create user if doesn't exist
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    })

    if (error) {
      // Log detailed error for developers (server logs)
      logAuthError(error, 'Send Magic Link API')

      // Analyze error and return user-friendly message
      const errorInfo = analyzeAuthError(error)

      // Use appropriate status code based on error type
      const statusCode = errorInfo.type === 'rate_limit' ? 429 : 500

      return NextResponse.json(
        { error: errorInfo.userMessage },
        { status: statusCode }
      )
    }

    console.log('[Send Magic Link API] ✅ OTP sent successfully')

    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 발송되었습니다.',
      email,
    })

  } catch (error) {
    // Log detailed error for developers
    logAuthError(error, 'Send Magic Link API - Unexpected')

    // Return generic user-friendly message
    const errorInfo = analyzeAuthError(error)

    return NextResponse.json(
      { error: errorInfo.userMessage },
      { status: 500 }
    )
  }
}
