// Test endpoint for authentication debugging
import { NextRequest, NextResponse } from 'next/server'
import { extractAdminToken, verifyAdminToken, getAuthDebugInfo } from '@/lib/auth/admin'

// GET /api/scraping/auth-test - Test authentication
export async function GET(request: NextRequest) {
  const token = extractAdminToken(request)
  const isValid = verifyAdminToken(token)
  const debugInfo = getAuthDebugInfo(request)
  
  // Show all headers for debugging
  const headers: Record<string, string> = {}
  request.headers.forEach((value, key) => {
    headers[key] = value
  })
  
  // Environment variables (masked)
  const envVars = {
    ADMIN_TOKEN: process.env.ADMIN_TOKEN ? `***${process.env.ADMIN_TOKEN.slice(-8)}` : 'NOT SET',
    NEXT_PUBLIC_ADMIN_TOKEN: process.env.NEXT_PUBLIC_ADMIN_TOKEN ? `***${process.env.NEXT_PUBLIC_ADMIN_TOKEN.slice(-8)}` : 'NOT SET',
    FLIPPA_ADMIN_TOKEN: process.env.FLIPPA_ADMIN_TOKEN ? `***${process.env.FLIPPA_ADMIN_TOKEN.slice(-8)}` : 'NOT SET'
  }
  
  return NextResponse.json({
    success: isValid,
    message: isValid ? 'Authentication successful!' : 'Authentication failed',
    debug: {
      ...debugInfo,
      extractedToken: token ? `***${token.slice(-8)}` : null,
      headers: headers,
      envVars: envVars,
      timestamp: new Date().toISOString()
    }
  }, { status: isValid ? 200 : 401 })
}