/**
 * Resend Magic Link Email API
 *
 * Resends the Magic Link email for authentication.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: '이메일을 입력해주세요.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      );
    }

    console.log('[Resend Email API] 📧 Resending Magic Link to:', email);

    const supabase = await createClient();

    // Get the site URL for redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Send Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${siteUrl}/auth/confirm`,
        shouldCreateUser: true, // Allow new user creation
      },
    });

    if (error) {
      console.error('[Resend Email API] ❌ Failed to send email:', error);

      // Handle rate limiting
      if (error.message.includes('rate') || error.message.includes('limit')) {
        return NextResponse.json(
          { error: '너무 많은 요청입니다. 잠시 후 다시 시도해주세요.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      );
    }

    console.log('[Resend Email API] ✅ Magic Link sent successfully');

    return NextResponse.json({
      success: true,
      message: '인증 이메일이 발송되었습니다.',
    });

  } catch (error: any) {
    console.error('[Resend Email API] ❌ Unexpected error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
