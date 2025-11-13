/**
 * Send Magic Link / OTP API
 * Medium-style email authentication - Step 1
 *
 * Sends a 6-digit OTP code to the user's email
 * DEV MODE: Outputs OTP to console instead of sending email
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import devOTPStore from '@/lib/dev-otp-store'

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
      console.error('[Send Magic Link API] ❌ Error:', error.message)

      // Detailed error logging
      console.error('[Send Magic Link API] Error details:', {
        message: error.message,
        status: error.status,
        name: error.name,
      })

      // User-friendly error messages
      let errorMessage = '인증 코드 발송에 실패했습니다.'

      if (error.message.includes('Email') || error.message.includes('email')) {
        errorMessage = '이메일 발송 설정을 확인해주세요. Supabase Dashboard에서 Email Provider를 설정해주세요.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.'
      } else if (error.message.includes('database') || error.message.includes('Database')) {
        errorMessage = '데이터베이스 오류입니다. SQL 마이그레이션이 완료되었는지 확인해주세요.'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.message,
        },
        { status: 500 }
      )
    }

    console.log('[Send Magic Link API] ✅ OTP sent successfully')

    return NextResponse.json({
      success: true,
      message: '인증 코드가 이메일로 발송되었습니다.',
      email,
    })

  } catch (error) {
    console.error('[Send Magic Link API] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
