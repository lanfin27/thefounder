import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

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