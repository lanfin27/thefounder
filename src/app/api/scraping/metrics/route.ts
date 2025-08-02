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
    console.log('🔍 Fetching real metrics from database...')
    
    // Get total count first
    const { count: totalCount, error: countError } = await supabase
      .from('flippa_listings')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count error:', countError)
      throw countError
    }

    console.log(`📊 Total listings in database: ${totalCount}`)

    // Get all listings for field analysis
    const { data: allListings, error: listingsError } = await supabase
      .from('flippa_listings')
      .select('*')
      .order('extraction_timestamp', { ascending: false })

    if (listingsError) {
      console.error('Listings error:', listingsError)
      throw listingsError
    }

    console.log(`📋 Retrieved ${allListings?.length || 0} listings for analysis`)

    const listings = allListings || []
    const totalListings = listings.length

    // Calculate real field completion rates
    const withPrice = listings.filter(l => l.price && l.price > 0).length
    const withRevenue = listings.filter(l => l.monthly_revenue && l.monthly_revenue > 0).length
    const withMultiple = listings.filter(l => l.multiple && l.multiple > 0).length
    const withTitle = listings.filter(l => l.title && l.title.length > 5).length

    const fieldCompletion = {
      price: totalListings > 0 ? (withPrice / totalListings) * 100 : 0,
      revenue: totalListings > 0 ? (withRevenue / totalListings) * 100 : 0,
      multiple: totalListings > 0 ? (withMultiple / totalListings) * 100 : 0,
      title: totalListings > 0 ? (withTitle / totalListings) * 100 : 0
    }

    const successRate = Object.values(fieldCompletion).reduce((a, b) => a + b, 0) / 4

    // Get latest session info
    const { data: latestSession, error: sessionError } = await supabase
      .from('scraping_sessions')
      .select('*')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single()

    if (sessionError) {
      console.log('Session info not available:', sessionError.message)
    }

    const metrics = {
      successRate: Number(successRate.toFixed(1)),
      totalListings: totalCount || totalListings,
      fieldCompletion: {
        price: Number(fieldCompletion.price.toFixed(1)),
        revenue: Number(fieldCompletion.revenue.toFixed(1)),
        multiple: Number(fieldCompletion.multiple.toFixed(1)),
        title: Number(fieldCompletion.title.toFixed(1))
      },
      processingTime: latestSession?.processing_time || 0,
      lastRun: latestSession?.completed_at || new Date().toISOString(),
      meetsApifyStandard: successRate >= 95,
      sessionInfo: latestSession,
      
      // Debug info
      debug: {
        totalCount,
        retrievedCount: totalListings,
        withPrice,
        withRevenue,
        withMultiple,
        withTitle
      }
    }

    console.log('📊 Final metrics:', metrics)

    return NextResponse.json({ 
      success: true, 
      data: metrics,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('❌ Metrics API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch metrics',
        details: error.message 
      },
      { status: 500 }
    )
  }
}