/**
 * Sign In API
 * Email + Password authentication
 *
 * Alternative to client-side signInWithPassword for existing users
 * Note: Most apps can use client-side auth directly, this is provided for server-side needs
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: '이메일과 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      )
    }

    console.log('[Sign In API] 🔐 Sign in attempt for:', email)

    const supabase = await createClient()

    // Sign in with email and password
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('[Sign In API] ❌ Sign in failed:', error.message)

      // Provide user-friendly error messages
      let errorMessage = '로그인에 실패했습니다.'
      if (error.message.includes('Invalid login credentials')) {
        errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '이메일 인증이 완료되지 않았습니다.'
      }

      return NextResponse.json(
        {
          error: errorMessage,
          details: error.message
        },
        { status: 401 }
      )
    }

    if (!data.user) {
      return NextResponse.json(
        { error: '사용자 정보를 가져올 수 없습니다.' },
        { status: 500 }
      )
    }

    console.log('[Sign In API] ✅ Sign in successful for user:', data.user.id)

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, name, role')
      .eq('id', data.user.id)
      .single()

    return NextResponse.json({
      success: true,
      message: '로그인에 성공했습니다.',
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: profile?.full_name || profile?.name || '',
        role: profile?.role || 'member',
      },
      session: {
        access_token: data.session?.access_token,
        refresh_token: data.session?.refresh_token,
      },
    })

  } catch (error) {
    console.error('[Sign In API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
