import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Add error handling wrapper
    try {
      // Continue with the request
      return NextResponse.next()
    } catch (error: any) {
      // Return JSON error response
      return NextResponse.json(
        {
          success: false,
          error: 'Internal Server Error',
          message: error.message || 'An unexpected error occurred',
          path: request.nextUrl.pathname,
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
}

export const config = {
  matcher: '/api/:path*'
}