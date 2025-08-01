// Minimal test version of listings endpoint to debug issues
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Step 1: Basic response test
    const basicTest = {
      step: 'basic',
      success: true,
      timestamp: new Date().toISOString()
    }
    
    // Step 2: Test admin auth
    const adminToken = request.headers.get('x-admin-token')
    if (!adminToken || adminToken !== 'thefounder_admin_2025_secure') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        debug: { providedToken: adminToken ? '***' + adminToken.slice(-4) : 'none' }
      }, { status: 401 })
    }
    
    // Step 3: Test Supabase import and connection
    let supabaseTest = { connected: false, error: null }
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      
      // Test simple query
      const { count, error } = await supabase
        .from('flippa_listings')
        .select('*', { count: 'exact', head: true })
      
      if (error) {
        supabaseTest.error = error.message
      } else {
        supabaseTest.connected = true
        supabaseTest.count = count || 0
      }
    } catch (dbError: any) {
      supabaseTest.error = dbError.message || 'Unknown database error'
    }
    
    // Step 4: Return debug information
    return NextResponse.json({
      success: true,
      test: 'listings-test endpoint',
      results: {
        basic: basicTest,
        auth: { valid: true, token: '***' + adminToken.slice(-4) },
        database: supabaseTest,
        environment: {
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          nodeEnv: process.env.NODE_ENV
        }
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }
}