import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');
  const error_code = requestUrl.searchParams.get('error_code');
  const next = requestUrl.searchParams.get('next') || '/';
  const origin = requestUrl.origin;

  console.log('🔐 [Auth Callback] Processing authentication');
  console.log('Code:', code ? 'present' : 'missing');
  console.log('Token hash:', token_hash ? 'present' : 'missing');
  console.log('Type:', type);
  console.log('Error:', error);

  // Handle error from Supabase
  if (error) {
    console.error('❌ [Auth Callback] Error from Supabase:', error, error_description);
    const errorParams = new URLSearchParams({
      error: error,
      ...(error_description && { error_description }),
      ...(error_code && { error_code }),
    });
    return NextResponse.redirect(`${origin}/auth/error?${errorParams.toString()}`);
  }

  const supabase = await createClient();

  // OAuth callback (code exchange)
  if (code) {
    console.log('🔑 [Auth Callback] Processing OAuth code exchange');

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error('❌ [Auth Callback] Code exchange failed:', exchangeError.message);
      return NextResponse.redirect(
        `${origin}/auth/error?error=exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`
      );
    }

    console.log('✅ [Auth Callback] OAuth code exchange successful');
    return NextResponse.redirect(`${origin}${next}`);
  }

  // Magic Link callback (token_hash)
  if (token_hash && type) {
    console.log('📧 [Auth Callback] Processing Magic Link verification');

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as 'email' | 'signup' | 'magiclink',
    });

    if (verifyError) {
      console.error('❌ [Auth Callback] Magic Link verification failed:', verifyError.message);

      let errorCode = 'verification_failed';
      if (verifyError.message.includes('expired')) {
        errorCode = 'otp_expired';
      } else if (verifyError.message.includes('invalid')) {
        errorCode = 'invalid_link';
      }

      return NextResponse.redirect(
        `${origin}/auth/error?error=${errorCode}&error_description=${encodeURIComponent(verifyError.message)}`
      );
    }

    console.log('✅ [Auth Callback] Magic Link verified successfully');
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No valid parameters
  console.warn('⚠️ [Auth Callback] No authentication parameters found');
  return NextResponse.redirect(`${origin}/auth/error?error=missing_parameters&error_description=No+authentication+parameters+provided`);
}
