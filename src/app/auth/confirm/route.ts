import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Email confirmation route for Magic Link authentication
 *
 * This route handles email verification when users click the confirmation link
 * sent to their email address.
 *
 * URL format: /auth/confirm?token_hash=xxx&type=email
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  console.log('🔐 [Auth Confirm] Processing email confirmation');
  console.log('Token hash:', token_hash ? 'present' : 'missing');
  console.log('Type:', type);

  // Validate required parameters
  if (!token_hash) {
    console.error('❌ [Auth Confirm] Missing token_hash');
    return NextResponse.redirect(
      `${origin}/auth/error?error=invalid_link&error_description=Missing+confirmation+token`
    );
  }

  if (!type) {
    console.error('❌ [Auth Confirm] Missing type parameter');
    return NextResponse.redirect(
      `${origin}/auth/error?error=invalid_link&error_description=Missing+confirmation+type`
    );
  }

  const supabase = await createClient();

  // Verify the OTP token
  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as 'email' | 'signup' | 'magiclink' | 'recovery',
  });

  if (error) {
    console.error('❌ [Auth Confirm] Verification failed:', error.message);

    // Determine error type for better user feedback
    let errorCode = 'verification_failed';
    let errorDescription = error.message;

    if (error.message.toLowerCase().includes('expired')) {
      errorCode = 'otp_expired';
      errorDescription = '인증 링크가 만료되었습니다. 새로운 링크를 요청해주세요.';
    } else if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('not found')) {
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

  // Redirect to the specified page or home
  return NextResponse.redirect(`${origin}${next}`);
}
