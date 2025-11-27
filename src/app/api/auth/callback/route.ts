import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[Auth Callback] Received callback request:', {
    hasCode: !!code,
    next,
    error,
    errorDescription,
    origin
  })

  // Handle OAuth provider errors (user cancelled, etc.)
  if (error) {
    console.error('[Auth Callback] OAuth provider error:', {
      error,
      errorDescription
    })

    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', error)
    if (errorDescription) {
      errorUrl.searchParams.set('error_description', errorDescription)
    }

    return NextResponse.redirect(errorUrl.toString())
  }

  // Validate authorization code
  if (!code) {
    console.error('[Auth Callback] No authorization code provided')
    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', 'invalid_request')
    errorUrl.searchParams.set('error_description', 'Authorization code is missing')
    return NextResponse.redirect(errorUrl.toString())
  }

  try {
    // Exchange code for session
    console.log('[Auth Callback] Exchanging code for session...')
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[Auth Callback] Code exchange error:', {
        message: exchangeError.message,
        status: exchangeError.status,
        name: exchangeError.name
      })

      const errorUrl = new URL('/auth/error', origin)
      errorUrl.searchParams.set('error', 'exchange_failed')
      errorUrl.searchParams.set('error_description', exchangeError.message)
      errorUrl.searchParams.set('error_code', exchangeError.status?.toString() || 'unknown')
      return NextResponse.redirect(errorUrl.toString())
    }

    // Success!
    console.log('[Auth Callback] ✅ Session created successfully:', {
      userId: data.user?.id,
      email: data.user?.email,
      provider: data.user?.app_metadata?.provider
    })

    // Redirect to destination
    const redirectUrl = `${origin}${next}`
    console.log('[Auth Callback] Redirecting to:', redirectUrl)

    return NextResponse.redirect(redirectUrl)

  } catch (error) {
    console.error('[Auth Callback] Unexpected error:', error)

    const errorUrl = new URL('/auth/error', origin)
    errorUrl.searchParams.set('error', 'server_error')
    errorUrl.searchParams.set('error_description', error instanceof Error ? error.message : 'Unknown error')

    return NextResponse.redirect(errorUrl.toString())
  }
}