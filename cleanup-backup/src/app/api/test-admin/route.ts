import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Test admin client creation
    const supabase = createAdminClient()
    
    // Test a simple query
    const { data, error } = await supabase
      .from('posts')
      .select('id, title')
      .limit(1)
    
    if (error) {
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: error.message 
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Admin client is working properly',
      testQuery: data
    })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Admin client creation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}