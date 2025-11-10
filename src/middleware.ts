import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'
import type { CookieOptions } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔥 Step 1: Skip static files first (최우선)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // 🔥 Step 2: Skip auth for ALL YouTube Industry routes (완전히 분리)
  const youtubeIndustryPaths = [
    '/youtube-industry',
    '/api/youtube-industry',
    '/admin/youtube-industry',
    '/admin/youtube-channels',
    '/api/admin/youtube',
  ]

  const isYouTubeIndustry = youtubeIndustryPaths.some(path => pathname.startsWith(path))

  if (isYouTubeIndustry) {
    console.log('[Middleware] ✓ Skipping auth for YouTube Industry:', pathname)
    const response = NextResponse.next()
    // 메인 앱 쿠키 간섭 방지
    response.cookies.delete('supabase-auth-token')
    return response
  }

  // 🔥 Step 2.3: Protect /library routes (requires authentication)
  if (pathname.startsWith('/library')) {
    console.log('[Middleware] 📚 Library route access check:', pathname)

    try {
      // Create response for cookie handling
      let response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })

      // Create Supabase client
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('[Middleware] ❌ No authenticated user for library, redirecting to login')
        const redirectUrl = new URL('/auth/login', request.url)
        redirectUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      console.log('[Middleware] ✅ Library access granted for:', user.email)
      return response
    } catch (error) {
      console.error('[Middleware] ❌ Library auth check error:', error)
      const redirectUrl = new URL('/auth/login', request.url)
      redirectUrl.searchParams.set('redirectTo', pathname)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // 🔥 Step 2.5: Protect /admin routes (requires admin role)
  if (pathname.startsWith('/admin') &&
      !pathname.startsWith('/admin/youtube-industry') &&
      !pathname.startsWith('/admin/youtube-channels')) {
    console.log('[Middleware] ⚠️  Admin route access check:', pathname)

    try {
      // Create response for cookie handling
      let response = NextResponse.next({
        request: {
          headers: request.headers,
        },
      })

      // Create Supabase client
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({ name, value, ...options })
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({ name, value: '', ...options })
            },
          },
        }
      )

      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        console.log('[Middleware] ❌ No authenticated user, redirecting to /')
        return NextResponse.redirect(new URL('/', request.url))
      }

      // Get user profile to check role
      let { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      // 🔧 Auto-create profile if it doesn't exist (PGRST116 = no rows)
      if (profileError && profileError.code === 'PGRST116') {
        console.log('[Middleware] ⚠️ Profile not found, auto-creating for:', user.email)

        const { data: newProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || user.email || 'User',
            role: 'user'
          })
          .select('role')
          .single()

        if (createError) {
          console.error('[Middleware] ❌ Failed to create profile:', createError)
          return NextResponse.redirect(new URL('/403', request.url))
        }

        profile = newProfile
        console.log('[Middleware] ✅ Profile created successfully with role:', newProfile.role)
      } else if (profileError) {
        // Other errors (not missing profile)
        console.error('[Middleware] ❌ Profile fetch error:', profileError)
        return NextResponse.redirect(new URL('/403', request.url))
      }

      // Check if user is admin
      if (!profile || profile.role !== 'admin') {
        console.log('[Middleware] ❌ User is not admin, role:', profile?.role || 'none', ', redirecting to 403')
        return NextResponse.redirect(new URL('/403', request.url))
      }

      console.log('[Middleware] ✅ Admin access granted for:', user.email)
    } catch (error) {
      console.error('[Middleware] ❌ Admin check error:', error)
      return NextResponse.redirect(new URL('/403', request.url))
    }
  }

  // 🔥 Step 3: Handle Supabase auth session for all other routes
  try {
    console.log('[Middleware] Checking auth for:', pathname)
    return await updateSession(request)
  } catch (error) {
    // 에러 발생 시에도 페이지는 로드되도록 허용
    console.error('[Middleware] Error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};