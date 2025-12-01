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
          .select('id, full_name')
          .eq('id', data.user.id)
          .single();

        const userMetadata = data.user.user_metadata || {};
        const oauthFullName = userMetadata.full_name || userMetadata.name || '';

        console.log('📊 [Auth Callback] OAuth metadata:', {
          provider: data.user.app_metadata?.provider,
          oauthFullName: oauthFullName || '(empty)',
        });

        // Profile not found (PGRST116 = no rows) - NEW USER!
        if (profileError && profileError.code === 'PGRST116') {
          console.log('📝 [Auth Callback] Profile not found, creating profile for OAuth user...');

          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          // For OAuth: Use OAuth-provided name if available
          // Otherwise empty (will trigger setup-profile)
          // Failsafe: Database Trigger may have already created it
          // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          try {
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: data.user.id,
                email: data.user.email,
                full_name: oauthFullName,  // OAuth name or empty
                role: 'user',
                subscription_tier: 'free',
                subscription_status: 'active',
              });

            if (insertError) {
              // 23505 = unique_violation (Trigger already created profile)
              if (insertError.code === '23505') {
                console.log('✅ [Auth Callback] Profile already exists (created by database trigger)');
              } else {
                console.error('❌ [Auth Callback] Failed to create profile:', insertError);
                console.error('Insert error details:', insertError.code, insertError.details);
              }
            } else {
              console.log('✅ [Auth Callback] Profile created for OAuth user');
            }
          } catch (insertErr: any) {
            console.error('❌ [Auth Callback] Unexpected insert error:', insertErr);
            // Continue even if insert fails - trigger may have created profile
          }

          // Check if profile setup needed (no OAuth name provided)
          if (!oauthFullName || oauthFullName.trim() === '') {
            console.log('🆕 [Auth Callback] No OAuth name, redirecting to profile setup');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return NextResponse.redirect(`${origin}/auth/setup-profile`);
          }
        } else if (profileError) {
          console.error('⚠️ [Auth Callback] Profile check error:', profileError);
        } else {
          console.log('👋 [Auth Callback] Existing profile found');

          // Check if existing profile needs setup
          const needsProfileSetup = !profile?.full_name || profile.full_name.trim() === '';

          if (needsProfileSetup) {
            console.log('🆕 [Auth Callback] Profile incomplete, redirecting to profile setup');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return NextResponse.redirect(`${origin}/auth/setup-profile`);
          }
        }
      }

      console.log('🔀 [Auth Callback] Redirecting to:', next);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
