import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Email confirmation route for Magic Link authentication
 *
 * This route handles email verification when users click the confirmation link
 * sent to their email address. It uses verifyOtp() instead of exchangeCodeForSession()
 * to avoid PKCE errors.
 *
 * URL format: /auth/confirm?token_hash=xxx&type=magiclink|signup|email
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📧 [Auth Confirm] Magic Link Verification');
  console.log('Token hash:', token_hash ? 'present' : 'missing');
  console.log('Type:', type);
  console.log('Next:', next);
  console.log('Origin:', origin);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Validate required parameters
  if (!token_hash) {
    console.error('❌ [Auth Confirm] Missing token_hash');
    return NextResponse.redirect(
      `${origin}/auth/error?error=missing_parameters&error_description=${encodeURIComponent('Token hash is missing')}`
    );
  }

  if (!type) {
    console.error('❌ [Auth Confirm] Missing type parameter');
    return NextResponse.redirect(
      `${origin}/auth/error?error=missing_parameters&error_description=${encodeURIComponent('Type parameter is missing')}`
    );
  }

  const supabase = await createClient();

  try {
    // Verify the OTP token (Magic Link flow - no PKCE required)
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'magiclink' | 'recovery',
    });

    if (error) {
      console.error('❌ [Auth Confirm] Verification failed:', error.message);
      console.error('Error code:', error.code);

      // Determine error type for better user feedback
      let errorCode = 'verification_failed';
      let errorDescription = error.message;

      if (error.message.toLowerCase().includes('expired') || error.code === 'otp_expired') {
        errorCode = 'otp_expired';
        errorDescription = '인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요.';
      } else if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('not found') || error.code === 'invalid_token') {
        errorCode = 'invalid_link';
        errorDescription = '유효하지 않은 인증 링크입니다. 이미 사용되었거나 잘못된 링크일 수 있습니다.';
      } else if (error.message.toLowerCase().includes('already')) {
        errorCode = 'already_confirmed';
        errorDescription = '이미 인증이 완료된 계정입니다.';
      }

      return NextResponse.redirect(
        `${origin}/auth/error?error=${errorCode}&error_description=${encodeURIComponent(errorDescription)}`
      );
    }

    console.log('✅ [Auth Confirm] Email verified successfully');
    console.log('User ID:', data?.user?.id);
    console.log('Email:', data?.user?.email);

    // Redirect to the specified page or home
    console.log('🔄 [Auth Confirm] Redirecting to:', next);
    return NextResponse.redirect(`${origin}${next}`);

  } catch (err: any) {
    console.error('❌ [Auth Confirm] Unexpected error:', err);
    return NextResponse.redirect(
      `${origin}/auth/error?error=unexpected_error&error_description=${encodeURIComponent(err.message || 'An unexpected error occurred')}`
    );
  }
}
