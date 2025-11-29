/**
 * Complete Signup API
 * Medium-style email authentication - Step 3
 *
 * Creates Supabase Auth user with email and password
 * Works in both development and production modes
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEV_MODE = process.env.NODE_ENV === 'development'

export async function POST(request: NextRequest) {
  try {
    const { email, fullName, password } = await request.json()

    // Validation
    if (!email || !fullName || !password) {
      return NextResponse.json(
        { error: '모든 필드를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (fullName.trim().length < 2) {
      return NextResponse.json(
        { error: '이름은 최소 2자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: '비밀번호는 최소 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    console.log('[Complete Signup API] 📝 Completing signup for:', email)
    console.log('[Complete Signup API] 🔍 Mode:', DEV_MODE ? 'DEVELOPMENT' : 'PRODUCTION')

    const supabase = await createClient()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // DEVELOPMENT MODE: signUp + Manual Profile Creation
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    if (DEV_MODE) {
      console.log('[Complete Signup API] 🔧 Dev mode: signUp + Manual Profile Creation')

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 1: Supabase Auth에 사용자 생성
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[Complete Signup API] 🔐 Step 1: Creating auth user...')

      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName.trim()
          }
        }
      })

      if (error) {
        console.error('[Complete Signup API] ❌ SignUp error:', error)
        console.error('[Complete Signup API]   Code:', error.code)
        console.error('[Complete Signup API]   Message:', error.message)

        return NextResponse.json(
          { error: '회원가입에 실패했습니다: ' + error.message },
          { status: 500 }
        )
      }

      if (!data.user) {
        console.error('[Complete Signup API] ❌ No user returned')
        return NextResponse.json(
          { error: '사용자 생성에 실패했습니다.' },
          { status: 500 }
        )
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('[Complete Signup API] ✅ Auth user created!')
      console.log('[Complete Signup API]   User ID:', data.user.id)
      console.log('[Complete Signup API]   Email:', data.user.email)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 2: 잠시 대기 (Auth 완전 저장 대기)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[Complete Signup API] ⏳ Waiting 500ms for auth to settle...')
      await new Promise(resolve => setTimeout(resolve, 500))

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 3: user_profiles에 프로필 직접 생성 (트리거 우회)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[Complete Signup API] 📝 Step 2: Creating profile manually...')

      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          id: data.user.id,
          email: email,
          full_name: fullName.trim(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })

      if (profileError) {
        console.error('[Complete Signup API] ⚠️  Profile creation error:', profileError)
        console.error('[Complete Signup API]   Code:', profileError.code)
        console.error('[Complete Signup API]   Message:', profileError.message)
        console.error('[Complete Signup API]   Details:', profileError.details)

        // 프로필 생성 실패해도 사용자는 이미 생성됨
        // 나중에 프로필 수동 생성 가능하므로 경고만 출력
        console.log('[Complete Signup API] ⚠️  User created but profile failed')
        console.log('[Complete Signup API] ⚠️  User can still log in')
      } else {
        console.log('[Complete Signup API] ✅ Profile created successfully!')
      }

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Step 4: Newsletter 상태 자동 업데이트
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      console.log('[Complete Signup API] 📧 Checking newsletter subscription...')

      const { data: subscription, error: newsletterCheckError } = await supabase
        .from('newsletter_subscribers')
        .select('id, is_member, email')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (newsletterCheckError) {
        console.error('[Complete Signup API] ⚠️  Newsletter check error:', newsletterCheckError)
        // Continue anyway - newsletter sync is not critical
      } else if (subscription) {
        console.log('[Complete Signup API] ✉️  Found existing newsletter subscription')
        console.log('[Complete Signup API]   Email:', subscription.email)
        console.log('[Complete Signup API]   Current is_member:', subscription.is_member)

        if (!subscription.is_member) {
          console.log('[Complete Signup API] 🔄 Updating newsletter status to member...')

          const { error: updateError } = await supabase
            .from('newsletter_subscribers')
            .update({
              is_member: true,
              user_id: data.user.id,
              member_since: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('email', email.toLowerCase())

          if (updateError) {
            console.error('[Complete Signup API] ⚠️  Failed to update newsletter status:', updateError)
            // Continue anyway - newsletter sync is not critical
          } else {
            console.log('[Complete Signup API] ✅ Newsletter status updated to member!')
          }
        } else {
          console.log('[Complete Signup API] ℹ️  Already marked as member')
        }
      } else {
        console.log('[Complete Signup API] ℹ️  No newsletter subscription found')
      }

      return NextResponse.json({
        success: true,
        message: '회원가입이 완료되었습니다.',
        user: data.user,
        session: data.session,
        profileCreated: !profileError
      })
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRODUCTION MODE: Update existing user from OTP flow
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('[Complete Signup API] 🚀 Production mode: Using existing session')

    // Get current user (already authenticated via OTP)
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('[Complete Signup API] ❌ No authenticated user:', userError)
      return NextResponse.json(
        { error: '인증된 사용자가 없습니다. 다시 로그인해주세요.' },
        { status: 401 }
      )
    }

    if (user.email !== email) {
      console.error('[Complete Signup API] ❌ Email mismatch:', {
        userEmail: user.email,
        providedEmail: email,
      })
      return NextResponse.json(
        { error: '이메일 주소가 일치하지 않습니다.' },
        { status: 400 }
      )
    }

    // Update user password
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    })

    if (passwordError) {
      console.error('[Complete Signup API] ❌ Password update failed:', passwordError)
      return NextResponse.json(
        {
          error: '비밀번호 설정에 실패했습니다.',
          details: passwordError.message
        },
        { status: 500 }
      )
    }

    console.log('[Complete Signup API] ✅ Password set successfully')

    // Update user profile with full name
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        full_name: fullName.trim(),
        name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('[Complete Signup API] ❌ Profile update failed:', profileError)
      console.warn('[Complete Signup API] ⚠️  Password set but profile update failed')
    } else {
      console.log('[Complete Signup API] ✅ Profile updated successfully')
    }

    // Update user metadata
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        full_name: fullName.trim(),
        name: fullName.trim(),
      },
    })

    if (metadataError) {
      console.error('[Complete Signup API] ⚠️  Metadata update failed:', metadataError)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Newsletter 상태 자동 업데이트 (Production Mode)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    console.log('[Complete Signup API] 📧 Checking newsletter subscription...')

    const { data: subscription, error: newsletterCheckError } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_member, email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (newsletterCheckError) {
      console.error('[Complete Signup API] ⚠️  Newsletter check error:', newsletterCheckError)
      // Continue anyway - newsletter sync is not critical
    } else if (subscription) {
      console.log('[Complete Signup API] ✉️  Found existing newsletter subscription')
      console.log('[Complete Signup API]   Email:', subscription.email)
      console.log('[Complete Signup API]   Current is_member:', subscription.is_member)

      if (!subscription.is_member) {
        console.log('[Complete Signup API] 🔄 Updating newsletter status to member...')

        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({
            is_member: true,
            user_id: user.id,
            member_since: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('email', email.toLowerCase())

        if (updateError) {
          console.error('[Complete Signup API] ⚠️  Failed to update newsletter status:', updateError)
          // Continue anyway - newsletter sync is not critical
        } else {
          console.log('[Complete Signup API] ✅ Newsletter status updated to member!')
        }
      } else {
        console.log('[Complete Signup API] ℹ️  Already marked as member')
      }
    } else {
      console.log('[Complete Signup API] ℹ️  No newsletter subscription found')
    }

    console.log('[Complete Signup API] ✅ Production signup completed for:', email)

    return NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: {
        id: user.id,
        email: user.email,
        fullName: fullName.trim(),
      },
    })

  } catch (error) {
    console.error('[Complete Signup API] ❌ Unexpected error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
