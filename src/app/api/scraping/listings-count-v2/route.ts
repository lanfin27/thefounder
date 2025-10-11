import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    // Debug environment variables
    const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
    
    console.log('Environment check:', { hasServiceKey, hasAnonKey, hasUrl })
    
    // Use service role key if available, otherwise anon key
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Missing Supabase configuration')
    }
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        }
      }
    )
    
    // Test with a simple query first
    const { data: testData, error: testError, count: testCount } = await supabase
      .from('flippa_listings')
      .select('id', { count: 'exact', head: true })
    
    console.log('Test query result:', { testCount, testError: testError?.message })
    
    // Get total count with explicit RLS bypass if using service role
    const { count: totalCount, error: totalError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) {
      console.error('Total count error:', totalError)
      throw totalError
    }
    
    // Get recent count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { count: recentCount, error: recentError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', sevenDaysAgo.toISOString())
    
    if (recentError) {
      console.error('Recent count error:', recentError)
    }
    
    // Get today's count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayCount, error: todayError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', today.toISOString())
    
    if (todayError) {
      console.error('Today count error:', todayError)
    }
    
    // Get last update time
    const { data: lastListing, error: lastError } = await supabase
      .from('flippa_listings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (lastError) {
      console.error('Last listing error:', lastError)
    }
    
    // If all counts are 0, try a different approach
    if (totalCount === 0 && hasServiceKey) {
      console.log('Attempting alternative count method...')
      
      // Try getting actual data instead of just count
      const { data: sampleData, error: sampleError } = await supabase
        .from('flippa_listings')
        .select('id')
        .limit(10)
      
      console.log('Sample data result:', { 
        sampleCount: sampleData?.length || 0, 
        sampleError: sampleError?.message 
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        totalListings: totalCount || 0,
        recentListings: recentCount || 0,
        todayListings: todayCount || 0,
        lastUpdate: lastListing?.[0]?.created_at || null
      },
      debug: {
        hasServiceKey,
        hasAnonKey,
        keyUsed: hasServiceKey ? 'service' : 'anon',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Listings count error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listings count',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}