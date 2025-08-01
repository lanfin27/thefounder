// Simplified listings endpoint without complex imports
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminAuthenticated } from '@/lib/auth/admin'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    if (!isAdminAuthenticated(request)) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 })
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Simple query
    const offset = (page - 1) * limit
    const { data: listings, error, count } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)
      .order('scraped_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      throw error
    }
    
    // Simple response
    return NextResponse.json({
      success: true,
      data: {
        listings: listings || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    })
    
  } catch (error: any) {
    console.error('Listings API Error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5)
      } : undefined
    }, { status: 500 })
  }
}