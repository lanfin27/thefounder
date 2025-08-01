// Admin authentication utilities for API routes
import { NextRequest } from 'next/server'

/**
 * Extract admin token from various sources in the request
 */
export function extractAdminToken(request: NextRequest): string | null {
  // 1. Check x-admin-token header (primary method)
  const xAdminToken = request.headers.get('x-admin-token')
  if (xAdminToken) {
    return xAdminToken.trim()
  }

  // 2. Check Authorization Bearer header
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7).trim()
  }

  // 3. Check other common header variations
  const headerVariations = [
    'X-Admin-Token',
    'Admin-Token',
    'x-api-key',
    'api-key'
  ]

  for (const header of headerVariations) {
    const value = request.headers.get(header)
    if (value) {
      return value.trim()
    }
  }

  // 4. Check URL query parameters as fallback
  const searchParams = request.nextUrl.searchParams
  const queryToken = searchParams.get('token') || searchParams.get('adminToken')
  if (queryToken) {
    return queryToken.trim()
  }

  return null
}

/**
 * Verify admin token against environment variable
 */
export function verifyAdminToken(token: string | null): boolean {
  if (!token) return false

  // Check against multiple possible environment variables
  const validTokens = [
    process.env.ADMIN_TOKEN,
    process.env.NEXT_PUBLIC_ADMIN_TOKEN,
    process.env.FLIPPA_ADMIN_TOKEN,
    'thefounder_admin_2025_secure' // Fallback default
  ].filter(Boolean)

  return validTokens.includes(token)
}

/**
 * Combined authentication check for admin endpoints
 * Returns true if request has valid admin token
 */
export function isAdminAuthenticated(request: NextRequest): boolean {
  const token = extractAdminToken(request)
  return verifyAdminToken(token)
}

/**
 * Get authentication error details for debugging
 */
export function getAuthDebugInfo(request: NextRequest): {
  hasToken: boolean
  tokenSource: string | null
  tokenLength: number
  isValid: boolean
} {
  const token = extractAdminToken(request)
  
  let tokenSource = null
  if (request.headers.get('x-admin-token')) tokenSource = 'x-admin-token header'
  else if (request.headers.get('authorization')) tokenSource = 'Authorization header'
  else if (request.headers.get('X-Admin-Token')) tokenSource = 'X-Admin-Token header'
  else if (request.headers.get('Admin-Token')) tokenSource = 'Admin-Token header'
  else if (request.nextUrl.searchParams.get('token')) tokenSource = 'query parameter'
  
  return {
    hasToken: !!token,
    tokenSource,
    tokenLength: token?.length || 0,
    isValid: verifyAdminToken(token)
  }
}