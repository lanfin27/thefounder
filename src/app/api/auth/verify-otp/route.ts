/**
 * Verify OTP API
 * Medium-style email authentication - Step 2
 *
 * Verifies the 6-digit OTP code and returns user info
 * DEV MODE: Verifies against in-memory OTP store
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import devOTPStore from '@/lib/dev-otp-store'

const DEV_MODE = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    const { email, token } = await request.json()

    if (!email || !token) {
      return NextResponse.json(
        { error: '이메일과 인증 코드를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    // Token should be 6 digits
    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json(
        { error: '인증 코드는 6자리 숫자여야 합니다.' },
        { status: 400 }
      )
    }

    console.log('[Verify OTP API] 🔐 Verifying OTP for:', email)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DEVELOPMENT MODE: Verify from shared OTP store
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (DEV_MODE) {
      // ✅ Use shared OTP store for verification
      const result = devOTPStore.verify(email, token)

      if (!result.success) {
        console.error('[Verify OTP API] ❌ Verification failed:', result.error)
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      console.log('[Verify OTP API] ✅ Dev mode verification success for:', email)

      // Debug: Show store state after verification
      devOTPStore.debug()

      // In dev mode, always treat as new user (no database check needed)
      return NextResponse.json({
        success: true,
        message: '인증에 성공했습니다. (개발 모드)',
        user: {
          id: 'dev-user-' + Date.now(), // Mock user ID
          email: email,
          isNewUser: true, // Always new user in dev mode
        },
        session: {
          access_token: 'dev-access-token',
          refresh_token: 'dev-refresh-token',
        },
        devMode: true,
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRODUCTION MODE: Verify with Supabase
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const supabase = await createClient()

    // Verify OTP with Supabase Auth
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })

    if (error) {
      console.error('[Verify OTP API] ❌ Verification failed:', error.message)

      // Provide user-friendly error messages
      let errorMessage = '인증 코드가 올바르지 않습니다.'
      if (error.message.includes('expired')) {
        errorMessage = '인증 코드가 만료되었습니다. 새 코드를 요청해주세요.'
      } else if (error.message.includes('invalid')) {
        errorMessage = '인증 코드가 올바르지 않습니다. 다시 확인해주세요.'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.message
        },
        { status: 400 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '사용자 정보를 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    console.log('[Verify OTP API] ✅ OTP verified for user:', data.user.id)

    // Check if user has a profile (to determine if it's a new user)
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, full_name, name, role')
      .eq('id', data.user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows
      console.error('[Verify OTP API] ❌ Profile check error:', profileError)
    }

    // Determine if this is a new user (no profile or no full_name set)
    const isNewUser = !profile || (!profile.full_name && !profile.name)

    console.log('[Verify OTP API] 📊 User status:', {
      userId: data.user.id,
      isNewUser,
      hasProfile: !!profile,
      hasFullName: !!profile?.full_name,
    })

    return NextResponse.json({
      success: true,
      message: '인증에 성공했습니다.',
      user: {
        id: data.user.id,
        email: data.user.email,
        isNewUser,
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
    })

  } catch (error) {
    console.error('[Verify OTP API] ❌ Unexpected error:', error)
    return NextResponse.json(
      {
        error: '서버 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
