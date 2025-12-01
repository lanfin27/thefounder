/**
 * Resend Magic Link Email API
 *
 * Resends the Magic Link email for authentication.
 * Uses user-friendly error messages while logging detailed info for developers.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { analyzeAuthError, logAuthError } from '@/lib/errors/auth-errors';

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

    console.log('[Resend Email API] Resending Magic Link to:', email);

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
      // Log detailed error for developers (server logs)
      logAuthError(error, 'Resend Email API');

      // Analyze error and return user-friendly message
      const errorInfo = analyzeAuthError(error);

      // Use appropriate status code based on error type
      const statusCode = errorInfo.type === 'rate_limit' ? 429 : 500;

      return NextResponse.json(
        { error: errorInfo.userMessage },
        { status: statusCode }
      );
    }

    console.log('[Resend Email API] Magic Link sent successfully');

    return NextResponse.json({
      success: true,
      message: '인증 이메일이 발송되었습니다.',
    });

  } catch (error: any) {
    // Log detailed error for developers
    logAuthError(error, 'Resend Email API - Unexpected');

    // Return generic user-friendly message
    const errorInfo = analyzeAuthError(error);

    return NextResponse.json(
      { error: errorInfo.userMessage },
      { status: 500 }
    );
  }
}
