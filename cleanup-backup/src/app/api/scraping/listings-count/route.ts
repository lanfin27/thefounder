import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false
        }
      }
    )
    
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
    
    if (totalError) throw totalError
    
    // Get recent count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const { count: recentCount, error: recentError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', sevenDaysAgo.toISOString())
    
    if (recentError) throw recentError
    
    // Get today's count
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { count: todayCount, error: todayError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })
      .gt('created_at', today.toISOString())
    
    if (todayError) throw todayError
    
    // Get last update time
    const { data: lastListing, error: lastError } = await supabase
      .from('flippa_listings')
      .select('created_at')
      .order('created_at', { ascending: false })
      .limit(1)
    
    if (lastError) throw lastError
    
    return NextResponse.json({
      success: true,
      data: {
        totalListings: totalCount || 0,
        recentListings: recentCount || 0,
        todayListings: todayCount || 0,
        lastUpdate: lastListing?.[0]?.created_at || null
      }
    })
  } catch (error: any) {
    console.error('Listings count error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch listings count',
        details: error.message 
      },
      { status: 500 }
    )
  }
}