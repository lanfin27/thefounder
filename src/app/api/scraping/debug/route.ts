import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Use service role key for full access to data
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // Get basic stats
    const { count, error } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    const { data: sessions, error: sessionError } = await supabase
      .from('scraping_sessions')
      .select('*')
      .order('completed_at', { ascending: false })

    const { data: sample, error: sampleError } = await supabase
      .from('flippa_listings')
      .select('*')
      .limit(3)

    // Get field statistics
    const { data: priceStats } = await supabase
      .from('flippa_listings')
      .select('price')
      .not('price', 'is', null)
      .limit(1000)

    const { data: revenueStats } = await supabase
      .from('flippa_listings')
      .select('monthly_revenue')
      .not('monthly_revenue', 'is', null)
      .limit(1000)

    return NextResponse.json({
      database: {
        totalListings: count,
        error: error?.message,
        hasData: count! > 0
      },
      sessions: {
        total: sessions?.length || 0,
        latest: sessions?.[0],
        error: sessionError?.message
      },
      sample: {
        count: sample?.length || 0,
        data: sample,
        error: sampleError?.message
      },
      statistics: {
        listingsWithPrice: priceStats?.length || 0,
        listingsWithRevenue: revenueStats?.length || 0
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}