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

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔐 [Auth Callback] Processing authentication');
  console.log('Code:', code ? 'present' : 'missing');
  console.log('Token hash:', token_hash ? 'present' : 'missing');
  console.log('Type:', type);
  console.log('Error:', error);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Handle error from Supabase
  if (error || error_code) {
    console.error('❌ [Auth Callback] Error from Supabase:', error || error_code, error_description);
    const errorParams = new URLSearchParams({
      error: error || error_code || 'unknown_error',
      ...(error_description && { error_description }),
      ...(error_code && { error_code }),
    });
    return NextResponse.redirect(`${origin}/auth/error?${errorParams.toString()}`);
  }

  // ============================================
  // Magic Link detected → redirect to /auth/confirm
  // This prevents PKCE errors by using the correct flow
  // ============================================
  if (token_hash && type) {
    console.log('📧 [Auth Callback] Magic Link detected, redirecting to /auth/confirm');

    const confirmUrl = new URL('/auth/confirm', origin);
    confirmUrl.searchParams.set('token_hash', token_hash);
    confirmUrl.searchParams.set('type', type);
    if (next !== '/') {
      confirmUrl.searchParams.set('next', next);
    }

    return NextResponse.redirect(confirmUrl.toString());
  }

  // ============================================
  // OAuth callback (code exchange) - PKCE flow
  // ============================================
  if (code) {
    console.log('🔑 [Auth Callback] Processing OAuth code exchange');

    const supabase = await createClient();

    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('❌ [Auth Callback] Code exchange failed:', exchangeError.message);
        console.error('Error code:', exchangeError.code);
        return NextResponse.redirect(
          `${origin}/auth/error?error=exchange_failed&error_description=${encodeURIComponent(exchangeError.message)}`
        );
      }

      console.log('✅ [Auth Callback] OAuth code exchange successful');
      console.log('User ID:', data?.user?.id);
      console.log('Email:', data?.user?.email);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // Ensure user profile exists (auto-create for OAuth users)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      if (data?.user) {
        console.log('👤 [Auth Callback] Checking user profile...');

        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', data.user.id)
          .single();

        // Profile not found (PGRST116 = no rows) - create it
        if (profileError && profileError.code === 'PGRST116') {
          console.log('📝 [Auth Callback] Profile not found, creating new profile...');

          const userMetadata = data.user.user_metadata || {};

          // Create profile automatically
          const { error: insertError } = await supabase
            .from('user_profiles')
            .insert({
              id: data.user.id,
              email: data.user.email,
              name: userMetadata.full_name || userMetadata.name || userMetadata.nickname || data.user.email,
              full_name: userMetadata.full_name || userMetadata.name || '',
              avatar_url: userMetadata.avatar_url || userMetadata.picture || '',
              role: 'user',
            });

          if (insertError) {
            console.error('❌ [Auth Callback] Failed to create profile:', insertError);
          } else {
            console.log('✅ [Auth Callback] Profile created successfully for OAuth user');
          }
        } else if (profileError) {
          console.error('⚠️ [Auth Callback] Profile check error:', profileError);
        } else {
          console.log('👋 [Auth Callback] Existing profile found');
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    } catch (err: any) {
      console.error('❌ [Auth Callback] Unexpected error:', err);
      return NextResponse.redirect(
        `${origin}/auth/error?error=unexpected_error&error_description=${encodeURIComponent(err.message || 'An unexpected error occurred')}`
      );
    }
  }

  // No valid parameters
  console.warn('⚠️ [Auth Callback] No authentication parameters found');
  return NextResponse.redirect(`${origin}/auth/error?error=missing_parameters&error_description=No+authentication+parameters+provided`);
}
